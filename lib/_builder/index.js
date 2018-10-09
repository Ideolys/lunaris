{{__LUNARIS__}}

{{__APP__}}

{{__LUNARIS_PLUGIN__}}

dayjs.extend(dayjs_plugin_localisableFormat);

Vue.use(window.Buefy.default, {
  defaultIconPack: 'fas'
});
Vue.use(window.vueTouchEvents);
Vue.use(VueRouter);
Vue.use(lunaris._vue);

var globals = {{__VUEJS_GLOBALS__}};

var routes  = {{__VUEJS_ROUTES__}};

var router = new VueRouter({
  routes : routes
});

var app = new Vue({{__VUEJS_INSTANCE__}});
