var utils          = require('../utils.js');
var lunarisExports = require('../exports.js');
var stopwords      = lunarisExports.stopwords;
var OPERATORS      = utils.OPERATORS;
var cache          = require('../cache.js');
var md5            = require('../md5.js');
var url            = require('./store.url.js');

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
    delete data[j]._id;
    delete data[j]._version;
    delete data[j]._rowId;
    _cacheValues.push(data[j]);
  }
  cache.add(store.name, md5(url.createForOffline(store, filterValues)), _cacheValues);

  if (_len <= store.paginationLimit) {
    return data;
  }

  var _dataToReturn = data.slice(0, store.paginationLimit);
  _cacheValues  = [];
  for (var i = store.paginationLimit; i < _len; i++) {
    delete data[i]._id;
    delete data[i]._version;
    delete data[i]._rowId;
    _cacheValues.push(data[i]);

    if (i % store.paginationLimit || i + 1 === _len) {
      filterValues.cache.offset += store.paginationLimit;
      cache.add(store.name, md5(url.createForOffline(store, filterValues)), _cacheValues);
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
 * @param {Object} filterValues {
 *  isRequiredOptionsFilled    : {Boolean}
 *  constructedRequiredOptions : {String}
 *  requiredOptions            : {Object} { <source:attribute:operator> : {Array} }
 *  optionalOptions            : {Object} { <source:attribute:operator> : {Array} }
 *  cache                      : {Object}
 * }
 */
function filter (store, collection, filterValues) {
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

  return _preloadCache(store, filterValues, _data);
}

exports.filter = filter;
