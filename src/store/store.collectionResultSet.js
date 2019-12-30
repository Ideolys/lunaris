var utils      = require('../utils.js');
var storeUtils = require('./store.utils.js');
var ilike      = require('./store.offline.js').ilike;

/**
 * Generate sort copare function
 * @param {Array} sorts
 * @returns {Function}
 */
function getSortFn (sorts) {
  var _fn = '';
  for (var i = 0; i < sorts.length; i++) {
    var _parts        = sorts[i].split(' ');
    var _atributePath = _parts[0].split('.');
    var _sort         = _parts[1] === 'DESC' ? -1 : 1;

    var _attribute = '';
    while (_atributePath.length) {
      _attribute += '["' + _atributePath.shift() + '"]';

      _fn += 'if (itemA' + _attribute + ' == null) { return 1; }';
      _fn += 'if (itemB' + _attribute + ' == null) { return -1; }';
    }

    _fn += '\nif (itemA' + _attribute + ' > itemB' + _attribute + ') {';
    _fn += '\n  return ' + _sort + ';';
    _fn += '\n}';
    _fn += '\nif (itemA' + _attribute + ' < itemB' + _attribute + ') {';
    _fn += '\n  return -(' + _sort + ');';
    _fn += '\n}';
  }

  _fn += '\nreturn 0;';

  return new Function ('itemA', 'itemB', _fn);
}

var queryOpertors = {
  '>' : function (a, b) {
    return a > b;
  },

  '>=' : function (a, b) {
    return a >= b;
  },

  '<' : function (a, b) {
    return a < b;
  },

  '<=' : function (a, b) {
    return a <= b;
  },

  '=' : function (a, b) {
    return a === b;
  },

  '!=' : function (a, b) {
    return a !== b;
  },

  $text : function (a, b) {
    return ilike.call(null, [b], a);
  },

  $where : function (a, b) {
    return b.call(null, a);
  },

  $in : function (a, b) {
    return b.indexOf(a) > -1;
  },

  $nin : function (a, b) {
    return b.indexOf(a) === -1;
  },

  $and : function (a, b) {
    for (var i = 0, len = a.length; i < len; i++) {
      if (!doQuery(a[i], b)) {
        return false;
      }
    }

    return true;
  },

  $or : function (a, b) {
    for (var i = 0, len = a.length; i < len; i++) {
      if (doQuery(a[i], b)) {
        return true;
      }
    }

    return false;
  }
};

/**
 * Do simple query
 * @param {Object} query { value : filter's value, operator : String, attribute : String }
 * @param {*} value
 * @returns {Boolean}
 */
function doQuery (query, value) {
  if (queryOpertors[query.operator]) {
    return queryOpertors[query.operator].call(null, value[query.attribute], query.value);
  }

  if (query['$and']) {
    return queryOpertors['$and'].call(null, query['$and'], value);
  }

  return false;
}

/**
 * View
 * @param {String} store
 */
function CollectionResultSet (store) {
  var _resultSet     = {};

  var _hasBeenCloned = false;
  var _data          = [];

  /**
   * @private
   */
  function _cloneIfNotAlreadyIs () {
    if (!_hasBeenCloned) {
      _data           = utils.clone(_data);
      _hasBeenCloned  = true;
    }
  }

  /**
   * Count the number of items
   * @public
   * @returns {Number}
   */
  _resultSet.count = function count () {
    return _data.length;
  };

  /**
   * Return result set's data
   * @public
   * @param @option {Object} options { freeze : Boolean }
   * @returns {Array}
   */
  _resultSet.data = function data (options) {
    _cloneIfNotAlreadyIs();

    if (options && options.freeze) {
      _data = utils.cloneAndFreeze(_data);
    }

    return _data;
  };

  /**
   * Sort
   * @public
   * @param {Array/String} sorts 'label [ASC|DESC]'
   * @returns {CollectionResultSet}
   */
  _resultSet.sort = function sort (sorts) {
    if (!sorts) {
      return _resultSet;
    }

    if (!Array.isArray(sorts)) {
      sorts = [sorts];
    }

    _cloneIfNotAlreadyIs();

    timsort.sort(_data, getSortFn(sorts));
    return _resultSet;
  };

  /**
   * Map
   * @param {Function} mapFn
   * @returns {CollectionResultSet}
   */
  _resultSet.map = function map (mapFn) {
    if (typeof mapFn !== 'function') {
      throw new Error('mapFn is not a function');
    }

    _cloneIfNotAlreadyIs();

    var res = [];
    for (var i = 0; i < _data.length; i++) {
      res[i] = mapFn.call(null, _data[i], i, res);
    }

    _data = res;
    return _resultSet;
  };

  /**
   * Reduce
   * @public
   * @param {Function} reduceFn
   * @param {Object} options
   * options.initialValue {*} Initial value of the accumulator
   * @returns {*}
   */
  _resultSet.reduce = function reduce (reduceFn, options) {
    if (typeof reduceFn !== 'function') {
      throw new Error('reduceFn is not a function');
    }

    _cloneIfNotAlreadyIs();

    var accumulator = options && options.initialValue !== undefined ? options.initialValue : null;
    for (var i = 0; i < _data.length; i++) {
      accumulator = reduceFn.call(null, accumulator, _data[i]);
    }

    return accumulator;
  };

  /**
   * Map and reduce
   * @param {Function} mapFn
   * @param {Function} reduceFn
   * @param {Object} options
   * options.initialValue {*} Initial value of the accumulator
   * @returns {*}
   */
  _resultSet.mapReduce = function mapReduce (mapFn, reduceFn, options) {
    if (typeof mapFn !== 'function') {
      throw new Error('mapFn is not a function');
    }
    if (typeof reduceFn !== 'function') {
      throw new Error('reduceFn is not a function');
    }

    _cloneIfNotAlreadyIs();

    var newArray    = [];
    var accumulator = options && options.initialValue !== undefined ? options.initialValue : null;
    for (var i = 0; i < _data.length; i++) {
      newArray[i] = mapFn.call(null, _data[i], i, newArray);
      accumulator = reduceFn.call(null, accumulator, newArray[i]);
    }

    _data = newArray;
    return accumulator;
  };

  /**
   * Apply a filter in js
   * @public
   * @param {Function} fn must return a boolean
   * @returns {CollectionResultSet}
   */
  _resultSet.where = function where (fn) {
    if (typeof fn !== 'function') {
      throw new Error('fn is not a function');
    }

    var _dataFiltered = [];

    _cloneIfNotAlreadyIs();

    for (var i = 0; i < _data.length; i++) {
      var _res = fn.call(null, _data[i]);

      if (_res) {
        _dataFiltered.push(_data[i]);
      }
    }

    _data = _dataFiltered;
    return _resultSet;
  };

  /**
   * find() section
   */

  /**
   * Parse query expressions for find
   * @param {Array} expressions
   * { <field> : <value> }
   * { <field> : { <operator> : <value> } }
   * @returns {Object} { expressions : compilatedExpressions, attributes : attributes to search on Array }
   * compilatedExpressions : {
   *   attribute : String,
   *   operator  : String,
   *   value     : *
   * }
   */
  function parseExpression (expressions) {
    var compilatedExpressions = [];
    var attributes            = [];

    for (var i = 0; i < expressions.length; i++) {
      var expression = expressions[i];

      var subCompilatedExpressions = [];

      // Generate and control query
      for (var field in expression) {
        attributes.push(field);
        var querySearch = expression[field];

        if (typeof querySearch !== 'object') {
          var querySearchValue    = querySearch;
          querySearch             = { attribute : field, operator : '=', value : querySearchValue };
          subCompilatedExpressions.push(querySearch);
        }
        else {
          for (var operator in querySearch) {
            if (operator === '$text') {
              querySearch[operator] = utils.unaccent(querySearch[operator]).toLowerCase().split(' ');
            }

            subCompilatedExpressions.push({ attribute : field, operator : operator, value : querySearch[operator] });
          }
        }
      }

      compilatedExpressions.push({ $and : subCompilatedExpressions });
    }

    return { expressions : compilatedExpressions, attributes : attributes };
  }

  /**
   * Find items according to query
   * @param {Object} query
   * {
   *   $and : [ { expression1 }, { expression2 } ] // Array/Object
   *   $or  : [ { expression1 }, { expression2 } ] // Array/Object
   * }
   *
   * with expression :
   * { <field> : <value> }
   * { <field> : { <operator> : <value> } }
   */
  _resultSet.find = function find (query) {
    var _dataFiltered = [];
    var _and          = [];
    var _or           = [];

    if (query.$or) {
      _or = query.$or;
      if (!Array.isArray(_or)) {
        _or = [_or];
      }
      delete query.$or;
    }
    if (query.$and) {
      _and = query.$and;
      if (!Array.isArray(_and)) {
        _and = [_and];
      }
    }
    else {
      _and = [query];
    }

    var compilatedAndExpressions = parseExpression(_and);
    var compilatedOrExpressions  = parseExpression(_or);

    _and = compilatedAndExpressions.expressions;
    _or  = compilatedOrExpressions.expressions;
    var attributes = compilatedAndExpressions.attributes.concat(compilatedOrExpressions.attributes);

    for (var i = 0, len = _data.length; i < len; i++) {
      var item = _data[i];

      // prepare item values
      var itemValues = {};
      for (var j = 0; j < attributes.length; j++) {
        var itemValue    = item;
        var atributePath = attributes[j].split('.');
        while (atributePath.length) {
          var attribute = atributePath.shift();

          if (itemValue[attribute] == null) {
            itemValues[attributes[j]] = undefined;
            break;
          }

          itemValue = itemValue[attribute];
        }

        itemValues[attributes[j]] = itemValue;
      }

      var conditionValue = true;

      if (_and.length) {
        conditionValue = queryOpertors.$and(_and, itemValues);

        if (!conditionValue) {
          continue;
        }
      }

      if (_or.length) {
        conditionValue = queryOpertors.$or(_or, itemValues);
      }

      if (!conditionValue) {
        continue;
      }

      _dataFiltered.push(item);
    }

    _data = _dataFiltered;
    return _resultSet;
  };


  // Init result set
  var _store      = storeUtils.getStore(store);

  if (_store.isStoreObject) {
    throw new Error('Cannot initialize a CollectionResultSet on a store object');
  }

  var _collection = storeUtils.getCollection(_store);
  _data = utils.clone(_collection.getAll());

  return _resultSet;
}

module.exports    = CollectionResultSet;
exports.operators = queryOpertors; // for tests
