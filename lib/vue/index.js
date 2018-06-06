//import Vue       from 'vue';
//import VueRouter from 'vue-router';

{{__VUEJS_ROUTES_IMPORTS__}}

Vue.use(VueRouter);

var routes = {{__VUEJS_ROUTES__}};

var router = new VueRouter({
  routes : routes
});

var app = new Vue({
  el     : '#app',
  router : router
});
