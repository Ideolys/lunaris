const storeMap    = require('../lib/_builder/store/schema');
const validateMap = require('../lib/_builder/store/validate');
const collection  = require('../src/store/store.collection');
/**
 * Utils
 */
exports.initStore = function initStore (name, map, joinDescriptor, storesToPropagate, filters, compilatedStores = {}) {
  var _store                   = {};
  _store.name                  = name;
  _store.primaryKey            = null;
  _store.filters               = filters || [];
  _store.hooks                 = {};
  _store.paginationLimit       = 50;
  _store.paginationOffset      = 0;
  _store.paginationCurrentPage = 1;
  _store.map                   = map;
  _store.meta                  = storeMap.analyzeDescriptor(map, name);
  _store.validateFn            = validateMap.buildValidateFunction(_store.meta.compilation);
  _store.getPrimaryKeyFn       = map ? _store.meta.getPrimaryKey : null;
  _store.setPrimaryKeyFn       = map ? _store.meta.setPrimaryKey : null;
  _store.isStoreObject         = !map ? false : !Array.isArray(map) ? true : false;
  _store.data                  = collection.collection(_store.getPrimaryKeyFn, _store.isStoreObject, joinDescriptor, null, _store.meta.reflexiveFn);
  _store.storesToPropagate     = storesToPropagate || [];
  _store.filterFns             = _store.meta ? storeMap.getFilterFns(compilatedStores, _store.meta.compilation, _store.filters) : null;
  _store.massOperations        = {};
  return _store;
};
