const fs               = require('fs');
const path             = require('path');
const serializer       = require('serialize-javascript');
const glob             = require('glob');
const storeMap         = require('./_builder/store/schema');
const storeCompilation = require('./_builder/store/compilation');
const validateMap      = require('./_builder/store/validate');
const compiler         = require('./_builder/compiler').compiler;
const urlsGraph        = require('./_builder/urls');
const error            = require('./error');
const utils            = require('./utils');
const graph            = require('./_builder/graph');

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
 * @param {Object} storeJoins
 */
function _buildCode (modules, sort, storeJoins, isUnderscoreBeforeVar = false, storeReferences) {
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
    if (storeJoins[sort[i]]) {
      storeToPropagate = JSON.stringify(storeJoins[sort[i]]);
    }
    var storeToPropagateReferences = '[]';
    if (storeReferences[sort[i]]) {
      storeToPropagateReferences = JSON.stringify(storeReferences[sort[i]]);
    }

    var _lunarisInit = `
      lu_e['data'] = lunaris._collection(
        lu_e['getPrimaryKeyFn'],
        lu_e['isStoreObject'],
        lu_e['joins'],
        lu_e['aggregateFn'],
        lu_e['computedsFn'],
        lu_e['name'],
        lu_e['references'],
        lu_e['clone'],
      );
      lu_e['filters']                     = lu_e['filters'] || [];
      lu_e['paginationLimit']             = 50;
      lu_e['paginationOffset']            = 0;
      lu_e['paginationCurrentPage']       = 1;
      lu_e['hooks']                       = {};
      lu_e['nameTranslated']              = '\${store.${ sort[i] }}';
      lu_e['isFilter']                    = false;
      lu_e['storesToPropagateReferences'] = ${ storeToPropagateReferences };
      lu_e['storesToPropagate']           = ${ storeToPropagate };
      lu_e['massOperations']              = {};
    `;

    var _moduleCode = `
      var ${ isUnderscoreBeforeVar ? '_' : '' }${ _sanitizePath(sort[i]) } = (function(lu_i, lu_e) {
        ${ modules[sort[i]].code }
        ${ _lunarisInit }
        ${ modules[sort[i]].isMultipleExports ? '\nlunaris.utils.merge(lu_e, lu_e[' + modules[sort[i]].index + ']);' : '' }
        return lu_e;
      })([${ _importsToInject.join(',') }], {});
    `;

    _code += _moduleCode;
  }

  _modules += '}';
  return [_code, _modules];
}

function cacheGraph (urlsGraph) {
  let cacheGraph = {};

  for (let url in urlsGraph) {
    for (let l = 0; l < urlsGraph[url].length; l++) {
      if (!cacheGraph[urlsGraph[url][l]]) {
        cacheGraph[urlsGraph[url][l]] = [];
      }

      for (let k = 0; k < urlsGraph[url].length; k++) {
        if (urlsGraph[url][l] === urlsGraph[url][k]) {
          continue;
        }

        if (cacheGraph[urlsGraph[url][l]].indexOf(urlsGraph[url][k]) === -1) {
          cacheGraph[urlsGraph[url][l]].push(urlsGraph[url][k]);
        }
      }
    }
  }

  return cacheGraph;
}

/**
 * Recursive function to set compilated map
 * @param {Object} compilations { storeName : compilation }
 * @param {Object} stores { storeName : evaluated store }
 * @param {Stirng} storeName
 */
function _getCompilationForInherits (compilations, stores, storeName) {
  let store = stores[storeName];
  if (!stores[store.inherits]) {
    store.inherits = null;
    let error = 'The store "' + store.inherits + '" referenced in "store.inherits" does no exist!';
    throw new Error(error);
  }

  let inheritedStore = stores[store.inherits];

  if (inheritedStore.inherits && !inheritedStore.isSchemaCompiled) {
    _getCompilationForInherits(compilations, stores, store.inherits);
    inheritedStore = stores[store.inherits];
    store          = stores[storeName];
  }

  store.map = Object.assign(
    Object.assign({}, compilations[store.inherits].isStoreObject ? inheritedStore.map : inheritedStore.map[0] || {}),
    Object.assign({}, compilations[store.inherits].isStoreObject ? store.map          : store.map[0]          || {})
  );

  if (!compilations[store.inherits].isStoreObject) {
    store.map = [store.map];
  }

  let meta           = storeMap.analyzeDescriptor(store.map, storeName);
  meta.isStoreObject = compilations[store.inherits].isStoreObject;

  compilations[storeName] = meta;
  store.isSchemaCompiled  = true;
  stores[storeName]       = store;
}

function _compileStore (store, buildOptions, varStores, callback) {
  fs.readFile(store, (err, file) => {
    if (err) {
      return callback([err]);
    }

    file = file.toString();

    compiler(store, file, buildOptions, (err, compilatedStore) => {
      if (err) {
        return callback(err);
      }

      try {
        var _storeCode      = compilatedStore.code;
        var _storeCodeEval  = eval(_storeCode);
        var _isMultiExports = true;

        if (!Array.isArray(_storeCodeEval)) {
          _storeCodeEval = [_storeCodeEval];
          _isMultiExports = false;
        }

        for (var k = 0; k < _storeCodeEval.length; k++) {
          var _store = _storeCodeEval[k];
          _storeCode = 'lu_e = ' + serializer(_store) + ';'; // serialize for multi stores

          if (!_store.name) {
            var _error = 'The store must have a name, found in: ' + store;
            throw new Error(_error);
          }
          if (Object.values(varStores.storeNames).indexOf(_store) !== -1) {
            throw new Error('The store "' + _store.name + '" already exists!');
          }
          else {
            varStores.storeNames[_store.name] = _store.name;
          }

          _store.map = _store.map || [];

          var _isStoreObject = !Array.isArray(_store.map);
          _storeCode += '\nlu_e["isStoreObject"] = ' + _isStoreObject + ';';

          var _meta                      = !_store.inherits ? storeMap.analyzeDescriptor(_store.map, _store.name) : {};
          _meta.isStoreObject            = _isStoreObject;
          varStores.compilatedStores[_store.name] = _meta;

          urlsGraph(varStores.urlsGraph, _store);

          if (!varStores.graph[_store.name]) {
            varStores.graph[_store.name] = [];
          }

          if (_store.filters) {
            for (var j = 0; j < _store.filters.length; j++) {
              if (!_store.filters[j].source) {
                continue;
              }
              var _name = _store.filters[j].source.replace('@', '');
              if (!varStores.graph[_name]) {
                varStores.graph[_name] = [];
              }
              varStores.graph[_name].push(_store.name);
            }
          }

          compilatedStore.code = _storeCode;
          if (_isMultiExports) {
            varStores.stores[_store.name]                   = JSON.parse(JSON.stringify(compilatedStore));
            varStores.stores[_store.name].isMultipleExports = _isMultiExports;
            varStores.stores[_store.name].index             = k;
          }
          else {
            varStores.stores[_store.name] = compilatedStore;
          }

          varStores.stores[_store.name].inherits   = _store.inherits ? _store.inherits.replace('@', '') : null;
          varStores.stores[_store.name].filters    = _store.filters;
          varStores.stores[_store.name].path       = store;
          varStores.stores[_store.name].map        = _store.map;
          varStores.stores[_store.name].isMapClone = _store.isMapClone;

          varStores.code      += `lunaris._stores['${ _store.name }'] = _${ _sanitizePath(_store.name) };\n`;
          varStores.codeAfter += `lunaris._register(lunaris._stores['${ _store.name }']);\n`;
        }
      }
      catch (e) {
        return callback(e);
      }

      callback();
    });
  });
}

/**
 *
 * @param {Object} varStores
 * @param {Object} options
 * @returns {Object} {
 *   code : String,
 *   cacheGraph : Object,
 *   urlsGraph : Object
 * }
 */
function _compileStores (varStores, options) {
  var _graphJoins       = {};
  var _graphReferences  = {};
  var _vars             = '';
  var _stores           = varStores.stores;
  var _compilatedStores = varStores.compilatedStores;
  var storeNames        = varStores.storeNames;

  var _storeNames    = Object.keys(_stores);
  var _storesChanged = [];
  for (let i = 0; i < _storeNames.length; i++) {
    var _compilation = _compilatedStores[_storeNames[i]];
    let _store       = _stores[_storeNames[i]];

    if (!_compilation) {
      continue;
    }
    if (_store.inherits) {
      try {
        _getCompilationForInherits(_compilatedStores, _stores, _storeNames[i]);
      }
      catch (e) {
        error.print('Store "' + _storeNames[i] + '" in ' + _store.path, e);
        continue;
      }
      _compilation = _compilatedStores[_storeNames[i]];
    }

    try {
      _store.code  += '\nlu_e["computedsFn"] = ' + (_compilation.computedsFn ? _compilation.computedsFn.toString() : null) + ';';
      _store.code  += '\nlu_e["defaultValue"] = ' + serializer(_compilation.defaultValue) + ';';
      _store.code  += '\nlu_e["aggregateFn"] = ' + serializer(_compilation.aggregateFn) + ';';
      _store.code  += '\nlu_e["onValidate"] = ' + serializer(_compilation.onValidate) + ';';
      var _validate = validateMap.buildValidateFunction(_compilation.compilation);
      _store.code  += '\nlu_e["validateFn"] = ' + _validate.toString() + ';';
      if (_compilation.meta.primaryKey && _compilation.meta.primaryKey.length) {
        _store.code += '\nlu_e["getPrimaryKeyFn"] = ' + _compilation.getPrimaryKey.toString() + ';';
        _store.code += '\nlu_e["setPrimaryKeyFn"] = ' + _compilation.setPrimaryKey.toString() + ';';
      }

      _store.code += '\nlu_e["clone"] = ' + (_store.isMapClone ? _compilation.clone.toString() : 'lunaris.utils.clone') + ';';

      var _collections       = '';
      var _storesToJoin      = Object.keys(_compilation.meta.joins);
      var _joinDescriptor    = { joins : _compilation.meta.joins, joinFns : {}, collections : {} };
      var _refDescriptor     = {
        stores       : [],
        references   : _compilation.meta.references,
        referencesFn : _compilation.referencesFn
      };
      var _storesToReference = {};

      for (let k = 0; k < _storesToJoin.length; k++) {
        if (!_compilatedStores[_storesToJoin[k]]) {
          return errors.push(new Error('The store "' + _storesToJoin[k] + '" does not have a map. You will not be able to join it.'));
        }
        if (!_graphJoins[_storesToJoin[k]]) {
          _graphJoins[_storesToJoin[k]] = [];
        }
        _graphJoins[_storesToJoin[k]].push(_storeNames[i]);
        _storesToReference[_storesToJoin[k]] = '_' + (_sanitizePath(_storesToJoin[k])) + '.data,';

        // Reorder _stores object in order to put joined stores, children of the current stores
        _store.children[_storesToJoin[k]] = _stores[_storesToJoin[k]];
        _storesChanged.push(_storesToJoin[k]);
      }

      for (let path in _compilation.meta.references) {
        let referencedStore = _compilation.meta.references[path];
        if (!_compilatedStores[referencedStore]) {
          return errors.push(new Error('The store "' + referencedStore + '" does not have a map. You will not be able to join it.'));
        }

        if (_refDescriptor.stores.indexOf(referencedStore) === -1) {
          _refDescriptor.stores.push(referencedStore);
        }

        if (!_graphReferences[referencedStore]) {
          _graphReferences[referencedStore] = [];
        }

        _graphReferences[referencedStore].push(_storeNames[i]);

        _store.children[referencedStore] = _stores[referencedStore];
        _storesChanged.push(referencedStore);

        // _storesToReference[referencedStore] = '_' + (_sanitizePath(referencedStore)) + '.data,';
      }

      for (let store in _storesToReference) {
        _collections += store + ':' + _storesToReference[store];
      }

      _store.code += '\nlu_e["collections"] = {' + _collections + '};';
      _joinDescriptor['joinFns'] = storeMap.getJoinFns(
        _compilatedStores,
        _compilation.compilation,
        _compilation.virtualCompilation,
        _compilation.meta.joins,
        _compilation.meta.externalAggregates,
        storeNames[_storeNames[i]]
      );
      _store.code += '\nlu_e["joins"] = ' + serializer(_joinDescriptor) + ';';
      _store.code += '\nlu_e["joins"]["collections"] = lu_e["collections"];';
      _store.code += '\nlu_e["filterFns"] = ' + serializer(storeCompilation.getFilterFns(
        options.ignoredStoresForOffline,
        _compilatedStores,
        _compilation.compilation,
        _store.filters
      ));

      _store.code += '\nlu_e["references"] = ' + serializer(_refDescriptor) + ';';
    }
    catch (e) {
      error.print('Store "' + _storeNames[i] + '" in ' + _store.path, e);
    }
  }

  for (var l = 0; l < _storesChanged.length; l++) {
    delete _stores[_storesChanged[l]];
  }

  urlsGraphDeps     = varStores.urlsGraph;
  cacheGraphDeps    = cacheGraph(varStores.urlsGraph);

  var _graphInfos = null;
  try {
    _graphInfos = graph(_stores);
  }
  catch (e) {
    throw new Error('[Error] [Builder] ' + e.message);
  }

  return {
    code       : _vars + _buildCode(_graphInfos.flattenedObjects, _graphInfos.order, _graphJoins, true, _graphReferences)[0] + varStores.code + varStores.codeAfter,
    cacheGraph : cacheGraphDeps,
    urlsGraph  : urlsGraphDeps
  };
}

/**
 * Build lunaris stores
 * @param {Object} buildOptions {
 *   storesFolder : '',    // where are stores
 *   isProduction : false, // is prodution build ?
 * }
 * @param {Object} storeNames
 * @param {Function} callback
 */
function buildStores (buildOptions, storeNames, callback) {
  var _options = JSON.parse(JSON.stringify(buildOptions));

  let varStores = {
    code             : '',
    codeAfter        : '',
    stores           : {},
    graph            : {},
    urlsGraph        : {},
    storeNames,
    compilatedStores : {}
  };

  _options.isNotVue = true;

  glob(buildOptions.storesFolder, (err, stores) => {
    if (err) {
      error.print(_options.storesFolder, err);
      return callback('');
    }

    utils.genericQueue(stores, (store, next) => {
      _compileStore(store, _options, varStores, (errors) => {
        if (errors) {
          error.print(store, errors);
          return next();
        }

        next();
      });
    },
    null,
    () => {
      callback(_compileStores(varStores, _options));
    }).start();
  });
}

module.exports = buildStores;
