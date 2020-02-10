exports._stores = {};

// exports.baseUrl is only designed for tests in order to perform HTTP requests
try {
  exports.baseUrl = BASE_URL;
}
catch (e) {
  exports.baseUrl = '';
}

// is production :  display or not error message in the console
try {
  exports.isProduction = IS_PRODUCTION;
}
catch (e) {
  exports.isProduction = true;
}

/**
 * Store dependencies
 * Filter to store
 * {
 *   store       : ['store_dep_1', 'store_dep_2']
 *   store_dep_1 : ['store_dep_3'],
 *   store_dep_2 : [],
 *   store_dep_3 : []
 * }
 */
try {
  exports.storeDependencies = STORE_DEPENDENCIES;
}
catch (e) {
  exports.storeDependencies = '';
}

/**
 * Lunaris external constants object
 * Injected at build time
 */
try {
  exports.constants = CONSTANTS;
}
catch (e) {
  exports.constants = {};
}


/**
 * Set env browser
 */
try {
  exports.isBrowser = IS_BROWSER;
}
catch (e) {
  exports.isBrowser = true;
}

/**
 * Urls grpah
 * {
 *   'GET /all'          : ['store_1', 'store_2'],
 *   'GET /all/filter/#' : ['store_1'],
 *   'GET /only          : ['store_3']
 * }
 */
try {
  exports.urlsGraph = URLS_GRAPH;
}
catch (e) {
  exports.urlsGraph = {};
}


/**
 * cache grpah
 * {
 *   'store_1' : ['store_2'],
 *   'store_2' : ['store_1'],
 *   'store_3' : []
 * }
 */
try {
  exports.cacheGraph = CACHE_GRAPH;
}
catch (e) {
  exports.cacheGraph = {};
}

try {
  exports.isOfflineStrategies = IS_OFFLINE_STRATEGIES;
}
catch (e) {
  exports.isOfflineStrategies = [];
}

try {
  exports.isOfflineSync = IS_OFFLINE_SYNC;
}
catch (e) {
  exports.isOfflineSync = [];
}

try {
  exports.version = VERSION;
}
catch (e) {
  exports.version = [];
}
