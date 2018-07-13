var utils = require('./utils.js');

/**
 * @param {Int} startId from where to start id generation, default 1
 */
function collection (startId, startVersion) {
  var _data                 = [];
  var _currentId            = startId      && typeof startId      === 'number' ? startId      : 1;
  var _currentVersionNumber = startVersion && typeof startVersion === 'number' ? startVersion : 1;

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

      value._id = value._id || _currentId;
      _currentId++;

      value._version = [versionNumber || _currentVersionNumber];
      if (!versionNumber) {
        this.commit();
      }

      _data.push(value);
      return value;
    },

    /**
     * Update an item
     * @param {*} value
     * @param {Int} versionNumber force versionNumber (must call begin() first)
     * @returns {Object} inserted / updated value
     */
    upsert : function (value, versionNumber) {
      if (!value._id) {
        return this.add(value, versionNumber);
      }

      for (var i = 0; i < _data.length; i++) {
        var _version      = versionNumber || _currentVersionNumber;
        var _lowerVersion = _data[i]._version[0];
        var _upperVersion = _data[i]._version[1] || _version;
        if (_data[i]._id === value._id && _lowerVersion <= _version && _version <= _upperVersion) {
          var _objToUpdate = utils.clone(value);

          if (versionNumber) {
            _data[i]._version[1] = versionNumber;
          }
          else {
            _data[i]._version[1] = _currentVersionNumber;
          }

          if (!versionNumber) {
            this.commit();
          }

          return this.add(_objToUpdate, versionNumber ? _currentVersionNumber : null);
        }
      }
    },

    /**
     * Clear the collection
     */
    clear : function () {
      _data                 = [];
      _currentId            = 1;
      _currentVersionNumber = 1;
    },

    /**
     * Remove an item with the given id / value
     * @param {*} id
     * @returns {Boolean} true if the value has been removed, of false if not
     */
    remove : function (id) {
      for (var i = 0; i < _data.length; i++) {
        var _id           = _data[i]._id;
        var _lowerVersion = _data[i]._version[0];
        var _upperVersion = _data[i]._version[1] || _currentVersionNumber;
        if (_id === id  && _lowerVersion <= _currentVersionNumber && _currentVersionNumber <= _upperVersion) {
          _data[i]._version[1] = _currentVersionNumber;
          _currentVersionNumber++;
          return true;
        }
      }

      return false;
    },

    /**
     * Get a specific item
     * @param {Int} id
     */
    get : function (id) {
      for (var i = 0; i < _data.length; i++) {
        var _item = _data[i];
        var _lowerVersion = _item._version[0];
        var _upperVersion = _item._version[1] || _currentVersionNumber;
        if (_item._id === id && _lowerVersion <= _currentVersionNumber && _currentVersionNumber <= _upperVersion) {
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
      for (var i = 0; i < _data.length; i++) {
        var _id           = _data[i]._id;
        var _lowerVersion = _data[i]._version[0];
        var _upperVersion = _data[i]._version[1] || _currentVersionNumber;
        if (versionNumber >= _lowerVersion && versionNumber >= _upperVersion) {
          _objToRollback.push(utils.clone(_data[i]));
        }
      }

      var _version = this.begin();
      for (var j = 0; j < _objToRollback.length; j++) {
        this.upsert(_objToRollback[j], _version);
      }
      this.commit();
    },

    begin : function () {
      // If the collection has just been initialized, no need to update versionNumber
      if (_currentVersionNumber === 1) {
        return 1;
      }
      return _currentVersionNumber++;
    },

    commit : function () {
      _currentVersionNumber++;
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
      return _currentVersionNumber;
    }
  }
}

module.exports = collection;
