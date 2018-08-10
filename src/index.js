var hook           = require('./hook.js');
var store          = require('./store.js');
var lunarisExports = require('./exports.js');
var collection     = require('./collection.js');
var utils          = require('./utils.js');
var logger         = require('./logger.js');

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

  OPERATIONS : utils.OPERATIONS
};
