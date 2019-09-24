const compilationFns = require('./compilation');

/**
 * Build update reference function
 * @param {Object} compilation
 * @param {Object} references
 * @returns {Function}
 */
function geUpdateReferencesFn (compilation, references) {
  let _referencedStores = Object.keys(references);

  if (!_referencedStores.length) {
    return null;
  }

  var _fns = {};
  for (var i = 0; i < _referencedStores.length; i++) {
    let _fors      = {};
    let _fn        = '';
    let _keyAndFor = compilationFns.getKey(_fors, 0, compilation, {}, _referencedStores[i]);

    let _code = `
      if (${ _keyAndFor.key } != null) {
    `;

    _code += `
        if (${ _keyAndFor.key } === lastForeignKey) {
          ${ _keyAndFor.key } = newForeignKey;
        }
    `;

    if (!_keyAndFor.for) {
      _fn += _code += '}';
    }
    else {
      _keyAndFor.for.code.push(_code += '}');
    }

    _fns[_referencedStores[i]] = new Function('lastForeignKey', 'newForeignKey', 'object', compilationFns.getCode(_fn, _fors));
  }

  return _fns;
}

/**
 * Build get reference function
 * It gets the object at the corresponding path
 * @param {Object} compilation
 * @param {Object} references
 * @returns {Function}
 */
function buildGetReferencesFn (compilation, references) {
  let _referencedStores = Object.keys(references);

  if (!_referencedStores.length) {
    return null;
  }

  var _fns = {};
  for (var i = 0; i < _referencedStores.length; i++) {
    let _fors      = {};
    let _keyAndFor = compilationFns.getKey(_fors, 0, compilation, {}, _referencedStores[i]);
    let _fn        = `
      var _ids = [];
    `;

    let _code = `
      if (${ _keyAndFor.key } != null) {
    `;

    _code += `
      var _foreignKey = ${ _keyAndFor.key };
      if (_foreignKey != null && _ids.indexOf(_foreignKey) === -1) {
        _ids.push(_foreignKey);
      }
    `;

    _code += '}';

    var _testObject = 'if (' + (_keyAndFor.for ? _keyAndFor.lastArray : _keyAndFor.lastObject) + ' != null) {';

    if (!_keyAndFor.for) {
      _fn += _testObject;
      _fn += _code;
      _fn += '}'; // end test
    }
    else {
      _keyAndFor.for.codeBeforeFor.push(_testObject);
      _keyAndFor.for.code.push(_code);
      _keyAndFor.for.codeAfterFor.push('}');
    }

    let _finalCode = compilationFns.getCode(_fn, _fors, 0, false, true) + ' return _ids;';
    _fns[_referencedStores[i]] = new Function('object', _finalCode);
  }

  return _fns;
}

/**
 * Get references fn
 * It builds function to get and update references for each referenced store
 * @param {Object} compilation
 * @param {Object} references { store : path.to.reference, ... }
 * @returns {Object} { set : { storeN : setFn }, update : { storeN : updateN } }
 */
module.exports = function getReferencesFn (compilation, references) {
  return {
    get    : buildGetReferencesFn(compilation, references),
    update : geUpdateReferencesFn(compilation, references)
  };
};
