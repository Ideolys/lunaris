var exportsLunaris   = require('../exports.js');
var storeUtils       = require('./store.utils.js');
var queue            = require('../utils.js').queue;
var storeDependecies = exportsLunaris.storeDependencies;

var transactionIdGenerator = 0;

var currentTransactionId   = -1;
var isCommitingTransaction = false;
var hookFn                 = null;
var isTransaction          = false;
var transactions           = {};

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
  var _action = transactions[transactionId].actions[iterator];

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
 * Rollback an action
 */
/* function rollback () {
  var _actionsToRollback = [];
  for (var i = currentActionIndex - 1; i >= 0; i--) {
    var _operation = OPERATIONS.UPDATE;
    var _arguments = [
      '@' + actions[i].store,
      actions[i].payload
    ];

    if (actions[i].operation === OPERATIONS.LIST) {
      continue;
    }
    else if (actions[i].operation === OPERATIONS.INSERT) {
      _operation = OPERATIONS.DELETE;
      if (Array.isArray(_arguments[1])) {
        _arguments[1] = _arguments[1][0];
        if (_arguments.length > 1) {
          logger.warn('Rollback error in Begin/Commit, INSERT payload has mulitple item. However, DELETE only supports one item. First item has been used');
        }
      }
    }
    else if (actions[i].operation === OPERATIONS.DELETE) {
      var _payload = utils.clone(_arguments[1]);
      _operation = OPERATIONS.INSERT;
      if (!Array.isArray(_payload)) {
        _payload = [_payload];
      }
      for (var j = 0; j < _payload.length; j++) {
        delete _payload[j]._id;
        delete _payload[j]._version;
      }
      if (!Array.isArray(_arguments[1])) {
        _payload = _payload[0];
      }
      _arguments[1] = _payload;
    }

    _actionsToRollback.push({
      id        : currentAction.id,
      store     : actions[i].store,
      operation : _operation,
      handler   : actions[i].rollback,
      arguments : _arguments
    });
  }

  actions            = _actionsToRollback;
  currentActionIndex = -1;
  _processNextAction();
} */

/**
 * Send captured store events
 * @param {Function} callback
 */
function _sendUniqueEvents (transactionId, callback) {
  var _stores            = Object.keys(transactions[transactionId].uniqueEvents);
  var _eventByStores     = {};

  for (var i = 0; i < _stores.length; i++) {
    var _deps         = storeDependecies[_stores[i]] || [];
    var _hasBeenAdded = false;

    for (var j = 0; j < _deps.length; j++) {
      if (!_eventByStores[_deps[j]]) {
        _eventByStores[_deps[j]] = [];
      }

      if (!_hasBeenAdded) {
        _eventByStores[_deps[j]].push(_stores[i]);
        _hasBeenAdded = true;
      }
    }
    _hasBeenAdded = false;
  }

  var _storesToUpdate = Object.keys(_eventByStores);

  queue(_storesToUpdate, function (storeToUpdate, next) {
    var _storesUpdated = _eventByStores[storeToUpdate];

    if (!_storesUpdated.length) {
      return next();
    }

    var _store = storeUtils.getStore(_storesUpdated[_storesUpdated.length - 1]);
    hookFn(_store, 'filterUpdated', null, null, next);
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
