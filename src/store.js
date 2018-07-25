var hook   = require('./hook.js');
var utils  = require('./utils.js');
var http   = require('./http.js');
var logger = require('./logger.js');

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
 * Check arguments for upsert, get, deleteStore
 * @param {String} store
 * @param {*} value
 * @param {Boolean} isNotValue enable or not value check
 */
function _checkArgs (store, value, isNotValue) {
  if (value === undefined && !isNotValue) {
    throw new Error('lunaris.<insert|update|delete>(<store>, <value>) must have a value, provided value: ' + value);
  }
  if (!store || typeof store !== 'string') {
    throw new Error('lunaris.<get|insert|update|clear|delete>(<store>, <value>) must have a correct store value: @<store>');
  }
}

/**
 * Get required params for HTTP request
 * @param {Object} store
 * @param {Sting} method
 * @returns {object} {
 *  isRequiredOptionsFilled : {Boolean}
 *  requiredOptions         : {String}
 *  optionalOptions         : {Array}
 * }
 */
function _getFilterValuesHTTPRequest (store, method) {
  var _filterValues            = { isRequiredOptionsFilled : true, requiredOptions : '', optionalOptions : [] };
  var _nbRequiredFIlters       = 0;
  var _nbRequiredFilledFilters = 0;
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

    if (_filter.isRequired && _methods.indexOf(method) !== -1) {
      _nbRequiredFIlters++;
    }

    if (_sourceValue !== undefined) {
      _value.push(_filter.localAttribute, _sourceValue[_filter.sourceAttribute], _filter.operator);

      if (_methods.indexOf(method) !== -1) {
        if (_filter.isRequired) {
          _nbRequiredFilledFilters++;
        }

        if (_value[2]) {
          _filterValues.optionalOptions.push(_value);
        }
        else {
          _filterValues.requiredOptions += '/' + _value[0] + '/' + _value[1];
        }
      }
    }
  }

  _filterValues.isRequiredOptionsFilled = _nbRequiredFIlters === _nbRequiredFilledFilters;
  return _filterValues;
}

/**
 * Construct searhc options
 * @param {Array} filterValues
 */
function _getSearchOption (filterValues) {
  var _search    = '';
  var _operators = {
    '='     : ':=',
    'ILIKE' : ':'
  };
  for (var j = 0; j < filterValues.length; j++) {
    var _operator = ':=';
    if (filterValues[j][2]) {
      _operator = _operators[filterValues[j][2]] || _operator;
    }
    _search += filterValues[j][0] + encodeURIComponent(_operator) + encodeURIComponent(filterValues[j][1]) + encodeURIComponent('+');
  }
  _search = _search.slice(0, _search.length - encodeURIComponent('+').length);
  return ['search', _search];
}

/**
 * Get and construct the url options
 * @param {Object} store
 * @param {Boolean} isPagination
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

  // _options = _options.concat(filterValues);
  if (filterValues.length) {
    _options.push(_getSearchOption(filterValues));
  }

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

  _request += _url;

  if (primaryKeyValue) {
    _request += '/' + primaryKeyValue;
  }

  var _filterValues  = _getFilterValuesHTTPRequest(store, method);

  if (!_filterValues.isRequiredOptionsFilled) {
    throw new Error('Required filter values must be defined!');
  }

  _request += _filterValues.requiredOptions;
  _request += _getUrlOptionsForHTTPRequest(store, _isGet, _filterValues.optionalOptions);
  return _request;
}

/**
 * Construct error template
 * @param {*} err
 * @param {*} store
 * @param {*} method
 * @param {*} isPlural
 */
function _getError (err, store, method, isPlural) {
  if (!store.errorTemplate) {
    return err.error + ' : ' + err.message;
  }

  var _methods = {
    'GET'    : '${load}',
    'PUT'    : '${edit}',
    'POST'   : '${create}',
    'DELETE' : '${delete}'
  };

  var _message = store.errorTemplate;
  _message = _message
    .replace('$method'       , _methods[method])
    .replace('$storeName'    , store.nameTranslated)
    .replace('$pronounMale'  , isPlural ? '${thePlural}' : '${the}')
    .replace('$pronounFemale', isPlural ? '${thePlural}' : '${theFemale}')
  ;
  return _message;
}

/** =================================================  *
 *                   Public methods                    *
 *  ================================================= **/

/**
 * Insert or Update a value in store
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
  var _isUpdate = false;
  try {
    if (retryOptions) {
      value = retryOptions.data;
    }

    _checkArgs(store, value);
    _isUpdate       = !retryOptions ? !!value._id : (retryOptions.method === 'POST' ? false : true);
    var _store      = _getStore(store);
    var _collection = _getCollection(_store);

    if (Object.isFrozen(value)) {
      value = utils.clone(value);
    }

    var _version;
    if (!retryOptions) {
      _version = _collection.begin();
      _collection.upsert(value, _version);
      value = _collection.commit(_version);
      value = value[0];
      hook.pushToHandlers(_store, _isUpdate ? 'update' : 'insert', utils.freeze(utils.clone(value)));
    }
    else {
      _version = retryOptions.version;
    }

    if (_store.isLocal || isLocal) {
      return;
    }

    var _method  = _isUpdate ? 'PUT' : 'POST'
    var _request = '/';

    if (!retryOptions) {
      _request = _createUrl(_store, _method, _getPrimaryKeyValue(_store, value, !_isUpdate));
    }
    else {
      _request = retryOptions.url;
    }
    http.request(_method, _request, value, function (err, data) {
      if (err) {
        var _error = _getError(err, _store, _method, false);
        upsert('@lunarisErrors', {
          version            : _version,
          data               : value,
          url                : _request,
          method             : _method,
          storeName          : _store.name,
          date               : dayjs(),
          messageError       : _error,
          messageErrorServer : err
        });
        logger.warn(['lunaris.' + (_isUpdate ? 'update' : 'insert') + store], err);
        return hook.pushToHandlers(_store, 'errorHttp', [_error, value]);
      }

      hook.pushToHandlers(_store, _isUpdate ? 'updated' : 'inserted', data);
    });
  }
  catch (e) {
    logger.warn(['lunaris.' + (_isUpdate ? 'update' : 'insert') + store], e);
  }
}

/**
 * Delete a value from the store
 * @param {String} store
 * @param {*} value
 * @param {Object} retryOptions {
 *   url,
 *   data,
 *   version
 * }
 */
function deleteStore (store, value, retryOptions) {
  try {
    if (retryOptions) {
      value = retryOptions.data;
    }
    _checkArgs(store, value);

    var _store      = _getStore(store);
    var _collection = _getCollection(_store);

    var _version;
    if (!retryOptions) {
      var _version = _collection.begin();
      _collection.remove(value._id, _version);
      value = _collection.commit(_version);
      value = value[0];
      if (!value) {
        throw new Error('You cannot delete a value not in the store!');
      }
      hook.pushToHandlers(_store, 'delete', value);
    }
    else {
      _version = retryOptions.version;
    }

    if (_store.isLocal) {
      return;
    }

    var _request = '/';
    if (!retryOptions) {
      _request = _createUrl(_store, 'DELETE', _getPrimaryKeyValue(_store, value));
    }
    else {
      _request = retryOptions.url;
    }
    http.request('DELETE', _request, null, function (err, data) {
      if (err) {
        logger.warn(['lunaris.delete' + store], err);
        var _error = _getError(err, _store, 'DELETE', false);
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

      hook.pushToHandlers(_store, 'deleted', data);
    });
  }
  catch (e) {
    logger.warn(['lunaris.delete' + store], e);
  }
}

/**
 * Clear the store collection
 * @param {String} store
 * @param {Boolean} isSilent
 */
function clear (store, isSilent) {
  try {
    _checkArgs(store, null, true);

    var _store      = _getStore(store);
    var _collection = _getCollection(_store);

    _collection.clear();
    _store.paginationCurrentPage = 1;
    _store.paginationOffset      = 0;
    if (!isSilent) {
      hook.pushToHandlers(_store, 'reset');
    }
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
    _checkArgs(store, null, true);

    var _store      = _getStore(store);
    var _collection = _getCollection(_store);

    if (_store.isLocal) {
      return hook.pushToHandlers(_store, 'get', _collection.getAll(), true);
    }

    var _request = '/';

    if (!retryOptions) {
      _request = _createUrl(_store, 'GET', primaryKeyValue);
    }
    else {
      _request = retryOptions.url || '/';
    }

    http.request('GET', _request, null, function (err, data) {
      if (err) {
        var _error = _getError(err, _store, 'GET', true);
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
      for (var i = 0; i < data.length; i++) {
        data[i] = utils.freeze(utils.clone(data[i]));
      }

      hook.pushToHandlers(_store, 'get', data, _isArray);
    });
  }
  catch (e) {
    logger.warn(['lunaris.get' + store], e);
  }
}

/**
 * Get firt value
 * @param {String} store
 * @param {*} value
 */
function getOne (store) {
  try  {
    _checkArgs(store, null, true);

    var _store      = _getStore(store);
    var _collection = _getCollection(_store);
    var _item       = _collection.getFirst();
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
    _checkArgs(store, null, true);

    var _store      = _getStore(store);
    var _collection = _getCollection(_store);
    _collection.rollback(version);
  }
  catch (e) {
    logger.warn(['lunaris.rollback' + store], e);
  }
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
exports.retry          = retry;
exports.rollback       = rollback;
// exports.deleteFiltered = deleteFiltered;
