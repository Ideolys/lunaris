var utils      = require('../../utils.js');
var storeUtils = require('../store.utils.js');

var queryResultSet = require('./queryResultSet.js');

/**
 * View
 * @param {String} store
 */
function CollectionResultSet (store) {
  // Init result set
  var _store = storeUtils.getStore(store);

  if (_store.isStoreObject) {
    throw new Error('Cannot initialize a CollectionResultSet on a store object');
  }

  var _collection = storeUtils.getCollection(_store);
  var _data       = utils.clone(_collection.getAll());

  var _resultSet = queryResultSet(_data);
  return _resultSet;
}

module.exports = CollectionResultSet;
