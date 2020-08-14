function lunarisInstance (isPluginDisable) {
  Vue.config.productionTip = false;

  {{__LUNARIS__}}

  lunaris.exports.setOptions({{__LUNARIS_OPTIONS__}});

  {{__VUEJS_BEFORE_CODE__}}

  {{__APP__}}

  {{__LUNARIS_PLUGIN__}}

  var globals = {{__VUEJS_GLOBALS__}};

  dayjs.extend(dayjs_plugin_localizedFormat);
  dayjs.extend(dayjs_plugin_localeData);

  if (window.Buefy) {
    Vue.use(window.Buefy.default.install, {
      defaultIconPack: 'fas'
    });
  }
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

  /**
   * Mount default app
   */
  lunaris._vue._mountApp = function () {
    lunaris._vue._vmApp = new Vue({{__VUEJS_INSTANCE__}});
  };

  /**
   * Unmount defualt app
   * - Destroy dynamic views
   * - Remove all hooks
   * - Destroy the vue instance
   * - Recreate the ap div `<div id="app"></div>`
   */
  lunaris._vue._unmountApp = function (instance) {
    for (var store in lunaris._vue._vm.$data.$stores) {
      lunaris._vue._vm.$data.$stores[store].view = null;
    }

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

    lunaris.websocket.unsubscribe('invalidated');
    lunaris.websocket.unsubscribe('invalidations');
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

      var intervalPollInvalidations = null;
      var runWebsocket = function runWebsocket () {
        var protocol   = window.location.protocol.startsWith('https') ? 'wss' : 'ws';
        lunaris.websocket.connect(protocol + '://' + (lunaris.exports.baseUrl.replace(/https?:\/\//, '') || window.location.host));

        lunaris.websocket.subscribe('invalidations', function (message) {
          // remove handler if reconnection happens
          lunaris.websocket.unsubscribe('invalidations');
          lunaris.invalidations.compute(message.data, Object.keys(lunaris._stores));
        });

        lunaris.websocket.subscribe('invalidated', function (message) {
          lunaris.invalidate(message.data);
        });

        // Create interval only once
        if (!intervalPollInvalidations) {
          intervalPollInvalidations = setInterval(function () {
            if (lunaris.offline.isSynchronizing) {
              return;
            }

            lunaris.invalidations.getAndCompute();
          }, 10 * 60 * 1000); // every 10min
        }

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
            lunaris.utils.deleteRows(data);
            lunaris._stores[lunaris.utils.offlineStore].data.setData(data);
            lunaris._stores[lunaris.utils.offlineStore].isInitialized = true;
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
