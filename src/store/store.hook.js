var logger      = require('../logger.js');
var transaction = require('./store.transaction.js');

transaction.registerHookFn(pushToHandlers);

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
 * @param {Int} transactionId
 */
function pushToHandlers (store, hook, payload, isMultipleArgsPayload, transactionId) {
  var _storeHooks = store.hooks[hook];

  // console.log(store.name, hook);

  if (!_storeHooks) {
    if (transaction.isCommitingTransaction) {
      transaction.pipe(store, hook, payload, transactionId);
    }
    return;
  }

  if (!Array.isArray(payload)) {
    payload = [payload];
  }

  if (transaction.isCommitingTransaction && hook === 'filterUpdated') {
    transaction.addUniqueEvent(store.name, hook);
    transaction.pipe(store, hook, payload, transactionId);
    return;
  }

  for (var i = 0; i < _storeHooks.length; i++) {
    if (isMultipleArgsPayload) {
      _storeHooks[i](payload);
    }
    else {
      _storeHooks[i].apply(null, payload);
    }
  }

  if (transaction.isCommitingTransaction) {
    transaction.pipe(store, hook, payload, transactionId);
  }
}

exports.hook           = registerHook;
exports.removeHook     = removeHook;
exports.pushToHandlers = pushToHandlers;
