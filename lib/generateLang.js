const fs      = require('fs');
const path    = require('path');
const builder = require('./builder');

/**
 * Generate a file lang
 * @param {Object} options see builder options
 */
function generate (options, callback) {

  options.isLangGeneration = true;

  builder.build(options, (err, code) => {
    var langFile   = null;
    var langObj    = {};
    var langObjOld = {};

    if (err) {
      if (callback) return callback(err);
      return console.log(err);
    }

    try {
      langFile = require(path.join(options.langPath, options.lang));
    }
    catch (e) {
      langFile = {};
    }

    var _items            = [];
    var _itemsToTranslate = code.match(/\$\{([^}]+)\}/g);

    if (_itemsToTranslate !== null) {
      _itemsToTranslate.forEach(value => {
        value = value.replace(/\$\{(.+)\}/g, '$1');
        _items.push(value);
      });
    }

    _items.sort((a, b) => {
      var _a = String(a).toLowerCase();
      var _b = String(b).toLowerCase();
      // if strings are the same wathever the case is, order them constantly
      if (_a === _b) {
        _a = String(a);
        _b = String(b);
      }
      if (_a < _b) {
        return -1;
      }

      if (_a > _b) {
        return  1;
      }

      return 0;
    });

    for (var i = 0; i < _items.length; i++) {
      if (langFile[_items[i]] === undefined || langFile[_items[i]] === '') {
        langObj[_items[i]] = '';
      }
      else {
        langObjOld[_items[i]] = langFile[_items[i]];
      }
    }

    for (var _i in langObjOld) {
      if (langObjOld[_i] !== undefined) {
        langObj[_i] = langObjOld[_i];
      }
    }

    var _langJSON = JSON.stringify(langObj, null, 2) + '\n';
    fs.writeFileSync(path.join(options.langPath, options.lang + '.json'), _langJSON, 'utf8');

    if (callback) {
      return callback();
    }
  });
}

module.exports = generate;

