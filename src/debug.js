var logger         = require('./logger.js');
var utils          = require('./utils.js');
var getProcessTime = utils.getProcessTime;

var isDebug    = false;
var NAMESPACES = {
  COLLECTION : 'colleciton',
  CRUD       : 'crud',
  HTTP       : 'http',
  HOOKS      : 'hooks',
  CACHE      : 'cache'
};
var CONFIG  = {
  collection : true,
  crud       : true,
  http       : true,
  hooks      : true,
  cache      : true
};

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

  config : CONFIG,

  log : log,

  debug : function debug (store, namespace) {
    const times = {};

    return {
      time : function (key) {
        times[key] = getProcessTime();
      },

      timeEnd : function (key, options) {
        times[key] = getProcessTime(times[key]);
        log(store, namespace, key + ' in ' + times[key] + 'ms, ' + options.join(';'));
      }
    };
  }
}
