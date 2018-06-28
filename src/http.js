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
 * Push HTTP result to given hook
 * @param {String} hook 'event@store'
 * @param {*} payload
 */
//function _pushToHook (hook, payload) {
//  var _hook      = hook.split('@');
//  var _storeName = _hook[1];
//  _hook          = _hook[0];
//
//  var _store      = _getStore(_storeName);
//  var _storeHooks = _store.hooks[_hook];
//  if (!_storeHooks) {
//    return;
//  }
//  for (var i = 0; i < _storeHooks.length; i++) {
//    _storeHooks[i](payload);
//  }
//  if (_hook === 'GET') {
//    _store.currentPage++;
//    _store.offset = _store.limit * _store.currentPage;
//  }
//}

function get (request, callback) {
  return _httpRequest(request, 'GET', function (err, payload) {
    if (err) {
      return callback(err);
    }

    if (!Array.isArray(payload)) {
      payload = [payload];
    }

    callback(null, payload);
  });
}

exports.get  = get;
// exports.post = isnert;
// exports.put  = update;
// exports.del  = deleteHTTP;
