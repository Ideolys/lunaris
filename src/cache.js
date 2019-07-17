/**
 * The cache architecture is :
 * [
 *   {
 *     hash   : hash,
 *     values    : [values],
 *     stores : [store1, storeN]
 *   },
 *   ...
 * ]
 */

var logger             = require('./logger.js');
var localStorageDriver = require('./localStorageDriver.js');
var database           = localStorageDriver.indexedDB;
var cacheGraph         = require('./exports.js').cacheGraph;

// https://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript/14853974
Array.prototype.equals = function (array) {
  // if the other array is a falsy value, return
  if (!array) {
    return false;
  }

  // compare lengths - can save a lot of time
  if (this.length !== array.length) {
    return false;
  }

  for (var i = 0, l = this.length; i < l; i++) {
    // Check if we have nested arrays
    if (this[i] instanceof Array && array[i] instanceof Array) {
      // recurse into the nested arrays
      if (!this[i].equals(array[i])) {
        return false;
      }
    }
    else if (this[i] !== array[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false;
    }
  }
  return true;
};

var cache = [];

/**
 * @param {String} store
 * @param {String} hash route hashed
 * @param {Array} values [int]
 */
function _getOrUpdatevalues (store, hash, values) {
  var _cacheValue = null;
  for (var i = 0; i < cache.length; i++) {
    var _isFilterMatchValue = false;

    if (cache[i].hash === hash) {
      _isFilterMatchValue = true;
      _cacheValue = cache[i];
      break;
    }
  }

  if (_isFilterMatchValue && !values) {
    return _cacheValue.values;
  }
  if (_isFilterMatchValue && values) {
    if (_cacheValue.stores.indexOf(store) === -1) {
      _cacheValue.stores.push(store);
      database.upsert('cache', _cacheValue);
    }

    return _cacheValue.values = values;
  }

  return _cacheValue;
}

/**
 * Invalidate a store's cache
 */
function _internalInvalidate (store) {
  for (var i = cache.length - 1; i >= 0; i--) {
    if (cache[i].stores.indexOf(store) !== -1) {
      database.del('cache', cache[i].hash);
      cache.splice(i, 1);
    }
  }
}

/**
 * Cache object
 * @return {Object}
 */
module.exports = {

  /**
   * Init cache values from browser db
   * @param {Function} callback
   */
  init : function (callback) {
    database.getAll('cache', function (err, res) {
      if (err) {
        logger.warn('Error when init cache', err);
      }

      cache = res || [];
      callback();
    });
  },

  /**
   * Add values to cache
   * @param {String} store
   * @param {String} hash route hashed
   * @param {Array} values [object]
   */
  add : function (store, hash, values) {
    var _res = _getOrUpdatevalues(store, hash, values);

    if (!_res) {
      var _caheObj = {
        hash   : hash,
        values : values,
        stores : [store]
      };

      cache.push(_caheObj);
      database.upsert('cache', _caheObj);
    }
  },

  get : _getOrUpdatevalues,

  /**
   * Invalidate one or many values for a store
   * @param {String} store
   */
  invalidate : function invalidate (store) {
    _internalInvalidate(store);
    var _aliasStores = cacheGraph[store];

    if (!_aliasStores) {
      return;
    }

    for (var i = 0; i < _aliasStores.length; i++) {
      _internalInvalidate(_aliasStores[i]);
    }
  },

  /**
   * Clear cache values
   */
  clear : function () {
    database.clear('cache');
    cache = [];
  },

  /**
   * Return cache values. Uniquely for tests purposes
   */
  _cache : function () {
    return cache;
  }
};
