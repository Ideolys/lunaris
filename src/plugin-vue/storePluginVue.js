lunaris._vue = {
  _vm : new Vue({
    data : {
      nbSnackbars : 0,
      $stores : {}
    },

    created : function () {
      var _stores = Object.keys(lunaris._stores);
      for (var i = 0; i < _stores.length; i++) {
        // must be done in order to be reactive
        // https://fr.vuejs.org/v2/guide/list.html#Limitations
        this.$set(this.$data.$stores, _stores[i], { silent : true, state : [] });
      }
    }
  }),
  install : function (Vue, options) {
    /**
     * Set $storeName value
     * @param {String} store
     * @param {Object} _this
     */
    function _setGet (store, _this) {
      Object.defineProperty(_this, '$' + store, {
        get : function () {
          return lunaris._vue._vm.$data.$stores[store].state;
        }
      });
    }

    /**
     * Set _get hook handler
     * @param {String} store
     */
    function _get (store) {
      return function (items) {
        if (!Array.isArray(items)) {
          return;
        }

        var _storeObj = lunaris._vue._vm.$data.$stores[store];
        for (var i = 0; i < items.length; i++) {
          _storeObj.state.push(lunaris.clone(items[i]));
        }
      }
    }

    /**
     * Set _reset hook handler
     * @param {String} store
     */
    function _reset (store) {
      return function () {
        lunaris._vue._vm.$data.$stores[store].state.splice(0);
        lunaris.get('@' + store);
      }
    }

    /**
     * Set _insert hook handler
     * @param {String} store
     */
    function _insert (store) {
      return function (item) {
        lunaris._vue._vm.$data.$stores[store].state.push(lunaris.clone(item));
      }
    }

    /**
     * Set _update hook handler
     * @param {String} store
     */
    function _update (store) {
      return function (item) {
        var _state = lunaris._vue._vm.$data.$stores[store].state;
        for (var j = 0; j < _state.length; j++) {
          if (_state[j]._id === item._id) {
            _state.splice(j, 1, lunaris.clone(item));
          }
        }

        lunaris._vue._vm.$data.$stores[store].state.push(lunaris.clone(item));
      }
    }

    /**
     * Set _delete hook handler
     * @param {String} store
     */
    function _delete (store) {
      return function (item) {
        var _state = lunaris._vue._vm.$data.$stores[store].state;
        for (var j = 0; j < _state.length; j++) {
          if (_state[j]._id === item._id) {
            _state.splice(j, 1);
          }
        }
      }
    }

    /**
     * Set error hook
     * @param {String} store
     */
    function _errorHttp (_this) {
      return function (err) {
        lunaris._vue._vm.$data.nbSnackbars++;
        if (lunaris._vue._vm.$data.nbSnackbars > 1) {
          return;
        }

        var onAction = function () {
          _this.$lunarisErrorsResolver.open();
        };

        _this.$snackbar.open({
          message    : err,
          type       : 'is-warning',
          position   : 'is-top',
          indefinite : true,
          actionText : 'Résoudre',
          queue      : false,
          onAction   : onAction
        });
      }
    }

    /**
     * Register stores to obtain vm.$<store>
     * @param {Object} _this instance vue
     */
    function _registerStores (_this) {
      var _stores = _this.$options.stores;
      if (!_stores) {
        return;
      }
      if (!Array.isArray(_stores)) {
        lunaris.logger.warn('vm.stores must be an Array');
        return lunaris.logger.tip('Please register a store with: vm.stores = [<store>, ...]');
      }

      _this.$options.internalStoreHooks = {};

      for (var i = 0; i < _stores.length; i++) {
        var _store = _stores[i];

        if (!lunaris._vue._vm.$data.$stores[_store]) {
          return lunaris.logger.warn('Store `' + _store + '` has not been defined');
        }

        // re-initialize current store
        // lunaris._vue._vm.$data.$stores[_store].state.splice(0);
        lunaris._vue._vm.$data.$stores[_store].state.splice(0);

        _setGet(_store, _this);

        if (!_this.$options.storeHooks) {
          _this.$options.storeHooks = {};
        }

        var _getFn    = _get(_store);
        var _resetFn  = _reset(_store);
        var _insertFn = _insert(_store);
        var _updateFn = _update(_store);
        var _deleteFn = _delete(_store);
        var _errorFn  = _errorHttp(_this);

        // lunaris.hook('get@'       + _store, _getFn);
        // lunaris.hook('reset@'     + _store, _resetFn);
        // lunaris.hook('insert@'    + _store, _insertFn);
        // lunaris.hook('update@'    + _store, _updateFn);
        // lunaris.hook('delete@'    + _store, _deleteFn);
        // lunaris.hook('errorHttp@' + _store, _errorHttp);

        _this.$options.internalStoreHooks[_store] = [
          ['get@'       + _store, _getFn],
          ['reset@'     + _store, _resetFn],
          ['insert@'    + _store, _insertFn],
          ['update@'    + _store, _updateFn],
          ['delete@'    + _store, _deleteFn],
          ['errorHttp@' + _store, _errorFn]
        ];

        for (var k = 0; k < _this.$options.internalStoreHooks[_store].length; k++) {
          lunaris.hook.apply(null, _this.$options.internalStoreHooks[_store][k]);
        }
      }
    }

    /**
     * Register store hooks to obtain: vm.$storeHooks : { <hook> : <handler> }
     * @param {Object} _this instance vue
     */
    function _registerHooks (_this) {
      var _hooks = _this.$options.storeHooks;
      if (!_hooks) {
        return;
      }
      if (typeof _hooks !== 'object') {
        return lunaris.logger.warn('vm.storeHooks must be an Object');
      }

      var _hookKeys = Object.keys(_hooks);
      for (var i = 0; i < _hookKeys.length; i++) {
        var _hook = _hooks[_hookKeys[i]];

        if (typeof _hook !== 'function') {
          return lunaris.logger.warn('vm.storeHooks.' + _hookKeys[i] + ' must be a Function!');
        }

        lunaris.hook(_hookKeys[i], _hook.bind(_this));
      }
    }

    function _removeHooks (_this) {
      var _hooks = _this.$options.storeHooks;
      if (!_hooks) {
        return;
      }


      var _hookKeys = Object.keys(_hooks);
      for (var i = 0; i < _hookKeys.length; i++) {
        var _hook = _hooks[_hookKeys[i]];
        lunaris.removeHook(_hookKeys[i], _hook);
      }

      var _internalHooks = _this.$options.internalStoreHooks;
      if (!_internalHooks) {
        return;
      }

      _internalHookKeys = Object.keys(_internalHooks);
      for (var i = 0; i < _internalHookKeys.length; i++) {
        var _hooks = _internalHooks[_internalHookKeys[i]];
        for (var j = 0; j < _hooks.length; j++) {
          lunaris.removeHook.apply(null, _hooks[j]);
        }
      }
    }

    Vue.mixin({
      beforeCreate: function () {
        _registerStores(this);
        _registerHooks(this);

        /**
         * Set function to rollback lunarisError
         * @param {Object} lunarisError
         */
        this.rollback = function rollback (lunarisError) {
          if (!lunarisError.data || !lunarisError.version) {
            return;
          }

          lunaris.rollback('@' + lunarisError.storeName, lunarisError.version);

          if (lunarisError.data._operation === lunaris.OPERATIONS.INSERT) {
            return _delete(lunarisError.storeName)(lunarisError.data);
          }
          if (lunarisError.data._operation === lunaris.OPERATIONS.UPDATE) {
            return _update(lunarisError.storeName)(lunarisError.data);
          }
          if (lunarisError.data._operation === lunaris.OPERATIONS.DELETE) {
            return _insert(lunarisError.storeName)(lunarisError.data);
          }
        };
      },

      beforeDestroy : function () {
        _removeHooks(this);
      }
    });
  }
};
