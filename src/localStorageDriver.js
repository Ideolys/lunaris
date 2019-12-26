var logger            = require('./logger.js');
var lunarisExports    = require('./exports.js');
var offlineVersionKey = 'lunaris:indexedDB_version';
var debug             = require('./debug.js');
var debugObj          = debug.debug(null, debug.NAMESPACES.INDEXEDDB);
var LIMIT_ITEMS       = 10000;

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

function _batchify (_currentItem, callback) {
  var _data = _currentItem[2];

  while (_data.length > LIMIT_ITEMS) {
    _addInQueue([_currentItem[0], _currentItem[1], _data.splice(0, LIMIT_ITEMS), _data.length ? null : callback]);
  }

  if (_data.length) {
    _addInQueue([_currentItem[0], _currentItem[1], _data.splice(0, _data.length), callback]);
  }
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

  if (_currentItem.length === 3 && Array.isArray(_currentItem[2]) && _currentItem[2].length > LIMIT_ITEMS) {
    _batchify(_currentItem, _callback);
    return _processQueue();
  }

  var _debugOptions = [
    'function -> ' + _currentItem[0].name,
    'items -> '    + (_currentItem.length === 3 ? (Array.isArray(_currentItem[2]) ? _currentItem[2].length : 1) : 0)
  ];

  debugObj.time(_currentItem[1]);
  _args.push(function (err, data) {
    debugObj.timeEnd(_currentItem[1], _debugOptions);
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

  try {
    var _transaction = database.transaction(key, 'readwrite');
  }
  catch (e) {
    return callback(e);
  }

  _transaction.onerror = function (e) {
    callback(e);
  };
  _transaction.onblocked = function (e) {
    callback(e);
  };
  _transaction.oncomplete = function () {
    callback();
  };

  var _objectStore = _transaction.objectStore(key);

  if (!Array.isArray(value)) {
    value = [value];
  }

  for (var i = 0, len = value.length; i < len; i++) {
    _objectStore.add(value[i]);
  }
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

  try {
    var _transaction = database.transaction(key, 'readwrite');
  }
  catch (e) {
    return callback(e);
  }

  _transaction.onerror = function (e) {
    callback(e);
  };
  _transaction.onblocked = function (e) {
    callback(e);
  };
  _transaction.oncomplete = function () {
    callback();
  };

  var _objectStore = _transaction.objectStore(key);

  if (!Array.isArray(value)) {
    value = [value];
  }

  for (var i = 0, len = value.length; i < len; i++) {
    _objectStore.put(value[i]);
  }
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

  try {
    var _transaction = database.transaction(key, 'readwrite');
  }
  catch (e) {
    return callback(e);
  }

  _transaction.onerror = function (e) {
    callback(e);
  };
  _transaction.onblocked = function (e) {
    callback(e);
  };
  _transaction.oncomplete = function () {
    callback();
  };

  var _objectStore = _transaction.objectStore(key);

  if (!Array.isArray(value)) {
    value = [value];
  }

  for (var i = 0, len = value.length; i < len; i++) {
    _objectStore.delete(value[i]);
  }
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

  try {
    var _transaction = database.transaction(key, 'readonly');
  }
  catch (e) {
    return callback(e);
  }

  _transaction.onerror = function onerror (e) {
    callback(e);
  };
  _transaction.onblocked = function (e) {
    callback(e);
  };
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

  try {
    var _transaction = database.transaction(key, 'readonly');
  }
  catch (e) {
    return callback(e);
  }

  _transaction.onerror = function onerror (e) {
    callback(e);
  };
  _transaction.onblocked = function (e) {
    callback(e);
  };
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

  try {
    var _transaction = database.transaction(key, 'readwrite');
  }
  catch (e) {
    return callback(e);
  }

  _transaction.onerror = function onerror (e) {
    callback(e);
  };
  _transaction.onblocked = function (e) {
    callback(e);
  };
  _transaction.oncomplete = function onsuccess () {
    callback();
  };

  var _objectStore = _transaction.objectStore(key);
  _objectStore.clear();
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
      return localStorage.setItem(key, value != null ? JSON.stringify(value) : null);
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
