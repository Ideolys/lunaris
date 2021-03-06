const storeMap    = require('../lib/_builder/store/schema');
const validateMap = require('../lib/_builder/store/validate');
const collection  = require('../src/store/store.collection');

function clone (data) {
  return JSON.parse(JSON.stringify(data));
}

/**
 * Utils
 */
exports.initStore = function initStore (name, map, joinDescriptor, storesToPropagate, filters, compilatedStores = {}, referencesDescriptor, storesToPropagateReferences) {
  var _store                         = {};
  _store.name                        = name;
  _store.primaryKey                  = null;
  _store.filters                     = filters || [];
  _store.hooks                       = {};
  _store.paginationLimit             = 50;
  _store.paginationOffset            = 0;
  _store.paginationCurrentPage       = 1;
  _store.map                         = map;
  _store.meta                        = storeMap.analyzeDescriptor(map, name);
  _store.defaultValue                = _store.meta.defaultValue;
  _store.aggregateFn                 = _store.meta.aggregateFn;
  _store.onValidate                  = _store.meta.onValidate;
  _store.validateFn                  = validateMap.buildValidateFunction(_store.meta.compilation);
  _store.getPrimaryKeyFn             = map ? _store.meta.getPrimaryKey : null;
  _store.setPrimaryKeyFn             = map ? _store.meta.setPrimaryKey : null;
  _store.isStoreObject               = !map ? false                    : !Array.isArray(map) ? true : false;
  _store.data                        = collection.collection(_store.getPrimaryKeyFn, _store.isStoreObject, joinDescriptor, null, _store.meta.reflexiveFn, name, referencesDescriptor, clone);
  _store.storesToPropagate           = storesToPropagate || [];
  _store.storesToPropagateReferences = storesToPropagateReferences || [];
  _store.filterFns                   = _store.meta ? storeMap.getFilterFns([], compilatedStores, _store.meta.compilation, _store.filters) : {};
  _store.massOperations              = {};
  _store.references                  = referencesDescriptor;
  _store.clone                       = clone;
  return _store;
};
