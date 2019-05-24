var storeUtils     = require('./store.utils.js');
var utils          = require('../utils.js');
var logger         = require('../logger.js');
var exportsLunaris = require('../exports.js');
var offline        = require('../offline.js');

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
function fixedEncodeURIComponent (str) {
  if (!offline.isOnline) {
    return str;
  }

  return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

/**
 * Filter source value
 * @param {Function} whereFn
 * @param {Object} item
 * @returns {Boolean}
 */
function _runWhereCondition (whereFn, item) {
  if (typeof whereFn !== 'function') {
    logger.tip('A filter where must be a function : filter.sourceWhere = function (item) { return Boolean }.');
    return false;
  }

  var _res = whereFn.call(null, item, exportsLunaris.constants);
  if (typeof _res !== 'boolean') {
    logger.tip('A filter where must return a boolean.');
    return false;
  }

  return _res;
}

/**
* Get required params for HTTP request
* @param {Object} store
* @param {Sting} method
* @returns {object} {
*  isRequiredOptionsFilled    : {Boolean}
*  constructedRequiredOptions : {String}
*  requiredOptions            : {Object} { <source:attribute:operator> : {Array} }
*  optionalOptions            : {Object} { <source:attribute:operator> : {Array} }
*  cache                      : {Object}
* }
*/
function _getFilterValuesHTTPRequest (store, method) {
  var _filterValues            = {
    isRequiredOptionsFilled    : true,
    constructedRequiredOptions : '',
    requiredOptions            : {},
    optionalOptions            : {},
    cache                      : {}
  };
  var _nbRequiredFIlters       = 0;
  var _nbRequiredFilledFilters = 0;
  if (!store.filters.length) {
    return _filterValues;
  }

  for (var i = 0; i < store.filters.length; i++) {
    var _filter = store.filters[i];
    var _value  = [];

    var _sourceStore = storeUtils.getStore(_filter.source);
    var _sourceValue = storeUtils.getCollection(_sourceStore).getAll();
    if (_sourceValue && !Array.isArray(_sourceValue)) {
      _sourceValue = [_sourceValue];
    }
    else if (!_sourceValue) {
      _sourceValue = [];
    }
    var _methods = [];
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

    var _operator = _filter.operator;

    if (!_sourceStore.isStoreObject) {
      _operator = 'ILIKE';
      // if (_filter.operator && _filter.operator !== 'ILIKE') {
      //   throw new Error('Array filter must declare ILIKE operator or nothing!');
      // }
    }

    for (var j = _sourceValue.length - 1; j >= 0; j--) {
      if (!_filter.sourceWhere || (_filter.sourceWhere && _runWhereCondition(_filter.sourceWhere, _sourceValue[j]))) {
        _sourceValue[j] = _sourceValue[j][_filter.sourceAttribute];
      }
      else {
        _sourceValue.splice(j, 1);
      }
    }

    if (!_sourceValue.length) {
      _sourceValue = undefined;
    }

    if (_sourceStore.isStoreObject) {
      _sourceValue = _sourceValue ? _sourceValue[0] : undefined;
    }

    if (_sourceValue !== undefined) {
      var _filterKey = i;
      _value.push(_filter.attributeUrl, _filter.localAttribute, _sourceValue, _operator);

      if (_methods.indexOf(method) !== -1) {
        if (_filter.isRequired) {
          _nbRequiredFilledFilters++;
        }

        if (_value[3] && !_filter.isRequired) {
          _filterValues.optionalOptions[_filterKey] = _value;
        }
        else {
          if (Array.isArray(_sourceValue)) {
            throw new Error('A required filter must be a store object!');
          }
          _filterValues.constructedRequiredOptions += '/' + (_value[0] || _value[1]) + '/' + fixedEncodeURIComponent(_value[2]);
          _filterValues.requiredOptions[_filterKey] = _value;
        }

        _filterValues.cache[_filterKey] = _value[2];
      }
    }
  }

  _filterValues.isRequiredOptionsFilled = _nbRequiredFIlters === _nbRequiredFilledFilters;
  return _filterValues;
}

/**
* Construct search options
* @param {Array} filterValues
*/
function _getSearchOption (filterValues) {
  var _search    = '';
  var _operators = utils.OPERATORS;
  for (var j = 0; j < filterValues.length; j++) {
    var _operator = utils.OPERATORS.ILIKE;
    if (filterValues[j][3]) {
      _operator = _operators[filterValues[j][3]] || _operator;
    }
    var _value = filterValues[j][2];
    if (Array.isArray(_value)) {
      _value = '[' + _value.join(',') + ']';
    }
    var _attribute = filterValues[j][0] || filterValues[j][1];
    _search       += (_attribute) + fixedEncodeURIComponent(_operator) + fixedEncodeURIComponent(_value) + fixedEncodeURIComponent('+');
  }
  _search = _search.slice(0, _search.length - fixedEncodeURIComponent('+').length);
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
* @param {Boolean} isGET is GET HTTP method ?
* @param {*} primaryKeyValue
* @returns {Object} {
*  isRequiredOptionsFilled    : {Boolean}
*  constructedRequiredOptions : {String}
*  requiredOptions            : {Object} { <source:attribute:operator> : {Array} }
*  optionalOptions            : {Object} { <source:attribute:operator> : {Array} }
*  cache                      : {Object}
* }
*/
function createUrl (store, method, primaryKeyValue) {
  var _request = { request : '/', cache : {} };
  var _isGet   = method === 'GET';
  var _url     = store.url || store.name;

  _request.request += _url;

  if (primaryKeyValue !== undefined && primaryKeyValue !== null) {
    _request.request += '/' + primaryKeyValue;
  }

  if (_isGet) {
    _request.cache.limit  = store.paginationLimit;
    _request.cache.offset = store.paginationOffset;
  }

  var _filterValues  = _getFilterValuesHTTPRequest(store, method);

  if (!_filterValues.isRequiredOptionsFilled) {
    return null;
  }

  _request.request += _filterValues.constructedRequiredOptions;

  if (store.urlSuffix) {
    _request.request += '/' + store.urlSuffix;
    logger.deprecated('store.urlSuffix is deprecated. It will be removed!');
  }

  var _options = [];
  var _keys    = Object.keys(_filterValues.optionalOptions);
  for (var i = 0; i < _keys.length; i++) {
    _options.push(_filterValues.optionalOptions[_keys[i]]);
  }
  _request.request += _getUrlOptionsForHTTPRequest(store, _isGet, _options);

  utils.merge(_request.cache, _filterValues.cache);
  _request.requiredOptions = _filterValues.requiredOptions;
  _request.optionalOptions = _filterValues.optionalOptions;
  return _request;
}

/**
 * Generate get request from urlObj
 * @param {Object} store
 * @param {Object} cacheObj {
 *  isRequiredOptionsFilled    : {Boolean}
 *  constructedRequiredOptions : {String}
 *  requiredOptions            : {Object} { <source:attribute:operator> : {Array} }
 *  optionalOptions            : {Object} { <source:attribute:operator> : {Array} }
 *  cache                      : {Object}
 * }
 */
function generateRequest (store, urlObj) {
  var _request = '/';
  var _url     = store.url || store.name;

  _request += _url;
  _request += urlObj.constructedRequiredOptions;

  var _options = [];
  var _keys    = Object.keys(urlObj.optionalOptions);
  for (var i = 0; i < _keys.length; i++) {
    _options.push(urlObj.optionalOptions[_keys[i]]);
  }
  var _search = _getSearchOption(_options);
  _request += '?limit=' + urlObj.cache.limit + '&offset=' + urlObj.cache.offset + '&' + _search[0] + '=' + _search[1];

  return _request;
}

exports.create           = createUrl;
exports.createForOffline = generateRequest;
