var storeUtils = require('./store.utils.js');
var utils      = require('../utils.js');
var logger     = require('../logger.js');

/**
 * Check filter object attributes
 * @param {Object} filter { source : ,, sourceAttribute : , localAttribute :  }
 */
function _checkFilterObject (filter) {
  if (!filter.source) {
    throw new Error('A filter must have a source defined as : filter.source = @<store>');
  }
  if (!filter.sourceAttribute) {
    throw new Error('A filter must have a source attribute defined as : filter.sourceAttribute = <attribute>');
  }
  if (!filter.localAttribute) {
    throw new Error('A filter must have a local attribute defined as : filter.localAttribute = <attribute>');
  }
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

  var _res = whereFn.call(null, item);
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
*  isRequiredOptionsFilled : {Boolean}
*  requiredOptions         : {String}
*  optionalOptions         : {Array}
*  cache                   : {Object}
* }
*/
function _getFilterValuesHTTPRequest (store, method) {
  var _filterValues            = {
    isRequiredOptionsFilled : true,
    requiredOptions         : '',
    optionalOptions         : [],
    cache                   : {}
  };
  var _nbRequiredFIlters       = 0;
  var _nbRequiredFilledFilters = 0;
  if (!store.filters.length) {
    return _filterValues;
  }

  for (var i = 0; i < store.filters.length; i++) {
    var _filter = store.filters[i];
    var _value  = [];
    _checkFilterObject(_filter);

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

    if (!_sourceStore.isStoreObject) {
      if (_filter.operator && _filter.operator !== 'ILIKE') {
        throw new Error('Array filter must declare ILIKE operator or nothing!');
      }
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
      _value.push(_filter.localAttribute, _sourceValue, _filter.operator || 'ILIKE');

      if (_methods.indexOf(method) !== -1) {
        if (_filter.isRequired) {
          _nbRequiredFilledFilters++;
        }

        if (_value[2] && !_filter.isRequired) {
          _filterValues.optionalOptions.push(_value);
        }
        else {
          if (Array.isArray(_sourceValue)) {
            throw new Error('A required filter must be a store object!');
          }
          _filterValues.requiredOptions += '/' + _value[0] + '/' + _value[1];
        }

        _filterValues.cache[_filter.source + ':' + _filter.sourceAttribute] = _value[1];
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
    '='   : ':=',
    ILIKE : ':',
    '>'   : ':>',
    '<'   : ':<',
    '>='  : ':>=',
    '<='  : ':<=',
  };
  for (var j = 0; j < filterValues.length; j++) {
    var _operator = ':=';
    if (filterValues[j][2]) {
      _operator = _operators[filterValues[j][2]] || _operator;
    }
    var _value = filterValues[j][1];
    if (Array.isArray(_value)) {
      _value = '[' + _value.join(',') + ']';
    }
    _search += filterValues[j][0] + encodeURIComponent(_operator) + encodeURIComponent(_value) + encodeURIComponent('+');
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
 * @returns {Object}
 */
function createUrl (store, method, primaryKeyValue) {
  var _request = { request : '/', cache : {} };
  var _isGet   = method === 'GET';
  var _url     = store.url || store.name;

  _request.request += _url;

  if (primaryKeyValue) {
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

  _request.request += _filterValues.requiredOptions;
  _request.request += _getUrlOptionsForHTTPRequest(store, _isGet, _filterValues.optionalOptions);

  utils.merge(_request.cache, _filterValues.cache);
  return _request;
}

exports.create = createUrl;
