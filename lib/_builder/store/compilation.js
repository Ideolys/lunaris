const OPERATORS      = require('../../../src/utils').OPERATORS;
const OPERATORS_KEYS = Object.keys(OPERATORS);

/**
 * Generate function to get primaryKey
 * @param {Array} primaryKey
 * @return {Function}
 */
function getPrimaryKeyFn (primaryKey) {
  var _fn = 'var _pk = \'\';';

  if (!primaryKey.length) {
    _fn += ' return null;';
    return new Function('item', _fn);
  }

  for (var i = 0; i < primaryKey.length; i++) {
    _fn += `
      if (item['${ primaryKey[i] }'] === null || item['${ primaryKey[i] }'] === undefined) {
        return null;
      }
      _pk += item['${ primaryKey[i] }'] + '-';
    `;
  }

  _fn += `
    _pk = _pk.slice(0, _pk.length - 1);

    if (!isNaN(Number(_pk))) {
      return Number(_pk);
    }

    return _pk;
  `;

  return new Function('item', _fn);
}

/**
 * Generate function to set primaryKey
 * @param {Array} primaryKey
 * @return {Function}
 */
function setPrimaryKeyFn (primaryKey) {
  var _fn = 'var _pk = \'\';';

  if (!primaryKey.length) {
    _fn += ' return null;';
    return new Function(_fn);
  }

  _fn += `
    if (item['${ primaryKey[0] }'] === null || item['${ primaryKey[0] }'] === undefined) {
      item['${ primaryKey[0] }'] = '_' + val;
    }
    _pk += item['${ primaryKey[0] }'];
  `;

  _fn += `
    return _pk;
  `;

  return new Function('item', 'val', _fn);
}

/**
 * Find a compilated object among the compilated objects
 * @param {Object} compilation
 * @param {String} attribute to find
 * @param {String} parent
 * @returns {Object}
 */
function findCompilationObject (compilation, attribute, parent) {
  var _keys = Object.keys(compilation);
  for (var i = 0; i < _keys.length; i++) {
    if (!parent && compilation[_keys[i]].name === attribute) {
      return compilation[_keys[i]];
    }
    else if (parent && compilation[_keys[i]].name === attribute && compilation[_keys[i]].objParent === parent) {
      return compilation[_keys[i]];
    }
  }

  return null;
}

/**
 * Get code from fors
 * @param {String} code before the fors
 * @param {Object} fors { name, forVar, code, codeAfter, codeBefore, children : {} }
 * @param {Int} level
 * @param {Boolean} isReturnABoolean must return false as default value to return;
 * @param {Boolean} isReturn
 * @returns {String}
 */
function getCode (code, fors, level, isReturnABoolean, isNotReturning) {
  var _level    = level || 0;
  var _forKeys  = Object.keys(fors);
  var _forsCode = code || '';
  for (var k = _forKeys.length - 1; k >= 0; k--) {
    var _forVar = fors[_forKeys[k]].forVar;
    _forsCode += `
    if (${ _forKeys[k] }) {
      ${ fors[_forKeys[k]].codeBeforeFor.join('\n') }
      for (var ${ _forVar } = 0; ${ _forVar } < ${ _forKeys[k] }.length; ${ _forVar }++) {
        ${ fors[_forKeys[k]].codeBeforeChildrenCode.join('\n') }
        ${ Object.keys(fors[_forKeys[k]].children).length ? getCode(null, fors[_forKeys[k]].children, _level + 1) : '' }
    `;
    _forsCode += fors[_forKeys[k]].code.join('\n') + '}\n';
    _forsCode += '}\n'; // close the if
    _forsCode += fors[_forKeys[k]].codeAfterFor.join('\n');
  }

  if (_level === 0 && !isNotReturning) {
    if (isReturnABoolean) {
      _forsCode += 'return false;';
    }
    else {
      _forsCode += 'return object;';
    }
  }

  return _forsCode;
}


/**
 * Generate a function tu update store object aggregate values
 * @param {Object} compilation compilation analyseDescriptor result
 * @param {Object} aggregates { object attribute : object attribute source for aggregate }
 * @param {Array} sortedAggregates ['object attribute', 'object attribute', ...]
 * @param {String} storeName
 * @return {Function}
 */
function getAggregateFn (compilation, aggregates, sortedAggregates, storeName) {
  var _fors = {};
  var _code = '';

  for (var i = 0; i < sortedAggregates.length; i++) {
    var _currentAttribute       = sortedAggregates[i];
    var _attributePathParts     = _currentAttribute.split('.');
    var _keyToAggregateValue    = 'object';
    var _aggregateState         = '';
    var _nbForToAggregateValue  = 0;
    var _currentFor             = null;

    for (var l = 0; l < _attributePathParts.length; l++) {
      _keyToAggregateValue += '[\'' + _attributePathParts[l] + '\']';
      var _compilationObj = findCompilationObject(compilation, _attributePathParts[l], null, _attributePathParts);

      if (_compilationObj && _compilationObj.type === 'array') {
        _nbForToAggregateValue++;
        var _baseObject = {
          name                   : _keyToAggregateValue,
          forVar                 : '_' + _nbForToAggregateValue,
          code                   : [],
          codeAfterFor           : [],
          codeBeforeChildrenCode : [],
          codeBeforeFor          : [],
          children               : {}
        };

        if (_nbForToAggregateValue === 1) {
          if (!_fors[_keyToAggregateValue]) {
            _fors[_keyToAggregateValue] = _baseObject;
          }
          _currentFor = _fors[_keyToAggregateValue];
        }
        else {
          if (!_currentFor.children[_keyToAggregateValue]) {
            _currentFor.children[_keyToAggregateValue] = _baseObject;
          }
          _currentFor = _currentFor.children[_keyToAggregateValue];
        }
        _keyToAggregateValue += '[_' + _nbForToAggregateValue + ']';
      }

      if (l === _attributePathParts.length - 1) {
        var _transformerCode = '';
        var _parameters      = [];

        _aggregateState = _keyToAggregateValue.replace(_attributePathParts[_attributePathParts.length - 1], '_' + _attributePathParts[_attributePathParts.length - 1] + '_state');
        var _keyAndForToAggregateValue = getKey(_fors, _nbForToAggregateValue, compilation, {}, aggregates[_currentAttribute][1], null, _parameters);

        if (aggregates[_currentAttribute][2]) {
          _transformerCode = `
            try {
              _aggregateValue = ${ getCodeForComputedFunction(aggregates[_currentAttribute][2], _parameters) };
            }
            catch (e) {
              logger.warn('Error in @${ storeName } when calling transformer function!', e);
              _aggregateValue = null;
            }
          `;
        }

        _keyAndForToAggregateValue.for.code.push(`
          var _aggregate            = aggregates['${ aggregates[_currentAttribute][0] }'];
          var _aggregateValue       = ${ _keyAndForToAggregateValue.key };
          ${ _transformerCode }
          ${ _aggregateState }      = _aggregate.add(${ _aggregateState }, _aggregateValue);
          ${ _keyToAggregateValue } = ${ _aggregateState }.value;
        `);
        _keyAndForToAggregateValue.for.codeAfterFor.push(`
          if (!${ _keyAndForToAggregateValue.lastArray } || !${ _keyAndForToAggregateValue.lastArray }.length) {
            var _aggregate = aggregates['${ aggregates[_currentAttribute][0] }'];
            ${ _keyToAggregateValue } = _aggregate.getStartValue();
          }
        `);

        // Reinit values
        var _resetStr = `
          ${ _keyToAggregateValue } = null;
          ${ _aggregateState }      = null;
        `;
        if (!_currentFor) {
          _code += _resetStr;
        }
        else {

          _currentFor.codeBeforeChildrenCode.push(_resetStr);
        }
      }
    }
  }

  return new Function('object', 'aggregates', 'constants', 'logger', getCode(_code, _fors));
}

/**
 * Function get aggregate for
 * @param {Object} fors
 * @param {Int} _nbFor
 * @param {Object} compilation
 * @param {Object} virtualCompilation
 * @param {String} key to find
 * @param {Array} join attribute
 * @param {String} store to join
 * @param {String} objName
 * @param {Array} parameters key to crossed element (for computed properties)
 * @returns {Object} { key : {String}, for : {Object}, lastArray : {String}, type : {String} }
 */
function getKey (fors, nbFor, compilation, virtualCompilation, key, objName, parameters) {
  var _pathParts          = key.split('.');
  var _key                = objName    || 'object';
  var _lastArray          = objName    || 'object';
  var _parameters         = parameters || [];
  var _currentFor         = null;
  var _nbFor              = 0;
  var _keyHasBeenFound    = false;
  var _lastCompilationObj = null;
  var _type               = 'string';
  _parameters.push(_key);
  for (var i = 0; i < _pathParts.length; i++) {
    _key += `['${ _pathParts[i] }']`;
    var _compilationObj = findCompilationObject(compilation, _pathParts[i], _lastCompilationObj ? _lastCompilationObj.uniqueName : '');
    if (!_compilationObj) {
      _compilationObj = findCompilationObject(virtualCompilation, _pathParts[i]);
    }
    if (_compilationObj && _compilationObj.type === 'object') {
      _parameters.splice(0, 0, _key);
      _lastCompilationObj = _compilationObj;
    }
    else if (_compilationObj && _compilationObj.type === 'array') {
      _lastCompilationObj = _compilationObj;
      _nbFor++;
      var _baseObject = {
        name                   : _key,
        forVar                 : '_' + _nbFor,
        code                   : [],
        codeBeforeChildrenCode : [],
        codeAfterFor           : [],
        codeBeforeFor          : [],
        children               : {}
      };

      if (_nbFor === 1) {
        if (!fors[_key]) {
          fors[_key] = _baseObject;
          nbFor++;
        }
        _currentFor = fors[_key];
      }
      else {
        if (!_currentFor.children[_key]) {
          _currentFor.children[_key] = _baseObject;
          nbFor++;
        }
        _currentFor = _currentFor.children[_key];
      }

      _lastArray = _key;
      _key       += '[_' + _nbFor + ']';
      _parameters.splice(0, 0, _key);
    }

    if (!_lastCompilationObj) {
      _lastCompilationObj = compilation.main0;
    }
    if (_lastCompilationObj.obj[_pathParts[i]]) {
      _keyHasBeenFound = true;
      _type            = _lastCompilationObj.obj[_pathParts[i]][0] || 'string';
    }
  }

  return { key : _key, for : _currentFor, lastArray : _lastArray, isObjKeyFound : _keyHasBeenFound, type : _type };
}

/**
 * Get code for computed function
 * @param {Function} function
 * @param {Array} parameters
 * @returns {String}
 */
function getCodeForComputedFunction (computedFn, parameters) {
  parameters.push('constants');
  return `
    (${computedFn.toString() }).apply(null, [${ parameters.join(',') }])
  `;
}

/**
 * Get computed properties functionœ
 * @param {Object} compilation
 * @param {Object} computedFns { attrbiutePath : function }
 * @returns {Function}
 */
function getComputedPropertiesFn (compilation, computedFns, storeName) {
  var _computeds = Object.keys(computedFns);
  if (!Object.keys(_computeds).length) {
    return null;
  }

  var _code  = '';
  var _nbFor = 0;
  var _fors  = {};

  for (var i = 0; i < _computeds.length; i++) {
    var _parameters = [];
    var _keyCode    = getKey(_fors, _nbFor, compilation, {}, _computeds[i], null, _parameters);

    var _codeToAdd = `
      try {
        ${ _keyCode.key } = ${ getCodeForComputedFunction(computedFns[_computeds[i]], _parameters) };
      }
      catch (e) {
        logger.warn('Error in @${ storeName } when calling transformer function!', e);
        ${ _keyCode.key } = null;
      }
    `;
    if (_keyCode.for) {
      _keyCode.for.code.push(_codeToAdd);
    }
    else {
      _code += _codeToAdd;
    }
  }

  return new Function('object', 'constants', 'logger', getCode(_code, _fors));
}

/**
 * Get Filter functions
 * @param {Array} ignoredStores globally ignored stores
 * @param {Object} compilatedStores
 * @param {Object} compilation
 * @param {Array} filters
 * @return {Object}
 */
function getFilterFns (ignoredStores, compilatedStores, compilation, filters) {
  var _filtersFns = {};

  if (!filters) {
    return _filtersFns;
  }

  if (!Array.isArray(filters)) {
    throw new Error('store.filters must be an array of filter object!');
  }

  for (var i = 0; i < filters.length; i++) {
    var _code       = '';
    var _fors       = {};
    var _baseError  = 'in store.filters[' + i + ']: ';

    if (!filters[i].source) {
      throw new Error(_baseError + 'A filter must have a source defined as : filter.source = @<store>');
    }

    if (ignoredStores.indexOf(filters[i].source) !== -1) {
      continue;
    }

    if (!filters[i].sourceAttribute) {
      throw new Error(_baseError + 'A filter must have a source attribute defined as : filter.sourceAttribute = <attribute>');
    }
    if (!filters[i].localAttribute) {
      throw new Error(_baseError + 'A filter must have a local attribute defined as : filter.localAttribute = <attribute>');
    }
    if (filters[i].localAttribute && /\[|\]/.test(filters[i].localAttribute)) {
      throw new Error(_baseError + 'A filter local attribute must not contain "[" or "]", use "." notation instead : path.to.my.element');
    }
    if (!filters[i].operator) {
      throw new Error(_baseError + 'A filter must have an operator');
    }
    if (OPERATORS_KEYS.indexOf(filters[i].operator) === -1) {
      throw new Error(_baseError + 'A filter must be one of the following [' + OPERATORS_KEYS.join(',') + ']');
    }

    if (filters[i].isOffline === false) {
      continue;
    }

    var _storeSource   = filters[i].source.replace('@', '');
    var _isStoreObject = compilatedStores[_storeSource] ? compilatedStores[_storeSource].isStoreObject : false;

    var _filterKey  = i;
    var _keyAndCode = getKey(_fors, 0, compilation, {}, filters[i].localAttribute);

    if (!_keyAndCode.isObjKeyFound) {
      throw new Error(_baseError + 'A filter must have a local attribute defined in the map!');
    }

    if (OPERATORS[filters[i].operator] === OPERATORS.ILIKE && _keyAndCode.type !== 'string') {
      throw new Error(_baseError + 'ILIKE operator is only available for type string');
    }

    var _fnCode   = '';
    var _operator = OPERATORS[filters[i].operator];
    // Only egality is available for required filters
    if (filters[i].isRequired) {
      _operator = OPERATORS['='];
    }

    var _forTest = `
      var _nbFoundValues = 0;
      for (var i = 0; i < filterValue.length; i++) {
        if (TEST[i]) {
          _nbFoundValues++;
        }
      }

      return _nbFoundValues > 0;
    `;

    if (_operator !== OPERATORS['ILIKE']) {
      var _tests = {};
      _tests[OPERATORS['=']]  = _keyAndCode.key + ' === filterValue';
      _tests[OPERATORS['>']]  = _keyAndCode.key + ' > filterValue';
      _tests[OPERATORS['>=']] = _keyAndCode.key + ' >= filterValue';
      _tests[OPERATORS['<']]  = _keyAndCode.key + ' < filterValue';
      _tests[OPERATORS['<=']] = _keyAndCode.key + ' <= filterValue';

      var _test = _tests[_operator];
      if (_isStoreObject) {
        _fnCode = 'return ' + _test + ';';
      }
      else {
        _fnCode = _forTest.replace('TEST', _test);
      }
    }
    // ILIKE is done at runtime : check src/store/store.offline.js
    else {
      _fnCode = `
        var _res = fn.call(null, filterValue, ${ _keyAndCode.key });

        if (typeof _res !== 'boolean') {
          return false;
        }

        return _res;
      `;
    }

    if (_keyAndCode.for) {
      _keyAndCode.for.code.push(_fnCode);
    }
    else {
      _code += _fnCode;
    }

    if (_operator !== OPERATORS['ILIKE']) {
      _filtersFns[_filterKey] = new Function('filterValue', 'object', 'fn', getCode(_code, _fors, !_keyAndCode.for, true));
    }
    else {
      _filtersFns[_filterKey] = new Function('filterValue', 'object', 'fn', getCode(_code, _fors, !_keyAndCode.for, true));
    }
  }

  return _filtersFns;
}


module.exports = {
  getPrimaryKeyFn,
  setPrimaryKeyFn,
  getAggregateFn,
  getCode,
  getKey,
  getCodeForComputedFunction,
  getComputedPropertiesFn,
  getFilterFns,
  findCompilationObject
};
