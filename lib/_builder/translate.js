const path = require('path');

/**
 *
 * @param {String} lang fr, en, ...
 * @param {String} text
 * @param {Boolean} isTranslated  translate or not
 * @param {*} callback
 */
function translate(langFolder, lang, text, isTranslated = false) {
  var _langFile;

  if (isTranslated) {
    return text;
  }

  try{
    var _langPath = path.join(langFolder, lang + '.json');
    _langFile     = require(_langPath);
  }
  catch (e) {
    _langFile = {};
  }

  return text.replace(/\$\{([^\}]+)\}/g, function (str, expression){
    var _expression = expression.replace("\\'", "'");
    if(typeof _langFile[expression] === 'string' && _langFile[expression].replace(/ /g, '') !== ''){
      return _langFile[expression].replace(/'/g, '&rsquo;')
        .replace(/\\"/g, '&quot;');
    }
    else if(typeof _langFile[_expression] === 'string' && _langFile[_expression].replace(/ /g, '') !== ''){
      return _langFile[_expression].replace(/'/g, '&rsquo;')
        .replace(/\\"/g, '&quot;');
    }
    else{
      return expression;
    }
  });
}

module.exports = translate;
