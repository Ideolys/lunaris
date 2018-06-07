const should      = require('should');
const compiler    = require('../lib/vue/compiler').test;
const vueCompiler = require('vue-template-compiler');
const transpile   = require('vue-template-es2015-compiler');
const path        = require('path');

describe('Test vue compilation', () => {

  describe('Test compile vue file', () => {

    it('should throw an error if no <template></template> has been found', () => {
      const _vueFile = '<script>exports.default = {}</script>';
      should((function () {
        compiler.compileVueFile(_vueFile);
      })).throw('<template>...</template> not found!');
    });

    it('should throw an error if no <script></script> has been found', () => {
      const _vueFile = '<template><div></div></template>';
      should((function () {
        compiler.compileVueFile(_vueFile);
      })).throw('<script>...</script> not found!');
    });

    it('should throw an error if the template cannot been inserted into vue object', () => {
      const _vueFile = `
        <template>
          <div></div>
        </template>

        <script>
          exports.default = {

          }
        </script>
      `;
      should((function () {
        compiler.compileVueFile(_vueFile);
      })).throw('Cannot compile vue file!');
    });

    it('should insert the template into the vue object : data', () => {
      const _vueFile = `
        <template>
          <div></div>
        </template>

        <script>
          exports.default = {
            data : function () {
              return {};
            }
          }
        </script>
      `;

      var _compiled = compiler.compileVueFile(_vueFile);
      var _template = /template\s*:\s*`(.*)`/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<div></div>');
    });

    it('should insert the template into the vue object : computed', () => {
      const _vueFile = `
        <template>
          <div></div>
        </template>

        <script>
          exports.default = {
            computed : {
              test : function () {
                retun this.something;
              }
            }
          }
        </script>
      `;

      var _compiled = compiler.compileVueFile(_vueFile);
      var _template = /template\s*:\s*`(.*)`/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<div></div>');
    });

    it('should insert the template into the vue object : props', () => {
      const _vueFile = `
        <template>
          <div></div>
        </template>

        <script>
          exports.default = {
            props : ['test']
          }
        </script>
      `;

      var _compiled = compiler.compileVueFile(_vueFile);
      var _template = /template\s*:\s*`(.*)`/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<div></div>');
    });

    it('should insert the template into the vue object : methods', () => {
      const _vueFile = `
        <template>
          <div></div>
        </template>

        <script>
          exports.default = {
            methods : {
              test : function () {
                console.log('test');
              }
            }
          }
        </script>
      `;

      var _compiled = compiler.compileVueFile(_vueFile);
      var _template = /template\s*:\s*`(.*)`/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<div></div>');
    });

    it('should insert the template into the vue object : *', () => {
      const _vueFile = `
        <template>
          <div></div>
        </template>

        <script>
          exports.default = {
            props : ['test'],
            data : function () {
              return {
                something : 'car'
              };
            }
            computed : {
              test : function () {
                retun this.something;
              }
            }
            methods : {
              test : function () {
                console.log('test');
              }
            }
          }
        </script>
      `;

      var _compiled = compiler.compileVueFile(_vueFile);
      var _template = /template\s*:\s*`(.*)`/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<div></div>');
    });

    it('should remove uneccessary spaces', () => {
      const _vueFile = `
        <template>
          <ul class="bla bloop">
            <li v-for="item in items">{{ item.id }}</li>
          </ul>
        </template>

        <script>
          exports.default = {
            props : ['items']
          }
        </script>
      `;

      var _compiled = compiler.compileVueFile(_vueFile);
      var _template = /template\s*:\s*`(.*)`/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>');
    });

  });

  describe('Test compileVuejsTemplate', () => {

    it('should replace template by render and staticRenderFns : \'', () => {
      var _vueFile = `
        exports.default = {
          template : '<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>',
          props : ['items']
        }
      `;
      var _template = '<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>';
      var _compiled = compiler.compileVuejsTemplate(_vueFile, _template);

      should(/template/.test(_compiled)).eql(false);
      should(/render/.test(_compiled)).eql(true);
      should(/staticRenderFns/.test(_compiled)).eql(true);
    });

    it('should replace template by render and staticRenderFns : "', () => {
      var _vueFile = `
        exports.default = {
          template : "<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>",
          props : ['items']
        }
      `;
      var _template = '<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>';
      var _compiled = compiler.compileVuejsTemplate(_vueFile, _template);

      should(/template/.test(_compiled)).eql(false);
      should(/render/.test(_compiled)).eql(true);
      should(/staticRenderFns/.test(_compiled)).eql(true);
    });

    it('should replace template by render and staticRenderFns : \`', () => {
      var _vueFile = `
        exports.default = {
          template : \`<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>\`,
          props : ['items']
        }
      `;
      var _template = '<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>';
      var _compiled = compiler.compileVuejsTemplate(_vueFile, _template);

      should(/template/.test(_compiled)).eql(false);
      should(/render/.test(_compiled)).eql(true);
      should(/staticRenderFns/.test(_compiled)).eql(true);
    });

    it('should generate render function', () => {
      var _vueFile = `
        exports.default = {
          template : '<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>',
          props : ['items']
        }
      `;
      var _template = '<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>';
      var _compiled = compiler.compileVuejsTemplate(_vueFile, _template);

      var _render = /render\s*:\s*(.*),/.exec(_compiled);

      should(_render.length).eql(2);
      var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
      _expectedCode     = transpile(_expectedCode);
      should(_render[1]).eql(_expectedCode);
    });

  });

  describe('Test compileVuejsTemplates', () => {

    it('should compile sub template if a path is provided', () => {
      var _file = `
        exports.default = {
          template : './template.html',
          data     : function () {
            return {};
          },
          props    : ['test']
        }
      `;

      var _compiled = compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file);
      var _template = /template\s*:\s*'(.*)'/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<ul class="bla bloop"><li v-for="item in items">{{ item.id ? \\\'1\\\' : \\\'2\\\'}}</li></ul>');
    });

    it('should compile template : dash in filename', () => {
      var _file = `
        exports.default = {
          template : './require-with-dashs.html',
          data     : function () {
            return {};
          }
        }
      `;

      var _compiled = compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file);
      var _template = /template\s*:\s*'(.*)'/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<div></div>');
    });

    it('should compile vue file', () => {
      var _file = `
        <template>
          <ul class="bla bloop">
            <li v-for="item in items">{{ item.id ? '1' : '2'}}</li>
          </ul>
        </template>

        <script>
          exports.default = {
            props : ['test']
          }
        </script>
      `;

      var _compiled = compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.vue'), _file);
      var _template = /template\s*:\s*`(.*)`/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<ul class="bla bloop"><li v-for="item in items">{{ item.id ? \'1\' : \'2\'}}</li></ul>');
    });

    describe('production', () => {

      it('should compile templates', () => {
        var _file = `
        exports.default = {
          template : './template.html',
          data     : function () {
            return {};
          },
          props    : ['test']
        }
        `;

        var _template = '<ul class="bla bloop"><li v-for="item in items">{{ item.id ? \'1\' : \'2\' }}</li></ul>';
        var _compiled = compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file, { isProduction : true });

        should(/template/.test(_compiled)).eql(false);
        should(/render/.test(_compiled)).eql(true);
        should(/staticRenderFns/.test(_compiled)).eql(true);

        var _render = /render\s*:\s*(.*),/.exec(_compiled);

        should(_render.length).eql(2);
        var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
        _expectedCode     = transpile(_expectedCode);
        should(_render[1]).eql(_expectedCode);
      });

      it('should compile file : template with \\n', () => {
        var _file = `
          Vue.component('list-cars', {
            template : '
              <ul class="bla bloop">
                <li v-for="item in items">{{ item.id }}</li>
              </ul>
            ',
            data     : function () {
              return {
                cars : [
                  'Tesla',
                  'Zoé'
                ]
              }
            }
          });
        `;

        var _template = '<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>';
        var _compiled = compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file, { isProduction : true });

        should(/template/.test(_compiled)).eql(false);
        should(/render/.test(_compiled)).eql(true);
        should(/staticRenderFns/.test(_compiled)).eql(true);

        var _render = /render\s*:\s*(.*),/.exec(_compiled);

        should(_render.length).eql(2);

        var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
        _expectedCode     = transpile(_expectedCode);
        should(_render[1]).eql(_expectedCode);
      });

      it('should compile file : static HTML', () => {
        var _file = `
          Vue.component('list-cars', {
            template : '
              <ul class="bla bloop">
                <li>option</li>
              </ul>
            ',
            data     : function () {
              return {
                cars : [
                  'Tesla',
                  'Zoé'
                ]
              }
            }
          });
        `;

        var _compiled = compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file, { isProduction : true });

        should(/template/.test(_compiled)).eql(false);
        should(/render/.test(_compiled)).eql(true);
        should(/staticRenderFns/.test(_compiled)).eql(true);

        var _render          = /render\s*:\s*(.*),/.exec(_compiled);
        var _staticRenderFns = /staticRenderFns\s*:\s*(.*),/.exec(_compiled);

        var _template   = '<ul class="bla bloop"><li>option</li></ul>';
        var _compileRes = vueCompiler.compile(_template);

        should(_render.length).eql(2);
        var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
        _expectedCode     = transpile(_expectedCode);
        should(_render[1]).eql(_expectedCode);

        _compileRes.staticRenderFns = _compileRes.staticRenderFns.map((code, index) => {
          code = 'function staticRender_' + index + ' () {' + code + '}';
          return transpile(code);
        });
        should(_staticRenderFns[1]).eql('[' + _compileRes.staticRenderFns.join(',') + ']');
      });

      it('should compile vue file', () => {
        var _file = `
          <template>
            <ul class="bla bloop">
              <li v-for="item in items">{{ item.id }}</li>
            </ul>
          </template>

          <script>
            exports.default = {
              props : ['items']
            }
          </script>
        `;

        var _template = '<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>';
        var _compiled = compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.vue'), _file, { isProduction : true });

        should(/template/.test(_compiled)).eql(false);
        should(/render/.test(_compiled)).eql(true);
        should(/staticRenderFns/.test(_compiled)).eql(true);

        var _render = /render\s*:\s*(.*),/.exec(_compiled);

        should(_render.length).eql(2);
        var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
        _expectedCode     = transpile(_expectedCode);
        should(_render[1]).eql(_expectedCode);
      });

      it('should compile vue file : regex \\n', () => {
        var _file = `
          Vue.component('list-cars', {
            template : './template.html',
            data     : function () {
              return {
                cars : ['Tesla', 'Zoé']
              }
            }
          });
        `;

        var _template = '<ul class="bla bloop"><li v-for="item in items">{{ item.id ? \'1\' : \'2\'}}</li></ul>';
        var _compiled = compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file, { isProduction : true });

        should(/template/.test(_compiled)).eql(false);
        should(/render/.test(_compiled)).eql(true);
        should(/staticRenderFns/.test(_compiled)).eql(true);

        var _render = /render\s*:\s*(.*),/.exec(_compiled);

        should(_render.length).eql(2);
        var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
        _expectedCode     = transpile(_expectedCode);
        should(_render[1]).eql(_expectedCode);
      });

      it('should not compile vue file if a syntax error has been found', () => {
        var _file = `
          <template>
            <ul class="bla bloop">
              <li v-for="item in items">{{ item.id ? '1' : '2'}}</li>
            </ul>
          </template>

          <script>
            exports.default = {
              props : ['item']
            }
          </script>
        `;

        var _template = '<ul class="bla bloop"><li v-for="item in items">{{ item.id ? \'1\' : \'2\' }}</li></ul>';
        var _compiled = compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.vue'), _file, { isProduction : true });

        should(/template/.test(_compiled)).eql(false);
        should(/render/.test(_compiled)).eql(true);
        should(/staticRenderFns/.test(_compiled)).eql(true);

        var _render = /render\s*:\s*(.*),/.exec(_compiled);

        should(_render.length).eql(2);
        var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
        _expectedCode     = transpile(_expectedCode);
        should(_render[1]).eql(_expectedCode);
      });

      it('should compile if a path is provided', () => {
        var _file = `
          exports.default = {
            template : './template.html',
            data     : function () {
              return {};
            },
            props    : ['test']
          }
        `;

        var _template = '<ul class="bla bloop"><li v-for="item in items">{{ item.id ? \'1\' : \'2\' }}</li></ul>';
        var _compiled = compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file, { isProduction : true });

        should(/template/.test(_compiled)).eql(false);
        should(/render/.test(_compiled)).eql(true);
        should(/staticRenderFns/.test(_compiled)).eql(true);

        var _render = /render\s*:\s*(.*),/.exec(_compiled);

        should(_render.length).eql(2);
        var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
        _expectedCode     = transpile(_expectedCode);
        should(_render[1]).eql(_expectedCode);
      });

    });
  });

  describe('Test profileTemplate', () => {

    it('should not render <h1>', () => {
      var _html = '<div>{{# GET /vue }}<h1>GET vue</h1>{{#}}</div>';
      var _res  = compiler.profileTemplate(_html, {
        'GET /vue' : false
      });

      should(_res).eql('<div></div>');
    });

    it('should render <h1> : negation in html', () => {
      var _html = '<div>{{!# GET /vue }}<h1>CANNOT GET vue</h1>{{#}}</div>';
      var _res  = compiler.profileTemplate(_html, {
        'GET /vue' : false
      });

      should(_res).eql('<div><h1>CANNOT GET vue</h1></div>');
    });

    it('should render <h1>', () => {
      var _html = '<div>{{# GET /vue }}<h1>GET vue</h1>{{#}}</div>';
      var _res  = compiler.profileTemplate(_html, {
        'GET /vue' : true
      });

      should(_res).eql('<div><h1>GET vue</h1></div>');
    });

    it('should render <h1> and not <h2>', () => {
      var _html = '<div>{{# GET /vue }}<h1>GET vue</h1>{{#}}{{# POST /vue }}<h2>POST vue</h2>{{#}}</div>';
      var _res  = compiler.profileTemplate(_html, {
        'GET /vue'  : true,
        'POST /vue' : false
      });

      should(_res).eql('<div><h1>GET vue</h1></div>');
    });

    it('should render <h1> and <h2>', () => {
      var _html = '<div>{{# GET /vue }}<h1>GET vue</h1>{{#}}{{# POST /vue }}<h2>POST vue</h2>{{#}}</div>';
      var _res  = compiler.profileTemplate(_html, {
        'GET /vue'  : true,
        'POST /vue' : true
      });

      should(_res).eql('<div><h1>GET vue</h1><h2>POST vue</h2></div>');
    });

    it('should render <h1> and <h2> : negation', () => {
      var _html = '<div>{{# GET /vue }}<h1>GET vue</h1>{{#}}{{!# POST /vue }}<h2>CANNOT POST vue</h2>{{#}}</div>';
      var _res  = compiler.profileTemplate(_html, {
        'GET /vue'  : true,
        'POST /vue' : false
      });

      should(_res).eql('<div><h1>GET vue</h1><h2>CANNOT POST vue</h2></div>');
    });

    it('should render <h2> in <h1> : negation', () => {
      var _html = '<div>{{# GET /vue }}<h1>GET vue{{# POST /vue }}<h2>POST vue</h2>{{#}}</h1>{{#}}</div>';
      var _res  = compiler.profileTemplate(_html, {
        'GET /vue'  : true,
        'POST /vue' : true
      });

      should(_res).eql('<div><h1>GET vue<h2>POST vue</h2></h1></div>');
    });

    it('should render <h2> if <h1> cannot be displayed', () => {
      var _html = '<div>{{# GET /vue }}<h1>GET vue</h1>{{##}}<h2>CANNOT GET vue</h2>{{#}}</div>';
      var _res  = compiler.profileTemplate(_html, {
        'GET /vue'  : false
      });

      should(_res).eql('<div><h2>CANNOT GET vue</h2></div>');
    });

    it('should render <h3> in <h2> if <h1> cannot be displayed', () => {
      var _html = '<div>{{# GET /vue }}<h1>GET vue</h1>{{##}}<h2>CANNOT GET vue{{# POST /vue }}<h3>POST vue</h3>{{#}}</h2>{{#}}</div>';
      var _res  = compiler.profileTemplate(_html, {
        'GET /vue'  : false,
        'POST /vue' : true
      });

      should(_res).eql('<div><h2>CANNOT GET vue<h3>POST vue</h3></h2></div>');
    });

    it('should render <h1> : negation else', () => {
      var _html = '<div>{{!# GET /vue }}<h1>GET vue</h1>{{##}}<h2>CANNOT GET vue</h2>{{#}}</div>';
      var _res  = compiler.profileTemplate(_html, {
        'GET /vue'  : false
      });

      should(_res).eql('<div><h1>GET vue</h1></div>');
    });

    // todo negation

  });
})
