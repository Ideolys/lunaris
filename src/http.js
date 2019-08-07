var lunarisExports = require('./exports.js');
var utils          = require('./utils.js');

var baseOptions = {
  onComplete : null
};

function setup (options) {
  baseOptions = utils.merge(baseOptions, options);
}

/**
 * Make HTTP request
 * @param {String} store
 * @param {String} method
 * @param {Object} body
 * @param {Function} callback
 * @param {Options} { 'Content-Type' }
 */
function request (method, request, body, callback, options) {
  var _body               = body;
  var _defaultContentType = 'application/json';
  var _headers            = {
    'Client-Version' : 2
  };

  options = options || {};
  _headers['Content-Type'] = options['Content-Type'] || _defaultContentType;

  if (_headers['Content-Type'] === _defaultContentType && body) {
    _body = JSON.stringify(body);

    if (lunarisExports.isProduction) {
      _headers['Content-Encoding'] = 'gzip';
      _body                        = pako.gzip(_body);
    }
  }

  fetch(lunarisExports.baseUrl + request, {
    method      : method,
    credentials : 'same-origin',
    headers     : _headers,
    body        : _body
  }).then(function (response) {
    if (response.status !== 200) {
      return Promise.reject({ error : response.status, message : response.statusText });
    }

    // IE does not have window.origin
    if (!window.origin) {
      window.origin = '';
    }

    // Redirection
    if (decodeURIComponent(response.url).indexOf(decodeURIComponent(request)) === -1) {
      return window.location = response.url;
    }

    if (baseOptions.onComplete) {
      baseOptions.onComplete(response);
    }

    return response.json();
  }).then(function (json) {
    if (json.success === false) {
      return callback({ error : json.error, message : json.message });
    }
    callback(null, json.data);
  }).catch(function (err) {
    callback(err);
  });
}

exports.request = request;
exports.setup   = setup;
