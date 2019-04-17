var logger = require('./logger.js');

var ws                      = null;
var lastInterval            = 200;
var reconnectInterval       = 200;
var reconnectIntervalMax    = (20 * 1000);
var reconnectIntervalFactor = 1.2; // multiply last interval to slow down reconnection frequency

var isReload = false;
window.onbeforeunload = function () {
  isReload = true;
};

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
  };
  ws.onerror = function (evt) {
    console.log('error', evt);
  };
  ws.onclose = function (evt) {
    console.log('close', evt);

    if (!isReload) {
      reconnect(host);
    }
  };
  ws.onmessage = function (msg) {
    console.log(msg);
  };
}

function writeToServer (type, data, success) {
  if (!ws) {
    return;
  }

  ws.send(JSON.stringify({ type : type, data : data, sucess : success }));
}

module.exports = {
  connect : connect,

  send : function (topic, data) {
    ws.send(topic, data);
  }
};
