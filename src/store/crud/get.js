var storeOffline    = require('../store.offline.js');
var md5             = require('../../md5.js');
var http            = require('../../http.js');
var logger          = require('../../logger.js');
var cache           = require('../../cache.js');
var url             = require('../store.url.js');
var utils           = require('../../utils.js');
var storeUtils      = require('../store.utils.js');
var crudUtils       = require('./crudUtils.js');
var offline         = require('../../offline.js');
var hook            = require('../store.hook.js');
var template        = require('../store.template.js');
var upsertCRUD      = require('./upsert.js');
var indexedDB       = require('../../localStorageDriver.js').indexedDB;
var lazyLoad        = require('./_lazyLoad.js');
var getRequestQueue = {};
var OPERATIONS      = utils.OPERATIONS;


/**
 * Process next get request in queue
 * @param {String} store
 */
function _processNextGetRequest (store) {
  var _getRequest = getRequestQueue[store].shift();

  if (!_getRequest) {
    return;
  }

  // if (_getRequest.length === 3) {
    _getRequest = _getRequest.concat([_processNextGetRequest]);
  // }

  _get.apply(null, _getRequest);
}

/**
 * Insert and return cache values in store collection
 * @param {*} store
 * @param {*} collection
 * @param {*} values
 */
function _transformGetCache (collection, values) {
  var _version = collection.begin();
  if (Array.isArray(values)) {
    for (var i = 0; i < values.length; i++) {
      collection.add(values[i], _version);
    }
  }
  else {
    collection.add(values, _version);
  }
  return collection.commit(_version);
}


/**
 * Return cache values
 * @param {Object} store
 * @param {Object} collection
 * @param {String} request
 * @param {Array} cacheValues
 * @param {Object} options
 * @param {Function} nextGet
 */
function _returnCacheValues (store, collection, request, cacheValues, options, nextGet) {
  var _values = [];

  if (typeof cacheValues === 'object') {
    storeUtils.saveState(store, collection);
    _values = _transformGetCache(collection, store.clone(cacheValues));
  }

  return crudUtils.afterAction(store, 'get', _values, null, function () {
    if (store.isFilter) {
      return hook.pushToHandlers(store, 'filterUpdated', null, function () {

        options.callback(null, _values);
        nextGet('@' + store.name);
      });
    }

    options.callback(null, _values);
    nextGet('@' + store.name);
  });
}

/**
 * Get local values and send evens for GET
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} request
 * @param {Object} options
 * @param {Function} nextGet handler to call next get in queue
 */
function _returnLocalValues (store, collection, request, options, nextGet) {
  var _res = storeOffline.filter(
    store,
    collection,
    request
  );

  crudUtils.afterAction(store, 'get', _res, null, function () {
    if (store.isFilter && ((store.isStoreObject && _res) || (!store.isStoreObject && _res.length))) {
      return hook.pushToHandlers(store, 'filterUpdated', null, function () {
        storeUtils.saveState(store, collection, function () {
          options.callback(null, _res);
          nextGet('@' + store.name);
        });
      });
    }

    storeUtils.saveState(store, collection, function () {
      options.callback(null, _res);
      nextGet('@' + store.name);
    });
  });
}

/**
 * Make a GET HTTP request
 * @param {Object} store
 * @param {Object} collection
 * @param {String} request
 * @param {*} primaryKeyValue -> GET /store/:primaryKeyValue
 * @param {Integer} transactionId
 * @param {Function} nextGet handler to call next get in queue
 */
function _getHTTP (store, collection, request, primaryKeyValue, options, nextGet) {
  http.request('GET', request, null, function (err, data) {
    if (err) {
      var _error = template.getError(err, store, 'GET', true);
      upsertCRUD.setLunarisError(store.name, 'GET', request, null, null, err, _error);
      logger.warn(['lunaris.get@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', { error : _error }, function () {
        options.callback(err);
        nextGet('@' + store.name);
      });
    }

    var _version = collection.begin();
    if (Array.isArray(data)) {
      if (store.isStoreObject) {
        err = 'The store "' + store.name + '" is an object store. The GET method cannot return multiple elements!';
        logger.warn(
          ['lunaris.get@' + store.name],
          new Error(err)
        );
        options.callback(err);
        return nextGet('@' + store.name);
      }

      cache.add(store.name, md5(request), store.clone(data));

      for (var i = 0; i < data.length; i++) {
        collection.upsert(data[i], _version);
      }

      if (primaryKeyValue && data.length) {
        data = data[0];
      }
    }
    else {
      cache.add(store.name, md5(request), store.clone(data));
      collection.upsert(data, _version);
    }

    data = collection.commit(_version);


    crudUtils.propagate(store, data, utils.OPERATIONS.INSERT, function () {
      crudUtils.afterAction(store, 'get', data, null, function () {
        if (store.isFilter) {
          return hook.pushToHandlers(store, 'filterUpdated', null, function () {
            storeUtils.saveState(store, collection, function () {
              options.callback(null, data);
              nextGet('@' + store.name);
            });
          });
        }

        storeUtils.saveState(store, collection, function () {
          options.callback(null, data);
          nextGet('@' + store.name);
        });
      });
    });
  }, { store : store.name });
}

/**
 * Make get
 * @param {String} store
 * @param {*} primaryKeyValue
 * @param {Object} options {
 *   callback
 * }
 * @param {Function} next _processNextGetRequest(store)
 */
function _get (store, primaryKeyValue, options, next) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);

    if (!_options.store.isInitialized) {
      return lazyLoad.load(_options.store, [_get, arguments]);
    }

    var _request = '/';

    _request = url.create(_options.store, 'GET', primaryKeyValue);
    _options.store.paginationOffset = _options.store.paginationLimit * _options.store.paginationCurrentPage;
    _options.store.paginationCurrentPage++;

    // required filters condition not fullfilled
    if (!_request) {
      options.callback('No url. Maybe the required filters are not set');
      return next(store);
    }

    var _cacheValues = cache.get(store.name, md5(_request.request));
    if (_cacheValues) {
      return _returnCacheValues(_options.store, _options.collection, _request.request, _cacheValues, options, next);
    }

    if (!offline.isOnline || _options.store.isLocal) {
      return _returnLocalValues(_options.store, _options.collection, _request, options, next);
    }

    _getHTTP(_options.store, _options.collection, _request.request, primaryKeyValue, options, next);
  }
  catch (e) {
    logger.warn(['lunaris.get' + store], e);
  }
}


/**
 * Get values
 * @param {String} store
 * @param {*} primaryKeyValue
 * @param {Object} options @optional
 * @param {Function}
 */
function get (store, primaryKeyValue, options, callback) {
  if (!getRequestQueue[store]) {
    getRequestQueue[store] = [];
  }

  if (typeof primaryKeyValue === 'function') {
    callback        = primaryKeyValue;
    primaryKeyValue = null;
  }

  if (typeof options === 'function') {
    callback = options;
    options  = null;
  }

  if (typeof primaryKeyValue === 'object') {
    options         = primaryKeyValue;
    primaryKeyValue = null;
  }

  if (!options) {
    options = {};
  }

  options.callback = callback || function () {};

  getRequestQueue[store].push([store, primaryKeyValue, options]);

  if (getRequestQueue[store].length === 1) {
    _processNextGetRequest(store);
  }
}


/**
 * Load all data from a store
 * @param {String} store ex: '@store'
 * @param {Object} options { limit : Int }
 * @param {Function} callback internal use for transaction
 */
function load (store, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = null;
  }

  if (!callback) {
    callback = function () {};
  }

  if (!options) {
    options = {};
  }

  try {
    if (!offline.isRealOnline) {
      throw new Error('You are offline!');
    }

    if (!offline.isOfflineMode) {
      throw new Error('Offline mode is not enabled!');
    }

    var _options = crudUtils.beforeAction(store, null, true);

    if (_options.store.isLocal) {
      throw new Error('The store is local!');
    }

    if (options == null) {
      options = {};
    }

    _options.store.paginationCurrentPage = 1;
    _options.store.paginationOffset      = 0;
    _options.store.paginationLimit       = 50;
    _options.store.massOperations        = {};
    cache.invalidate(_options.store.name);
    _options.collection.clear();
    indexedDB.clear(_options.store.name);

    storeUtils.saveState(_options.store, _options.collection, function () {
      if (options.limit) {
        _options.store.paginationLimit = options.limit;
      }

      var _request = url.create(_options.store, 'GET', null, !!options.limit).request;

      http.request('GET', _request, null, function (err, data) {
        if (err) {
          var _error = template.getError(err, _options.store, 'GET', true);
          upsertCRUD.setLunarisError(_options.store.name, 'GET', _request, null, null, err, _error);
          logger.warn(['lunaris.load@' + _options.store.name], err);
          return hook.pushToHandlers(_options.store, 'errorHttp', { error : _error }, function () {
            if (callback) {
              callback();
            }
          });
        }

        if (!Array.isArray(data)) {
          data = [data];
        }

        var _version = _options.collection.begin();
        for (var i = 0, len = data.length; i < len; i++) {
          _options.collection.add(data[i], _version);
        }

        _options.collection.commit(_version);

        storeUtils.saveState(_options.store, _options.collection, function () {
          hook.pushToHandlers(_options.store, 'loaded', null, function () {
            if (callback) {
              callback();
            }
          });
        });
      }, {
        isOffline : true,
        store     : _options.store.name
      });
    });
  }
  catch (e) {
    logger.warn(['lunaris.load' + store], e);
  }
}

exports.get  = get;
exports.load = load;
