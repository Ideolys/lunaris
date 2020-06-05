const fs       = require('fs');
const path     = require('path');
const compiler = require('./_builder/compiler').compiler;
const graph    = require('./_builder/graph');
const Terser   = require("terser");

/**
 * Remove specific characters to create a variable
 * @param {String} path
 */
function _sanitizePath (str) {
  return str
    .replace(path.join(__dirname, '..', 'src'), '')
    .replace(/\//g, '_')
    .replace(/\\/g, '_')
    .replace(/-/g , '_')
    .replace(/\./g, '_');
}

/**
 * Build code
 * Set imports and exports for each module
 * @param {Array} modules
 * @param {Array} sort
 */
function _buildCode (modules, sort) {
  var _code = '';

  for (var i = 0; i < sort.length; i++) {
    var _importsToInject = [];
    var _imports         = modules[sort[i]].imports;
    var _importsKeys     = Object.keys(modules[sort[i]].imports);

    for (var j = 0; j < _importsKeys.length; j++) {
      var _val = _sanitizePath(_imports[_importsKeys[j]]);
      _importsToInject.push(_val);
    }

    var _moduleCode = `
      var ${ _sanitizePath(sort[i]) } = (function(imports, exports) {
        ${ modules[sort[i]].code }
        ${ modules[sort[i]].isMultipleExports ? '\nlunaris.utils.merge(exports, exports[' + modules[sort[i]].index + ']);' : '' }
        return exports;
      })([${ _importsToInject.join(',') }], {});
    `;

    _code += _moduleCode;
  }

  return _code;
}

/**
 * Build Lunaris code
 * @param {Function} callback
 */
function _buildLunaris (callback) {
  var _path = path.join(__dirname, '..', 'src', 'index.js');

  fs.readFile(_path, 'utf-8', (err, file) => {
    if (err) {
      return callback(err, '');
    }

    compiler(_path, file, { isNotVue : false }, (err, res) => {
      if (err) {
        return callback(err);
      }

      var _objToBuild    = {};
      _objToBuild[_path] = res;

      var _graphInfos = graph(_objToBuild);

      let _code = `
        /* Lunaris */
        (function (global) {
          ${ _buildCode(_graphInfos.flattenedObjects, _graphInfos.order) }
          global.lunaris = ${ _sanitizePath(_path) };
        })(typeof(module)!=='undefined'?global:this);
      `;

      callback(err, _code);
    });
  });
}

_buildLunaris((err, code) =>{
  if (err) {
    return console.log(err);
  }

  fs.writeFileSync(path.join(__dirname, '..', 'dist', 'lunaris.js'), code);
  let minifyCode = Terser.minify(code, { mangle : false }).code;
  fs.writeFileSync(path.join(__dirname, '..', 'dist', 'lunaris.min.js'), minifyCode);

  console.group('Compilation');
  console.log('lunaris.js', (Buffer.byteLength(code) / 1024).toFixed(2), 'ko');
  console.log('lunaris.min.js', (Buffer.byteLength(minifyCode) / 1024).toFixed(2), 'ko');
  console.groupEnd('Compilation');
});
