const validate         = require('./validate');
const types            = validate.types;
const conversions      = ['toNumber', 'toInt', 'toBoolean'];
const aggregates       = require('../../../src/store/store.aggregate').aggregates;
const aggregatesValues = Object.keys(aggregates);
const OPERATORS        = require('../../../src/utils').OPERATORS;

/**
 * Schema - schema analyzer for validate.js and transform.js
 */
const schema = {
  getJoinFns   : _getJoinFns,
  getFilterFns : _getFilterFns,

  /**
   * Analyze the descriptor used to transform or validate the data
   *
   * @param {object} obj : Object descriptor
   * @return {object} An object which is used by the method by validate.js or transform.js
   */
  analyzeDescriptor : function (obj, storeName) {
    var _mainType    = 'object';
    var _analyzedObj = obj;
    if (obj instanceof Array) {
      _mainType    = 'array';
      _analyzedObj = obj[0];
    }
    var _onValidate  = {};
    var _onTransform = {};
    var _meta        = {
      sortGroup          : {},
      jsonToSQL          : {},
      sortMandatory      : [],
      primaryKey         : [],
      externalAggregates : {},
      aggregates         : {},
      aggregatesSort     : [],
      joins              : {},
      reflexive          : null,
      computedFns        : {} // functions for  aggregates are stored in aggregates values
    };
    // I give an arbitrary unique name of the first array (the root).
    var _pathToCurrentObjName = ['main0'];
    var _currentObjName       = 'main0';
    var _nbObjArr             = 0;
    var _nbArr                = 0;
    var _arrLevel             = 0;
    var _objDesc              = {};
    var _virtualObjDesc       = {}; // use for joins
    var _defaultValue         = {};
    var _aggregateAttributes  = {};
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
        defaultValue[attrName] = parseArray(attrName, attrValue, _objDesc[_currentObjName], _currentObjName, _onValidate, _onTransform, _objDesc, _meta, _nbArr, _aggregateAttributes, _virtualObjDesc, storeName);
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
      meta               : _meta,
      onValidate         : _onValidate,
      onTransform        : _onTransform,
      compilation        : _objDesc,
      virtualCompilation : _virtualObjDesc,
      defaultValue       : _defaultValue,
      getPrimaryKey      : _getPrimaryKeyFn(_meta.primaryKey),
      aggregateFn        : _getAggregateFn(_objDesc, _meta.aggregates, _meta.aggregatesSort, storeName),
      reflexiveFn        : _getReflexiveFn(_objDesc, _meta.reflexive),
      computedsFn        : _getComputedPropertiesFn(_objDesc, _meta.computedFns, storeName)
    };
  }


};

module.exports = schema;

/** ***************************************************************************************************************/
/*  Privates methods */
/** ***************************************************************************************************************/

/**
 * Get new object descriptor
 * @param {Object} currentObj
 * @param {String} currentObjName
 * @param {String} objectName
 * @returns {Object}
 */
function _getNewObjDescriptor (currentObj, currentObjName, objectName) {
  return {
    arrChild   : [],
    arrParents : currentObj.type === 'array'  ? currentObjName : '',
    objParent  : currentObjName,
    name       : objectName,
    type       : 'array',
    obj        : {},
    objTrans   : {},
    level      : currentObj.level,
    keys       : []
  };
}

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
function parseArray (attrName, attrArray, currentObj, currentObjName, onValidate, onTransform, objDesc, meta, currentArrayNumber, aggregateAttributes, virtualObjectDesc, storeName) {
  var _regexSQL         = /^\s*<{1}\s*(\w+)\s*>{1}\s*$/;   // regex which find sql column names <idMenu> (simple chevron)
  var _regexSQLpk       = /^\s*<{2}\s*(\w+)\s*>{2}\s*$/; // regex which find sql column primary keys <<idMenu>> (double chevron)
  var _defaultValue     = null;
  var _validateArray    = [];
  var _currentAggregate = null;

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
      // detect aggregates
      else if (aggregatesValues.indexOf(_item) !== -1) {
        _validateArray = [];
        // Do not validate aggregates
        var _column = generateJsonUniqueName(objDesc, currentObjName, attrArray[++i]);
        if (!_column) {
          throw new Error('Lunaris.map: aggregate must have a valid object attribute!');
        }

        var _store = getStoreFromString(_column);
        if (_store) {
          var _storeAttr = 'join_' + _store.store;
          meta.joins[_store.store]              = _store.path === '' ? _storeAttr : _store.path + '.' + _storeAttr;
          meta.externalAggregates[_store.store] = [_item, _jsonUniqueName, _column.replace('@' + _store.store, _storeAttr)];
          _currentAggregate                     = meta.externalAggregates[_store.store]; // for transdormer function

          virtualObjectDesc[_storeAttr] = _getNewObjDescriptor(currentObj, currentObjName, _storeAttr);
        }
        else {
          var _columnKeyWithoutAggregateAttribute = _column.split('.');
          if (_columnKeyWithoutAggregateAttribute.length > 1) {
            _columnKeyWithoutAggregateAttribute = _columnKeyWithoutAggregateAttribute.splice(0, _columnKeyWithoutAggregateAttribute.length - 1);
            _columnKeyWithoutAggregateAttribute = _columnKeyWithoutAggregateAttribute.join('.');
          }
          aggregateAttributes[_columnKeyWithoutAggregateAttribute] = _jsonUniqueName;

          // A join is linked to an aggregate, we must register the external aggregate
          var _aggregateValues = Object.values(meta.joins);
          var _indexFound      = _aggregateValues.indexOf(_columnKeyWithoutAggregateAttribute);
          if (_indexFound !== -1) {
            var _stores = Object.keys(meta.joins);
            meta.externalAggregates[_stores[_indexFound]] = [_item, _jsonUniqueName, _column]; // for transformer function
            _currentAggregate = meta.externalAggregates[_stores[_indexFound]];

            virtualObjectDesc[_stores[_indexFound]] = _getNewObjDescriptor(currentObj, currentObjName, _stores[_indexFound]);
          }
          else {
            meta.aggregates[_jsonUniqueName] = [_item, _column];
            meta.aggregatesSort.splice(0, 0, _jsonUniqueName);
            _currentAggregate = meta.aggregates[_jsonUniqueName]; // for transformer function
          }
        }
      }
      // detect joined stores or reflexive store
      else if (_item[0] === '@') {
        _validateArray = [];
        if (_item === '@' + storeName) {
          // it is not a joined store, but a reflexive
          meta.reflexive = _jsonUniqueName;
        }
        else {
          meta.joins[getStoreFromString(_item).store] = _jsonUniqueName;
          // A join is linked to an aggregate, we must register the external aggregate
          _aggregateValues = Object.keys(aggregateAttributes);
          _indexFound      = _aggregateValues.indexOf(_jsonUniqueName);
          if (_indexFound !== -1) {
            _stores = Object.keys(meta.joins);
            meta.externalAggregates[_stores[_indexFound]] = [
              meta.aggregates[aggregateAttributes[_jsonUniqueName]][0],
              aggregateAttributes[_jsonUniqueName],
              meta.aggregates[aggregateAttributes[_jsonUniqueName]][1],
            ];

            if (meta.aggregates[aggregateAttributes[_jsonUniqueName]][2]) {
              meta.externalAggregates[_stores[_indexFound]].push(meta.aggregates[aggregateAttributes[_jsonUniqueName]][2]);
            }

            delete meta.aggregates[aggregateAttributes[_jsonUniqueName]];
            meta.aggregatesSort.splice(meta.aggregatesSort.indexOf(_jsonUniqueName), 1);
            virtualObjectDesc[_stores[_indexFound]] = _getNewObjDescriptor(currentObj, currentObjName, _stores[_indexFound]);
          }
        }
      }
      else if (types.indexOf(_item) === -1 && conversions.indexOf(_item) === -1) {
        _defaultValue = _item;
      }
      else {
        // keep other params in the validate array
        _validateArray.push(_item);
      }
    }
    // If a function is found (alone without onTransform or onValidate in front of), it is a transformer function
    else if (typeof _item === 'function') {
      // e must detect if the function belongs to an aggregate
      if (_currentAggregate) {
        // Aggregate fns will call the function
        _currentAggregate.push(_item);
      }
      else {
        meta.computedFns[_jsonUniqueName] = _item;
      }
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


/**
 * Generate json unique name
 * @param {Object} objDesc
 * @param {String} currentObjName
 * @param {String} attrName
 * @returns {String}
 */
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
 * Get store from string
 * @param {String} str
 * @returns {String}
 */
function getStoreFromString (str) {
  var _splittedStr = str.split('.');
  var _path        = '';
  for (var i = 0; i< _splittedStr.length; i++)  {
    if (_splittedStr[i][0] === '@') {
      return { store : _splittedStr[i].slice(1, _splittedStr[i].length), path : _path.slice(0, _path.length - 1) };
    }
    _path += _splittedStr[i] + '.';
  }


  return null;
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
 * Get code from fors
 * @param {String} code before the fors
 * @param {Object} fors { name, forVar, code, codeAfter, codeBefore, children : {} }
 * @param {Int} level
 * @param {Boolean} isReturnABoolean must return false as default value to return;
 * @returns {String}
 */
function _getCode (code, fors, level, isReturnABoolean) {
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
        ${ Object.keys(fors[_forKeys[k]].children).length ? _getCode(null, fors[_forKeys[k]].children, _level + 1) : '' }
    `;
    _forsCode += fors[_forKeys[k]].code.join('\n') + '}\n';
    _forsCode += '}\n'; // close the if
    _forsCode += fors[_forKeys[k]].codeAfterFor.join('\n');
  }

  if (_level === 0) {
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
function _getAggregateFn (compilation, aggregates, sortedAggregates, storeName) {
  var _fors = {};
  var _code = '';

  for (var i = 0; i < sortedAggregates.length; i++) {
    var _currentAttribute = sortedAggregates[i];

    var _attributePathParts     = _currentAttribute.split('.');
    var _keyToAggregateValue    = 'object';
    var _aggregateState         = '';
    var _nbForToAggregateValue  = 0;
    var _currentFor             = null;

    for (var l = 0; l < _attributePathParts.length; l++) {
      _keyToAggregateValue += '[\'' + _attributePathParts[l] + '\']';
      var _compilationObj = _findCompilationObject(compilation, _attributePathParts[l]);
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
        var _keyAndForToAggregateValue = _getKey(_fors, _nbForToAggregateValue, compilation, {}, aggregates[_currentAttribute][1], null, _parameters);

        if (aggregates[_currentAttribute][2]) {
          _transformerCode = `
            try {
              _aggregateValue = ${ _getCodeForComputedFunction(aggregates[_currentAttribute][2], _parameters) };
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

  return new Function('object', 'aggregates', 'constants', 'logger', _getCode(_code, _fors));
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
function _getKey (fors, nbFor, compilation, virtualCompilation, key, objName, parameters) {
  var _pathParts  = key.split('.');
  var _key        = objName    || 'object';
  var _lastArray  = objName    || 'object';
  var _parameters = parameters || [];
  var _currentFor = null;
  var _nbFor      = 0;
  _parameters.push(_key);
  for (var i = 0; i < _pathParts.length; i++) {
    _key += `['${ _pathParts[i] }']`;
    var _compilationObj = _findCompilationObject(compilation, _pathParts[i]);
    if (!_compilationObj) {
      _compilationObj = _findCompilationObject(virtualCompilation, _pathParts[i]);
    }
    if (_compilationObj && _compilationObj.type === 'object') {
      _parameters.splice(0, 0, _key);
    }
    else if (_compilationObj && _compilationObj.type === 'array') {
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
  }

  return { key : _key, for : _currentFor, lastArray : _lastArray };
}

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
function _getCodeForAggregateValues (aggregateType, keyToAggregate, keyToAggregateState, keyToAggregateValues, functionType, transformerFn, transformerFnParameters, storeName) {
  var _res = {
    code       : '',
    codeBefore : ''
  };
  var _transformerCode = '';
  if (transformerFn) {
    _transformerCode = `
      try {
        _aggregateValue = ${ _getCodeForComputedFunction(transformerFn, transformerFnParameters) };
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
function _getAggregateStateKey (aggregatePath, aggregateKey) {
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
function _getJoinFns (compilatedStores, compilation, virtualCompilation, joins, externalAggregates, storeName) {
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
        var _compilationObj = _findCompilationObject(compilation, _attributePathParts[l]);
        if (!_compilationObj) {
          _compilationObj = _findCompilationObject(virtualCompilation, _attributePathParts[l]);
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
              _keyForToAggregate = _getKey(_fors, _nbFor, compilation, virtualCompilation, externalAggregates[_joinedStores[i]][1]);
              _aggregateState    = _getAggregateStateKey(externalAggregates[_joinedStores[i]][1], _keyForToAggregate.key);
              var _keyForAggregateValues = _getKey(_fors, _nbFor, compilation, virtualCompilation, externalAggregates[_joinedStores[i]][2], null, _parameters);
              var _aggregateCode         = _getCodeForAggregateValues(
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
              _keyForToAggregate = _getKey(_fors, _nbFor, compilation, virtualCompilation, externalAggregates[_joinedStores[i]][1], null, _parameters);
              _parameters.splice(0, 0, 'joinedValue');
              var _value         = externalAggregates[_joinedStores[i]][2].split('.');
              _value             = 'joinedValue[\'' + _value[_value.length - 1] + '\']';
              _aggregateState    = _getAggregateStateKey(externalAggregates[_joinedStores[i]][1], _keyForToAggregate.key);
              _aggregateCode     = _getCodeForAggregateValues(
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
              _keyForToAggregate = _getKey(_fors, _nbFor, compilation, virtualCompilation, externalAggregates[_joinedStores[i]][1], null, _parameters);
              _parameters.splice(0, 0, _keyToJoinedAttribute + '[i]');
              _value             = externalAggregates[_joinedStores[i]][2].split('.');
              _value             = _keyToJoinedAttribute + '[i][\'' + _value[_value.length - 1] + '\']';
              _aggregateState    = _getAggregateStateKey(externalAggregates[_joinedStores[i]][1], _keyForToAggregate.key);
              _aggregateCode     = _getCodeForAggregateValues(
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
    set : new Function ('object', 'joinedValues', 'aggregates', 'constants', 'logger', _getCode.apply(null, _getFors(joins, 'set')))
  };

  var _joinedStores = Object.keys(joins);
  for (var j = 0; j < _joinedStores.length; j++) {
    var _join                    = {};
    _join[_joinedStores[j]]      = joins[_joinedStores[j]];
    _functions[_joinedStores[j]] = {
      insert : new Function ('object', 'joinedValue', 'aggregates', 'constants', 'logger', _getCode.apply(null, _getFors(_join, 'insert'))),
      delete : new Function ('object', 'joinedValue', 'aggregates', 'constants', 'logger', _getCode.apply(null, _getFors(_join, 'delete')))
    };
  }

  return _functions;
}

/**
 * Get reflexiveFn
 * @param {Object} compilation
 * @param {String} reflexiveKey
 * @returns {Object} { update ! {Function}, delete : {Function} }
 */
function _getReflexiveFn (compilation, reflexiveKey) {
  if (!reflexiveKey) {
    return null;
  }

  function _getFors (type) {
    var _fors       = {};
    var _keyAndFor  = _getKey(_fors, 0, compilation, {}, reflexiveKey);
    var _code       = '';

    var _codeBefore = `
      var _primaryKey = null;
      if (primaryKeyFn) {
        _primaryKey = primaryKeyFn(objectParent);
      }

      if (!${ _keyAndFor.key }) {
        return null;
      }
    `;
    _code += `
      if (${ _keyAndFor.key } !== null && typeof ${ _keyAndFor.key } === 'object') {
        var _primaryKeyObject = null;
        if (primaryKeyFn) {
          _primaryKeyObject = primaryKeyFn(${ _keyAndFor.key });
        }

        if (_primaryKeyObject && _primaryKey === _primaryKeyObject) {
          ${ _keyAndFor.key } = ${ type === 'update' ? 'objectParent' : 'null' };
        }
        else if (${ _keyAndFor.key }._id && objectParent._id === ${ _keyAndFor.key }._id) {
          ${ _keyAndFor.key } = ${ type === 'update' ? 'objectParent' : 'null' };
        }
        else {
          return null;
        }
      }
    `;

    if (!_keyAndFor.for) {
      // If update we muste delete the parent reflexive key from the object
      var _parentCode = '';
      if (type === 'update') {
        var _forsParent      = {};
        var _keyParentAndFor = _getKey(_forsParent, 0, compilation, {}, reflexiveKey, 'objectParent');
        _parentCode          = 'delete ' + _keyParentAndFor.key + ';\n';
        if (_keyAndFor.for) {
          _keyAndFor.for.code.push(_parentCode);
        }
        _parentCode = _getCode(_parentCode, _forsParent, 1);
      }
      _codeBefore = _parentCode + _codeBefore + _code;
    }
    else {
      _keyAndFor.for.code.push(_code);
    }

    return [_codeBefore, _fors];
  }

  return {
    update : new Function('primaryKeyFn', 'objectParent', 'object', _getCode.apply(null, _getFors('update'))),
    delete : new Function('primaryKeyFn', 'objectParent', 'object', _getCode.apply(null, _getFors('delete')))
  };
}

/**
 * Get code for computed function
 * @param {Function} function
 * @param {Array} parameters
 * @returns {String}
 */
function _getCodeForComputedFunction (computedFn, parameters) {
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
function _getComputedPropertiesFn (compilation, computedFns, storeName) {
  var _computeds = Object.keys(computedFns);
  if (!Object.keys(_computeds).length) {
    return null;
  }

  var _code  = '';
  var _nbFor = 0;
  var _fors  = {};

  for (var i = 0; i < _computeds.length; i++) {
    var _parameters = [];
    var _keyCode    = _getKey(_fors, _nbFor, compilation, {}, _computeds[i], null, _parameters);

    var _codeToAdd = `
      try {
        ${ _keyCode.key } = ${ _getCodeForComputedFunction(computedFns[_computeds[i]], _parameters) };
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

  return new Function('object', 'constants', 'logger', _getCode(_code, _fors));
}

/**
 * Get Filter functions
 * @param {Object} compilatedStores
 * @param {Object} compilation
 * @param {Array} filters
 * @return {Object}
 */
function _getFilterFns (compilatedStores, compilation, filters) {
  var _filtersFns = {};

  if (!filters) {
    return null;
  }

  if (!Array.isArray(filters)) {
    throw new Error('store.filters must be an array of filter object!');
  }

  for (var i = 0; i < filters.length; i++) {
    var _code       = '';
    var _fors       = {};

    if (!filters[i].source) {
      throw new Error('A filter must have a source defined as : filter.source = @<store>');
    }
    if (!filters[i].sourceAttribute) {
      throw new Error('A filter must have a source attribute defined as : filter.sourceAttribute = <attribute>');
    }
    if (!filters[i].localAttribute) {
      throw new Error('A filter must have a local attribute defined as : filter.localAttribute = <attribute>');
    }

    var _storeSource   = filters[i].source.replace('@', '');
    var _isStoreObject = compilatedStores[_storeSource] ? compilatedStores[_storeSource].isStoreObject : false;

    var _filterKey  = i;
    var _keyAndCode = _getKey(_fors, 0, compilation, {}, filters[i].localAttribute);

    var _fnCode   = '';
    var _operator = OPERATORS[filters[i].operator] || 'ILIKE';
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
      _filtersFns[_filterKey] = new Function('filterValue', 'object', 'fn', _getCode(_code, _fors, 0, true));
    }
    else {
      _filtersFns[_filterKey] = new Function('filterValue', 'object', 'fn', _getCode(_code, _fors, 0, true));
    }
  }

  return _filtersFns;
}
