var indexedDB   = require('./localStorageDriver.js').indexedDB;
var urlsGraph   = require('./exports.js').urlsGraph;
var cache       = require('./cache.js');
var store       = require('./store/store.js');
var transaction = require('./store/store.transaction.js');

var clientLightUrlInvalidations = {};

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
   * @param {String} storeOrUrl
   */
  invalidate : function invalidate (storeOrUrl) {
    // Invalidate url
    if (/^GET\s/.test(storeOrUrl)) {
      if (!urlsGraph[storeOrUrl]) {
        return;
      }

      var dateInvalidations                   = Date.now();
      clientLightUrlInvalidations[storeOrUrl] = dateInvalidations;
      indexedDB.add('_invalidations', { url : storeOrUrl, date : dateInvalidations });

      for (var i = 0, len = urlsGraph[storeOrUrl].length; i < len; i++) {
        console.log('[Invalidate] ' + storeOrUrl + ' -> ' + urlsGraph[storeOrUrl][i]);
        indexedDB.clear(urlsGraph[storeOrUrl][i]);
        indexedDB.del('_states', urlsGraph[storeOrUrl][i]);
        store.clear('@' + urlsGraph[storeOrUrl][i]);
      }

      return;
    }

    cache.invalidate(storeOrUrl);
  },

  /**
   * Compute invalidations from server
   * @param {Object} lightUrlInvalidations { lightUrl : timestamp }
   */
  computeInvalidations : function (lightUrlInvalidations) {
    transaction.begin();
    for (var url in urlsGraph) {
      if (!lightUrlInvalidations[url] && !clientLightUrlInvalidations[url]) {
        this.invalidate(url);
      }

      if (!lightUrlInvalidations[url] && clientLightUrlInvalidations[url]) {
        this.invalidate(url);
        continue;
      }

      if (lightUrlInvalidations[url] && !clientLightUrlInvalidations[url]) {
        continue;
      }

      if (clientLightUrlInvalidations[url] < lightUrlInvalidations[url]) {
        this.invalidate(url);
      }
    }

    transaction.commit();
  }
};
