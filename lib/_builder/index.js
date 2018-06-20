{{__APP__}}

Vue.use(window.Buefy.default);
Vue.use(VueRouter);

var globals = {{__VUEJS_GLOBALS__}}

var routes  = {{__VUEJS_ROUTES__}};

var router = new VueRouter({
  routes : routes
});

var app = new Vue({
  el     : '#app',
  router : router,
  data   : function () {
    return {
      globals : globals
    }
  }
});
