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

  _isDatabaseExists('lunaris', function (isExisted) {
    var _request;
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

      if (!_db.objectStoreNames.contains('_invalidations')) {
        _db.createObjectStore('_invalidations', { keyPath : 'url' });
      }

      if (!_db.objectStoreNames.contains('cache')) {
        _db.createObjectStore('cache', { keyPath : 'hash' });
      }
    };
  });
}

var _queue       = [];
var _currentItem = null;

/**
 * Start queue
 */
function _startQueue () {
  if (!_currentItem && _queue.length === 1) {
    _processQueue();
  }
}

/**
 * Process indexedDB queue
 */
function _processQueue () {
  var _currentItem = _queue.shift();

  if (!_currentItem) {
    return;
  }

  var _callback = _currentItem[_currentItem.length - 1];

  _currentItem[0](_currentItem[1], _currentItem[2], function (err, data) {
    if (_callback) {
      _callback(err, data);
    }

    _processQueue();
  });
}

/**
 * Add a value
 * @param {String} key
 * @param {*} value
 * @param {Function} callback @optional
 */
function _add (key, value, callback) {
  if (!database) {
    return callback ();
  }

  var _transaction = database.transaction([key], 'readwrite');
  var _objectStore = _transaction.objectStore(key);
  var _request     = _objectStore.add(value);

  _request.onsuccess = function onsuccess (e) {
    callback(null, e.target.result);
  };
  _request.onerror = function onerror (e) {
    callback(e);
  };
}

/**
 * Update a value
 * @param {String} key
 * @param {*} value
 * @param {Function} callback @optional
 */
function _upsert (key, value, callback) {
  if (!database) {
    return callback();
  }

  var _transaction = database.transaction([key], 'readwrite');
  var _objectStore = _transaction.objectStore(key);
  var _request     = _objectStore.put(value);

  _request.onsuccess = function onsuccess (e) {
    callback(null, e.target.result);
  };
  _request.onerror = function onerror (e) {
    callback(e);
  };
}

/**
 * Delete a value
 * @param {String} key
 * @param {*} value
 * @param {Function} callback @optional
 */
function _del (key, value, callback) {
  if (!database) {
    return callback();
  }

  var _transaction = database.transaction([key], 'readwrite');
  var _objectStore = _transaction.objectStore(key);
  var _request     = _objectStore.delete(value);

  _request.onsuccess = function onsuccess (e) {
    callback(null, e.target.result);
  };
  _request.onerror = function onerror (e) {
    callback(e);
  };
}

/**
 * Get a value
 * @param {String} key
 * @param {*} value
 * @param {Function} callback
 */
function _get (key, value, callback) {
  if (!database) {
    return callback();
  }

  var _transaction = database.transaction([key], 'readwrite');
  var _objectStore = _transaction.objectStore(key);
  var _request     = _objectStore.get(value);

  _request.onsuccess = function onsuccess (e) {
    callback(null, e.target.result);
  };
  _request.onerror = function onerror (e) {
    callback(e);
  };
}

/**
 * Get all value
 * @param {String} key
 * @param {Function} callback
 */
function _getAll (key, callback) {
  if (!database) {
    return callback();
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
}

/**
 * Clear an object store
 * @param {String} key
 */
function _clear (key, callback) {
  if (!database) {
    return callback();
  }

  var _transaction = database.transaction([key], 'readwrite');
  var _objectStore = _transaction.objectStore(key);
  var _request     = _objectStore.clear();

  if (callback) {
    _request.onsuccess = function onsuccess (e) {
      callback(null, e.target.result);
    };
    _request.onerror = function onerror (e) {
      callback(e);
    };
  }
}

module.exports = {
  indexedDB : {
    init : initIndexedDB,
    /**
     * Add a value
     * @param {String} key
     * @param {*} value
     * @param {Function} callback @optional
     */
    add  : function add (key, value, callback) {
      if (!database) {
        return;
      }

      _queue.push([_add, key, value, callback]);
      _startQueue();
    },

    /**
     * Update a value
     * @param {String} key
     * @param {*} value
     * @param {Function} callback @optional
     */
    upsert : function upsert (key, value, callback) {
      if (!database) {
        return;
      }

      _queue.push([_upsert, key, value, callback]);
      _startQueue();
    },

    /**
     * Delete a value
     * @param {String} key
     * @param {*} value
     * @param {Function} callback @optional
     */
    del : function del (key, value, callback) {
      if (!database) {
        return;
      }

      _queue.push([_del, key, value, callback]);
      _startQueue();
    },

    /**
     * Get a value
     * @param {String} key
     * @param {*} value
     * @param {Function} callback
     */
    get : function get (key, value, callback) {
      if (!database) {
        return;
      }

      _queue.push([_get, key, value, callback]);
      _startQueue();
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

      _queue.push([_getAll, key, callback]);
      _startQueue();
    },

    /**
     * Clear an object store
     * @param {String} key
     */
    clear : function clear (key, callback) {
      if (!database) {
        return;
      }

      _queue.push([_clear, key, callback]);
      _startQueue();
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
