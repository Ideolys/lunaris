const path        = require('path');
const fs          = require('fs');
const vueCompiler = require('vue-template-compiler');
const translate   = require('./translate');
const profiler    = require('./profiler');

const cachedModules = {};

// https://github.com/vuejs/vue/blob/dev/flow/options.js
const vuejsObjAttributes = [
  'name'
, 'data'
, 'props'
, 'propsData'
, 'computed'
, 'methods'
, 'watch'
//, 'el'
, 'render'
, 'renderError'
, 'staticRenderFns'
, 'beforeCreate'
, 'created'
, 'beforeMount'
, 'mounted'
, 'beforeUpdate'
, 'updated'
, 'activated'
, 'deactivated'
, 'beforeDestroy'
, 'destroyed'
, 'errorCaptured'
, 'directives'
, 'components'
, 'transitions'
, 'filters'
, 'model'
, 'mixins'
, 'extends'
];
const vuejsTemplateRE = new RegExp('template\\s*:\\s*([\'"`])(.*)\\1\\s*,?');

/**
 * Set cache for given id
 * @param {String} id   file's path
 * @param {String} data file's value
 */
function _setCache (id, data) {
  cachedModules[id] = data;
}

/**
 * Construct template according to rights
 * @param {String} html
 * @param {Object} rights allowed routes
 * @return {String}
 */
function _profileTemplate (html, rights = {}) {
  var match;
  while ((match = /\{\{#\}\}/g.exec(html))) {
    var _route = /\{\{!?#\s*(GET|POST|PUT|DEL|HEAD|PATCH)\s*([\s\S]+?)\}\}/.exec(html);
    if (!_route) {
      return html;
    }

    _route = _route[1].trim() + ' ' + _route[2].trim();

    var _fullMatchRE              = new RegExp('\\{\\{!?#\\s*(?:GET|POST|PUT|DEL|HEAD|PATCH)\\s*[\\s\\S]+?\\}\\}([\\s\\S]+?)\\{\\{#\\}\\}');
    var _exteriorMatchRE          = new RegExp('\\{\\{(!?)#\\s*(?:GET|POST|PUT|DEL|HEAD|PATCH)\\s*[\\s\\S]+?\\}\\}[\\s\\S]+?\\{\\{#\\}\\}');
    var _interiorMatchElseRE      = new RegExp('\\{\\{#{2}\\}\\}([\\s\\S]+?)\\{\\{#\\}\\}');
    var _interiorMatchElseFalseRE = new RegExp('\\{\\{#{2}\\}\\}[\\s\\S]+?(?=\\{\\{#\\}\\})');

    var _condition = true;
    _condition     = _exteriorMatchRE.exec(html);
    if (!_condition) {
      return html;
    }
    _condition = _condition[1] === '!' ? false : true;

    var _encapsulated;
    if (rights[_route] === _condition) {
      html          = html.replace(_interiorMatchElseFalseRE, ''); // remove else statement if it exists
      _encapsulated = _fullMatchRE.exec(html);

      if (!_encapsulated) {
        html = html.replace(_exteriorMatchRE, '');
      }
      else {
        html = html.replace(_exteriorMatchRE, _encapsulated[1]);
      }
    }
    else {
      var _else = _interiorMatchElseRE.exec(html) || '';
      if (_else !== '') {
        _else = _else[1];
      }
      html = html.replace(_exteriorMatchRE, _else);
    }
  }

  return html;
}

/**
 * Compile vuejs templates
 * Transform row html template in render functions
 * Help : https://github.com/vuejs/vue-loader/blob/master/lib/template-compiler/index.js
 * @param {String} fileContent
 * @param {String} templateHtml
 * @return {String}
 */
function _compileVuejsTemplate (fileContent, templateHtml) {
  var _compilationResult = vueCompiler.compile(templateHtml, {
    preserveWhitespace : false
  });

  if (_compilationResult.errors && _compilationResult.errors.length) {
    _compilationResult.render          = '';
    _compilationResult.staticRenderFns = [];

    throw new Error(_compilationResult.errors.join('\n'));
  }

  for (var i = 0; i < _compilationResult.staticRenderFns.length; i++) {
    var _staticRenderFn = `function staticRender_${ i } () {${ _compilationResult.staticRenderFns[i] }}`;
    _compilationResult.staticRenderFns[i] = _staticRenderFn;
  };

  var _render = 'function render () {' + _compilationResult.render + '}';

  fileContent = fileContent.replace(vuejsTemplateRE, `
    render          : ${ _render },
    staticRenderFns : [${ _compilationResult.staticRenderFns.join(',') }],
  `);
  return fileContent;
}

/**
 * Compile vue file into js only :
 * <template>
 *  <div></div>
 * </template>
 * <script>
 *  {
 *    data : () => {}
 *  }
 * <script>
 *
 * Result is :
 *  {
 *    template : '<div></div>',
 *    data : () => {}
 *  }
 * @param {String} fileContent
 * @param {Object} rights
 * @return {String}
 */
function _compileVueFile (fileContent, rights) {
  var _template = /<template>([\s\S]*)<\/template>/.exec(fileContent);
  var _script   = /<script>([\s\S]*)<\/script>/.exec(fileContent);

  if (!_template) {
    throw new Error('<template>...</template> not found!');
  }
  if (!_script) {
    throw new Error('<script>...</script> not found!');
  }

  _template                  = _template[1];
  var _res                   = _script[1];
  var _whereToInsertTemplate = _res.search(new RegExp('(?:' + vuejsObjAttributes.join('|') + ')\\s*:'));

  if (_whereToInsertTemplate === -1) {
    throw new Error('Cannot compile vue file!');
  }

  function spliceSlice(str, index, add) {
    return str.slice(0, index) + add + str.slice(index, str.length);
  }

  _template = _profileTemplate(_template, rights);
  _template = _template.replace(/\n/g, '').replace(/\s*</mg, '<').replace(/>\s*/mg, '>');

  _res = spliceSlice(_res, _whereToInsertTemplate, 'template : `' + _template + '`,\n');
  return { fileContent : _res, template : _template };
}

/**
 * Compile vuejs templates
 * Search and replace template path by html file value
 * The, the template is compiled for performance issues
 * @param {String} pathToModule path to module
 * @param {Buffer} fileContent
 * @return {String}
 */
function compileVuejsTemplates (id, fileContent, options = {}) {
  var _rights           = options.rights           || {};
  var _langPath         = options.langPath         || null;
  var _lang             = options.lang             || null;
  var _isLangGeneration = options.isLangGeneration || false;
  var _isProduction     = options.isProduction     || false;

  try {
    if (/\.vue$/.test(id)) {
      var _vueFile = _compileVueFile(fileContent, _rights);
      _vueFile     = _compileVuejsTemplate(_vueFile.fileContent, _vueFile.template);
      return translate(_langPath, _lang, _vueFile, _isLangGeneration);
    }

    var _template = vuejsTemplateRE.exec(fileContent);
    if (!_template) {
      return fileContent;
    }

    _template = _template[2] || _template[3];
    var _path = path.dirname(id);

    // read template
    if (/\.html$/.test(_template)) {
      var _subTemplate = fs.readFileSync(path.join(_path, _template));

      if (!cachedModules[id] || !_isProduction) {
        _setCache(id, fs.readFileSync(path.join(_path, _template)).toString());
      }

      _subTemplate = cachedModules[id];
      _subTemplate = _subTemplate.toString();
      _subTemplate = _subTemplate.replace(/\n/mg, '');
      _subTemplate = translate(_langPath, _lang, _subTemplate, _isLangGeneration);
      _subTemplate = _profileTemplate(_subTemplate, _rights);
      fileContent  = _compileVuejsTemplate(fileContent, _subTemplate);
    }
    else {
      throw new Error('template must reference an html file');
    }
  }
  catch (e) {
    console.log('Error when building module \'' + id + '\' : ' + e);
    return null;
  }

  return fileContent;
}

/**
 * Compile module and children
 * A child is a required module
 * @param {String} file
 * @param {Object} options {
      rights,
      langPath,
      lang,
      isLangGeneration,
      isProduction
    }
 */
function compiler (id, file, options) {
  var _file = compileVuejsTemplates(id, file, options);
  _file     = profiler(id, _file);

  _file.children = {};

  var _imports = Object.keys(_file.imports);
  for (var i = 0; i < _imports.length; i++) {
    var _path    = _file.imports[_imports[i]];
    _file.children[_path] = compiler(_path, fs.readFileSync(_file.imports[_imports[i]]).toString(), options);
  }

  return _file;
}

exports.compiler = compiler;
exports.test     = {
  compileVuejsTemplates,
  compileVuejsTemplate : _compileVuejsTemplate,
  compileVueFile       : _compileVueFile,
  profileTemplate      : _profileTemplate
}
