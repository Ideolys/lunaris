function clone (value) {
  return JSON.parse(JSON.stringify(value));
}
function freeze (value) {
  return Object.freeze(value);
}

exports.cloneAndFreeze = function cloneAndFreeze (value) {
  var _value = clone(value);
  if (!Array.isArray(_value)) {
    return freeze(_value);
  }

  for (var i = 0; i < _value.length; i++) {
    _value[i] = freeze(_value[i]);
  }
  return _value;
};

exports.OPERATIONS = {
  DELETE : 'DELETE',
  INSERT : 'POST',
  UPDATE : 'PUT',
  LIST   : 'GET'
};

/**
 * Merge two objects
 * @param {Object} parent
 * @param {Object} child
 */
exports.merge = function merge (parent, child) {
  if (typeof parent !== 'object' || typeof child !== 'object') {
    return;
  }

  var _keys = Object.keys(child);
  for (var i = 0; i < _keys.length; i++) {
    var _key = _keys[i];
    if (parent[_key] && typeof child[_key] === 'object') {
      parent[_key] = merge(parent[_key], child[_key]);
    }
    else {
      parent[_key] = child[_key];
    }
  }

  return parent;
};

exports.clone  = clone;
exports.freeze = freeze;
