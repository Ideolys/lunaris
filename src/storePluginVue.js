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
    Vue.mixin({
      beforeCreate: function () {
        var _stores = this.$options.stores;

        if (!_stores || !Array.isArray(_stores)) {
          return;
        }

        for (var i = 0; i < _stores.length; i++) {
          var _store = _stores[i];

          // re-initialize current store
          lunaris._vue._vm.$data.$stores[_store].state.splice(0);

          Object.defineProperty(this, '$' + _store, {
            get : function () {
              return lunaris._vue._vm.$data.$stores[_store].state;
            }
          });
        }
      }
    });
  }
};
