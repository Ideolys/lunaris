var utils      = require('../utils.js');
var storeUtils = require('./store.utils.js');

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
   * @param {Array/Object} sorts 'label [ASC|DESC]'
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

    for (var i = 0; i < _data.length; i++) {
      _data[i] = mapFn.call(null, _data[i]);
    }

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

    var accumulator = options && options.initialValue !== undefined ? options.initialValue : null;
    for (var i = 0; i < _data.length; i++) {
      _data[i] = mapFn.call(null, _data[i]);
      accumulator = reduceFn.call(null, accumulator, _data[i]);
    }

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

  // Init result set
  var _store      = storeUtils.getStore(store);
  var _collection = storeUtils.getCollection(_store);
  _data = utils.clone(_collection.getAll());

  return _resultSet;
}

module.exports = CollectionResultSet;
