const path = require('path');

/**
 *
 * @param {String} lang fr, en, ...
 * @param {String} text
 * @param {Boolean} isTranslated  translate or not
 * @param {Boolean} isHTML whenever to
 * @param {*} callback
 */
function translate (langFolder, lang, text, isTranslated = false, isHTML = false) {
  var _langFile;

  if (isTranslated) {
    return text;
  }

  try {
    var _langPath = path.join(langFolder, lang + '.json');
    _langFile     = require(_langPath);
  }
  catch (e) {
    _langFile = {};
  }

  return text.replace(/\$\{([^}]+)\}/g, function (str, expression) {
    var _expression = expression.replace(/\\'/g, "'");
    if (typeof _langFile[expression] === 'string' && _langFile[expression].replace(/ /g, '') !== '') {
      if (!isHTML) {
        return _langFile[expression].replace(/'/g, '\\\'').replace(/\\"/g, '&quot;');
      }
      return _langFile[expression].replace(/\\"/g, '&quot;');
    }
    else if (typeof _langFile[_expression] === 'string' && _langFile[_expression].replace(/ /g, '') !== '') {
      if (!isHTML) {
        return _langFile[_expression].replace(/'/g, '&rsquo;').replace(/\\"/g, '&quot;');
      }
      return _langFile[_expression].replace(/\\"/g, '&quot;');
    }
    else {
      return expression;
    }
  });
}

module.exports = translate;
