var logger     = require('../../logger.js');
var cache      = require('../../cache.js');
var utils      = require('../../utils.js');
var storeUtils = require('../store.utils.js');
var offline    = require('../../offline.js');
var hook       = require('../store.hook.js');
var crudUtils  = require('./crudUtils.js');
var http       = require('../../http.js');
var url        = require('../store.url.js');
var template   = require('../store.template.js');
var sync       = require('../store.synchronisation.js');
var upsertCrud = require('./upsert.js');
var lazyLoad   = require('./_lazyLoad.js');
var queue      = utils.queue;
var OPERATIONS = utils.OPERATIONS;

sync.setImportFunction(deleteStore);

/**
 * Delete value in referenced stores
 * @param {Object} store
 * @param {Object} value
 * @param {Function} callback (err)
 */
function _deleteValueInReferencedStores (store, collection, value, callback) {
  // If references, we must find if the id is still referenced
  var _storesToPropagateLength = store.storesToPropagateReferences.length;

  if (!_storesToPropagateLength) {
    return callback();
  }

  var _indexIds    = collection.getIndexDataCache();
  var _indexArray  = _indexIds[value._id];

  if (_indexArray == null) {
    return callback();
  }

  var _pkValue = storeUtils.getPrimaryKeyValue(store, collection.get(value._id));

  queue(store.storesToPropagateReferences, function handlerItem (storeToPropagate, next) {
    var _store      = storeUtils.getStore('@' + storeToPropagate);
    var _collection = storeUtils.getCollection(_store);
    var _references = _collection.getIndexReferences();

    if (!_references[store.name]) {
      return next();
    }

    if (!_references[store.name][_pkValue]) {
      return next();
    }

    var error = '${Cannot delete the value, it is still referenced in the store} ' + _store.nameTranslated;
    hook.pushToHandlers(store, 'error', { error : error, data : null }, function () {
      callback(true);
    });
  }, callback);
}

/**
 * Delete value in collection
 * @param {Object} store
 * @param {Object} collection
 * @param {*} value
 * @param {Boolean} isLocal
 * @param {Function} callback
 */
function _deleteLocal (store, collection, value, isLocal, callback) {
  var _version = collection.begin();

  _deleteValueInReferencedStores(store, collection, value, function (isError) {
    if (isError) {
      return callback(isError);
    }

    collection.remove(value, _version, !isLocal);
    value = collection.commit(_version);
    var _isArray = Array.isArray(value);

    if (isLocal && ((!_isArray && !value) || (_isArray && !value.length))) {
      return callback(new Error('You cannot delete a value not in the store!'));
    }

    crudUtils.propagate(store, value, utils.OPERATIONS.DELETE, function () {
      crudUtils.afterAction(store, 'delete', value, null, function () {
        if (!store.isStoreObject) {
          value = value[0];
        }

        cache.invalidate(store.name);
        storeUtils.saveState(store, collection, function () {
          callback(null, [_version, value]);
        });
      });
    });
  });
}

/**
 * Make a DELETE HTTP request
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} value
 * @param {Int} version
 * @param {Object} version
 * @param {Function} callback (err)
 */
function _deleteHttp (store, collection, value, version, options, callback) {
  if (store.isLocal || options.isLocal) {
    return callback(null, value);
  }

  var _request = '/';
  if (!options.retryOptions) {
    _request = url.create(store, 'DELETE', storeUtils.getPrimaryKeyValue(store, value));
    // required filters consition not fullfilled
    if (!_request) {
      return callback('No url. Maybe the required filters are not set');
    }
    _request = _request.request;
  }
  else {
    _request = options.retryOptions.url;
  }

  if (!offline.isOnline) {
    sync.setOfflineHttpTransaction(store.name, OPERATIONS.DELETE, _request, value);
    return callback();
  }

  http.request('DELETE', _request, null, function (err, data) {
    if (err) {
      var _error = template.getError(err, store, 'DELETE', false);
      upsertCrud.setLunarisError(store.name, 'DELETE', _request, value, version, err, _error);
      logger.warn(['lunaris.delete@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', { error : _error, data : value }, function () {
        callback(err);
      });
    }

    _deleteLocal(store, collection, data, false, function (err, dataCollection) {
      if (err) {
        return callback(err);
      }

      if (dataCollection[1]) {
        value = dataCollection[1];
      }
      crudUtils.afterAction(store, 'deleted', utils.merge(value, data), template.getSuccess(null, store, 'DELETE', false), function () {
        callback(null, utils.merge(value, data));
      });
    });
  });
}

/**
 * Delete a value from a store
 * @param {String} store
 * @param {*} value
 * @param {Object} options
 *  retryOptions { // for offline sync
 *    url,
 *    data,
 *    version
 *  },
 *  isLocal : {Boolean}
 * @param {Function} callback
 */
function deleteStore (store, value, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  if (!options) {
    options = {};
  }

  callback = callback || function () {};

  try {
    if (options.retryOptions) {
      value = options.retryOptions.data;
    }
    var _options = crudUtils.beforeAction(store, value);

    if (!_options.store.isInitialized) {
      return lazyLoad.load(_options.store, [deleteStore, arguments]);
    }

    var _version;
    if (!options.retryOptions) {
      return _deleteLocal(_options.store, _options.collection, value, true, function (err, data) {
        if (err) {
          callback(err);
          throw err;
        }

        _version = data[0];
        value    = data[1];

        _deleteHttp(_options.store, _options.collection, value, _version, options, function (err, data) {
          if (err) {
            callback(err);
            throw err;
          }

          callback(null, data);
        });
      });

    }

    _version = options.retryOptions.version;

    _deleteHttp(_options.store, _options.collection, value, _version, options, function (err, data) {
      if (err) {
        callback(err);
        throw err;
      }

      callback(null, data);
    });
  }
  catch (e) {
    logger.warn(['lunaris.delete' + store], e);
  }
}

exports.delete = deleteStore;
