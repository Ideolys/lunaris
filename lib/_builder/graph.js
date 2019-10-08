const graphlib = require('graphlib');

/**
 * Loop over object to cosntruct the graph
 * @param {Object} graph
 * @param {Object} objects
 * @param {String} lastNode
 * @param {Object} flattenedObj
 */
function _loop (graph, objects, lastNode = null, flattenedObj) {
  var _keys = Object.keys(objects);

  for (var i = 0; i < _keys.length; i++) {
    flattenedObj[_keys[i]] = objects[_keys[i]];

    if (lastNode) {
      graph.setParent(_keys[i]);
      graph.setEdge(_keys[i], lastNode);
    }
    else {
      graph.setNode(_keys[i]);
    }

    if (Object.keys(objects[_keys[i]].children).length) {
      if (Object.keys(objects[_keys[i]].children).indexOf(lastNode) >= 0) {
        var _error = 'Circular reference between stores "' + _keys[i] + '" and "' + lastNode + '"';
        throw new Error(_error);
      }
      _loop(graph, objects[_keys[i]].children, _keys[i], flattenedObj);
    }
  }
}

/**
 * Create a graph of objects
 * @param {Object} objects one object = key : {
 *  code,
 *  imports,
 *  exports,
 *  children {}
 * }
 */
function graph (objects) {
  var _graph       = new graphlib.Graph({ compound : true });
  var _flattenedObj = {};

  _loop(_graph, objects, false, _flattenedObj);

  return {
    order            : graphlib.alg.topsort(_graph),
    isCyclic         : !graphlib.alg.isAcyclic(_graph),
    flattenedObjects : _flattenedObj
  };
}

module.exports = graph;
