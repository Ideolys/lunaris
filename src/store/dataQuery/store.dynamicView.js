var storeUtils          = require('../store.utils.js');
var hooks               = require('../store.hook.js');
var collectionResultSet = require('./store.collectionResultSet.js');
var queryResultSet      = require('./queryResultSet.js');

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
  var _pipeline            = [];

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

    var _itemsFiltered = _runPipeline(items);
    var _diff          = [];

    if (_pipeline.length) {
      for (var i = 0; i < items.length; i++) {
        var _hasBeenFound = false;

        for (var j = 0; j < _itemsFiltered.length; j++) {
          if (items[i]._id === _itemsFiltered[j]._id) {
            _hasBeenFound = true;
            break;
          }
        }

        if (!_hasBeenFound) {
          _diff.push(items[i]);
        }
      }

      if (_diff.length) {
        remove(_diff);
      }
    }

    var _index = _dynamicView.idIdx;
    for (var i = 0, len = _itemsFiltered.length; i < len; i++) {
      var _item = _itemsFiltered[i];
      if (_index[_item._id] != null) {
        _data.splice(_index[_item._id], 1, _item);
        continue;
      }

      _index[_item._id] = _data.length;
      _data.push(_item);
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
    _pipeline            = [];
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
    var _resultSet = collectionResultSet(store);

    for (var i = 0; i < _pipeline.length; i++) {
      var _criteria = _pipeline[i];
      _resultSet[_criteria.type].call(null, _criteria.args);
    }

    _dynamicView.idIdx   = {};
    let materializedData = _resultSet.data();
    for (var i = 0, len = materializedData.length; i < len; i++) {
      _data.splice(i, 1, materializedData[i]);
      _dynamicView.idIdx[materializedData[i]._id] = i;
    }

    _hasBeenMaterialized = true;
    return _dynamicView;
  };

  /**
   * Push find in pipeline
   * @public
   * @param {Object} queryResultSet find queryResultSet object from CollectionResultSet.find
   * @param {*} uid unique identifiant for the find
   * @returns {DynamicView}
   */
  _dynamicView.applyFindCriteria = function applyFindCriteria (queryResultSet, uid) {
    _pipeline.push({ id : uid, args : queryResultSet, type : 'find' });
    return _dynamicView;
  };
  /**
   * Push where in pipeline
   * @public
   * @param {Function} whereFn where function
   * @param {*} uid unique identifiant for the find
   * @returns {DynamicView}
   */
  _dynamicView.applyWhereCriteria = function applyWhereCriteria (whereFn, uid) {
    _pipeline.push({ id : uid, args : whereFn, type : 'where' });
    return _dynamicView;
  };
  /**
   * Push sort in pipeline
   * @public
   * @param {String|Array} sort
   * @param {*} uid unique identifiant for the find
   * @returns {DynamicView}
   */
  _dynamicView.applySortCriteria = function applySortCriteria (sort, uid) {
    _pipeline.push({ id : uid, args : sort, type : 'sort' });
    return _dynamicView;
  };

  /**
   * Remove a criteria
   * @param {*} uid unique identifiant for the criteria to remove
   * @returns {DynamicView}
   */
  _dynamicView.removeCriteria = function removeCriteria (uid) {
    for (var i = 0, len =_pipeline.length; i < len; i++) {
      if (_pipeline[i].id === uid && uid) {
        _pipeline.splice(i, 1);
        break;
      }
    }

    return _dynamicView;
  };
  /**
   * Remove all criterias
   * @returns {DynamicView}
   */
  _dynamicView.removeCriterias = function removeCriterias () {
    _pipeline = [];
    return _dynamicView;
  };

  function _runPipeline (data) {
    var _resultSet = queryResultSet(data, { shouldClone : false });

    for (var i = 0; i < _pipeline.length; i++) {
      var _criteria = _pipeline[i];
      _resultSet[_criteria.type].call(null, _criteria.args);
    }

    return _resultSet.data();
  }

  /**
   * Return a query object
   * @public
   * @returns {QueryResultSet}
   */
  _dynamicView.resultSet = function resultSet () {
    return queryResultSet(_data);
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
