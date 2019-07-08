var utils            = require('../utils.js');
var OPERATIONS       = utils.OPERATIONS;
var exportsLunaris   = require('../exports.js');
var storeUtils       = require('./store.utils.js');
var logger           = require('../logger.js');
var offline          = require('../offline.js');
var storeDependecies = exportsLunaris.storeDependencies;

var eventsLocal = ['insert', 'update', 'delete', 'get', 'filterUpdated'];

var transactionIdGenerator = 0;

var currentTransactionId   = -1;
var actions                = []; // array of { operation, handler, arguments, id }
var currentAction          = null;
var currentActionIndex     = -1;
var uniqueEvents           = {};
var lastEvent              = null;
var isTransaction          = false;
var isCommitingTransaction = false;
var isRollback             = false;
var hookFn                 = null;
var endFn                  = null;

/**
 * Set pushToHandlers method
 * @param {Function} fn
 */
function registerHookFn (fn) {
  hookFn = fn;
}

/**
 * Cannel
 */
function _cancel () {
  actions                = [];
  isTransaction          = false;
  isCommitingTransaction = false;
  currentActionIndex     = -1;
  currentTransactionId   = -1;
  currentAction          = null;
  isRollback             = false;
  lastEvent              = null;
  uniqueEvents           = {};
  endFn                  = null;
}

/**
 * Begin a store transaction
 * @return {Function} rollback
 */
function begin () {
  if (isTransaction) {
    return;
  }

  isTransaction        = true;
  transactionIdGenerator++;
  currentTransactionId = transactionIdGenerator;
  return _cancel;
}

/**
 * Add action to the transaction
 */
function addAction (action) {
  actions.push(action);
}

/**
 * Add events to the transaction
 * @param {String} store name
 * @param {String} event event
 */
function addUniqueEvent (store, event) {
  uniqueEvents[store] = event;
}

function _end () {
  // Reset
  actions                = [];
  isTransaction          = false;
  isCommitingTransaction = false;
  currentActionIndex     = -1;
  currentTransactionId   = -1;
  currentAction          = null;
  lastEvent              = null;

  _sendUniqueEvents();
  uniqueEvents = {};

  if (endFn) {
    var _fn      = endFn;
    var _isError = isRollback;

    isRollback = false;
    endFn      = null;
    _fn(_isError);
  }
}


/**
 * Commit a transaction
 */
function commit (end) {
  if (isCommitingTransaction) {
    return;
  }

  endFn = end;

  isCommitingTransaction = true;
  _processNextAction();
}

/**
 * Process next action
 */
function _processNextAction () {
  currentActionIndex++;
  var _action = actions[currentActionIndex];

  if (!_action) {
    return _end();
  }

  currentAction = _action;

  var _arguments = [];
  var _indexes   = Object.keys(currentAction.arguments);
  for (var i = 0; i < _indexes.length; i++) {
    _arguments.push(currentAction.arguments[_indexes[i]]);
  }
  currentAction.handler.apply(null, _arguments);
}

/**
 * Pipe hooks from hooks module
 * Pay attention to filterUpdated event. We only want at most one 'filterUpdated' event by store
 * @param {String} storeName
 * @param {Boolean} isLocalStore
 * @param {Boolean} isFilter
 * @param {String} event
 * @param {*} payload
 * @param {Int} transactionId
 */
function pipe (store, event, payload, transactionId) {
  // We do not care;
  if (!currentAction || currentAction.id !== transactionId || currentAction.store !== store.name) {
    return;
  }

  if (!currentAction.payload) {
    currentAction.payload = payload;
    if (!store.isStoreObject && payload && payload.length === 1) {
      currentAction.payload = currentAction.payload[0];
    }
  }

  if (store.isLocal || !offline.isOnline) {
    if (store.isFilter && event !== 'filterUpdated') {
      return;
    }

    if (eventsLocal.indexOf(event) !== -1) {
      return _processNextAction();
    }

    return;
  }

  if (event === 'errorHttp' || event === 'error') {
    if (isRollback) {
      // If there is an error in the rollback, we do not rollback the rollback, we stop the trnasaction
      return _end();
    }

    isRollback = true;
    return rollback(store.name, payload);
  }

  if (
    (currentAction.operation === OPERATIONS.INSERT && event === 'inserted') ||
    (currentAction.operation === OPERATIONS.LIST   && event === 'get'     ) ||
    (currentAction.operation === OPERATIONS.UPDATE && event === 'updated' ) ||
    (currentAction.operation === OPERATIONS.DELETE && event === 'deleted' )
  ) {
    lastEvent = event;
    if (!store.isFilter) {
      _processNextAction();
    }
  }
  else if (
    ((currentAction.operation === OPERATIONS.INSERT && lastEvent === 'inserted')  ||
    (currentAction.operation === OPERATIONS.LIST    && lastEvent === 'get'     )  ||
    (currentAction.operation === OPERATIONS.UPDATE  && lastEvent === 'updated' )  ||
    (currentAction.operation === OPERATIONS.DELETE  && lastEvent === 'deleted' )) &&
    event === 'filterUpdated'
  ) {
    lastEvent = event;
    _processNextAction();
  }
}

/**
 * Rollback an action
 */
function rollback () {
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
}

/**
 * Send captured store events
 */
function _sendUniqueEvents () {
  var _stores            = Object.keys(uniqueEvents);
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
  for (i = 0; i < _storesToUpdate.length; i++) {
    var _storesUpdated = _eventByStores[_storesToUpdate[i]];

    if (_storesUpdated.length) {
      var _store = storeUtils.getStore(_storesUpdated[_storesUpdated.length - 1]);
      hookFn(_store, 'filterUpdated');
    }
  }
}

module.exports = {
  _reset : _end, // only for tests

  get isTransaction          () { return isTransaction;          },
  get isCommitingTransaction () { return isCommitingTransaction; },

  begin          : begin,
  commit         : commit,
  pipe           : pipe,
  addAction      : addAction,
  addUniqueEvent : addUniqueEvent,
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
