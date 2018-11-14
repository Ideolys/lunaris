var logger         = require('./logger.js');
var lunarisExports = require('./exports.js');

var database;
function _isDatabaseExists (dbname, callback) {
  var _request = window.indexedDB.open(dbname);
  var _existed = true;
  _request.onsuccess = function () {
    _request.result.close();
    if (!_existed) {
      window.indexedDB.deleteDatabase(dbname);
    }
    callback(_existed);
  };
  _request.onupgradeneeded = function () {
    _existed = false;
  };
}

/**
 * Init database
 * @param {int} versionNumber
 * @param {Array} stores array of string
 * @param {Function} callback optional
 */
function initIndexedDB (versionNumber, stores, callback) {
  window.indexedDB      = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  if (!window.indexedDB) {
    if (callback) {
      callback(true);
    }
    return;
  }
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || { READ_WRITE : 'readwrite' };
  window.IDBKeyRange    = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

  var _request;
  _isDatabaseExists('lunaris', function (isExisted) {
    if (isExisted) {
      _request = window.indexedDB.open('lunaris', versionNumber);
    }
    else {
      _request = window.indexedDB.open('lunaris');
    }

    _request.onError = function (e) {
      logger.warn('Error when requesting indexedDB', e);
      if (callback) {
        callback(true);
      }
    };

    _request.onsuccess = function (e) {
      database = e.target.result;
      if (callback) {
        callback(null, database);
      }

      database.onError = function (e) {
        logger.warn('[IndexedDB]', e.target.errorCode);
      };
    };

    _request.onupgradeneeded = function (e) {
      var _db = e.target.result;

      for (var i = 0; i < stores.length; i++) {
        var _key = stores[i];
        if (!_db.objectStoreNames.contains(_key)) {
          _db.createObjectStore(_key, { keyPath : '_rowId' });
        }
      }

      if (!_db.objectStoreNames.contains('_states')) {
        _db.createObjectStore('_states', { keyPath : 'store' });
      }
    };
  });
}

module.exports = {
  indexedDB : {
    init : initIndexedDB,
    /**
     * Add a value
     * @param {String} key
     * @param {*} value
     */
    add  : function add (key, value) {
      if (!database) {
        return;
      }

      var _transaction = database.transaction([key], 'readwrite');
      var _objectStore = _transaction.objectStore(key);
      _objectStore.add(value);
    },

    /**
     * IUpdate a value
     * @param {String} key
     * @param {*} value
     */
    upsert : function upsert (key, value) {
      if (!database) {
        return;
      }

      var _transaction = database.transaction([key], 'readwrite');
      var _objectStore = _transaction.objectStore(key);
      _objectStore.put(value);
    },

    /**
     * Delete a value
     * @param {String} key
     * @param {*} value
     */
    del : function del (key, value) {
      if (!database) {
        return;
      }

      var _transaction = database.transaction([key], 'readwrite');
      var _objectStore = _transaction.objectStore(key);
      _objectStore.delete(value);
    },

    /**
     * Get all value
     * @param {String} key
     * @param {Function} callback
     */
    getAll : function getAll (key, callback) {
      if (!database) {
        return;
      }

      var _transaction = database.transaction([key], 'readwrite');
      var _objectStore = _transaction.objectStore(key);
      var _request     = _objectStore.getAll();

      _request.onsuccess = function onsuccess (e) {
        callback(null, e.target.result);
      };
      _request.onerror = function onerror (e) {
        callback(e);
      };
    },

    /**
     * Clear an object store
     * @param {String} key
     */
    clear : function clear (key) {
      if (!database) {
        return;
      }
      var _transaction = database.transaction([key], 'readwrite');
      var _objectStore = _transaction.objectStore(key);
      _objectStore.clear();
    }
  },

  localStorage : {
    get : function get (key) {
      if (!lunarisExports.isBrowser) {
        return;
      }
      var _val = localStorage.getItem(key);
      if (_val) {
        return JSON.parse(_val);
      }
      return null;
    },

    set : function set (key, value) {
      if (!lunarisExports.isBrowser) {
        return;
      }
      return localStorage.setItem(key, value ? JSON.stringify(value) : null);
    },

    clear : function clear (key) {
      if (!lunarisExports.isBrowser) {
        return;
      }
      return localStorage.setItem(key, null);
    }
  }
};
