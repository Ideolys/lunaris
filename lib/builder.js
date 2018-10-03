const fs           = require('fs');
const path         = require('path');
// const transpile = require('vue-template-es2015-compiler');
const compiler     = require('./_builder/compiler').compiler;
const graph        = require('./_builder/graph');
const translate    = require('./_builder/translate');
const storeMap     = require('./_builder/store/schema');
const validateMap  = require('./_builder/store/validate');

const vuejsIndex      = fs.readFileSync(path.join(__dirname, '_builder', 'index.js')).toString();
let dependenciesCode  = '';
let storeNames        = {};
let groupsToTranslate = [];
let storeDependencies = {};

const options = {
  clientFolder                : null,  // where are client folder ?
  modulesFolder               : null,  // where are modules ?
  vuejsGlobalComponentsFolder : null,  // where are vuejs global components ?
  storesFolder                : null,  // where are stores ?
  profile                     : {},    // profile object
  isProduction                : false, // is prodution build ?
  langPath                    : null,  // where are lang files ?
  lang                        : null,  // fr, es, nl, ...
  isLangGeneration            : false, // is builder required to generate lang file
  startLink                   : '/'    // from where to launch the app at startup
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
  fs.readdir(dir, (err, list) => {
    if (err) {
      return done(err);
    }

    var i = 0;
    function next () {
      var _file = list[i++];
      if (!_file) {
        return done(null, _results);
      }

      _file = dir + '/' + _file;
      fs.stat(_file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          return walkVuejsGlobalComponents(_file, (err, res) => {
            _results = _results.concat(res);
            next();
          });
        }

        if (_file.substring(_file.length - 3, _file.length) === '.js') {
          _results.push(_file);
        }
        else if (_file.substring(_file.length - 4, _file.length) === '.vue') {
          _results.push(_file);
        }

        next();
      });
    }

    next();
  });
}

/**
 * Get all modules
 * @param {String} dir
 * @param {Function} done err, modules -> [[ path, routes.json file content ], ...]
 */
function walkModules (dir, done) {
  var results = [];
  if (!dir) {
    return done(null, results);
  }
  fs.readdir(dir, (err, list) => {
    if (err) {
      return done(err);
    }

    var i = 0;
    function next () {
      var file = list[i++];
      if (!file) {
        return done(null, results);
      }

      file = dir + '/' + file;
      fs.stat(file, (err, stat) => {
        if (stat && stat.isDirectory()) {
          var _path = path.join(file, 'routes.json');
          if (fs.existsSync(_path)) {
            var _routes = fs.readFileSync(_path);
            _routes     = JSON.parse(_routes);
            results.push([file, _routes]);
            _addGroups(_routes);
          }
        }

        next();
      });
    }

    next();
  });
}

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

  fs.readdir(dir, (err, list) => {
    if (err) {
      return done(err);
    }

    var i = 0;
    function next () {
      var _file = list[i++];
      if (!_file) {
        return done(null, _results);
      }

      _file = dir + '/' + _file;
      fs.stat(_file, (err, stat) =>  {
        if (stat && stat.isDirectory()) {
          return walkStores(_file, (err, res) => {
            _results = _results.concat(res);
            next();
          });
        }

        if (_file.substring(_file.length - 3, _file.length) === '.js') {
          _results.push(_file);
        }

        next();
      });
    }

    next();
  });
}

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

    globalComponents.push(path.join(__dirname, '..', 'src', 'plugin-vue', 'lunarisErrors.vue'));
    globalComponents.push(path.join(__dirname, '..', 'src', 'plugin-vue', 'directive.js'));

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
  var _codeAfter    = '';
  var _options      = JSON.parse(JSON.stringify(buildOptions));
  var _graph        = {};
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

        var _path         = _sanitizePath(stores[i]);
        storeNames[_path] = _storeName[2];


        var _storeCode     = _compiledStore.code;
        var _storeCodeEval = eval(_storeCode);

        if (_storeCodeEval.map) {
          // throw new Error(`Store "${_storeName[2]}" must have a map!`);
          _storeCode += '\nexports["isStoreObject"] = ' + !Array.isArray(_storeCodeEval.map) + ';';
          var _meta = storeMap.analyzeDescriptor(_storeCodeEval.map);
          _storeCode += '\nexports["meta"] = ' + JSON.stringify(_meta) + ';';
          var _validate = validateMap.buildValidateFunction(_meta.compilation);
          _storeCode += '\nexports["validateFn"] = ' + _validate.toString() + ';';
          if (_meta.meta.primaryKey && _meta.meta.primaryKey.length) {
            _storeCode += '\nexports["getPrimaryKeyFn"] = ' + _meta.getPrimaryKey.toString() + ';';
          }
        }
        else {
          _storeCode += '\nexports["isStoreObject"] = false;';
        }

        _graph[_storeCodeEval.name] = [];
        if (_storeCodeEval.filters) {
          for (var j = 0; j < _storeCodeEval.filters.length; j++) {
            if (!_graph[_storeCodeEval.filters[j].source]) {
              _graph[_storeCodeEval.filters[j].source] = [];
            }
            _graph[_storeCodeEval.filters[j].source].push(_storeCodeEval.name);
          }
        }

        _compiledStore.code = _storeCode;
        _stores[_path] = _compiledStore;
        _code      += `lunaris._stores['${ _storeName[2] }'] = ${ _path };\n`;
        _codeAfter += `lunaris._stores['${ _storeName[2] }']._registerFilterHooks();\n`;
      }
      catch (e) {
        console.log(e);
      }
    }

    storeDependencies = JSON.stringify(_graph);

    var _graphInfos = graph(_stores);
    _code = _buildCode(_graphInfos.flattenedObjects, _graphInfos.order, true) + _code + _codeAfter;
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
      exports['data']                  = lunaris._collection(null, exports['getPrimaryKeyFn']);
      exports['filters']               = exports['filters'] || [];
      exports['paginationLimit']       = 50;
      exports['paginationOffset']      = 0;
      exports['paginationCurrentPage'] = 1;
      exports['hooks']                 = {};
      exports['nameTranslated']        = '\${store.${ storeNames[sort[i]] }}';
      exports['isFilter']              = false;

      exports._registerFilterHooks = function () {
        for (i = 0; i < exports.filters.length; i++) {
          var _handler = function (item) {
            exports.paginationCurrentPage = 1;
            exports.paginationOffset      = 0;
            lunaris.pushToHandlers(exports, 'reset');
          };

          var _filter = exports.filters[i].source;
          lunaris.hook('filterUpdated' + _filter, _handler);
          lunaris.hook('reset'         + _filter, _handler);

          _filter = _filter.replace('@', '');
          lunaris._stores[_filter].isFilter = true;
        }
      };
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
 * @param {Object} externals { inCodeModule : moduleToInject }
 * @returns {String}
 */
function buildLunaris (externals) {
  var _externals = externals || {};

  var _path    = path.join(__dirname, '..', 'src', 'index.js');
  var _lunaris = fs.readFileSync(_path).toString() + '';

  _lunaris        = compiler(_path, _lunaris, { isNotVue : false });
  var _objToBuild = {};
  _objToBuild[_path + ' = lunaris'] = _lunaris;

  var _graphInfos = graph(_objToBuild);
  var _code       = 'var lunaris; \n';
  for (var _external in _externals) {
    _code += 'var ' + _external + ' = ' + externals[_external] + ';\n';
  }

  _code += _buildCode(_graphInfos.flattenedObjects, _graphInfos.order);
  return _code;
}

/**
 * Function add groups for translate
 * @param {Object} groups
 */
function _addGroups (groups) {
  for (var _groupKey in groups) {
    var _group = groups[_groupKey];
    if (_group.name && _group.name !== '') {
      groupsToTranslate.push(_group.name);
    }
    if (_group.description && _group.description !== '') {
      groupsToTranslate.push(_group.description);
    }
  }
}

/**
 * Set groups for translation
 * @param {String} folder
 */
function _setGroups (folder) {
  var _path = path.join(folder, 'groups.json');
  if (!fs.existsSync(_path)) {
    return;
  }

  try {
    var _groups = JSON.parse(fs.readFileSync(_path).toString());
    _addGroups(_groups);
  }
  catch (e) {}
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
  buildOptions.clientFolder = buildOptions.clientFolder || path.dirname(buildOptions.modulesFolder);

  // build rights
  buildOptions.rights = {};
  var _routes = buildOptions.profile.routes || [];
  for (var i = 0; i < _routes.length; i++) {
    var _route = _routes[i].replace(/:[a-zA-Z]+/g, '#');

    buildOptions.rights[_route] = true;
  }

  var _code   = '';
  var _router = '';
  groupsToTranslate = [];

  _setGroups(buildOptions.clientFolder);
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

        paths = paths || [];
        for (var j = 0; j < paths.length; j++) {
          buildOptions.exports.v2Modules.push(paths[j][0].split('/')[1]);
        }
        var _globals = JSON.stringify(buildOptions.exports);

        for (var i = 0; i < paths.length; i++) {
          _router  += `{ path : '${ paths[i][0] }', component : ${ _sanitizePath(paths[i][1]) }, props : { globals : globals}},`;
        }
        _router = '[' + _router + ']';

        var _lunarisPluginVue = fs.readFileSync(path.join(__dirname, '..', 'src', 'plugin-vue', 'storePluginVue.js')).toString();
        _lunarisPluginVue     = _lunarisPluginVue.replace(/'/g, '"');

        var _defautlIndexApp = `{
          el     : '#app',
          router : router,
          data   : function () {
            return {
              globals : globals
            }
          }
        }`;

        // try to load index
        var _indexApp;
        try {
          _indexApp = fs.readFileSync(path.join(buildOptions.modulesFolder, '..', 'index.js'));
        }
        catch (e) {
          _indexApp = _defautlIndexApp;
        }

        _code = vuejsIndex
          .replace(/\{\{__LUNARIS__\}\}/g, buildLunaris({ isProduction : buildOptions.isProduction, STORE_DEPENDENCIES : storeDependencies }))
          .replace(/\{\{__LUNARIS_PLUGIN__\}\}/g, _lunarisPluginVue)
          .replace(/\{\{__APP__\}\}/g, _code)
          .replace(/\{\{__VUEJS_GLOBALS__\}\}/g, _globals)
          .replace(/\{\{__VUEJS_ROUTES__\}\}/g, _router)
          .replace(/\{\{__VUEJS_INSTANCE__\}\}/g, _indexApp);

        // Replace absolute path
        _code = _code.replace(new RegExp(_sanitizePath(buildOptions.clientFolder), 'g'), '');
        _code = _code.replace(new RegExp(
          _sanitizePath(path.join(__dirname, '..', 'src', 'plugin-vue', 'lunarisErrors.vue')),
          'g'
        ), '_lunaris_errors_component');
        _code = _code.replace(new RegExp(_sanitizePath(path.join(__dirname, '..', 'src')), 'g'), '');

        // Add groups for translation
        for (i = 0; i < groupsToTranslate.length; i++) {
          _code += `var _groups_${ i } = '${ groupsToTranslate[i] }' \n`;
        }

        _code = translate(
          buildOptions.langPath,
          buildOptions.lang,
          _code,
          buildOptions.isLangGeneration
        );

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
  if (dependenciesCode !== '') {
    return dependenciesCode + js;
  }

  var _path;

  // vuejs
  let _vuejsPath = require.resolve('vue');
  _vuejsPath     = _vuejsPath.split('/').slice(0, -1).join('/');
  _path          = path.join(_vuejsPath, options.isProduction ? 'vue.min.js' : 'vue.js');
  _addDependency(dependenciesCode, _path);

  // vue-router
  const _vueRouterPath = require.resolve('vue-router');
  const _vueRouterDir  = _vueRouterPath.split('/').slice(0, -1).join('/');
  _path                = path.join(_vueRouterDir, 'vue-router.min.js');
  _addDependency(dependenciesCode, _path);

  // buefy
  let _buefy = require.resolve('buefy');
  _buefy     = _buefy.split('/').slice(0, -1).join('/');
  _path      = path.join(_buefy, 'index.js');
  _addDependency(dependenciesCode, _path);

  // vue-gesture
  let _vuegesture = require.resolve('vue-gesture');
  _vuegesture     = _vuegesture.split('/').slice(0, -1).join('/');
  _path           = path.join(_vuegesture, 'dist', 'vue-gesture.js');
  _addDependency(dependenciesCode, _path);

  // echarts
  let _echarts = require.resolve('echarts');
  _echarts     = _echarts.split('/').slice(0, -1).join('/');
  _path        = path.join(_echarts, 'dist', 'echarts-en.min.js');
  _addDependency(dependenciesCode, _path);

  // vue-color
  let _vueColor = require.resolve('vue-color');
  _vueColor     = _vueColor.split('/').slice(0, -1).join('/');
  _path         = path.join(_vueColor, 'vue-color.min.js');
  _addDependency(dependenciesCode, _path);

  // dayjs
  let dayjs   = require.resolve('dayjs');
  dayjs       = dayjs.split('/').slice(0, -1).join('/');
  _path       = path.join(dayjs, 'dayjs.min.js');
  _addDependency(dependenciesCode, _path);
  // dayjs locale
  _path = path.join(dayjs, 'locale', options.lang + '.js');
  if (fs.existsSync(_path)) {
    _addDependency(dependenciesCode, _path);
  }
  // dayjs plugin local format
  _path = path.join(dayjs, 'plugin', 'localisableFormat.js');
  if (fs.existsSync(_path)) {
    _addDependency(dependenciesCode, _path);
  }

  // promise pako
  let _pako = require.resolve('pako');
  _pako     = _pako.split('/').slice(0, -1).join('/');
  _path     = path.join(_pako, 'dist', 'pako_deflate.min.js');
  _addDependency(dependenciesCode, _path);

  // promise polyfill
  let _promise = require.resolve('promise-polyfill');
  _promise     = _promise.split('/').slice(0, -1).join('/');
  _path        = path.join(_promise, '..', 'dist', 'polyfill.min.js');
  _addDependency(dependenciesCode, _path);

  // intersect polyfill
  let _intersect = require.resolve('intersection-observer');
  _intersect     = _intersect.split('/').slice(0, -1).join('/');
  _path          = path.join(_intersect, 'intersection-observer.js');
  _addDependency(dependenciesCode, _path);

  // fetch polyfill
  let _fetch = require.resolve('whatwg-fetch');
  _fetch     = _fetch.split('/').slice(0, -1).join('/');
  _path      = path.join(_fetch, 'fetch.js');
  _addDependency(dependenciesCode, _path);

  // delete bueify sourcemap
  dependenciesCode = dependenciesCode.replace(/\/\/# sourceMappingURL=index\.js\.map/, '');
  return dependenciesCode + js;
}

/**
 * Add to libs dependency from the cache or load it
 * @param {Array} libs
 * @param {String} path
 */
function _addDependency (libs, path) {
  var _lib = fs.readFileSync(path, 'utf8');
  dependenciesCode += _lib;
  return _lib;
}

exports.build        = build;
exports.buildLunaris = buildLunaris;
