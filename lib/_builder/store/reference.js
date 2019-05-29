const compilationFns = require('./compilation');

/**
 * @param {Object} compilation
 * @param {Object} references { store : path.to.reference, ... }
 */
module.exports = function getReferencesFn (compilation, references) {
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
      if (!primaryKeyFn) {
        return;
      }

      var _primaryKeyParent = primaryKeyFn(objectParent);
    `;

    let _code = `
      if (${ _keyAndFor.key } === null || ${ _keyAndFor.key } === undefined) {
        return;
      }
    `;

    if (_keyAndFor.type === 'array') {
      _code += `
        for (var ${ _iterator } = 0; ${ _iterator } < ${ _keyAndFor.key }.length; ${ _iterator }++) {
          var _value = ${ _keyAndFor.key }[${ _iterator }];
          ${ _processCode }
          var _primaryKey       = primaryKeyFn(_value);

          if (_primaryKeyParent === _primaryKey && _primaryKey !== null && _primaryKey !== undefined) {
            ${ _keyAndFor.key }[${ _iterator }] = objectParent;
          }
        }
      `;
    }
    else {
      _code += `
        var _value = ${ _keyAndFor.key };
        ${ _processCode }
        var _primaryKey       = primaryKeyFn(_value);

        if (_primaryKeyParent === _primaryKey && _primaryKey !== null && _primaryKey !== undefined) {
          ${ _keyAndFor.key } = objectParent;
        }
      `;
    }

    if (!_keyAndFor.for) {
      _fn += _code;
    }
    else {
      _keyAndFor.for.code.push(_code);
    }

    _fns[_referencedStores[i]] = new Function('primaryKeyFn', 'objectParent', 'object', compilationFns.getCode(_fn, _fors));
  }

  return _fns;
};
