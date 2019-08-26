var logger         = require('../logger.js');
var lunarisExports = require('../exports.js');

/**
 * Queue
 * @param {Array} items
 * @param {Object/Array} payload payload for the handler
 * @param {Function} done function called when every items have been processed
 */
function queue (items, payload, done) {
  var iterator = -1;

  function next () {
    ++iterator;
    var item = items[iterator];

    if (!item) {
      return done();
    }

    items[iterator](payload, next);
  }

  next(true);
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
 * @param {Boolean} isInternalHook
 */
function registerHook (hook, handler, isUnique, isInternalHook) {
  try {
    _isFunction(handler);
    var _hook          = _extractHookAndStore(hook);
    var lunarisExports = require('../exports.js');
    var _store         = lunarisExports._stores[_hook.store];
    if (!_store) {
      throw new Error('Cannot register hook "' + hook + '", store "' + _hook.store + '" has not been defined!');
    }

    if (!_store.isInternalHooks) {
      _store.isInternalHooks = {};
    }

    if (!_store.hooks[_hook.event]) {
      _store.hooks[_hook.event]           = [];
      _store.isInternalHooks[_hook.event] = [];
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

    // If only 1 parameter is defined, the handler is synchrone
    var _hookHandler = handler;
    if (handler.length <= 1) {
      _hookHandler = function (payload, next) {
        handler(payload);
        next();
      };
    }

    _store.hooks[_hook.event].push(_hookHandler);
    _store.isInternalHooks[_hook.event].push(isInternalHook || false);
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
        _store.isInternalHooks[_hook.event].splice(i, 1);
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
 * @param {Int} transactionId
 */
function pushToHandlers (store, hook, payload, callback) {
  var _storeHooks = store.hooks[hook];

  if (!callback) {
    callback = function () {};
  }

  if (!_storeHooks) {
    return callback();
  }

  queue(_storeHooks, payload, callback);
}

/**
 * Remove all hooks
 * Internal hooks are not removed
 */
function removeAllHooks () {
  var _stores = lunarisExports._stores;
  for (var _storename in _stores) {
    var _hooks = _stores[_storename].hooks;
    for (var _hook in _hooks) {
      var _handlers        = _hooks[_hook];
      var _isInternalHooks =  _stores[_storename].isInternalHooks[_hook];

      for (var i = _handlers.length - 1; i >= 0; i--) {
        if (_isInternalHooks && _isInternalHooks[i]) {
          continue;
        }

        _handlers.splice(i, 1);
        _isInternalHooks.splice(i, 1);
      }
    }
  }
}

exports.hook           = registerHook;
exports.removeHook     = removeHook;
exports.pushToHandlers = pushToHandlers;
exports.removeAllHooks = removeAllHooks;
