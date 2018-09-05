const storeMap    = require('../lib/_builder/store/schema');
const validateMap = require('../lib/_builder/store/validate');
const collection  = require('../src/store/store.collection');
/**
 * Utils
 */
exports.initStore = function initStore (name, map) {
  var _store                   = {};
  _store.name                  = name;
  _store.primaryKey            = null;
  _store.data                  = collection.collection();
  _store.filters               = [];
  _store.hooks                 = {};
  _store.paginationLimit       = 50;
  _store.paginationOffset      = 0;
  _store.paginationCurrentPage = 1;
  _store.map                   = map;
  _store.meta                  = storeMap.analyzeDescriptor(map);
  _store.validateFn            = validateMap.buildValidateFunction(_store.meta.compilation);
  _store.isStoreObject         = !map ? false : !Array.isArray(map) ? true : false;
  return _store;
};
