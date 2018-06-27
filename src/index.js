var hook           = require('./hook.js');
var store          = require('./store.js');
var lunarisExports = require('./exports.js');

module.exports = {
  _stores : lunarisExports._stores,

  hook       : hook.hook,
  removeHook : hook.removeHook,

  get    : store.get,
  getOne : store.getOne,
  insert : store.insert,
  update : store.update,
  delete : store.delete
};
