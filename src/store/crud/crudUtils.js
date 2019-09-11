var storeUtils = require('../store.utils.js');
var hook       = require('../store.hook.js');
var utils      = require('../../utils.js');
var queue      = utils.queue;

/**
 * Before action :
 *  - check args
 * @param {String} store
 * @param {Array/Object} value
 * @param {Boolean} isNoValue
 * @returns {Object} {
 *   value,
 *   store,
 *   collection
 * }
 */
function beforeAction (store, value, isNoValue) {
  storeUtils.checkArgs(store, value, isNoValue);

  var _store      = storeUtils.getStore(store);
  var _collection = storeUtils.getCollection(_store);

  if (!isNoValue) {
    value = _store.clone(value);
  }

  return {
    value      : value,
    store      : _store,
    collection : _collection
  };
}

/**
 * After action : freeze values
 * @param {Object} store
 * @param {String} event
 * @param {Object/Array} value
 * @param {String} message
 * @param {Int} transactionId
 */
function afterAction (store, event, value, message, callback) {
  var _value = null;
  if (value) {
    _value = utils.cloneAndFreeze(value, store.clone);
  }

  hook.pushToHandlers(store, event, _value, null, function () {
    if (message) {
      return hook.pushToHandlers(store, 'success', message, null, callback);
    }

    callback();
  });
}

/**
 * Push commit res objects to handlers
 * @param {Object} store
 * @param {String} hookKey
 * @param {Array} res
 * @param {Int} transactionId
 */
function pushCommitResToHandlers (store, hookKey, res, callback) {
  if (res && res.length) {
    if (store.isStoreObject) {
      res = res[0];
    }
    res = utils.cloneAndFreeze(res, store.clone);
    return hook.pushToHandlers(store, hookKey, res, null, callback);
  }

  callback();
}

/**
 * Propagate store actions to the dependent stores (joins)
 * @param {Object} store
 * @param {Object} data
 * @param {String} operation
 * @param {Int} transactionId
 */
function propagate (store, data, operation, callback) {
  if (!store.storesToPropagate.length) {
    return callback();
  }

  if ((!data && operation !== utils.OPERATIONS.DELETE) || (data && Array.isArray(data) && !data.length)) {
    return callback();
  }

  queue(store.storesToPropagate, function (storeToPropagate, next) {
    var _store            = storeUtils.getStore('@' + storeToPropagate);
    var _collection       = storeUtils.getCollection(_store);
    var _res              = _collection.propagate(store.name, data, operation);
    pushCommitResToHandlers(_store, 'update', _res, next);
  }, callback);
}

/**
 * Propagate references to the dependent stores (joins)
 * @param {Object} store
 * @param {Object/Array} data
 * @param {Int} transactionId
 */
function propagateReferences (store, data, callback) {
  if (!store.storesToPropagateReferences || !store.storesToPropagateReferences.length) {
    return callback();
  }

  queue(store.storesToPropagateReferences, function (storeToPropagate, next) {
    var _store            = storeUtils.getStore('@' + storeToPropagate);
    var _collection       = storeUtils.getCollection(_store);
    var _res              = _collection.propagateReferences(store.name, data);
    pushCommitResToHandlers(_store, 'update', _res, next);
  }, callback);
}

exports.beforeAction            = beforeAction;
exports.afterAction             = afterAction;
exports.pushCommitResToHandlers = pushCommitResToHandlers;
exports.propagate               = propagate;
exports.propagateReferences     = propagateReferences;
