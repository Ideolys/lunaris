const validate         = require('./validate');
const types            = validate.types;
const conversions      = ['toNumber', 'toInt', 'toBoolean'];
const aggregates       = require('../../../src/store/store.aggregate').aggregates;
const aggregatesValues = Object.keys(aggregates);

/**
 * Schema - schema analyzer for validate.js and transform.js
 */
const schema = {


  /**
   * Analyze the descriptor used to transform or validate the data
   *
   * @param {object} obj : Object descriptor
   * @return {object} An object which is used by the method by validate.js or transform.js
   */
  analyzeDescriptor : function (obj) {
    var _mainType    = 'object';
    var _analyzedObj = obj;
    if (obj instanceof Array) {
      _mainType    = 'array';
      _analyzedObj = obj[0];
    }
    var _onValidate  = {};
    var _onTransform = {};
    var _meta        = { sortGroup : {}, jsonToSQL : {}, sortMandatory : [], primaryKey : [], aggregates : {}, aggregatesSort : [] };
    // I give an arbitrary unique name of the first array (the root).
    var _pathToCurrentObjName = ['main0'];
    var _currentObjName       = 'main0';
    var _nbObjArr             = 0;
    var _nbArr                = 0;
    var _arrLevel             = 0;
    var _objDesc              = {};
    var _defaultValue         = {};
    _objDesc.main0            = {
      arrChild   : [],
      arrParents : [],
      objParent  : '',
      name       : '',
      type       : _mainType,
      obj        : {},
      objTrans   : {},
      level      : _arrLevel,
      keys       : [],
    };

    // For each attribute of the object (level 0), call analyzeRecursive;
    for (var _attrName in _analyzedObj) {
      var _value = _analyzedObj[_attrName];
      analyzeRecursive(_attrName, _value, false, _defaultValue);
      _arrLevel = 0;
    }

    // Recursive function
    function analyzeRecursive (attrName, attrValue, comingFromArray, defaultValue) {

      if (typeof attrValue === 'string') {
        throw new Error('Lunaris.store.map: ' + attrName + ' is not an array. All properties key names should be defined as arrays (e.g. ["<id>"], ["object", {}], ["array", {}])');
      }
      var _lastElement = attrValue[attrValue.length - 1];
      // if the attribute value is an array of objects
      if (attrValue[0] === 'array' && validate.isObject(_lastElement)) {
        defaultValue[attrName] = [];
        // Copy the array parameters except the last one which represent the schema of the the nested object
        _objDesc[_currentObjName].obj[attrName] = attrValue.slice(0,-1);
        // For transform.js
        _objDesc[_currentObjName].objTrans[attrName] = [];
        // Add the next array to the child list of all previous objects (TODO: not used for validation, do I keep it for further use when the validation descriptor will merge with the transform descriptor)
        var _nextObjName = attrName+''+(_nbObjArr + 1); // the next
        for (var i = 0; i<_pathToCurrentObjName.length; i++) {
          _objDesc[ _pathToCurrentObjName[i] ].arrChild.push(_nextObjName);
        }
        _nbArr++; // count number of arrays
        _arrLevel++;

        // Go to the object inside the array
        analyzeRecursive(attrName, _lastElement, true, {});
      }
      // If it is an object
      else if (attrValue[0] === 'object' && validate.isObject(_lastElement)) {
        // Copy the object parameters except the last one which represent the schema of the the nested object
        _objDesc[_currentObjName].obj[attrName] = attrValue.slice(0,-1);
        // For transform.js
        _objDesc[_currentObjName].objTrans[attrName] = { type : 'object' };

        var _currentDefaultValue = {};
        // Go to the object inside the object
        analyzeRecursive(attrName, _lastElement, false, _currentDefaultValue);
        defaultValue[attrName] = _currentDefaultValue;
      }
      // analyze the nested object (we may come from an array or an object)
      else if (validate.isObject(attrValue)) {
        // generate a unique name for this object
        _nbObjArr++;
        _nextObjName = attrName+''+_nbObjArr;
        // keep array parents
        var _pathToCurrentObjNameArr = [];
        for (i = 0; i<_pathToCurrentObjName.length; i++) {
          var _vistedObjName = _pathToCurrentObjName[i];
          if (_objDesc[ _vistedObjName ].type === 'array') {
            _pathToCurrentObjNameArr.push(_vistedObjName);
          }
        }
        // Add the name of next visited object to the path
        _pathToCurrentObjName.push(_nextObjName);
        // create the next object
        _objDesc[_nextObjName] = {
          arrChild   : [],
          arrParents : _pathToCurrentObjNameArr,
          objParent  : _currentObjName,
          name       : attrName,
          type       : comingFromArray ? 'array' : 'object',
          obj        : {},
          objTrans   : {},
          level      : _arrLevel,
          keys       : []
        };

        // the next become the current
        _currentObjName = _nextObjName;
        // For each attribute of this currently visited object, call analyzeRecursive
        var _currentArrLevel = _arrLevel;
        _currentDefaultValue = {};
        for (var _attrName in attrValue) {
          analyzeRecursive(_attrName, attrValue[_attrName], false, defaultValue);
          _arrLevel = _currentArrLevel;
        }

        // End of the object which is currently visited.
        _pathToCurrentObjName.pop();
        // go up in the path
        _currentObjName = _pathToCurrentObjName[_pathToCurrentObjName.length-1];

        // take into account primary keys in object which are within an array
        if (_objDesc[_currentObjName].type === 'array' &&  _objDesc[_nextObjName].type === 'object') {
          _objDesc[_currentObjName].keys = _objDesc[_currentObjName].keys.concat(_objDesc[_nextObjName].keys);
        }
      }
      // if the attribute value is a simple array
      else {
        // parse the array to separate what is for validation and what is for transformation
        defaultValue[attrName] = parseArray(attrName, attrValue, _objDesc[_currentObjName], _currentObjName, _onValidate, _onTransform, _objDesc, _meta, _nbArr);
      }
    } // end of the recursive function

    // remove the keys of objects
    for (var _objName in _objDesc) {
      var _obj = _objDesc[_objName];
      if (_obj.type === 'object') {
        _obj.keys = [];
      }
      _meta.sortMandatory = _meta.sortMandatory.concat(_obj.keys);
    }

    return {
      meta           : _meta,
      onValidate     : _onValidate,
      onTransform    : _onTransform,
      compilation    : _objDesc,
      defaultValue   : _defaultValue,
      getPrimaryKey  : _getPrimaryKeyFn(_meta.primaryKey),
      getAggregateFn : _getAggregateFns(_objDesc, _meta.aggregates, _meta.aggregatesSort)
    };
  }


};

module.exports = schema;

/** ***************************************************************************************************************/
/*  Privates methods */
/** ***************************************************************************************************************/


/**
 * Parse array of each descriptor attribute
 *
 * @param {string} attrName : the currently visited attribute name
 * @param {array} attrArray : the array of the currently visited attribute.
 * @param {object} currentObj : The current flattenned object. This object is updated by the function.
 * @param {string} currentObjName : The current flattenned object name ('main0', ...)
 * @param {object} onValidate : object which list the functions used by the validator. This object is updated by the function.
 * @param {object} onTransform : object which list the functions used by the transformer. This object is updated by the function.
 */
function parseArray (attrName, attrArray, currentObj, currentObjName, onValidate, onTransform, objDesc, meta, currentArrayNumber) {
  var _regexSQL      = /^\s*<{1}\s*(\w+)\s*>{1}\s*$/;   // regex which find sql column names <idMenu> (simple chevron)
  var _regexSQLpk    = /^\s*<{2}\s*(\w+)\s*>{2}\s*$/; // regex which find sql column primary keys <<idMenu>> (double chevron)
  var _defaultValue  = null;
  var _validateArray = [];

  // Parse the array and seperate what is for the validation what is for the transformation
  for (var i = 0; i<attrArray.length; i++) {
    var _item           = attrArray[i];
    var _jsonUniqueName = generateJsonUniqueName(objDesc, currentObjName, attrName);
    if (typeof _item === 'string') {
      // on Validate functions
      if (_item === 'onValidate') {
        _validateArray.push(_item); // keep this validate function in the validate array
        _item = attrArray[++i];  // get the validate function (the next element)
        _validateArray.push(_item); // keep this validate function in the validate array
        if (typeof _item !== 'function') {
          throw new Error('Lunaris.store.map: "' + _item + '" is not a validate function. You must provide a function after "onValidate"');
        }
        onValidate[currentObjName+'_'+attrName] = _item;
      }
      // on Transform
      else if (_item === 'onTransform') {
        _item = attrArray[++i];  // get the transform value (the next element)
        if (typeof _item === 'function') {
          onTransform[currentObjName + '_' + attrName] = _item;
          currentObj.objTrans[attrName] = { type : 'function' };
        }
        else if (typeof _item === 'string') {
          currentObj.objTrans[attrName] = { type : 'string', value : _item };
        }
        else {
          currentObj.objTrans[attrName] = { type : 'int', value : _item };
        }
        // i++; // pass the transform function for the next loop
      }
      // detect database column names (simple chevron. ex : <idMenu>)
      else if (_regexSQL.test(_item)) {
        var _colName                    = _regexSQL.exec(_item)[1];
        currentObj.objTrans[attrName]   = _colName;
        meta.jsonToSQL[_jsonUniqueName] = _colName;
        meta.sortGroup[_colName]        = currentArrayNumber;
      }
      // detect database primary keys column names (double chevron. ex : <<idMenu>>)
      else if (_regexSQLpk.test(_item)) {
        _colName = _regexSQLpk.exec(_item)[1];

        var _col = _colName;
        if (types.indexOf(_colName) >= 0) {
          _col = attrName;
          _validateArray.push(_colName);
        }

        currentObj.keys.push(_col);
        currentObj.objTrans[attrName]   = _col;
        meta.jsonToSQL[_jsonUniqueName] = _col;
        meta.sortGroup[_col]            = currentArrayNumber;

        // Set root object primary key
        if (currentObjName === 'main0') {
          meta.primaryKey.push(attrName);
        }
      }
      else if (_item === 'min') {
        _validateArray.push(_item);
        _validateArray.push(attrArray[++i]);
      }
      else if (_item === 'max') {
        _validateArray.push(_item);
        _validateArray.push(attrArray[++i]);
      }
      else if (_item === 'array') {
        _defaultValue = [];
        _validateArray.push(_item);
      }
      else if (_item === 'optional') {
        _validateArray.push(_item);
      }
      else if (_item.indexOf(aggregatesValues) !== -1) {
        var _column =  generateJsonUniqueName(objDesc, currentObjName, attrArray[++i]);
        if (!_column) {
          throw new Error('Lunaris.map: aggregate must have a valid object attribute!');
        }
        _validateArray.push(aggregates[_item].type);
        meta.aggregates[_jsonUniqueName] = [_item, _column];
        meta.aggregatesSort.splice(0, 0, _jsonUniqueName);
      }
      else if (types.indexOf(_item) === -1 && conversions.indexOf(_item) === -1) {
        _defaultValue = _item;
      }
      else {
        // keep other params in the validate array
        _validateArray.push(_item);
      }
    }
    // If a function is found (alone without onTransform or onValidate in front of), throw an error
    else if (typeof _item === 'function') {
      throw new Error('Lunaris.map: "' + _item + '" must be set after "onValidate" or "onTransform".');
    }
    else if (types.indexOf(_item) === -1) {
      _defaultValue = _item;
    }
    else {
      // keep other params in the validate array
      _validateArray.push(_item);
    }
  }

  if (currentObj.type === 'array' && currentObj.keys.length === 0) {
    throw new Error('Lunaris.map: "' + attrName + '" is an array but no primary key has been defined with a double chevron (Ex. : <<idMenu>>): "' + JSON.stringify(attrArray) + '".');
  }

  currentObj.obj[attrName] = _validateArray;
  return _defaultValue;
}



function generateJsonUniqueName (objDesc, currentObjName, attrName) {
  var _jsonUniqueName = attrName;
  var _parent         = currentObjName;

  while (_parent !== '' && objDesc[_parent].name !== '') {
    _jsonUniqueName = objDesc[_parent].name + '.' + _jsonUniqueName;
    _parent         = objDesc[_parent].objParent;
  }

  return _jsonUniqueName;
}

/**
 * Generate function to get primaryKey
 * @param {Array} primaryKey
 * @return {Function}
 */
function _getPrimaryKeyFn (primaryKey) {
  var _fn = 'var _pk = \'\';';

  if (!primaryKey.length) {
    _fn += ' return null;';
    return new Function('item', _fn);
  }

  for (var i = 0; i < primaryKey.length; i++) {
    _fn += `
      if (!item['${ primaryKey[i] }']) {
        return null;
      }
      _pk += item['${ primaryKey[i] }'] + '-';
    `;
  }

  _fn += `
    _pk = _pk.slice(0, _pk.length - 1);
    return _pk;
  `;

  return new Function('item', _fn);
}

/**
 * Find a compilated object among the compilated objects
 * @param {Object} compilation
 * @param {String} attribute to find
 * @returns {Object}
 */
function _findCompilationObject (compilation, attribute) {
  var _objs = Object.values(compilation);
  for (var i = 0; i < _objs.length; i++) {
    if (_objs[i].name === attribute) {
      return _objs[i];
    }
  }

  return null;
}

/**
 * Get a for object
 * @param {String} forToFind
 * @param {Array} forsCrossed array of string
 * @param {Object} fors { <name> : { name :, ..., children : { n } } } }
 * @returns {Object}
 */
function _getFor (forToFind, forsCrossed, fors) {
  var _for = fors[forsCrossed.shift()];
  while (_for.name !== forToFind) {
    var _nextFor = forsCrossed.shift();
    _for = _for.children[_nextFor];
  }

  return _for;
}


/**
 * Generate a function tu update store object aggregate values
 * @param {Object} compilation compilation analyseDescriptor result
 * @param {Object} aggregates { object attribute : object attribute source for aggregate }
 * @param {Array} sortedAggregates ['object attribute', 'object attribute', ...]
 * @return {Function}
 */
function _getAggregateFns (compilation, aggregates, sortedAggregates) {
  var _fors = {};

  for (var i = 0; i < sortedAggregates.length; i++) {
    var _currentAttribute = sortedAggregates[i];

    var _attributePathParts           = _currentAttribute.split('.');
    var _aggregateAttributesPathParts = aggregates[_currentAttribute][1].split('.');
    var _nbFor                        = 0;
    var _keyToValue                   = 'object';
    var _keyToAggregateValue          = 'object';
    var _nbForToAggregateValue        = 0;

    var _keyToArrayToAggregate = '';
    var _currentFor            = null;

    var _forsCrossed = [];

    for (var l = 0; l < _attributePathParts.length; l++) {
      _keyToAggregateValue += '[\'' + _attributePathParts[l] + '\']';
      var _compilationObj = _findCompilationObject(compilation, _attributePathParts[l]);
      if (_compilationObj && _compilationObj.type === 'array') {
        _nbForToAggregateValue++;
        var _baseObject = {
          name          : _keyToAggregateValue,
          forVar        : '_' + _nbForToAggregateValue,
          code          : [],
          codeAfterFor  : [],
          codeBeforeFor : [],
          children      : {}
        };

        if (_nbForToAggregateValue === 1) {
          if (!_fors[_keyToAggregateValue]) {
            _fors[_keyToAggregateValue] = _baseObject;
          }
          _currentFor = _fors[_keyToAggregateValue];
        }
        else if (!_currentFor.children[_keyToAggregateValue]) {
          _currentFor.children[_keyToAggregateValue] = _baseObject;
        }
        _keyToAggregateValue += '[_' + _nbForToAggregateValue + ']';
      }
    }

    for (var j = 0; j < _aggregateAttributesPathParts.length; j++) {
      var _currentAggregateAttributePathPart = _aggregateAttributesPathParts[j];

      _keyToValue += '[\'' + _currentAggregateAttributePathPart + '\']';
      _compilationObj = _findCompilationObject(compilation, _currentAggregateAttributePathPart);
      if (_compilationObj && _compilationObj.type === 'array') {
        _nbFor++;

        _forsCrossed.push(_keyToValue);

        _baseObject = {
          name          : _keyToValue,
          forVar        : '_' + _nbFor,
          code          : [],
          codeAfterFor  : [],
          codeBeforeFor : [],
          children      : {}
        };

        if (_nbFor === 1) {
          if (!_fors[_keyToValue]) {
            _fors[_keyToValue] = _baseObject;
          }
          _currentFor = _fors[_keyToValue];
        }
        else {
          if (!_currentFor.children[_keyToValue]) {
            _currentFor.children[_keyToValue] = _baseObject;
          }
          _currentFor = _currentFor.children[_keyToValue];
        }


        _keyToArrayToAggregate = _keyToValue;
        _keyToValue           += '[' + _currentFor.forVar + ']';
      }


      if (j === _aggregateAttributesPathParts.length - 1) {
        _currentFor.code.push(`
          var _aggregateValue = ${ _keyToAggregateValue } || undefined;
          var _aggregate      = aggregates['${ aggregates[_currentAttribute][0] }'];
          ${ _keyToAggregateValue } = _aggregate.add(_aggregateValue, ${ _keyToValue });
        `);

        _currentFor.codeAfterFor.push(`
          if (!${ _keyToArrayToAggregate } || !${ _keyToArrayToAggregate }.length) {
            var _aggregate = aggregates['${ aggregates[_currentAttribute][0] }'];
            ${ _keyToAggregateValue } = _aggregate.add(undefined, undefined);
          }
        `);

        // Reinit values
        // var _previousForObject = Object.keys()[_nbForToAggregateValue];
        var _previousFor = _getFor(_forsCrossed[_nbForToAggregateValue], _forsCrossed, _fors) || _currentFor;
        _previousFor.codeBeforeFor.push(`${ _keyToAggregateValue } = undefined;`);
      }
    }
  }

  // console.log(_fors);

  function _getCode (fors) {
    var _forKeys  = Object.keys(fors);
    var _forsCode = '';
    for (var k = _forKeys.length - 1; k >= 0; k--) {
      var _forVar = fors[_forKeys[k]].forVar;
      _forsCode += `
      if (${ _forKeys[k] }) {
        ${ fors[_forKeys[k]].codeBeforeFor.join('\n') }
        for (var ${ _forVar } = 0; ${ _forVar } < ${ _forKeys[k] }.length; ${ _forVar }++) {
          ${ Object.keys(fors[_forKeys[k]].children).length ? _getCode(fors[_forKeys[k]].children) : '' }
      `;
      _forsCode += fors[_forKeys[k]].code.join('\n') + '}\n';
      _forsCode += '}\n'; // close the if
      _forsCode += fors[_forKeys[k]].codeAfterFor.join('\n');
    }

    return _forsCode;
  }

  // console.log(_getCode(_fors));

  return new Function('object', 'aggregates', _getCode(_fors));
}
