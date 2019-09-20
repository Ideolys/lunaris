var exportsLunaris = require('./exports.js');

var baseMessageError      = '[Lunaris error] ';
var baseMessageTip        = '[Lunaris tip] ';
var baseMessageDeprecated = '[Lunaris deprecated]';
var baseMessageLog        = '[Lunaris info]';
var baseMessageDebug      = '[Lunaris debug]';

/**
 * Log message in the console
 * @param {String/Array} strings
 * @param {*} msg
 * @param {String} baseMessage
 */
function log (strings, msg, baseMessage, fn) {
  if (exportsLunaris.IS_PRODUCTION) {
    return;
  }

  if (!Array.isArray(strings)) {
    strings = [strings];
  }

  var _message = baseMessage + strings.join(' ');
  if (!msg) {
    return fn(_message);
  }

  fn(baseMessage + strings.join(' '), msg);
}

var isDebug = false;
var logger = {
  get isDebug () {
    return isDebug;
  },
  set isDebug (value) {
    isDebug = value;
  },

  info : function (strings, msg) {
    return log(strings, msg, baseMessageLog, console.log);
  },

  /**
   * Warn developper in thmsge console
   * @param {Array/String} strings
   * @param {*} error
   */
  warn : function warn (strings, error) {
    return log(strings, error, baseMessageError, console.error);
  },

  /**
   * Tip developper in the console
   * @param {String/Array} strings
   * @param {*} tip
   */
  tip : function tip (strings, tip) {
    return log(strings, tip, baseMessageTip, console.warn);
  },

  /**
   * Send a deprecated info to dev
   * @param {String/Array} strings
   * @param {*} info
   */
  deprecated : function deprecated (strings, info) {
    return log(strings, info, baseMessageDeprecated, console.warn);
  },

  /**
   * Send debug info to dev
   * @param {String/Array} strings
   * @param {*} debug
   */
  debug : function (strings, debug) {
    if (!isDebug) {
      return;
    }

    return log(strings, debug, baseMessageDebug, console.log);
  }
};

// Send builder errors in console
if (exportsLunaris.compilationErrors.length) {
  for (var i = 0; i < exportsLunaris.compilationErrors.length; i++) {
    logger.warn.call(null, exportsLunaris.compilationErrors[i]);
  }
}

module.exports = logger;
