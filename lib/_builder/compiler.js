const path        = require('path');
const fs          = require('fs');
const vueCompiler = require('vue-template-compiler');
const translate   = require('./translate');
const profiler    = require('./profiler');
const utils       = require('../utils');

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
 * Construct template according to rights
 * @param {String} html
 * @param {Object} rights allowed routes
 * @param {Boolean} isLangGeneration
 * @return {String}
 */
function _profileTemplate (html, rights = {}, isLangGeneration = false) {
  var _routesHtml = html.match(/\{\{!?#\s*(GET|POST|PUT|DEL|HEAD|PATCH)\s*([\s\S]+?)\}\}/gm);

  if (!_routesHtml) {
    return html;
  }

  _routesHtml = _routesHtml.reverse();

  for (var i = 0; i < _routesHtml.length; i++) {
    var _route = _routesHtml[i].match(/\{\{!?#\s*(GET|POST|PUT|DEL|HEAD|PATCH)\s*([\s\S]+?)\}\}/);
    _route     = _route[1].trim() + ' ' + _route[2].trim();

    var _fullMatchRE              = new RegExp('\\{\\{!?#\\s*'   + _route.replace(' ', '\\s') + '\\s?\\}\\}([\\s\\S]+?)\\{\\{#\\}\\}');
    var _exteriorMatchRE          = new RegExp('\\{\\{(!?)#\\s*' + _route.replace(' ', '\\s') + '\\s?\\}\\}[\\s\\S]+?\\{\\{#\\}\\}');
    var _interiorMatchElseRE      = new RegExp('\\{\\{#{2}\\}\\}([\\s\\S]+?)\\{\\{#\\}\\}');
    var _interiorMatchElseFalseRE = new RegExp('\\{\\{#{2}\\}\\}[\\s\\S]+?(?=\\{\\{#\\}\\})');

    var _condition = true;
    _condition     = _exteriorMatchRE.exec(html);
    _condition     = _condition[1] === '!' ? false : true;

    var _encapsulated = _fullMatchRE.exec(html);
    if (rights[_route] === _condition || isLangGeneration) {
      var _encapsulatedWithoutElse = _fullMatchRE.exec(_encapsulated[0].replace(_interiorMatchElseFalseRE, '')); // remove else statement if it exists
      html                         = html.replace(_encapsulated[0], _encapsulatedWithoutElse[1]);
    }
    else {
      var _else = _interiorMatchElseRE.exec(html) || '';
      if (_else !== '') {
        _else = _else[1];
      }

      html = html.replace(_encapsulated[0], _else);
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
function _compileVuejsTemplate (fileContent, templateHtml, langPath, lang, isLangGeneration) {
  templateHtml           = translate(langPath, lang, templateHtml, isLangGeneration, true);
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
  }

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
 * @param {Boolean} isLangGeneration
 * @return {String}
 */
function _compileVueFile (fileContent, rights, isLangGeneration) {
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

  function spliceSlice (str, index, add) {
    return str.slice(0, index) + add + str.slice(index, str.length);
  }

  _template = _profileTemplate(_template, rights, isLangGeneration);
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
 * @return {callback}
 */
function compileVuejsTemplates (id, fileContent, options = {}, callback) {
  var _rights           = options.rights           || {};
  var _langPath         = options.langPath         || null;
  var _lang             = options.lang             || null;
  var _isLangGeneration = options.isLangGeneration || false;

  if (/\.vue$/.test(id)) {
    var _vueFile = _compileVueFile(fileContent, _rights, _isLangGeneration);
    try {
      _vueFile = _compileVuejsTemplate(_vueFile.fileContent, _vueFile.template, _langPath, _lang, _isLangGeneration);
    }
    catch (e) {
      return callback(e);
    }
    return callback(null, _vueFile);
  }

  var _template = vuejsTemplateRE.exec(fileContent);
  if (!_template) {
    return callback(null, fileContent);
  }

  _template = _template[2] || _template[3];
  var _path = path.dirname(id);

  // read template
  if (!/\.html$/.test(_template)) {
    return callback(new Error('Error when building module \'' + id + '\': template must reference an html file'));
  }


  fs.readFile(path.join(_path, _template), (err, file) => {
    if (err) {
      return callback(new Error('Error when building module \'' + id + '\': ' + err));
    }

    let _subTemplate = file.toString();

    _subTemplate     = _subTemplate.toString();
    _subTemplate     = _subTemplate.replace(/\n/mg, '');
    _subTemplate     = _profileTemplate(_subTemplate, _rights, _isLangGeneration);
    fileContent      = _compileVuejsTemplate(fileContent, _subTemplate, _langPath, _lang, _isLangGeneration);

    return callback(null, fileContent);
  });
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
      isProduction,
      isNotVue
    }
    @param {Function} callback
 */
function compiler (id, file, options, callback, errors) {
  errors = errors || [];

  if (options.isNotVue) {
    return _compile(id, file, options, errors, (errors, compilation) => {
      callback(errors.length ? errors : null, compilation);
    });
  }

  compileVuejsTemplates(id, file, options, (err, res) => {
    if (err) {
      return callback([err]);
    }

    _compile(id, res, options, errors, (errors, compilation) => {
      return callback(errors.length ? errors : null, compilation);
    });
  });
}

/**
 * Internal compiler
 * @param {String} id path
 * @param {String} file
 * @param {Object} options
 * @param {Function} callback
 */
function _compile (id, file, options, errors, callback) {
  let _file = profiler(id, file);

  _file.children = {};

  let _imports = Object.keys(_file.imports);
  utils.genericQueue(_imports, (importPath, next) => {
    let _path = _file.imports[importPath];

    fs.readFile(_path, (err, file) => {
      if (err) {
        errors.push(err);
        return next();
      }

      compiler(_path, file.toString(), options, (err, res) => {
        if (err) {
          errors = errors.concat(err);
          return next();
        }

        _file.children[_path] = res;
        next();
      }, errors);
    });
  }, null, () => {
    callback(errors, _file);
  }).start();
}

exports.compiler = compiler;
exports.test     = {
  compileVuejsTemplates,
  compileVuejsTemplate : _compileVuejsTemplate,
  compileVueFile       : _compileVueFile,
  profileTemplate      : _profileTemplate
};
