var hook               = require('./store/store.hook.js');
var store              = require('./store/store.js');
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

module.exports = {
  _stores             : lunarisExports._stores,
  _collection         : collection.collection,
  _resetTransaction   : transaction._reset,
  _cache              : cache,
  _resetVersionNumber : collection.resetVersionNumber,
  _indexedDB          : localStorageDriver.indexedDB,

  utils  : utils,
  logger : logger,

  hook           : hook.hook,
  removeHook     : hook.removeHook,
  pushToHandlers : hook.pushToHandlers,

  http         : http,
  websocket    : websocket,
  offline      : offline,
  localStorage : localStorageDriver.localStorage,

  get                          : store.get,
  getOne                       : store.getOne,
  insert                       : store.insert,
  update                       : store.update,
  upsert                       : store.upsert,
  delete                       : store.delete,
  clear                        : store.clear,
  rollback                     : store.rollback,
  retry                        : store.retry,
  getDefaultValue              : store.getDefaultValue,
  validate                     : store.validate,
  setPagination                : store.setPagination,
  begin                        : transaction.begin,
  commit                       : transaction.commit,
  invalidate                   : invalidate.invalidate,
  _pushOfflineHttpTransactions : store.pushOfflineHttpTransactions,

  initInvalidations     : invalidate.init,
  _computeInvalidations : invalidate.computeInvalidations,
  invalidations         : invalidate.invalidations,

  OPERATIONS : utils.OPERATIONS,
  constants  : lunarisExports.constants,
  exports    : lunarisExports
};
