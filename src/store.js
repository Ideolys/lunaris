var hook = require('./hook.js');

/**
 * Get store
 * @param {String} storeName
 */
function _getStore (storeName) {
  if (/@/.test(storeName)) {
    storeName = storeName.split('@');
    storeName = storeName[storeName.length - 1];
  }
  var lunarisExports = require('./exports.js');
  var _store         = lunarisExports._stores[storeName];
  if (!_store) {
    throw new Error('The store "' + storeName + '" has not been defined');
  }

  return lunarisExports._stores[storeName];
}

/**
 * Insert or Update a value in store
 * @param {String} store
 * @param {*} value
 */
function upsert (store, value) {
  if (value === undefined) {
    throw new Error('lunaris.insert(<store>, <value>) must have a value, provided value: ' + value);
  }
  if (!store || typeof store !== 'string') {
    throw new Error('lunaris.insert(<store>, <value>) must have a correct store value: @<store>');
  }

  var _event      = value._id ? 'update' : 'insert';
  var _store      = _getStore(store);
  var _collection = _store.data;

  if (!_collection) {
    throw new Error('"' + store + '" has not been defined!');
  }

  _collection.upsert(value);
  hook.pushToHandlers(_store, _event, value);

  // TODO push to HTTP
}

/**
 * Delete a value from the store
 * @param {String} store
 * @param {*} value
 */
function deleteStore (store, value) {
  if (value === undefined) {
    throw new Error('lunaris.delete(<store>, <value>) must have a value, provided value: ' + value);
  }
  if (!store || typeof store !== 'string') {
    throw new Error('lunaris.delete(<store>, <value>) must have a correct store value: @<store>');
  }

  var _store      = _getStore(store);
  var _collection = _store.data;

  if (!_collection) {
    throw new Error('"' + store + '" has not been defined!');
  }

  var _res = _collection.remove(value._id);
  hook.pushToHandlers(_store, 'delete', _res);

  // TODO push to HTTP
}

exports.update         = upsert;
// exports.updateFiltered = upsertFiltered;
exports.insert         = upsert;
// exports.insertFiltered = upsertFiltered;
exports.delete         = deleteStore;
//exports.deleteFiltered = deleteFiltered;
