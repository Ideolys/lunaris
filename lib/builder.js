const fs               = require('fs');
const path             = require('path');
const stopwords        = require('stopword');
// const transpile     = require('vue-template-es2015-compiler');
const compiler         = require('./_builder/compiler').compiler;
const graph            = require('./_builder/graph');
const translate        = require('./_builder/translate');
const storeMap         = require('./_builder/store/schema');
const storeCompilation = require('./_builder/store/compilation');
const validateMap      = require('./_builder/store/validate');
const urlsGraph        = require('./_builder/urls');

const vuejsIndex      = fs.readFileSync(path.join(__dirname, '_builder', 'index.js')).toString();
let dependenciesCode  = '';
let groupsToTranslate = [];
let storeDependencies = {};
let urlsGraphDeps     = {};

const options = {
  baseUrl                     : '\'\'',    // url to request
  groupsFile                  : null,
  clientFolder                : null,  // where are client folder ?
  modulesFolder               : null,  // where are modules ?
  vuejsGlobalComponentsFolder : null,  // where are vuejs global components ?
  storesFolder                : null,  // where are stores ?
  profile                     : {},    // profile object
  isProduction                : false, // is prodution build ?
  langPath                    : null,  // where are lang files ?
  lang                        : null,  // fr, es, nl, ...
  isLangGeneration            : false, // is builder required to generate lang file
  startLink                   : '/',   // from where to launch the app at startup
  constants                   : {},    // external constants to provide for client and in-store operations (transform functions)
  indexedDBNumber             : 1,     // external db number
  websocketPort               : 4000,  // websocketServerPort
  ignoredStoresForOffline     : [],    // Stores ignore in store filter compilation step for offline
  isOfflineStrategies         : false, // Activate or desactivate offline features
  isOfflineSync               : false  // Activate or desactivate offline sync view
};

function _stringifyObject (obj) {
  if (!obj) {
    return null;
  }
  var _keys = Object.keys(obj);
  var _obj  = '{';
  for (var i = 0; i < _keys.length; i++) {
    if (typeof obj[_keys[i]] === 'object') {
      _obj += _keys[i] + ':' + _stringifyObject(obj[_keys[i]]) + ',';
    }
    else {
      if (typeof obj[_keys[i]] === 'function') {
        _obj += _keys[i] + ':' + obj[_keys[i]].toString() + ',';
      }
      else {
        _obj += _keys[i] + ':\'' + obj[_keys[i]] + '\',';
      }
    }
  }

  return _obj + '}';
}

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
      return callback('');
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
    var _code       = _buildCode(_graphInfos.flattenedObjects, _graphInfos.order)[0];
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
      return callback('', _pathUrls);
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

            _pathUrls.push([_paths[j], _path,modules[i][1][_paths[j]].name, (modules[i][1][_paths[j]].description || '')]);
          }
          catch (e) {
            console.log(e);
          }
        }
      }
    }

    var _graphInfos          = graph(_modules);
    var [_code, _moduleRefs] = _buildCode(_graphInfos.flattenedObjects, _graphInfos.order);
    callback(_code, _pathUrls, _moduleRefs);
  });
}

/**
 * Build lunaris stores
 * @param {Object} buildOptions
 * @param {Object} storeNames
 * @param {Function} callback
 */
function buildStores (buildOptions, storeNames, callback) {
  var _vars             = '';
  var _stores           = {};
  var _code             = '';
  var _codeAfter        = '';
  var _options          = JSON.parse(JSON.stringify(buildOptions));
  var _graph            = {};
  var _graphJoins       = {};
  var _graphReferences  = {};
  var _compilatedStores = {};
  var _errors           = [];
  var _urlsGraph        = {};

  _options.isNotVue = true;
  walkStores(buildOptions.storesFolder, (err, stores) => {
    if (err) {
      return callback('');
    }

    for (var i = 0; i < stores.length; i++) {
      try {
        var _file           = fs.readFileSync(stores[i]).toString();
        var _compiledStore  = compiler(stores[i], _file, buildOptions);
        var _storeCode      = _compiledStore.code;
        var _storeCodeEval  = eval(_storeCode);
        var _isMultiExports = true;

        if (!Array.isArray(_storeCodeEval)) {
          _storeCodeEval = [_storeCodeEval];
          _isMultiExports = false;
        }

        for (var k = 0; k < _storeCodeEval.length; k++) {
          var _store = _storeCodeEval[k];

          if (!_store.name) {
            var _error = 'The store must have a name, found in: ' + stores[i];
            throw new Error(_error);
          }
          if (Object.values(storeNames).indexOf(_store) !== -1) {
            throw new Error('The store "' + _store.name + '" already exists!');
          }
          else {
            storeNames[_store.name] = _store.name;
          }

          _store.map = _store.map || [];

          // throw new Error(`Store "${_storeName[2]}" must have a map!`);
          var _isStoreObject = !Array.isArray(_store.map);
          _storeCode += '\nexports["isStoreObject"] = ' + _isStoreObject + ';';
          var _meta                              = storeMap.analyzeDescriptor(_store.map, _store.name);
          _meta.isStoreObject                    = _isStoreObject;
          _compilatedStores[_store.name]         = _meta;
          _storeCode += '\nexports["computedsFn"] = ' + (_meta.computedsFn ? _meta.computedsFn.toString() : null) + ';';
          _storeCode += '\nexports["meta"] = ' + JSON.stringify(_meta) + ';';
          var _validate = validateMap.buildValidateFunction(_meta.compilation);
          _storeCode += '\nexports["validateFn"] = ' + _validate.toString() + ';';
          if (_meta.meta.primaryKey && _meta.meta.primaryKey.length) {
            _storeCode += '\nexports["getPrimaryKeyFn"] = ' + _meta.getPrimaryKey.toString() + ';';
            _storeCode += '\nexports["setPrimaryKeyFn"] = ' + _meta.setPrimaryKey.toString() + ';';
          }
          _compilatedStores[_store.name].filters = _store.filters;
          _compilatedStores[_store.name].path    = stores[i];

          urlsGraph(_urlsGraph, _store);

          if (!_graph[_store.name]) {
            _graph[_store.name] = [];
          }

          if (_store.filters) {
            for (var j = 0; j < _store.filters.length; j++) {
              var _name = _store.filters[j].source.replace('@', '');
              if (!_graph[_name]) {
                _graph[_name] = [];
              }
              _graph[_name].push(_store.name);
            }
          }

          _compiledStore.code = _storeCode;
          if (_isMultiExports) {
            _stores[_store.name]                   = JSON.parse(JSON.stringify(_compiledStore));
            _stores[_store.name].isMultipleExports = _isMultiExports;
            _stores[_store.name].index             = k;
          }
          else {
            _stores[_store.name] = _compiledStore;
          }
          _code      += `lunaris._stores['${ _store.name }'] = _${ _sanitizePath(_store.name) };\n`;
          _codeAfter += `lunaris._stores['${ _store.name }']._register();\n`;
        }
      }
      catch (e) {
        _errors.push('[Builder] Error when compiling the store "' + stores[i] + '" ' + e.message);
        console.log('\n', '[Error] [Builder] Error when compiling the store "' + stores[i] + '"', e.message);
      }
    }

    var _storeNames    = Object.keys(_stores);
    var _storesChanged = [];
    for (i = 0; i < _storeNames.length; i++) {
      var _compilation = _compilatedStores[_storeNames[i]];

      if (!_compilation) {
        continue;
      }
      try {
        var _collections    = '';
        var _pks            = '';
        var _storesToJoin   = Object.keys(_compilation.meta.joins);
        var _joinDescriptor = { joins : _compilation.meta.joins, joinFns : {}, collections : {} };
        var _refDescriptor  = { referencesFn : _compilation.referencesFn , getPrimaryKeyFns : {}, collections : {} };
        for (k = 0; k < _storesToJoin.length; k++) {
          if (!_compilatedStores[_storesToJoin[k]]) {
            throw new Error('The store "' + _storesToJoin[k] + '" does not have a map. You will not be able to join it.');
          }
          if (!_graphJoins[_storesToJoin[k]]) {
            _graphJoins[_storesToJoin[k]] = [];
          }
          _graphJoins[_storesToJoin[k]].push(_storeNames[i]);
          _collections += _storesToJoin[k] + ' : _' + (_sanitizePath(_storesToJoin[k])) + '.data,' ;

          // Reorder _stores object in order to put joined stores, children of the current stores
          _stores[_storeNames[i]].children[_storesToJoin[k]] = _stores[_storesToJoin[k]];
          _storesChanged.push(_storesToJoin[k]);
        }

        for (let referencedStore in _compilation.meta.references) {
          if (!_compilatedStores[referencedStore]) {
            throw new Error('The store "' + referencedStore + '" does not have a map. You will not be able to join it.');
          }

          if (!_graphReferences[referencedStore]) {
            _graphReferences[referencedStore] = [];
          }

          _graphReferences[referencedStore].push(_storeNames[i]);

          _stores[_storeNames[i]].children[referencedStore] = _stores[referencedStore];
          _storesChanged.push(referencedStore);

          _collections += referencedStore + ' : _' + (_sanitizePath(referencedStore)) + '.data,' ;
          _pks         += referencedStore + ' : _' + (_sanitizePath(referencedStore)) + '.getPrimaryKeyFn,';
        }

        _stores[_storeNames[i]].code += '\nexports["collections"] = {' + _collections + '};';
        _joinDescriptor['joinFns'] = storeMap.getJoinFns(
          _compilatedStores,
          _compilation.compilation,
          _compilation.virtualCompilation,
          _compilation.meta.joins,
          _compilation.meta.externalAggregates,
          storeNames[_storeNames[i]]
        );
        _stores[_storeNames[i]].code += '\nexports["joins"] = ' + _stringifyObject(_joinDescriptor) + ';';
        _stores[_storeNames[i]].code += '\nexports["joins"]["collections"] = exports["collections"];';
        _stores[_storeNames[i]].code += '\nexports["filterFns"] = ' + _stringifyObject(storeCompilation.getFilterFns(
          buildOptions.ignoredStoresForOffline,
          _compilatedStores,
          _compilation.compilation,
          _compilation.filters
        ));

        _stores[_storeNames[i]].code += '\nexports["references"]                     = ' + _stringifyObject(_refDescriptor) + ';';
        _stores[_storeNames[i]].code += '\nexports["references"]["collections"]      = exports["collections"];';
        _stores[_storeNames[i]].code += '\nexports["references"]["getPrimaryKeyFns"] = {' + _pks + '};';
      }
      catch (e) {
        _errors.push('[Builder] Error when compiling the store "' + _storeNames[i] + '" ' + e.message);
        console.log('\n', '[Error] [Builder] Error when compiling the store "' + _storeNames[i] + '"', e.message);
      }
    }

    for (var l = 0; l < _storesChanged.length; l++) {
      delete _stores[_storesChanged[l]];
    }

    storeDependencies = _graph;
    urlsGraphDeps     = _urlsGraph;

    var _graphInfos = graph(_stores);
    _code = _vars + _buildCode(_graphInfos.flattenedObjects, _graphInfos.order, true, _graphJoins, true, _graphReferences)[0] + _code + _codeAfter;
    callback(_code, _errors);
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
        exports['references']
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
            lunaris.hook('filterUpdated' + _filter, _handler);
            lunaris.hook('reset'         + _filter, _handler);

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

  var _res = _buildCode(_graphInfos.flattenedObjects, _graphInfos.order);
  _code += _res[0];
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
  let storeNames    = {};
  storeDependencies = {};
  urlsGraphDeps     = {};

  _setGroups(buildOptions.groupsPath);
  buildGlobalComponents(buildOptions, globalComponentsCode => {
    buildModules(buildOptions, (modulesCode, paths, moduleRefs) => {
      buildStores(buildOptions, storeNames, (storesCode, compilationErrors) => {
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
          _router  += `{ path : '${ paths[i][0] }', component : ${ _sanitizePath(paths[i][1]) }, name : '${  paths[i][2] }', meta : { description : '${  paths[i][3] }'}},`;
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

        var _indexAppOfflinePath = path.join(__dirname, '..', 'src', 'plugin-vue', 'offline.vue');
        var _indexAppOffline     = fs.readFileSync(_indexAppOfflinePath);
        _indexAppOffline         = compiler(_indexAppOfflinePath, _indexAppOffline, buildOptions);
        _indexAppOffline         = _buildCode({ offline : _indexAppOffline }, ['offline']);
        _indexAppOffline         = '(function () { ' + _indexAppOffline[0] + ' return offline ' + '})()';

        // Add groups for translation
        var _codeStoreNames = '';
        for (i = 0; i < groupsToTranslate.length; i++) {
          _codeStoreNames += `var _groups_${ i } = '${ groupsToTranslate[i] }' \n`;
        }

        var _stopwords = stopwords[buildOptions.lang] || stopwords.en;

        _code = vuejsIndex
          .replace(/\{\{__LUNARIS__\}\}/g, buildLunaris({
            BASE_URL              : buildOptions.baseUrl,
            IS_PRODUCTION         : buildOptions.isProduction,
            STORE_DEPENDENCIES    : JSON.stringify(storeDependencies),
            CONSTANTS             : JSON.stringify(buildOptions.constants),
            STOPWORDS             : JSON.stringify(_stopwords),
            COMPILATION_ERRORS    : JSON.stringify(compilationErrors || []),
            URLS_GRAPH            : JSON.stringify(urlsGraphDeps),
            IS_OFFLINE_STRATEGIES : buildOptions.isOfflineStrategies,
            IS_OFFLINE_SYNC       : buildOptions.isOfflineSync
          }))
          .replace(/\{\{__LUNARIS_PLUGIN__\}\}/g, _lunarisPluginVue)
          .replace(/\{\{__APP__\}\}/g, _code)
          .replace(/\{\{__VUEJS_GLOBALS__\}\}/g, _globals)
          .replace(/\{\{__VUEJS_ROUTES__\}\}/g, _router)
          .replace(/\{\{__VUEJS_INSTANCE__\}\}/g, _indexApp)
          .replace(/\{\{__VUEJS_INSTANCE_OFFLINE__\}\}/g, _indexAppOffline)
          .replace(/\{\{__STORE_NAMES__\}\}/g, _codeStoreNames)
          .replace(/\{\{__INDEXEDDB_NUMBER__\}\}/g, buildOptions.indexedDBNumber)
          .replace(/\{\{__MODULE_REFS__\}\}/g, moduleRefs)
          .replace(/\{\{__WEBSOCKET_PORT__\}\}/g, buildOptions.websocketPort);

        // Replace absolute path
        _code = _code.replace(new RegExp(_sanitizePath(buildOptions.clientFolder), 'g'), '');
        _code = _code.replace(new RegExp(
          _sanitizePath(path.join(__dirname, '..', 'src', 'plugin-vue', 'lunarisErrors.vue')),
          'g'
        ), '_lunaris_errors_component');
        _code = _code.replace(new RegExp(_sanitizePath(path.join(__dirname, '..', 'src')), 'g'), '');

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

  // kiten-format
  let _kittenFormat = require.resolve('kitten-format');
  _kittenFormat     = _kittenFormat.split('/').slice(0, -1).join('/');
  _path             = path.join(_kittenFormat, 'kittenFormat.client.min.js');
  _addDependency(dependenciesCode, _path);
  _addDependency(dependenciesCode, path.join(_kittenFormat, 'locales', 'fr-FR.js'));
  _addDependency(dependenciesCode, path.join(_kittenFormat, 'locales', 'en-GB.js'));

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
  _path      = path.join(_buefy, 'buefy.js');
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
  // vue observe directive
  let _vueObserve = require.resolve('vue-observe-visibility');
  _vueObserve     = _vueObserve.split('/').slice(0, -1).join('/');
  _path           = path.join(_vueObserve, 'vue-observe-visibility.min.js');
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
  dependenciesCode += _lib + '\n';
  return _lib;
}

exports.build        = build;
exports.buildLunaris = buildLunaris;
