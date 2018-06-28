exports._stores = {};
// exports.baseUrl is only designed for tests in order to perform HTTP requests
try {
  exports.baseUrl = BASE_URL;
}
catch (e) {
  exports.baseUrl = '';
}
