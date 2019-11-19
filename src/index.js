var hook               = require('./store/store.hook.js');
var store              = require('./store/store.js');
var storeSynchro       = require('./store/store.synchronisation.js');
var storeUtils         = require('./store/store.utils.js');
var lunarisExports     = require('./exports.js');
var collection         = require('./store/store.collection.js');
var utils              = require('./utils.js');
var logger             = require('./logger.js');
var http               = require('./http.js');
var offline            = require('./offline.js');
var cache              = require('./cache.js');
var transaction    	   = require('./store/store.transaction.js');
var websocket          = require('./websocket.js');
var localStorageDriver = require('./localStorageDriver.js');
var invalidate         = require('./invalidate.js');
var debug              = require('./debug.js');
var lazyLoad           = require('./store/crud/_lazyLoad.js');

utils.getTranslatedStoreName = storeUtils.getTranslatedStoreName;

offline.pushOfflineHttpTransactions = storeSynchro.pushOfflineHttpTransactions,
offline.getLastSyncDate             = storeSynchro.getLastSyncDate,
offline.load                        = store.load;

module.exports = {
  _stores             : lunarisExports._stores,
  _collection         : collection.collection,
  _cache              : cache,
  _resetVersionNumber : collection.resetVersionNumber,
  _indexedDB          : localStorageDriver.indexedDB,
  _removeAllHooks     : hook.removeAllHooks,
  _initStore          : lazyLoad.load,

  debug : debug,

  utils  : utils,
  logger : logger,

  hook           : hook.hook,
  removeHook     : hook.removeHook,
  pushToHandlers : hook.pushToHandlers,

  http         : http,
  websocket    : websocket,
  offline      : offline,
  localStorage : localStorageDriver.localStorage,

  get             : store.get,
  getOne          : store.getOne,
  insert          : store.insert,
  update          : store.update,
  upsert          : store.upsert,
  delete          : store.delete,
  load            : store.load,
  clear           : store.clear,
  rollback        : store.rollback,
  retry           : store.retry,
  getDefaultValue : store.getDefaultValue,
  validate        : store.validate,
  setPagination   : store.setPagination,
  createUrl       : store.createUrl,
  begin           : transaction.begin,
  commit          : transaction.commit,
  invalidate      : invalidate.invalidate,

  invalidations : {
    init           : invalidate.init,
    compute        : invalidate.computeInvalidations,
    on             : invalidate.on,
    _invalidations : invalidate.invalidations,
    /**
    * Get invalidations and compute
    */
    getAndCompute  : function () {
      websocket.subscribe('invalidations', function (serverInvalidations) {
        invalidate.computeInvalidations(serverInvalidations, Object.keys(lunarisExports._stores));
      });

      websocket.send('invalidations');
    }
  },

  OPERATIONS : utils.OPERATIONS,
  constants  : lunarisExports.constants,
  exports    : lunarisExports
};
