var logger          = require('../../logger.js');
var cache           = require('../../cache.js');
var utils           = require('../../utils.js');
var storeUtils      = require('../store.utils.js');
var crudUtils       = require('./crudUtils.js');
var offline         = require('../../offline.js');
var transaction     = require('../store.transaction.js');
var hook            = require('../store.hook.js');
var lunarisExports  = require('../../exports.js');
var sync            = require('../store.synchronisation.js');
var indexedDB       = require('../../localStorageDriver.js').indexedDB;
var OPERATIONS      = utils.OPERATIONS;

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

function _clearSendEvents (store, collection, isSilent, transactionId, callback) {
  if (!isSilent) {
    return _clearPropagate(store, collection, function () {
      hook.pushToHandlers(store, 'clear', null, transactionId, function () {
        hook.pushToHandlers(store, 'reset', null, transactionId, callback);
      });
    });
  }

  _clearPropagate(store, collection, callback);
}

/**
 * Clear the store collection
 * @param {String} store
 * @param {Boolean} isSilent
 * @param {Function} transactionId
 * @param {Function} callback
 */
function _clear (store, isSilent, transactionId, callback) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);

    if (transaction.isTransaction && !transactionId) {
      return transaction.addAction({
        id        : transaction.getCurrentTransactionId(),
        store     : _options.store.name,
        operation : OPERATIONS.DELETE,
        handler   : _clear,
        arguments : [store, isSilent, transaction.getCurrentTransactionId()]
      });
    }

    _options.store.paginationCurrentPage = 1;
    _options.store.paginationOffset      = 0;
    _options.store.paginationLimit       = 50;
    _options.store.massOperations        = {};
    cache.invalidate(_options.store.name);

    if (offline.isOnline || _options.store.isLocal) {
      _options.collection.clear();
      return indexedDB.clear(_options.store.name, function () {
        _clearSendEvents(_options.store, _options.collection, isSilent, transactionId, callback);
      });
    }

    _clearSendEvents(_options.store, _options.collection, isSilent, transactionId, callback);
  }
  catch (e) {
    logger.warn(['lunaris.clear' + store], e);
  }
}

/**
 * Clear the store collection
 * @param {String} store
 * @param {Boolean} isSilent
 */
function clear (store, isSilent) {
  // It is a regex, we must find the stores !
  if (/\*$/.test(store)) {
    if (!/^@/.test(store)) {
      return logger.warn(['lunaris.clear'], new Error('The store key must begin by \'@\''));
    }

    var _keyLength = store.length - 2;
    var _key       = store.slice(1, _keyLength + 1);
    for (var storeKey in lunarisExports._stores) {
      if (storeKey.slice(0, _keyLength) === _key) {
        _clear('@' + storeKey, isSilent);
      }
    }

    return;
  }

  _clear(store, isSilent);
}

exports.clear = clear;
