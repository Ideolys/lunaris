function lunarisInstance (isPluginDisable) {
  Vue.config.productionTip = false;

  {{__LUNARIS__}}

  {{__APP__}}

  {{__LUNARIS_PLUGIN__}}

  var globals = {{__VUEJS_GLOBALS__}};

  dayjs.extend(dayjs_plugin_localisableFormat);

  Vue.use(window.Buefy.default.install, {
    defaultIconPack: 'fas'
  });
  Vue.use(VueRouter);

  if (isPluginDisable === false) {
    Vue.use(lunaris._vue);
  }
  Vue.use(lunaris._vue);
  Vue.mixin({
    data: function() {
      return {
        components : Object.freeze({{__MODULE_REFS__}}),
        globals    : Object.freeze(globals)
      }
    }
  });

  var globals = {{__VUEJS_GLOBALS__}};
  var routes  = {{__VUEJS_ROUTES__}};
  var router  = new VueRouter({
    routes : routes
  });

  {{__STORE_NAMES__}}

  var indexOf = function indexOf (array, key, value) {
    for (var i = 0, len = array.length; i < len; i++) {
      if (array[i][key] === value) {
        return i;
      }
    }

    return -1;
  }

  var _stores = Object.keys(lunaris._stores);
  lunaris._indexedDB.init({{__INDEXEDDB_NUMBER__}}, _stores, function (err) {
    if (err) {
      return lunaris.logger.warn('Error when create local db', err);
    }

    lunaris._cache.init(function () {
      var _states = [];

      function _processNextStore (callback) {
        var _store = _stores.shift();

        if (!_store) {
          return callback();
        }

        // Retrieve store state
        var _index = indexOf(_states, 'store', _store);

        if (_index === -1) {
          return _processNextStore(callback);
        }

        lunaris._stores[_store].data.setIndexId(_states[_index].collection.index);
        lunaris._stores[_store].data.setIndexReferences(_states[_index].collection.indexReferences);
        lunaris._stores[_store].data.setCurrentId(_states[_index].collection.currentId);
        lunaris._stores[_store].data.setCurrentRowId(_states[_index].collection.currentRowId);
        lunaris._stores[_store].massOperations = _states[_index].massOperations;

        // Retrieve store collection data
        lunaris._indexedDB.getAll(_store, function (err, data) {
          if (err) {
            lunaris.logger.warn('Error when retrieving store collection for "' + _store + '"', err);
            return _processNextStore(callback);
          }

          // We delete the deleted object's rows
          var _length = data.length;
          for (var i = _length - 1; i >= 0; i--) {
            if (data[i]._version.length === 1) {
              continue;
            }

            data.splice(i, 1);
          }

          lunaris._stores[_store].data.setData(data);

          _processNextStore(callback);
        });
      }

      /**
       * Load stores' state and then init Vue app
       */
      var run = function run () {
        // Retrieve store state
        lunaris._indexedDB.getAll('_states', function (err, states) {
          if (err) {
            lunaris.logger.warn(err);
          }
          _states = states || [];
          _processNextStore(function () {
            new Vue({{__VUEJS_INSTANCE__}});
          });
        });
      }

      var wsConnect = function wsConnect () {
        lunaris.websocket.connect('ws://' + window.location.hostname + ':{{__WEBSOCKET_PORT__}}');
      };

      var runWebsocket = function runWebsocket () {
        wsConnect();
        var timeout = setTimeout(run, 500);

        lunaris.websocket.on('initCacheInvalidations', function (serverInvalidations) {
          // remove handler if reconnection happens
          lunaris.websocket.on('initCacheInvalidations', null);
          clearTimeout(timeout);
          lunaris._computeInvalidations(serverInvalidations, _stores);
          run();
        });
      };

      if (lunaris.exports.isOfflineStrategies) {
        window.addEventListener('online', function () {
          return lunaris._pushOfflineHttpTransactions(wsConnect);
        });
      }

      if (lunaris.offline.isOnline && lunaris.exports.isOfflineStrategies) {
        return lunaris._pushOfflineHttpTransactions(function () {
          lunaris.initInvalidations(runWebsocket);
        });
      }

      run();
    });
  });

  return lunaris;
};

var lunaris = lunarisInstance(false);
