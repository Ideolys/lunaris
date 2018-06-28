var hook           = require('./hook.js');
var store          = require('./store.js');
var lunarisExports = require('./exports.js');
var collection     = require('./collection.js');

module.exports = {
  _stores     : lunarisExports._stores,
  _collection : collection,

  hook       : hook.hook,
  removeHook : hook.removeHook,

  get    : store.get,
  getOne : store.getOne,
  insert : store.insert,
  update : store.update,
  delete : store.delete
};
