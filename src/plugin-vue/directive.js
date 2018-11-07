/**
 * How to use it ?
 * <input v-lunaris="'attribute'" :lunaris-id="$store.attribute" :lunaris-store="@store">
 */

/**
 * Return handler for directive onChange input
 * @param {Store} store
 * @param {String} path see decodeObjectPath()
 * @param {Int} id current lunaris _id value
 * @param {Boolean} isLocal islocal update
 * @param {Obejct} vnode
 * @return {Function}
 */
function getHandlerFn (store, path, id, isLocal, vnode) {
  return function handler (val) {
    var _value;
    if (val.target.type === 'checkbox' || val.target.type === 'radio') {
      _value = val.target.checked;
    }
    else {
      _value = val.target.value;
    }
    var _pathParts = path.split('.');
    var _obj       = decodeObjectPath(_pathParts, _value);
    _obj._id       = id;

    if (val.target.type === 'radio') {
      if (!lunaris._stores[store.replace('@', '')]) {
        return lunaris.logger.warn('The store "' + store + '" does not exist!');
      }

      var _radioValues = lunaris._stores[store.replace('@', '')].data.getAll();

      for (var i = 0; i < _radioValues.length; i++) {
        if (_radioValues[i].isChecked === true) {
          var _val       = lunaris.utils.clone(_radioValues[i]);
          _val.isChecked = false;
          lunaris.update(store, _val);
        }
      }
    }

    var _item = lunaris.getOne(store, _obj._id);
    if (!_item) {
      return;
    }
    _obj = lunaris.utils.merge(_item, _obj);

    lunaris.validate(store, _obj, function (isValid, err) {
      if (isValid) {
        return lunaris.update(store, _obj, isLocal);
      }

      lunaris.logger.warn('v-lunaris', err);

      if (vnode.data && vnode.data.on && vnode.data.on.error) {
        vnode.data.on.error(err);
      }
    });
  };
}

/**
 * Get lunaris id from el attributes
 * @param {Object} vnode
 * @returns {Int}
 */
function getId (vnode) {
  if (!vnode.data.attrs || (vnode.data.attrs && !vnode.data.attrs['lunaris-id'])) {
    return lunaris.logger.warn('v-lunaris', new Error('The directive must have "lunaris-id" defined!'));
  }

  return vnode.data.attrs['lunaris-id'];
}

/**
 * Get store option
 * @param {Object} vnode
 * @return {String}
 */
function getStore (vnode) {
  if (!vnode.data.attrs || (vnode.data.attrs && !vnode.data.attrs['lunaris-store'])) {
    return lunaris.logger.warn('v-lunaris', new Error('The directive must have "lunaris-store" defined!'));
  }

  return vnode.data.attrs['lunaris-store'];
}


/**
 * Get isLocal option
 * @param {Object} vnode
 * @return {Boolean}
 */
function getIsLocal (vnode) {
  if (vnode.data.attrs && vnode.data.attrs['is-local']) {
    return Boolean(vnode.data.attrs['is-local']);
  }

  return false;
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
  bind : function (el, binding, vnode) {
    var _value = binding.value;

    if (!_value) {
      return lunaris.logger.warn('v-lunaris', new Error('The directive must have a value!'));
    }

    this.handler = getHandlerFn(getStore(vnode), _value, getId(vnode), getIsLocal(vnode), vnode);
    el.addEventListener('change', this.handler);
  },

  unbind : function (el) {
    el.removeEventListener('change', this.handler);
  }
});

exports.decodeObjectPath;
