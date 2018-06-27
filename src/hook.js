
var utils = require('./utils.js');

function _extractHookAndStore (hook) {
  var _hook = /(get|insert|update|delete)@(.*)/.exec(hook);
  if (!_hook || _hook.length < 3) {
    throw new Error('A hook must be: <get|insert|update>@<store>');
  }

  return  {
    event : _hook[1],
    store : _hook[2]
  }
}

function _isFunction (handler) {
  if (typeof handler !== 'function') {
    throw new Error('handler must be a Function');
  }
}

/**
 * Register a hook
 * @param {String} hook must be <action>@<store>
 * @param {Function} handler
 */
function registerHook (hook, handler) {
  _isFunction(handler);
  var _hook          = _extractHookAndStore(hook);
  var lunarisExports = require('./exports.js');
  var _store         = lunarisExports._stores[_hook.store];
  if (!_store) {
    throw new Error('Cannor register hook "' + hook + '", store "' + _hook.store + '" has not been defined!');
  }

  if (!_store.hooks[_hook.event]) {
    _store.hooks[_hook.event] = [];
  }
  _store.hooks[_hook.event].push(handler);
}

function removeHook (hook, handler) {
  _isFunction(handler);
  var _hook          = _extractHookAndStore(hook);
  var lunarisExports = require('./exports.js');
  var _store         = lunarisExports._stores[_hook.store];
  if (!_store) {
    throw new Error('Cannor remove hook "' + hook + '", store "' + _hook.store + '" has not been defined!');
  }

  var _handlers = _store.hooks[_hook.event];
  if (!_handlers) {
    throw new Error('Cannor remove hook "' + hook + '", it has not been defined!');
  }

  for (var i = 0; i < _handlers.length; i++) {
    if (_handlers[i] === handler) {
      _handlers.splice(i, 1);
    }
  }
}

/**
 * Push payload to given hook
 * @param {Object} store
 * @param {String} hook
 * @param {*} payload
 */
function pushToHandlers (store, hook, payload) {
  var _storeHooks = store.hooks[hook];
  if (!_storeHooks) {
    return;
  }

  for (var i = 0; i < _storeHooks.length; i++) {
    _storeHooks[i](utils.clone(payload));
  }
}

exports.hook           = registerHook;
exports.removeHook     = removeHook;
exports.pushToHandlers = pushToHandlers;
