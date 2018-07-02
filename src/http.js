var lunarisExports = require('./exports.js');

/**
 * Make HTTP request
 * @param {String} store
 * @param {String} method
 * @param {Function} callback
 */
function _httpRequest (request, method, callback) {
  fetch(lunarisExports.baseUrl + request, {
    method      : method,
    credentials : 'same-origin'
  }).then(function (response) {
    if (response.status !== 200) {
      return Promise.reject({ status : response.status, statusText : response.statusText });
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

/**
 * HTTP GET
 * @param {String} method
 * @param {String} request url
 * @param {Function} callback err, data or err object
 */
function request (method, request, callback) {
  return _httpRequest(request, method, function (err, payload) {
    if (err) {
      return callback(err);
    }

    if (!Array.isArray(payload) && method === 'GET') {
      payload = [payload];
    }

    callback(null, payload);
  });
}

exports.request = request;
