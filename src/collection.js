var utils = require('./utils.js');

var OPERATIONS = {
  'DELETE' : 'D',
  'INSERT' : 'I',
  'UPDATE' : 'U'
};

var currentVersionNumber = 1;

/**
 * @param {Int} startId from where to start id generation, default 1
 */
function collection (startId) {
  var _data      = [];
  var _currentId = startId && typeof startId === 'number' ? startId : 1;

  return {
    /**
     * Add some values to the collection
     * @param {*} values
     * @param {Int} versionNumber force versionNumber (must call begin() first)
     * @returns {Object} inserted value
     */
    add : function (value, versionNumber) {
      if (value === undefined || value === null || typeof value !== 'object') {
        throw new Error('add must have a value. It must be an Object.');
      }

      if (value._id) {
        value._id =  value._id;
      }
      else {
        value._id = _currentId;
        _currentId++;
      }

      value._version = [versionNumber || currentVersionNumber];
      if (!versionNumber) {
        this.commit();
      }

      value._operation = value._operation || OPERATIONS.INSERT;

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

      for (var i = _data.length - 1; i >= 0; i--) {
        var _version      = versionNumber || currentVersionNumber;
        var _lowerVersion = _data[i]._version[0];
        var _upperVersion = _data[i]._version[1] || _version;

        if (_data[i]._id === value._id && _lowerVersion <= _version && _version <= _upperVersion) {
          var _objToUpdate = utils.clone(value);

          if (isRemove) {
            _objToUpdate = utils.clone(_data[i]);
          }

          /**
           * During the same transaction :
           *  - If insert / update : the updated row will be merged with the inserted one
           *  - If Insert / delete : the inserted row will be removed
           */
          if (_lowerVersion === versionNumber && _upperVersion === versionNumber) {
            Object.assign(_data[i], _objToUpdate);
            if (isRemove) {
              _data.splice(i, 1);
            }
            return;
          }

          if (_data[i]._operation === OPERATIONS.DELETE) {
            _objToUpdate._operation = OPERATIONS.INSERT;
          }
          else {
            _objToUpdate._operation = OPERATIONS.UPDATE;
          }

          if (versionNumber) {
            _data[i]._version[1] = versionNumber;
          }
          else {
            _data[i]._version[1] = currentVersionNumber;
          }

          if (!versionNumber) {
            this.commit();
          }

          if (isRemove) {
            _objToUpdate._operation = OPERATIONS.DELETE;
          }

          return this.add(_objToUpdate, versionNumber ? currentVersionNumber : null);
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
      this.upsert({ _id : id }, versionNumber, true);
    },

    /**
     * Get a specific item
     * @param {Int} id
     */
    get : function (id) {
      for (var i = 0; i < _data.length; i++) {
        var _item = _data[i];
        var _lowerVersion = _item._version[0];
        var _upperVersion = _item._version[1] || currentVersionNumber;
        var _operation    = _item._operation;
        if (_item._id === id && _lowerVersion <= currentVersionNumber && currentVersionNumber <= _upperVersion && _operation !== OPERATIONS.DELETE) {
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
      var _objToRollback = [];
      for (var i = _data.length - 1; i >= 0; i--) {
        var _lowerVersion = _data[i]._version[0];
        var _upperVersion = _data[i]._version[1];
        if (versionNumber >= _lowerVersion && (versionNumber <= _upperVersion || !_upperVersion)) {
          _objToRollback.push(utils.clone(_data[i]));
        }
      }

      // Search last item value
      for (var k = 0; k < _objToRollback.length; k++) {
        for (var n = 0; n < _data.length; n++) {
          var _item = utils.clone(_data[n]);
          var _upperVersion = _item._version[1];
          if (_item._id === _objToRollback[k]._id && versionNumber === _upperVersion) {
            delete _item._operation;
            _objToRollback[k] = _item;
          }
        }
      }

      var _version = this.begin();
      for (var j = 0; j < _objToRollback.length; j++) {
        if (_objToRollback[j]._operation === OPERATIONS.INSERT) {
          this.upsert(_objToRollback[j], _version, true);
        }
        else {
          this.upsert(_objToRollback[j], _version);
        }
      }
      this.commit();
    },

    begin : function () {
      // If the collection has just been initialized, no need to update versionNumber
      if (currentVersionNumber === 1) {
        return 1;
      }
      return currentVersionNumber++;
    },

    commit : function () {
      currentVersionNumber++;
    },

    /**
     * Get all items in the collection
     * only for tests
     */
    _getAll : function () {
      return _data;
    },

    /**
     * Get current id
     */
    getCurrentId :  function () {
      return _currentId;
    },

    /**
     * Get current version number
     */
    getCurrentVersionNumber :  function () {
      return currentVersionNumber;
    }
    }
  }

/**
 * Reset current version number
 */
function resetVersionNumber () {
  currentVersionNumber = 1;
}

exports.collection         = collection;
exports.resetVersionNumber = resetVersionNumber;
