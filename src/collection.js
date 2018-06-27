/**
 * @param {Int} startId fromw where to start id geenation, default 1
 */
function collection (startId) {
  var _data      = [];
  var _currentId = startId && typeof startId === 'number' ? startId : 1;

  return {
    /**
     * Add some values to the collection
     * @param {*} values
     */
    add : function (value) {
      if (value === undefined || value === null || typeof value !== 'object') {
        throw new Error('add must have a value. It must be an Object.');
      }

      value._id = _currentId;
      _currentId++;

      _data.push(value);
    },

    /**
     * Update an item
     * @param {*} value
     */
    upsert : function (value) {
      if (!value._id) {
        return this.add(value);
      }

      for (var i = 0; i < _data.length; i++) {
        if (_data[i]._id === value._id) {
          value._id = _data[i]._id;
          _data[i]  = value;
          return true;
        }
      }

      this.add(value);
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
     * @returns {Boolean} true if the value has been removed, of false if not
     */
    remove : function (id) {
      for (var i = 0; i < _data.length; i++) {
        var _id = _data[i]._id;
        if (_id === id) {
          _data.splice(i, 1);
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
        if (_item._id === id) {
          return _item;
        }
      }

      return null;
    },

    /**
     * Get first item
     * @param {Int} id
     */
    getFirst : function (id) {
      return _data[0];
    },

    /**
     * Get all items in the collection
     */
    getAll : function () {
      return _data;
    },

    /**
     * Get current id
     */
    getCurrentId :  function () {
      return _currentId;
    }
  }
}

module.exports = collection;
