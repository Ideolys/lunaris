const should      = require('should');
const compiler    = require('../lib/_builder/compiler').test;
const vueCompiler = require('vue-template-compiler');
// const transpile   = require('vue-template-es2015-compiler');
const path        = require('path');
const fs          = require('fs');

// Pay attention, vue templates are compiled by default. The skipped tests are for non compilated templates.

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

    it.skip('should insert the template into the vue object : data', () => {
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
      var _template = /template\s*:\s*`(.*)`,/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<div></div>');
    });

    it.skip('should insert the template into the vue object : computed', () => {
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
      var _template = /template\s*:\s*`(.*)`,/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<div></div>');
    });

    it.skip('should insert the template into the vue object : props', () => {
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
      var _template = /template\s*:\s*`(.*)`,/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<div></div>');
    });

    it.skip('should insert the template into the vue object : methods', () => {
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
      var _template = /template\s*:\s*`(.*)`,/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<div></div>');
    });

    it.skip('should insert the template into the vue object : *', () => {
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
      var _template = /template\s*:\s*`(.*)`,/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<div></div>');
    });

    it.skip('should remove uneccessary spaces', () => {
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
      var _template = /template\s*:\s*`(.*)`,/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>');
    });

  });

  describe('Test compileVuejsTemplate', () => {

    it('should replace template by render and staticRenderFns : \'', () => {
      var _vueFile = `
        exports.default = {
          template : './template_simple.js',
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
          template : "./template_simple.js",
          props : ['items']
        }
      `;
      var _template = '<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>';
      var _compiled = compiler.compileVuejsTemplate(_vueFile, _template);

      should(/template/.test(_compiled)).eql(false);
      should(/render/.test(_compiled)).eql(true);
      should(/staticRenderFns/.test(_compiled)).eql(true);
    });

    it('should replace template by render and staticRenderFns : `', () => {
      var _vueFile = `
        exports.default = {
          template : \`./template_simple.js\`,
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
          template : './template_simple.js',
          props : ['items']
        }
      `;
      var _template = '<ul class="bla bloop"><li v-for="item in items">{{ item.id }}</li></ul>';
      var _compiled = compiler.compileVuejsTemplate(_vueFile, _template);

      var _render = /render\s*:\s*(.*),/.exec(_compiled);

      should(_render.length).eql(2);
      var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
      should(_render[1]).eql(_expectedCode);
    });

  });

  describe('Test compileVuejsTemplates', () => {

    it.skip('should compile sub template if a path is provided', () => {
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
      var _template = /template\s*:\s*'(.*)',/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<ul class="bla bloop"><li v-for="item in items">{{ item.id ? \\\'1\\\' : \\\'2\\\'}}</li></ul>');
    });

    it.skip('should compile template : dash in filename', () => {
      var _file = `
        exports.default = {
          template : './require-with-dashs.html',
          data     : function () {
            return {};
          }
        }
      `;

      var _compiled = compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file);
      var _template = /template\s*:\s*'(.*)',/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<div></div>');
    });

    it.skip('should compile vue file', () => {
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
      var _template = /template\s*:\s*`(.*)`,/.exec(_compiled);
      should(_template.length).eql(2);
      should(_template[1]).eql('<ul class="bla bloop"><li v-for="item in items">{{ item.id ? \\\'1\\\' : \\\'2\\\'}}</li></ul>');
    });

    describe('production', () => {

      it('should compile templates', done => {
        var _file = `
        exports.default = {
          template : './template.html',
          data     : function () {
            return {};
          },
          props    : ['test']
        }
        `;

        var _template = `
          <ul class="bla bloop">
            <li v-for="item in items">{{ item.id ? '1' : '2' }}</li>
          </ul>
        `;
        compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file, { isProduction : false }, (err, compiled) => {
          should(/template/.test(compiled)).eql(false);
          should(/render/.test(compiled)).eql(true);
          should(/staticRenderFns/.test(compiled)).eql(true);

          var _render = /render\s*:\s*(.*),/.exec(compiled);

          should(_render.length).eql(2);
          var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
          should(_render[1]).eql(_expectedCode);
          done();
        });
      });

      it('should compile file : template with \\n', done => {
        var _file = `
          Vue.component('list-cars', {
            template : './template.html',
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

        var _template = `
          <ul class="bla bloop">
            <li v-for="item in items">{{ item.id ? '1' : '2' }}</li>
          </ul>
        `;
        compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file, { isProduction : false }, (err, compiled) => {
          should(/template/.test(compiled)).eql(false);
          should(/render/.test(compiled)).eql(true);
          should(/staticRenderFns/.test(compiled)).eql(true);

          var _render = /render\s*:\s*(.*),/.exec(compiled);

          should(_render.length).eql(2);

          var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
          should(_render[1]).eql(_expectedCode);
          done();
        });
      });

      it('should compile file : static HTML', done => {
        var _file = `
          Vue.component('list-cars', {
            template : 'template_static.html'
          });
        `;

        compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file, { isProduction : false }, (err, compiled) => {
          should(/template/.test(compiled)).eql(false);
          should(/render/.test(compiled)).eql(true);
          should(/staticRenderFns/.test(compiled)).eql(true);

          var _render          = /render\s*:\s*(.*),/.exec(compiled);
          var _staticRenderFns = /staticRenderFns\s*:\s*(.*),/.exec(compiled);

          var _template   = fs.readFileSync(path.join(__dirname, 'datasets', 'vue', 'template_static.html')).toString();
          var _compileRes = vueCompiler.compile(_template);

          should(_render.length).eql(2);
          var _expectedCode = 'function render () {' + _compileRes.render + '}';

          should(_render[1]).eql(_expectedCode);

          _compileRes.staticRenderFns = _compileRes.staticRenderFns.map((code, index) => {
            return 'function staticRender_' + index + ' () {' + code + '}';
          });
          should(_staticRenderFns[1]).eql('[' + _compileRes.staticRenderFns.join(',') + ']');
          done();
        });
      });

      it('should compile vue file', done => {
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
        compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.vue'), _file, {}, (err, compiled) => {
          should(/template/.test(compiled)).eql(false);
          should(/render/.test(compiled)).eql(true);
          should(/staticRenderFns/.test(compiled)).eql(true);

          var _render = /render\s*:\s*(.*),/.exec(compiled);

          should(_render.length).eql(2);
          var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
          should(_render[1]).eql(_expectedCode);
          done();
        });
      });

      it('should compile vue file with condition and translate', done => {
        var _file = `
          <template>
            <ul class="bla bloop">
              {{# GET /vue}}
                <li v-for="item in items">{{ item.id }}</li>
              {{#}}
              \${More}
            </ul>
          </template>

          <script>
            exports.default = {
              props : ['items']
            }
          </script>
        `;

        var _template = '<ul class="bla bloop">More+</ul>';
        compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.vue'), _file, {
          langPath : path.join(__dirname, 'datasets', 'lang'),
          lang     : 'en'
        }, (err, compiled) => {
          should(/template/.test(compiled)).eql(false);
          should(/render/.test(compiled)).eql(true);
          should(/staticRenderFns/.test(compiled)).eql(true);

          var _render = /render\s*:\s*(.*),/.exec(compiled);

          should(_render.length).eql(2);
          var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
          should(_render[1]).eql(_expectedCode);
          done();
        });
      });

      it('should compile vue file with condition and translate a l\'', done => {
        var _file = `
          <template>
            <ul class="bla bloop">
              {{# GET /vue}}
                <li v-for="item in items">{{ item.id }}</li>
              {{#}}
              \${the other}
            </ul>
          </template>

          <script>
            exports.default = {
              props : ['items']
            }
          </script>
        `;

        var _template = '<ul class="bla bloop">l\'autre</ul>';
        compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.vue'), _file, {
          langPath : path.join(__dirname, 'datasets', 'lang'),
          lang     : 'fr'
        }, (err, compiled) => {
          should(/template/.test(compiled)).eql(false);
          should(/render/.test(compiled)).eql(true);
          should(/staticRenderFns/.test(compiled)).eql(true);

          var _render = /render\s*:\s*(.*),/.exec(compiled);

          should(_render.length).eql(2);
          var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
          should(_render[1]).eql(_expectedCode);
          done();
        });
      });

      it('should compile vue file : regex \\n', done => {
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
        compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file, { isProduction : false }, (err, compiled) => {
          should(/template/.test(compiled)).eql(false);
          should(/render/.test(compiled)).eql(true);
          should(/staticRenderFns/.test(compiled)).eql(true);

          var _render = /render\s*:\s*(.*),/.exec(compiled);

          should(_render.length).eql(2);
          var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
          should(_render[1]).eql(_expectedCode);
          done();
        });
      });

      it('should not compile vue file if a syntax error has been found', done => {
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
        compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.vue'), _file, { isProduction : false }, (err, compiled) => {
          should(/template/.test(compiled)).eql(false);
          should(/render/.test(compiled)).eql(true);
          should(/staticRenderFns/.test(compiled)).eql(true);

          var _render = /render\s*:\s*(.*),/.exec(compiled);

          should(_render.length).eql(2);
          var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
          should(_render[1]).eql(_expectedCode);
          done();
        });
      });

      it('should compile if a path is provided', done => {
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
        compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file, { isProduction : false }, (err, compiled) => {
          should(/template/.test(compiled)).eql(false);
          should(/render/.test(compiled)).eql(true);
          should(/staticRenderFns/.test(compiled)).eql(true);

          var _render = /render\s*:\s*(.*),/.exec(compiled);

          should(_render.length).eql(2);
          var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
          should(_render[1]).eql(_expectedCode);
          done();
        });
      });

      it('should compile and translate', done => {
        var _file = `
          exports.default = {
            template : './translate.html',
            data     : function () {
              return {};
            },
            props    : ['test']
          }
        `;

        var _template = '<div>l\'autre</div>';
        compiler.compileVuejsTemplates(path.join(__dirname, 'datasets', 'vue', 'module.js'), _file, {
          isProduction : false,
          langPath     : path.join(__dirname, 'datasets', 'lang'),
          lang         : 'fr'
        }, (err, compiled) => {
          should(/template/.test(compiled)).eql(false);
          should(/render/.test(compiled)).eql(true);
          should(/staticRenderFns/.test(compiled)).eql(true);

          var _render = /render\s*:\s*(.*),/.exec(compiled);

          should(_render.length).eql(2);
          var _expectedCode = 'function render () {' + vueCompiler.compile(_template).render + '}';
          should(_render[1]).eql(_expectedCode);
          done();
        });
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

    it('should render <h1> : no space after route', () => {
      var _html = '<div>{{# GET /vue}}<h1>GET vue</h1>{{#}}</div>';
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

    it('should render <h2> in other right', () => {
      var _html = `
        <div>
          {{# GET /vue }}
            <h1>GET vue</h1>
            {{# GET /vue-2 }}
              <h2>CANNOT GET vue-2</h2>
            {{#}}
            {{# GET /vue-3 }}
              <h2>GET vue-3</h2>
            {{#}}
          {{#}}
        </div>
      `;
      var _res  = compiler.profileTemplate(_html, {
        'GET /vue'   : true,
        'GET /vue-3' : true
      });

      should(_res.replace(/\n/g, '').replace(/\s/g, '')).eql('<div><h1>GETvue</h1><h2>GETvue-3</h2></div>');
    });

    it('should render <h2> in other right : else', () => {
      var _html = `
        <div>
          {{# GET /vue }}
            <h1>GET vue</h1>
            {{# GET /vue-2 }}
              <h2>CANNOT GET vue-2</h2>
            {{##}}
              <h2>GET vue-3</h2>
            {{#}}
          {{#}}
        </div>
      `;
      var _res  = compiler.profileTemplate(_html, {
        'GET /vue'   : true,
      });

      should(_res.replace(/\n/g, '').replace(/\s/g, '')).eql('<div><h1>GETvue</h1><h2>GETvue-3</h2></div>');
    });
  });
});
