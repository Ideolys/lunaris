/**
 * The cache architecture is :
 * [
 *   [ { filter : valueFilter, ... }, [ids] ]
 *   ...
 * ]
 */

/**
 * Cache object
 * @return {Object}
 */
function cache () {
  var _cache = [];

  /**
   * Get or update cached ids
   * @param {Array} filterValues
   * @param {Boolean} isUpdate  default false
   */
  function _getOrUpdateIds (filterValues, ids) {
    var _res                 = [];
    var _reducedCachedValues = [];
    var _filterValueKeys     = Object.keys(filterValues);

    // Reduce cache values
    for (var i = 0; i < _cache.length; i++) {
      var _cachedFilters = _cache[i][0];
      if (Object.keys(_cachedFilters).length === _filterValueKeys.length) {
        _reducedCachedValues.push(_cache[i]);
      }
    }

    for (i = 0; i < _reducedCachedValues.length; i++) {
      _cachedFilters = _reducedCachedValues[i][0];
      var _isFilterMatchValue = false;
      for (var k = 0; k < _filterValueKeys.length; k ++) {
        var _filter = _cachedFilters[_filterValueKeys[k]];
        // The current reducedCacheValues is not correct
        if (_filter === undefined) {
          _isFilterMatchValue = false;
          break;
        }
        if (_filter === filterValues[_filterValueKeys[k]]) {
          _isFilterMatchValue = true;
        }
        else {
          _isFilterMatchValue = false;
          break;
        }
      }

      if (_isFilterMatchValue && !ids) {
        return _reducedCachedValues[i][1];
      }
      if (_isFilterMatchValue && ids) {
        return _reducedCachedValues[i][1] = ids;
      }
    }

    return _res;
  }

  return {

    /**
     * Add values to cache
     * @param {Array} filterValues [{ nameFilter : valueFilter}]
     * @param {Array} ids [int]
     */
    add : function (filterValues, ids) {
      if (Object.keys(filterValues).length === 0) {
        return;
      }

      var _res = _getOrUpdateIds(filterValues, ids);

      if (!_res.length) {
        _cache.push([filterValues, ids]);
      }
    },

    get : _getOrUpdateIds,

    /**
     * Invalidate one or many ids from cache
     * @param {Array/Int} ids
     * @param {Boolean} isAllFilterValuesDelete when ever to delete all filter values if ids is found
     */
    invalidate : function invalidate (ids, isAllFilterValuesDelete) {
      if (!Array.isArray(ids)) {
        ids = [ids];
      }

      for (var i = _cache.length - 1; i >= 0; i--) {
        var _ids = _cache[i][1];
        for (var j = _ids.length - 1; j >= 0; j--) {
          if (ids.indexOf(_ids[j]) !== -1) {
            _ids.splice(j, 1);
            if (isAllFilterValuesDelete) {
              _cache.splice(i, 1);
              break;
            }
          }
        }

        // no more value into cache
        if (!_ids.length) {
          _cache.splice(i, 1);
        }
      }
    },

    /**
     * Clear cache values
     */
    clear : function () {
      _cache = [];
    },

    /**
     * Return cache values. Uniquely for tests purposes
     */
    _cache : function () {
      return _cache;
    }
  };
}

/**
 * Init cache object
 * @param {Object} store
 */
function _initCache (store) {
  return store.cache = cache();
}

/**
 * Get cache object
 * @param {Object} store
 * @returns {Object}
 */
function getCache (store) {
  if (!store.cache) {
    return _initCache(store);
  }

  return store.cache;
}

exports.getCache = getCache;