var indexedDB = require('./localStorageDriver.js').indexedDB;
var urlsGraph = require('./exports.js').urlsGraph;
var cache     = require('./cache.js');
var store     = require('./store/store.js');
var logger    = require('./logger.js');
var offline   = require('./offline.js');

var clientLightUrlInvalidations = {};
var events                      = {};
var INVALIDATE_EVENTS           = {
  INVALIDATE : 'invalidate'
};

/**
 * Add invalidation in cache
 * @param {String} url ex: 'GET /all'
 */
function addInvalidation (url) {
  var dateInvalidations            = Date.now();
  clientLightUrlInvalidations[url] = dateInvalidations;
  indexedDB.upsert('_invalidations', { url : url, date : dateInvalidations });
}

/**
 * Invalidate a store from the cache or an URL
 * @param {String} storeOrUrl ex: 'store1' or 'GET /all/#'
 */
module.exports = {

  invalidations : clientLightUrlInvalidations,

  /**
   * Init previous invalidations
   * @param {Function} callback
   */
  init : function (callback) {
    indexedDB.getAll('_invalidations', function (err, res) {
      if (err) {
        return callback();
      }

      for (var i = 0; i < res.length; i++) {
        clientLightUrlInvalidations[res[i].url] = res[i].date;
      }

      callback();
    });
  },

  /**
   * Invalidate a store or a group of store by light URL
   * If online mode and not synchronizing, we will not store the invalidation
   * @param {String} storeOrUrl
   */
  invalidate : function invalidate (storeOrUrl) {
    // Invalidate url
    if (/^GET\s/.test(storeOrUrl)) {
      if (!urlsGraph[storeOrUrl]) {
        return;
      }

      // If we are offline (ie in offline-online mode)
      if (offline.isOfflineMode && !offline.isSynchronizing) {
        if (events[INVALIDATE_EVENTS.INVALIDATE]) {
          events[INVALIDATE_EVENTS.INVALIDATE](storeOrUrl);
        }
        return;
      }

      addInvalidation(storeOrUrl);

      for (var i = 0, len = urlsGraph[storeOrUrl].length; i < len; i++) {
        logger.info('[Invalidate] ' + storeOrUrl + ' -> @' + urlsGraph[storeOrUrl][i]);
        store.clear('@' + urlsGraph[storeOrUrl][i]);
      }

      return;
    }

    cache.invalidate(storeOrUrl);
  },

  /**
   * Compute invalidations between server and client at websocket connection
   * @param {Object} lightUrlInvalidations { lightUrl : timestamp }, invalidations from the server
   */
  computeInvalidations : function (lightUrlInvalidations, stores) {
    var _storesToDeleteStates = [];
    var _invalidations        = [];

    function searchAndRemove (url) {
      if (!urlsGraph[url]) {
        return;
      }

      var dateInvalidations            = Date.now();
      clientLightUrlInvalidations[url] = dateInvalidations;
      _invalidations.push({ url : url, date : dateInvalidations });

      for (var i = 0, len = urlsGraph[url].length; i < len; i++) {
        var index = stores.indexOf(urlsGraph[url][i]);
        if (index === -1) {
          continue;
        }

        store.clear('@' + stores[index]);
        stores.splice(index, 1);
      }
    }

    for (var url in urlsGraph) {
      if (!lightUrlInvalidations[url] && clientLightUrlInvalidations[url]) {
        continue;
      }

      if (lightUrlInvalidations[url] && !clientLightUrlInvalidations[url]) {
        searchAndRemove(url);
        continue;
      }

      if (clientLightUrlInvalidations[url] < lightUrlInvalidations[url]) {
        searchAndRemove(url);
      }
    }

    /**
     * Push multiple invalidations at the same time
     * Better performance for browser than n transactions
     */
    if (_storesToDeleteStates.length) {
      indexedDB.del('_states', _storesToDeleteStates);
    }
    if (_invalidations.length) {
      indexedDB.upsert('_invalidations', _invalidations);
    }
  },

  /**
   * Set event handler
   * @param {String} event
   * @param {Function} handler
   */
  on : function (event, handler) {
    events[event] = handler;
  }
};
