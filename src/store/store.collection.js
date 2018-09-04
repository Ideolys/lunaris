var utils      = require('../utils.js');
var OPERATIONS = utils.OPERATIONS;

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
 */
function collection (startId) {
  var _data                     = [];
  var _currentId                = startId && typeof startId === 'number' ? startId : 1;
  var _transactions             = {};
  var _isTransactionCommit      = false;
  var _transactionVersionNumber = null;

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

  return {
    /**
     * Add some values to the collection
     * @param {*} values
     * @param {Int} versionNumber force versionNumber (must call begin() first)
     * @returns {Object} inserted value
     */
    add : function (value, versionNumber, isFromUpsert) {
      if (value === undefined || value === null || typeof value !== 'object') {
        throw new Error('add must have a value. It must be an Object.');
      }

      if (versionNumber && !_isTransactionCommit) {
        _addTransaction(versionNumber, value, OPERATIONS.INSERT);
        return;
      }

      if (!(value._id && isFromUpsert)) {
        value._id = _currentId;
        _currentId++;
      }

      value._version = [versionNumber || currentVersionNumber];
      if (!_isTransactionCommit) {
        incrementVersionNumber();
      }

      _data.push(value);
      return value;
    },

    /**
     * Update an item
     * @param {*} value
     * @param {Int} versionNumber force versionNumber (must call begin() first)
     * @param {Boolean} isRemove
     * @returns {Object} inserted / updated value
     */
    upsert : function (value, versionNumber, isRemove) {
      if (!value._id && !isRemove) {
        return this.add(value, versionNumber);
      }

      if (versionNumber && !_isTransactionCommit) {
        _addTransaction(versionNumber, value, OPERATIONS.UPDATE);
        return;
      }

      for (var i = 0; i <_data.length; i++) {
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
            return this.add(_objToUpdate, _transactionVersionNumber ? _transactionVersionNumber : null, true);
          }
          else {
            return _data[i];
          }
        }
      }
    },

    /**
     * Clear the collection
     */
    clear : function () {
      _data      = [];
      _currentId = 1;
    },

    /**
     * Remove an item with the given id / value
     * @param {*} id
     * @param {Int} versionNumber force versionNumber (must call begin() first)
     * @returns {Boolean} true if the value has been removed, of false if not
     */
    remove : function (id, versionNumber) {
      if (versionNumber && !_isTransactionCommit) {
        _addTransaction(versionNumber, { _id : id }, OPERATIONS.DELETE);
        return;
      }
      return this.upsert({ _id : id }, versionNumber, true);
    },

    /**
     * Get a specific item
     * @param {Int} id
     */
    get : function (id) {
      for (var i = 0; i < _data.length; i++) {
        var _item         = _data[i];
        var _lowerVersion = _item._version[0];
        var _upperVersion = _item._version[1];
        if (_item._id === id && _lowerVersion <= currentVersionNumber && !_upperVersion) {
          return _item;
        }
      }

      return null;
    },

    /**
     * Get first item
     * @param {Int} id
     */
    getFirst : function () {
      if (!_data[0]) {
        return undefined;
      }
      return this.get(_data[0]._id);
    },

    /**
     * Rollback items to the corresponding version number
     * @param {Int} versionNumber
     */
    rollback : function (versionNumber) {
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

      var _version = this.begin();
      for (var j = 0; j < _objToRollback.length; j++) {
        if (_objToRollback[j]._version[1]) {
          this.add(_objToRollback[j], _version);
        }
        else {
          this.remove(_objToRollback[j]._id, _version);
        }
      }
      this.commit(_version);
    },

    /**
     * Begin the collection transaction
     */
    begin : function () {
      _transactions[currentVersionNumber] = [];
      return currentVersionNumber;
    },

    /**
     * Commit the transaction version number
     * @param {Int} versionNumber
     */
    commit : function (versionNumber) {
      var _res         = [];
      var _transaction = _transactions[versionNumber];
      if (!_transaction) {
        return;
      }

      _isTransactionCommit      = true;
      _transactionVersionNumber = currentVersionNumber;

      for (var i = 0; i < _transaction.length; i++) {
        if (_transaction[i][2] === OPERATIONS.INSERT) {
          _res.push(this.add(_transaction[i][1], null, true));
        }
        else if (_transaction[i][2] === OPERATIONS.UPDATE) {
          _res.push(this.upsert(_transaction[i][1]));
        }
        else {
          _res.push(this.remove(_transaction[i][1]._id));
        }
      }

      _transactions[versionNumber] = _transactionVersionNumber;
      _isTransactionCommit         = false;
      _transactionVersionNumber    = null;
      incrementVersionNumber();
      return _res;
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
