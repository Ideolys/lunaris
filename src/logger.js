var exportsLunaris = require('./exports.js');

var baseMessageError      = '[Lunaris warn] ';
var baseMessageTip        = '[Lunaris tip] ';
var baseMessageDeprecated = '[Lunaris deprecated]';

var logger = {
  /**
   * Warn developper in the console
   * @param {Array/String} strings
   * @param {*} error
   */
  warn : function warn (strings, error) {
    if (exportsLunaris.IS_PRODUCTION) {
      return;
    }

    if (!Array.isArray(strings)) {
      strings = [strings];
    }

    var _message = baseMessageError + strings.join(' ');
    if (!error) {
      return console.warn(_message);
    }

    console.error(_message, error);
  },

  /**
   * Tip developper in the console
   * @param {String/Array} strings
   * @param {*} tip
   */
  tip : function tip (strings, tip) {
    if (exportsLunaris.IS_PRODUCTION) {
      return;
    }

    if (!Array.isArray(strings)) {
      strings = [strings];
    }

    var _message = baseMessageTip + strings.join(' ');
    if (!tip) {
      return console.warn(_message);
    }

    console.warn(baseMessageTip + strings.join(' '), tip);
  },

  /**
   * Send a deprecated info to dev
   * @param {String/Array} strings
   * @param {*} info
   */
  deprecated : function deprecated (strings, info) {
    if (exportsLunaris.IS_PRODUCTION) {
      return;
    }

    if (!Array.isArray(strings)) {
      strings = [strings];
    }

    var _message = baseMessageDeprecated + strings.join(' ');
    if (!info) {
      return console.warn(_message);
    }

    console.warn(_message, info);
  }
};

// Send builder errors in console
if (exportsLunaris.compilationErrors.length) {
  for (var i = 0; i < exportsLunaris.compilationErrors.length; i++) {
    logger.warn.call(null, exportsLunaris.compilationErrors[i]);
  }
}

module.exports = logger;
