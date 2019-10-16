var utils              = require('../utils.js');
var index              = utils.index;
var OPERATIONS         = utils.OPERATIONS;
var aggregates         = require('./store.aggregate.js').aggregates;
var lunarisExports     = require('../exports.js');
var logger             = require('../logger.js');
var localStorageDriver = require('../localStorageDriver.js');
var localStorage       = localStorageDriver.localStorage;
var localDatabase      = localStorageDriver.indexedDB;
var debug              = require('../debug.js');


/**
 * Version number :
 * Each item in the collection has an attribute `_version` which is an Array of 2 values :
 *  - first, the min version number
 *  - last, the max version number
 * The interval is [min, max)
 */
var currentVersionNumber = 1;


var _savedCurrentVersionNumber = localStorage.get('lunaris:versionNumber', 1);
if (_savedCurrentVersionNumber) {
  currentVersionNumber = _savedCurrentVersionNumber;
}

function incrementVersionNumber () {
  currentVersionNumber++;
  localStorage.set('lunaris:versionNumber', currentVersionNumber);
}

/**
 * @param {Function} getPrimaryKeyFn function built at app build step for the store
 * @param {Boolean} isStoreObject
 * @param {Object} joinsDescriptor {
 *  joins   : {Object} from schema parsing,
 *  joinFns : {Object} {
 *    set@(obj, { store1: val, storeN ... }),
 *    store1 : { insert@(obj, val), delete@(obj, value) },
 *    storeN : ...
 *  }
 *  collections : {Object} key / value (store / value to store)
 * }
 * @param {Function} aggregateFn function to set aggregate values
 * @param {Function} computedsFn function to set computed properties
 * @param {String} storeName
 * @param {Object} referencesDescriptor {
 *  referencesFn : { get : { storeN : fn }, update : { storeN : fn } },
 *  stores       : [ 'store1', storeN ],
 *  references   : { pathToRef : store }
 * }
 * @param {Function} cloneFn clone fn specifi to the store or default one
 */
function collection (getPrimaryKeyFn, isStoreObject, joinsDescriptor, aggregateFn, computedsFn, storeName, referencesDescriptor, cloneFn) {
  var _data                     = [];
  var _dataCache                = []; // data available
  var _dataCacheIndex           = {}; // key = _ids, value = index in _data
  var _currentId                = 1;
  var _currentRowId             = 1;
  var _transactions             = {};
  var _isTransactionCommit      = false;
  var _transactionVersionNumber = null;
  var _isStoreObject            = isStoreObject   || false;
  var _joinsDescriptor          = joinsDescriptor || {};
  var _joins                    = joinsDescriptor ? Object.keys(_joinsDescriptor.joins) : [];
  var _referencesDescriptor     = referencesDescriptor || {};
  var _references               = _referencesDescriptor.stores && _referencesDescriptor.stores.length ? _referencesDescriptor.stores : [];
  var _getPrimaryKey            = getPrimaryKeyFn;
  var _aggregateFn              = aggregateFn;
  var _computedsFn              = computedsFn;
  var _storeName                = storeName;

  // only for transactions
  var _locaDatabaseActions = [];

  var _idIndex = {}; // key = PK, value = _id
  /**
   * id : [[id], [_id]]
   * references : { storeN : [[PKs refrence store], [_ids local collection]] }
   */
  var _indexes = {
    id         : [[], []],
    references : {}
  };

  /**
   * Add peristence action to queue if in transaction or send to indexeddb if not
   * @param {Function} actionFn
   * @param {Object} data
   */
  function _addActionToLocalDatabase (actionFn, data) {
    if (_transactionVersionNumber == null) {
      return actionFn(_storeName, data);
    }

    _locaDatabaseActions.push(data);
  }

  /**
   * Add transaction to the transactions
   * @param {Int} versionNumber
   * @param {Object} data
   * @param {String} operation
   */
  function _addTransaction (versionNumber, data, operation) {
    if (!_transactions[versionNumber]) {
      return;
    }

    _transactions[versionNumber].push([versionNumber, data, operation]);
  }

  /**
   * Complete current object with join values
   * @param {Object} value
   */
  function _setJoinValues (value) {
    if (!_joins.length) {
      return;
    }

    var _joinValues = {};
    for (var i = 0; i < _joins.length; i++) {
      var _collection = _joinsDescriptor.collections[_joins[i]];
      if (_collection) {
        _joinValues[_joins[i]] = _collection.getAll();
      }
      else {
        _joinValues[_joins[i]] = null;
      }
    }

    _joinsDescriptor.joinFns.set(value, _joinValues, aggregates, lunarisExports.constants, logger);
  }

  /**
   * Complete current object with referenced object
   * @param {Object} value
   */
  function _setReferencedValues (value) {
    if (!_references.length) {
      return;
    }

    for (var _reference in _referencesDescriptor.references) {
      var _store =_referencesDescriptor.references[_reference];
      var _ids   = _referencesDescriptor.referencesFn.get[_reference](value);

      if (!_indexes.references[_store]) {
        _indexes.references[_store] = [[], []];
      }

      for (var j = 0; j < _ids.length; j++) {
        var _searchReferencedId = index.binarySearch(_indexes.references[_store][0], _ids[j]);

        if (!_searchReferencedId.found) {
          index.insertAt(_indexes.references[_store][0], _searchReferencedId.index, _ids[j]);
          index.insertAt(_indexes.references[_store][1], _searchReferencedId.index, []);
        }

        var _search = index.binarySearch(_indexes.references[_store][1][_searchReferencedId.index], value._id);

        if (!_search.found) {
          index.insertAt(_indexes.references[_store][1][_searchReferencedId.index], _search.index, value._id);
        }
      }
    }
  }

  /**
   * Update references index
   * @param {Object} value
   */
  function _updateReferencesIndex (value) {
    if (!_references.length) {
      return;
    }

    for (var _reference in _referencesDescriptor.references) {
      var _store =_referencesDescriptor.references[_reference];
      var _ids   = _referencesDescriptor.referencesFn.get[_reference](value);

      if (!_indexes.references[_store]) {
        _indexes.references[_store] = [[], []];
      }

      for (var j = 0; j < _ids.length; j++) {
        var _searchReferencedId = index.binarySearch(_indexes.references[_store][0], _ids[j]);
        if (!_searchReferencedId.found) {
          continue;
        }

        var _search = index.binarySearch(_indexes.references[_store][1][_searchReferencedId.index], value._id);

        if (!_search.found) {
          continue;
        }

        index.removeAt(_indexes.references[_store][1][_searchReferencedId.index], _search.index);

        if (!_indexes.references[_store][1][_searchReferencedId.index].length) {
          index.removeAt(_indexes.references[_store][0], _searchReferencedId.index);
          index.removeAt(_indexes.references[_store][1], _searchReferencedId.index);
        }
      }
    }
  }

  /**
   * Build data cache index
   */
  function _buildIndexes () {
    var _iterator = 0;
    for (var i = 0, len = _data.length; i < len; i++) {
      var _item = _data[i];
      if (_item._version.length > 1) {
        continue;
      }
      _dataCacheIndex[_item._id] = _iterator;
      _iterator++;

      if (_getPrimaryKey) {
        var _pk = _getPrimaryKey(_item);
        _idIndex[_pk] = _item._id;
      }
    }
  }
  /**
   * build data cache
   */
  function _buildDataCache () {
    _dataCache = [];

    for (var _id in _dataCacheIndex) {
      if (_dataCacheIndex[_id] != null) {
        _dataCache.push(_data[_dataCacheIndex[_id]]);
      }
    }
  }

  /**
   * Add value to the array of collection values and set the index id
   * @param {Object} value
   * @param {Int} versionNumber
   * @param {Boolean} isFromUpsert
   * @param {Boolean} isFromIndex
   */
  function _addToValues (value, versionNumber, isFromUpsert, isFromIndex) {
    if (value._id  && isFromUpsert) {
      if (_getPrimaryKey) {
        var _id = _getPrimaryKey(value);
        if (_id !== null && _id !== undefined) {
          var _search        = _idIndex[_id];
          if (_search == null) {
            _idIndex[_id] = value._id;
          }
        }
      }
      value._rowId = _currentRowId++;
      _setReferencedValues(value);
      _addActionToLocalDatabase(localDatabase.upsert, value);
      _dataCacheIndex[value._id] = _data.length;
      return _data.push(value);
    }

    value._id = _currentId;
    _currentId++;

    _setReferencedValues(value);
    _setJoinValues(value);
    if (_aggregateFn) {
      _aggregateFn(value, aggregates, lunarisExports.constants, logger);
    }

    if (isFromIndex || !_getPrimaryKey) {
      value._rowId = _currentRowId++;
      _addActionToLocalDatabase(localDatabase.upsert, value);
      _dataCacheIndex[value._id] = _data.length;
      return _data.push(value);
    }

    _id = _getPrimaryKey(value);
    if (!(_id !== null && value._id !== undefined)) {
      value._rowId = _currentRowId++;
      _addActionToLocalDatabase(localDatabase.upsert, value);
      _dataCacheIndex[value._id] = _data.length;
      return _data.push(value);
    }

    _search = _idIndex[_id];
    // We upsert the last version of the object
    if (_search != null) {
      value._id    = _idIndex[_id];
      value._rowId = _currentRowId;
      upsert(value, versionNumber, false, true);
      return;
    }

    _idIndex[_id] = value._id;
    _dataCacheIndex[value._id] = _data.length;
    value._rowId = _currentRowId++;
    _data.push(value);
    _addActionToLocalDatabase(localDatabase.upsert, value);
  }

  /**
   * Remove a value from the id index
   * @param {Int} _id
   * @param {Int} id
   */
  function _removeFromIndex (_id, id) {
    var _search = _idIndex[id];

    if (_search != null) {
      _idIndex[id] = null;
    }
  }

  /**
   * Add some values to the collection
   * @param {*} values
   * @param {Int} versionNumber force versionNumber (must call begin() first)
   * @returns {Object} inserted value
   */
  function add (value, versionNumber, isFromUpsert, isFromIndex) {
    if (value === undefined || value === null || typeof value !== 'object') {
      throw new Error('add must have a value. It must be an Object.');
    }

    if (versionNumber && !_isTransactionCommit) {
      _addTransaction(versionNumber, value, OPERATIONS.INSERT);
      return;
    }

    if (_computedsFn) {
      _computedsFn(value, lunarisExports.constants, logger);
    }

    value._version = [versionNumber || currentVersionNumber];
    if (!_isTransactionCommit) {
      incrementVersionNumber();
    }

    _addToValues(value, versionNumber, isFromUpsert, isFromIndex);

    if (!_isTransactionCommit) {
      _buildDataCache();
    }

    return value;
  }

  /**
   * Update an item
   * @param {*} value
   * @param {Int} versionNumber force versionNumber (must call begin() first)
   * @param {Boolean} isRemove
   * @param {Boolean} isFromIndex
   * @returns {Object} inserted / updated value
   */
  function upsert (value, versionNumber, isRemove, isFromIndex) {
    if ((value._id === null || value._id === undefined) && !isRemove) {
      return add(value, versionNumber);
    }

    if (versionNumber && !_isTransactionCommit) {
      _addTransaction(versionNumber, value, OPERATIONS.UPDATE, isFromIndex);
      return;
    }

    var _search = _dataCacheIndex[value._id];

    if (_search == null) {
      if (isRemove) {
        return;
      }

      return add(value, _transactionVersionNumber ? _transactionVersionNumber : null, true);
    }

    var _version      = _transactionVersionNumber || currentVersionNumber;
    var _dataObject   = _data[_search];
    var _lowerVersion = _dataObject._version[0];
    var _upperVersion = _dataObject._version[1] || _version;

    var _objToUpdate        = cloneFn(value);
    _dataObject._version[1] = _version;
    _updateReferencesIndex(_dataObject);

    //  During the same transaction :
    //   - If insert / update : the updated row will be merged with the inserted one
    //   - If Insert / delete : the inserted row will be removed
    if (_lowerVersion === _version && _upperVersion === _version && _dataObject._version[1] >= 0) {
      if (isRemove) {
        _addActionToLocalDatabase(localDatabase.upsert, _dataObject);
        _dataCacheIndex[value._id] = null;
        return;
      }
      utils.merge(_dataObject, _objToUpdate);
      _dataObject._version.pop();
      _addActionToLocalDatabase(localDatabase.upsert, _dataObject);
      return _dataObject;
    }
    else {
      _addActionToLocalDatabase(localDatabase.upsert, _dataObject);
    }

    if (!isRemove) {
      return add(_objToUpdate, _transactionVersionNumber ? _transactionVersionNumber : null, true, isFromIndex);
    }

    _dataCacheIndex[value._id] = null;

    if (!_isTransactionCommit) {
      _buildDataCache();
    }

    return _dataObject;
  }

  /**
   * Clear the collection
   */
  function clear () {
    _data               = [];
    _currentId          = 1;
    _currentRowId       = 1;
    _idIndex            = {};
    _indexes.references = {};
    _dataCache          = [];
    _dataCacheIndex     = {};
  }

  /**
   * Remove an item with the given id / value
   * @param {Object} value
   * @param {Int} versionNumber force versionNumber (must call begin() first)
   * @param {Boolean} isPK is primaryKey
   */
  function remove (value, versionNumber, isPK) {
    if (versionNumber && !_isTransactionCommit) {
      _addTransaction(versionNumber, { value : value, isPK : !!isPK }, OPERATIONS.DELETE);
      return;
    }

    if (_getPrimaryKey && !isPK) {
      var _obj = get(value._id);
      if (_obj) {
        _removeFromIndex(value._id, _getPrimaryKey(_obj));
      }
    }
    else if (_getPrimaryKey && isPK) {
      var _pk     = _getPrimaryKey(value);
      var _search = _idIndex[_pk];

      if (_search != null) {
        value._id     = _search;
        _idIndex[_pk] = null;
      }
    }

    return upsert({ _id : value._id }, versionNumber, true);
  }

  /**
   * Get a specific item
   * @param {Int} id
   */
  function get (id) {
    if (_dataCacheIndex[id] == null) {
      return null;
    }

    return _data[_dataCacheIndex[id]];
  }

  /**
   * Get first item
   * @param {Int} id
   */
  function getFirst () {
    if (!_data[0]) {
      return undefined;
    }
    return get(_data[0]._id);
  }

  /**
   * Rollback items to the corresponding version number
   * @param {Int} versionNumber
   */
  function rollback (versionNumber) {
    var _transaction = _transactions[versionNumber];
    if (!_transaction) {
      return;
    }

    versionNumber = _transaction;

    var _objToRollback = [];
    for (var i = _data.length - 1; i >= 0; i--) {
      var _lowerVersion = _data[i]._version[0];
      var _upperVersion = _data[i]._version[1];
      if (
        (versionNumber === _upperVersion)
        ||
        (versionNumber === _lowerVersion && !_upperVersion)
      ) {
        _objToRollback.push(cloneFn(_data[i]));
      }
    }

    var _version = begin();
    for (var j = 0; j < _objToRollback.length; j++) {
      // Item added and removed in the same transaction
      if (_objToRollback[j]._version[0] === _objToRollback[j]._version[1]) {
        continue;
      }

      if (_objToRollback[j]._version[1]) {
        add(_objToRollback[j], _version);
      }
      else {
        remove({ _id : _objToRollback[j]._id }, _version, false);
      }
    }
    return _internalCommit(_version);
  }

  /**
   * Begin the collection transaction
   */
  function begin () {
    _transactions[currentVersionNumber] = [];
    _locaDatabaseActions                = [];
    return currentVersionNumber;
  }

  /**
   * Commit the transaction version number
   * @param {Int} versionNumber
   */
  function commit (versionNumber) {
    var _res = _internalCommit(versionNumber);
    if (_isStoreObject) {
      if (_res.length) {
        return _res[0];
      }

      return null;
    }

    return _res;
  }

  /**
   * Commit the transaction version number
   * @param {Int} versionNumber
   */
  function _internalCommit (versionNumber) {
    var _res         = [];
    var _transaction = _transactions[versionNumber];
    if (!_transaction) {
      return;
    }

    _isTransactionCommit      = true;
    _transactionVersionNumber = currentVersionNumber;

    for (var i = 0; i < _transaction.length; i++) {
      if (_transaction[i][2] === OPERATIONS.INSERT) {
        _res.push(add(_transaction[i][1], null, true));
      }
      else if (_transaction[i][2] === OPERATIONS.UPDATE) {
        _res.push(upsert(_transaction[i][1]));
      }
      else {
        var _remove = remove(_transaction[i][1].value, null, _transaction[i][1].isPK);
        // The _id can be unedfined
        if (_remove) {
          _res.push(_remove);
        }
      }
    }

    if (_locaDatabaseActions.length) {
      localDatabase.upsert(_storeName, _locaDatabaseActions);
      _locaDatabaseActions = [];
    }

    _transactions[versionNumber] = _transactionVersionNumber;
    _isTransactionCommit         = false;
    _transactionVersionNumber    = null;
    incrementVersionNumber();
    _buildDataCache();
    return cloneFn(_res);
  }

  /**
   * Propagate operation from joins
   * @param {String} store
   * @param {Object/Array} data object to delete or insert
   * @param {String} operation
   */
  function propagate (store, data, operation) {
    if (!_joinsDescriptor.joinFns[store]) {
      return;
    }

    if (data && !Array.isArray(data)) {
      data = [data];
    }

    /**
     * Update current object joins
     * @param {Object} object
     * @param {Object} data
     * @param {String} operation
     */
    function _updateObject (object, data, operation) {
      // For INSERT, we cannot garantie that the store will propagate multiple times an INSERT
      // Only the collection has a sytem to avoid duplicate values (based on primary key values)
      if (operation === OPERATIONS.INSERT || operation === OPERATIONS.UPDATE) {
        _joinsDescriptor.joinFns[store].delete(object, data, aggregates, lunarisExports.constants, logger);
        return _joinsDescriptor.joinFns[store].insert(object, data, aggregates, lunarisExports.constants, logger);
      }
      else if (operation === OPERATIONS.DELETE) {
        return _joinsDescriptor.joinFns[store].delete(object, data, aggregates, lunarisExports.constants, logger);
      }
    }

    var _version = begin();
    for (var i = 0; i < _data.length; i++) {
      var _item         = _data[i];
      var _lowerVersion = _item._version[0];
      var _upperVersion = _item._version[1];
      if (_lowerVersion <= currentVersionNumber && !_upperVersion) {
        // Remember, we cannot directly edit a value from the collection (clone)
        var _obj = cloneFn(_item);
        if (data && data.length) {
          for (var j = 0; j < data.length; j++) {
            _obj = _updateObject(_obj, data[j], operation);
          }
        }
        else {
          _obj = _updateObject(_obj, null, operation);
        }

        upsert(_obj, _version);
      }
    }

    return _internalCommit(_version);
  }

  /**
   * Propagate reference operations
   * @param {String} store
   * @param {String/int} lastPK
   * @param {String/int} newPK
   */
  function replaceReferences (store, lastPK, newPK) {
    if (!_referencesDescriptor.referencesFn) {
      return [];
    }

    if (!_indexes.references[store]) {
      return [];
    }

    var _version          = begin();
    var _searchReferences = index.binarySearch(_indexes.references[store][0], lastPK);

    if (!_searchReferences.found) {
      return [];
    }

    var _index = _indexes.references[store][1][_searchReferences.index];

    for (var i = 0; i < _data.length; i++) {
      var _item         = _data[i];
      var _lowerVersion = _item._version[0];
      var _upperVersion = _item._version[1];

      if (_lowerVersion <= currentVersionNumber && !_upperVersion && _index.indexOf(_item._id) !== -1) {
        // Remember, we cannot directly edit a value from the collection (clone)
        var _obj = cloneFn(_item);
        for (var path in _referencesDescriptor.references) {
          _referencesDescriptor.referencesFn.update[path](
            lastPK,
            newPK,
            _obj
          );
        }

        upsert(_obj, _version);
      }
    }

    return _internalCommit(_version);
  }

  return {
    get               : get,
    add               : add,
    upsert            : upsert,
    remove            : remove,
    clear             : clear,
    getFirst          : getFirst,
    begin             : begin,
    commit            : commit,
    rollback          : rollback,
    propagate         : propagate,
    replaceReferences : replaceReferences,

    getIndexId : function () {
      return _idIndex;
    },

    getIndexReferences : function () {
      return _indexes.references;
    },

    getIndexDataCache : function () {
      return _dataCacheIndex;
    },

    /**
     * Remove index id value
     * - when offline, the PK is generted from _id
     * - the collection ensures to not duplicate PK
     */
    removeIndexIdValue : function (key) {
      if (key == null) {
        return;
      }

      _removeFromIndex(key, '_' + key);
    },

    /**
     * Set index referneces
     * @param {Array} value
     */
    setIndexReferences : function (value) {
      _indexes.references = value;
    },

    /**
     * Get all items in the collection
     * only for tests
     */
    _getAll : function () {
      return _data;
    },

    /**
     * Get all items in the collection available for list
     * only for tests
     */
    _getAllCache : function () {
      return _dataCache;
    },

    /**
     * Set data values
     * @param {Array} value
     */
    setData : function (value) {
      _data = value;
      _buildIndexes();
      _buildDataCache();
    },

    /**
     * Get all valid items in the collection
     * only for tests
     * @param {Array} ids
     */
    getAll : function (ids, isPK, isClone) {
      var _res = [];

      if (ids == null) {
        _res = _dataCache;
      }
      else {
        for (var i = 0; i < ids.length; i++) {
          var _id = ids[i];
          if (!isPK) {
            var _search = _dataCacheIndex[_id];

            if (_search != null) {
              _res.push(_data[_search]);
            }
            continue;
          }

          _search =  _idIndex[_id];
          if (_search == null) {
            continue;
          }

          _res.push(_data[_dataCacheIndex[_search]]);
        }
      }

      if (_isStoreObject) {
        _res = _res.length ? _res[0] : null;
      }

      if (isClone === false) {
        return _res;
      }

      return cloneFn(_res);
    },

    /**
     * Get current id
     */
    getCurrentId : function () {
      return _currentId;
    },

    /**
     * Set current row id
     * @param {Int} value
     */
    setCurrentId : function setCurrentId (value) {
      _currentId = value;
    },

    /**
     * Get current version number
     */
    getCurrentVersionNumber : function () {
      return currentVersionNumber;
    },

    /**
     * Get current row id
     */
    getCurrentRowId : function getCurrentRowId () {
      return _currentRowId;
    },

    /**
     * Set current row id
     * @param {Int} value
     */
    setCurrentRowId : function setRowId (value) {
      _currentRowId = value;
    }
  };
}

/**
 * Reset current version number
 */
function resetVersionNumber () {
  currentVersionNumber = 1;
  localStorage.set('lunaris:versionNumber', 1);
}

exports.collection         = collection;
exports.resetVersionNumber = resetVersionNumber;
