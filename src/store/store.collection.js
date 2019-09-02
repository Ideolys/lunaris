var utils              = require('../utils.js');
var index              = utils.index;
var OPERATIONS         = utils.OPERATIONS;
var aggregates         = require('./store.aggregate.js').aggregates;
var lunarisExports     = require('../exports.js');
var logger             = require('../logger.js');
var localStorageDriver = require('../localStorageDriver.js');
var localStorage       = localStorageDriver.localStorage;
var localDatabase      = localStorageDriver.indexedDB;


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
 *  getPrimaryKeyFns : { storeN : fn },
 *  collections      : {Object} key / value (store / value to store)
 * }
 */
function collection (getPrimaryKeyFn, isStoreObject, joinsDescriptor, aggregateFn, computedsFn, storeName, referencesDescriptor) {
  var _data                     = [];
  var _currentId                = 1;
  var _currentRowId             = 1;
  var _transactions             = {};
  var _isTransactionCommit      = false;
  var _transactionVersionNumber = null;
  var _isStoreObject            = isStoreObject   || false;
  var _joinsDescriptor          = joinsDescriptor || {};
  var _joins                    = joinsDescriptor ? Object.keys(_joinsDescriptor.joins) : [];
  var _referencesDescriptor     = referencesDescriptor || {};
  var _references               = _referencesDescriptor.referencesFn && referencesDescriptor.referencesFn.get ? Object.keys(referencesDescriptor.referencesFn.get) : [];
  var _getPrimaryKey            = getPrimaryKeyFn;
  var _aggregateFn              = aggregateFn;
  var _computedsFn              = computedsFn;
  var _storeName                = storeName;

  /**
   * id : [[id], [_id]]
   * references : { storeN : [[_ids refrence store], [_ids local collection]] }
   */
  var _indexes = {
    id         : [[], []],
    references : {}
  };

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

    for (var i = 0; i < _references.length; i++) {
      var _collection = _referencesDescriptor.collections[_references[i]];

      if (!_collection) {
        continue;
      }

      var _pkFn             = _referencesDescriptor.getPrimaryKeyFns[_references[i]];
      var _ids              = _referencesDescriptor.referencesFn.get[_references[i]](_pkFn, value);
      var _referencedValues = _collection.getAll(_ids, true);

      if (!_indexes.references[_references[i]]) {
        _indexes.references[_references[i]] = [[], []];
      }

      if (!Array.isArray(_referencedValues)) {
        _referencedValues = [_referencedValues];
      }

      for (var j = 0; j < _referencedValues.length; j++) {
        _referencesDescriptor.referencesFn.update[_references[i]](_pkFn, _referencedValues[j], value);

        var _searchReferencedId = index.binarySearch(_indexes.references[_references[i]][0], _referencedValues[j]._id);
        if (!_searchReferencedId.found) {
          index.insertAt(_indexes.references[_references[i]][0], _searchReferencedId.index, _referencedValues[j]._id);
          index.insertAt(_indexes.references[_references[i]][1], _searchReferencedId.index, []);
        }

        var _search = index.binarySearch(_indexes.references[_references[i]][1][_searchReferencedId.index], value._id);

        if (!_search.found) {
          index.insertAt(_indexes.references[_references[i]][1][_searchReferencedId.index], _search.index, value._id);
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

    for (var i = 0; i < _references.length; i++) {
      var _collection = _referencesDescriptor.collections[_references[i]];

      if (!_collection) {
        continue;
      }

      var _pkFn             = _referencesDescriptor.getPrimaryKeyFns[_references[i]];
      var _ids              = _referencesDescriptor.referencesFn.get[_references[i]](_pkFn, value);
      var _referencedValues = _collection.getAll(_ids, true);

      if (!_indexes.references[_references[i]]) {
        _indexes.references[_references[i]] = [[], []];
      }

      if (!Array.isArray(_referencedValues)) {
        _referencedValues = [_referencedValues];
      }

      for (var j = 0; j < _referencedValues.length; j++) {
        var _searchReferencedId = index.binarySearch(_indexes.references[_references[i]][0], _referencedValues[j]._id);
        if (!_searchReferencedId.found) {
          continue;
        }

        var _search = index.binarySearch(_indexes.references[_references[i]][1][_searchReferencedId.index], value._id);

        if (!_search.found) {
          continue;
        }

        index.removeAt(_indexes.references[_references[i]][1][_searchReferencedId.index], _search.index);

        if (!_indexes.references[_references[i]][1][_searchReferencedId.index].length) {
          index.removeAt(_indexes.references[_references[i]][0], _searchReferencedId.index);
          index.removeAt(_indexes.references[_references[i]][1], _searchReferencedId.index);
        }
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
          var _arrayIdValues = _indexes.id[0];
          var _search        = index.binarySearch(_arrayIdValues, _id);
          if (!_search.found) {
            index.insertAt(_arrayIdValues, _search.index, _id);
            index.insertAt(_indexes.id[1], _search.index, value._id);
          }
        }
      }
      value._rowId = _currentRowId++;
      _setReferencedValues(value);
      localDatabase.upsert(_storeName, value);
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
      localDatabase.upsert(_storeName, value);
      return _data.push(value);
    }

    _id = _getPrimaryKey(value);
    if (!(_id !== null && value._id !== undefined)) {
      value._rowId = _currentRowId++;
      localDatabase.upsert(_storeName, value);
      return _data.push(value);
    }

    _arrayIdValues = _indexes.id[0];
    _search        = index.binarySearch(_arrayIdValues, _id);
    // We upsert the last version of the object
    if (_search.found) {
      value._id    = _indexes.id[1][_search.index];
      value._rowId = _currentRowId;
      upsert(value, versionNumber, false, true);
      return;
    }
    index.insertAt(_arrayIdValues, _search.index, _id);
    index.insertAt(_indexes.id[1], _search.index, value._id);
    value._rowId = _currentRowId++;
    _data.push(value);
    localDatabase.upsert(_storeName, value);
  }

  /**
   * Remove a value from the id index
   * @param {Int} _id
   * @param {Int} id
   */
  function _removeFromIndex (_id, id) {
    var _arrayIdValues = _indexes.id[0];
    var _search        = index.binarySearch(_arrayIdValues, id);

    if (_search.found) {
      index.removeAt(_arrayIdValues, _search.index);
      index.removeAt(_indexes.id[1], _search.index);
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

    for (var i = 0; i < _data.length; i++) {
      var _version      = _transactionVersionNumber || currentVersionNumber;
      var _lowerVersion = _data[i]._version[0];
      var _upperVersion = _data[i]._version[1] || _version;

      if (_data[i]._id === value._id && _lowerVersion <= _version && _version <= _upperVersion) {
        var _objToUpdate     = utils.clone(value);
        _data[i]._version[1] = _version;
        _updateReferencesIndex(_data[i]);

        //  During the same transaction :
        //   - If insert / update : the updated row will be merged with the inserted one
        //   - If Insert / delete : the inserted row will be removed
        if (_lowerVersion === _version && _upperVersion === _version && _data[i]._version[1] >= 0) {
          localDatabase.del(_storeName, _data[i]._rowId);
          utils.merge(_data[i], _objToUpdate);
          _data[i]._version.pop();
          if (isRemove) {
            localDatabase.del(_storeName, _data[i]._rowId);
            _data.splice(i, 1);
            return;
          }
          localDatabase.upsert(_storeName, _data[i]);
          return _data[i];
        }
        else {
          localDatabase.upsert(_storeName, _data[i]);
        }

        if (!isRemove) {
          return add(_objToUpdate, _transactionVersionNumber ? _transactionVersionNumber : null, true, isFromIndex);
        }
        else {
          return _data[i];
        }
      }
    }
  }

  /**
   * Clear the collection
   */
  function clear () {
    _data               = [];
    _currentId          = 1;
    _currentRowId       = 1;
    _indexes.id         = [[], []];
    _indexes.references = {};
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
      var _pk            = _getPrimaryKey(value);
      var _arrayIdValues = _indexes.id[0];
      var _search        = index.binarySearch(_arrayIdValues, _pk);

      if (_search.found) {
        value._id = _indexes.id[1][_search.index];
        _removeFromIndex(_indexes.id[1][_search.index], _pk);
      }
    }

    return upsert({ _id : value._id }, versionNumber, true);
  }

  /**
   * Get a specific item
   * @param {Int} id
   */
  function get (id) {
    for (var i = 0; i < _data.length; i++) {
      var _item         = _data[i];
      var _lowerVersion = _item._version[0];
      var _upperVersion = _item._version[1];
      if (_item._id === id && _lowerVersion <= currentVersionNumber && !_upperVersion) {
        return _item;
      }
    }

    return null;
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
        _objToRollback.push(utils.clone(_data[i]));
      }
    }

    var _version = begin();
    for (var j = 0; j < _objToRollback.length; j++) {
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

    _transactions[versionNumber] = _transactionVersionNumber;
    _isTransactionCommit         = false;
    _transactionVersionNumber    = null;
    incrementVersionNumber();
    return utils.clone(_res);
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
        var _obj = utils.clone(_item);
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
   * @param {Object/Array} data referenced object(s)
   */
  function propagateReferences (store, data) {
    if (!_referencesDescriptor.referencesFn) {
      return;
    }

    if (data && !Array.isArray(data)) {
      data = [data];
    }

    if (!(data && data.length)) {
      return;
    }

    var _version = begin();
    for (var i = 0; i < _data.length; i++) {
      var _item         = _data[i];
      var _lowerVersion = _item._version[0];
      var _upperVersion = _item._version[1];
      if (_lowerVersion <= currentVersionNumber && !_upperVersion) {
        // Remember, we cannot directly edit a value from the collection (clone)
        var _obj = utils.clone(_item);
        for (var j = 0; j < data.length; j++) {
          _obj = _referencesDescriptor.referencesFn.update[store](_referencesDescriptor.getPrimaryKeyFns[store], data[j], _obj);
        }

        upsert(_obj, _version);
      }
    }


    return _internalCommit(_version);
  }

  return {
    get                 : get,
    add                 : add,
    upsert              : upsert,
    remove              : remove,
    clear               : clear,
    getFirst            : getFirst,
    begin               : begin,
    commit              : commit,
    rollback            : rollback,
    propagate           : propagate,
    propagateReferences : propagateReferences,

    getIndexId : function () {
      return _indexes.id;
    },

    getIndexReferences : function () {
      return _indexes.references;
    },

    /**
     * Set index id values
     * @param {Array} values
     */
    setIndexId : function (values) {
      _indexes.id = values;
    },

    /**
     * Set index id value
     * @param {Array} value
     */
    setIndexIdValue : function (key, value) {
      if (key === null || key === undefined || value === null || value === undefined) {
        return;
      }

      var _search = index.binarySearch(_indexes.id[1], key);

      if (!_search.found) {
        return;
      }

      _indexes.id[0][_search.index] = value;
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
     * Set data values
     * @param {Array} value
     */
    setData : function (value) {
      _data = value;
    },

    /**
     * Get all valid items in the collection
     * only for tests
     * @param {Array} ids
     */
    getAll : function (ids, isPK) {
      var _items = [];
      for (var i = 0; i < _data.length; i++) {
        var _item = _data[i];
        var _lowerVersion = _item._version[0];
        var _upperVersion = _item._version[1];
        if (_lowerVersion <= currentVersionNumber && !_upperVersion) {
          if (isPK && _getPrimaryKey && ids.indexOf(_getPrimaryKey(_item)) !== -1 ) {
            _items.push(_item);
            continue;
          }

          if (ids && ids.indexOf(_item._id) !== -1) {
            _items.push(_item);
            continue;
          }

          if (!ids) {
            _items.push(_item);
            continue;
          }
        }
      }

      if (_isStoreObject) {
        return _items.length ? _items[0] : null;
      }

      return utils.clone(_items);
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
