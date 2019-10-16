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
var transaction     = require('../store.transaction.js');
var hook            = require('../store.hook.js');
var template        = require('../store.template.js');
var upsertCRUD      = require('./upsert.js');
var indexedDB       = require('../../localStorageDriver.js').indexedDB;
var getRequestQueue = {};
var OPERATIONS      = utils.OPERATIONS;
var debug           = require('../../debug.js');
var debugObject     = debug.debug(null, debug.NAMESPACES.PERFORMANCE);


/**
 * Process next get request in queue
 * @param {String} store
 */
function _processNextGetRequest (store) {
  var _getRequest = getRequestQueue[store].shift();

  if (!_getRequest) {
    return;
  }

  if (_getRequest.length === 3) {
    _getRequest = _getRequest.concat([null, _processNextGetRequest]);
  }

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
 * Get cache values for GET
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} request
 * @param {Int} transactionId
 * @param {Function} callback
 * @param {Function} nextGet handler to call next get in queue
 */
function _getCache (store, collection, request, transactionId, callback, nextGet) {
  var _cacheValues = cache.get(store.name, md5(request.request));
  var _values      = [];

  if (_cacheValues) {
    debug.log(store.name, debug.NAMESPACES.CACHE, 'Get ' + decodeURIComponent(request.request));

    if (typeof _cacheValues === 'object') {
      storeUtils.saveState(store, collection);
      _values = _transformGetCache(collection, store.clone(_cacheValues));
    }

    return crudUtils.afterAction(store, 'get', _values, null, function () {
      if (store.isFilter) {
        return hook.pushToHandlers(store, 'filterUpdated', null, transactionId, function () {
          nextGet('@' + store.name);
        });
      }

      nextGet('@' + store.name);
    });
  }

  callback();
}

/**
 * Get local values and send evens for GET
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} request
 * @param {Integer} transactionId
 * @param {Function} callback
 * @param {Function} nextGet handler to call next get in queue
 */
function _getLocal (store, collection, request, transactionId, callback, nextGet) {
  if (!offline.isOnline || store.isLocal) {
    var _res = storeOffline.filter(
      store,
      collection,
      request
    );

    return crudUtils.afterAction(store, 'get', _res, null, function () {
      if (store.isFilter && ((store.isStoreObject && _res) || (!store.isStoreObject && _res.length))) {
        return hook.pushToHandlers(store, 'filterUpdated', null, transactionId, function () {
          storeUtils.saveState(store, collection, function () {
            nextGet('@' + store.name);
          });
        });
      }

      storeUtils.saveState(store, collection, function () {
        nextGet('@' + store.name);
      });
    });
  }

  callback();
}

/**
 * Make a GET HTTP request
 * @param {Object} store
 * @param {Object} collection
 * @param {String} request
 * @param {*} primaryKeyValue -> GET /store/:primaryKeyValue
 * @param {Integer} transactionId
 * @param {Function} callback callback for the get
 * @param {Function} nextGet handler to call next get in queue
 */
function _getHTTP (store, collection, request, primaryKeyValue, transactionId, callback, nextGet) {
  http.request('GET', request, null, function (err, data) {
    if (err) {
      var _error = template.getError(err, store, 'GET', true);
      upsertCRUD.setLunarisError(store.name, 'GET', request, null, null, err, _error);
      logger.warn(['lunaris.get@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', { error : _error }, transactionId, function () {
        nextGet('@' + store.name);
      });
    }

    var _version = collection.begin();
    if (Array.isArray(data)) {
      if (store.isStoreObject) {
        logger.warn(
          ['lunaris.get@' + store.name],
          new Error('The store "' + store.name + '" is an object store. The GET method cannot return multiple elements!')
        );
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
          return hook.pushToHandlers(store, 'filterUpdated', null, transactionId, function () {
            storeUtils.saveState(store, collection, callback);
          });
        }

        storeUtils.saveState(store, collection, callback);
      });
    });
  }, { store : store.name });
}

/**
 * Make get
 * @param {String} store
 * @param {*} primaryKeyValue
 * @param {Object} retryOptions {
 *   url,
 * }
 * @param {Interger} transactionId
 * @param {function} callback _processNextGetRequest(store)
 */
function _get (store, primaryKeyValue, retryOptions, transactionId, callback) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);
    var _request = '/';

    if (!retryOptions) {
      _request = url.create(_options.store, 'GET', primaryKeyValue);
      // required filters condition not fullfilled
      if (!_request) {
        return callback(store);
      }

      return _getCache(_options.store, _options.collection, _request, transactionId, function () {
        _getLocal(_options.store, _options.collection, _request, transactionId, function () {
          _request = _request.request;
          _getHTTP(_options.store, _options.collection, _request, primaryKeyValue, transactionId, function () {
            // do something at the end of the get
            callback(store);
          }, callback);
        }, callback);
      }, callback);
    }

    _request = retryOptions.url || '/';

    _getHTTP(_options.store, _options.collection, _request, primaryKeyValue, transactionId, function () {
      // do something at the end of the get
      callback(store);
    }, callback);
  }
  catch (e) {
    logger.warn(['lunaris.get' + store], e);
  }
}


/**
 * Get values
 * @param {String} store
 * @param {*} primaryKeyValue
 * @param {Object} retryOptions {
 *   url,
 * }
 */
function get (store, primaryKeyValue, retryOptions) {
  if (!getRequestQueue[store]) {
    getRequestQueue[store] = [];
  }

  if (transaction.isTransaction) {
    return transaction.addAction({
      id        : transaction.getCurrentTransactionId(),
      store     : store.replace('@', ''),
      operation : OPERATIONS.LIST,
      handler   : _get,
      arguments : [store, primaryKeyValue, retryOptions, transaction.getCurrentTransactionId()]
    });
  }

  getRequestQueue[store].push([store, primaryKeyValue, retryOptions]);

  if (getRequestQueue[store].length === 1) {
    _processNextGetRequest(store);
  }
}

/**
 * LOAD : load all data from an API
 */

/**
 * Load all data from a store
 * @param {String} store ex: '@store'
 * @param {Object} options
 */
function load (store, options) {
  if (transaction.isTransaction) {
    return transaction.addAction({
      id        : transaction.getCurrentTransactionId(),
      store     : store.replace('@', ''),
      operation : OPERATIONS.LIST,
      handler   : _load,
      arguments : [store, options, transaction.getCurrentTransactionId()]
    });
  }

  _load(store, options);
}

/**
 * Load all data from a store
 * @param {String} store ex: '@store'
 * @param {Object} options { limit : Int }
 * @param {Int} transactionId internal use for transaction
 * @param {Function} callback internal use for transaction
 */
function _load (store, options, transactionId, callback) {
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
          return hook.pushToHandlers(_options.store, 'errorHttp', { error : _error }, transactionId, function () {
            if (callback) {
              callback();
            }
          });
        }

        if (!Array.isArray(data)) {
          data = [data];
        }

        debug.log(_options.store.name, debug.NAMESPACES.CRUD, 'load ' + data.length + ' objects');

        var _version = _options.collection.begin();
        for (var i = 0, len = data.length; i < len; i++) {
          _options.collection.add(data[i], _version);
        }

        debugObject.time(_options.store.name);
        _options.collection.commit(_version);
        debugObject.timeEnd(_options.store.name, ['commit_collection']);

        storeUtils.saveState(_options.store, _options.collection, function () {
          hook.pushToHandlers(_options.store, 'loaded', null, transactionId, function () {
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
