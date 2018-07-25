var lunarisExports = require('./exports.js');

/**
 * Make HTTP request
 * @param {String} store
 * @param {String} method
 * @param {Object} body
 * @param {Function} callback
 */
function request (method, request, body, callback) {
  fetch(lunarisExports.baseUrl + request, {
    method      : method,
    credentials : 'same-origin',
    headers     : {
      'Content-Type'    : 'application/json',
      'Accept-Encoding' : 'gzip'
    },
    body : body ? JSON.stringify(body) : null
  }).then(function (response) {
    if (response.status !== 200) {
      return Promise.reject({ error : response.status, message : response.statusText });
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
