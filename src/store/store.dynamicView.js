var storeUtils          = require('./store.utils.js');
var hooks               = require('./store.hook.js');
var collectionResultSet = require('./store.collectionResultSet.js');

/**
 * DynamicView that auto-update on store changes
 * @param {String} store
 * @param {Object} options
 * options.shouldNotInitialize
 */
function dynamicView (store, options) {
  var _store               = storeUtils.getStore(store);
  var _dynamicView         = { idIdx : {} };
  var _data                = [];
  var _hasBeenMaterialized = false;

  _dynamicView.shouldNotInitialize = options && options.shouldNotInitialize ? true : false;

  if (_store.isStoreObject) {
    throw new Error('Cannot initialize a DynamicView on a store object');
  }

  function _isMaterialized () {
    if (_hasBeenMaterialized || _dynamicView.shouldNotInitialize) {
      return;
    }

    _dynamicView.materialize();
  }

  /**
   * Update data with items
   * @param {Array|Object} items
   */
  function update (items) {
    if (!Array.isArray(items)) {
      items = [items];
    }

    var _index = _dynamicView.idIdx;
    for (var i = 0, len = items.length; i < len; i++) {
      if (_index[items[i]._id] != null) {
        _data.splice(_index[items[i]._id], 1, items[i]);
        continue;
      }

      _index[items[i]._id] = _data.length;
      _data.push(items[i]);
    }
  }

  /**
   * Move index when an item is removed from the view
   * @param {Int} index
   */
  function _moveIndex (index) {
    for (var i = index, len = _data.length; i < len; i++) {
      _dynamicView.idIdx[_data[i]._id]--;
    }
  }

  /**
   * Remove items from data
   * @param {Array|Object} items
   */
  function remove (items) {
    if (!Array.isArray(items)) {
      items = [items];
    }

    var _index = _dynamicView.idIdx;
    for (var i = 0, len = items.length; i < len; i++) {
      if (_index[items[i]._id] == null) {
        continue;
      }

      _data.splice(_index[items[i]._id], 1);
      _moveIndex(_index[items[i]._id]);
      _index[items[i]._id] = null;
      continue;
    }
  }

  /**
   * Reset view
   */
  function reset () {
    _data.splice(0);
    _dynamicView.idIdx   = {};
    _hasBeenMaterialized = false;
  }

  /**
   * Count items
   * @public
   */
  _dynamicView.count = function count () {
    _isMaterialized();
    return _data.length;
  };

  /**
   * Return views data
   * @public
   */
  _dynamicView.data = function data () {
    _isMaterialized();
    return _data;
  };

  /**
   * Materialize view (internal use)
   * @pulbic
   */
  _dynamicView.materialize = function materialize () {
    _data                = collectionResultSet(store).data();
    _hasBeenMaterialized = true;
  };

  /**
   * Destroy view: remove hooks
   */
  _dynamicView.destroy = function destroy () {
    hooks.removeHook('get@'    + _store.name, update);
    hooks.removeHook('insert@' + _store.name, update);
    hooks.removeHook('update@' + _store.name, update);
    hooks.removeHook('delete@' + _store.name, remove);
    hooks.removeHook('reset@'  + _store.name, reset);
  };

  hooks.hook('get@'    + _store.name, update);
  hooks.hook('insert@' + _store.name, update);
  hooks.hook('update@' + _store.name, update);
  hooks.hook('delete@' + _store.name, remove);
  hooks.hook('reset@'  + _store.name, reset);

  /**
   * Expose for internal use
   */
  _dynamicView._update = update;
  _dynamicView._remove = remove;

  return _dynamicView;
}

module.exports = dynamicView;
