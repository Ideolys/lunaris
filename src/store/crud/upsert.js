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
var OPERATIONS  = utils.OPERATIONS;

var imports = {};

sync.setImportFunction(upsert);

/**
 * Update collection index id value
 * When offline push, we must replace offline generated primary key by new one returned by server
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} value
 */
function _updateCollectionIndexId (store, collection, value) {
  var pkFn = store.getPrimaryKeyFn || storeUtils.getPrimaryKeyValue;

  collection.setIndexIdValue(value._id, pkFn(value));
}

/**
 * Upsert collection
 * @param {Object} store
 * @param {Object} collection
 * @param {*} value
 * @param {Int} version
 * @param {Boolean} isMultipleItems
 * @param {Boolean} isUpdate
 * @param {Array} pathParts
 * @param {Int} transactionId
 * @param {String} request
 * @param {Boolean} isLocal
 * @param {Function} callback ({ version : Integer, value : Object/Array, request : String })
 */
function _upsertCollection (store, collection, value, version, isMultipleItems, isUpdate, pathParts, request, method, isLocal, callback) {
  var _inputValue = value;

  if (pathParts.length) {
    // set or upddate massOperations rules
    store.massOperations[pathParts.join('.')] = value;
    var _data = collection.getAll();
    version   = collection.begin();
    for (var i = 0; i < _data.length; i++) {
      storeUtils.setPathValue(pathParts, value, _data[i]);
      collection.upsert(_data[i], version);
    }
  }
  else {
    version = collection.begin();
    if (isMultipleItems) {
      for (i = 0; i < value.length; i++) {
        // Set value if mass operation have been applied to the store
        storeUtils.setObjectPathValues(store.massOperations, value[i]);
        collection.upsert(value[i], version);
      }
    }
    else {
      if (store.isStoreObject) {
        // we always should update the same value for object store
        var _value = collection.getAll();
        var _id    = _value ? _value._id : null;
        value._id  = _id;
      }
      // If offline set PK
      if (!offline.isOnline && !isUpdate) {
        storeUtils.setPrimaryKeyValue(store, value, store.isStoreObject ? value._id : collection.getCurrentId());
      }
      // Set value if mass operation have been applied to the store
      storeUtils.setObjectPathValues(store.massOperations, value);

      collection.upsert(value, version);
    }
  }

  try {
    value = collection.commit(version);
  }
  catch (e) {
    console.log(store.name);
    console.log(e);
  }

  // If offline set PK
  if (isMultipleItems && !offline.isOnline && !isUpdate) {
    version = collection.begin();
    for (i = 0; i < value.length; i++) {
      storeUtils.setPrimaryKeyValue(store, value[i], value[i]._id);
      collection.upsert(value[i], version);
    }
    value = collection.commit(version);
  }

  cache.invalidate(store.name);

  // it's a patch !
  var _requestValue = value;

  if (!isMultipleItems && !store.isStoreObject) {
    _requestValue = _requestValue[0];
  }

  if (pathParts.length) {
    _inputValue = {
      op    : 'replace',
      path  : storeUtils.getJSONPatchPath(pathParts.join('.')),
      value : _inputValue
    };
    _requestValue = _inputValue;
  }

  request = url.create(store, method, storeUtils.getPrimaryKeyValue(
    store,
    _requestValue,
    !isUpdate || (isUpdate && isMultipleItems))
  );

  // required filters condition not fullfilled
  if (!request) {
    return callback({});
  }
  request = request.request;

  if (!offline.isOnline && (store.isLocal !== true || !isLocal)) {
    sync.setOfflineHttpTransaction(store.name, method, request, !isMultipleItems && !store.isStoreObject ? value[0] : value);
  }

  crudUtils.propagateReferences(store, value, function () {
    crudUtils.propagate(store, value, method, function () {
      crudUtils.afterAction(store, isUpdate ? 'update' : 'insert', value, null, function () {
        storeUtils.saveState(store, collection, function () {
          callback({ version : version, value : _requestValue, request : request });
        });
      });
    });
  });
}

/**
 * Sned events and propagate values to dependent stores   fter HTTP upsert request
 * @param {Object} store
 * @param {Object} collection
 * @param {Object/Array} value
 * @param {Boolean} isUpdate
 * @param {String} method
 * @param {Interger} transactionId
 * @param {Function} callback
 */
function _upsertHTTPEvents (store, collection, value, isUpdate, method, transactionId, callback) {
  crudUtils.propagateReferences(store, value, function () {
    crudUtils.propagate(store, value, utils.OPERATIONS.UPDATE, function () {
      crudUtils.afterAction(store, 'update', value, null, function () {
        crudUtils.afterAction(store,  isUpdate ? 'updated' : 'inserted', value, template.getSuccess(null, store, method, false), function () {
          storeUtils.saveState(store, collection, function () {
            if (store.isFilter) {
              return hook.pushToHandlers(store, 'filterUpdated', null, transactionId, callback);
            }

            callback();
          });
        });
      });
    });
  });
}

/**
 * Make HTTP request for upsert
 * @param {String} method  GET, POST, ...
 * @param {String} request url
 * @param {Boolean} isUpdate
 * @param {Boolean} isPatch
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} cache
 * @param {*} value
 * @param {Boolean} isMultipleItems
 * @param {Int} version
 * @param {Integer} transactionId
 * @param {Function} callback
 */
function _upsertHTTP (method, request, isUpdate, store, collection, cache, value, isMultipleItems, version, transactionId, callback) {
  http.request(method, request, value, function (err, data) {
    if (err) {
      var _error = template.getError(err, store, method, false);
      setLunarisError(store.name, method, request, value, version, err, _error);
      logger.warn(['lunaris.' + (isUpdate ? 'update' : 'insert') + '@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', { error : _error, data : utils.cloneAndFreeze(value)}, transactionId, callback);
    }

    if (method === OPERATIONS.PATCH) {
      return crudUtils.afterAction(store, 'patched', null, callback);
    }

    var _isEvent = true;
    if (store.isStoreObject || !isMultipleItems) {
      if (store.isStoreObject && Array.isArray(data)) {
        throw new Error('The store "' + store.name + '" is a store object. The ' + method + ' method tries to ' + (isUpdate ? 'update' : 'insert') + ' multiple elements!');
      }
      if (Array.isArray(data)) {
        data = data[0];
      }

      value        = utils.merge(value, data);
      var _version = collection.begin();
      collection.upsert(value, _version);

      if (sync.isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
        _updateCollectionIndexId(store, collection, value);
      }

      value = collection.commit(_version);
      // the value must have been deleted
      if (!value) {
        _isEvent = false;
      }
    }
    else {
      var _isMultiple = Array.isArray(data);
      _version = collection.begin();

      for (var i = 0; i < value.length; i++) {
        if (_isMultiple) {
          for (var j = 0; j < data.length; j++) {
            if (value[i]._id === data[j]._id) {
              value[i] = utils.merge(store.clone(value[i]), data[j]);

              collection.upsert(value[i], _version);

              if (sync.isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
                _updateCollectionIndexId(store, collection, value[i]);
              }
            }
          }
        }
        else {
          value[i] = utils.merge(value[i], data);
          collection.upsert(value[i], _version);

          if (sync.isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
            _updateCollectionIndexId(store, collection, value[i]);
          }
        }
      }

      value = collection.commit(_version);
    }

    if (sync.isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
      return crudUtils.propagateReferences(store, value, function () {
        sync.updateOfflineTransactionData(store.storesToPropagateReferences);

        if (!_isEvent) {
          return callback();
        }

        _upsertHTTPEvents(store, collection, value, isUpdate, method, transactionId, callback);
      });
    }

    if (!_isEvent) {
      return callback();
    }

    _upsertHTTPEvents(store, collection, value, isUpdate, method, transactionId, callback);
  });
}

/**
 * Upsert local values and send propagate updates to dependent stores
 * @param {Object} store
 * @param {Array/Object} value
 * @param {Boolean} isUpdate
 * @param {Boolean} isLocal
 * @param {Integer} transactionId
 * @param {Function} callback
 */
function _upsertLocal (store, value, isUpdate, isLocal, transactionId, callback) {
  if (store.isLocal || isLocal) {
    if (store.isFilter) {
      return crudUtils.propagateReferences(store, value, function () {
        crudUtils.propagate(store, value, isUpdate ? utils.OPERATIONS.UPDATE : utils.OPERATIONS.INSERT, function () {
          hook.pushToHandlers(store, 'filterUpdated', null, transactionId, callback);
        });
      });
    }

    return crudUtils.propagateReferences(store, value, function () {
      crudUtils.propagate(store, value, isUpdate ? utils.OPERATIONS.UPDATE : utils.OPERATIONS.INSERT, callback);
    });
  }

  callback();
}

/**
 * Upsert a value in a store
 * @param {Object} store
 * @param {Array} pathParts
 * @param {Object} collection
 * @param {Array/Object} value
 * @param {Boolean} isLocal
 * @param {Boolean} isUpdate
 * @param {Object} retryOptions
 * @param {Integer} transactionId
 * @param {Function} callback
 */
function _upsert (store, collection, pathParts, value, isLocal, isUpdate, retryOptions, transactionId, callback) {
  var _isMultipleItems = Array.isArray(value);
  var _version;

  var _request = '/';
  if (retryOptions) {
    _request = retryOptions.url;
  }

  var _method  = OPERATIONS.UPDATE;
  if (!isUpdate) {
    _method = OPERATIONS.INSERT;
  }
  if (pathParts.length) {
    _method = OPERATIONS.PATCH;
  }

  if (!retryOptions) {
    return _upsertCollection(store, collection, value, _version, _isMultipleItems, isUpdate, pathParts, _request, _method, isLocal, function (_res) {
      _version = _res.version;
      value    = _res.value;
      _request = _res.request;

      if (!_request) {
        return callback();
      }

      _upsertLocal(store, value, isUpdate, isLocal, transactionId, function () {
        if (store.isLocal || isLocal || !offline.isOnline) {
          return callback();
        }

        _upsertHTTP(_method, _request, isUpdate, store, collection, cache, value, _isMultipleItems, _version, transactionId, callback);
      });
    });
  }

  _version = retryOptions.version;

  if (!offline.isOnline) {
    return callback();
  }

  _upsertHTTP(_method, _request, isUpdate, store, collection, cache, value, _isMultipleItems, _version, transactionId, callback);
}


/**
 * Insert or Update a value in a store
 * @param {String} store
 * @param {*} value
 * @param {Boolean} isLocal insert or update
 * @param {Object} retryOptions {
 *  url,
 *  data,
 *  method,
 *   version
 * }
 * @param {Integer}  transactionId
 * @param {Function} callback
 */
function upsert (store, value, isLocal, retryOptions, transactionId, callback) {
  var _isUpdate   = false;

  var _storeParts = (store && typeof store === 'string') ? store.split(':') : [];
  if (_storeParts.length) {
    store = _storeParts.shift();
  }
  if (_storeParts.length) {
    _isUpdate = true;
  }

  var _eventName = 'lunaris.' + (_isUpdate ? 'update' : 'insert') + store;
  try {
    if (retryOptions) {
      value = retryOptions.data;
    }


    var _options = crudUtils.beforeAction(store, value);
    if ((Array.isArray(value) && (value[0]._id !== null && value[0]._id !== undefined)) || (value._id !== null && value._id !== undefined)) {
      _isUpdate = true;
    }
    if (retryOptions && retryOptions.method === OPERATIONS.INSERT) {
      _isUpdate = false;
    }

    if (transaction.isTransaction && !transactionId) {
      return transaction.addAction({
        id        : transaction.getCurrentTransactionId(),
        store     : _options.store.name,
        operation : _isUpdate ? OPERATIONS.UPDATE : OPERATIONS.INSERT,
        handler   : upsert,
        arguments : [store, value, isLocal, retryOptions, transaction.getCurrentTransactionId()]
      });
    }

    if (_options.store.validateFn && !_storeParts.length && !retryOptions) {
      return imports.validate(store, _options.value, _isUpdate, function (res) {
        if (!res) {
          return;
        }

        _upsert(_options.store, _options.collection, _storeParts, _options.value, isLocal, _isUpdate, retryOptions, transactionId, function () {
          // do something when action end
          if (callback) {
            callback();
          }
        });
      }, _eventName);
    }

    _upsert(_options.store, _options.collection, _storeParts, _options.value, isLocal, _isUpdate, retryOptions, transactionId, function () {
      // do something when action end
      if (callback) {
        callback();
      }
    });
  }
  catch (e) {
    logger.warn([_eventName], e);
  }
}

/**
 * Set Lunaris Error
 * @param {String} storeName
 * @param {Stirng} method ge, post, etc.
 * @param {String} request url
 * @param {Array/Object} value
 * @param {Int} version versionDbNumber
 * @param {Object}err
 * @param {String} error message to display
 */
function setLunarisError (storeName, method, request, value, version, err, error) {
  upsert('@lunarisErrors', {
    version            : version,
    data               : value,
    url                : request,
    method             : method,
    storeName          : storeName,
    date               : dayjs(),
    messageError       : error,
    messageErrorServer : err
  });
}

exports.upsert            = upsert;
exports.setLunarisError   = setLunarisError;
exports.setImportFunction = function setImportFunction (fn) {
  imports[fn.name] = fn;
};
