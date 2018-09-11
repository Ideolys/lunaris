const fs        = require('fs');
const path      = require('path');
const translate = require('./_builder/translate');

/**
 * Get routes
 * @param {Object} options : {
 *  langPath
 *  lang
 *  clientPath
 *  modulesFolder
 *  groupsPath
 * }
 */
function getRoutes (options) {
  var routes      = {};
  var _groupsPath = path.join(options.groupsPath);

  if (!fs.existsSync(_groupsPath)) {
    return console.log('Specify your groups in groups.json');
  }

  var _groups      = require(_groupsPath);
  var _modulesPath = path.join(options.clientPath, options.modulesFolder);
  var _modules     = fs.readdirSync(_modulesPath);

  for (var i = 0; i < _modules.length; i++) {
    var _moduleName = _modules[i];
    var _dirPath    = path.join(_modulesPath, _moduleName);
    var _stat       = fs.statSync(_dirPath);

    if (_stat.isDirectory()) {
      var _routesPath = path.join(_dirPath, 'routes.json');
      if (fs.existsSync(_routesPath)) {
        var _routes = require(_routesPath);

        for (var r in _routes) {
          var _route = _routes[r];

          if (r !== '*') {
            if (_route.group instanceof Array) {
              _route.groups = [{
                name : _route.group[0],
                sort : _route.group[1]
              }];
            }

            if (_route.groups instanceof Array) {
              for (var x = 0; x < _route.groups.length; x++) {
                var _group = _route.groups[x];

                if ( typeof routes[_group.name] !== 'object' ) {
                  routes[_group.name] = { routes : {} };
                }
                routes[_group.name].routes[r] = {
                  module      : _moduleName,
                  name        : _route.name,
                  description : _route.description,
                  sort        : _group.sort
                };
              }
            }
          }
        }
      }
    }
  }

  var _groupIncrement = 1;
  for (var g in _groups) {
    if (typeof routes[g] === 'object') {
      _group        = _groups[g];
      _group.sort   = _groupIncrement;
      _group.routes = routes[g].routes;
      routes[g]     = _group;

      _groupIncrement++;
    }
  }

  var _routesTxt = JSON.stringify(routes);
  routes         = translate(options.langPath, 'en', _routesTxt);
  return JSON.parse(routes);
}

module.exports = getRoutes;

