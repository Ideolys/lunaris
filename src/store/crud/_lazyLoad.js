var utils          = require('../../utils.js');
var indexedDB      = require('../../localStorageDriver.js').indexedDB;
var lunarisExports = require('../../exports.js');
var storeUtils     = require('../store.utils.js');
var hooks          = require('../store.hook.js');

/**
 * Register hooks for a store
 * @param {Object} store
 */
function registerStore (store) {
  // Register hooks
  var _watchedStores = [];
  for (i = 0; i < store.filters.length; i++) {
    var _handler = function (item) {
      store.paginationCurrentPage = 1;
      store.paginationOffset      = 0;
      hooks.pushToHandlers(store, 'reset');
    };

    var _filter = store.filters[i].source;
    if (_watchedStores.indexOf(_filter) === -1) {
      hooks.hook('filterUpdated' + _filter, _handler, false, true);
      hooks.hook('reset'         + _filter, _handler, false, true);

      _watchedStores.push(_filter);
      _filter = _filter.replace('@', '');
      lunarisExports._stores[_filter].isFilter = true;
    }
  }
}

function _loadDependentStores (store, callback)  {
  var _dependentStores = [];
  _dependentStores = _dependentStores.concat(store.storesToPropagate || []).concat(store.storesToPropagateReferences || []);

  utils.queue(_dependentStores, function (storeToLoad, next) {
    try {
      var _store = storeUtils.getStore('@' + storeToLoad);
    }
    catch (e) {
      return next();
    }

    if (_store.isInitialized) {
      return next();
    }

    load(_store, [next, null]);
  }, callback);
}


function _end (store, fnAndParams) {
  _loadDependentStores(store, function () {
    fnAndParams[0].apply(null, fnAndParams[1]);
  });
}

/**
 * Init a store
 * Internal use to lazy load stores
 * @param {Object} store
 * @param {Array} fnAndParams [function to call, parameters]
 * @param {Boolean} isRetry whenever to retry or not after an error
 */
function load (store, fnAndParams, isRetry) {
  if (!lunarisExports.isBrowser) {
    store.isInitialized = true;
    return _end(store, fnAndParams);
  }

  // Retrieve store state
  indexedDB.get('_states', store.name, function (err, state) {
    if (err) {
      if (isRetry) {
        lunaris.warn('lazy_load@' + store.name, err);
        return _end(store, fnAndParams);
      }

      store.isInitialized = true;
      return load(store, fnAndParams, true);
    }

    if (!state) {
      store.isInitialized = true;
      return _end(store, fnAndParams);
    }

    store.data.setCurrentId(state.collection.currentId);
    store.data.setCurrentRowId(state.collection.currentRowId);
    store.massOperations = state.massOperations;

    // Retrieve store collection data
    indexedDB.getAll(store.name, function (err, data) {
      if (err) {
        if (isRetry) {
          lunaris.logger.warn(['lazy_load@' + store.name, 'Error when retrieving store collection'], err);
          return _end(store, fnAndParams);
        }

        store.isInitialized = true;
        return load(store, fnAndParams, true);
      }

      utils.deleteRows(data);
      store.data.setData(data);
      store.isInitialized = true;

      _end(store, fnAndParams);
    });
  });
}

exports.load     = load;
exports.register = registerStore;
