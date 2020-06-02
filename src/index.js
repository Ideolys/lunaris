var hook                = require('./store/store.hook.js');
var store               = require('./store/store.js');
var storeSynchro        = require('./store/store.synchronisation.js');
var storeUtils          = require('./store/store.utils.js');
var lunarisExports      = require('./exports.js');
var collection          = require('./store/store.collection.js');
var utils               = require('./utils.js');
var logger              = require('./logger.js');
var http                = require('./http.js');
var offline             = require('./offline.js');
var cache               = require('./cache.js');
var transaction    	    = require('./store/store.transaction.js');
var websocket           = require('./websocket.js');
var localStorageDriver  = require('./localStorageDriver.js');
var invalidate          = require('./invalidate.js');
var lazyLoad            = require('./store/crud/_lazyLoad.js');
var collectionResultSet = require('./store/dataQuery/store.collectionResultSet.js');
var dynamicView         = require('./store/dataQuery/store.dynamicView.js');
var devtools            = require('./devtools.js');

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
  _register           : lazyLoad.register,

  collectionResultSet : collectionResultSet,
  dynamicView         : dynamicView,

  devtools : devtools,

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
      lunaris.websocket.unsubscribe('invalidations');
      websocket.subscribe('invalidations', function (serverInvalidations) {
        invalidate.computeInvalidations(serverInvalidations.data, Object.keys(lunarisExports._stores));
      });

      websocket.send('invalidations');
    }
  },

  OPERATIONS : utils.OPERATIONS,
  exports    : lunarisExports,
  get constants () { return lunarisExports.constants; }
};
