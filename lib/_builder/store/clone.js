exports.generateClone = function generateClone (descriptor) {
  let fn = '';

  var _path = [{ objName : '', type : 'object' }];

  // For each object in the descriptor, generate the code which will build the JSON
  for (var _objName in descriptor) {
    var _obj         = descriptor[_objName].obj; // object to build
    var _type        = descriptor[_objName].type; // object type
    var _objParent   = descriptor[_objName].objParent; // unique name of the object parent
    var _realObjName = descriptor[_objName].name; // real name of the parent object
    // var _arrChild = descriptor[_objName].arrChild; // unique name of all array children

    var _varName             = _objName   + '_obj';
    var _varParentName       = _objParent + '_obj';
    var _varNameCloned       = _objName   + '_obj_cloned';

    // detect nested array in order to close brackets
    if (_path[_path.length - 1].objName === _objParent) {
      _path.push({ objName : _objName, type : _type, realObjName : _realObjName, parent : _objParent });
    }
    else {
      while (_path.length > 1 && _path[_path.length-1].objName !== _objParent) {
        var _pathObject = _path.pop();
        if (_pathObject.type === 'array' || _pathObject.objName === 'main0') {
          fn += '}\n';
          if (_pathObject.objName !== 'main0') {
            fn += '}\n';
          }
        }
      }
      _path.push({ objName : _objName, type : _type, realObjName : _realObjName });
    }

    var _varNameIterator = null;
    // if this is an object
    if (_type === 'object' && _objName !== 'main0') {
      fn += 'var ' +_varName + ' = ' + _varParentName + '["'+_realObjName+'"];\n';
      fn += 'var ' + _varNameCloned + ' = {};\n';
    }
    else if (_type === 'array' && _objName !== 'main0') {
      _varNameIterator = _objName+'_i';
      fn += ' if (' + _varParentName + '["' + _realObjName + '"]) {\n';
      fn += ' for(var '+_varNameIterator+'=0;'+ _varNameIterator+'<'+_varParentName+'["'+_realObjName+'"].length; '+_varNameIterator+'++){\n';
      fn += ' var '+_varName+' = '+ _varParentName+'["'+_realObjName+'"]['+_varNameIterator+'];\n';
      fn += ' var ' + _varNameCloned + ' = {};\n';
    }

    if (_objName === 'main0') {
      fn += 'var res = [];\n';
      var _varNameArray = _objName+'_arr';
      fn += 'var '+_varNameArray+' = data;\n';
      fn += 'if (!Array.isArray(' + _varNameArray + ')) {\n';
      fn += _varNameArray + '= [' + _varNameArray + '];\n';
      fn += '}\n';
      _varNameIterator = _objName+'_i';
      fn += 'for(var '+_varNameIterator+'=0;'+ _varNameIterator+'<'+_varNameArray+'.length; '+_varNameIterator+'++){\n';
      fn += ' var ' + _varNameCloned + ' = {};\n';
      fn += ' var ' +_varName + ' = ' + _varNameArray + '[' + _varNameIterator + '];\n';
    }

    // We must add _id, _version and _rowId for main0 obj
    if (_objName === 'main0') {
      fn += 'if (' + _varName + '["_id"]' + ') {\n';
      fn += '  ' + _varNameCloned + '["_id"] = ' + _varName + '["_id"];\n';
      fn += '}\n';
      fn += 'if (' + _varName + '["_version"]' + ') {\n';
      fn += '  ' + _varNameCloned + '["_version"] = [' + _varName + '["_version"][0], ' + _varName + '["_version"][1]];\n';
      fn += '}\n';
      fn += 'if (' + _varName + '["_rowId"]' + ') {\n';
      fn += '  ' + _varNameCloned + '["_rowId"] = ' + _varName + '["_rowId"];\n';
      fn += '}\n';
    }

    // Test every attribute of the object
    for (var _attr in _obj) {
      var _currentVariable      = _varName+'["'+_attr+'"]';
      var _currentvariableClone = _varNameCloned + '["' + _attr + '"]';
      var _test                 = _obj[_attr];
      var _testType             = _test[0];

      if (_testType === 'array') {
        fn += ' ' + _currentvariableClone + ' = [];\n';
        continue;
      }
      else {
        fn += ' ' + _currentvariableClone + ' = ' + _currentVariable + ';\n';
        fn += 'if (typeof '  + _currentVariable + ' === "function") {\n';
        fn += '  ' +  _currentvariableClone + ' = undefined;\n',
        fn += '}\n';
        fn += 'if (typeof ' + _currentvariableClone + ' === "object") {\n';
        fn += _currentvariableClone + ' = ' + _currentvariableClone + '.toISOString ? ' + _currentvariableClone + '.toISOString() : ' + _currentvariableClone +'.toString();\n',
        fn += '}\n';
      }
    }
  }

  // If the are loop which are not closed by a bracket, close them
  while (_path.length > 1) {
    _pathObject = _path.pop();
    if (_pathObject.type === 'array' || _pathObject.objName === 'main0') {
      if (_pathObject.objName !== 'main0') {
        fn += _pathObject.parent + '_obj_cloned["' + _pathObject.realObjName + '"].push(' + _pathObject.objName + '_obj_cloned);\n';
        fn += '}\n';
        fn += '}\n';
        continue;
      }

      fn += 'res.push(' + _pathObject.objName + '_obj_cloned);\n';
      fn += '}\n';
      fn += 'if (!Array.isArray(data)) { return res[0]; }\n'
    }
    else {
      if (_pathObject.objName !== 'main0') {
        fn += _pathObject.parent + '_obj_cloned["' + _pathObject.realObjName + '"] = ' + _pathObject.objName + '_obj_cloned;\n';
        continue;
      }
    }

  }

  fn += 'return res;';

  // The function is built, we compile it and check errors in the same time
  var _fn;
  try {
    _fn = new Function('data', fn);
  }
  catch (err) {
    throw new Error('Lunaris.clone: Impossible to compile the clone function.\n'+err+'\n--------------------------------\n'+fn+'\n--------------------------------\n');
  }

  return _fn;
};
