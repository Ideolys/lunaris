var lunarisExports              = require('../exports.js');
var hook                        = require('./store.hook.js');
var utils                       = require('../utils.js');
var storeUtils                  = require('./store.utils.js');
var collection                  = require('./store.collection.js');
var transaction                 = require('./store.transaction.js');
var indexedDB                   = require('../localStorageDriver.js').indexedDB;
var localStorage                = require('../localStorageDriver.js').localStorage;
var OPERATIONS                  = utils.OPERATIONS;
var offlineTransactions         = [];
var offlineTransactionsInError  = [];
var OFFLINE_STORE               = utils.offlineStore;
var isPushingOfflineTransaction = false;

var imports = {};

lunarisExports._stores.lunarisOfflineTransactions = {
  name                  : OFFLINE_STORE,
  data                  : collection.collection(null, null, null, null, null, OFFLINE_STORE, null, utils.clone),
  filters               : [],
  paginationLimit       : 50,
  paginationOffset      : 0,
  paginationCurrentPage : 1,
  hooks                 : {},
  isLocal               : true,
  storesToPropagate     : [],
  isStoreObject         : false,
  massOperations        : {},
  clone                 : utils.clone
};

/**
 * get an object from a store's collection
 * @param {String} storeName
 * @param {Int} _id
 * @returns {Object}
 */
function _getObjectFromCollection (storeName, _id) {
  var _collection = storeUtils.getCollection(storeUtils.getStore(storeName));

  if (!_collection) {
    return;
  }

  return _collection.get(_id);
}

/**
 * Update offline transaction data
 * When an object has been POST, we must update the data in next transactions operations
 * We only update stores that have references. Because, only references have an impact.
 * @param {Array} storesToUpdate ['store1', 'storeN']
 */
function updateOfflineTransactionData (storesToUpdate) {
  var _lengthStoresToUpdate = storesToUpdate.length;

  if (!_lengthStoresToUpdate) {
    return;
  }


  for (var i = 0, len = offlineTransactions.length; i < len; i++) {
    var _transaction = offlineTransactions[i];
    for (var j = 0; j < _lengthStoresToUpdate; j++)  {
      if (_transaction.store !== storesToUpdate[j]) {
        continue;
      }

      if (storesToUpdate.indexOf(_transaction.store) === -1) {
        continue;
      }

      if (Array.isArray(_transaction.data)) {
        for (var k = 0; k < _transaction.data.length; k++) {
          _transaction.data[k] = _getObjectFromCollection(storesToUpdate[j], _transaction.data[k]._id);
        }

        continue;
      }

      _transaction.data = _getObjectFromCollection(storesToUpdate[j], _transaction.data._id);
    }
  }
}

/**
 * Push dependent transaction in error to error array
 * @param {Array} storesToUpdate
 */
function _pushDependentTransactionsInError (storesToUpdate) {
  var _lengthStoresToUpdate = storesToUpdate.length;

  if (!_lengthStoresToUpdate) {
    return;
  }


  for (var i = offlineTransactions.length - 1; i >= 0; i--) {
    var _transaction = offlineTransactions[i];
    for (var j = 0; j < _lengthStoresToUpdate; j++)  {
      if (_transaction.store !== storesToUpdate[j]) {
        continue;
      }

      if (storesToUpdate.indexOf(_transaction.store) === -1) {
        continue;
      }

      indexedDB.del(OFFLINE_STORE, _transaction._id);
      offlineTransactionsInError.splice(1, 0, offlineTransactions.splice(i, 1)[0]);
    }
  }
}

/**
 * Save transaction in error in collection
 */
function _saveTransactionsInError () {
  var _collection = lunarisExports._stores.lunarisOfflineTransactions.data;

  var _version = _collection.begin();

  for (var j = 0; j < offlineTransactionsInError.length; j++) {
    _collection.remove(utils.clone(offlineTransactionsInError[j]), _version);
    delete offlineTransactionsInError[j]._id;
    offlineTransactionsInError[j].isInError = true;
    _collection.add(offlineTransactionsInError[j], _version);
  }
  _collection.commit(_version);
  offlineTransactionsInError = [];
  storeUtils.saveState(lunarisExports._stores.lunarisOfflineTransactions, _collection);
}

/**
 * Push offline HTTP transactions when online in queue
 * @param {Function} callback
 */
function pushOfflineHttpTransactions (callback) {
  offlineTransactions = lunarisExports._stores.lunarisOfflineTransactions.data.getAll();

  function _processNextOfflineTransaction () {
    var _currentTransaction = offlineTransactions.shift();

    if (!_currentTransaction) {
      isPushingOfflineTransaction = false;
      _saveTransactionsInError();
      localStorage.set(OFFLINE_STORE, new Date());
      return callback();
    }

    transaction.begin();
    if (_currentTransaction.method === OPERATIONS.INSERT || _currentTransaction.method === OPERATIONS.UPDATE) {
      imports.upsert(_currentTransaction.store, _currentTransaction.data, false, _currentTransaction);
    }

    if (_currentTransaction.method === OPERATIONS.DELETE) {
      imports.deleteStore(_currentTransaction.store, _currentTransaction.data, _currentTransaction);
    }

    transaction.commit(function (isError) {
      // We must hold the transaction in error and its dependent transactions
      if (isError) {
        offlineTransactionsInError.push(_currentTransaction);
        if (_currentTransaction.method === OPERATIONS.INSERT) {
          _pushDependentTransactionsInError(storeUtils.getStore(_currentTransaction.store).storesToPropagateReferences);
        }
        hook.pushToHandlers(lunarisExports._stores.lunarisOfflineTransactions, 'syncError');
      }
      else {
        hook.pushToHandlers(lunarisExports._stores.lunarisOfflineTransactions, 'syncSuccess');
      }

      lunarisExports._stores.lunarisOfflineTransactions.data.remove(_currentTransaction);
      _processNextOfflineTransaction();
      // indexedDB.del(OFFLINE_STORE, _currentTransaction._id, _processNextOfflineTransaction);
    });
  }

  isPushingOfflineTransaction = true;
  _processNextOfflineTransaction();
}

/**
 * Compute offline HTTP transactions
 * POST / DELETE -> do nothing
 * PUT  / DELETE -> DELETE
 * PUT  / PUT    -> PUT
 * POST / PUT    -> POST
 * @param {Array} transactions
 * @param {String} storeName
 * @param {String} method ex: GET, POST, etc.
 * @param {String} request
 * @param {Array/Object} value
 */
function computeStoreTransactions (transactions, storeName, method, request, value) {
  var _mustBeAdded  = true;
  var _isArrayValue = Array.isArray(value);

  if (!_isArrayValue) {
    value = [value];
  }

  var _lengthValue = value.length;
  var _nbInInserts = 0;

  for (var j = _lengthValue - 1; j >= 0; j--) {
    for (var i = transactions.length - 1; i >= 0; i--) {
      var _transaction               = transactions[i];
      var _isTransactionValueAnArray = Array.isArray(_transaction.data);

      if (!_isTransactionValueAnArray) {
        _transaction.data = [_transaction.data];
      }

      var _lengthTransactionValue = _transaction.data.length;

      if (_transaction.store !== storeName) {
        continue;
      }

      for (var k = _lengthTransactionValue - 1; k >= 0; k--) {
        if (_transaction.method === OPERATIONS.INSERT && method === OPERATIONS.UPDATE) {
          if (value[j]._id !== _transaction.data[k]._id) {
            continue;
          }

          _transaction.data[k] = value[j];
          value.splice(j, 1);
          _nbInInserts++;

          if (!j && _nbInInserts === _lengthValue) {
            _mustBeAdded = false;
          }

          break;
        }

        if (_transaction.method === OPERATIONS.UPDATE && method === OPERATIONS.UPDATE) {
          if (value[j]._id !== _transaction.data[k]._id) {
            continue;
          }

          _transaction.data[k] = value[j];
          _mustBeAdded          = false;
          break;
        }

        if (
          (_transaction.method === OPERATIONS.INSERT && method === OPERATIONS.DELETE) ||
          (_transaction.method === OPERATIONS.UPDATE && method === OPERATIONS.DELETE)
        ) {
          if (value[j]._id !== _transaction.data[k]._id) {
            continue;
          }

          _transaction.data.splice(k, 1);

          if (!_transaction.data.length) {
            transactions.splice(i, 1);
          }

          if (_transaction.method === OPERATIONS.INSERT) {
            value.splice(j, 1);

            if (!value.length) {
              _mustBeAdded = false;
            }

            break;
          }
        }

        // Do not try to merge DELETE, it will be way to complicated to manage PUT->DELETE->DELETE with discontinuations
        // if (_transaction.method === OPERATIONS.DELETE && method === OPERATIONS.DELETE && _isArrayValue) {
        //   _transaction.value.push(value[j]);
        //   _mustBeAdded = false;
        //   break;
        // }
      }

      if (!_isTransactionValueAnArray) {
        _transaction.data = _transaction.data[0];
      }
    }
  }

  if (_mustBeAdded) {
    transactions.push({
      store  : storeName,
      method : method,
      url    : request,
      data   : _isArrayValue ? value : value[0],
      date   : Date.now()
    });
  }

  return transactions;
}

/**
 * Save Http transactions into a store
 * Make sure to compute actions before inserting in store
 * @param {String} storeName
 * @param {String} method
 * @param {String} request
 * @param {Object/Array} value
 */
function setOfflineHttpTransaction (storeName, method, request, value) {
  var _collection   = lunarisExports._stores.lunarisOfflineTransactions.data;
  var _transactions = _collection.getAll();

  imports._clear(OFFLINE_STORE, true);
  computeStoreTransactions(_transactions, storeName, method, request, value);

  var _version = _collection.begin();
  for (var i = 0; i < _transactions.length; i++) {
    delete _transactions[i]._id;
    _collection.add(_transactions[i], _version);
  }
  _collection.commit(_version);
  storeUtils.saveState(lunarisExports._stores.lunarisOfflineTransactions, _collection);
}

/**
 * Get date of the last synchro
 * @returns {String}
 */
function getLastSyncDate () {
  return localStorage.get(OFFLINE_STORE);
}


module.exports = {
  get isPushingOfflineTransaction () {
    return isPushingOfflineTransaction;
  },
  OFFLINE_STORE                : OFFLINE_STORE,
  updateOfflineTransactionData : updateOfflineTransactionData,
  pushOfflineHttpTransactions  : pushOfflineHttpTransactions,
  computeStoreTransactions     : computeStoreTransactions,
  setOfflineHttpTransaction    : setOfflineHttpTransaction,
  getLastSyncDate              : getLastSyncDate,
  setImportFunction            : function setImportFunction (fn) {
    imports[fn.name] = fn;
  }
};
