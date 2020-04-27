var logger         = require('./logger.js');
var lunarisExports = require('./exports.js');
var offline        = require('./offline.js');

var ws                      = null;
var lastInterval            = 200;
var reconnectInterval       = 200;
var reconnectIntervalMax    = (20 * 1000);
var reconnectIntervalFactor = 1.2; // multiply last interval to slow down reconnection frequency
var timeout                 = null;

var isReload = false;
var handlers = {};

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

  timeout = setTimeout(function () {
    if (!offline.isOnline) {
      clearTimeout(timeout);
    }

    connect(host);
  }, lastInterval);
}

/**
 * Connect to websocket server
 * @param {String} host
 */
function connect (host) {
  if (ws) {
    return;
  }

  ws = new WebSocket(host);

  ws.onopen = function () {
    lastInterval = reconnectInterval;
    logger.info('[Websocket]', 'Connected!');

    _send('invalidations');
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

      if (handlers[message.channel]) {
        handlers[message.channel].call(null, message);
      }
    }
    catch (e) {
      logger.warn('[Websocket] Cannot parse incomming message', e);
    }
  };
}

/**
 * Send data from client to server
 * @param {String} channel
 * @param {*} data
 */
function _send (channel, data) {
  ws.send(JSON.stringify({
    channel : channel,
    data    : data,
    ts      : Date.now()
  }));
}

module.exports = {
  _handlers : handlers,
  connect   : connect,

  /**
   * Send data from client to server
   * @param {String} type
   * @param {*} data
   */
  send : function (channel, data) {
    _send(channel, data);
  },

  /**
   * Close websocket
   * @param {Function} callback @optional
   */
  stop : function (callback) {
    if (!ws) {
      if (callback) {
        callback();
      }
      return;
    }

    // set isReload to avoid auto-reconnect mecanism
    isReload = true;
    ws.onclose = function () {
      if (callback) {
        callback();
      }
      isReload = false;
    };
    ws.close();
  },

  /**
   * Subscribe to a channel (or event)
   * @param {String} channel
   * @param {Function} handler
   */
  subscribe (channel, handler) {
    if (typeof handler !== 'function') {
      return logger.warn('[lunaris.websocket.subscribe] Handler is not a function');
    }

    if ((channel === 'invalidated' || channel === 'invalidations') && handlers[channel]) {
      return logger.warn('[lunaris.websocket.subscribe] Given channel is reserved');
    }

    handlers[channel] = handler;
  },

  /**
   * Unsubscribe from a channel (or event)
   * @param {String} channel
   */
  unsubscribe (channel) {
    delete handlers[channel];
  },
};
