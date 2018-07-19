var collection = require('./collection.js');

exports._stores = {
  lunarisErrors : {
    name                  : 'lunarisErrors',
    data                  : collection.collection(),
    data_filtered         : collection.collection(),
    filters               : [],
    paginationLimit       : 50,
    paginationOffset      : 0,
    paginationCurrentPage : 1,
    hooks                 : {},
    nameTranslated        : '${store.lunarisErrors}',
    isLocal               : true
  }
};
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
