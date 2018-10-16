var logger = require('../logger.js');

/**
 * Get store
 * @param {String} storeName
 * @returns {Object}
 */
function getStore (storeName) {
  if (/@/.test(storeName)) {
    storeName = storeName.split('@');
    storeName = storeName[storeName.length - 1];
  }
  var lunarisExports = require('../exports.js');
  var _store         = lunarisExports._stores[storeName];
  if (!_store) {
    throw new Error('The store "' + storeName + '" has not been defined');
  }

  return lunarisExports._stores[storeName];
}

/**
 * Get store collection
 * @param {Object} store
 * @returns {Object}
 */
function getCollection (store) {
  var _collection = store.data;

  if (!_collection) {
    throw new Error('"' + store + '" has not been defined!');
  }

  return _collection;
}

/**
 * Get primary key value for update and delete
 * @param {Object} store
 * @param {Object} value
 * @param {Boolean} isInsertOrMassiveUpdate
 * @returns {String}
 */
function getPrimaryKeyValue (store, value, isInsertOrMassiveUpdate) {
  var _id = null;

  if (isInsertOrMassiveUpdate) {
    return _id;
  }
  if (store.getPrimaryKeyFn) {
    return store.getPrimaryKeyFn.call(null, value);
  }
  if (!store.primaryKey) {
    logger.tip(
      'No primary key has been dound, fallback to lunaris _id.',
      'To declare a primary key, use the notation [\'<<int>>\'] in the map or add the \'primaryKey\' attribute in the store descrption.'
    );
    return value._id;
  }

  var _primaryKey = store.primaryKey;
  if (Array.isArray(_primaryKey)) {
    for (var i = 0; i < _primaryKey.length; i++) {
      var _value = value[_primaryKey[i]];
      if (_value) {
        _id += _value + '-';
      }
    }

    if (_id !== '') {
      _id = _id.slice(0, _id.length - 1);
    }
  }

  return value[store.primaryKey];
}

/**
 * Check arguments for upsert, get, deleteStore
 * @param {String} store
 * @param {*} value
 * @param {Boolean} isNoValue enable or not value check
 */
function checkArgs (store, value, isNoValue) {
  if (value === undefined && !isNoValue) {
    throw new Error('lunaris.<insert|update|delete>(<store>, <value>) must have a value, provided value: ' + value);
  }
  if (!store || typeof store !== 'string') {
    throw new Error('lunaris.<get|insert|update|clear|delete>(<store>, <value>) must have a correct store value: @<store>');
  }
}

exports.getStore           = getStore;
exports.getCollection      = getCollection;
exports.getPrimaryKeyValue = getPrimaryKeyValue;
exports.checkArgs          = checkArgs;
