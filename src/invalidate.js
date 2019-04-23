var indexedDB = require('./localStorageDriver.js').indexedDB;
var urlsGraph = require('./exports.js').urlsGraph;
var cache     = require('./cache.js');

/**
 * Invalidate a store from the cache or an URL
 * @param {String} storeOrUrl ex: 'store1' or 'GET /all/#'
 */
module.exports = function invalidate (storeOrUrl) {
  // Invalidate url
  if (/^GET\s/.test(storeOrUrl)) {
    if (!urlsGraph[storeOrUrl]) {
      return;
    }

    for (var i = 0, len = urlsGraph[storeOrUrl].length; i < len; i++) {
      indexedDB.clear(urlsGraph[storeOrUrl][i]);
      cache.invalidate(urlsGraph[storeOrUrl][i]);
    }

    return;
  }

  cache.invalidate(storeOrUrl);
};
