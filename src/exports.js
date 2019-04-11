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
 * Set stopwords value
 */
try {
  exports.stopwords = STOPWORDS;
}
catch (e) {
  exports.stopwords = [];
}

try {
  exports.compilationErrors = COMPILATION_ERRORS;
}
catch (e) {
  exports.compilationErrors = [];
}
