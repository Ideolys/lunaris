lunaris._vue = {
  _vm : new Vue({
    data : {
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
     * Register stores to obtain vm.$<store>
     * @param {Object} _this instance vue
     */
    function _registerStores (_this) {
      var _stores = _this.$options.stores;
      if (!_stores) {
        return;
      }
      if (!Array.isArray(_stores)) {
        throw new Error('vm.stores must be an Array');
      }

      for (var i = 0; i < _stores.length; i++) {
        var _store = _stores[i];

        if (!lunaris._vue._vm.$data.$stores[_store]) {
          throw new Error('Store `' + _store + '` has not been defined. Please register a store with: vm.stores = [<store>, ...]');
        }

        // re-initialize current store
        lunaris._vue._vm.$data.$stores[_store].state.splice(0);

        Object.defineProperty(_this, '$' + _store, {
          get : function () {
            return lunaris._vue._vm.$data.$stores[_store].state;
          }
        });
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
        throw new Error('vm.storeHooks must be an Object');
      }

      var _hookKeys = Object.keys(_hooks);
      for (var i = 0; i < _hookKeys.length; i++) {
        var _hook = _hooks[_hookKeys[i]];

        if (typeof _hook !== 'function') {
          throw new Error('vm.storeHooks.' + _hookKeys[i] + ' must be a Function');
        }

        lunaris.hook(_hookKeys[i], _hook);
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
    }

    Vue.mixin({
      beforeCreate: function () {
        _registerStores(this);
      },

      created : function () {
        _registerHooks(this);
      },

      beforeDestroy : function () {
        _removeHooks(this);
      }
    });
  }
};
