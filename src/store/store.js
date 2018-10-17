var hook            = require('./store.hook.js');
var utils           = require('../utils.js');
var storeUtils      = require('./store.utils.js');
var http            = require('../http.js');
var logger          = require('../logger.js');
var cache           = require('./store.cache.js');
var url             = require('./store.url.js');
var template        = require('./store.template.js');
var emptyObject     = {};
var getRequestQueue = {};

/**
 * Push commit res objects to handlers
 * @param {Object} store
 * @param {String} hookKey
 * @param {Array} res
 */
function _pushCommitResToHandlers (store, hookKey, res) {
  if (res && res.length) {
    if (store.isStoreObject) {
      res = res[0];
    }
    res = utils.cloneAndFreeze(res);
    hook.pushToHandlers(store, hookKey, res, Array.isArray(res));
  }
}

/**
 * Propagate store actions to the dependent stores (joins)
 * @param {Object} store
 * @param {Object} data
 * @param {String} operation
 */
function _propagate (store, data, operation) {
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
    _pushCommitResToHandlers(_store, 'update', _res, Array.isArray(_res));
  }
}

/**
 * Update reflexive deps
 * @param {Object} store
 * @param {Object} collection
 * @param {Object/Array} data parent objects
 * @param {String} operation
 */
function _propagateReflexive (store, collection, data, operation) {
  if (!store.meta || (store.meta && !store.meta.meta.reflexive)) {
    return;
  }

  var _res = collection.propagateReflexive(data, operation);
  _pushCommitResToHandlers(store, 'update', _res);
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
  var _cache      = cache.getCache(_store);

  return {
    value      : value,
    store      : _store,
    collection : _collection,
    cache      : _cache
  };
}

/**
 * After action : freeze values
 * @param {Object} store
 * @param {String} event
 * @param {Object/Array} value
 * @param {String} message
 */
function afterAction (store, event, value, message) {
  var _value = utils.cloneAndFreeze(value);
  if (message) {
    return hook.pushToHandlers(store, event, [_value, message]);
  }

  hook.pushToHandlers(store, event, _value, Array.isArray(_value));
}

/**
 * Set Lunaris Error
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
 * Upsert a value in a store
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} cache
 * @param {Array/Object} value
 * @param {Boolean} isLocal
 * @param {Boolean} isUpdate
 * @param {Object} retryOptions
 */
function _upsert (store, collection, cache, value, isLocal, isUpdate, retryOptions) {
  var _isMultipleItems = Array.isArray(value);
  var _version;
  var _ids = [];
  if (!retryOptions) {
    _version = collection.begin();
    if (_isMultipleItems) {
      for (var i = 0; i < value.length; i++) {
        collection.upsert(value[i], _version);
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
      collection.upsert(value, _version);

      if (_ids) {
        _ids.push(value._id);
      }
    }

    value = collection.commit(_version);

    cache.invalidate(_ids, true);

    afterAction(store, isUpdate ? 'update' : 'insert', value);
    _propagate(store, value, isUpdate ? utils.OPERATIONS.UPDATE : utils.OPERATIONS.INSERT);
    if (isUpdate) {
      _propagateReflexive(store, collection, value,  utils.OPERATIONS.UPDATE);
    }

    if (!_isMultipleItems && !store.isStoreObject) {
      value = value[0];
    }
  }
  else {
    _version = retryOptions.version;
  }

  if (store.isLocal || isLocal) {
    if (store.isFilter) {
      hook.pushToHandlers(store, 'filterUpdated');
    }
    return;
  }

  var _method  = isUpdate ? 'PUT' : 'POST';
  var _request = '/';

  if (!retryOptions) {
    _request = url.create(store, _method, storeUtils.getPrimaryKeyValue(store, value, !isUpdate || (isUpdate && _isMultipleItems)));
    // required filters consition not fullfilled
    if (!_request) {
      return;
    }
    _request = _request.request;
  }
  else {
    _request = retryOptions.url;
  }

  http.request(_method, _request, value, function (err, data) {
    if (err) {
      var _error = template.getError(err, store, _method, false);
      setLunarisError(store.name, _method, _request, value, _version, err, _error);
      logger.warn(['lunaris.' + (isUpdate ? 'update' : 'insert') + '@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', [_error, utils.cloneAndFreeze(value)]);
    }

    var _isEvent = true;
    if (store.isStoreObject || !_isMultipleItems) {
      if (store.isStoreObject && Array.isArray(data)) {
        throw new Error('The store "' + store.name + '" is a store object. The ' + _method + ' method tries to ' + (isUpdate ? 'update' : 'insert') + ' multiple elements!');
      }

      value    = utils.merge(value, data);
      _version = collection.begin();
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

      for (i = 0; i < value.length; i++) {
        if (_isMultiple) {
          for (var j = 0; j < data.length; j++) {
            if (value[i]._id === data[j]._id) {
              value[i] = utils.merge(lunaris.clone(value[i]), data[j]);
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

    afterAction(store, 'update', value);
    afterAction(store,  isUpdate ? 'updated' : 'inserted', value, template.getSuccess(null, store, _method, false));
    if (store.isFilter) {
      hook.pushToHandlers(store, 'filterUpdated');
    }
    _propagate(store, value, utils.OPERATIONS.UPDATE);
    _propagateReflexive(store, collection, value, utils.OPERATIONS.UPDATE);
  });
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

    if (_options.store.isLocal) {
      var _collectionValues = _options.collection.getAll();
      afterAction(_options.store, 'get', _collectionValues);
      return callback(store);
    }

    var _request      = '/';
    var _cacheFilters =  {};

    if (!retryOptions) {
      _request      = url.create(_options.store, 'GET', primaryKeyValue);
      // required filters consition not fullfilled
      if (!_request) {
        return callback(store);
      }
      _cacheFilters = _request.cache;
      _request      = _request.request;
      var _ids      = _options.cache.get(_cacheFilters);

      if (_ids) {
        if (_ids.length) {
          afterAction(_options.store, 'get', _options.collection.getAll(_ids));
          return callback(store);
        }
        afterAction(_options.store, 'get', []);
        return callback(store);
      }
    }
    else {
      _request = retryOptions.url || '/';
    }

    http.request('GET', _request, null, function (err, data) {
      if (err) {
        var _error = template.getError(err, _options.store, 'GET', true);
        setLunarisError(_options.store.name, 'GET', _request, null, null, err, _error);
        logger.warn(['lunaris.get' + store], err);
        hook.pushToHandlers(_options.store, 'errorHttp', _error);
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

        for (var i = 0; i < data.length; i++) {
          _options.collection.upsert(data[i], _version);
        }

        if (primaryKeyValue && data.length) {
          data = data[0];
        }
      }
      else {
        _options.collection.upsert(data, _version);
      }

      data         = _options.collection.commit(_version);
      var _ids     = [];

      if (store.isStoreObject) {
        _ids.push(data._id);
      }
      else {
        for (i = 0; i < data.length; i++) {
          _ids.push(data[i]._id);
        }
      }

      _options.cache.add(_cacheFilters, _ids);
      afterAction(_options.store, 'get', data);
      _propagate(_options.store, data, utils.OPERATIONS.INSERT);
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
  var _isUpdate  = false;
  var _eventName = 'lunaris.' + (_isUpdate ? 'update' : 'insert') + store;
  try {
    if (retryOptions) {
      value = retryOptions.data;
    }

    var _options = beforeAction(store, value);
    if ((Array.isArray(value) && value[0]._id) || value._id) {
      _isUpdate = true;
    }
    if (retryOptions && retryOptions.method === 'POST') {
      _isUpdate = false;
    }

    if (_options.store.validateFn) {
      return validate(store, _options.value, _isUpdate, function (res) {
        if (!res) {
          return;
        }

        _upsert(_options.store, _options.collection, _options.cache, _options.value, isLocal, _isUpdate, retryOptions);
      }, _eventName);
    }

    _upsert(_options.store, _options.collection, _options.cache, _options.value, isLocal, _isUpdate, retryOptions);
  }
  catch (e) {
    logger.warn([_eventName], e);
  }
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

    var _version;
    if (!retryOptions) {
      _version = _options.collection.begin();
      _options.collection.remove(value._id, _version);
      value = _options.collection.commit(_version);
      var _isArray = Array.isArray(value);
      if ((!_isArray && !value) || (_isArray && !value.length)) {
        throw new Error('You cannot delete a value not in the store!');
      }
      afterAction(_options.store, 'delete', value);
      _propagate(_options.store, value, utils.OPERATIONS.DELETE);
      _propagateReflexive(_options.store, _options.collection, value, utils.OPERATIONS.DELETE);

      if (!store.isStoreObject) {
        value = value[0];
      }

      _options.cache.invalidate(value._id);
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
    http.request('DELETE', _request, null, function (err, data) {
      if (err) {
        var _error = template.getError(err, _options.store, 'DELETE', false);
        setLunarisError(_options.store.name, 'DELETE', _request, value, _version, err, _error);
        logger.warn(['lunaris.delete' + store], err);
        return hook.pushToHandlers(_options.store, 'errorHttp', [_error, value]);
      }

      afterAction(_options.store, 'deleted', data, template.getSuccess(null, _options.store, 'DELETE', false));
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
function clear (store, isSilent) {
  try {
    var _options = beforeAction(store, null, true);

    _options.collection.clear();
    _options.store.paginationCurrentPage = 1;
    _options.store.paginationOffset      = 0;
    _options.cache.clear();
    if (!isSilent) {
      hook.pushToHandlers(_options.store, 'reset');
    }
    _propagate(_options.store, null, utils.OPERATIONS.DELETE);
  }
  catch (e) {
    logger.warn(['lunaris.clear' + store], e);
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
    return utils.clone(_item);
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

      _store.validateFn(_valueToValidate, _store.meta.onValidate, _isUpdate, function (err) {
        if (err.length) {
          for (var i = 0; i < err.length; i++) {
            logger.warn(['lunaris.' + (_isUpdate ? 'update' : 'insert') + store + ' Error when validating data'], err[i]);
          }
          return callback(false, err);
        }

        callback(true);
      });
    }
  }
  catch (e) {
    logger.warn([eventName || ('lunaris.validate' + store)], e);
  }
}

exports.get               = get;
exports.getOne            = getOne;
exports.insert            = upsert;
// exports.insertFiltered = upsertFiltered;
exports.update            = upsert;
// exports.updateFiltered = upsertFiltered;
exports.upsert            = upsert;
exports.delete            = deleteStore;
exports.clear             = clear;
exports.retry             = retry;
exports.rollback          = rollback;
exports.getDefaultValue   = getDefaultValue;
exports.validate          = validate;
exports.setPagination     = setPagination;
// exports.deleteFiltered = deleteFiltered;
