const fs       = require('fs');
const path     = require('path');
const rollup   = require('rollup');
const compiler = require('./_builder/compiler').compiler;

const vuejsIndex = fs.readFileSync(path.join(__dirname, '_builder', 'index.js')).toString();

const options = {
  modulesFolder               : null,
  vuejsGlobalComponentsFolder : null,
  rights                      : {},
  profile                     : {},
  isProduction                : false
};

/**
 * Get all vuejs global components
 * @param {String} dir
 * @param {Function} done err, globalComponents -> [pathToComp1, pathToComp2, ..., pathToCompN]
 */
function walkVuejsGlobalComponents (dir, done) {
  var _results = [];
  fs.readdir(dir, function(err, list) {
    if (err) {
      return done(err);
    }

    var i = 0;
    function next() {
      var _file = list[i++];
      if (!_file) {
        return done(null, _results);
      }

      _file = dir + '/' + _file;
      fs.stat(_file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          return walkVuejsGlobalComponents(_file, function(err, res) {
            _results = _results.concat(res);
            next();
          });
        }

        if(_file.substring(_file.length - 3, _file.length) === '.js'){
          _results.push(_file);
        }
        else if(_file.substring(_file.length - 4, _file.length) === '.vue'){
          _results.push(_file);
        }

        next();
      });
    }

    next();
  });
};
/**
 * Get all modules
 * @param {String} dir
 * @param {Function} done err, modules -> [[ path, routes.json file content ], ...]
 */
function walkModules (dir, done) {
  var results = [];
  fs.readdir(dir, function(err, list) {
    if (err) {
      return done(err);
    }

    var i = 0;
    function next() {
      var file = list[i++];
      if (!file) {
        return done(null, results);
      }

      file = dir + '/' + file;
      fs.stat(file, function(err, stat) {
        if (stat && stat.isDirectory()) {
          var _path = path.join(file, 'routes.json');
          if (fs.existsSync(_path)) {
            var _routes = fs.readFileSync(_path);
            results.push([file, JSON.parse(_routes)]);
          }
        }

        next();
      });
    }

    next();
  });
};

/**
 * Cosntruct dependencies
 * @param {String} js fake index.js content
 * @param {Object} options { isProduction : true | false }
 * @returns {String}
 */
function _insertDependencies (js, options) {
  var _libs = [];

  // vuejs
  const vuejsPath = require.resolve('vue');
  const vuejsDir  = vuejsPath.split('/').slice(0, -1).join('/');
  const vueBuild  = options.isProduction ? 'vue.min.js' : 'vue.js';
  _libs.push(fs.readFileSync(path.join(vuejsDir, vueBuild), 'utf8'));

  // vue-router
  const vueRouterPath = require.resolve('vue-router');
  const vueRouterDir  = vueRouterPath.split('/').slice(0, -1).join('/');
  _libs.push(fs.readFileSync(path.join(vueRouterDir, 'vue-router.min.js'), 'utf8'));

  return _libs.join('\n') + js;
}

/**
 * Is process module needs to be include in the build
 * @param {Object} profile
 * @param {String} module
 * @return {Boolean}
 */
function _isModuleAuthorized (profile, module) {
  var _allowedModules = profile.modules || [];
  var _module         = module.replace(path.dirname(module) + '/', '');
  return _allowedModules.indexOf(_module) !== -1;
}

/**
 * Build the client
 * It generates a fake index.js from where to build imports
 * @param {Object} buildOptions object detailed above
 * @param {Function} callback called when the build is complete
 */
function build (buildOptions, callback) {
  buildOptions = Object.assign(options, buildOptions);

  var _imports = '';
  walkVuejsGlobalComponents(buildOptions.vuejsGlobalComponentsFolder, (err, globalComponents) => {
    if (err) return console.log(err);

    for (var i = 0; i < globalComponents.length; i++) {
      var _var =  globalComponents[i].replace(/[\.\/-]/g, '_');
      _imports += 'import ' + _var + ' from \'' + path.join(globalComponents[i]) + '\';\n';
    }

    walkModules(buildOptions.modulesFolder, (err, modules) => {
      if (err) return console.log(err);

      var _router  = '';

      for (var i = 0; i < modules.length; i++) {
        var _paths = Object.keys(modules[i][1]);

        for (var j = 0; j < _paths.length; j++) {
          var _var =  modules[i][0].replace(/[\.\/-]/g, '_');

          if (_isModuleAuthorized(buildOptions.profile, modules[i][0])) {
            _imports += 'import ' + _var + ' from \'' + path.join(modules[i][0], modules[i][1][_paths[j]].controllers) + '\';\n';
            _router  += '{ path: \'' + _paths[j] + '\', component : ' + _var + ' } ,';
          }
        }
      }

      _router = '[' + _router + ']';

      var _index = vuejsIndex
                      .replace(/\{\{__VUEJS_ROUTES__\}\}/g, _router)
                      .replace(/\{\{__VUEJS_ROUTES_IMPORTS__\}\}/g, _imports);

      // build rights
      buildOptions.profile.rights = {};

      var _routes = buildOptions.profile.routes || [];
      for (var i = 0; i < _routes.length; i++) {
        var _route = _routes[i].replace(/:[a-zA-Z]+/g, '#');

        buildOptions.profile.rights[_route] = true;
      }

      const _fakeEntry           = 'index.js';
      const _rolluptInputOptions = {
        input   : 'index.js',
        plugins : [
          {
            load : id => {
              if (id === _fakeEntry) {
                return _index;
              }
            },
            resolveId : id => {
              if (id === _fakeEntry) {
                return _fakeEntry;
              }
            }
          },
          compiler({
            isProduction : buildOptions.isProduction,
            rights       : buildOptions.profile.rights
          })
        ]
      };

      rollup.rollup(_rolluptInputOptions).then(bundle => {
        const result = bundle.generate({
          format    : 'umd',
          sourceMap : false
        }).then(result => {
          callback(null, _insertDependencies(result.code, buildOptions));
        }).catch(err => {
          callback(err, null);
        });
      }).catch(err => {
        callback(err, null);
      });
    });
  });
 }

module.exports = build;

