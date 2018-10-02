var logger           = require('../logger.js');
var exportsLunaris   = require('../exports.js');
var storeUtils       = require('./store.utils.js');
var storeDependecies = exportsLunaris.storeDependencies;

var events                 = {};
var isTransaction          = false;
var isCommitingTransaction = false;

/**
 * Begin a transaction
 * @returns {Int} the transaction id
 */
function begin () {
  isTransaction = true;
}

/**
 * Commit a transaction
 * @param {Int} transactionId
 */
function commit () {
  isCommitingTransaction = true;
  var _stores            = Object.keys(events);
  var _eventByStores     = {};

  for (var i = 0; i < _stores.length; i++) {
    var _deps = storeDependecies[_stores[i]];
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
      pushToHandlers(_store, 'filterUpdated');
    }
  }

  // Reset
  isTransaction          = false;
  isCommitingTransaction = false;
  events                 = {};
}

/**
 * Add event to send
 * @param {Stirng} store name
 * @param {String} event event
 */
function _addEvent (store, event) {
  events[store] = event;
}


/**
 * Extract the store name and the event from the given string
 * @param {String} hook
 * @returns {Object} { event : String, store : String }
 */
function _extractHookAndStore (hook) {
  var _hook = /(.*)@(.*)/.exec(hook);
  if (!_hook || _hook.length < 3) {
    throw new Error('A hook must be: <event>@<store>');
  }

  return {
    event : _hook[1],
    store : _hook[2]
  };
}

/**
 * Throw an error if the value is not a fucntion
 * @param {*} handler
 */
function _isFunction (handler) {
  if (typeof handler !== 'function') {
    throw new Error('A handler must be a Function');
  }
}

/**
 * Register a hook
 * @param {String} hook must be <action>@<store>
 * @param {Function} handler
 * @param {Boolean} isUnique default false, if true, check if the handler already exists
 */
function registerHook (hook, handler, isUnique) {
  try {
    _isFunction(handler);
    var _hook          = _extractHookAndStore(hook);
    var lunarisExports = require('../exports.js');
    var _store         = lunarisExports._stores[_hook.store];
    if (!_store) {
      throw new Error('Cannot register hook "' + hook + '", store "' + _hook.store + '" has not been defined!');
    }

    if (!_store.hooks[_hook.event]) {
      _store.hooks[_hook.event] = [];
    }

    if (isUnique) {
      var _handlers     = _store.hooks[_hook.event];
      var _hasBeenFound = false;
      for (var i = 0; i < _handlers.length; i++) {
        if (_handlers[i].toString() === handler.toString()) {
          _hasBeenFound = true;
          break;
        }
      }

      if (_hasBeenFound) {
        return;
      }
    }

    _store.hooks[_hook.event].push(handler);
    console.log(_store.name, 'register', hook);
  }
  catch (e) {
    logger.warn(['lunaris.hook:' + hook], e);
  }
}

/**
 * Remove hook
 * @param {String} hook must be <action>@<store>
 * @param {Function} handler
 */
function removeHook (hook, handler) {
  try {
    _isFunction(handler);
    var _hook          = _extractHookAndStore(hook);
    var lunarisExports = require('../exports.js');
    var _store         = lunarisExports._stores[_hook.store];
    if (!_store) {
      throw new Error('Cannot remove hook "' + hook + '", store "' + _hook.store + '" has not been defined!');
    }

    var _handlers = _store.hooks[_hook.event];
    if (!_handlers) {
      throw new Error('Cannot remove hook "' + hook + '", it has not been defined!');
    }

    for (var i = 0; i < _handlers.length; i++) {
      if (_handlers[i] === handler) {
        _handlers.splice(i, 1);
        console.log(_store.name, 'remove', hook);
      }
    }
  }
  catch (e) {
    logger.warn(['lunaris.removeHook:' + hook], e);
  }
}

/**
 * Push payload to given hook
 * @param {Object} store
 * @param {String} hook
 * @param {*} payload
 * @param {Boolean} isMultipleArgsPayload
 */
function pushToHandlers (store, hook, payload, isMultipleArgsPayload) {
  var _storeHooks = store.hooks[hook];
  if (!_storeHooks) {
    return;
  }

  if (isTransaction && !isCommitingTransaction && hook === 'filterUpdated') {
    if (!store.isStoreObject) {
      throw new Error('Only a local store can be registered in a transaction!');
    }
    return _addEvent(store.name, hook);
  }

  if (!Array.isArray(payload)) {
    payload = [payload];
  }

  console.log(2, new Date(), store.name, hook, payload);

  for (var i = 0; i < _storeHooks.length; i++) {
    if (isMultipleArgsPayload) {
      _storeHooks[i](payload);
    }
    else {
      _storeHooks[i].apply(null, payload);
    }
  }
}

exports.hook           = registerHook;
exports.removeHook     = removeHook;
exports.pushToHandlers = pushToHandlers;
exports.begin         = begin;
exports.commit        = commit;
