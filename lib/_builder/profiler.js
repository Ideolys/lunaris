const path = require('path');

const exportRE = /(exports\..*)\s+=/;
const importRE = /(require\(['"]+([a-zA-Z0-9\.\/_-]*)['"]+\));?/

/**
 * Profile imports/exports
 * @param {String} id id for the code : path to the file.
 * @param {String} code
 */
function profile (id, code) {
  var _id = id
            .replace(/\//g, '_')
            .replace(/\\/g, '_')
            .replace(/-/g, '_')
            .replace(/\./g, '_');

  var _imports = {};
  var _exports = {};
  var _resolve = [];

  var _importCounter = 0;
  var _exportCounter = 0;

  var _match;
  // Imports
  while (_match = importRE.exec(code)) {
    var _key       = _id + '____import_' + _importCounter;
    _imports[_key] = path.join(path.dirname(id), _match[2]);

    code = code.replace(_match[1], _key);
    _importCounter++;
  }

  // default exports
  while (_match = exportRE.exec(code)) {
    var _key = _id + '____export_' + _exportCounter;
    _exports[_key] = _match[1];

    code = code.replace(_match[1], 'var ' + _key);
    _exportCounter++;
  }

  return {
    code    : code,
    imports : _imports,
    exports : _exports
  }
}

module.exports = profile;
