/**
 * How to use it ?
 * <input v-lunaris="'@store.attribute'" :lunaris-id="$store.attribute">
 */

/**
 * Return handler for directive onChange input
 * @param {String} path see decodeObjectPath()
 * @param {Int} id current lunaris _id value
 * @return {Function}
 */
function getHandlerFn (path, id) {
  return function handler (val) {
    var _pathParts = path.split('.');
    var _store     = _pathParts.shift(); // dot not include store
    var _obj       = decodeObjectPath(_pathParts, val.target.value);
    _obj._id       = id;

    _item = lunaris.getOne(_store, _obj._id);
    if (!_item) {
      return;
    }
    _obj = lunaris.merge(lunaris.clone(_item), _obj);

    lunaris.validate(_store, _obj, function (isValid, err) {
      if (isValid) {
        return lunaris.update(_store, _obj);
      }

      lunaris.logger.warn('v-lunaris', err);
    });
  };
}

/**
 * Get lunaris id from el attributes
 * @param {Object} el
 * @returns {Int}
 */
function getId (el) {
  if (!el.attributes['lunaris-id']) {
    return lunaris.logger.warn('v-lunaris', new Error('The directive must have "lunaris-id" defined!'));
  }

  return parseInt(el.attributes['lunaris-id'].value);
}

/**
 * Decompose object path
 * @store.attribute
 * @store.attribute.test
 * @store.attribute[1].test
 * @param {Array} objectPathParts
 * @returns {Object}
 */
function decodeObjectPath (objectPathParts, value) {
  var _obj   = {};
  var _part  = objectPathParts.shift();

  if (!objectPathParts.length) {
    _obj[_part] = value;
    return _obj;
  }

  if (/\[[0-9]*\]$/.test(_part)) {
    var _decomposedPart                          = _part.split(/\[|\]/);
    _obj[_decomposedPart[0]]                     = [];
    _obj[_decomposedPart[0]][_decomposedPart[1]] = decodeObjectPath(objectPathParts, value);
  }
  else {
    _obj[_part] = decodeObjectPath(objectPathParts, value);
  }

  return _obj;
}

Vue.directive('lunaris', {
  bind: function (el, binding, vnode) {
    var _value = binding.value;

    if (!_value) {
      return lunaris.logger.warn('v-lunaris', new Error('The directive must have a value!'));
    }

    if (!/@.*\./.test(_value)) {
      lunaris.logger.warn('v-lunaris', new Error('The directive must reference a store!'));
      return lunaris.logger.tip('v-lunaris', 'You must declare the directive as: v-lunaris="\'@<store>.attribute\'"');
    }

    this.handler = getHandlerFn(_value, getId(el));
    el.addEventListener('change', this.handler);
  },

  unbind : function (el) {
    el.removeEventListener('change', this.handler);
  }
});

exports.decodeObjectPath;
