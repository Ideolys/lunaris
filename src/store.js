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
 * @returns {String} /param/paramValue/...
 */
function _getFilterValuesHTTPRequest (store) {
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

    if (_sourceValue !== undefined) {
      _value.push(_filter.localAttribute, _sourceValue[_filter.sourceAttribute]);

      if (_filter.isRequired) {
        _filterValues.requiredOptions += '/' + _value[0] + '/' + _value[1];
      }
      else {
        _filterValues.optionalOptions.push(_value);
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
function _createUrl (store, isGET, primaryKeyValue) {
  var _request = '/';
  if (pluralize.isPlural(store.name) === false && !primaryKeyValue && isGET) {
    _request += pluralize(store.name);
  }
  else {
    _request += store.name;
  }

  if (primaryKeyValue) {
    _request += '/' + primaryKeyValue;
  }

  var _filterValues   = _getFilterValuesHTTPRequest(store);
  _request           += _filterValues.requiredOptions;
  _request           += _getUrlOptionsForHTTPRequest(store, isGET, _filterValues.optionalOptions);
  return _request;
}

/**
 * Insert or Update a value in store
 * @param {String} store
 * @param {*} value
 */
function upsert (store, value) {
  _checkArgs(store, value);

  var _isUpdate   = !!value._id;
  var _store      = _getStore(store);
  var _collection = _getCollection(_store);

  _collection.upsert(value);
  hook.pushToHandlers(_store, _isUpdate ? 'update' : 'insert', value);

  var _request = _createUrl(_store, false, _getPrimaryKeyValue(_store, value, !_isUpdate));
  http.request(_isUpdate ? 'PUT' : 'POST', _request, function (err, data) {
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

  var _res = _collection.remove(value._id);
  hook.pushToHandlers(_store, 'delete', _res);

  var _request = _createUrl(_store, false, _getPrimaryKeyValue(_store, value));
  http.request('DELETE', _request, function (err, data) {
    if (err) {
      return hook.pushToHandlers(_store, 'errorHttp', err);
    }
    hook.pushToHandlers(_store, 'deleted', data);
  });
}

/**
 * Clear the store collection
 * @param {String} store
 */
function clear (store) {
  _checkArgs(store, null, true);

  var _store      = _getStore(store);
  var _collection = _getCollection(_store);

  var _res = _collection.clear();
  hook.pushToHandlers(_store, 'reset');
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

  var _request = '/';
  try {
    _request = _createUrl(_store, true, primaryKeyValue);
  }
  catch (e) {
    return hook.pushToHandlers(_store, 'errorHttp', e);
  }

  http.request('GET', _request, function (err, data) {
    if (err) {
      return hook.pushToHandlers(_store, 'errorHttp', err);
    }

    for (var i = 0; i < data.length; i++) {
      _collection.upsert(data[i]);
    }

    if (primaryKeyValue && data.length) {
      data = data[0];
    }

    hook.pushToHandlers(_store, 'get', utils.clone(data));
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
  return utils.clone(_item);
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
