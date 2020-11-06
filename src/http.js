var lunarisExports = require('./exports.js');
var utils          = require('./utils.js');

var baseOptions = {
  onComplete : null
};

/**
 * Is JSON resuest ?
 * @param {Object} headers
 * @returns {Boolean}
 */
function _isJSON (headers) {
  const contentType = headers.get('content-type');
  if(contentType && contentType.indexOf('application/json') !== -1) {
    return true;
  }

  return false;
}

function setup (options) {
  baseOptions = utils.merge(baseOptions, options);
}

/**
 * Make HTTP request
 * @param {String} store
 * @param {String} method
 * @param {Object} body
 * @param {Function} callback
 * @param {Options} { 'Content-Type', store : '@store' }
 */
function request (method, request, body, callback, options) {
  var _body               = body;
  var _defaultContentType = 'application/json';
  var _headers            = {
    'Client-Version' : 2
  };

  options = options || {};
  _headers['Content-Type'] = options['Content-Type'] || _defaultContentType;

  // for server to detect dump request
  if (options['isOffline']) {
    _headers['Is-Offline'] = options['isOffline'];
  }

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
    const isJSON = _isJSON(response.headers);

    if (response.status !== 200 && !isJSON) {
      return Promise.reject({ error : response.status, message : response.statusText, errors : [] });
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

    return response.json().then(json => {
      if (json.success === false) {
        return callback({ error : json.error, message : json.message, errors : json.errors });
      }

      callback(null, json.data);
    })
    .catch((err) => {
      if (response.status !== 200) {
        return Promise.reject({ error : response.status, message : response.statusText, errors : [] });
      }
    });
  }).catch(function (err) {
    callback(err);
  });
}

exports.request = request;
exports.setup   = setup;
