{{__APP__}}

Vue.use(window.Buefy.default);
Vue.use(VueRouter);

var routes = {{__VUEJS_ROUTES__}};

var router = new VueRouter({
  routes : routes
});

var app = new Vue({
  el     : '#app',
  router : router
});
