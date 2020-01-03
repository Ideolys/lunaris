lunaris._vue = {
  _vm : new Vue({
    data : {
      nbSnackbars : 0,
      $stores     : {}
    },

    created : function () {
      /**
       * Set success hook
       * @param {String} store
       */
      function _successHttp (_this) {
        return function successHttp (message) {
          if (!message || lunaris._vue._isVueOffline) {
            return;
          }

          if (_this.$buefy) {
            _this.$buefy.toast.open({
              message  : message,
              type     : 'is-success',
              position : 'is-top-right'
            });
          }
        };
      }

      /**
       * Set error hook
       * @param {String} store
       */
      function _errorHttp (_this) {
        return function errorHttp (err) {
          lunaris._vue._vm.$data.nbSnackbars++;
          if (lunaris._vue._vm.$data.nbSnackbars > 1 || lunaris._vue._isVueOffline) {
            return;
          }

          // var onAction = function () {
          //   _this.$lunarisErrorsResolver.open();
          // };

          // _this.$snackbar.open({
          //   message    : err,
          //   type       : 'is-warning',
          //   position   : 'is-top',
          //   indefinite : true,
          //   actionText : '${Resolve}',
          //   queue      : false,
          //   onAction   : onAction
          // });

          if (_this.$buefy) {
            _this.$buefy.toast.open({
              message  : err.error,
              type     : 'is-danger',
              position : 'is-top-right',
              duration : 3000
            });
          }
        };
      }

      var _successFn = _successHttp(this);
      var _errorFn   = _errorHttp(this);
      var _stores    = Object.keys(lunaris._stores);
      for (var i = 0; i < _stores.length; i++) {
        // must be done in order to be reactive
        // https://fr.vuejs.org/v2/guide/list.html#Limitations
        this.$set(this.$data.$stores, _stores[i], {
          silent        : true,
          isStoreObject : lunaris._stores[_stores[i]].isStoreObject,
          state         : lunaris._stores[_stores[i]].isStoreObject ? {} : [],
          form          : lunaris.getDefaultValue('@' + _stores[i]),
          view          : null
        });

        if (_stores[i].name !== 'lunarisErrors') {
          if (lunaris._stores[_stores[i]].isSucessNotification !== false) {
            lunaris.hook.apply(null, ['success@' + _stores[i], _successFn, false, true]);
          }

          if (lunaris._stores[_stores[i]].isErrorNotification !== false) {
            lunaris.hook.apply(null, ['errorHttp@' + _stores[i], _errorFn, false, true]);
          }

          lunaris.hook.apply(null, ['error@'     + _stores[i], _errorFn, false, true]);
        }
      }
    }
  }),

  install : function (Vue) {
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
     * Set $storeNameForm value
     * @param {String} store
     * @param {Object} _this
     */
    function _setFormValue (store, _this) {
      Object.defineProperty(_this, '_$' + store,  {
        get : function () {
          return lunaris._vue._vm.$data.$stores[store].form;
        }
      });
    }

    /**
     * Set _reset hook handler
     * @param {String} store
     */
    function _resetStoreObject (store) {
      return function reset () {
        return Vue.set(lunaris._vue._vm.$data.$stores[store], 'state', {});
      };
    }

    /**
     * Set _reset hook handler
     * @param {String} store
     */
    function _resetMagic (store) {
      return function resetMagic () {
        if (lunaris._stores[store].isAutoRequest !== false) {
          lunaris.get('@' + store);
        }
      };
    }

    /**
     * Set _update hook handler
     * @param {String} store
     */
    function _updateStoreObject (store) {
      return function update (items) {
        if (Array.isArray(items)) {
          items = items[0];
        }
        return Vue.set(lunaris._vue._vm.$data.$stores[store], 'state', items);
      };
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
        lunaris.logger.warn('Error in component \'' + _this.$options.name + '\':', 'vm.stores must be an Array!');
        return lunaris.logger.tip('Please register a store with: vm.stores = [<store>, ...]');
      }

      _this.$options.internalMagicHooks = [];

      for (var i = 0; i < _stores.length; i++) {
        var _store = _stores[i];

        if (!lunaris._vue._vm.$data.$stores[_store]) {
          lunaris.logger.warn('Error in component \'' + _this.$options.name + '\':', 'Store \'' + _store + '\' has not been defined!');
          return lunaris.logger.tip('Please define a store in stores folder');
        }

        // re-initialize current store
        // if (Array.isArray(lunaris._vue._vm.$data.$stores[_store].state)) {
        //   lunaris._vue._vm.$data.$stores[_store].state.splice(0);
        // }
        // else {
        //   lunaris._vue._vm.$data.$stores[_store].state = null;
        // }

        if (lunaris._stores[_store]) {
          lunaris._stores[_store].paginationCurrentPage = 1;
          lunaris._stores[_store].paginationOffset      = 0;
        }

        _setGet(_store, _this);
        _setFormValue(_store, _this);

        if (!_this.$options.storeHooks) {
          _this.$options.storeHooks = {};
        }

        if (lunaris._stores[_store].isStoreObject) {
          var _resetFn  = _resetStoreObject(_store);
          var _updateFn = _updateStoreObject(_store);

          var hooks = [
            ['get@'       + _store, _updateFn, true],
            ['reset@'     + _store, _resetFn , true],
            ['insert@'    + _store, _updateFn, true],
            ['update@'    + _store, _updateFn, true],
            ['delete@'    + _store, _resetFn , true]
          ];

          for (var k = 0; k < hooks.length; k++) {
            lunaris.hook.apply(null, hooks[k]);
          }

          continue;
        }

        if (!lunaris._vue._vm.$data.$stores[_store].view) {
          var dynamicView = lunaris.dynamicView(_store, { shouldNotInitialize : true });
          lunaris._vue._vm.$data.$stores[_store].view  = dynamicView;
          lunaris._vue._vm.$data.$stores[_store].state = dynamicView.data();
        }

        if (lunaris._stores[_store].isAutoRequest === false) {
          continue;
        }

        _this.$options.internalMagicHooks.push(['reset@' + _store, _resetMagic(_store)]);
      }

      for (k = 0; k < _this.$options.internalMagicHooks.length; k++) {
        lunaris.hook.apply(null, _this.$options.internalMagicHooks[k]);
      }
    }

    /**
     * Register store hooks to obtain: vm.$storeHooks : { <hook> : <handler> }
     * @param {Object} _this instance vue
     */
    function _registerHooks (_this) {
      // We must reference hook fn. bind() rename the fn
      _this.hooks = {};
      var _hooks = _this.$options.storeHooks;
      if (!_hooks) {
        return;
      }
      if (typeof _hooks !== 'object') {
        return lunaris.logger.warn('Error in component \'' + _this.$options.name + '\':', 'vm.storeHooks must be an Object!');
      }

      var _hookKeys = Object.keys(_hooks);
      for (var i = 0; i < _hookKeys.length; i++) {
        var _hook = _hooks[_hookKeys[i]];

        if (typeof _hook !== 'function') {
          return lunaris.logger.warn('Error in component \'' + _this.$options.name + '\':', 'vm.storeHooks.' + _hookKeys[i] + ' must be a Function!');
        }
        _this.hooks[_hookKeys[i]] = _hook.bind(_this);
        lunaris.hook(_hookKeys[i], _this.hooks[_hookKeys[i]]);
      }
    }

    /**
     * Remove store hooks
     * @param {Object} _this
     */
    function _removeHooks (_this) {
      var _hooks = _this.$options.storeHooks;
      if (!_hooks) {
        return;
      }


      var _hookKeys = Object.keys(_hooks);
      for (var i = 0; i < _hookKeys.length; i++) {
        var _hook = _this.hooks[_hookKeys[i]];
        if (_hook) {
          lunaris.removeHook(_hookKeys[i], _hook);
        }
      }

      if (!_this.$options.internalMagicHooks) {
        return;
      }

      for (var j = 0; j < _this.$options.internalMagicHooks.length; j++) {
        lunaris.removeHook.apply(null, _this.$options.internalMagicHooks[j]);
      }
    }


    /**
     * Register socket hooks
     * @param {Object} _this instance vue
     */
    function _registerSocketHooks (_this) {
      // We must reference hook fn. bind() rename the fn
      _this.socketChannels = {};
      var _hooks = _this.$options.socketChannels;
      if (!_hooks) {
        return;
      }
      if (typeof _hooks !== 'object') {
        return lunaris.logger.warn('Error in component \'' + _this.$options.name + '\':', 'vm.socketChannels must be an Object!');
      }

      var _hookKeys = Object.keys(_hooks);
      for (var i = 0; i < _hookKeys.length; i++) {
        var _hook = _hooks[_hookKeys[i]];

        if (typeof _hook !== 'function') {
          return lunaris.logger.warn('Error in component \'' + _this.$options.name + '\':', 'vm.socketChannels.' + _hookKeys[i] + ' must be a Function!');
        }
        _this.hooks[_hookKeys[i]] = _hook.bind(_this);
        lunaris.websocket.subscribe(_hookKeys[i], _this.hooks[_hookKeys[i]]);
      }
    }

    /**
     * Remove socket hooks
     * @param {Object} _this
     */
    function _removeSocketHooks (_this) {
      var _hooks = _this.$options.socketChannels;
      if (!_hooks) {
        return;
      }

      var _hookKeys = Object.keys(_hooks);
      for (var i = 0; i < _hookKeys.length; i++) {
        lunaris.websocket.unsubscribe(_hookKeys[i]);
      }
    }

    /**
     * Get rollback data
     * @param {String} storeName
     * @param {Array|Object} data
     */
    function _getDataForRollback (storeName, data) {
      var _ids  = [];
      if (!Array.isArray(data)) {
        data = [data];
      }

      for (var i = 0; i < data.length; i++) {
        if (data[i]._id == null) {
          return lunaris.warn(['Error in component \'' + this.$options.name + '\':', 'vm.$rollback'], 'Provided data must have a defined \"_id\" key!');
        }
        _ids.push(data[i]._id);
      }

      data = lunaris._stores[storeName].data.getAll(_ids);
      lunaris.utils.cloneAndFreeze(data);

      return data;
    }

    Vue.mixin({
      beforeCreate : function () {
        _registerStores(this);
        _registerHooks(this);
        _registerSocketHooks(this);

        this._registerStores = _registerStores;
        this._registerHooks  = _registerHooks;

        /**
         * Set function to rollback lunarisError
         * @param {Object} lunarisError
         */
        this.$rollback = function rollback (lunarisError) {
          if (!lunarisError ||
              (lunarisError && !lunarisError.storeName) ||
              (lunarisError && !lunarisError.data && lunarisError.method && lunarisError.method !== lunaris.OPERATIONS.LIST) ||
              (lunarisError && !lunarisError.method) ||
              (lunarisError && !lunarisError.version)
          ) {
            lunaris.logger.warn(
              ['Error in component \'' + this.$options.name + '\':', 'vm.$rollback'] ,  new Error('The value must be an object and have the properties \"data\" and \"version\" defined!'));
            return lunaris.logger.tip('vm.$rollback' ,  'value must be: { data : Object, version : Int, storeName : String, method : String }');
          }

          lunaris.rollback('@' + lunarisError.storeName, lunarisError.version);

          var _store = lunaris._vue._vm.$data.$stores[lunarisError.storeName];

          if (lunarisError.method === lunaris.OPERATIONS.INSERT) {
            if (_store.isStoreObject) {
              _resetStoreObject(lunarisError.storeName)();
              return;
            }

            if (_store.view) {
              _store.view._remove(lunaris.utils.cloneAndFreeze(lunarisError.data));
            }
          }


          if (lunarisError.method === lunaris.OPERATIONS.UPDATE) {
            var _data = _getDataForRollback(lunarisError.storeName, lunarisError.data);
            if (_store.isStoreObject) {
              _updateStoreObject(lunarisError.storeName)(_data);
              return;
            }

            if (_store.view) {
              _store.view._update(_data);
            }
          }

          if (lunarisError.method === lunaris.OPERATIONS.DELETE) {
            _data = _getDataForRollback(lunarisError.storeName, lunarisError.data);
            if (_store.isStoreObject) {
              _updateStoreObject(lunarisError.storeName)(_data);
              return;
            }

            if (_store.view) {
              _store.view._update(_data);
            }
          }
        };

        /**
         * Clear form for specified store
         * @param {String} store
         */
        this.$clearForm = function clearForm (store) {
          if (this['$' + store] === undefined) {
            return lunaris.logger.warn(['Error in component \'' + this.$options.name + '\':', 'vm.$clearForm'], new Error('The store \"' + store + '\" has not been registered!'));
          }

          lunaris._vue._vm.$data.$stores[store].form = lunaris.getDefaultValue('@' + store);
        };
      },

      beforeDestroy : function () {
        _removeHooks(this);
        _removeSocketHooks(this);
      },

      beforeRouteLeave : function (to, from, next) {
        _removeHooks(this);
        _removeSocketHooks(this);
        next();
      }
    });
  }
};
