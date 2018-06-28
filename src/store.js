var hook  = require('./hook.js');
var utils = require('./utils.js');
var http  = require('./http.js');

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
 * Check arguments for upsert, get, deleteStore
 * @param {String} store
 * @param {*} value
 * @param {Boolean} isNotValue enable or not value check
 */
function _checkArgs (store, value, isNotValue) {
  if (value === undefined && !isNotValue) {
    throw new Error('lunaris.<get|insert|update>(<store>, <value>) must have a value, provided value: ' + value);
  }
  if (!store || typeof store !== 'string') {
    throw new Error('lunaris.<get|insert|update>(<store>, <value>) must have a correct store value: @<store>');
  }
}

/**
 * Insert or Update a value in store
 * @param {String} store
 * @param {*} value
 */
function upsert (store, value) {
  _checkArgs(store, value);

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
  _checkArgs(store, value);

  var _store      = _getStore(store);
  var _collection = _store.data;
  if (!_collection) {
    throw new Error('"' + store + '" has not been defined!');
  }

  var _res = _collection.remove(value._id);
  hook.pushToHandlers(_store, 'delete', _res);

  // TODO push to HTTP
}

/**
 * Get values
 * @param {String} store
 * @param {*} value
 */
function get (store) {
  _checkArgs(store, null, true);

  var _store      = _getStore(store);
  var _collection = _store.data;
  if (!_collection) {
    throw new Error('"' + store + '" has not been defined!');
  }

  var _request = '/';
  if (pluralize.isPlural(_store.name) === false) {
    _request += pluralize(_store.name);
  }
  else {
    _request += _store.name;
  }

  http.get(_request, function (err, data) {
    if (err) {
      return hook.pushToHandlers(_store, 'errorHttp', err);
    }

    for (var i = 0; i < data.length; i++) {
      _collection.upsert(data[i]);
    }

    hook.pushToHandlers(_store, 'get', utils.clone(data));
  });
}

/**
 * Get firt value
 * @param {String} store
 * @param {*} value
 */
function getOne (store) {
  _checkArgs(store, null, true);

  var _store      = _getStore(store);
  var _collection = _store.data;
  if (!_collection) {
    throw new Error('"' + store + '" has not been defined!');
  }

  return utils.clone(_collection.getFirst());
}

exports.get            = get;
exports.getOne         = getOne;
exports.insert         = upsert;
// exports.insertFiltered = upsertFiltered;
exports.update         = upsert;
// exports.updateFiltered = upsertFiltered;
exports.delete         = deleteStore;
//exports.deleteFiltered = deleteFiltered;
