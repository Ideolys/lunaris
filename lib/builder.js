const fs        = require('fs');
const path      = require('path');
const transpile = require('vue-template-es2015-compiler');
const compiler  = require('./_builder/compiler').compiler;
const profiler  = require('./_builder/profiler');
const translate = require('./_builder/translate');
const graph     = require('./_builder/graph');

const vuejsIndex        = fs.readFileSync(path.join(__dirname, '_builder', 'index.js')).toString();
const dependenciesCache = {};

const options = {
  modulesFolder               : null,  // where are modules ?
  vuejsGlobalComponentsFolder : null,  // where are vuejs global components ?
  profile                     : {},    // profile object
  isProduction                : false, // is prodution build ?
  langPath                    : null,  // where are lang files ?
  lang                        : null,  // fr, es, nl, ...
  isLangGeneration            : false, // is builder required to generate lang file
  startLink                   : '/'    // from where to launch the app
};

/**
 * Get all vuejs global components
 * @param {String} dir
 * @param {Function} done err, globalComponents -> [pathToComp1, pathToComp2, ..., pathToCompN]
 */
function walkVuejsGlobalComponents (dir, done) {
  var _results = [];
  fs.readdir(dir, function(err, list) {
    if (err) {
      return done(err);
    }

    var i = 0;
    function next() {
      var _file = list[i++];
      if (!_file) {
        return done(null, _results);
      }

      _file = dir + '/' + _file;
      fs.stat(_file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          return walkVuejsGlobalComponents(_file, function(err, res) {
            _results = _results.concat(res);
            next();
          });
        }

        if(_file.substring(_file.length - 3, _file.length) === '.js'){
          _results.push(_file);
        }
        else if(_file.substring(_file.length - 4, _file.length) === '.vue'){
          _results.push(_file);
        }

        next();
      });
    }

    next();
  });
};
/**
 * Get all modules
 * @param {String} dir
 * @param {Function} done err, modules -> [[ path, routes.json file content ], ...]
 */
function walkModules (dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) {
      return done(err);
    }

    var i = 0;
    function next() {
      var file = list[i++];
      if (!file) {
        return done(null, results);
      }

      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          var _path = path.join(file, 'routes.json');
          if (fs.existsSync(_path)) {
            var _routes = fs.readFileSync(_path);
            results.push([file, JSON.parse(_routes)]);
          }
        }

        next();
      });
    }

    next();
  });
};

/**
 * Is process module needs to be include in the build
 * @param {Object} profile
 * @param {String} module
 * @return {Boolean}
 */
function _isModuleAuthorized (profile, module) {
  var _allowedModules = profile.modules || [];
  var _module         = module.replace(path.dirname(module) + '/', '');
  for (var i = 0; i < _allowedModules.length; i++) {
    if (_allowedModules[i] === _module) {
      return 1;
    }
  }
  return 0;
}

/**
 * Build global components
 * @param {Object} buildOptions see @build
 * @param {Function} callback
 */
function buildGlobalComponents (buildOptions, callback) {
  var _globalComponents = {};
  walkVuejsGlobalComponents(buildOptions.vuejsGlobalComponentsFolder, (err, globalComponents) => {
    if (err) {
      return callback(_globalComponents);
    }

    for (var i = 0; i < globalComponents.length; i++) {
      try {
        _globalComponents[globalComponents[i]] = compiler(globalComponents[i], fs.readFileSync(globalComponents[i]).toString(), buildOptions);
      }
      catch (e) {
        console.log(e);
      }
    }

    callback(_globalComponents);
  });
}

/**
 * Build modules
 * @param {Object} buildOptions see @build
 * @param {Function} callback
 */
function buildModules (buildOptions, callback) {
  var _modules  = {};
  var _pathUrls = [];
  walkModules(buildOptions.modulesFolder, (err, modules) => {
    if (err) {
      return callback(_modules);
    }

    var _router  = '';
    for (var i = 0; i < modules.length; i++) {
      var _paths = Object.keys(modules[i][1]);

      for (var j = 0; j < _paths.length; j++) {
        if (_isModuleAuthorized(buildOptions.profile, modules[i][0]) || buildOptions.isLangGeneration) {
          try {
            var _path       = path.join(modules[i][0], modules[i][1][_paths[j]].controllers + '.js');
            _modules[_path] = compiler(_path, fs.readFileSync(_path).toString(), buildOptions);
            _pathUrls.push([_paths[j], _path]);
          }
          catch (e) {
            console.log(e);
          }
        }
      }
    }

    callback(_modules,_pathUrls);
  });
}

/**
 * Remove specific characters to create a variable
 * @param {String} path
 */
function _sanitizePath (path) {
  return path
          .replace(/\//g, '_')
          .replace(/\\/g, '_')
          .replace(/-/g, '_')
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
        return exports
      })([${ _importsToInject.join(',') }], {});
    `;

    _code += _moduleCode;
  }

  return _code;
}

/**
 * Build the client
 * It generates a fake index.js from where to build imports
 * @param {Object} buildOptions object detailed above
 * @param {Function} callback called when the build is complete
 */
function build (buildOptions, callback) {
  buildOptions              = Object.assign(options, buildOptions);
  buildOptions.isTranslated = buildOptions.isLangGeneration;
  buildOptions.rights       = buildOptions.profile.rights;

  var _code   = '';
  var _router = '';

  buildGlobalComponents(buildOptions, (globalComponents) => {
    buildModules(buildOptions, (modules, paths) => {
      // global components
      var _graphInfos = graph(globalComponents);
      _code           += _buildCode(_graphInfos.flattenedObjects, _graphInfos.order);

      // modules
      _graphInfos = graph(modules);
      _code       += _buildCode(_graphInfos.flattenedObjects, _graphInfos.order);

      for (var i = 0; i < paths.length; i++) {
        _router += `{ path : '${ paths[i][0] }', component : ${ _sanitizePath(paths[i][1]) } },`;
      }
      _router = '[' + _router + ']';

      _code = vuejsIndex
                      .replace(/\{\{__APP__\}\}/g, _code)
                      .replace(/\{\{__VUEJS_ROUTES__\}\}/g, _router)

      // build rights
      buildOptions.profile.rights = {};

      var _routes = buildOptions.profile.routes || [];
      for (var i = 0; i < _routes.length; i++) {
        var _route = _routes[i].replace(/:[a-zA-Z]+/g, '#');

        buildOptions.profile.rights[_route] = true;
      }

      _code = translate(buildOptions.langPath, buildOptions.lang, _code, buildOptions.isLangGeneration);
      _code = transpile(_code);
      callback(null, _insertDependencies(_code, buildOptions));
    });
  });
}

/**
 * Construct dependencies
 * @param {String} js fake index.js content
 * @param {Object} options { isProduction : true | false }
 * @returns {String}
 */
function _insertDependencies (js, options) {
  var _libs = [];
  var _lib;
  var _path;

  // vuejs
  let _vuejsPath = require.resolve('vue');
  _vuejsPath     = _vuejsPath.split('/').slice(0, -1).join('/');
  _path          = path.join(_vuejsPath, options.isProduction ? 'vue.min.js' : 'vue.js');
  _cacheDependency(_libs, _path);

  // vue-router
  const _vueRouterPath = require.resolve('vue-router');
  const _vueRouterDir  = _vueRouterPath.split('/').slice(0, -1).join('/');
  _path                = path.join(_vueRouterDir, 'vue-router.min.js');
  _cacheDependency(_libs, _path);

  // buefy
  let _buefy = require.resolve('buefy');
  _buefy     = _buefy.split('/').slice(0, -1).join('/');
  _path      = path.join(_buefy, 'index.js');
  _cacheDependency(_libs, _path);

  // vue-gesture
  let _vuegesture = require.resolve('vue-gesture');
  _vuegesture     = _vuegesture.split('/').slice(0, -1).join('/');
  _path           = path.join(_vuegesture, 'dist', 'vue-gesture.js');
  _cacheDependency(_libs, _path);

  // echarts
  let _echarts = require.resolve('echarts');
  _echarts     = _echarts.split('/').slice(0, -1).join('/');
  _path        = path.join(_echarts, 'dist', 'echarts-en.min.js');
  _cacheDependency(_libs, _path);

  // moment
  let _moment = require.resolve('moment');
  _moment     = _moment.split('/').slice(0, -1).join('/');
  _path       = path.join(_moment, 'min', 'moment-with-locales.min.js');
  _cacheDependency(_libs, _path);

  var _code = _libs.join('\n') + js;
  // delete bueify sourcemap
  _code     = _code.replace(/\/\/# sourceMappingURL=index\.js\.map/, '');
  return _code;
}

/**
 * Add to libs dependency from the cache or load it
 * @param {Array} libs
 * @param {String} path
 */
function _cacheDependency (libs, path) {
  var _lib;
  if (dependenciesCache[path]) {
    libs.push(dependenciesCache[path]);
  }
  else {
    _lib = fs.readFileSync(path, 'utf8');
    dependenciesCache[path] = _lib
    libs.push(_lib);
  }
}

module.exports = build;

