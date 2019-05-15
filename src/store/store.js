var lunarisExports  = require('../exports.js');
var hook            = require('./store.hook.js');
var utils           = require('../utils.js');
var storeUtils      = require('./store.utils.js');
var http            = require('../http.js');
var logger          = require('../logger.js');
var cache           = require('../cache.js');
var md5             = require('../md5.js');
var url             = require('./store.url.js');
var template        = require('./store.template.js');
var collection      = require('./store.collection.js');
var offline         = require('../offline.js');
var storeOffline    = require('./store.offline.js');
var transaction     = require('./store.transaction.js');
var indexedDB       = require('../localStorageDriver.js').indexedDB;
var OPERATIONS      = utils.OPERATIONS;
var emptyObject     = {};
var getRequestQueue = {};
var stores          = [];

lunarisExports._stores.lunarisErrors = {
  name                  : 'lunarisErrors',
  data                  : collection.collection(null, null, null, null, null, null, 'lunarisErrors'),
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
  name                  : 'lunarisOfflineTransactions',
  data                  : collection.collection(),
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
      var _isTransactionValueAnArray = Array.isArray(_transaction.value);

      if (!_isTransactionValueAnArray) {
        _transaction.value = [_transaction.value];
      }

      var _lengthTransactionValue = _transaction.value.length;

      if (_transaction.store !== storeName) {
        continue;
      }

      for (var k = _lengthTransactionValue - 1; k >= 0; k--) {
        if (_transaction.method === OPERATIONS.INSERT && method === OPERATIONS.UPDATE) {
          if (value[j]._id !== _transaction.value[k]._id) {
            continue;
          }

          _transaction.value[k] = value[j];
          value.splice(j, 1);
          _nbInInserts++;

          if (!j && _nbInInserts === _lengthValue) {
            _mustBeAdded = false;
          }

          break;
        }

        if (_transaction.method === OPERATIONS.UPDATE && method === OPERATIONS.UPDATE) {
          if (value[j]._id !== _transaction.value[k]._id) {
            continue;
          }

          _transaction.value[k] = value[j];
          _mustBeAdded          = false;
          break;
        }

        if (
          (_transaction.method === OPERATIONS.INSERT && method === OPERATIONS.DELETE) ||
          (_transaction.method === OPERATIONS.UPDATE && method === OPERATIONS.DELETE)
        ) {
          if (value[j]._id !== _transaction.value[k]._id) {
            continue;
          }

          _transaction.value.splice(k, 1);

          if (!_transaction.value.length) {
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
        _transaction.value = _transaction.value[0];
      }
    }
  }

  if (_mustBeAdded) {
    transactions.push({
      store  : storeName,
      method : method,
      url    : request,
      value  : _isArrayValue ? value : value[0]
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
  _collection.clear();

  _computeStoreTransactions(_transactions, storeName, method, request, value);

  for (var i = 0; i < _transactions.length; i++) {
    _collection.add(_transactions[i]);
  }
}

/**
 * Push commit res objects to handlers
 * @param {Object} store
 * @param {String} hookKey
 * @param {Array} res
 * @param {Int} transactionId
 */
function _pushCommitResToHandlers (store, hookKey, res, transactionId) {
  if (res && res.length) {
    if (store.isStoreObject) {
      res = res[0];
    }
    res = utils.cloneAndFreeze(res);
    hook.pushToHandlers(store, hookKey, res, Array.isArray(res), transactionId);
  }
}

/**
 * Propagate store actions to the dependent stores (joins)
 * @param {Object} store
 * @param {Object} data
 * @param {String} operation
 * @param {Int} transactionId
 */
function _propagate (store, data, operation, transactionId) {
  if (!store.storesToPropagate.length) {
    return;
  }

  if ((!data && operation !== utils.OPERATIONS.DELETE) || (data && Array.isArray(data) && !data.length)) {
    return;
  }

  for (var i = 0; i < store.storesToPropagate.length; i++) {
    var _storeToPropagate = store.storesToPropagate[i];
    var _store            = storeUtils.getStore('@' + _storeToPropagate);
    var _collection       = storeUtils.getCollection(_store);
    var _res              = _collection.propagate(store.name, data, operation);
    _pushCommitResToHandlers(_store, 'update', _res, transactionId);
  }
}

/**
 * Update reflexive deps
 * @param {Object} store
 * @param {Object} collection
 * @param {Object/Array} data parent objects
 * @param {String} operation
 * @param {Int} transactionId
 */
function _propagateReflexive (store, collection, data, operation, transactionId) {
  if (!store.meta || (store.meta && !store.meta.meta.reflexive)) {
    return;
  }

  var _res = collection.propagateReflexive(data, operation);
  _pushCommitResToHandlers(store, 'update', _res, transactionId);
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
function afterAction (store, event, value, message, transactionId) {
  var _value = null;
  if (value) {
    _value = utils.cloneAndFreeze(value);
  }
  if (message) {
    return hook.pushToHandlers(store, event, [_value, message], false, transactionId);
  }

  hook.pushToHandlers(store, event, _value, Array.isArray(_value), transactionId);
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
 * Upsert collection
 * @param {Object} store
 * @param {Object} collection
 * @param {*} value
 * @param {Int} version
 * @param {Boolean} isMultipleItems
 * @param {Boolean} isUpdate
 * @param {Array} pathParts
 * @param {Int} transactionId
 * @returns {Int} version
 */
function _upsertCollection (store, collection, value, version, isMultipleItems, isUpdate, pathParts, transactionId) {
  var _ids        = [];
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
        // If offline set PK
        if (!offline.isOnline && !isUpdate) {
          storeUtils.setPrimaryKeyValue(store, value[i], collection.getCurrentId());
        }
        // Set value if mass operation have been applied to the store
        storeUtils.setObjectPathValues(store.massOperations, value[i]);

        collection.upsert(value[i], version);
        _ids.push(value[i]._id);
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

      if (_ids) {
        _ids.push(value._id);
      }
    }
  }

  value = collection.commit(version);

  cache.invalidate(store.name);
  afterAction(store, isUpdate ? 'update' : 'insert', value, null, transactionId);
  _propagate(store, value, isUpdate ? utils.OPERATIONS.UPDATE : utils.OPERATIONS.INSERT, transactionId);
  if (isUpdate) {
    _propagateReflexive(store, collection, value,  utils.OPERATIONS.UPDATE, transactionId);
  }
  storeUtils.saveState(store, collection);

  if (!isMultipleItems && !store.isStoreObject) {
    value = value[0];
  }
  // it's a patch !
  if (pathParts.length) {
    value = {
      op    : 'replace',
      path  : storeUtils.getJSONPatchPath(pathParts.join('.')),
      value : _inputValue
    };
  }

  return { version : version, value : value };
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
 * @param {Int} transactionId
 */
function _upsertHTTP (method, request, isUpdate, store, collection, cache, value, isMultipleItems, version, transactionId) {
  http.request(method, request, value, function (err, data) {
    if (err) {
      var _error = template.getError(err, store, method, false);
      setLunarisError(store.name, method, request, value, version, err, _error);
      logger.warn(['lunaris.' + (isUpdate ? 'update' : 'insert') + '@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', [_error, utils.cloneAndFreeze(value)], false, transactionId);
    }

    if (method === OPERATIONS.PATCH) {
      afterAction(store, 'patched', null, null, transactionId);
      return;
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
            }
          }
        }
        else {
          value[i] = utils.merge(value[i], data);
          collection.upsert(value[i], _version);
        }
      }

      value = collection.commit(_version);
    }

    if (!_isEvent) {
      return;
    }

    afterAction(store, 'update', value, null, transactionId);
    afterAction(store,  isUpdate ? 'updated' : 'inserted', value, template.getSuccess(null, store, method, false), transactionId);
    if (store.isFilter) {
      hook.pushToHandlers(store, 'filterUpdated', null, false, transactionId);
    }
    _propagate(store, value, utils.OPERATIONS.UPDATE, transactionId);
    _propagateReflexive(store, collection, value, utils.OPERATIONS.UPDATE, transactionId);
    storeUtils.saveState(store, collection);
  });
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
function _upsert (store, collection, pathParts, value, isLocal, isUpdate, retryOptions, transactionId) {
  var _isMultipleItems = Array.isArray(value);
  var _version;
  if (!retryOptions) {
    var _res = _upsertCollection(store, collection, value, _version, _isMultipleItems, isUpdate, pathParts, transactionId);
    _version = _res.version;
    value    = _res.value;
  }
  else {
    _version = retryOptions.version;
  }


  if (store.isLocal || isLocal) {
    if (store.isFilter) {
      hook.pushToHandlers(store, 'filterUpdated', null, false, transactionId);
    }
    return;
  }

  var _method  = OPERATIONS.UPDATE;
  if (!isUpdate) {
    _method = OPERATIONS.INSERT;
  }
  if (pathParts.length) {
    _method = OPERATIONS.PATCH;
  }

  var _request = '/';

  if (!retryOptions) {
    _request = url.create(store, _method, storeUtils.getPrimaryKeyValue(store, value, !isUpdate || (isUpdate && _isMultipleItems)));
    // required filters consition not fullfilled
    if (!_request) {
      return;
    }
    _request = _request.request;
    storeUtils.saveState(store, collection);
  }
  else {
    _request = retryOptions.url;
  }

  if (!offline.isOnline) {
    return setOfflineHttpTransaction(store.name, _method, _request, value, _version);
  }

  _upsertHTTP(_method, _request, isUpdate, store, collection, cache, value, _isMultipleItems, _version, transactionId);
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
    var _options       = beforeAction(store, null, true);
    var _request       = '/';
    var _transactionId = transaction.getCurrentTransactionId();

    if (!retryOptions) {
      _request = url.create(_options.store, 'GET', primaryKeyValue);
      // required filters consition not fullfilled
      if (!_request) {
        return callback(store);
      }

      var _cacheValues = cache.get(_options.store.name, md5(_request.request));

      if (_cacheValues) {
        if (typeof _cacheValues === 'object') {
          afterAction(_options.store, 'get', _transformGetCache(_options.collection, _cacheValues), null, _transactionId);
          storeUtils.saveState(_options.store, _options.collection);
        }
        else {
          afterAction(_options.store, 'get', [], null, _transactionId);
        }

        if (_options.store.isFilter) {
          hook.pushToHandlers(_options.store, 'filterUpdated', false, null, _transactionId);
        }

        return callback(store);
      }

      if (!offline.isOnline || _options.store.isLocal) {
        var _res = storeOffline.filter(
          _options.store,
          _options.collection,
          _request
        );
        afterAction(_options.store, 'get', _res, null, _transactionId);
        if (_options.store.isFilter && ((_options.store.isStoreObject && _res) || (!_options.store.isStoreObject && _res.length))) {
          hook.pushToHandlers(_options.store, 'filterUpdated', false, null, _transactionId);
        }
        storeUtils.saveState(_options.store, _options.collection);
        return callback(store);
      }

      _request = _request.request;
    }
    else {
      _request = retryOptions.url || '/';
    }

    http.request('GET', _request, null, function (err, data) {
      if (err) {
        var _error = template.getError(err, _options.store, 'GET', true);
        setLunarisError(_options.store.name, 'GET', _request, null, null, err, _error);
        logger.warn(['lunaris.get' + store], err);
        hook.pushToHandlers(_options.store, 'errorHttp', _error, false, _transactionId);
        return callback(store);
      }

      var _version = _options.collection.begin();
      if (Array.isArray(data)) {
        if (_options.store.isStoreObject) {
          logger.warn(
            ['lunaris.get' + store],
            new Error('The store "' + _options.store.name + '" is an object store. The GET method cannot return multiple elements!')
          );
          return callback(store);
        }

        cache.add(_options.store.name, md5(_request), utils.clone(data));

        for (var i = 0; i < data.length; i++) {
          _options.collection.upsert(data[i], _version);
        }

        if (primaryKeyValue && data.length) {
          data = data[0];
        }
      }
      else {
        cache.add(_options.store.name, md5(_request), utils.clone(data));
        _options.collection.upsert(data, _version);
      }

      data = _options.collection.commit(_version);

      afterAction(_options.store, 'get', data, null, _transactionId);
      _propagate(_options.store, data, utils.OPERATIONS.INSERT, _transactionId);
      if (_options.store.isFilter) {
        hook.pushToHandlers(_options.store, 'filterUpdated', false, null, _transactionId);
      }
      storeUtils.saveState(_options.store, _options.collection);
    });
  }
  catch (e) {
    logger.warn(['lunaris.get' + store], e);
  }
  callback(store);
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

    if (_options.store.validateFn && !_storeParts.length) {
      return validate(store, _options.value, _isUpdate, function (res) {
        if (!res) {
          return;
        }

        _upsert(_options.store, _options.collection, _storeParts, _options.value, isLocal, _isUpdate, retryOptions, _transactionId);
      }, _eventName);
    }

    _upsert(_options.store, _options.collection, _storeParts, _options.value, isLocal, _isUpdate, retryOptions, _transactionId);
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
  collection.remove(value, _version, !isLocal);
  value = collection.commit(_version);
  var _isArray = Array.isArray(value);
  if (isLocal && ((!_isArray && !value) || (_isArray && !value.length))) {
    throw new Error('You cannot delete a value not in the store!');
  }
  afterAction(store, 'delete', value, null, transactionId);
  _propagate(store, value, utils.OPERATIONS.DELETE, transactionId);
  _propagateReflexive(store, collection, value, utils.OPERATIONS.DELETE, transactionId);

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
    _options.store.paginationOffset      = _options.store.paginationCurrentPage === 1 ? 0 : _options.store.paginationLimit * _options.store.paginationCurrentPage;
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

    _options.collection.clear();
    _options.store.paginationCurrentPage = 1;
    _options.store.paginationOffset      = 0;
    _options.store.paginationLimit       = 50;
    _options.store.massOperations        = {};
    indexedDB.clear(_options.store.name);
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

exports.get             = get;
exports.getOne          = getOne;
exports.insert          = upsert;
exports.update          = upsert;
exports.upsert          = upsert;
exports.delete          = deleteStore;
exports.clear           = clear;
exports.retry           = retry;
exports.rollback        = rollback;
exports.getDefaultValue = getDefaultValue;
exports.validate        = validate;
exports.setPagination   = setPagination;

exports._computeStoreTransactions = _computeStoreTransactions; // for tests
