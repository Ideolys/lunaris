const fs       = require('fs');
const path     = require('path');
const rollup   = require('rollup');
const compiler = require('./vue/compiler');

const vuejsIndex = fs.readFileSync(path.join(__dirname, 'vue', 'index.js')).toString();

const options = {
  modulesFolder               : null,
  vuejsGlobalComponentsFolder : null,
  rights                      : {},
  profile                     : {},
  isProduction                : false
};

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
          _file = _file.substring(options.vuejsGlobalComponentsFolder.length + 1, _file.length);
          _results.push(_file);
        }
        else if(_file.substring(_file.length - 4, _file.length) === '.vue'){
          _file = _file.substring(options.vuejsGlobalComponentsFolder.length + 1, _file.length);
          _results.push(_file);
        }

        next();
      });
    }

    next();
  });
};
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

function build (buildOptions, callback) {
  buildOptions = Object.assign(options, buildOptions);

  walkModules(buildOptions.modulesFolder, (err, modules) => {
    if (err) return console.log(err);

    var _router  = '';
    var _imports = '';

    for (var i = 0; i < modules.length; i++) {
      var _paths = Object.keys(modules[i][1]);
      for (var j = 0; j < _paths.length; j++) {
        var _var =  modules[i][0].replace(/[\.\/-]/g, '_');
        _imports += 'import ' + _var + ' from \'' + path.join(modules[i][0], modules[i][1][_paths[j]].controllers) + '\';\n';
        _router  += '{ path: \'' + _paths[j] + '\', component : ' + _var + ' } ,';
      }
    }

    _router = '[' + _router + ']';

    var _index = vuejsIndex
                    .replace(/\{\{__VUEJS_ROUTES__\}\}/g, _router)
                    .replace(/\{\{__VUEJS_ROUTES_IMPORTS__\}\}/g, _imports);

    const _fakeEntry           = 'index.js';
    const _rolluptInputOptions = {
      input   : 'index.js',
      plugins : [
        {
          name : 'rollup-plugin-stream-entry',
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
        compiler()
      ],
      //external : ['vue', 'vue-router'],
    };

    rollup.rollup(_rolluptInputOptions).then(bundle => {
      const result = bundle.generate({
        format    : 'umd',
        exports   : 'none',
        sourceMap : false
      }).then(result => {
        console.log(result)
        callback(null, _insertDependencies(result.code, buildOptions));
      }).catch(err => {
        callback(err, null);
      });
    }).catch(err => {
      callback(err, null);
    });
  });
 }

module.exports = build;

