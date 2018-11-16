var lunarisExports     = require('../exports.js');
var logger             = require('../logger.js');
var utils              = require('../utils.js');
var localStorageDriver = require('../localStorageDriver.js');
var database           = localStorageDriver.indexedDB;

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
      'No primary key has been found, fallback to lunaris _id.',
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

    if (!isNaN(Number(_id))) {
      return Number(_id);
    }

    return _id;
  }

  return value[store.primaryKey];
}

/**
 * Set primary key value for update
 * @param {Object} store
 * @param {Object} value
 * @param {String} id
 * @returns {String}
 */
function setPrimaryKeyValue (store, value, id) {
  var _id = '_';
  if (store.setPrimaryKeyFn) {
    return store.setPrimaryKeyFn.call(null, value, id);
  }

  if (!store.primaryKey || (store.primaryKey && !store.primaryKey.length)) {
    return null;
  }

  var _primaryKey = store.primaryKey;
  if (Array.isArray(_primaryKey)) {
    for (var i = 0; i < _primaryKey.length; i++) {
      _id += (value[_primaryKey[i]] || id) + '-';
      if (!value[_primaryKey[i]]) {
        value[_primaryKey[i]] = '_' + id;
      }
    }

    if (_id !== '') {
      _id = _id.slice(0, _id.length - 1);
    }

    return _id;
  }

  return value[store.primaryKey] = _id + id;
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


/**
 * Decompose object path to get the attribute value
 * attribute
 * attribute.test
 * @param {Array} objectPathParts
 * @returns {Object}
 */
function getPathValue (objectPathParts) {
  var _parts = utils.clone(objectPathParts);
  var _obj   = {};
  var _part  = _parts.shift();

  if (!_parts.length) {
    return _obj[_part];
  }

  return getPathValue(objectPathParts) || null;
}

/**
 * Decompose object path to set the attribute value
 * attribute
 * attribute.test
 * @param {Array} objectPathParts
 * @param {*} value
 * @returns {Object}
 */
function setPathValue (objectPathParts, value, obj) {
  var _parts = utils.clone(objectPathParts);
  var _obj   = obj || {};
  var _part  = _parts.shift();

  if (!_parts.length) {
    _obj[_part] = value;
    return _obj;
  }

  _obj[_part] = setPathValue(_parts, value);
  return _obj;
}

/**
 * Set values for given path to an object
 * @param {Object} objectPathValues  { path : value }
 * @param {*} data
 */
function setObjectPathValues (objectPathValues, data) {
  var _paths = Object.keys(objectPathValues);
  for (var i = 0; i< _paths.length; i++) {
    setPathValue(_paths[i].split('.'), objectPathValues[_paths[i]], data);
  }
}

/**
 * Get JSON patch path
 * @param {String} path element.label
 * @returns {String} element/label
 */
function getJSONPatchPath (path) {
  return path.replace('.', '/');
}

/**
 * Save
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} cache
 */
function saveState (store, collection, cache) {
  if (!lunarisExports.isBrowser) {
    return;
  }

  var _state = {
    store          : store.name,
    massOperations : store.massOperations,
    pagination     : {
      limit       : store.paginationLimit,
      offset      : store.paginationOffset,
      currentPage : store.paginationCurrentPage
    },
    collection : {
      currentId     : collection.getCurrentId(),
      currrentRowId : collection.getCurrentRowId(),
      index         : collection.getIndexId()
    },
    cache : cache.cache()
  };

  database.upsert('_states', _state);
}

exports.getStore           = getStore;
exports.getCollection      = getCollection;
exports.getPrimaryKeyValue = getPrimaryKeyValue;
exports.setPrimaryKeyValue = setPrimaryKeyValue;
exports.checkArgs          = checkArgs;

exports.getPathValue        = getPathValue;
exports.setPathValue        = setPathValue;
exports.setObjectPathValues = setObjectPathValues;
exports.getJSONPatchPath    = getJSONPatchPath;
exports.saveState           = saveState;
