var lunarisExports = require('./exports.js');
var logger         = require('./logger.js');
var utils          = require('./utils.js');
var getProcessTime = utils.getProcessTime;

var isDebug    = false;
var NAMESPACES = {
  PERFORMANCE : 'performance',
  CRUD        : 'crud',
  HTTP        : 'http',
  HOOKS       : 'hooks',
  CACHE       : 'cache',
  TRANSACTION : 'transaction',
  INDEXEDDB   : 'indexedDB'
};
var CONFIG  = {
  performance : true,
  crud        : true,
  http        : true,
  hooks       : true,
  cache       : true,
  transaction : true,
  indexedDB   : false
};

/**
 * Log
 * @param {String} store
 * @param {String} namespace in NAMESPACES
 * @param {string} message
 */
function log (store, namespace, message) {
  if (!isDebug) {
    return;
  }

  if (!CONFIG[namespace]) {
    return;
  }

  var _message = '';

  if (store) {
    _message += '[@' + store + ']';
  }

  logger.debug(_message + '[' + namespace + '] ' + message);
}

module.exports = {
  get isDebug () {
    return isDebug;
  },
  set isDebug (value) {
    isDebug = value;
  },

  NAMESPACES : NAMESPACES,
  config     : CONFIG,
  log        : log,

  /**
   * Create a debug object
   * @param {String} store ex: 'store'
   * @param {String} namespace a namespace in NAMESPACES
   */
  debug : function debug (store, namespace) {
    const times = {};

    return {
      /**
       * init timer
       * @param {String} key
       */
      time : function (key) {
        if (!lunarisExports.isBrowser) {
          return;
        }

        times[key] = getProcessTime();
      },

      /**
       * End timer and log
       * @param {String} key
       * @param {Array} options ['2 lines']
       */
      timeEnd : function (key, options) {
        if (!lunarisExports.isBrowser) {
          return;
        }

        times[key] = getProcessTime(times[key]);
        log(store, namespace, key + ' in ' + times[key] + 'ms, ' + options.join(';'));
      }
    };
  }
}
