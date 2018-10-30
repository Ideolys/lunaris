var hook           = require('./store/store.hook.js');
var store          = require('./store/store.js');
var lunarisExports = require('./exports.js');
var collection     = require('./store/store.collection.js');
var utils          = require('./utils.js');
var logger         = require('./logger.js');
var http           = require('./http.js');
var offline        = require('./offline.js');

module.exports = {
  _stores             : lunarisExports._stores,
  _collection         : collection.collection,
  _resetVersionNumber : collection.resetVersionNumber,
  freeze              : utils.freeze,
  clone               : utils.clone,
  merge               : utils.merge,
  logger              : logger,

  hook           : hook.hook,
  removeHook     : hook.removeHook,
  pushToHandlers : hook.pushToHandlers,

  http    : http,
  offline : offline,

  get             : store.get,
  getOne          : store.getOne,
  insert          : store.insert,
  update          : store.update,
  upsert          : store.upsert,
  delete          : store.delete,
  clear           : store.clear,
  rollback        : store.rollback,
  retry           : store.retry,
  getDefaultValue : store.getDefaultValue,
  validate        : store.validate,
  setPagination   : store.setPagination,
  begin           : hook.begin,
  commit          : hook.commit,

  OPERATIONS : utils.OPERATIONS,
  constants  : lunarisExports.constants
};
