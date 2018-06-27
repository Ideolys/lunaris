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
  storesFolder                : null,  // where are stores ?
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
  if (!dir) {
    return done(null, _results);
  }
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
  if (!dir) {
    return done(null, _results);
  }
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
 * Get all stores
 * @param {String} dir
 * @param {Function} done err, stores -> [pathToStore1, pathToStore2, ..., pathToStoreN]
 */
function walkStores (dir, done) {
  var _results = [];
  if (!dir) {
    return done(null, _results);
  }

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
          return walkStores(_file, function(err, res) {
            _results = _results.concat(res);
            next();
          });
        }

        if(_file.substring(_file.length - 3, _file.length) === '.js'){
          _results.push(_file);
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

    var _graphInfos = graph(_globalComponents);
    var _code       = _buildCode(_graphInfos.flattenedObjects, _graphInfos.order);
    callback(_code);
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
            if (_paths[j] === buildOptions.startLink) {
              _paths[j] = '/';
            }
            _pathUrls.push([_paths[j], _path]);
          }
          catch (e) {
            console.log(e);
          }
        }
      }
    }

    var _graphInfos = graph(_modules);
    var _code       = _buildCode(_graphInfos.flattenedObjects, _graphInfos.order);
    callback(_code, _pathUrls);
  });
}

/**
 * Build lunaris stores
 * @param {Object} buildOptions
 * @param {Function} callback
 */
function buildStores (buildOptions, callback) {
  var _stores       = {};
  var _code         = '';
  var _options      = JSON.parse(JSON.stringify(buildOptions));
  _options.isNotVue = true;
  walkStores(buildOptions.storesFolder, (err, stores) => {
    if (err) {
      return callback(_stores);
    }

    for (var i = 0; i < stores.length; i++) {
      try {
        var _compiledStore = compiler(stores[i], fs.readFileSync(stores[i]).toString(), buildOptions);
        var _storeName     = /name\s+:\s+(['"])(.*)\1/.exec(_compiledStore.code);
        if (!_storeName) {
          throw new Error('The store must have a name: ', stores[i]);
        }

        _stores[_sanitizePath(stores[i])] = _compiledStore;
        _code += `
          var _stores = lunaris._stores;
          _stores['${ _storeName[2] }'] = ${ _sanitizePath(stores[i]) };
        `;
      }
      catch (e) {
        console.log(e);
      }
    }

    var _graphInfos = graph(_stores);
    _code           = _buildCode(_graphInfos.flattenedObjects, _graphInfos.order, true) + _code;
    callback(_code);
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
 * @param {Boolean} isLunarisStore
 */
function _buildCode (modules, sort, isLunarisStore) {
  var _code = '';

  for (var i = 0; i < sort.length; i++) {
    var _importsToInject = [];
    var _imports         = modules[sort[i]].imports;
    var _importsKeys     = Object.keys(modules[sort[i]].imports);

    for (var j = 0; j < _importsKeys.length; j++) {
      var _val = _sanitizePath(_imports[_importsKeys[j]]);
      _importsToInject.push(_val);
    }

    var _lunarisInit = `
      exports['state']          = [];
      exports['state_filtered'] = [];
      exports['limit']          = 50;
      exports['offset']         = 0;
      exports['currentPage']    = 1;
      exports['hooks']          = {};
    `;

    var _moduleCode = `
      var ${ _sanitizePath(sort[i]) } = (function(imports, exports) {
        ${ modules[sort[i]].code }
        ${ isLunarisStore ? _lunarisInit : '' }
        return exports;
      })([${ _importsToInject.join(',') }], {});
    `;

    _code += _moduleCode;
  }

  return _code;
}

/**
 * Build lunaris framework
 * @returns {String}
 */
function buildLunaris () {
  var _path    = path.join(__dirname, '..', 'src', 'index.js');
  var _lunaris = "" + fs.readFileSync(_path).toString();

  _lunaris        = compiler(_path, _lunaris, { isNotVue : false });
  var _objToBuild = {};
  _objToBuild[_path + ' = lunaris'] = _lunaris
  var _graphInfos = graph(_objToBuild);
  var _code       = 'var lunaris; \n' + _buildCode(_graphInfos.flattenedObjects, _graphInfos.order);

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

  buildGlobalComponents(buildOptions, globalComponentsCode => {
    buildModules(buildOptions, (modulesCode, paths) => {
      buildStores(buildOptions, storesCode => {
        _code += globalComponentsCode;
        _code += modulesCode;
        _code += storesCode;

        if (!buildOptions.exports) {
          buildOptions.exports = {};
        }
        buildOptions.exports.v2Modules = [];
        for (var j = 0; j < paths.length; j++) {
          buildOptions.exports.v2Modules.push(paths[j][0].split('/')[1]);
        }
        var _globals = JSON.stringify(buildOptions.exports);

        for (var i = 0; i < paths.length; i++) {
          _router += `{ path : '${ paths[i][0] }', component : ${ _sanitizePath(paths[i][1]) }, props : { globals : globals}},`;
        }
        _router = '[' + _router + ']';

        var _lunarisPluginVue = fs.readFileSync(path.join(__dirname, '..', 'src', 'storePluginVue.js')).toString();
        _lunarisPluginVue     = _lunarisPluginVue.replace(/'/g, '"');

        _code = vuejsIndex
                      .replace(/\{\{__LUNARIS__\}\}/g, buildLunaris())
                      .replace(/\{\{__LUNARIS_PLUGIN__\}\}/g, _lunarisPluginVue)
                      .replace(/\{\{__APP__\}\}/g, _code)
                      .replace(/\{\{__VUEJS_GLOBALS__\}\}/g, _globals)
                      .replace(/\{\{__VUEJS_ROUTES__\}\}/g, _router);

        // build rights
        buildOptions.profile.rights = {};

        var _routes = buildOptions.profile.routes || [];
        for (var i = 0; i < _routes.length; i++) {
          var _route = _routes[i].replace(/:[a-zA-Z]+/g, '#');

          buildOptions.profile.rights[_route] = true;
        }

        // try {
        //   _code = transpile(_code);
        // }
        // catch (e) {
        //   callback(e, '');
        // }
        callback(null, _insertDependencies(_code, buildOptions));
      });
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

  // intersect polyfill
  let _intersect = require.resolve('intersection-observer');
  _intersect     = _intersect.split('/').slice(0, -1).join('/');
  _path          = path.join(_intersect, 'intersection-observer.js');
  _cacheDependency(_libs, _path);

  // pluralize
  let _pluralize = require.resolve('pluralize');
  _pluralize     = _pluralize.split('/').slice(0, -1).join('/');
  _path          = path.join(_pluralize, 'pluralize.js');
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

exports.build        = build;
exports.buildLunaris = buildLunaris;
