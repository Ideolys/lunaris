var utils          = require('../utils.js');
var index          = utils.index;
var OPERATIONS     = utils.OPERATIONS;
var aggregates     = require('./store.aggregate.js').aggregates;
var lunarisExports = require('../exports.js');
var logger         = require('../logger.js');

/**
 * Version number :
 * Each item in the collection has an attribute `_version` which is an Array of 2 values :
 *  - first, the min version number
 *  - last, the max version number
 * The interval is [min, max)
 */
var currentVersionNumber = 1;

function incrementVersionNumber () {
  currentVersionNumber++;
}

/**
 * @param {Int} startId from where to start id generation, default 1
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
 * @param {Object} reflexiveFns { update : {Function}, delete : {Function} }
 * @param {Function} computedsFn function to set computed properties
 */
function collection (startId, getPrimaryKeyFn, isStoreObject, joinsDescriptor, aggregateFn, reflexiveFns, computedsFn) {
  var _data                     = [];
  var _currentId                = startId && typeof startId === 'number' ? startId : 1;
  var _transactions             = {};
  var _isTransactionCommit      = false;
  var _transactionVersionNumber = null;
  var _isStoreObject            = isStoreObject   || false;
  var _joinsDescriptor          = joinsDescriptor || {};
  var _joins                    = joinsDescriptor ? Object.keys(_joinsDescriptor.joins) : [];
  var _getPrimaryKey            = getPrimaryKeyFn;
  var _aggregateFn              = aggregateFn;
  var _reflexiveUpdateFn        = reflexiveFns ? reflexiveFns.update : null;
  var _reflexiveDeleteFn        = reflexiveFns ? reflexiveFns.delete : null;
  var _computedsFn              = computedsFn;

  /**
   * id : [[id], [_id]]
   */
  var _indexes = { id : [[], []]};

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
   * Add value to the array of collection values and set the index id
   * @param {Object} value
   * @param {Int} versionNumber
   * @param {Boolean} isFromUpsert
   * @param {Boolean} isFromIndex
   */
  function _addToValues (value, versionNumber, isFromUpsert, isFromIndex) {
    if (value._id && isFromUpsert) {
      if (_getPrimaryKey) {
        var _id = _getPrimaryKey(value);
        if (_id) {
          var _arrayIdValues = _indexes.id[0];
          var _search        = index.binarySearch(_arrayIdValues, _id);
          if (!_search.found) {
            index.insertAt(_arrayIdValues, _search.index, _id);
            index.insertAt(_indexes.id[1], _search.index, value._id);
          }
        }
      }
      return _data.push(value);
    }

    _setJoinValues(value);
    if (_aggregateFn) {
      _aggregateFn(value, aggregates, lunarisExports.constants, logger);
    }
    value._id = _currentId;
    _currentId++;

    if (isFromIndex || !_getPrimaryKey) {
      return _data.push(value);
    }

    _id = _getPrimaryKey(value);
    if (!_id) {
      return _data.push(value);
    }

    _arrayIdValues = _indexes.id[0];
    _search        = index.binarySearch(_arrayIdValues, _id);
    // We upsert the last version of the object
    if (_search.found) {
      value._id = _indexes.id[1][_search.index];
      upsert(value, versionNumber, false, true);
      return;
    }
    index.insertAt(_arrayIdValues, _search.index, _id);
    index.insertAt(_indexes.id[1], _search.index, value._id);
    _data.push(value);
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
    if (!value._id && !isRemove) {
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

        //  During the same transaction :
        //   - If insert / update : the updated row will be merged with the inserted one
        //   - If Insert / delete : the inserted row will be removed
        if (_lowerVersion === _version && _upperVersion === _version && _data[i]._version[1] >= 0) {
          utils.merge(_data[i], _objToUpdate);
          _data[i]._version.pop();
          if (isRemove) {
            _data.splice(i, 1);
            return;
          }
          return _data[i];
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
    _data       = [];
    _currentId  = 1;
    _indexes.id = [[], []];
  }

  /**
   * Remove an item with the given id / value
   * @param {*} id
   * @param {Int} versionNumber force versionNumber (must call begin() first)
   * @returns {Boolean} true if the value has been removed, of false if not
   */
  function remove (id, versionNumber) {
    if (versionNumber && !_isTransactionCommit) {
      _addTransaction(versionNumber, { _id : id }, OPERATIONS.DELETE);
      return;
    }

    if (_getPrimaryKey) {
      var _obj = get(id);
      var _id  = _getPrimaryKey(_obj);
      _removeFromIndex(id, _id);
    }

    return upsert({ _id : id }, versionNumber, true);
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
        remove(_objToRollback[j]._id, _version);
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
        var _remove = remove(_transaction[i][1]._id);
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
   * Propagate reflexive update
   * @param {Object/Array} data objects to delete or insert
   * @param {String} operation
   */
  function propagateReflexive (data, operation) {
    if (!_reflexiveUpdateFn) {
      return;
    }

    if (data && !Array.isArray(data)) {
      data = [data];
    }

    var _version = begin();
    for (var i = 0; i < _data.length; i++) {
      var _item         = _data[i];
      var _lowerVersion = _item._version[0];
      var _upperVersion = _item._version[1];
      for (var j = 0; j < data.length; j++) {
        if (_lowerVersion <= currentVersionNumber && !_upperVersion && _item._id !== data[j]._id) {
          // Remember, we cannot directly edit a value from the collection (clone)
          var _obj = utils.clone(_item);
          if (operation === OPERATIONS.DELETE) {
            _obj = _reflexiveDeleteFn(_getPrimaryKey, data[j], _obj);
          }
          else if (operation === OPERATIONS.UPDATE) {
            _obj = _reflexiveUpdateFn(_getPrimaryKey, data[j], _obj);
          }

          if (_obj) {
            upsert(_obj, _version);
          }
        }
      }
    }

    return _internalCommit(_version);
  }

  return {
    get                : get,
    add                : add,
    upsert             : upsert,
    remove             : remove,
    clear              : clear,
    getFirst           : getFirst,
    begin              : begin,
    commit             : commit,
    rollback           : rollback,
    propagate          : propagate,
    propagateReflexive : propagateReflexive,

    _getIndexId : function () {
      return _indexes.id;
    },

    /**
     * Get all items in the collection
     * only for tests
     */
    _getAll : function () {
      return _data;
    },

    /**
     * Get all valid items in the collection
     * only for tests
     * @param {Array} ids
     */
    getAll : function (ids) {
      var _items = [];
      for (var i = 0; i < _data.length; i++) {
        var _item = _data[i];
        var _lowerVersion = _item._version[0];
        var _upperVersion = _item._version[1];
        if (_lowerVersion <= currentVersionNumber && !_upperVersion) {
          if (ids && ids.indexOf(_item._id) !== -1) {
            _items.push(_item);
          }
          else if (!ids) {
            _items.push(_item);
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
     * Get current version number
     */
    getCurrentVersionNumber : function () {
      return currentVersionNumber;
    }
  };
}

/**
 * Reset current version number
 */
function resetVersionNumber () {
  currentVersionNumber = 1;
}

exports.collection         = collection;
exports.resetVersionNumber = resetVersionNumber;
