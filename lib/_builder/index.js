var lunaris = (function (lunaris) {
  {{__LUNARIS__}}

  {{__APP__}}

  {{__LUNARIS_PLUGIN__}}

  var globals = {{__VUEJS_GLOBALS__}};

  dayjs.extend(dayjs_plugin_localisableFormat);

  Vue.use(window.Buefy.default, {
    defaultIconPack: 'fas'
  });
  Vue.use(window.vueTouchEvents);
  Vue.use(VueRouter);
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

  var router = new VueRouter({
    routes : routes
  });

  var app = new Vue({{__VUEJS_INSTANCE__}});

  {{__STORE_NAMES__}}
  return lunaris
})({});
