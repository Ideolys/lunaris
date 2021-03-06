var logger      = require('../../logger.js');
var cache       = require('../../cache.js');
var utils       = require('../../utils.js');
var storeUtils  = require('../store.utils.js');
var offline     = require('../../offline.js');
var hook        = require('../store.hook.js');
var crudUtils   = require('./crudUtils.js');
var http        = require('../../http.js');
var url         = require('../store.url.js');
var template    = require('../store.template.js');
var sync        = require('../store.synchronisation.js');
var lazyLoad    = require('./_lazyLoad.js');
var OPERATIONS  = utils.OPERATIONS;

const MERGE_STRATEGIES = {
  MERGE       : 'merge',
  ONLY_LOCAL  : 'only-local',
  ONLY_SERVER : 'only-server'
};

var imports = {};

sync.setImportFunction(upsert);

/**
 * Update collection index id value
 * When offline push, we must replace offline generated primary key by new one returned by server
 * @param {Object} collection
 * @param {Object} value
 * @returns {int/sting} old primary key
 */
function _updateCollectionIndexId (collection, value) {
  return collection.removeIndexIdValue(value._id);
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

  value = collection.commit(version);

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
    return callback('No url. Maybe the required filters are not set');
  }
  request = request.request;

  if (!offline.isOnline && !(store.isLocal || isLocal)) {
    sync.setOfflineHttpTransaction(store.name, method, request, !isMultipleItems && !store.isStoreObject ? value[0] : value);
  }


  crudUtils.propagate(store, value, method, function () {
    crudUtils.afterAction(store, isUpdate ? 'update' : 'insert', value, null, function () {
      storeUtils.saveState(store, collection, function () {
        callback(null, { version : version, value : _requestValue, request : request });
      });
    });
  });
}

/**
 * Send events and propagate values to dependent stores after HTTP upsert request
 * @param {Object} store
 * @param {Object} collection
 * @param {Object/Array} value
 * @param {Boolean} isUpdate
 * @param {String} method
 * @param {Function} callback
 */
function _upsertHTTPEvents (store, collection, value, isUpdate, method, callback) {
  crudUtils.propagate(store, value, utils.OPERATIONS.UPDATE, function () {
    crudUtils.afterAction(store, 'update', value, null, function () {
      crudUtils.afterAction(store,  isUpdate ? 'updated' : 'inserted', value, template.getSuccess(null, store, method, false), function () {
        storeUtils.saveState(store, collection, function () {
          if (store.isFilter) {
            return hook.pushToHandlers(store, 'filterUpdated', null, callback);
          }

          callback(null, value);
        });
      });
    });
  });
}

/**
 * Merge value depending of strategiy value
 *  - merge       : merge collection value with serveur value
 *  - only-local  : keep only collection value
 *  - only-server : keep only server value
 * @param {Object} collectionValue
 * @param {Object} serverValue
 * @param {Function} cloneFn
 * @param {String} strategy values among merge, only-local, only-server
 * @returns
 */
function _mergeValue (collectionValue, serverValue, cloneFn, strategy = MERGE_STRATEGIES.MERGE) {
  if (strategy === MERGE_STRATEGIES.MERGE) {
    return utils.merge(
      cloneFn ? cloneFn(collectionValue) : collectionValue,
      serverValue
    );
  }
  else if (strategy === MERGE_STRATEGIES.ONLY_SERVER) {
    serverValue._id      = collectionValue._id;
    serverValue._rowId   = collectionValue._rowId;
    serverValue._version = collectionValue._version;
    return serverValue;
  }

  return cloneFn ? (collectionValue) : collectionValue;
}

/**
 * Make HTTP request for upsert
 * @param {String} method  GET, POST, ...
 * @param {String} request url
 * @param {Boolean} isUpdate
 * @param {Boolean} isPatch
 * @param {Object} store
 * @param {Object} collection
 * @param {*} value
 * @param {Boolean} isMultipleItems
 * @param {Int} version
 * @param {Object} options
 * @param {Function} callback
 */
function _upsertHTTP (method, request, isUpdate, store, collection, value, isMultipleItems, version, options, callback) {
  http.request(method, request, value, function (err, data) {
    if (err) {
      var _error = template.getError(err, store, method, false);
      setLunarisError(store.name, method, request, value, version, err, _error);
      logger.warn(['lunaris.' + (isUpdate ? 'update' : 'insert') + '@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', { error : _error, data : utils.cloneAndFreeze(value)}, function () {
        callback(err);
      });
    }

    if (method === OPERATIONS.PATCH) {
      return crudUtils.afterAction(store, 'patched', null, callback);
    }

    var _isEvent = true;
    var _pks     = [];
    if (store.isStoreObject || !isMultipleItems) {
      if (store.isStoreObject && Array.isArray(data)) {
        return callback('The store "' + store.name + '" is a store object. The ' + method + ' method tries to ' + (isUpdate ? 'update' : 'insert') + ' multiple elements!');
      }
      if (Array.isArray(data)) {
        data = data[0];
      }

      value = _mergeValue(value, data, null, options.mergeStrategy);

      var _version = collection.begin();
      collection.upsert(value, _version);

      if (sync.isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
        _updateCollectionIndexId(collection, value);
        _pks.push(['_' + value._id, storeUtils.getPrimaryKeyValue(store, value)]);
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
              value[i] = _mergeValue(value[i], data[j], store.clone, options.mergeStrategy);

              collection.upsert(value[i], _version);

              if (sync.isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
                _updateCollectionIndexId(collection, value[i]);
                _pks.push(['_' + value[i]._id, storeUtils.getPrimaryKeyValue(store, value[i])]);
              }
            }
          }
        }
        else {
          value[i] = _mergeValue(value[i], data, null, options.mergeStrategy);
          collection.upsert(value[i], _version);

          if (sync.isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
            _updateCollectionIndexId(collection, value[i]);
            _pks.push(['_' + value[i]._id, storeUtils.getPrimaryKeyValue(store, value[i])]);
          }
        }
      }

      value = collection.commit(_version);
    }

    if (sync.isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
      return crudUtils.propagateReferences(store, _pks, function () {
        sync.updateOfflineTransactionData(store.storesToPropagateReferences);

        if (!_isEvent) {
          return callback();
        }

        _upsertHTTPEvents(store, collection, value, isUpdate, method, callback);
      });
    }

    if (!_isEvent) {
      return callback();
    }

    _upsertHTTPEvents(store, collection, value, isUpdate, method, callback);
  });
}

/**
 * Upsert local values and send propagate updates to dependent stores
 * @param {Object} store
 * @param {Array/Object} value
 * @param {Boolean} isUpdate
 * @param {Boolean} isLocal
 * @param {Function} callback
 */
function _upsertLocal (store, value, isUpdate, isLocal, callback) {
  if (store.isLocal || isLocal) {
    if (store.isFilter) {
      return crudUtils.propagate(store, value, isUpdate ? utils.OPERATIONS.UPDATE : utils.OPERATIONS.INSERT, function () {
        hook.pushToHandlers(store, 'filterUpdated', null, callback);
      });
    }

    return crudUtils.propagate(store, value, isUpdate ? utils.OPERATIONS.UPDATE : utils.OPERATIONS.INSERT, callback);
  }

  callback();
}

/**
 * Upsert a value in a store
 * @param {Object} store
 * @param {Array} pathParts
 * @param {Object} collection
 * @param {Array/Object} value
 * @param {Boolean} isUpdate
 * @param {Object} options
 * @param {Function} callback
 */
function _upsert (store, collection, pathParts, value, isUpdate, options, callback) {
  if (!store.isInitialized) {
    return lazyLoad.load(store, [_upsert, arguments]);
  }

  var _isMultipleItems = Array.isArray(value);
  var _version;

  var _request = '/';
  if (options.retryOptions) {
    _request = options.retryOptions.url;
  }

  var _method  = OPERATIONS.UPDATE;
  if (!isUpdate) {
    _method = OPERATIONS.INSERT;
  }
  if (pathParts.length) {
    _method = OPERATIONS.PATCH;
  }

  if (!options.retryOptions) {
    return _upsertCollection(store, collection, value, _version, _isMultipleItems, isUpdate, pathParts, _request, _method, options.isLocal, function (err, _res) {
      if (err) {
        return callback(err);
      }

      _version = _res.version;
      value    = _res.value;
      _request = _res.request;

      _upsertLocal(store, value, isUpdate, options.isLocal, function () {
        if (store.isLocal || options.isLocal || !offline.isOnline) {
          return callback(null, value);
        }

        _upsertHTTP(_method, _request, isUpdate, store, collection, value, _isMultipleItems, _version, options, callback);
      });
    });
  }

  _version = options.retryOptions.version;

  if (!offline.isOnline) {
    return callback(null, value);
  }

  _upsertHTTP(_method, _request, isUpdate, store, collection, value, _isMultipleItems, _version, options, callback);
}


/**
 * Insert or Update a value in a store
 * @param {String} store
 * @param {*} value
 * @param {Object} options
 *  retryOptions { // for offline sync
 *    url,
 *    data,
 *    version
 *  },
 *  isLocal : {Boolean}
 * @param {String} options.mergeStrategy 'merge', 'only-local', 'only-server'
 * @param {Function} callback
 */
function upsert (store, value, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  if (!options) {
    options = {};
  }

  var _isUpdate = false;

  var _storeParts = (store && typeof store === 'string') ? store.split(':') : [];
  if (_storeParts.length) {
    store = _storeParts.shift();
  }
  if (_storeParts.length) {
    _isUpdate = true;
  }

  var _eventName = 'lunaris.' + (_isUpdate ? 'update' : 'insert') + store;
  try {
    if (options.retryOptions) {
      value = options.retryOptions.data;
    }

    var _options = crudUtils.beforeAction(store, value);
    if ((Array.isArray(value) && (value[0]._id !== null && value[0]._id !== undefined)) || (value._id !== null && value._id !== undefined)) {
      _isUpdate = true;
    }
    if (options.retryOptions && options.retryOptions.method === OPERATIONS.INSERT) {
      _isUpdate = false;
    }

    if (_options.store.validateFn && !_storeParts.length && !options.retryOptions) {
      return imports.validate(store, _options.value, _isUpdate, function (res) {
        if (!res) {
          let error = 'Error when validating data';
          if (callback) {
            return callback(error);
          }
        }

        _upsert(_options.store, _options.collection, _storeParts, _options.value, _isUpdate, options, function (err, res) {
          // do something when action end
          if (err) {
            if (callback) {
              return callback(err);
            }
            throw err;
          }

          if (callback) {
            callback(null, res);
          }
        });
      }, _eventName);
    }

    _upsert(_options.store, _options.collection, _storeParts, _options.value, _isUpdate, options, function (err, res) {
      // do something when action end
      if (err) {
        if (callback) {
          return callback(err);
        }
        throw err;
      }

      if (callback) {
        callback(null, res);
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
