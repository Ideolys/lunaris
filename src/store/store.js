var hook        = require('./store.hook.js');
var utils       = require('../utils.js');
var storeUtils  = require('./store.utils.js');
var http        = require('../http.js');
var logger      = require('../logger.js');
var cache       = require('./store.cache.js');
var url         = require('./store.url.js');
var template    = require('./store.template.js');
var emptyObject = {};

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

  for (var i = 0; i < store.storesToPropagate.length; i++) {
    var _storeToPropagate = store.storesToPropagate[i];
    var _store            = storeUtils.getStore('@' + _storeToPropagate);
    var _collection       = storeUtils.getCollection(_store);
    var _res              = _collection.propagate(store.name, data, operation);
    _pushCommitResToHandlers(_store, 'update', _res);
  }
}

/**
 * Update reflexive deps
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} obj parent object
 * @param {String} operation
 */
function _propagateReflexive (store, collection, obj, operation) {
  if (!store.meta || (store.meta && !store.meta.meta.reflexive)) {
    return;
  }

  var _res = collection.propagateReflexive(obj, operation);
  _pushCommitResToHandlers(store, 'update', _res);
}

/**
 * Upsert a value in a store
 * @param {Object} store
 * @param {Array/Object} value
 * @param {Boolean} isLocal
 * @param {Boolean} isUpdate
 * @param {Object} retryOptions
 */
function _upsert (store, value, isLocal, isUpdate, retryOptions) {
  var _collection = storeUtils.getCollection(store);
  var _cache      = cache.getCache(store);

  var _isMultipleItems = Array.isArray(value);
  var _version;
  var _ids = [];
  if (!retryOptions) {
    _version = _collection.begin();

    if (_isMultipleItems) {
      for (var i = 0; i < value.length; i++) {
        value[i] = utils.clone(value[i]);
        _collection.upsert(value[i], _version);
        _ids.push(value[i]._id);
      }
    }
    else {
      value = utils.clone(value);
      if (store.isStoreObject) {
        // we always should update the same value for object store
        var _value = _collection.getAll();
        var _id    = _value ? _value._id : null;
        value._id  = _id;
      }
      _collection.upsert(value, _version);

      if (_ids) {
        _ids.push(value._id);
      }
    }

    value = _collection.commit(_version);
    value = utils.cloneAndFreeze(value);

    if (!_isMultipleItems) {
      value = value[0];
    }

    _cache.invalidate(_ids, true);

    hook.pushToHandlers(store, isUpdate ? 'update' : 'insert', value, _isMultipleItems);
    _propagate(store, value, isUpdate ? utils.OPERATIONS.UPDATE : utils.OPERATIONS.INSERT);
    if (isUpdate) {
      _propagateReflexive(store, _collection, utils.clone(value),  utils.OPERATIONS.UPDATE);
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
      upsert('@lunarisErrors', {
        version            : _version,
        data               : value,
        url                : _request,
        method             : _method,
        storeName          : store.name,
        date               : dayjs(),
        messageError       : _error,
        messageErrorServer : err
      });
      logger.warn(['lunaris.' + (isUpdate ? 'update' : 'insert') + '@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', [_error, value]);
    }

    var _isEvent    = true;
    var _isMultiple = Array.isArray(data);
    if (_isMultiple) {
      if (store.isStoreObject) {
        throw new Error('The store "' + store.name + '" is a store object. The ' + _method + ' method tries to ' + (isUpdate ? 'update' : 'insert') + ' multiple elements!');
      }

      _version = _collection.begin();
      for (i = 0; i < value.length; i++) {
        for (var j = 0; j < data.length; j++) {
          if (value[i]._id === data[j]._id) {
            value[i] = utils.merge(lunaris.clone(value[i]), data[j]);
            _collection.upsert(value[i], _version);
          }
        }
      }
      value = _collection.commit(_version);
      value = utils.cloneAndFreeze(value);
    }
    else {
      value = utils.merge(lunaris.clone(value), data);
      value = _collection.upsert(value);
      // the value must have been deleted
      if (value) {
        value = utils.cloneAndFreeze(value);
      }
      else {
        _isEvent = false;
      }
    }

    if (!_isEvent) {
      return;
    }

    hook.pushToHandlers(store, 'update', value, _isMultiple);
    hook.pushToHandlers(store, isUpdate ? 'updated' : 'inserted', [
      value,
      template.getSuccess(null, store, _method, false)
    ]);
    if (store.isFilter) {
      hook.pushToHandlers(store, 'filterUpdated');
    }
    _propagate(store, value, utils.OPERATIONS.UPDATE);
    _propagateReflexive(store, _collection, utils.clone(value), utils.OPERATIONS.UPDATE);
  });
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

    storeUtils.checkArgs(store, value);
    if ((Array.isArray(value) && value[0]._id) || value._id) {
      _isUpdate = true;
    }
    if (retryOptions && retryOptions.method === 'POST') {
      _isUpdate = false;
    }

    var _store = storeUtils.getStore(store);
    if (_store.validateFn) {
      return validate(store, value, _isUpdate, function (res) {
        if (!res) {
          return;
        }

        _upsert(_store, value, isLocal, _isUpdate, retryOptions);
      }, _eventName);
    }

    _upsert(_store, value, isLocal, _isUpdate, retryOptions);
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
    storeUtils.checkArgs(store, value);

    var _store      = storeUtils.getStore(store);
    var _collection = storeUtils.getCollection(_store);
    var _cache      = cache.getCache(_store);

    var _version;
    if (!retryOptions) {
      _version = _collection.begin();
      _collection.remove(value._id, _version);
      value = _collection.commit(_version);
      value = value[0];
      if (!value) {
        throw new Error('You cannot delete a value not in the store!');
      }
      hook.pushToHandlers(_store, 'delete', value);
      _propagate(_store, value, utils.OPERATIONS.DELETE);
      _propagateReflexive(_store, _collection, utils.clone(value), utils.OPERATIONS.DELETE);
      _cache.invalidate(value._id);
    }
    else {
      _version = retryOptions.version;
    }

    if (_store.isLocal || isLocal) {
      return;
    }

    var _request = '/';
    if (!retryOptions) {
      _request = url.create(_store, 'DELETE', storeUtils.getPrimaryKeyValue(_store, value));
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
        var _error = template.getError(err, _store, 'DELETE', false);
        upsert('@lunarisErrors', {
          version            : _version,
          data               : value,
          url                : _request,
          method             : 'DELETE',
          storeName          : _store.name,
          date               : dayjs(),
          messageError       : _error,
          messageErrorServer : err
        });
        logger.warn(['lunaris.delete' + store], err);
        return hook.pushToHandlers(_store, 'errorHttp', [_error, value]);
      }

      hook.pushToHandlers(_store, 'deleted', [
        data,
        template.getSuccess(null, _store, 'DELETE', false)
      ]);
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
    storeUtils.checkArgs(store, null, true);

    var _store = storeUtils.getStore(store);

    _store.paginationLimit       = limit || _store.paginationLimit;
    _store.paginationCurrentPage = page  || 1;
    _store.paginationOffset      = _store.paginationCurrentPage === 1 ? 0 : _store.paginationLimit * _store.paginationCurrentPage;
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
    storeUtils.checkArgs(store, null, true);

    var _store      = storeUtils.getStore(store);
    var _collection = storeUtils.getCollection(_store);
    var _cache      = cache.getCache(_store);

    _collection.clear();
    _store.paginationCurrentPage = 1;
    _store.paginationOffset      = 0;
    _cache.clear();
    if (!isSilent) {
      hook.pushToHandlers(_store, 'reset');
    }
    _propagate(_store, null, utils.OPERATIONS.DELETE);
  }
  catch (e) {
    logger.warn(['lunaris.clear' + store], e);
  }
}

/**
 * Get values
 * @param {String} store
 * @param {*} primaryKeyValue
 * @param {*} value
 * @param {Object} retryOptions {
 *   url,
 * }
 */
function get (store, primaryKeyValue, retryOptions) {
  try {
    storeUtils.checkArgs(store, null, true);

    var _store      = storeUtils.getStore(store);
    var _collection = storeUtils.getCollection(_store);
    var _cache      = cache.getCache(_store);

    if (_store.isLocal) {
      var _collectionValues = _collection.getAll();
      return hook.pushToHandlers(_store, 'get', _collectionValues, Array.isArray(_collectionValues));
    }

    var _request      = '/';
    var _cacheFilters =  {};

    if (!retryOptions) {
      _request      = url.create(_store, 'GET', primaryKeyValue);
      // required filters consition not fullfilled
      if (!_request) {
        return;
      }
      _cacheFilters = _request.cache;
      _request      = _request.request;
      var _ids      = _cache.get(_cacheFilters);

      if (_ids) {
        if (_ids.length) {
          return hook.pushToHandlers(_store, 'get', utils.cloneAndFreeze(_collection.getAll(_ids)), true);
        }
        return hook.pushToHandlers(_store, 'get', [], true);
      }
    }
    else {
      _request = retryOptions.url || '/';
    }

    http.request('GET', _request, null, function (err, data) {
      if (err) {
        var _error = template.getError(err, _store, 'GET', true);
        upsert('@lunarisErrors', {
          version            : null,
          data               : null,
          url                : _request,
          method             : 'GET',
          storeName          : _store.name,
          date               : dayjs(),
          messageError       : _error,
          messageErrorServer : err
        });
        logger.warn(['lunaris.get' + store], err);
        return hook.pushToHandlers(_store, 'errorHttp', _error);
      }

      var _version = _collection.begin();
      if (Array.isArray(data)) {
        if (_store.isStoreObject) {
          return logger.warn(
            ['lunaris.get' + store],
            new Error('The store "' + _store.name + '" is an object store. The GET method cannot return multiple elements!')
          );
        }

        for (var i = 0; i < data.length; i++) {
          _collection.upsert(data[i], _version);
        }

        if (primaryKeyValue && data.length) {
          data = data[0];
        }
      }
      else {
        _collection.upsert(data, _version);
      }

      var _isArray = Array.isArray(data);
      data         = _collection.commit(_version);
      var _ids     = [];
      for (i = 0; i < data.length; i++) {
        _ids.push(data[i]._id);
        data[i] = utils.freeze(utils.clone(data[i]));
      }

      _cache.add(_cacheFilters, _ids);
      hook.pushToHandlers(_store, 'get', data, _isArray);
      _propagate(_store, data, utils.OPERATIONS.INSERT);
    });
  }
  catch (e) {
    logger.warn(['lunaris.get' + store], e);
  }
}

/**
 * Get firt value or the value identified by its _id
 * @param {String} store
 * @param {Int} id lunaris _id value
 */
function getOne (store, id) {
  try {
    storeUtils.checkArgs(store, null, true);

    var _store      = storeUtils.getStore(store);
    var _collection = storeUtils.getCollection(_store);

    var _item;

    if (id)  {
      _item = _collection.get(id);
    }
    else {
      _item = _collection.getFirst();
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
    storeUtils.checkArgs(store, null, true);

    var _store      = storeUtils.getStore(store);
    var _collection = storeUtils.getCollection(_store);
    _collection.rollback(version);
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
    storeUtils.checkArgs(store, null, true);

    var _store = storeUtils.getStore(store);
    if (!_store.meta) {
      return emptyObject;
    }

    return utils.clone(_store.meta.defaultValue);
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
