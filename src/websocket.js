var logger         = require('./logger.js');
var invalidate     = require('./invalidate.js');
var lunarisExports = require('./exports.js');

var ws                      = null;
var lastInterval            = 200;
var reconnectInterval       = 200;
var reconnectIntervalMax    = (20 * 1000);
var reconnectIntervalFactor = 1.2; // multiply last interval to slow down reconnection frequency

var isReload = false;

var events = {};

if (lunarisExports.isBrowser) {
  window.onbeforeunload = function () {
    isReload = true;
  };
}

/**
 * Reconnect function when websocket closed
 * @param {String} host
 */
function reconnect (host) {
  ws = null;

  lastInterval *= reconnectIntervalFactor;
  if (lastInterval > reconnectIntervalMax) {
    lastInterval = reconnectIntervalMax;
  }

  logger.info('[Websocket]', 'Reconnect to websocket server in ' + lastInterval.toFixed(2) + 'ms');

  setTimeout(function () {
    connect(host);
  }, lastInterval);
}

/**
 * Connect to websocket server
 * @param {String} host
 */
function connect (host) {
  ws = new WebSocket(host);

  ws.onopen = function () {
    lastInterval = reconnectInterval;
    logger.info('[Websocket]', 'Connected!');

    _send('GET_CACHE_INVALIDATIONS', null, true);
  };
  ws.onerror = function (evt) {
  };
  ws.onclose = function (evt) {
    if (!isReload) {
      reconnect(host);
    }
  };
  ws.onmessage = function (msg) {
    if (!msg.data) {
      return;
    }

    try {
      var message = JSON.parse(msg.data);

      if (message.type === 'INVALIDATE') {
        return invalidate.invalidate(message.data);
      }

      if (message.type === 'GET_CACHE_INVALIDATIONS') {
        if (events['initCacheInvalidations']) {
          events['initCacheInvalidations'](message.data);
        }

        return;
      }
    }
    catch (e) {
      logger.warn('[Websocket] Cannot invalidate', e);
    }
  };
}

/**
 * Send data from client to server
 * @param {String} type
 * @param {*} data
 * @param {Boolean} success
 */
function _send (type, data, success) {
  ws.send(JSON.stringify({ type : type, data : data, sucess : success || false }));
}

module.exports = {
  connect : connect,

  /**
   * Send data from client to server
   * @param {String} type
   * @param {*} data
   * @param {Boolean} success
   */
  send : function (type, data, success) {
    _send(type, data, success);
  },

  /**
   * Event emmitter
   * @param {String} event
   * @param {Function} handler
   */
  on : function (event, handler) {
    events[event] = handler;
  }
};
