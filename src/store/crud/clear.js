var logger         = require('../../logger.js');
var cache          = require('../../cache.js');
var utils          = require('../../utils.js');
var storeUtils     = require('../store.utils.js');
var crudUtils      = require('./crudUtils.js');
var offline        = require('../../offline.js');
var hook           = require('../store.hook.js');
var lunarisExports = require('../../exports.js');
var sync           = require('../store.synchronisation.js');
var indexedDB      = require('../../localStorageDriver.js').indexedDB;
var OPERATIONS     = utils.OPERATIONS;

sync.setImportFunction(_clear);

/**
 * Propagate for clear and save state
 * @param {Object} store
 * @param {Object} collection
 * @param {Function} callback
 */
function _clearPropagate (store, collection, callback) {
  crudUtils.propagate(store, null, OPERATIONS.DELETE, function () {
    storeUtils.saveState(store, collection, callback);
  });
}

function _clearSendEvents (store, collection, isSilent, callback) {
  if (!isSilent) {
    return _clearPropagate(store, collection, function () {
      hook.pushToHandlers(store, 'clear', null, function () {
        hook.pushToHandlers(store, 'reset', null, callback);
      });
    });
  }

  _clearPropagate(store, collection, callback);
}

/**
 * Clear the store collection
 * @param {String} store
 * @param {Object} options
 * @param {Function} callback
 */
function _clear (store, options, callback) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);

    _options.store.paginationCurrentPage = 1;
    _options.store.paginationOffset      = 0;
    _options.store.paginationLimit       = 50;
    _options.store.massOperations        = {};
    cache.invalidate(_options.store.name);

    if (offline.isOnline || _options.store.isLocal) {
      _options.collection.clear();
      return indexedDB.clear(_options.store.name, function () {
        _clearSendEvents(_options.store, _options.collection, options.isSilent, callback);
      });
    }

    _clearSendEvents(_options.store, _options.collection, options.isSilent, callback);
  }
  catch (e) {
    callback(e);
    logger.warn(['lunaris.clear' + store], e);
  }
}

/**
 * Clear the store collection
 * @param {String} store
 * @param {Object} options { isSilent : Boolean } // for compatibility reseons, options can be a Boolean = isSilent
 * @param {Function} callback (err)
 */
function clear (store, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = null;
  }

  if (typeof options === 'boolean') {
    options = { isSilent : options };
  }

  if (!options) {
    options = {};
  }

  options.isSilent = options.isSilent || false;

  // It is a regex, we must find the stores !
  if (/\*$/.test(store)) {
    if (!/^@/.test(store)) {
      return logger.warn(['lunaris.clear'], new Error('The store key must begin by \'@\''));
    }

    var _keyLength = store.length - 2;
    var _key       = store.slice(1, _keyLength + 1);

    return utils.queue(Object.keys(lunarisExports._stores), function (store, next) {
      if (store.slice(0, _keyLength) !== _key) {
        return next();
      }

      _clear('@' + store, options, next);
    }, function () {
      if (callback) {
        callback();
      }
    });
  }

  _clear(store, options, function (err) {
    if (callback) {
      callback(err);
    }
  });
}

exports.clear = clear;
