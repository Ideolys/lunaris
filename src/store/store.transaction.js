var exportsLunaris   = require('../exports.js');
var storeUtils       = require('./store.utils.js');
var queue            = require('../utils.js').queue;
var storeDependecies = exportsLunaris.storeDependencies;
var logger           = require('../logger.js');

var transactionIdGenerator = 0;

var currentTransactionId   = -1;
var isCommitingTransaction = false;
var hookFn                 = null;
var isTransaction          = false;
var transactions           = {};

/**
 * https://stackoverflow.com/questions/1187518/how-to-get-the-difference-between-two-arrays-in-javascript
 */
Array.prototype.diff = function (a) {
  return this.filter(function (i) {
    return a.indexOf(i) < 0;
  });
};

/**
 * Set pushToHandlers method
 * @param {Function} fn
 */
function registerHookFn (fn) {
  hookFn = fn;
}

/**
 * Begin a store transaction
 * @return {Function} rollback
 */
function begin () {
  return logger.deprecated('lunaris.begin is deprecated!');

  if (isTransaction) {
    return;
  }

  isTransaction = true;
  transactionIdGenerator++;
  currentTransactionId               = transactionIdGenerator;
  transactions[currentTransactionId] = { actions : [], uniqueEvents : {}, isCommitingTransaction : false, isError : false };
}

/**
 * Add action to the transaction
 */
function addAction (action) {
  transactions[action.id].actions.push(action);
}

/**
 * Add events to the transaction
 * @param {Int} transactionId
 * @param {String} store name
 * @param {String} event event
 */
function addUniqueEvent (transactionId, store, event) {
  if (!transactions[transactionId]) {
    return;
  }

  transactions[transactionId].uniqueEvents[store] = event;
}

/**
 * Determine if transaction is in error
 * @param {Int} transactionId
 */
function addErrorEvent (transactionId) {
  if (!transactions[transactionId]) {
    return;
  }

  transactions[transactionId].isError = true;
}

/**
 * Enn transaction by sending unique vents and call commit callback
 * @param {Int} transactionId
 * @param {Function} callback
 */
function _end (transactionId, callback) {
  // Reset
  _sendUniqueEvents(transactionId, function () {
    callback();
  });
}


/**
 * Commit a transaction
 * @param {Function} callback
 */
function commit (callback) {
  return logger.deprecated('lunaris.commit is deprecated!');

  if (!transactions[currentTransactionId]) {
    return;
  }

  if (transactions[currentTransactionId].isCommitingTransaction) {
    return;
  }

  isTransaction = false;
  transactions[currentTransactionId].isCommitingTransaction = true;
  _processNextAction(-1, currentTransactionId, callback);
}

/**
 * Process next action
 * @param {Integer} transactionId
 * @param {Function} callback
 */
function _processNextAction (iterator, transactionId, callback) {
  iterator++;

  var _action = null;
  if (transactions[transactionId]) {
    _action = transactions[transactionId].actions[iterator];
  }

  if (!_action) {
    return _end(transactionId, function () {
      var isError = transactions[transactionId].isError;
      delete transactions[transactionId];
      if (callback) {
        callback(isError);
      }
    });
  }

  var _arguments = [];
  var _indexes   = Object.keys(_action.arguments);
  for (var i = 0; i < _indexes.length; i++) {
    _arguments.push(_action.arguments[_indexes[i]]);
  }

  function _next () {
    _processNextAction(iterator, transactionId, callback);
  }

  _arguments.push(_next);
  _action.handler.apply(null, _arguments);
}

/**
 * Reduce stores that have sent filterUpdated or reset event to avoid
 * @param {Int} nbStores number of stores to reset
 * @param {Array} stores stores that have sent a reset or filterUpdated event
 * @param {Array} parentStores parent store that will receive a reset event
 * @param {Object} eventByStores { parentStore : [store1, storeN], ... }
 * @param {Array} storesToReset stores to reset (set by the function which is recursive)
 */
function reduce (nbStores, stores, parentStores, eventByStores, storesToReset) {
  storesToReset = storesToReset || [];

  if (!nbStores) {
    return storesToReset;
  }

  if (nbStores === 1) {
    for (var i = 0; i < parentStores.length; i++) {
      storesToReset.push(eventByStores[parentStores[i]][0]);
    }

    return storesToReset;
  }

  for (var i = 0; i < stores.length; i++) {
    var nbFound     = 0;
    var storesFound = [];
    for (var j = 0; j < parentStores.length; j++) {

      if (!eventByStores[parentStores[j]]) {
        continue;
      }

      for (var k = 0; k < eventByStores[parentStores[j]].length; k++) {
        if (eventByStores[parentStores[j]][k] === stores[i]) {
          nbFound++;
          storesFound.push(parentStores[j]);

          if (nbFound === nbStores) {
            storesToReset.push(stores[i]);

            if (nbStores > 1) {
              parentStores = parentStores.diff(storesFound);
            }

            break;
          }
        }
      }
    }
  }

  return reduce(nbStores - 1, stores, parentStores, eventByStores, storesToReset);
}

/**
 * Send captured store events
 * @param {Function} callback
 */
function _sendUniqueEvents (transactionId, callback) {
  var _stores                = Object.keys(transactions[transactionId].uniqueEvents);
  var _eventByStores         = {};
  var _storesSendEvents      = [];
  var _storesToResetIfNoDeps = [];

  for (var i = 0; i < _stores.length; i++) {
    var _deps         = storeDependecies[_stores[i]] || [];
    var _hasBeenAdded = false;

    exportsLunaris._stores[_stores[i]].paginationOffset      = 0;
    exportsLunaris._stores[_stores[i]].paginationCurrentPage = 1;

    for (var j = 0; j < _deps.length; j++) {
      if (!_eventByStores[_deps[j]]) {
        _eventByStores[_deps[j]] = [];
      }

      if (_eventByStores[_deps[j]].indexOf(_stores[i]) === -1) {
        _eventByStores[_deps[j]].push(_stores[i]);
      }

      if (!_hasBeenAdded) {
        _storesSendEvents.push(_stores[i]);
        _hasBeenAdded = true;
      }
    }

    if (!_hasBeenAdded) {
      _storesToResetIfNoDeps.push(_stores[i]);
    }
    _hasBeenAdded = false;
  }

  var _storesToUpdate = Object.keys(_eventByStores);
  var _storesToReset  = reduce(_storesToUpdate.length, _storesSendEvents, _storesToUpdate, _eventByStores).concat(_storesToResetIfNoDeps);

  queue(_storesToReset, function (storeToUpdate, next) {
    var _store = storeUtils.getStore(storeToUpdate);
    hookFn(_store, 'reset', null, null, next);
  }, callback);
}

module.exports = {
  get isTransaction          () { return isTransaction;          },
  get isCommitingTransaction () { return isCommitingTransaction; },

  begin          : begin,
  commit         : commit,
  addAction      : addAction,
  addUniqueEvent : addUniqueEvent,
  addErrorEvent  : addErrorEvent,
  registerHookFn : registerHookFn,
  reduce         : reduce,

  /**
   * Get current transaction id
   */
  getCurrentTransactionId : function () {
    return currentTransactionId;
  },

  /**
   * Get new transaction id
   */
  getNewTransactionId : function () {
    return transactionIdGenerator++;
  }
};
