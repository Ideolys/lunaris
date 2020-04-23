var lunarisExports              = require('../exports.js');
var utils                       = require('../utils.js');
var storeUtils                  = require('./store.utils.js');
var logger                      = require('../logger.js');
var collection                  = require('./store.collection.js');
var offline                     = require('../offline.js');
var crudUtils                   = require('./crud/crudUtils.js');
var upsertCRUD                  = require('./crud/upsert.js');
var getCRUD                     = require('./crud/get.js');
var clearCrud                   = require('./crud/clear.js');
var deleteCrud                  = require('./crud/delete.js');
var storeUrl                    = require('./store.url.js');
var indexedDB                   = require('../localStorageDriver.js').indexedDB;
var emptyObject                 = {};

lunarisExports._stores.lunarisErrors = {
  name                  : 'lunarisErrors',
  data                  : collection.collection(null, false, null, null, null, 'lunarisErrors', null, utils.clone),
  filters               : [],
  paginationLimit       : 50,
  paginationOffset      : 0,
  paginationCurrentPage : 1,
  hooks                 : {},
  nameTranslated        : '${store.lunarisErrors}',
  isLocal               : true,
  storesToPropagate     : [],
  isStoreObject         : false,
  massOperations        : {},
  clone                 : utils.clone
};

upsertCRUD.setImportFunction(validate);

/** =================================================  *
 *                   Public methods                    *
 *  ================================================= **/

/**
 * Set store pagination
 * @param {String} store
 * @param {Int} page
 * @param {Int}} limit
 */
function setPagination (store, page, limit) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);

    _options.store.paginationLimit       = limit || _options.store.paginationLimit;
    _options.store.paginationCurrentPage = page  || 1;
    _options.store.paginationOffset      = (_options.store.paginationLimit * _options.store.paginationCurrentPage) - _options.store.paginationLimit;
    storeUtils.saveState(_options.store, _options.collection);
  }
  catch (e) {
    logger.warn(['lunaris.setPagination' + store], e);
  }
}

/**
 * Get firt value or the value identified by its _id
 * @param {String} store
 * @param {Int} id lunaris _id value
 * @param {Boolean} isPrimaryKey
 */
function getOne (store, id, isPrimaryKey) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);
    var _item;

    if (id)  {
      _item = _options.collection.get(id, isPrimaryKey);
    }
    else {
      _item = _options.collection.getFirst();
    }

    if (!_item) {
      return;
    }

    return utils.cloneAndFreeze(_item);
  }
  catch (e) {
    logger.warn(['lunaris.getOne' + store], e);
  }
}

/**
 * Rollback a store to the specified version
 * @param {String} store
 * @param {Int} version
 */
function rollback (store, version) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);
    _options.collection.rollback(version);
  }
  catch (e) {
    logger.warn(['lunaris.rollback' + store], e);
  }
}

/**
 * get store default value
 * @param {String} store
 * @return {Object}
 */
function getDefaultValue (store) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);
    if (!_options.store.defaultValue) {
      return emptyObject;
    }

    return utils.clone(_options.store.defaultValue);
  }
  catch (e) {
    logger.warn(['lunaris.getDefaultValue' + store], e);
  }
}

/**
 * Validate value against store valdiator
 * @param {String} store
 * @param {Array/Object} value
 * @param {Boolean} isUpdate
 * @param {Function} callback
 * @param {String} eventName internal arg to overwrite the validate error name
 */
function validate (store, value, isUpdate, callback, eventName) {
  try {
    var _isUpdate = isUpdate;
    storeUtils.checkArgs(store, value, true);

    if (!callback) {
      callback  = isUpdate;
      _isUpdate = false;
      if ((Array.isArray(value) && value[0]._id) || value._id) {
        _isUpdate = true;
      }
    }

    var _store = storeUtils.getStore(store);
    if (_store.validateFn) {
      var _valueToValidate = value;
      if (_store.isStoreObject && Array.isArray(value)) {
        throw new Error('The store "' + store.name + '" is a store object, you cannot add or update multiple elements!');
      }
      if (!_store.isStoreObject && !Array.isArray(value)) {
        _valueToValidate = [value];
      }

      var _isValidatingPK = offline.isOnline ? _isUpdate : false; // No primary validation
      return _store.validateFn(_valueToValidate, _store.onValidate, _isValidatingPK, function (err) {
        if (err.length) {
          for (var i = 0; i < err.length; i++) {
            logger.warn(['lunaris.' + (_isUpdate ? 'update' : 'insert') + store + ' Error when validating data'], err[i]);
          }
          return callback(false, err);
        }

        callback(true);
      });
    }

    throw new Error('The store does not have a map! You cannot validate a store without a map.');
  }
  catch (e) {
    logger.warn([eventName || ('lunaris.validate' + store)], e);
  }
}

/**
 * Create url for a store
 * @param {String} store  ex: '@store'
 * @param {String} method  ex: 'PUT'
 * @param {*} primaryKey @optional
 */
function createUrl (store, method, primaryKey) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);

    if (!method) {
      throw new Error('Must provide a method, ex: GET, POST, etc.');
    }

    var _request = storeUrl.create(_options.store, method, primaryKey);

    if (_request) {
      return _request.request;
    }

    return;
  }
  catch (e) {
    logger.warn(['lunaris.createUrl'], e);
  }
}

exports.get             = getCRUD.get;
exports.load            = getCRUD.load;
exports.getOne          = getOne;
exports.insert          = upsertCRUD.upsert;
exports.update          = upsertCRUD.upsert;
exports.upsert          = upsertCRUD.upsert;
exports.delete          = deleteCrud.delete;
exports.clear           = clearCrud.clear;
exports.rollback        = rollback;
exports.getDefaultValue = getDefaultValue;
exports.validate        = validate;
exports.setPagination   = setPagination;
exports.createUrl       = createUrl;
