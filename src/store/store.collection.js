var utils      = require('../utils.js');
var OPERATIONS = utils.OPERATIONS;
var aggregates = require('./store.aggregate.js').aggregates;

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

// Code form LokiJS,& Mindex
var index = {
  /**
   * Sort
   * @param {*} a
   * @param {*} b
   * @return {Int}
   */
  sort : function sort (a, b) {
    if (a === null && b === null) {
      return 0;
    }

    if (a === null) {
      return -1;
    }

    if (b === null) {
      return 1;
    }

    if (a < b) {
      return -1;
    }

    if (a > b) {
      return 1;
    }

    return 0;
  },

  /**
   * Insert value at specified index
   * @param {Array} array
   * @param {int} index
   * @param {*} value
   * @return {Array}
   */
  insertAt : function insertAt (array, index, value) {
    array.splice(index, 0, value);
    return array;
  },

  /**
   * Removed value at specified index
   * @param {Array} array
   * @param {*} index
   * @returns {Array}
   */
  removeAt : function removeAt (array, index) {
    array.splice(index, 1);
    return array;
  },

  /**
   * BinarySearh
   * @param {Array} array
   * @param {*} value
   * @returns {Object} { found : Boolean, index : Int }
   */
  binarySearch : function binarySearch (array, value) {
    var lo = 0;
    var hi = array.length;
    var compared;
    var mid;

    while (lo < hi) {
      mid = ((lo + hi) / 2) | 0;
      compared = this.sort(value, array[mid]);
      if (compared === 0) {
        return {
          found : true,
          index : mid
        };
      } else if (compared < 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }

    return {
      found : false,
      index : hi
    };
  }
};

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
 */
function collection (startId, getPrimaryKeyFn, isStoreObject, joinsDescriptor) {
  var _data                     = [];
  var _currentId                = startId && typeof startId === 'number' ? startId : 1;
  var _transactions             = {};
  var _isTransactionCommit      = false;
  var _transactionVersionNumber = null;
  var _isStoreObject            = isStoreObject   || false;
  var _joinsDescriptor          = joinsDescriptor || {};
  var _joins                    = joinsDescriptor ? Object.keys(_joinsDescriptor.joins) : [];
  var _getPrimaryKey            = getPrimaryKeyFn;
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

    _joinsDescriptor.joinFns.set(value, _joinValues, aggregates);
  }

  /**
   * Add value to the array of collection values and set the index id
   * @param {Object} value
   * @param {Int} versionNumber
   * @param {Boolean} isFromIndex
   */
  function _addToValues (value, versionNumber, isFromIndex) {
    if (isFromIndex || !_getPrimaryKey) {
      return _data.push(value);
    }

    var _id = _getPrimaryKey(value);
    if (!_id) {
      return _data.push(value);
    }

    var _arrayIdValues = _indexes.id[0];
    var _search        = index.binarySearch(_arrayIdValues, _id);
    // We upsert the last version of the object
    if (_search.found) {
      value._id = _indexes.id[1][_search.index];
      value     = upsert(value, versionNumber, false, true);
      return;
    }

    index.insertAt(_arrayIdValues, _search.index, _id);
    index.insertAt(_indexes.id[1], _search.index, value._id);
    _data.push(value);
  }

  /**
   * Remove a value from the id index
   * @param {Int} _id
   */
  function _removeFromIndex (_id) {
    var _arrayIdValues = _indexes.id[0];
    var _search        = index.binarySearch(_arrayIdValues, _id);
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

    if (!(value._id && isFromUpsert)) {
      _setJoinValues(value);
      value._id = _currentId;
      _currentId++;
    }

    value._version = [versionNumber || currentVersionNumber];
    if (!_isTransactionCommit) {
      incrementVersionNumber();
    }

    _addToValues(value, versionNumber, isFromIndex);
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

        // _objToUpdate._operation = OPERATIONS.UPDATE;
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

    _removeFromIndex(id);
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
    commit(_version);
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
        _res.push(remove(_transaction[i][1]._id));
      }
    }

    _transactions[versionNumber] = _transactionVersionNumber;
    _isTransactionCommit         = false;
    _transactionVersionNumber    = null;
    incrementVersionNumber();
    return _res;
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
     * @param {Object}} data
     * @param {String} operation
     */
    function _updateObject (object, data, operation) {
      if (operation === OPERATIONS.INSERT) {
        return _joinsDescriptor.joinFns[store].insert(object, data, aggregates);
      }
      else if (operation === OPERATIONS.DELETE) {
        return _joinsDescriptor.joinFns[store].delete(object, data, aggregates);
      }
      else if (operation === OPERATIONS.UPDATE) {
        _joinsDescriptor.joinFns[store].delete(object, data);
        return _joinsDescriptor.joinFns[store].insert(object, data, aggregates);
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

    return commit(_version);
  }

  return {
    get       : get,
    add       : add,
    upsert    : upsert,
    remove    : remove,
    clear     : clear,
    getFirst  : getFirst,
    begin     : begin,
    commit    : commit,
    rollback  : rollback,
    propagate : propagate,

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

      return _items;
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
