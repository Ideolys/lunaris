function lunarisInstance (isPluginDisable) {
  var lunaris = {};

  Vue.config.productionTip = false;

  {{__LUNARIS__}}

  {{__APP__}}

  {{__LUNARIS_PLUGIN__}}

  dayjs.extend(dayjs_plugin_localisableFormat);

  Vue.use(window.Buefy.default, {
    defaultIconPack: 'fas'
  });
  Vue.use(window.vueTouchEvents);
  Vue.use(VueRouter);

  if (isPluginDisable === false) {
    Vue.use(lunaris._vue);
  }

  var globals = {{__VUEJS_GLOBALS__}};
  var routes  = {{__VUEJS_ROUTES__}};
  var router  = new VueRouter({
    routes : routes
  });

  {{__STORE_NAMES__}}

  var _stores = Object.keys(lunaris._stores);
  lunaris._indexedDB.init({{__INDEXEDDB_NUMBER__}}, _stores, function (err) {
    if (err) {
      return lunaris.logger.warn('Error when create local db', err);
    }

    function _processNextStore (callback) {
      var _store = _stores.shift();

      if (!_store) {
        return callback();
      }

      // Retrieve store state
      lunaris._indexedDB.get('_states', _store, function (err, state) {
        if (err) {
          lunaris.logger.warn('Error when retrieving store state for "' + _store + '"', err);
          return _processNextStore(callback);
        }

        if (!state) {
          return _processNextStore(callback);
        }

        lunaris._stores[_store].data.setIndexId(state.collection.index);
        lunaris._stores[_store].data.setCurrentId(state.collection.currentId);
        lunaris._stores[_store].data.setCurrentRowId(state.collection.currentRowId);
        lunaris._stores[_store].cache.set(state.cache);
        lunaris._stores[_store].massOperations        = state.massOperations;
        lunaris._stores[_store].paginationLimit       = state.pagination.limit;
        lunaris._stores[_store].paginationOffset      = state.pagination.offset;
        lunaris._stores[_store].paginationCurrentPage = state.pagination.currentPage

         // Retrieve store collection data
        lunaris._indexedDB.getAll(_store, function (err, data) {
          if (err) {
            lunaris.logger.warn('Error when retrieving store collection for "' + _store + '"', err);
            return _processNextStore(callback);
          }

          lunaris._stores[_store].data.setData(data);
          _processNextStore(callback);
        });
      });
    }

    _processNextStore(function () {
      new Vue({{__VUEJS_INSTANCE__}});
    });
  });

  return lunaris;
};

var lunaris = lunarisInstance(false);
