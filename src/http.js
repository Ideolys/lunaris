var lunarisExports = require('./exports.js');

/**
 * Make HTTP request
 * @param {String} store
 * @param {String} method
 * @param {Object} body
 * @param {Function} callback
 */
function request (method, request, body, callback) {
  var _body    = null;
  var _headers = {
    'Content-Type' : 'application/json'
  };

  if (body && lunarisExports.isProduction) {
    _headers['Content-Encoding'] = 'gzip';
    _body                        = pako.gzip(JSON.stringify(body));
  }
  else if (body) {
    _body = JSON.stringify(body);
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
    if (response.url.indexOf(request) === -1) {
      return window.location = response.url;
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
