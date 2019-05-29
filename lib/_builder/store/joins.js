const compilationFns = require('./compilation');

/**
 * Get code to calculate aggregate
 * @param {String} aggregateType sum, ...
 * @param {String} keyToAggregate value
 * @param {String} keyToAggregateState _value
 * @param {String} keyToAggregateValue
 * @param {String} functionType set | insert | delete
 * @param {Function} transformerFn
 * @param {Array} transformerFnParameters
 * @param {String} storeName
 * @returns {Object} { codeBefore : {String}, code : {String} }
 */
function getCodeForAggregateValues (aggregateType, keyToAggregate, keyToAggregateState, keyToAggregateValues, functionType, transformerFn, transformerFnParameters, storeName) {
  var _res = {
    code       : '',
    codeBefore : ''
  };
  var _transformerCode = '';
  if (transformerFn) {
    _transformerCode = `
      try {
        _aggregateValue = ${ compilationFns._getCodeForComputedFunction(transformerFn, transformerFnParameters) };
      }
      catch (e) {
        logger.warn('Error in @${ storeName } when calling transformer function!', e);
        _aggregateValue = null;
      }
    `;
  }

  if (functionType === 'set') {
    _res.code = `
      var _aggregateState = ${ keyToAggregateState } || null;
    `;
    _res.codeBefore = `
      var _aggregate      = aggregates['${ aggregateType }'];
      var _aggregateState = null;
      ${ keyToAggregate } = _aggregate.getStartValue();
    `;

    _res.code += `
      var _aggregateValue = ${ keyToAggregateValues };
      ${ _transformerCode }
      ${ keyToAggregateState } = _aggregate.add(_aggregateState, _aggregateValue);
      ${ keyToAggregate }      = ${ keyToAggregateState }.value;
    `;

    return _res;
  }

  if (functionType === 'insert') {
    _res.code = `
      var _aggregateState      = ${ keyToAggregateState } || null;
      var _aggregate           = aggregates['${ aggregateType }'];
      var _aggregateValue      = ${ keyToAggregateValues };
      ${ _transformerCode }
      ${ keyToAggregateState } = _aggregate.add(_aggregateState, _aggregateValue);
      ${ keyToAggregate }      = ${ keyToAggregateState }.value;
    `;

    return _res;
  }

  _res.code = `
      var _aggregateState      = ${ keyToAggregateState } || null;
      var _aggregate           = aggregates['${ aggregateType }'];
      var _aggregateValue      = ${ keyToAggregateValues };
      ${ _transformerCode }
      ${ keyToAggregateState } = _aggregate.remove(_aggregateState, _aggregateValue);
      ${ keyToAggregate }      = ${ keyToAggregateState }.value;
    `;

  return _res;
}

/**
 * Get Aggregate state key
 * @param {String} aggregatePath ex: object.total
 * @param {String} aggregateKey  ex: object[_1]['total']
 * @returns {String}
 */
function getAggregateStateKey (aggregatePath, aggregateKey) {
  var _splittedAggregateKey = aggregatePath.split('.');

  return aggregateKey.replace(_splittedAggregateKey[_splittedAggregateKey.length - 1], '_' + _splittedAggregateKey[_splittedAggregateKey.length - 1] + '_state');
}

/**
 * Get joins function to set / insert / delete
 * @param {Object} compilatedStores
 * @param {Object} compilation
 * @param {Object} virtualCompilation
 * @param {Object} joins
 * @param {Object} externalAggregates
 * @param {String} storeName
 * @returns {Object} fns
 */
function getJoinFns (compilatedStores, compilation, virtualCompilation, joins, externalAggregates, storeName) {
  function _getFors (joins, type) {
    var _joinedStores = Object.keys(joins);
    var _fors         = {};
    var _code         = '';

    for (var i = 0; i < _joinedStores.length; i++) {
      var _attributePath        = joins[_joinedStores[i]];
      var _attributePathParts   = _attributePath.split('.');
      var _keyToJoinedAttribute = 'object';
      var _currentFor           = null;
      var _nbFor                = 0;
      var _previousKey          = '';
      var _aggregateState       = '';

      for (var l = 0; l < _attributePathParts.length; l++) {
        _previousKey          = _keyToJoinedAttribute;
        _keyToJoinedAttribute += '[\'' + _attributePathParts[l] + '\']';
        var _compilationObj = compilationFns.findCompilationObject(compilation, _attributePathParts[l]);
        if (!_compilationObj) {
          _compilationObj = compilationFns.findCompilationObject(virtualCompilation, _attributePathParts[l]);
        }
        if (_compilationObj && _compilationObj.type === 'array' && l !== _attributePathParts.length - 1) {
          _nbFor++;
          var _baseObject = {
            name                   : _keyToJoinedAttribute,
            forVar                 : '_' + _nbFor,
            code                   : [],
            codeBeforeChildrenCode : [],
            codeAfterFor           : [],
            codeBeforeFor          : [],
            children               : {}
          };

          if (_nbFor === 1) {
            if (!_fors[_keyToJoinedAttribute]) {
              _fors[_keyToJoinedAttribute] = _baseObject;
            }
            _currentFor = _fors[_keyToJoinedAttribute];
          }
          else {
            if (!_currentFor.children[_keyToJoinedAttribute]) {
              _currentFor.children[_keyToJoinedAttribute] = _baseObject;
            }
            _currentFor = _currentFor.children[_keyToJoinedAttribute];
          }
          _keyToJoinedAttribute += '[_' + _nbFor + ']';
        }

        if (l === _attributePathParts.length - 1) {
          var _parameters = [];
          if (type === 'set') {
            var _keyForToAggregate;
            if (externalAggregates[_joinedStores[i]]) {
              _keyForToAggregate = compilationFns.getKey(_fors, _nbFor, compilation, virtualCompilation, externalAggregates[_joinedStores[i]][1]);
              _aggregateState    = getAggregateStateKey(externalAggregates[_joinedStores[i]][1], _keyForToAggregate.key);
              var _keyForAggregateValues = compilationFns.getKey(_fors, _nbFor, compilation, virtualCompilation, externalAggregates[_joinedStores[i]][2], null, _parameters);
              var _aggregateCode         = getCodeForAggregateValues(
                externalAggregates[_joinedStores[i]][0],
                _keyForToAggregate.key,
                _aggregateState,
                _keyForAggregateValues.key,
                type,
                externalAggregates[_joinedStores[i]][3],
                _parameters,
                storeName
              );
              _keyForAggregateValues.for.codeBeforeFor.push(_aggregateCode.codeBefore);
              _keyForAggregateValues.for.code.push(_aggregateCode.code);
            }

            var _codeInter = '';
            if (compilatedStores[_joinedStores[i]] && compilatedStores[_joinedStores[i]].isStoreObject) {
              _codeInter = `${ _keyToJoinedAttribute } = joinedValues['${ _joinedStores[i] }'] ? joinedValues['${ _joinedStores[i] }'] : null;\n`;
            }
            else {
              // copy the array
              _codeInter = `${ _keyToJoinedAttribute } = joinedValues['${ _joinedStores[i] }'] ? joinedValues['${ _joinedStores[i] }'].slice(0) : [];\n`;
            }
            if (!_currentFor) {
              _code += `
                if (${ _previousKey }) {
                  ${ _codeInter }
                }
              `;
            }
            else {
              _currentFor.codeBeforeChildrenCode.push(_codeInter);
            }
          }

          if (type === 'insert') {
            _keyForToAggregate = null;
            _aggregateCode     = null;
            if (externalAggregates[_joinedStores[i]]) {
              _keyForToAggregate = compilationFns.getKey(_fors, _nbFor, compilation, virtualCompilation, externalAggregates[_joinedStores[i]][1], null, _parameters);
              _parameters.splice(0, 0, 'joinedValue');
              var _value         = externalAggregates[_joinedStores[i]][2].split('.');
              _value             = 'joinedValue[\'' + _value[_value.length - 1] + '\']';
              _aggregateState    = getAggregateStateKey(externalAggregates[_joinedStores[i]][1], _keyForToAggregate.key);
              _aggregateCode     = getCodeForAggregateValues(
                externalAggregates[_joinedStores[i]][0],
                _keyForToAggregate.key,
                _aggregateState,
                _value,
                type,
                externalAggregates[_joinedStores[i]][3],
                _parameters,
                storeName
              );
            }

            if (compilatedStores[_joinedStores[i]] && compilatedStores[_joinedStores[i]].isStoreObject) {
              _codeInter = `
                ${ _keyToJoinedAttribute } = joinedValue;
              `;
            }
            else {
              _codeInter = `
                if (!${ _keyToJoinedAttribute }) {
                  ${ _keyToJoinedAttribute } = [];
                }
                ${ _keyToJoinedAttribute }.push(joinedValue);
              `;
            }
            if (!_currentFor) {
              _code += _codeInter;
              if (_aggregateCode) {
                _code += _aggregateCode.code;
              }
            }
            else {
              _currentFor.codeBeforeChildrenCode.push(_codeInter);
              if (_aggregateCode) {
                _currentFor.codeBeforeChildrenCode.push(_aggregateCode.code);
              }
            }
          }

          if (type === 'delete') {
            _parameters        = [];
            _keyForToAggregate = null;
            _aggregateCode     = null;
            if (externalAggregates[_joinedStores[i]]) {
              _keyForToAggregate = compilationFns.getKey(_fors, _nbFor, compilation, virtualCompilation, externalAggregates[_joinedStores[i]][1], null, _parameters);
              _parameters.splice(0, 0, _keyToJoinedAttribute + '[i]');
              _value             = externalAggregates[_joinedStores[i]][2].split('.');
              _value             = _keyToJoinedAttribute + '[i][\'' + _value[_value.length - 1] + '\']';
              _aggregateState    = getAggregateStateKey(externalAggregates[_joinedStores[i]][1], _keyForToAggregate.key);
              _aggregateCode     = getCodeForAggregateValues(
                externalAggregates[_joinedStores[i]][0],
                _keyForToAggregate.key,
                _aggregateState,
                _value,
                type,
                externalAggregates[_joinedStores[i]][3],
                _parameters,
                storeName
              );
            }
            if (compilatedStores[_joinedStores[i]] && compilatedStores[_joinedStores[i]].isStoreObject) {
              _codeInter = `
                ${ _keyToJoinedAttribute } = null;
              `;
            }
            else {
              _codeInter = `
                if (!joinedValue) {
                  ${ _keyToJoinedAttribute } = [];
                }
                else {
                  for (var i = 0; i < ${ _keyToJoinedAttribute }.length; i++) {
                    if (${ _keyToJoinedAttribute }[i]._id === joinedValue._id) {
                      ${ _aggregateCode ? _aggregateCode.code : '' }
                      ${ _keyToJoinedAttribute }.splice(i, 1);
                      break;
                    }
                  }
                }
              `;
            }
            if (!_currentFor) {
              _code += _codeInter;
            }
            else {
              _currentFor.codeBeforeChildrenCode.push(_codeInter);
            }
          }
        }
      }
    }

    return [_code, _fors];
  }

  var _functions = {
    set : new Function ('object', 'joinedValues', 'aggregates', 'constants', 'logger', compilationFns.getCode.apply(null, _getFors(joins, 'set')))
  };

  var _joinedStores = Object.keys(joins);
  for (var j = 0; j < _joinedStores.length; j++) {
    var _join                    = {};
    _join[_joinedStores[j]]      = joins[_joinedStores[j]];
    _functions[_joinedStores[j]] = {
      insert : new Function ('object', 'joinedValue', 'aggregates', 'constants', 'logger', compilationFns.getCode.apply(null, _getFors(_join, 'insert'))),
      delete : new Function ('object', 'joinedValue', 'aggregates', 'constants', 'logger', compilationFns.getCode.apply(null, _getFors(_join, 'delete')))
    };
  }

  return _functions;
}

module.exports = getJoinFns;
