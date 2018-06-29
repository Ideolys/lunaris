var hook           = require('./hook.js');
var store          = require('./store.js');
var lunarisExports = require('./exports.js');
var collection     = require('./collection.js');

module.exports = {
  _stores     : lunarisExports._stores,
  _collection : collection,

  hook           : hook.hook,
  removeHook     : hook.removeHook,
  pushToHandlers : hook.pushToHandlers,

  get    : store.get,
  getOne : store.getOne,
  insert : store.insert,
  update : store.update,
  upsert : store.upsert,
  delete : store.delete,
  clear  : store.clear
};
