exports.clone = function clone (value) {
  return JSON.parse(JSON.stringify(value));
};

exports.freeze = function freeze (value) {
  return Object.freeze(value);
};

exports.OPERATIONS = {
  DELETE : 'DELETE',
  INSERT : 'POST',
  UPDATE : 'PUT'
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
