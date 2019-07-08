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
    let _keyAndFor = compilationFns.getKey(_fors, 0, compilation, {}, references[_referencedStores[i]]);

    if (_keyAndFor.type !== 'array' && _keyAndFor.type !== 'object') {
      throw new Error('Lunaris.map: "' + references[_referencedStores[i]] + '" should be of type array or object');
    }

    let _iterator    = '_ref_' + i;
    let _processCode = `
      if (primaryKeyFn) {
        var _primaryKeyParent = primaryKeyFn(objectParent);
    `;

    let _code = `
      if (${ _keyAndFor.key } !== null && ${ _keyAndFor.key } !== undefined) {
    `;

    if (_keyAndFor.type === 'array') {
      _code += `
        for (var ${ _iterator } = 0; ${ _iterator } < ${ _keyAndFor.key }.length; ${ _iterator }++) {
          ${ _processCode }
            var _primaryKey       = primaryKeyFn(${ _keyAndFor.key }[${ _iterator }]);
            if (
              (${ _keyAndFor.key }[${ _iterator }]._id !== null && ${ _keyAndFor.key }[${ _iterator }]._id !== undefined && objectParent._id === ${ _keyAndFor.key }[${ _iterator }]._id) ||
              (_primaryKeyParent === _primaryKey && _primaryKey !== null && _primaryKey !== undefined)
            ) {
              ${ _keyAndFor.key }[${ _iterator }] = objectParent;
            }
          }
        }
      `;
    }
    else {
      _code += `
          ${ _processCode }
          var _primaryKey = primaryKeyFn(${ _keyAndFor.key });

          if (
            (${ _keyAndFor.key }._id !== null && ${ _keyAndFor.key }._id !== undefined && objectParent._id === ${ _keyAndFor.key }._id) ||
            (_primaryKeyParent === _primaryKey && _primaryKey !== null && _primaryKey !== undefined)
          ) {
            ${ _keyAndFor.key } = objectParent;
          }
        }
      `;
    }

    if (!_keyAndFor.for) {
      _fn += _code += '}';
    }
    else {
      _keyAndFor.for.code.push(_code += '}');
    }

    _fns[_referencedStores[i]] = new Function('primaryKeyFn', 'objectParent', 'object', compilationFns.getCode(_fn, _fors));
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
    let _keyAndFor = compilationFns.getKey(_fors, 0, compilation, {}, references[_referencedStores[i]]);
    let _fn        = `
      var _ids = [];
      if (!primaryKeyFn) {
        return _ids;
      }
    `;

    if (_keyAndFor.type !== 'array' && _keyAndFor.type !== 'object') {
      throw new Error('Lunaris.map: "' + references[_referencedStores[i]] + '" should be of type array or object');
    }

    let _iterator = '_ref_' + i;

    let _code = `
      if (${ _keyAndFor.key } === null || ${ _keyAndFor.key } === undefined) {
        return _ids;
      }
    `;

    if (_keyAndFor.type === 'array') {
      _code += `
        for (var ${ _iterator } = 0; ${ _iterator } < ${ _keyAndFor.key }.length; ${ _iterator }++) {
          var _primaryKey = primaryKeyFn(${ _keyAndFor.key }[${ _iterator }]);

          if (_primaryKey !== null && _primaryKey !== undefined && _ids.indexOf(_primaryKey) === -1) {
            _ids.push(_primaryKey);
          }
        }
      `;
    }
    else {
      _code += `
        var _primaryKey = primaryKeyFn(${ _keyAndFor.key });

        if (_primaryKey !== null && _primaryKey !== undefined && _ids.indexOf(_primaryKey) === -1) {
          _ids.push(_primaryKey);
        }
      `;
    }

    if (!_keyAndFor.for) {
      _fn += _code;
    }
    else {
      _keyAndFor.for.code.push(_code);
    }

    let _finalCode = compilationFns.getCode(_fn, _fors, 0, false, true) + ' return _ids;';
    _fns[_referencedStores[i]] = new Function('primaryKeyFn', 'object', _finalCode);
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
