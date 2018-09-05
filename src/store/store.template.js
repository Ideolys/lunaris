/**
 * Replace words in given template
 * @param {Object} store
 * @param {String} method
 * @param {String} template
 * @param {Boolean} isPlural
 * @returns {String}
 */
function _replaceTemplateWords (store, method, template, isPlural) {
  return template
    .replace('$method'       , method)
    .replace('$storeName'    , store.nameTranslated || store.name)
    .replace('$pronounMale'  , isPlural ? '${thePlural}' : '${the}')
    .replace('$pronounFemale', isPlural ? '${thePlural}' : '${theFemale}')
  ;
}

/**
 * Construct error template
 * @param {Object} err
 * @param {Object} store
 * @param {String} method
 * @param {Boolean} isPlural
 * @returns {String}
 */
function getError (err, store, method, isPlural) {
  if (!store.errorTemplate) {
    return err.error + ' : ' + err.message;
  }

  var _methods = {
    GET    : '${load}',
    PUT    : '${edit}',
    POST   : '${create}',
    DELETE : '${delete}'
  };

  return _replaceTemplateWords(store, _methods[method], store.errorTemplate, isPlural);
}

/**
 * Construct validation template
 * @param {String} message
 * @param {Object} store
 * @param {String} method
 * @param {Boolean} isPlural
 * @returns {String}
 */
function getSuccess (message, store, method, isPlural) {
  if (!store.successTemplate) {
    return message;
  }

  var _methods = {
    GET    : '${loaded}',
    PUT    : '${edited}',
    POST   : '${created}',
    DELETE : '${deleted}'
  };

  return _replaceTemplateWords(store, _methods[method], store.successTemplate, isPlural);
}

exports.getSuccess = getSuccess;
exports.getError   = getError;
