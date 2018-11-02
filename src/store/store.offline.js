var utils          = require('../utils.js');
var lunarisExports = require('../exports.js');
var stopwords      = lunarisExports.stopwords;
var OPERATORS      = utils.OPERATORS;

/**
 * Preload
 * @param {Object} store
 * @param {Object} cache
 * @param {Object} cacheFilter
 * @param {Array} data
 */
function _preloadCache (store, cache, cacheFilter, data) {
  var _len = data.length;
  if (_len <= store.paginationLimit) {
    return data;
  }

  var _dataToReturn = data.slice(0, store.paginationLimit);
  var _ids          = [];
  for (var i = store.paginationLimit; i < _len; i++) {
    _ids.push(data[i]._id);

    if (i % store.paginationLimit) {
      cacheFilter.offset += store.paginationLimit;
      cache.add(utils.clone(cacheFilter), _ids);
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
  if (!Array.isArray(filterValue)) {
    filterValue = [filterValue];
  }

  for (var k = 0; k < filterValue.length; k++) {
    var _searchWords              = filterValue[k].split(' ');
    var _document                 = objValue.split(' ');
    var _nbSearchWordHasBeenFound = 0;

    for (var i = 0; i < stopwords.length; i++) {
      for (var j = 0; j < _searchWords.length; j++) {
        if (stopwords[i] === _searchWords[j]) {
          _searchWords.splice(j, 1);
        }
      }
    }

    for (j = 0; j < _searchWords.length; j++) {
      for (i = 0; i < _document.length; i++) {
        if (stopwords.indexOf(_document[i]) === -1) {
          if (utils.distance(_document[i], _searchWords[j]) > 0.5) {
            _nbSearchWordHasBeenFound++;
          }
        }
      }
    }

    if (_nbSearchWordHasBeenFound === _searchWords.length) {
      return true;
    }
  }

  return false;
}

/**
 * Filter data by given filter
 * @param {Function} filterFn
 * @param {Array} filter [attribute, value, operator]
 * @param {Array} data
 */
function _reduce (filterFn, filter, data) {
  if ((!filterFn && filter[2] !== OPERATORS.ILIKE) || !filter) {
    return;
  }

  for (var i = data.length - 1; i >= 0; i--) {
    if (!filterFn.call(null, filter[1], data[i], ilike)) {
      data.splice(i, 1);
    }
  }
}

/**
 * Filter the collection
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} cache
 * @param {Object} filterValues {
 *  isRequiredOptionsFilled    : {Boolean}
 *  constructedRequiredOptions : {String}
 *  requiredOptions            : {Object} { <source:attribute:operator> : {Array} }
 *  optionalOptions            : {Object} { <source:attribute:operator> : {Array} }
 *  cache                      : {Object}
 * }
 */
function filter (store, collection, cache, filterValues) {
  var _data = collection.getAll();

  if (!filterValues) {
    return _data;
  }

  if (store.isStoreObject) {
    _data = [_data];
  }


  var _requiredFilters = Object.keys(filterValues.requiredOptions);
  for (var i = 0; i < _requiredFilters.length; i++) {
    _reduce(store.filterFns[_requiredFilters[i]], filterValues.requiredOptions[_requiredFilters[i]], _data);
  }

  var _optionalFilters = Object.keys(filterValues.optionalOptions);
  for (i = 0; i < _optionalFilters.length; i++) {
    _reduce(store.filterFns[_optionalFilters[i]], filterValues.optionalOptions[_optionalFilters[i]], _data);
  }

  if (store.isStoreObject) {
    _data = _data[0] || null;
    return _data;
  }

  return _preloadCache(store, cache, filterValues.cache, _data);
}

exports.filter = filter;
