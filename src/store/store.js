var lunarisExports              = require('../exports.js');
var hook                        = require('./store.hook.js');
var utils                       = require('../utils.js');
var storeUtils                  = require('./store.utils.js');
var http                        = require('../http.js');
var logger                      = require('../logger.js');
var cache                       = require('../cache.js');
var md5                         = require('../md5.js');
var url                         = require('./store.url.js');
var template                    = require('./store.template.js');
var collection                  = require('./store.collection.js');
var offline                     = require('../offline.js');
var storeOffline                = require('./store.offline.js');
var transaction                 = require('./store.transaction.js');
var indexedDB                   = require('../localStorageDriver.js').indexedDB;
var OPERATIONS                  = utils.OPERATIONS;
var emptyObject                 = {};
var getRequestQueue             = {};
var stores                      = [];
var OFFLINE_STORE               = utils.offlineStore;
var isPushingOfflineTransaction = false;
var offlineTransactions         = [];
var offlineTransactionsInError  = [];

lunarisExports._stores.lunarisErrors = {
  name                  : 'lunarisErrors',
  data                  : collection.collection(null, null, null, null, null, 'lunarisErrors'),
  filters               : [],
  paginationLimit       : 50,
  paginationOffset      : 0,
  paginationCurrentPage : 1,
  hooks                 : {},
  nameTranslated        : '${store.lunarisErrors}',
  isLocal               : true,
  storesToPropagate     : [],
  isStoreObject         : false,
  massOperations        : {}
};

lunarisExports._stores.lunarisOfflineTransactions = {
  name                  : OFFLINE_STORE,
  data                  : collection.collection(null, null, null, null, null, OFFLINE_STORE),
  filters               : [],
  paginationLimit       : 50,
  paginationOffset      : 0,
  paginationCurrentPage : 1,
  hooks                 : {},
  isLocal               : true,
  storesToPropagate     : [],
  isStoreObject         : false,
  massOperations        : {}
};

/**
 * get an object from a store's collection
 * @param {String} storeName
 * @param {Int} _id
 * @returns {Object}
 */
function _getObjectFromCollection (storeName, _id) {
  var _collection = storeUtils.getCollection(storeUtils.getStore(storeName));

  if (!_collection) {
    return;
  }

  return _collection.get(_id);
}

/**
 * Update offline transaction data
 * When an object has been POST, we must update the data in next transactions operations
 * We only update stores that have references. Because, only references have an impact.
 * @param {Array} storesToUpdate ['store1', 'storeN']
 */
function _updateOfflineTransactionData (storesToUpdate) {
  var _lengthStoresToUpdate = storesToUpdate.length;

  if (!_lengthStoresToUpdate) {
    return;
  }


  for (var i = 0, len = offlineTransactions.length; i < len; i++) {
    var _transaction = offlineTransactions[i];
    for (var j = 0; j < _lengthStoresToUpdate; j++)  {
      if (_transaction.store !== storesToUpdate[j]) {
        continue;
      }

      if (storesToUpdate.indexOf(_transaction.store) === -1) {
        continue;
      }

      if (Array.isArray(_transaction.data)) {
        for (var k = 0; k < _transaction.data.length; k++) {
          _transaction.data[k] = _getObjectFromCollection(storesToUpdate[j], _transaction.data[k]._id);
        }

        continue;
      }

      _transaction.data = _getObjectFromCollection(storesToUpdate[j], _transaction.data._id);
    }
  }
}

/**
 * Push dependent transaction in error to error array
 * @param {Array} storesToUpdate
 */
function _pushDependentTransactionsInError (storesToUpdate) {
  var _lengthStoresToUpdate = storesToUpdate.length;

  if (!_lengthStoresToUpdate) {
    return;
  }


  for (var i = offlineTransactions.length - 1; i >= 0; i--) {
    var _transaction = offlineTransactions[i];
    for (var j = 0; j < _lengthStoresToUpdate; j++)  {
      if (_transaction.store !== storesToUpdate[j]) {
        continue;
      }

      if (storesToUpdate.indexOf(_transaction.store) === -1) {
        continue;
      }

      indexedDB.del(OFFLINE_STORE, _transaction._id);
      offlineTransactionsInError.splice(1, 0, offlineTransactions.splice(i, 1)[0]);
    }
  }
}

/**
 * Save transaction in error in collection
 */
function _saveTransactionsInError () {
  var _collection = lunarisExports._stores.lunarisOfflineTransactions.data;

  var _version = _collection.begin();

  for (var j = 0; j < offlineTransactionsInError.length; j++) {
    _collection.remove(utils.clone(offlineTransactionsInError[j]), _version);
    delete offlineTransactionsInError[j]._id;
    offlineTransactionsInError[j].isInError = true;
    _collection.add(offlineTransactionsInError[j], _version);
  }
  _collection.commit(_version);
  offlineTransactionsInError = [];
  storeUtils.saveState(lunarisExports._stores.lunarisOfflineTransactions, _collection);
}

/**
 * Push offline HTTP transactions when online in queue
 * @param {Function} callback
 */
function pushOfflineHttpTransactions (callback) {
  offlineTransactions = lunarisExports._stores.lunarisOfflineTransactions.data.getAll();

  function _processNextOfflineTransaction () {
    var _currentTransaction = offlineTransactions.shift();

    if (!_currentTransaction) {
      isPushingOfflineTransaction = false;
      _saveTransactionsInError();
      return callback();
    }

    transaction.begin();
    if (_currentTransaction.method === OPERATIONS.INSERT || _currentTransaction.method === OPERATIONS.UPDATE) {
      upsert(_currentTransaction.store, _currentTransaction.data, false, _currentTransaction);
    }

    if (_currentTransaction.method === OPERATIONS.DELETE) {
      deleteStore(_currentTransaction.store, _currentTransaction.data, _currentTransaction);
    }

    transaction.commit(function (isError) {
      // We must hold the transaction in error and its dependent transactions
      if (isError) {
        offlineTransactionsInError.push(_currentTransaction);
        if (_currentTransaction.method === OPERATIONS.INSERT) {
          _pushDependentTransactionsInError(storeUtils.getStore(_currentTransaction.store).storesToPropagateReferences);
        }
        hook.pushToHandlers(lunarisExports._stores.lunarisOfflineTransactions, 'syncError');
      }
      else {
        hook.pushToHandlers(lunarisExports._stores.lunarisOfflineTransactions, 'syncSuccess');
      }

      lunarisExports._stores.lunarisOfflineTransactions.data.remove(_currentTransaction);
      _processNextOfflineTransaction();
      // indexedDB.del(OFFLINE_STORE, _currentTransaction._id, _processNextOfflineTransaction);
    });
  }

  isPushingOfflineTransaction = true;
  _processNextOfflineTransaction();
}

/**
 * Compute offline HTTP transactions
 * POST / DELETE -> do nothing
 * PUT  / DELETE -> DELETE
 * PUT  / PUT    -> PUT
 * POST / PUT    -> POST
 * @param {Array} transactions
 * @param {String} storeName
 * @param {String} method ex: GET, POST, etc.
 * @param {String} request
 * @param {Array/Object} value
 */
function _computeStoreTransactions (transactions, storeName, method, request, value) {
  var _mustBeAdded  = true;
  var _isArrayValue = Array.isArray(value);

  if (!_isArrayValue) {
    value = [value];
  }

  var _lengthValue = value.length;
  var _nbInInserts = 0;

  for (var j = _lengthValue - 1; j >= 0; j--) {
    for (var i = transactions.length - 1; i >= 0; i--) {
      var _transaction               = transactions[i];
      var _isTransactionValueAnArray = Array.isArray(_transaction.data);

      if (!_isTransactionValueAnArray) {
        _transaction.data = [_transaction.data];
      }

      var _lengthTransactionValue = _transaction.data.length;

      if (_transaction.store !== storeName) {
        continue;
      }

      for (var k = _lengthTransactionValue - 1; k >= 0; k--) {
        if (_transaction.method === OPERATIONS.INSERT && method === OPERATIONS.UPDATE) {
          if (value[j]._id !== _transaction.data[k]._id) {
            continue;
          }

          _transaction.data[k] = value[j];
          value.splice(j, 1);
          _nbInInserts++;

          if (!j && _nbInInserts === _lengthValue) {
            _mustBeAdded = false;
          }

          break;
        }

        if (_transaction.method === OPERATIONS.UPDATE && method === OPERATIONS.UPDATE) {
          if (value[j]._id !== _transaction.data[k]._id) {
            continue;
          }

          _transaction.data[k] = value[j];
          _mustBeAdded          = false;
          break;
        }

        if (
          (_transaction.method === OPERATIONS.INSERT && method === OPERATIONS.DELETE) ||
          (_transaction.method === OPERATIONS.UPDATE && method === OPERATIONS.DELETE)
        ) {
          if (value[j]._id !== _transaction.data[k]._id) {
            continue;
          }

          _transaction.data.splice(k, 1);

          if (!_transaction.data.length) {
            transactions.splice(i, 1);
          }

          if (_transaction.method === OPERATIONS.INSERT) {
            value.splice(j, 1);

            if (!value.length) {
              _mustBeAdded = false;
            }

            break;
          }
        }

        // Do not try to merge DELETE, it will be way to complicated to manage PUT->DELETE->DELETE with discontinuations
        // if (_transaction.method === OPERATIONS.DELETE && method === OPERATIONS.DELETE && _isArrayValue) {
        //   _transaction.value.push(value[j]);
        //   _mustBeAdded = false;
        //   break;
        // }
      }

      if (!_isTransactionValueAnArray) {
        _transaction.data = _transaction.data[0];
      }
    }
  }

  if (_mustBeAdded) {
    transactions.push({
      store  : storeName,
      method : method,
      url    : request,
      data   : _isArrayValue ? value : value[0],
      date   : Date.now()
    });
  }

  return transactions;
}

/**
 * Save Http transactions into a store
 * Make sure to compute actions before inserting in store
 * @param {String} storeName
 * @param {String} method
 * @param {String} request
 * @param {Object/Array} value
 */
function setOfflineHttpTransaction (storeName, method, request, value) {
  var _collection   = lunarisExports._stores.lunarisOfflineTransactions.data;
  var _transactions = _collection.getAll();

  _clear(OFFLINE_STORE, true);
  _computeStoreTransactions(_transactions, storeName, method, request, value);

  var _version = _collection.begin();
  for (var i = 0; i < _transactions.length; i++) {
    delete _transactions[i]._id;
    _collection.add(_transactions[i], _version);
  }
  _collection.commit(_version);
  storeUtils.saveState(lunarisExports._stores.lunarisOfflineTransactions, _collection);
}

/**
 * Push commit res objects to handlers
 * @param {Object} store
 * @param {String} hookKey
 * @param {Array} res
 * @param {Int} transactionId
 */
function _pushCommitResToHandlers (store, hookKey, res, callback) {
  if (res && res.length) {
    if (store.isStoreObject) {
      res = res[0];
    }
    res = utils.cloneAndFreeze(res);
    return hook.pushToHandlers(store, hookKey, res, callback);
  }

  callback();
}

/**
 * Queue
 * @param {Array} items
 * @param {Function} handler function to handle item in items -> handler(item, next {Function})
 * @param {Function} done    function called when every items have been processed
 */
function queue (items, handler, done) {
  var iterator = -1;

  function next () {
    iterator++;
    var item = items[iterator];

    if (!item) {
      return done();
    }

    handler(items[iterator], done);
  }

  next();
}

/**
 * Propagate store actions to the dependent stores (joins)
 * @param {Object} store
 * @param {Object} data
 * @param {String} operation
 * @param {Int} transactionId
 */
function _propagate (store, data, operation, callback) {
  if (!store.storesToPropagate.length) {
    return callback();
  }

  if ((!data && operation !== utils.OPERATIONS.DELETE) || (data && Array.isArray(data) && !data.length)) {
    return callback();
  }

  queue(store.storesToPropagate, function (storeToPropagate, next) {
    var _store            = storeUtils.getStore('@' + storeToPropagate);
    var _collection       = storeUtils.getCollection(_store);
    var _res              = _collection.propagate(store.name, data, operation);
    _pushCommitResToHandlers(_store, 'update', _res, next);
  }, callback);
}

/**
 * Propagate references to the dependent stores (joins)
 * @param {Object} store
 * @param {Object/Array} data
 * @param {Int} transactionId
 */
function _propagateReferences (store, data, callback) {
  if (!store.storesToPropagateReferences || !store.storesToPropagateReferences.length) {
    return callback();
  }

  queue(store.storesToPropagateReferences, function (storeToPropagate, next) {
    var _store            = storeUtils.getStore('@' + storeToPropagate);
    var _collection       = storeUtils.getCollection(_store);
    var _res              = _collection.propagateReferences(store.name, data);
    _pushCommitResToHandlers(_store, 'update', _res, next);
  }, callback);
}

/**
 * Before action :
 *  - check args
 * @param {String} store
 * @param {Array/Object} value
 * @param {Boolean} isNoValue
 * @returns {Object} {
 *   value,
 *   store,
 *   collection
 * }
 */
function beforeAction (store, value, isNoValue) {
  storeUtils.checkArgs(store, value, isNoValue);

  if (!isNoValue) {
    value = utils.clone(value);
  }

  var _store      = storeUtils.getStore(store);
  var _collection = storeUtils.getCollection(_store);

  return {
    value      : value,
    store      : _store,
    collection : _collection
  };
}

/**
 * After action : freeze values
 * @param {Object} store
 * @param {String} event
 * @param {Object/Array} value
 * @param {String} message
 * @param {Int} transactionId
 */
function afterAction (store, event, value, message, callback) {
  var _value = null;
  if (value) {
    _value = utils.cloneAndFreeze(value);
  }

  // if (message) {
  //   return hook.pushToHandlers(store, event, _value, callback);
  // }

  hook.pushToHandlers(store, event, _value, callback);
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
 * @returns {Int} version
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

  // required filters consition not fullfilled
  if (!request) {
    return callback({});
  }
  request = request.request;

  if (!offline.isOnline && (store.isLocal !== true || !isLocal)) {
    setOfflineHttpTransaction(store.name, method, request, !isMultipleItems && !store.isStoreObject ? value[0] : value);
  }

  afterAction(store, isUpdate ? 'update' : 'insert', value, null, function () {
    _propagateReferences(store, value, function () {
      _propagate(store, value, method, function () {
        storeUtils.saveState(store, collection);
        callback({ version : version, value : _requestValue, request : request });
      });
    });
  });
}

/**
 * Sned events and propagate values to dependent stores   fter HTTP upsert request
 * @param {Object} store
 * @param {Object/Array} value
 * @param {Boolean} isUpdate
 * @param {String} method
 * @param {Function} callback
 */
function _upsertHTTPEvents (store, value, isUpdate, method, callback) {
  afterAction(store, 'update', value, null, function () {
    afterAction(store,  isUpdate ? 'updated' : 'inserted', value, template.getSuccess(null, store, method, false), function () {
      if (store.isFilter) {
        return hook.pushToHandlers(store, 'filterUpdated', null, function () {
          _propagateReferences(store, value, function () {
            _propagate(store, value, utils.OPERATIONS.UPDATE, function () {
              storeUtils.saveState(store, collection);
              callback();
            });
          });
        });
      }

      _propagateReferences(store, value, function () {
        _propagate(store, value, utils.OPERATIONS.UPDATE, function () {
          storeUtils.saveState(store, collection);
          callback();
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
 */
function _upsertHTTP (method, request, isUpdate, store, collection, cache, value, isMultipleItems, version, callback) {
  http.request(method, request, value, function (err, data) {
    if (err) {
      var _error = template.getError(err, store, method, false);
      setLunarisError(store.name, method, request, value, version, err, _error);
      logger.warn(['lunaris.' + (isUpdate ? 'update' : 'insert') + '@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', { error : _error, data : utils.cloneAndFreeze(value)}, callback);
    }

    if (method === OPERATIONS.PATCH) {
      return afterAction(store, 'patched', null, callback);
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

      if (isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
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
              value[i] = utils.merge(utils.clone(value[i]), data[j]);

              collection.upsert(value[i], _version);

              if (isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
                _updateCollectionIndexId(store, collection, value[i]);
              }
            }
          }
        }
        else {
          value[i] = utils.merge(value[i], data);
          collection.upsert(value[i], _version);

          if (isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
            _updateCollectionIndexId(store, collection, value[i]);
          }
        }
      }

      value = collection.commit(_version);
    }

    if (isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
      return _propagateReferences(store, value, function () {
        _updateOfflineTransactionData(store.storesToPropagateReferences);

        if (!_isEvent) {
          return callback();
        }

        _upsertHTTPEvents(store, value, isUpdate, method, callback);
      });
    }

    if (!_isEvent) {
      return callback();
    }

    _upsertHTTPEvents(store, value, isUpdate, method, callback);
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
      return hook.pushToHandlers(store, 'filterUpdated', null, function () {
        _propagateReferences(store, value, function () {
          _propagate(store, value, isUpdate ? utils.OPERATIONS.UPDATE : utils.OPERATIONS.INSERT, callback);
        });
      });
    }

    _propagateReferences(store, value, function () {
      _propagate(store, value, isUpdate ? utils.OPERATIONS.UPDATE : utils.OPERATIONS.INSERT, callback);
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
 */
function _upsert (store, collection, pathParts, value, isLocal, isUpdate, retryOptions, callback) {
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

      if (!_request || !offline.isOnline) {
        return callback();
      }

      _upsertLocal(store, value, isUpdate, isLocal, function () {

        if (!store.isLocal && !isLocal) {
          _upsertHTTP(_method, _request, isUpdate, store, collection, cache, value, _isMultipleItems, _version, callback);
        }
      });
    });
  }

  _version = retryOptions.version;

  if (!offline.isOnline) {
    return callback();
  }

  _upsertHTTP(_method, _request, isUpdate, store, collection, cache, value, _isMultipleItems, _version, callback);
}

/**
 * Process next get request in queue
 * @param {String} store
 */
function _processNextGetRequest (store) {
  var _getRequest = getRequestQueue[store].shift();

  if (!_getRequest) {
    return;
  }

  _getRequest.push(_processNextGetRequest);
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
 * @param {Function} callback
 * @param {Function} nextGet handler to call next get in queue
 */
function _getCache (store, collection, request, callback, nextGet) {
  var _cacheValues = cache.get(store.name, md5(request.request));
  var _values      = [];

  if (_cacheValues) {
    if (typeof _cacheValues === 'object') {
      storeUtils.saveState(store, collection);
      _values = _transformGetCache(collection, utils.clone(_cacheValues));
    }

    afterAction(store, 'get', _values, null, function () {
      if (store.isFilter) {
        return hook.pushToHandlers(store, 'filterUpdated', null, function () {
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
 * @param {Function} callback
 * @param {Function} nextGet handler to call next get in queue
 */
function _getLocal (store, collection, request, callback, nextGet) {
  if (!offline.isOnline || store.isLocal) {
    var _res = storeOffline.filter(
      store,
      collection,
      request
    );

    return afterAction(store, 'get', _res, null, function () {
      if (store.isFilter && ((store.isStoreObject && _res) || (!store.isStoreObject && _res.length))) {
        return hook.pushToHandlers(store, 'filterUpdated', null, function () {
          storeUtils.saveState(store, collection);
          nextGet('@' + store.name);
        });
      }

      storeUtils.saveState(store, collection);
      nextGet('@' + store.name);
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
 * @param {Function} callback
 * @param {Function} nextGet handler to call next get in queue
 */
function _getHTTP (store, collection, request, primaryKeyValue, callback, nextGet) {
  http.request('GET', request, null, function (err, data) {
    if (err) {
      var _error = template.getError(err, store, 'GET', true);
      setLunarisError(store.name, 'GET', request, null, null, err, _error);
      logger.warn(['lunaris.get@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', { error : _error }, function () {
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

      cache.add(store.name, md5(request), utils.clone(data));

      for (var i = 0; i < data.length; i++) {
        collection.upsert(data[i], _version);
      }

      if (primaryKeyValue && data.length) {
        data = data[0];
      }
    }
    else {
      cache.add(store.name, md5(request), utils.clone(data));
      collection.upsert(data, _version);
    }

    data = collection.commit(_version);

    afterAction(store, 'get', data, null, function () {
      _propagateReferences(store, data, function () {
        _propagate(store, data, utils.OPERATIONS.INSERT, function () {
          if (store.isFilter) {
            return hook.pushToHandlers(store, 'filterUpdated', false, function () {
              storeUtils.saveState(store, collection);
              callback();
            });
          }

          callback();
        });
      });
    });
  });
}

/**
 * Make get
 * @param {String} store
 * @param {*} primaryKeyValue
 * @param {Object} retryOptions {
 *   url,
 * }
 * @param {function} callback _processNextGetRequest(store)
 */
function _get (store, primaryKeyValue, retryOptions, callback) {
  try {
    var _options = beforeAction(store, null, true);
    var _request = '/';

    if (!retryOptions) {
      _request = url.create(_options.store, 'GET', primaryKeyValue);
      // required filters condition not fullfilled
      if (!_request) {
        return callback(store);
      }

      return _getCache(_options.store, _options.collection, _request, function () {
        _getLocal(_options.store, _options.collection, _request, function () {
          _request = _request.request;
          _getHTTP(_options.store, _options.collection, _request, primaryKeyValue, function () {
            // do something at the end of the get
            callback(store);
          }, callback);
        }, callback);
      }, callback);
    }

    _request = retryOptions.url || '/';

    _getHTTP(_options.store, _options.collection, _request, primaryKeyValue, function () {
      // do something at the end of the get
      callback(store);
    }, callback);
  }
  catch (e) {
    logger.warn(['lunaris.get' + store], e);
  }
}

/** =================================================  *
 *                   Public methods                    *
 *  ================================================= **/

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
 */
function upsert (store, value, isLocal, retryOptions) {
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


    var _options = beforeAction(store, value);
    if ((Array.isArray(value) && (value[0]._id !== null && value[0]._id !== undefined)) || (value._id !== null && value._id !== undefined)) {
      _isUpdate = true;
    }
    if (retryOptions && retryOptions.method === OPERATIONS.INSERT) {
      _isUpdate = false;
    }

    if (transaction.isTransaction && !transaction.isCommitingTransaction) {
      return transaction.addAction({
        id        : transaction.getCurrentTransactionId(),
        store     : _options.store.name,
        operation : _isUpdate ? OPERATIONS.UPDATE : OPERATIONS.INSERT,
        handler   : upsert,
        arguments : arguments,
        rollback  : _isUpdate ? upsert : deleteStore
      });
    }
    var _transactionId = transaction.getCurrentTransactionId();

    if (_options.store.validateFn && !_storeParts.length && !retryOptions) {
      return validate(store, _options.value, _isUpdate, function (res) {
        if (!res) {
          return;
        }

        _upsert(_options.store, _options.collection, _storeParts, _options.value, isLocal, _isUpdate, retryOptions, function () {
          // do something when action end
        });
      }, _eventName);
    }

    _upsert(_options.store, _options.collection, _storeParts, _options.value, isLocal, _isUpdate, retryOptions, function () {
      // do something when action end
    });
  }
  catch (e) {
    logger.warn([_eventName], e);
  }
}

/**
 * Delete value in collection
 * @param {Object} store
 * @param {Object} collection
 * @param {*} value
 * @param {Boolean} isLocal
 * @param {Int} transactionId
 */
function _delete (store, collection, value, isLocal, transactionId) {
  var _version = collection.begin();

  // If references, we must find if the id is stille referenced
  var _storesToPropagateLength = store.storesToPropagateReferences.length;

  if (_storesToPropagateLength) {
    for (var i = 0; i < _storesToPropagateLength; i++) {
      var _storeToPropagate = store.storesToPropagateReferences[i];
      var _store            = storeUtils.getStore('@' + _storeToPropagate);
      var _collection       = storeUtils.getCollection(_store);
      var _references       = _collection.getIndexReferences();

      if (!_references[store.name]) {
        continue;
      }

      if (!utils.index.binarySearch(_references[store.name][0], value._id).found) {
        continue;
      }

      var error   = '${Cannot delete the value, it is still referenced in the store} ' + _store.nameTranslated;
      hook.pushToHandlers(store, 'error', [null, error], false, transactionId);
      throw new Error('You cannot delete a value still referenced');
    }
  }

  collection.remove(value, _version, !isLocal);
  value = collection.commit(_version);
  var _isArray = Array.isArray(value);
  if (isLocal && ((!_isArray && !value) || (_isArray && !value.length))) {
    throw new Error('You cannot delete a value not in the store!');
  }
  afterAction(store, 'delete', value, null, transactionId);
  _propagateReferences(store, value, transactionId);
  _propagate(store, value, utils.OPERATIONS.DELETE, transactionId);

  if (!store.isStoreObject) {
    value = value[0];
  }

  cache.invalidate(store.name);
  storeUtils.saveState(store, collection);
  return [_version, value];
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
 */
function deleteStore (store, value, retryOptions, isLocal) {
  try {
    if (retryOptions) {
      value = retryOptions.data;
    }
    var _options = beforeAction(store, value);
    if (transaction.isTransaction && !transaction.isCommitingTransaction) {
      return transaction.addAction({
        id        : transaction.getCurrentTransactionId(),
        store     : _options.store.name,
        operation : OPERATIONS.DELETE,
        handler   : deleteStore,
        arguments : arguments,
        rollback  : upsert
      });
    }
    var _transactionId = transaction.getCurrentTransactionId();

    var _version;
    if (!retryOptions) {
      var _res = _delete(_options.store, _options.collection, value, true, _transactionId);
      _version = _res[0];
      value    = _res[1];
    }
    else {
      _version = retryOptions.version;
    }

    if (_options.store.isLocal || isLocal) {
      return;
    }

    var _request = '/';
    if (!retryOptions) {
      _request = url.create(_options.store, 'DELETE', storeUtils.getPrimaryKeyValue(_options.store, value));
      // required filters consition not fullfilled
      if (!_request) {
        return;
      }
      _request = _request.request;
    }
    else {
      _request = retryOptions.url;
    }

    if (!offline.isOnline) {
      return setOfflineHttpTransaction(_options.store.name, OPERATIONS.DELETE, _request, value);
    }

    http.request('DELETE', _request, null, function (err, data) {
      if (err) {
        var _error = template.getError(err, _options.store, 'DELETE', false);
        setLunarisError(_options.store.name, 'DELETE', _request, value, _version, err, _error);
        logger.warn(['lunaris.delete' + store], err);
        return hook.pushToHandlers(_options.store, 'errorHttp', [_error, value], false, _transactionId);
      }

      _res = _delete(_options.store, _options.collection, data, false, _transactionId)[1];
      if (_res) {
        value = _res;
      }
      afterAction(_options.store, 'deleted', value, template.getSuccess(null, _options.store, 'DELETE', false), _transactionId);
    });
  }
  catch (e) {
    logger.warn(['lunaris.delete' + store], e);
  }
}

/**
 * Set store pagination
 * @param {String} store
 * @param {Int} page
 * @param {Int}} limit
 */
function setPagination (store, page, limit) {
  try {
    var _options = beforeAction(store, null, true);

    _options.store.paginationLimit       = limit || _options.store.paginationLimit;
    _options.store.paginationCurrentPage = page  || 1;
    _options.store.paginationOffset      = (_options.store.paginationLimit * _options.store.paginationCurrentPage) - _options.store.paginationLimit;
    storeUtils.saveState(_options.store, _options.collection);
  }
  catch (e) {
    logger.warn(['lunaris.setPagination' + store], e);
  }
}

/**
 * Clear the store collection
 * @param {String} store
 * @param {Boolean} isSilent
 */
function _clear (store, isSilent) {
  try {
    var _options = beforeAction(store, null, true);

    if (offline.isOnline || _options.store.isLocal) {
      indexedDB.clear(_options.store.name);
      _options.collection.clear();
    }

    _options.store.paginationCurrentPage = 1;
    _options.store.paginationOffset      = 0;
    _options.store.paginationLimit       = 50;
    _options.store.massOperations        = {};
    cache.invalidate(_options.store.name);
    if (!isSilent) {
      hook.pushToHandlers(_options.store, 'reset', null, false);
    }
    _propagate(_options.store, null, utils.OPERATIONS.DELETE);
    storeUtils.saveState(_options.store, _options.collection);
  }
  catch (e) {
    logger.warn(['lunaris.clear' + store], e);
  }
}

/**
 * Clear the store collection
 * @param {String} store
 * @param {Boolean} isSilent
 */
function clear (store, isSilent) {
  // It is a regex, we must find the stores !
  if (/\*$/.test(store)) {
    if (!/^@/.test(store)) {
      return logger.warn(['lunaris.clear'], new Error('The store key must begin by \'@\''));
    }
    if (!stores.length) {
      stores = Object.keys(lunarisExports._stores);
    }

    var _keyLength = store.length - 2;
    var _key       = store.slice(1, _keyLength + 1);
    for (var i = 0; i < stores.length; i++) {
      if (stores[i].slice(0, _keyLength) === _key) {
        _clear('@' + stores[i], isSilent);
      }
    }

    return;
  }

  _clear(store, isSilent);
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

  if (transaction.isTransaction && !transaction.isCommitingTransaction) {
    return transaction.addAction({
      id        : transaction.getCurrentTransactionId(),
      store     : store.replace('@', ''),
      operation : OPERATIONS.LIST,
      handler   : _get,
      arguments : [store, primaryKeyValue, retryOptions, function () {}],
      rollback  : null
    });
  }

  getRequestQueue[store].push([store, primaryKeyValue, retryOptions]);

  if (getRequestQueue[store].length === 1) {
    _processNextGetRequest(store);
  }
}

/**
 * Get firt value or the value identified by its _id
 * @param {String} store
 * @param {Int} id lunaris _id value
 */
function getOne (store, id) {
  try {
    var _options = beforeAction(store, null, true);
    var _item;

    if (id)  {
      _item = _options.collection.get(id);
    }
    else {
      _item = _options.collection.getFirst();
    }

    if (!_item) {
      return;
    }

    return utils.cloneAndFreeze(_item);
  }
  catch (e) {
    logger.warn(['lunaris.getOne' + store], e);
  }
}

/**
 * retry to perform an http request
 * @param {String} store
 * @param {String} url
 * @param {String} method
 * @param {*} data
 * @param {Int} version
 */
function retry (store, url, method, data, version) {
  if (method === 'GET') {
    return get('@' + store, null, { url : url });
  }
  if (method === 'PUT') {
    return upsert('@' + store, null, null, { url : url, method : method, data : data, version : version });
  }
  if (method === 'POST') {
    return upsert('@' + store, null, null, { url : url, method : method, data : data, version : version });
  }
  if (method === 'DELETE') {
    return deleteStore('@' + store, null, { url : url, data : data, version : version });
  }
}

/**
 * Rollback a store to the specified version
 * @param {String} store
 * @param {Int} version
 */
function rollback (store, version) {
  try {
    var _options = beforeAction(store, null, true);
    _options.collection.rollback(version);
  }
  catch (e) {
    logger.warn(['lunaris.rollback' + store], e);
  }
}

/**
 * get store default value
 * @param {String} store
 * @return {Object}
 */
function getDefaultValue (store) {
  try {
    var _options = beforeAction(store, null, true);
    if (!_options.store.meta) {
      return emptyObject;
    }

    return utils.clone(_options.store.meta.defaultValue);
  }
  catch (e) {
    logger.warn(['lunaris.getDefaultValue' + store], e);
  }
}

/**
 * Validate value against store valdiator
 * @param {String} store
 * @param {Array/Object} value
 * @param {Boolean} isUpdate
 * @param {Function} callback
 * @param {String} eventName internal arg to overwrite the validate error name
 */
function validate (store, value, isUpdate, callback, eventName) {
  try {
    var _isUpdate = isUpdate;
    storeUtils.checkArgs(store, value, true);

    if (!callback) {
      callback  = isUpdate;
      _isUpdate = false;
      if ((Array.isArray(value) && value[0]._id) || value._id) {
        _isUpdate = true;
      }
    }

    var _store = storeUtils.getStore(store);
    if (_store.validateFn) {
      var _valueToValidate = value;
      if (_store.isStoreObject && Array.isArray(value)) {
        throw new Error('The store "' + store.name + '" is a store object, you cannot add or update multiple elements!');
      }
      if (!_store.isStoreObject && !Array.isArray(value)) {
        _valueToValidate = [value];
      }

      var _isValidatingPK = offline.isOnline ? _isUpdate : false; // No primary validation
      return _store.validateFn(_valueToValidate, _store.meta.onValidate, _isValidatingPK, function (err) {
        if (err.length) {
          for (var i = 0; i < err.length; i++) {
            logger.warn(['lunaris.' + (_isUpdate ? 'update' : 'insert') + store + ' Error when validating data'], err[i]);
          }
          return callback(false, err);
        }

        callback(true);
      });
    }

    throw new Error('The store does not have a map! You cannot validate a store without a map.');
  }
  catch (e) {
    logger.warn([eventName || ('lunaris.validate' + store)], e);
  }
}

exports.get                         = get;
exports.getOne                      = getOne;
exports.insert                      = upsert;
exports.update                      = upsert;
exports.upsert                      = upsert;
exports.delete                      = deleteStore;
exports.clear                       = clear;
exports.retry                       = retry;
exports.rollback                    = rollback;
exports.getDefaultValue             = getDefaultValue;
exports.validate                    = validate;
exports.setPagination               = setPagination;
exports.pushOfflineHttpTransactions = pushOfflineHttpTransactions;

exports._computeStoreTransactions = _computeStoreTransactions; // for tests
