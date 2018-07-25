const path = require('path');

const exportRE        = /(exports\..*)\s+=/;
const moduleExportsRE = /(module\.exports.*)\s+=/;
const importRE        = /(require\(\s*['"]+([a-zA-Z0-9\.\/_-]*)['"]+\s*\));?/

/**
 * Profile imports/exports
 * @param {String} id id for the code : path to the file.
 * @param {String} code
 */
function profile (id, code) {
  var _imports = [];
  var _exports = {};

  var _importCounter = 0;

  var _match;
  // Imports
  while (_match = importRE.exec(code)) {
    var _key                 = 'imports[' + _importCounter + ']';
    _imports[_importCounter] = path.join(path.dirname(id), _match[2]);

    code = code.replace(_match[1], _key);
    _importCounter++;
  }

  // default exports
  while (_match = exportRE.exec(code)) {
    var _export       = _match[1].split('.')[1]
    var _key          = 'exports[\'' + _export.trim() + '\']';
    _exports[_export] = _match[1];

    code = code.replace(_match[1], _key);
  }

  while (_match = moduleExportsRE.exec(code)) {
    var _key = 'exports';
    _exports = _match[1];

    code = code.replace(_match[1], _key);
  }

  return {
    code    : code,
    imports : _imports,
    exports : _exports
  };
}

module.exports = profile;
