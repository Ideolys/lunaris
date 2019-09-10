var logger            = require('./logger.js');
var lunarisExports    = require('./exports.js');
var offlineVersionKey = 'lunaris:indexedDB_version';

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
  window.IDBKeyRange    = window.IDBKeyRange    || window.webkitIDBKeyRange    || window.msIDBKeyRange;

  _isDatabaseExists('lunaris', function (isExisted) {
    var _request;
    if (isExisted) {
      var _lastVersionNumber = drivers.localStorage.get(offlineVersionKey);

      if (versionNumber < _lastVersionNumber) {
        versionNumber = _lastVersionNumber;
      }

      _request = window.indexedDB.open('lunaris', versionNumber);
    }
    else {
      _request = window.indexedDB.open('lunaris');
    }

    _request.onerror = function (e) {
      logger.warn('Error when requesting indexedDB', e.target.error);
      if (callback) {
        callback(true);
      }
    };

    _request.onsuccess = function (e) {
      database = e.target.result;
      if (callback) {
        callback(null, database);
      }

      database.onerror = function (e) {
        logger.warn('[IndexedDB]', e.target.errorCode);
      };
    };

    _request.onupgradeneeded = function (e) {
      drivers.localStorage.set(offlineVersionKey, versionNumber);

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

var _queue      = [];
var _isQueueing = false;

/**
 * Start queue
 */
function _startQueue () {
  if (!_isQueueing) {
    _isQueueing = true;
    _processQueue();
  }
}

/**
 * Add in queue
 * If offline strategies are desactivated, the arguments will not be push to the queue
 * @param {Array} args [handler fn, key, value, callback]
 */
function _addInQueue (args) {
  if (!lunarisExports.isOfflineStrategies) {
    var _callback = args.pop();
    if (typeof _callback === 'function') {
      _callback();
    }
    return ;
  }

  _queue.push(args);
  _startQueue();
}

/**
 * Process indexedDB queue
 */
function _processQueue () {
  var _currentItem = _queue.shift();

  if (!_currentItem) {
    _isQueueing = false;
    return;
  }

  var _callback = _currentItem.pop();
  var _args     = _currentItem.slice(1);

  _args.push(function (err, data) {
    if (_callback) {
      _callback(err, data);
    }

    _processQueue();
  });

  _currentItem[0].apply(null, _args);
}

/**
 * Add a value
 * @param {String} key
 * @param {Array/object} value
 * @param {Function} callback @optional
 */
function _add (key, value, callback) {
  if (!database) {
    return callback ();
  }

  var _transaction;
  try {
    _transaction = database.transaction([key], 'readwrite');
  }
  catch (e) {
    return callback(e);
  }
  var _objectStore = _transaction.objectStore(key);

  if (!Array.isArray(value)) {
    value = [value];
  }

  var _cursor = 0;
  function _next () {
    var _request = _objectStore.add(value[_cursor]);
    _cursor++;
    _request.onsuccess = function onsuccess () {
      if (_cursor === value.length) {
        return callback();
      }

      _next();
    };
    _request.onerror = function onerror (e) {
      if (_cursor === value.length) {
        return callback(e);
      }

      _next();
    };
  }

  _next();
}

/**
 * Update a value
 * @param {String} key
 * @param {Array/Object} value
 * @param {Function} callback @optional
 */
function _upsert (key, value, callback) {
  if (!database) {
    return callback();
  }

  var _transaction;
  try {
    _transaction = database.transaction([key], 'readwrite');
  }
  catch (e) {
    return callback(e);
  }
  var _objectStore = _transaction.objectStore(key);

  if (!Array.isArray(value)) {
    value = [value];
  }

  var _cursor = 0;
  function _next () {
    var _request = _objectStore.put(value[_cursor]);
    _cursor++;
    _request.onsuccess = function onsuccess () {
      if (_cursor === value.length) {
        return callback();
      }

      _next();
    };
    _request.onerror = function onerror (e) {
      if (_cursor === value.length) {
        return callback(e);
      }

      _next();
    };
  }

  _next();
}

/**
 * Delete a value
 * @param {String} key
 * @param {Array/object} value
 * @param {Function} callback @optional
 */
function _del (key, value, callback) {
  if (!database) {
    return callback();
  }

  var _transaction;
  try {
    _transaction = database.transaction([key], 'readwrite');
  }
  catch (e) {
    return callback(e);
  }

  var _objectStore = _transaction.objectStore(key);

  if (!Array.isArray(value)) {
    value = [value];
  }

  var _cursor = 0;
  function _next () {
    var _request = _objectStore.delete(value[_cursor]);
    _cursor++;
    _request.onsuccess = function onsuccess () {
      if (_cursor === value.length) {
        return callback();
      }

      _next();
    };
    _request.onerror = function onerror (e) {
      if (_cursor === value.length) {
        return callback(e);
      }

      _next();
    };
  }

  _next();
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

  var _transaction;
  try {
    _transaction = database.transaction([key], 'readonly');
  }
  catch (e) {
    return callback(e);
  }

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

  var _transaction;
  try {
    _transaction = database.transaction([key], 'readonly');
  }
  catch (e) {
    return callback(e);
  }
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

  var _transaction;
  try {
    _transaction = database.transaction([key], 'readwrite');
  }
  catch (e) {
    return callback(e);
  }
  var _objectStore = _transaction.objectStore(key);
  var _request     = _objectStore.clear();

  _request.onsuccess = function onsuccess (e) {
    callback(null, e.target.result);
  };
  _request.onerror = function onerror (e) {
    callback(e);
  };
}

var drivers = {
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
        if (callback) {
          return callback();
        }
        return;
      }

      _addInQueue([_add, key, value, callback]);
    },

    /**
     * Update a value
     * @param {String} key
     * @param {*} value
     * @param {Function} callback @optional
     */
    upsert : function upsert (key, value, callback) {
      if (!database) {
        if (callback) {
          return callback();
        }
        return;
      }

      _addInQueue([_upsert, key, value, callback]);
    },

    /**
     * Delete a value
     * @param {String} key
     * @param {*} value
     * @param {Function} callback @optional
     */
    del : function del (key, value, callback) {
      if (!database) {
        if (callback) {
          return callback();
        }
        return;
      }

      _addInQueue([_del, key, value, callback]);
    },

    /**
     * Get a value
     * @param {String} key
     * @param {*} value
     * @param {Function} callback
     */
    get : function get (key, value, callback) {
      if (!database) {
        if (callback) {
          return callback();
        }
        return;
      }

      _addInQueue([_get, key, value, callback]);
    },

    /**
     * Get all value
     * @param {String} key
     * @param {Function} callback
     */
    getAll : function getAll (key, callback) {
      if (!database) {
        if (callback) {
          return callback();
        }
        return;
      }

      _addInQueue([_getAll, key, callback]);
    },

    /**
     * Clear an object store
     * @param {String} key
     */
    clear : function clear (key, callback) {
      if (!database) {
        if (callback) {
          return callback();
        }
        return;
      }

      _addInQueue([_clear, key, callback]);
    }
  },

  localStorage : {
    get : function get (key) {
      if (!lunarisExports.isBrowser || !lunarisExports.isOfflineStrategies) {
        return;
      }
      var _val = localStorage.getItem(key);
      if (_val) {
        return JSON.parse(_val);
      }
      return null;
    },

    set : function set (key, value) {
      if (!lunarisExports.isBrowser || !lunarisExports.isOfflineStrategies) {
        return;
      }
      return localStorage.setItem(key, value ? JSON.stringify(value) : null);
    },

    clear : function clear (key) {
      if (!lunarisExports.isBrowser || !lunarisExports.isOfflineStrategies) {
        return;
      }
      return localStorage.setItem(key, null);
    }
  }
};

module.exports = drivers;
