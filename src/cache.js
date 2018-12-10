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
    }

    return _cacheValue.values = values;
  }

  return _cacheValue;
}


/**
 * Cache object
 * @return {Object}
 */
module.exports = {

  /**
   * Add values to cache
   * @param {String} store
   * @param {String} hash route hashed
   * @param {Array} values [object]
   */
  add : function (store, hash, values) {
    var _res = _getOrUpdatevalues(store, hash, values);

    if (!_res) {
      cache.push({
        hash   : hash,
        values : values,
        stores : [store]
      });
    }
  },

  get : _getOrUpdatevalues,

  /**
   * Invalidate one or many values for a store
   * @param {String} store
   */
  invalidate : function invalidate (store) {
    for (var i = cache.length - 1; i >= 0; i--) {
      if (cache[i].stores.indexOf(store) !== -1) {
        cache.splice(i, 1);
      }
    }
  },

  /**
   * Clear cache values
   */
  clear : function () {
    cache = [];
  },

  /**
   * Return cache values. Uniquely for tests purposes
   */
  _cache : function () {
    return cache;
  }
};
