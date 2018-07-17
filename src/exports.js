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
