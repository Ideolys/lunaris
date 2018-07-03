var hook  = require('./hook.js');
var utils = require('./utils.js');
var http  = require('./http.js');

/**
 * Get store
 * @param {String} storeName
 */
function _getStore (storeName) {
  if (/@/.test(storeName)) {
    storeName = storeName.split('@');
    storeName = storeName[storeName.length - 1];
  }
  var lunarisExports = require('./exports.js');
  var _store         = lunarisExports._stores[storeName];
  if (!_store) {
    throw new Error('The store "' + storeName + '" has not been defined');
  }

  return lunarisExports._stores[storeName];
}

/**
 * Get store collection
 * @param {Object} store
 */
function _getCollection (store) {
  var _collection = store.data;

  if (!_collection) {
    throw new Error('"' + store + '" has not been defined!');
  }

  return _collection;
}

/**
 * Get primary key value for update and delete
 * @param {Object} store
 * @param {Object} value
 * @param {Boolean} isInsert
 * @returns {String}
 */
function _getPrimaryKeyValue (store, value, isInsert) {
  var _id = null;

  if (isInsert) {
    return _id;
  }
  if (!store.primaryKey) {
    return value._id;
  }

  var _primaryKey = store.primaryKey;
  if (Array.isArray(_primaryKey)) {
    for (var i = 0; i < _primaryKey.length; i++) {
      var _value = value[_primaryKey[i]];
      if (_value) {
        _id += _value + '-';
      }
    }

    if (_id !== '') {
      _id = _id.slice(0, _id.length - 1);
    }
  }

  return value[store.primaryKey];
}

/**
 * Set store.isInit to true
 * isInit control the 'reset' hook behaviour for lunaris-vue plugin
 * @param {Object} store
 */
function _initStoreIfNotAlreadyInitialized (store) {
  if (!store.isInit) {
    store.isInit = true;
  }
}

/**
 * Check arguments for upsert, get, deleteStore
 * @param {String} store
 * @param {*} value
 * @param {Boolean} isNotValue enable or not value check
 */
function _checkArgs (store, value, isNotValue) {
  if (value === undefined && !isNotValue) {
    throw new Error('lunaris.<get|insert|update>(<store>, <value>) must have a value, provided value: ' + value);
  }
  if (!store || typeof store !== 'string') {
    throw new Error('lunaris.<get|insert|update>(<store>, <value>) must have a correct store value: @<store>');
  }
}

/**
 * Get required params for HTTP request
 * @param {Object} store
 * @param {Sting} method
 * @returns {String} /param/paramValue/...
 */
function _getFilterValuesHTTPRequest (store, method) {
  var _filterValues = { requiredOptions : '', optionalOptions : [] };
  if (!store.filters.length) {
    return _filterValues;
  }

  for (var i = 0; i < store.filters.length; i++) {
    var _filter = store.filters[i];
    var _value  = [];
    if (!_filter.source) {
      throw new Error('A filter must have a source defined as : filter.source = @<store>');
    }
    if (!_filter.sourceAttribute) {
      throw new Error('A filter must have a source attribute defined as : filter.sourceAttribute = <attribute>');
    }
    if (!_filter.localAttribute) {
      throw new Error('A filter must have a local attribute defined as : filter.localAttribute = <attribute>');
    }

    var _sourceStore = _getStore(_filter.source);
    var _sourceValue = _getCollection(_sourceStore).getFirst();
    var _methods     = [];
    if (_filter.httpMethods) {
      if (Array.isArray(_filter.httpMethods)) {
        _methods = _filter.httpMethods;
      }
    }
    else {
      _methods.push(method);
    }

    if (_sourceValue !== undefined) {
      _value.push(_filter.localAttribute, _sourceValue[_filter.sourceAttribute]);

      if (_methods.indexOf(method) !== -1) {
        if (_filter.isRequired) {
          _filterValues.requiredOptions += '/' + _value[0] + '/' + _value[1];
        }
        else {
          _filterValues.optionalOptions.push(_value);
        }
      }
    }
  }

  return _filterValues;
}

/**
 * Get and construct the url options
 * @param {Object} store
 * @returns {String} ?option=optionvalue&...
 */
function _getUrlOptionsForHTTPRequest (store, isPagination, filterValues) {
  var _optionsStr = '';
  var _options    = [];
  filterValues    = filterValues || [];

  // Pagination
  if (isPagination) {
    var _limit  = store.paginationLimit;
    var _offset = store.paginationOffset;
    _options.push(['limit' , _limit]);
    _options.push(['offset', _offset]);
    store.paginationOffset = _limit * store.paginationCurrentPage;
    store.paginationCurrentPage++;
  }

  _options = _options.concat(filterValues);
  if (_options.length) {
    _optionsStr += '?';
  }
  for (var i = 0; i < _options.length; i++) {
    _optionsStr += _options[i][0] + '=' + _options[i][1] + '&';
  }

  _optionsStr = _optionsStr.slice(0, _optionsStr.length - 1);
  return _optionsStr;
}

/**
 * Create URL for givens tore and action
 * @param {Object} store
 * @param {Boolean} isGET is GET HTTP me:thod ?
 * @param {*} primaryKeyValue
 * @returns {String}
 */
function _createUrl (store, method, primaryKeyValue) {
  var _request = '/';
  var _isGet   = method === 'GET';
  var _url     = store.url || store.name;
  if (pluralize.isPlural(_url) === false && !primaryKeyValue && _isGet) {
    _request += pluralize(_url);
  }
  else {
    _request += _url;
  }

  if (primaryKeyValue) {
    _request += '/' + primaryKeyValue;
  }

  var _filterValues   = _getFilterValuesHTTPRequest(store, method);
  _request           += _filterValues.requiredOptions;
  _request           += _getUrlOptionsForHTTPRequest(store, _isGet, _filterValues.optionalOptions);
  return _request;
}

/**
 * Insert or Update a value in store
 * @param {String} store
 * @param {*} value
 * @param {Boolean} isLocal insert or update
 */
function upsert (store, value, isLocal) {
  _checkArgs(store, value);

  var _isUpdate   = !!value._id;
  var _store      = _getStore(store);
  var _collection = _getCollection(_store);
  _initStoreIfNotAlreadyInitialized(_store);

  if (Object.isFrozen(value)) {
    value = utils.clone(value);
  }

  _collection.upsert(value);
  hook.pushToHandlers(_store, _isUpdate ? 'update' : 'insert', utils.freeze(utils.clone(value)));

  if (_store.isLocal || isLocal) {
    return;
  }

  var _method  = _isUpdate ? 'PUT' : 'POST'
  var _request = _createUrl(_store, _method, _getPrimaryKeyValue(_store, value, !_isUpdate));
  http.request(_method, _request, value, function (err, data) {
    if (err) {
      return hook.pushToHandlers(_store, 'errorHttp', err);
    }
    hook.pushToHandlers(_store, _isUpdate ? 'updated' : 'inserted', data);
  });
}

/**
 * Delete a value from the store
 * @param {String} store
 * @param {*} value
 */
function deleteStore (store, value) {
  _checkArgs(store, value);

  var _store      = _getStore(store);
  var _collection = _getCollection(_store);
  _initStoreIfNotAlreadyInitialized(_store);

  var _res = _collection.remove(value._id);
  hook.pushToHandlers(_store, 'delete', _res);

  if (_store.isLocal) {
    return;
  }

  var _request = _createUrl(_store, 'DELETE', _getPrimaryKeyValue(_store, value));
  http.request('DELETE', _request, null, function (err, data) {
    if (err) {
      return hook.pushToHandlers(_store, 'errorHttp', err);
    }
    hook.pushToHandlers(_store, 'deleted', data);
  });
}

/**
 * Clear the store collection
 * @param {String} store
 * @param {Boolean} isSilent
 */
function clear (store, isSilent) {
  _checkArgs(store, null, true);

  var _store      = _getStore(store);
  var _collection = _getCollection(_store);

  _collection.clear();
  _store.isInit                = false;
  _store.paginationCurrentPage = 1;
  _store.paginationOffset      = 0;
  if (isSilent) {
    hook.pushToHandlers(_store, 'reset');
  }
}

/**
 * Get values
 * @param {String} store
 * @param {*} primaryKeyValue
 * @param {*} value
 */
function get (store, primaryKeyValue) {
  _checkArgs(store, null, true);

  var _store      = _getStore(store);
  var _collection = _getCollection(_store);
  _initStoreIfNotAlreadyInitialized(_store);

  var _request = '/';
  try {
    _request = _createUrl(_store, 'GET', primaryKeyValue);
  }
  catch (e) {
    return hook.pushToHandlers(_store, 'errorHttp', e);
  }

  http.request('GET', _request, null, function (err, data) {
    if (err) {
      return hook.pushToHandlers(_store, 'errorHttp', err);
    }

    if (Array.isArray(data)) {
      for (var i = 0; i < data.length; i++) {
        _collection.upsert(data[i]);
        data[i] = utils.freeze(utils.clone(data[i]));
      }

      if (primaryKeyValue && data.length) {
        data = data[0];
      }
    }
    else {
      _collection.upsert(data);
      data = utils.freeze(utils.clone(data));
    }

    hook.pushToHandlers(_store, 'get', data);
  });
}

/**
 * Get firt value
 * @param {String} store
 * @param {*} value
 */
function getOne (store) {
  _checkArgs(store, null, true);

  var _store      = _getStore(store);
  var _collection = _getCollection(_store);
  var _item       = _collection.getFirst();
  if (!_item) {
    return;
  }
  return utils.freeze(utils.clone(_item));
}

exports.get            = get;
exports.getOne         = getOne;
exports.insert         = upsert;
// exports.insertFiltered = upsertFiltered;
exports.update         = upsert;
// exports.updateFiltered = upsertFiltered;
exports.upsert         = upsert;
exports.delete         = deleteStore;
exports.clear          = clear;
//exports.deleteFiltered = deleteFiltered;
