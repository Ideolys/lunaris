const fs               = require('fs');
const path             = require('path');
const compiler         = require('./_builder/compiler').compiler;
const graph            = require('./_builder/graph');
const translate        = require('./_builder/translate');
const package          = require('../package.json');
const utils            = require('./utils');
const error            = require('./error');
const buildStores      = require('./builder-store');

const vuejsIndex      = fs.readFileSync(path.join(__dirname, '_builder', 'index.js')).toString();
let dependenciesCode  = '';
let groupsToTranslate = [];
let urlsGraphDeps     = {};
let cacheGraphDeps    = {};
let lunarisCode       = '';

const options = {
  baseUrl                     : '',    // url to request
  clientFolder                : null,  // where are client folder ?
  modulesFolder               : null,  // where are modules ?
  vuejsGlobalComponentsFolder : null,  // where are vuejs global components ?
  storesFolder                : null,  // where are stores ?
  profile                     : {},    // profile object
  isProduction                : false, // is prodution build ?
  langPath                    : null,  // where are lang files ?
  lang                        : '',    // fr, es, nl, ...
  isLangGeneration            : false, // is builder required to generate lang file
  startLink                   : '/',   // from where to launch the app at startup
  constants                   : {},    // external constants to provide for client and in-store operations (transform functions)
  indexedDBNumber             : 1,     // external db number
  websocketPort               : 4000,  // websocketServerPort
  ignoredStoresForOffline     : [],    // Stores ignore in store filter compilation step for offline
  isOfflineStrategies         : false, // Activate or desactivate offline features
  isOfflineSync               : false, // Activate or desactivate offline sync view
  dependencies                : [],    // Array of path to dependecies
  injectedIndexCode           : ''     // code to run before new Vue()
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
          return fs.readFile(_path, (err, fileRoutes) => {
            if (err) {
              return next();
            }

            let _routes = JSON.parse(fileRoutes.toString());
            results.push([file, _routes]);
            _addGroups(_routes);
            next();
          });
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
  let _globalComponents = {};
  walkVuejsGlobalComponents(buildOptions.vuejsGlobalComponentsFolder, (err, globalComponents) => {
    if (err) {
      error.print(buildOptions.vuejsGlobalComponentsFolder, err);
      return callback('');
    }

    globalComponents.push(path.join(__dirname, '..', 'src', 'plugin-vue', 'directive.js'));
    utils.genericQueue(globalComponents, (globalComponent, next) => {
      fs.readFile(globalComponent, (err, file) => {
        if (err) {
          error.print(globalComponent, err);
          return next();
        }

        compiler(globalComponent, file.toString(), buildOptions, (errors, res) => {
          if (errors) {
            error.print(globalComponent, errors);
            return next();
          }

          _globalComponents[globalComponent] = res;
          next();
        });
      });
    },
    null,
    () => {
      var _graphInfos = graph(_globalComponents);
      var _code       = _buildCode(_graphInfos.flattenedObjects, _graphInfos.order)[0];
      callback(_code);
    }).start();
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
      error.print(buildOptions.modulesFolder, err);
      return callback('', _pathUrls);
    }

    utils.genericQueue(modules, (moduleToCompile, next) => {
      let _paths = Object.keys(moduleToCompile[1]);

      utils.genericQueue(_paths, (pathModule, nextSecond) => {
        if (!_isModuleAuthorized(buildOptions.profile, moduleToCompile[0]) && !buildOptions.isLangGeneration) {
          return nextSecond();
        }

        var _path = path.join(moduleToCompile[0], moduleToCompile[1][pathModule].controllers + '.js');

        fs.readFile(_path, (err, file) => {
          if (err) {
            error.print(_path, err);
            return nextSecond();
          }

          compiler(_path, file.toString(), buildOptions, (errors, res) => {
            if (errors) {
              error.print(_path, errors);
              return next();
            }

            _modules[_path] = res;

            if (pathModule === buildOptions.startLink) {
              pathModule = '/';
            }

            _pathUrls.push([
              pathModule,
              _path,
              moduleToCompile[1][pathModule].name,
              (moduleToCompile[1][pathModule].description || ''),
              (moduleToCompile[1][pathModule].isOffline   || false)
            ]);

            nextSecond();
          });
        });
      },
      null,
      () => {
        next();
      }).start();

    },
    null,
    () => {
      var _graphInfos          = graph(_modules);
      var [_code, _moduleRefs] = _buildCode(_graphInfos.flattenedObjects, _graphInfos.order);
      callback(_code, _pathUrls, _moduleRefs);
    }).start();
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
    .replace(/-/g , '_')
    .replace(/\./g, '_');
}

/**
 * Build code
 * Set imports and exports for each module
 * @param {Array} modules
 * @param {Array} sort
 * @param {Boolean} isLunarisStore
 * @param {Object} storeJoins
 */
function _buildCode (modules, sort, isLunarisStore, storeJoins, isUnderscoreBeforeVar = false, storeReferences) {
  var _code    = '';
  var _modules = '{';

  for (var i = 0; i < sort.length; i++) {
    var _importsToInject = [];
    var _imports         = modules[sort[i]].imports;
    var _importsKeys     = Object.keys(modules[sort[i]].imports);

    for (var j = 0; j < _importsKeys.length; j++) {
      var _val = _sanitizePath(_imports[_importsKeys[j]]);
      _importsToInject.push(_val);
    }

    var storeToPropagate = '[]';
    if (isLunarisStore && storeJoins[sort[i]]) {
      storeToPropagate = JSON.stringify(storeJoins[sort[i]]);
    }
    var storeToPropagateReferences = '[]';
    if (isLunarisStore && storeReferences[sort[i]]) {
      storeToPropagateReferences = JSON.stringify(storeReferences[sort[i]]);
    }

    var _lunarisInit = `
      exports['data'] = lunaris._collection(
        exports['getPrimaryKeyFn'],
        exports['isStoreObject'],
        exports['joins'],
        exports['meta'] ? exports['meta'].aggregateFn : null,
        exports['computedsFn'],
        exports['name'],
        exports['references'],
        exports['clone'],
      );
      exports['filters']                     = exports['filters'] || [];
      exports['paginationLimit']             = 50;
      exports['paginationOffset']            = 0;
      exports['paginationCurrentPage']       = 1;
      exports['hooks']                       = {};
      exports['nameTranslated']              = '\${store.${ sort[i] }}';
      exports['isFilter']                    = false;
      exports['storesToPropagateReferences'] = ${ storeToPropagateReferences };
      exports['storesToPropagate']           = ${ storeToPropagate };
      exports['massOperations']              = {};

      exports._register = function () {
        // Register hooks
        var _watchedStores = [];
        for (i = 0; i < exports.filters.length; i++) {
          var _handler = function (item) {
            exports.paginationCurrentPage = 1;
            exports.paginationOffset      = 0;
            lunaris.pushToHandlers(exports, 'reset');
          };

          var _filter = exports.filters[i].source;
          if (_watchedStores.indexOf(_filter) === -1) {
            lunaris.hook('filterUpdated' + _filter, _handler, false, true);
            lunaris.hook('reset'         + _filter, _handler, false, true);

            _watchedStores.push(_filter);
            _filter = _filter.replace('@', '');
            lunaris._stores[_filter].isFilter = true;
          }
        }
      };
    `;

    var _moduleCode = `
      var ${ isUnderscoreBeforeVar ? '_' : '' }${ _sanitizePath(sort[i]) } = (function(imports, exports) {
        ${ modules[sort[i]].code }
        ${ isLunarisStore ? _lunarisInit : '' }
        ${ modules[sort[i]].isMultipleExports ? '\nlunaris.utils.merge(exports, exports[' + modules[sort[i]].index + ']);' : '' }
        return exports;
      })([${ _importsToInject.join(',') }], {});
    `;

    _code += _moduleCode;

    if (!isLunarisStore) {
      _modules += `'${ modules[sort[i]].name }' : ${ _sanitizePath(sort[i]) }, \n`;
    }
  }

  _modules += '}';
  return [_code, _modules];
}

/**
 * Get lunaris build
 * @param {Object} buildOptions
 * @param {Function} callback
 */
function getLunarisBuild (buildOptions, callback) {
  if (lunarisCode) {
    return callback(null, lunarisCode);
  }

  // if (buildOptions.isProduction) {
  //   return fs.readFile(path.join(__dirname, '..', 'dist', 'lunaris.min.js'), 'utf-8', (err, file) => {
  //     if (err) {
  //       return callback(err);
  //     }
  //     lunarisCode = file;
  //     return callback(null, file);
  //   });
  // }

  fs.readFile(path.join(__dirname, '..', 'dist', 'lunaris.js'), 'utf-8', (err, file) => {
    if (err) {
      return callback(err);
    }

    lunarisCode = file;
    return callback(null, file);
  });
}

/**
 * Build lunaris
 * @param {Object} buildOptions
 * @param {Object} externals { key : value, keyN, valueN }
 * @param {Function} callback
 */
function buildLunaris (buildOptions, externals, callback) {
  _getLunarisBuild(buildOptions, (err, code) => {
    if (err) {
      return callback(err);
    }

    callback(null, code.replace(/\{\{__EXTERNALS__\}\}/g, getExternalsToLunaris(externals)));
  });
}

/**
 * Build lunaris framework
 * @param {Object} externals { inCodeModule : moduleToInject }
 * @returns {String}
 */
function getExternalsToLunaris (externals) {
  var _code = '';
  for (var _external in externals) {
    _code += 'var ' + _external + ' = ' + externals[_external] + ';\n';
  }

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
 * @param {String} groupsPath
 */
function _setGroups (groupsPath) {
  if (!groupsPath) {
    return;
  }
  var _path = path.join(groupsPath);
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
  buildOptions              = Object.assign(JSON.parse(JSON.stringify(options)), JSON.parse(JSON.stringify(buildOptions)));
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
  let storeNames    = {};
  urlsGraphDeps     = {};

  _setGroups(buildOptions.groupsPath);

  buildGlobalComponents(buildOptions, globalComponentsCode => {
    buildModules(buildOptions, (modulesCode, paths, moduleRefs) => {
      buildStores(buildOptions, storeNames, storesCode => {
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
          _router  += `{ path : '${ paths[i][0] }', component : ${ _sanitizePath(paths[i][1]) }, name : '${  paths[i][2] }',
            meta : { description : '${  paths[i][3] }', isOffline : ${  paths[i][4] }}},`;
        }
        _router = '[' + _router + ']';

        var _lunarisPluginVue = fs.readFileSync(path.join(__dirname, '..', 'src', 'plugin-vue', 'storePluginVue.js')).toString();
        _lunarisPluginVue     = _lunarisPluginVue.replace(/'/g, '"');

        var _defautlIndexApp = `{
          el     : '#app',
          router : router,
          data   : function () {
            return {
              varStores : varStores
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

        var _indexAppOfflinePath = path.join(__dirname, '..', 'src', 'plugin-vue', 'offline.vue');
        var _indexAppOffline     = fs.readFileSync(_indexAppOfflinePath);

        compiler(_indexAppOfflinePath, _indexAppOffline, buildOptions, (err, res) => {
          _indexAppOffline = res;
          _indexAppOffline = _buildCode({ offline : _indexAppOffline }, ['offline']);
          _indexAppOffline = '(function () { ' + _indexAppOffline[0] + ' return offline ' + '})()';

          // Add groups for translation
          var _codeStoreNames = '';
          for (i = 0; i < groupsToTranslate.length; i++) {
            _codeStoreNames += `var _groups_${ i } = '${ groupsToTranslate[i] }' \n`;
          }

          getLunarisBuild(buildOptions, (err, lunarisBuild) => {
            if (err) {
              error.print('lunaris.js', err);
            }

            _code = vuejsIndex
              .replace(/\{\{__LUNARIS__\}\}/g, lunarisBuild)
              .replace(/\{\{__LUNARIS_OPTIONS__\}\}/g, JSON.stringify({
                baseUrl             : buildOptions.baseUrl,
                isProduction        : buildOptions.isProduction,
                urlsGraph           : urlsGraphDeps,
                constants           : buildOptions.constants,
                cacheGraph          : cacheGraphDeps,
                isOfflineStrategies : buildOptions.isOfflineStrategies,
                isOfflineSync       : buildOptions.isOfflineSync,
                version             : package.version
              }))
              .replace(/\{\{__LUNARIS_PLUGIN__\}\}/g, _lunarisPluginVue)
              .replace(/\{\{__APP__\}\}/g, _code)
              .replace(/\{\{__VUEJS_GLOBALS__\}\}/g, _globals)
              .replace(/\{\{__VUEJS_ROUTES__\}\}/g, _router)
              .replace(/\{\{__VUEJS_INSTANCE__\}\}/g, _indexApp)
              .replace(/\{\{__VUEJS_INSTANCE_OFFLINE__\}\}/g, _indexAppOffline)
              .replace(/\{\{__VUEJS_BEFORE_CODE__\}\}/g, buildOptions.injectedIndexCode)
              .replace(/\{\{__STORE_NAMES__\}\}/g, _codeStoreNames)
              .replace(/\{\{__INDEXEDDB_NUMBER__\}\}/g, buildOptions.indexedDBNumber)
              .replace(/\{\{__MODULE_REFS__\}\}/g, moduleRefs)
              .replace(/\{\{__WEBSOCKET_PORT__\}\}/g, buildOptions.websocketPort);

            // Replace absolute path
            _code = _code.replace(new RegExp(buildOptions.clientFolder, 'g'), '');
            _code = _code.replace(new RegExp(_sanitizePath(buildOptions.clientFolder), 'g'), '');
            _code = _code.replace(new RegExp(
              _sanitizePath(path.join(__dirname, '..', 'src', 'plugin-vue', 'lunarisErrors.vue')),
              'g'
            ), '_lunaris_errors_component');
            _code = _code.replace(new RegExp(_sanitizePath(path.join(__dirname, '..', 'src')), 'g'), '');

            if (buildOptions.langPath && buildOptions.lang) {
              _code = translate(
                buildOptions.langPath,
                buildOptions.lang,
                _code,
                buildOptions.isLangGeneration
              );
            }

            _setLunarisDeps(buildOptions);

            _insertDependencies(buildOptions, dependencies => {
              callback(null, dependencies + _code);
            });
          });
        });
      });
    });
  });
}

function _setLunarisDeps (buildOptions) {
  if (dependenciesCode !== '') {
    return;
  }

  var _path;
  // vuejs
  let _vuejsPath = require.resolve('vue');
  _vuejsPath     = _vuejsPath.split('/').slice(0, -1).join('/');
  _path          = path.join(_vuejsPath, options.isProduction ? 'vue.min.js' : 'vue.js');
  buildOptions.dependencies.unshift(_path);

  // vue-router
  const _vueRouterPath = require.resolve('vue-router');
  const _vueRouterDir  = _vueRouterPath.split('/').slice(0, -1).join('/');
  _path                = path.join(_vueRouterDir, 'vue-router.min.js');
  buildOptions.dependencies.push(_path);

  // node-timsort
  let _timsort = require.resolve('timsort');
  _timsort     = _timsort.split('/').slice(0, -1).join('/');
  _path        = path.join(_timsort, 'build', 'timsort.min.js');
  buildOptions.dependencies.push(_path);

  // promise pako
  let _pako = require.resolve('pako');
  _pako     = _pako.split('/').slice(0, -1).join('/');
  _path     = path.join(_pako, 'dist', 'pako_deflate.min.js');
  buildOptions.dependencies.push(_path);

  // promise polyfill
  let _promise = require.resolve('promise-polyfill');
  _promise     = _promise.split('/').slice(0, -1).join('/');
  _path        = path.join(_promise, '..', 'dist', 'polyfill.min.js');
  buildOptions.dependencies.push(_path);

  // fetch polyfill
  let _fetch = require.resolve('whatwg-fetch');
  _fetch     = _fetch.split('/').slice(0, -1).join('/');
  _path      = path.join(_fetch, 'fetch.js');
  buildOptions.dependencies.push(_path);

  // dayjs
  let dayjs   = require.resolve('dayjs');
  dayjs       = dayjs.split('/').slice(0, -1).join('/');
  _path       = path.join(dayjs, 'dayjs.min.js');
  buildOptions.dependencies.push(_path);

  let locale = buildOptions.lang.split('-');
  // dayjs locale
  if (fs.existsSync(path.join(dayjs, 'locale', buildOptions.lang.toLowerCase() + '.js'))) {
    _path = path.join(dayjs, 'locale', buildOptions.lang + '.js');
  }
  else if (locale.length > 1) {
    _path = path.join(dayjs, 'locale', locale[0] + '.js');
  }
  buildOptions.dependencies.push(_path);
  // dayjs plugin local format
  _path = path.join(dayjs, 'plugin', 'localisableFormat.js');
  buildOptions.dependencies.push(_path);
}

/**
 * Get dependency
 * @param {String} path
 * @param {Function} callback err, dataFile
 */
function _getDependency (path, callback) {
  fs.readFile(path, 'utf-8', (err, data) => {
    if (err) {
      console.log(err);
      return callback(err);
    }

    callback(null, data);
  });
}

/**
 * Construct dependencies
 * @param {Object} options { isProduction : true | false }
 * @param {Function} callback code
 */
function _insertDependencies (options, callback) {
  if (dependenciesCode !== '') {
    return callback(dependenciesCode);
  }

  let iterator = 0;

  function _processNext () {
    var dependency = options.dependencies[iterator];

    if (!dependency) {
      return callback(dependenciesCode);
    }

    _getDependency(dependency, (err, code) => {
      iterator++;
      if (err) {
        return _processNext('');
      }
      dependenciesCode += code + '\n';
      _processNext();
    });
  }

  _processNext();
}

exports.build        = build;
exports.buildLunaris = buildLunaris;
