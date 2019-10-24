var logger      = require('../../logger.js');
var cache       = require('../../cache.js');
var utils       = require('../../utils.js');
var storeUtils  = require('../store.utils.js');
var offline     = require('../../offline.js');
var transaction = require('../store.transaction.js');
var hook        = require('../store.hook.js');
var crudUtils   = require('./crudUtils.js');
var http        = require('../../http.js');
var url         = require('../store.url.js');
var template    = require('../store.template.js');
var sync        = require('../store.synchronisation.js');
var upsertCrud  = require('./upsert.js');
var queue       = utils.queue;
var OPERATIONS  = utils.OPERATIONS;

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

    if (!utils.index.binarySearch(_references[store.name][0], _pkValue).found) {
      return next();
    }

    var error = '${Cannot delete the value, it is still referenced in the store} ' + _store.nameTranslated;
    hook.pushToHandlers(store, 'error', { error : error, data : null }, null, function () {
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
 * @param {Boolean} isLocal
 * @param {Object} retryOptions
 * @param {Object} value
 * @param {Int} version
 * @param {Int} transactionId
 * @param {Function} callback (err)
 */
function _deleteHttp (store, collection, isLocal, retryOptions, value, version, transactionId, callback) {
  if (store.isLocal || isLocal) {
    return callback();
  }

  var _request = '/';
  if (!retryOptions) {
    _request = url.create(store, 'DELETE', storeUtils.getPrimaryKeyValue(store, value));
    // required filters consition not fullfilled
    if (!_request) {
      return callback();
    }
    _request = _request.request;
  }
  else {
    _request = retryOptions.url;
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
      return hook.pushToHandlers(store, 'errorHttp', { error : _error, data : value }, transactionId, callback);
    }

    _deleteLocal(store, collection, data, false, function (err, data) {
      if (err) {
        return callback(err);
      }

      if (data[1]) {
        value = data[1];
      }

      crudUtils.afterAction(store, 'deleted', value, template.getSuccess(null, store, 'DELETE', false), callback);
    });
  });
}

/**
 * Delete a value from a store
 * @param {String} store
 * @param {*} value
 * @param {Object} retryOptions {
 *   url,
 *   data,
 *   version
 * }
 * @param {Boolean} isLocal
 * @param {Integer} transactionId
 * @param {Function} callback
 */
function deleteStore (store, value, retryOptions, isLocal, transactionId, callback) {
  try {
    if (retryOptions) {
      value = retryOptions.data;
    }
    var _options = crudUtils.beforeAction(store, value);
    if (transaction.isTransaction && !transactionId) {
      return transaction.addAction({
        id        : transaction.getCurrentTransactionId(),
        store     : _options.store.name,
        operation : OPERATIONS.DELETE,
        handler   : deleteStore,
        arguments : [store, value, retryOptions, isLocal, transaction.getCurrentTransactionId()]
      });
    }

    var _version;
    if (!retryOptions) {
      return _deleteLocal(_options.store, _options.collection, value, true, function (err, data) {
        if (err) {
          throw err;
        }

        _version = data[0];
        value    = data[1];

        _deleteHttp(_options.store, _options.collection, isLocal, retryOptions, value, _version, transactionId, function () {
          if (callback) {
            callback();
          }
        });
      });

    }

    _version = retryOptions.version;


    _deleteHttp(_options.store, _options.collection, isLocal, retryOptions, value, _version, transactionId, function () {
      if (callback) {
        callback();
      }
    });
  }
  catch (e) {
    logger.warn(['lunaris.delete' + store], e);
  }
}

exports.delete = deleteStore;
