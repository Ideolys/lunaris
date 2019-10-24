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

  // We delete the deleted object's rows
  // Tdlr the rows with a version[1] defined
  var deleteRows = function deleteRows (data) {
    var _length = data.length;
    for (var i = _length - 1; i >= 0; i--) {
      if (data[i]._version.length === 1) {
        continue;
      }

      data.splice(i, 1);
    }
  };

  /**
   * Mount default app
   */
  lunaris._vue._mountApp = function () {
    lunaris._vue._vmApp = new Vue({{__VUEJS_INSTANCE__}});
  };

  /**
   * Unmount defualt app
   * - Remove all hooks
   * - Destroy the vue instance
   * - Recreate the ap div `<div id="app"></div>`
   */
  lunaris._vue._unmountApp = function (instance) {
    lunaris._removeAllHooks();
    instance.$destroy(true);
    document.getElementById('app-lunaris').outerHTML = '';
    var body = document.getElementsByTagName('body')[0];
    var div  = document.createElement('div');
    div.id = 'app';
    body.appendChild(div);
  };

  /**
   * Mount offline app
   * - Unmount default app
   * - Mount offline app
   * @param {Array} storesToLoad [{ store : '@store', filters : [] }]
   */
  lunaris._vue.mountOfflineApp = function (storesToLoad) {
    // Do not mount offline app if the browser is offline
    if (!lunaris.offline.isRealOnline) {
      return lunaris.logger.info('You cannot synchronize if the browser is offline');
    }

    lunaris._vue._unmountApp(lunaris._vue._vmApp);
    lunaris._vue._isVueOffline = true;
    lunaris._vue._storesToLoad = storesToLoad || [];
    lunaris._vue._vmOffline    = new Vue({{__VUEJS_INSTANCE_OFFLINE__}});
  };
  lunaris.offline.sync = lunaris._vue.mountOfflineApp;

  if (!lunaris.exports.isOfflineStrategies) {
    lunaris._vue._mountApp();
    return lunaris;
  }

  var _stores = Object.keys(lunaris._stores);
  lunaris._indexedDB.init({{__INDEXEDDB_NUMBER__}}, _stores, function (err) {
    if (err) {
      return lunaris.logger.warn('Error when create local db', err);
    }

    lunaris._cache.init(function () {

      /**
       * Init Stores
       * @param {Function} callback
       */
      function initStores (callback) {
        var _stores = Object.keys(lunaris._stores);

        lunaris.utils.queue(_stores, function (store, next) {
          if (lunaris._stores[store].isLazyLoad) {
            return next();
          }

          if (lunaris._stores[store].isInitialized) {
            return next();
          }

          lunaris._initStore(lunaris._stores[store], [next, null]);
        }, callback);
      }

      /**
       * Load stores' state and then init Vue app
       */
      var run = function run () {
        // Retrieve store state
        initStores(function () {
          if (!lunaris._vue._isVueOffline) {
            lunaris._vue._mountApp();
          }
        });
      }

      var runWebsocket = function runWebsocket () {
        lunaris.websocket.connect('ws://' + window.location.hostname + ':{{__WEBSOCKET_PORT__}}');

        lunaris.websocket.on('initCacheInvalidations', function (serverInvalidations) {
          // remove handler if reconnection happens
          lunaris.websocket.on('initCacheInvalidations', null);
          lunaris.invalidations.compute(serverInvalidations, Object.keys(lunaris._stores));
        });

        run();
      };

      lunaris._vue.run = function () {
        lunaris.invalidations.init(runWebsocket);
      };

      return lunaris._indexedDB.get('_states', lunaris.utils.offlineStore, function (err, state) {
        if (!err && state) {
          lunaris._stores[lunaris.utils.offlineStore].data.setCurrentId(state.collection.currentId);
          lunaris._stores[lunaris.utils.offlineStore].data.setCurrentRowId(state.collection.currentRowId);
        }

        lunaris._indexedDB.getAll(lunaris.utils.offlineStore, function (err, data) {
          if (!err && data) {
            deleteRows(data);
            lunaris._stores[lunaris.utils.offlineStore].data.setData(data);
          }

          if (lunaris.offline.isRealOnline) {
            return lunaris.invalidations.init(runWebsocket);
          }

          return run();
        });
      });
    });
  });

  return lunaris;
};

var lunaris = lunarisInstance(false);
