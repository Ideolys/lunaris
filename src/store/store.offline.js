var utils     = require('../utils.js');
var OPERATORS = utils.OPERATORS;
var cache     = require('../cache.js');
var md5       = require('../md5.js');
var url       = require('./store.url.js');

/**
 * Delete fields
 * @param {Object} obj
 * @returns {Object}
 */
function _transformCacheData (obj, cloneFn) {
  var _clonedData = cloneFn(obj);
  delete _clonedData._id;
  delete _clonedData._version;
  delete _clonedData._rowId;
  return _clonedData;
}

/**
 * Preload
 * @param {Object} store
 * @param {Object} cache
 * @param {Object} filterValues
 * @param {Array} data
 */
function _preloadCache (store, filterValues, data) {
  var _len = data.length;
  var _cacheValues = [];
  for (var j = 0; j < _len && j < store.paginationLimit; j++) {
    _cacheValues.push(_transformCacheData(data[j], store.clone));
  }

  filterValues.cache.offset = 0;
  filterValues.cache.limit  = store.paginationLimit;

  cache.add(store.name, md5(url.createForOffline(store, filterValues)), _cacheValues);

  if (_len <= store.paginationLimit) {
    return data;
  }

  var _dataToReturn = data.slice(0, store.paginationLimit);
  _cacheValues  = [];
  var _n = 0;
  for (var i = store.paginationLimit; i < _len; i++) {
    _n++;
    _cacheValues.push(_transformCacheData(data[i], store.clone));

    if (!(_n % store.paginationLimit) || i + 1 === _len) {
      filterValues.cache.offset += store.paginationLimit;
      cache.add(store.name, md5(url.createForOffline(store, filterValues)), _cacheValues);
      _cacheValues = [];
    }

  }

  return _dataToReturn;
}

/**
 * Perform ilike operation for each given object
 * @param {*} filterValue
 * @param {*} objValue
 * @returns {Boolean}
 */
function ilike (filterValue, objValue) {
  var _document = objValue.split(' ');

  for (var j = 0; j < filterValue.length; j++) {
    var _nbSearchWordHasBeenFound = 0;
    for (var k = 0; k < filterValue[j].length; k++) {
      for (var i = 0; i < _document.length; i++) {
        var _unaccentWord = utils.unaccent(_document[i]).toLowerCase();

        if (_unaccentWord.indexOf(filterValue[j][k]) !== -1) {
          _nbSearchWordHasBeenFound++;

          if (_nbSearchWordHasBeenFound >= filterValue[j].length) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Filter data by given filter
 * @param {Function} filterFn
 * @param {Array} filter [attributeUrl, attribute, value, operator]
 * @param {Array} data
 * @param {Boolean} isRequiredFilter
 */
function _reduce (filterFn, filter, data, isRequiredFilter) {
  if ((!filterFn && filter[3] !== OPERATORS.ILIKE) || !filter) {
    return data;
  }

  var _filterValue = filter[2];

  if (filter[3] === 'ILIKE' && !isRequiredFilter) {

    if (!Array.isArray(_filterValue)) {
      _filterValue = [_filterValue];
    }

    var _searchWords = [];
    for (var k = 0; k < _filterValue.length; k++) {
      _filterValue[k] = utils.unaccent(_filterValue[k]);
      _searchWords.push(_filterValue[k].toLowerCase().split(' '));
    }

    _filterValue = _searchWords;
  }


  var _res = [];
  for (var i = 0, len = data.length; i < len; i++) {
    if (filterFn.call(null, _filterValue, data[i], ilike)) {
      _res.push(data[i]);
    }
  }

  return _res;
}

/**
 * Filter the collection
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} filterValues {
 *  isRequiredOptionsFilled    : {Boolean}
 *  constructedRequiredOptions : {String}
 *  requiredOptions            : {Object} { <source:attribute:operator> : {Array} }
 *  optionalOptions            : {Object} { <source:attribute:operator> : {Array} }
 *  cache                      : {Object}
 * }
 */
function filter (store, collection, filterValues) {
  var _data = collection.getAll(null, false, false);

  if (!filterValues || !store.filterFns) {
    return _data;
  }

  if (store.isStoreObject) {
    _data = [_data];
  }

  var _requiredFilters = Object.keys(filterValues.requiredOptions);
  for (var i = 0; i < _requiredFilters.length; i++) {
    if (store.filterFns[_requiredFilters[i]] === undefined) {
      continue;
    }

    _data = _reduce(store.filterFns[_requiredFilters[i]], filterValues.requiredOptions[_requiredFilters[i]], _data, true);
  }

  var _optionalFilters = Object.keys(filterValues.optionalOptions);
  for (i = 0; i < _optionalFilters.length; i++) {
    if (store.filterFns[_optionalFilters[i]] === undefined) {
      continue;
    }

    _data = _reduce(store.filterFns[_optionalFilters[i]], filterValues.optionalOptions[_optionalFilters[i]], _data, false);
  }

  if (store.isStoreObject) {
    _data = _data[0] || null;
    return _data;
  }

  return _preloadCache(store, filterValues, _data);
}

exports.filter = filter;
