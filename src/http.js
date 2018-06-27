function _getStore (storeName) {
  if (!storeName) {
    throw new Error('You must enter a valid store name, given value: ' + storeName);
  }

  if (/@/.test(storeName)) {
    storeName = storeName.split('@');
    storeName = storeName[storeName.length - 1];
  }


  var _store = lunaris._stores[storeName];
  if (!_store) {
    throw new Error('The store `' + storeName + '` has not been defined');
  }

  return lunaris._stores[storeName];
}

/**
 * Make HTTP request
 * @param {String} store
 * @param {String} method
 * @param {Options} Array
 * @param {Function} callback
 */
function _get (store, method, options, callback) {
  var _request = '/';
  if (method === 'GET' && pluralize.isPlural(store) === false) {
    store = pluralize(store);
  }

  _request += store + '/root/1';
  if (options.length) {
    _request += '?';
  }
  for (var i = 0; i < options.length; i++) {
    _request += options[i][0] + '=' + options[i][1] + '&';
  }

  fetch(_request, {
    method      : method,
    credentials : 'same-origin'
  }).then(function (response) {
    return response.json();
  }).then(function (json) {
    callback(null, json.data);
  }).catch(function (err) {
    callback(err);
  });
}

var httpErrors = [];

/**
 * Push HTTP result to given hook
 * @param {String} hook 'event@store'
 * @param {*} payload
 */
function _pushToHook (hook, payload) {
  var _hook      = hook.split('@');
  var _storeName = _hook[1];
  _hook          = _hook[0];

  var _store      = _getStore(_storeName);
  var _storeHooks = _store.hooks[_hook];
  if (!_storeHooks) {
    return;
  }

  for (var i = 0; i < _storeHooks.length; i++) {
    _storeHooks[i](payload);
  }

  if (_hook === 'GET') {
    _store.currentPage++;
    _store.offset = _store.limit * _store.currentPage;
  }
}

function get (store) {
  var _store   = _getStore(store);
  var _options = [];

  _options.push(['limit' , _store.limit]);
  _options.push(['offset', _store.offset]);

  return _get(_store.name, 'GET', _options, function (err, payload) {
    if (err) {
      return httpErrors.push(err);
    }

    if (!Array.isArray(payload)) {
      payload = [payload];
    }

    var _store = store.replace('@', '');
    _pushToHook('get' + store, payload);
  });
}

// function insert (store, payload) {
//   return _get(store, 'POST', function (err, payload) {
//     if (err) {
//       return httpErrors.push(err);
//     }
//
//     _pushToHook('insert' + store, payload);
//   });
// }
//
// function update (store, payload) {
//   return _get(store, 'PUT', function (err, payload) {
//     if (err) {
//       return httpErrors.push(err);
//     }
//
//     _pushToHook('update' + store, payload);
//   });
// }

exports.get        = get;
//exports.insert     = insert;
//exports.update     = update;
exports.httpErrors = httpErrors;
