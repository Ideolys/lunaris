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

    _value.push(_filter.localAttribute, _sourceValue[_filter.sourceAttribute]);

    if (_filter.isRequired) {
      _filterValues.requiredOptions += '/' + _value[0] + '/' + _value[1];
    }
    else {
      _filterValues.optionalOptions.push(_value);
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
  }

  if (_options.length) {
    _optionsStr += '?';
  }
  for (var i = 0; i < _options.length; i++) {
    _optionsStr += _options[i][0] + '=' + _options[i][1] + '&';
  }
  for (i = 0; i < filterValues.length; i++) {
    _optionsStr += filterValues[i][0] + '=' + filterValues[i][1] + '&';
  }

  _optionsStr = _optionsStr.slice(0, _optionsStr.length - 1);
  return _optionsStr;
}

/**
 * Insert or Update a value in store
 * @param {String} store
 * @param {*} value
 */
function upsert (store, value) {
  _checkArgs(store, value);

  var _event      = value._id ? 'update' : 'insert';
  var _store      = _getStore(store);
  var _collection = _getCollection(_store);

  _collection.upsert(value);
  hook.pushToHandlers(_store, _event, value);

  // TODO push to HTTP
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

  // TODO push to HTTP
}

/**
 * Get values
 * @param {String} store
 * @param {*} value
 */
function get (store) {
  _checkArgs(store, null, true);

  var _store      = _getStore(store);
  var _collection = _getCollection(_store);

  var _request = '/';
  if (pluralize.isPlural(_store.name) === false) {
    _request += pluralize(_store.name);
  }
  else {
    _request += _store.name;
  }

  try {
    var _filterValues   = _getFilterValuesHTTPRequest(_store);
    _request           += _filterValues.requiredOptions;
    _request           += _getUrlOptionsForHTTPRequest(_store, true, _filterValues.optionalOptions);
  }
  catch (e) {
    return hook.pushToHandlers(_store, 'errorHttp', e);
  }

  http.get(_request, function (err, data) {
    if (err) {
      return hook.pushToHandlers(_store, 'errorHttp', err);
    }

    for (var i = 0; i < data.length; i++) {
      _collection.upsert(data[i]);
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

  return utils.clone(_collection.getFirst());
}

exports.get            = get;
exports.getOne         = getOne;
exports.insert         = upsert;
// exports.insertFiltered = upsertFiltered;
exports.update         = upsert;
// exports.updateFiltered = upsertFiltered;
exports.delete         = deleteStore;
//exports.deleteFiltered = deleteFiltered;
