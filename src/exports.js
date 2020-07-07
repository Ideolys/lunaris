exports._stores = {};
// exports.baseUrl is only designed for tests in order to perform HTTP requests
exports.baseUrl = '';

// is production :  display or not error message in the console
exports.isProduction = true;

/**
 * Lunaris external constants object
 * Injected at build time
 */
exports.constants = {};
/**
 * Set env browser
 */
exports.isBrowser = true;
/**
 * Urls grpah
 * {
 *   'GET /all'          : ['store_1', 'store_2'],
 *   'GET /all/filter/#' : ['store_1'],
 *   'GET /only          : ['store_3']
 * }
 */
exports.urlsGraph = {};
/**
 * cache grpah
 * {
 *   'store_1' : ['store_2'],
 *   'store_2' : ['store_1'],
 *   'store_3' : []
 * }
 */
exports.cacheGraph          = {};
exports.isOfflineStrategies = false;
exports.version             = '';

/**
 * Set options
 */
exports.setOptions = function (options) {
  for (option in options) {
    exports[option] = options[option];
  }
}
