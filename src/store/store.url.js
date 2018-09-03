var storeUtils = require('./store.utils.js');

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
    if (!_filter.source) {
      throw new Error('A filter must have a source defined as : filter.source = @<store>');
    }
    if (!_filter.sourceAttribute) {
      throw new Error('A filter must have a source attribute defined as : filter.sourceAttribute = <attribute>');
    }
    if (!_filter.localAttribute) {
      throw new Error('A filter must have a local attribute defined as : filter.localAttribute = <attribute>');
    }

    var _sourceStore = storeUtils.getStore(_filter.source);
    var _sourceValue = storeUtils.getCollection(_sourceStore).getFirst();
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

  var _filterValues  = _getFilterValuesHTTPRequest(store, method);

  if (!_filterValues.isRequiredOptionsFilled) {
    return null;
  }

  _request.request += _filterValues.requiredOptions;
  _request.request += _getUrlOptionsForHTTPRequest(store, _isGet, _filterValues.optionalOptions);

  if (_isGet) {
    _filterValues.cache['limit']  = store.paginationLimit;
    _filterValues.cache['offset'] = store.paginationOffset;
  }

  _request.cache = _filterValues.cache;
  return _request;
}

exports.create = createUrl;
