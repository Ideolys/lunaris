const path = require('path');

const exportRE        = /(exports\..*)\s+=/;
const moduleExportsRE = /(module\.exports.*)\s+=/;
const importRE        = /(require\(\s*['"]+([a-zA-Z0-9\.\/_-]*)['"]+\s*\));?/;
const moduleName      = /name\s+:\s+(['"])(.*)\1/;

/**
 * Profile imports/exports
 * @param {String} id id for the code : path to the file.
 * @param {String} code
 */
function profile (id, code) {
  var _imports = [];
  var _exports = {};

  var _importCounter = 0;

  var _match = importRE.exec(code);
  // Imports
  while (_match) {
    var _key                 = 'lu_i[' + _importCounter + ']';
    _imports[_importCounter] = path.join(path.dirname(id), _match[2]);

    code = code.replace(_match[1], _key);
    _importCounter++;
    _match = importRE.exec(code);
  }

  // default exports
  _match = exportRE.exec(code);
  while (_match) {
    var _export = _match[1].split('.')[1];
    _key        = 'lu_e[\'' + _export.trim() + '\']';
    _exports[_export] = _match[1];

    code = code.replace(_match[1], _key);
    _match = exportRE.exec(code);
  }

  _match = moduleExportsRE.exec(code);
  while (_match) {
    _key = 'lu_e';
    _exports = _match[1];

    code = code.replace(_match[1], _key);
    _match = moduleExportsRE.exec(code);
  }

  // Module name
  var _name = null;
  _name     = moduleName.exec(code);
  if (_name) {
    _name = _name[2];
  }
  else {
    _name = id;
  }

  return {
    name    : _name,
    code    : code,
    imports : _imports,
    exports : _exports
  };
}

module.exports = profile;
