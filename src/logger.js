var exportsLunaris = require('./exports.js');

var baseMessageError = '[Lunaris warn] ';
var baseMessageTip   = '[Lunaris tip] ';

module.exports = {
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

    console.warn(baseMessageTip + strings.join(' '), tip);
  },
};
