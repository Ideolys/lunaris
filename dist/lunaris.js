
        /* Lunaris */
        (function (global) {
          
      var _exports_js = (function(lu_i, lu_e) {
        lu_e['_stores'] = {};
// lu_e['baseUrl'] is only designed for tests in order to perform HTTP requests
lu_e['baseUrl'] = '';

// is production :  display or not error message in the console
lu_e['isProduction'] = true;

/**
 * Lunaris external constants object
 * Injected at build time
 */
lu_e['constants'] = {};
/**
 * Set env browser
 */
lu_e['isBrowser'] = true;
/**
 * Urls grpah
 * {
 *   'GET /all'          : ['store_1', 'store_2'],
 *   'GET /all/filter/#' : ['store_1'],
 *   'GET /only          : ['store_3']
 * }
 */
lu_e['urlsGraph'] = {};
/**
 * cache grpah
 * {
 *   'store_1' : ['store_2'],
 *   'store_2' : ['store_1'],
 *   'store_3' : []
 * }
 */
lu_e['cacheGraph'] = {};
lu_e['isOfflineStrategies'] = false;
lu_e['isOfflineSync'] = false;
lu_e['version'] = '';

/**
 * Set options
 */
lu_e['setOptions'] = function (options) {
  for (option in options) {
    lu_e[option] = options[option]; // lu_e = exports
  }
}

        
        return lu_e;
      })([], {});
    
      var _logger_js = (function(lu_i, lu_e) {
        var exportsLunaris = lu_i[0];

var baseMessageError      = '[Lunaris error] ';
var baseMessageTip        = '[Lunaris tip] ';
var baseMessageDeprecated = '[Lunaris deprecated]';
var baseMessageLog        = '[Lunaris info]';
var baseMessageDebug      = '[Lunaris debug]';

/**
 * Log message in the console
 * @param {String/Array} strings
 * @param {*} msg
 * @param {String} baseMessage
 */
function log (strings, msg, baseMessage, fn) {
  if (exportsLunaris.IS_PRODUCTION) {
    return;
  }

  if (!Array.isArray(strings)) {
    strings = [strings];
  }

  var _message = baseMessage + strings.join(' ');
  if (!msg) {
    return fn(_message);
  }

  fn(baseMessage + strings.join(' '), msg);
}

var logger  = {
  info : function (strings, msg) {
    return log(strings, msg, baseMessageLog, console.log);
  },

  /**
   * Warn developper in thmsge console
   * @param {Array/String} strings
   * @param {*} error
   */
  warn : function warn (strings, error) {
    return log(strings, error, baseMessageError, console.error);
  },

  /**
   * Tip developper in the console
   * @param {String/Array} strings
   * @param {*} tip
   */
  tip : function tip (strings, tip) {
    return log(strings, tip, baseMessageTip, console.warn);
  },

  /**
   * Send a deprecated info to dev
   * @param {String/Array} strings
   * @param {*} info
   */
  deprecated : function deprecated (strings, info) {
    return log(strings, info, baseMessageDeprecated, console.warn);
  },

  /**
   * Send debug info to dev
   * @param {String/Array} strings
   * @param {*} debug
   */
  debug : function (strings, debug) {
    return log(strings, debug, baseMessageDebug, console.log);
  }
};

lu_e = logger;

        
        return lu_e;
      })([_exports_js], {});
    
      var _store_store_hook_js = (function(lu_i, lu_e) {
        var logger         = lu_i[0];
var lunarisExports = lu_i[1];

/**
 * Queue
 * @param {Array} items
 * @param {Object/Array} payload payload for the handler
 * @param {Function} done function called when every items have been processed
 */
function queue (items, payload, done) {
  var iterator = -1;

  function next () {
    ++iterator;
    var item = items[iterator];

    if (!item) {
      return done();
    }

    items[iterator](payload, next);
  }

  next(true);
}

/**
 * Extract the store name and the event from the given string
 * @param {String} hook
 * @returns {Object} { event : String, store : String }
 */
function _extractHookAndStore (hook) {
  var _hook = /(.*)@(.*)/.exec(hook);
  if (!_hook || _hook.length < 3) {
    throw new Error('A hook must be: <event>@<store>');
  }

  return {
    event : _hook[1],
    store : _hook[2]
  };
}

/**
 * Throw an error if the value is not a fucntion
 * @param {*} handler
 */
function _isFunction (handler) {
  if (typeof handler !== 'function') {
    throw new Error('A handler must be a Function');
  }
}

/**
 * Register a hook
 * @param {String} hook must be <action>@<store>
 * @param {Function} handler
 * @param {Boolean} isUnique default false, if true, check if the handler already exists
 * @param {Boolean} isInternalHook
 */
function registerHook (hook, handler, isUnique, isInternalHook) {
  try {
    _isFunction(handler);
    var _hook          = _extractHookAndStore(hook);
    var lunarisExports = lu_i[2];
    var _store         = lunarisExports._stores[_hook.store];
    if (!_store) {
      throw new Error('Cannot register hook "' + hook + '", store "' + _hook.store + '" has not been defined!');
    }

    if (!_store.isInternalHooks) {
      _store.isInternalHooks = {};
    }
    if (!_store.realHooks) {
      _store.realHooks = {};
    }

    if (!_store.hooks[_hook.event]) {
      _store.hooks[_hook.event]           = [];
      _store.realHooks[_hook.event]       = [];
      _store.isInternalHooks[_hook.event] = [];
    }

    if (isUnique) {
      var _handlers     = _store.realHooks[_hook.event];
      var _hasBeenFound = false;
      for (var i = 0; i < _handlers.length; i++) {
        if (_handlers[i].toString() === handler.toString()) {
          _hasBeenFound = true;
          break;
        }
      }

      if (_hasBeenFound) {
        return;
      }
    }

    // If only 1 parameter is defined, the handler is synchrone
    var _hookHandler = handler;
    if (handler.length <= 1) {
      _hookHandler = function (payload, next) {
        handler(payload);
        next();
      };
    }

    _store.hooks[_hook.event].push(_hookHandler);
    _store.isInternalHooks[_hook.event].push(isInternalHook || false);
    _store.realHooks[_hook.event].push(handler);
  }
  catch (e) {
    logger.warn(['lunaris.hook:' + hook], e);
  }
}

/**
 * Remove hook
 * @param {String} hook must be <action>@<store>
 * @param {Function} handler
 */
function removeHook (hook, handler) {
  try {
    _isFunction(handler);
    var _hook          = _extractHookAndStore(hook);
    var lunarisExports = lu_i[3];
    var _store         = lunarisExports._stores[_hook.store];
    if (!_store) {
      throw new Error('Cannot remove hook "' + hook + '", store "' + _hook.store + '" has not been defined!');
    }

    var _handlers = _store.realHooks[_hook.event];
    if (!_handlers) {
      throw new Error('Cannot remove hook "' + hook + '", it has not been defined!');
    }


    for (var i = 0; i < _handlers.length; i++) {
      if (_handlers[i] === handler) {
        _handlers.splice(i, 1);
        _store.isInternalHooks[_hook.event].splice(i, 1);
        _store.hooks[_hook.event].splice(i, 1);
      }
    }
  }
  catch (e) {
    logger.warn(['lunaris.removeHook:' + hook], e);
  }
}

/**
 * Push payload to given hook
 * @param {Object} store
 * @param {String} hook
 * @param {*} payload
 */
function pushToHandlers (store, hook, payload, callback) {
  var _storeHooks = store.hooks[hook];

  if (!callback) {
    callback = function () {};
  }

  if (!_storeHooks) {
    return callback();
  }

  queue(_storeHooks, payload, callback);
}

/**
 * Remove all hooks
 * Internal hooks are not removed
 */
function removeAllHooks () {
  var _stores = lunarisExports._stores;
  for (var _storename in _stores) {
    var _hooks = _stores[_storename].hooks;
    for (var _hook in _hooks) {
      var _handlers        = _hooks[_hook];
      var _isInternalHooks =  _stores[_storename].isInternalHooks[_hook];

      for (var i = _handlers.length - 1; i >= 0; i--) {
        if (_isInternalHooks && _isInternalHooks[i]) {
          continue;
        }

        _handlers.splice(i, 1);
        _isInternalHooks.splice(i, 1);
        _stores[_storename].realHooks[_hook].splice(i, 1);
      }
    }
  }
}

lu_e['hook'] = registerHook;
lu_e['removeHook'] = removeHook;
lu_e['pushToHandlers'] = pushToHandlers;
lu_e['removeAllHooks'] = removeAllHooks;

        
        return lu_e;
      })([_logger_js,_exports_js,_exports_js,_exports_js], {});
    
      var _utils_js = (function(lu_i, lu_e) {
        var isBrowser = lu_i[0].isBrowser;

/**
 * Clone a value
 * @param {*} value
 * We do not use JSON.parse(JSON.stringify()) because it is too slow
 */
function clone (value) {
  var out = null;

  if (typeof value !== 'object' || value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    out = [];
    for (var index = 0; index < value.length; ++index) {
      var subArray = value[index];
      var type     = typeof subArray;

      if (type === 'object') {
        out.push(clone(subArray));
        continue;
      }

      out.push(subArray);
    }
    return out;
  }

  out = {};
  for (var key in value) {
    var subObject    = value[key];
    var typeObjValue = typeof subObject;

    if (subObject && subObject.constructor === Object || Array.isArray(subObject)) {
      out[key] = clone(subObject);
      continue;
    }

    if (typeObjValue === 'object' && !!subObject) {
      out[key] = subObject.toISOString ? subObject.toISOString() : subObject.toString();
      continue;
    }

    if (typeObjValue === 'function') {
      out[key] = undefined;
      continue;
    }

    out[key] = subObject;
  }

  return out;
}


function freeze (value) {
  return Object.freeze(value);
}

lu_e['cloneAndFreeze'] = function cloneAndFreeze (value, cloneFn) {
  var _value = (cloneFn || clone)(value);
  if (!Array.isArray(_value)) {
    return freeze(_value);
  }

  for (var i = 0; i < _value.length; i++) {
    _value[i] = freeze(_value[i]);
  }
  return _value;
};

lu_e['keepTheReferenceAndChangeTheAttributes'] = function (obj1, obj2) {
  var _keys = Object.keys(obj1);
  for (var i = 0; i < _keys.length; i++) {
    delete obj1[_keys[i]];
  }
  _keys = Object.keys(obj2);
  for (i = 0; i < _keys.length; i++) {
    obj1[_keys[i]] = obj2[_keys[i]];
  }
};

lu_e['clone'] = clone;
lu_e['freeze'] = freeze;

lu_e['offlineStore'] = 'lunarisOfflineTransactions';

lu_e['OPERATIONS'] = {
  DELETE : 'DELETE',
  INSERT : 'POST',
  UPDATE : 'PUT',
  PATCH  : 'PATCH',
  LIST   : 'GET',
  RESET  : 'RESET'
};

lu_e['OPERATORS'] = {
  '='   : ':=',
  ILIKE : ':',
  '>'   : ':>',
  '<'   : ':<',
  '>='  : ':>=',
  '<='  : ':<=',
  '<>'  : ':!='
};

/**
 * Merge two objects
 * @param {Object} parent
 * @param {Object} child
 */
lu_e['merge'] = function merge (parent, child) {
  if (!child) {
    return parent;
  }

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

/**
 * Distance of Levenshtein
 * @param {String} str1
 * @param {String} str2
 */
function levenshtein (str1, str2) {
  var current = [];
  var prev;
  var value;

  for (var i = 0; i <= str2.length; i++) {
    for (var j = 0; j <= str1.length; j++) {
      if (i && j) {
        if (str1.charAt(j - 1) === str2.charAt(i - 1)) {
          value = prev;
        }
        else {
          value = Math.min(current[j], current[j - 1], prev) + 1;
        }
      }
      else {
        value = i + j;
      }

      prev       = current[j];
      current[j] = value;
    }
  }

  return current.pop();
}

/**
 * Calculate distance from two strings
 * @param {String} str1
 * @param {String} str2
 */
lu_e['distance'] = function distance (str1, str2) {
  if (str1 === null || str2 === null) {
    return 0;
  }
  str1 = String(str1);
  str2 = String(str2);

  var distance = levenshtein(str1, str2);
  if (str1.length > str2.length) {
    return 1 - distance / str1.length;
  } else {
    return 1 - distance / str2.length;
  }
};

// Code form LokiJS,& Mindex
lu_e['index'] = {
  /**
   * Sort
   * @param {*} a
   * @param {*} b
   * @return {Int}
   */
  sort : function sort (a, b) {
    if (a === null && b === null) {
      return 0;
    }

    if (a === null) {
      return -1;
    }

    if (b === null) {
      return 1;
    }

    if (a < b) {
      return -1;
    }

    if (a > b) {
      return 1;
    }

    return 0;
  },

  /**
   * Insert value at specified index
   * @param {Array} array
   * @param {int} index
   * @param {*} value
   * @return {Array}
   */
  insertAt : function insertAt (array, index, value) {
    array.splice(index, 0, value);
    return array;
  },

  /**
   * Removed value at specified index
   * @param {Array} array
   * @param {*} index
   * @returns {Array}
   */
  removeAt : function removeAt (array, index) {
    array.splice(index, 1);
    return array;
  },

  /**
   * Get value
   * @param {String/Int} value if string value equals '_integer', ex: '_1'
   * @returns {Int}
   */
  getValue : function getValue (value) {
    if (typeof value === 'string') {
      var _value = value.replace(/^_/, '');
      if (/^-?[0-9]+$/.test(_value)) {
        return parseInt(_value, 10);
      }

      return _value;
    }

    return value;
  },

  /**
   * BinarySearh
   * @param {Array} array
   * @param {*} value
   * @returns {Object} { found : Boolean, index : Int }
   */
  binarySearch : function binarySearch (array, value) {
    var lo  = 0;
    var hi  = array.length;
    var val = this.getValue(value);
    var compared;
    var mid;
    var comparedValue;

    while (lo < hi) {
      mid           = ((lo + hi) / 2) | 0;
      comparedValue = this.getValue(array[mid]);
      compared      = this.sort(val, comparedValue);

      if (compared === 0) {
        return {
          found : true,
          index : mid
        };
      } else if (compared < 0) {
        hi = mid;
      } else {
        lo = mid + 1;
      }
    }

    return {
      found : false,
      index : hi
    };
  }
};

/*
   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var defaultDiacriticsRemovalMap = [
  { base : 'A' , letters : '\u0041\u24B6\uFF21\u00C0\u00C1\u00C2\u1EA6\u1EA4\u1EAA\u1EA8\u00C3\u0100\u0102\u1EB0\u1EAE\u1EB4\u1EB2\u0226\u01E0\u00C4\u01DE\u1EA2\u00C5\u01FA\u01CD\u0200\u0202\u1EA0\u1EAC\u1EB6\u1E00\u0104\u023A\u2C6F' },
  { base : 'AA', letters : '\uA732' },
  { base : 'AE', letters : '\u00C6\u01FC\u01E2' },
  { base : 'AO', letters : '\uA734' },
  { base : 'AU', letters : '\uA736' },
  { base : 'AV', letters : '\uA738\uA73A' },
  { base : 'AY', letters : '\uA73C' },
  { base : 'B' , letters : '\u0042\u24B7\uFF22\u1E02\u1E04\u1E06\u0243\u0182\u0181' },
  { base : 'C' , letters : '\u0043\u24B8\uFF23\u0106\u0108\u010A\u010C\u00C7\u1E08\u0187\u023B\uA73E' },
  { base : 'D' , letters : '\u0044\u24B9\uFF24\u1E0A\u010E\u1E0C\u1E10\u1E12\u1E0E\u0110\u018B\u018A\u0189\uA779\u00D0' },
  { base : 'DZ', letters : '\u01F1\u01C4' },
  { base : 'Dz', letters : '\u01F2\u01C5' },
  { base : 'E' , letters : '\u0045\u24BA\uFF25\u00C8\u00C9\u00CA\u1EC0\u1EBE\u1EC4\u1EC2\u1EBC\u0112\u1E14\u1E16\u0114\u0116\u00CB\u1EBA\u011A\u0204\u0206\u1EB8\u1EC6\u0228\u1E1C\u0118\u1E18\u1E1A\u0190\u018E' },
  { base : 'F' , letters : '\u0046\u24BB\uFF26\u1E1E\u0191\uA77B' },
  { base : 'G' , letters : '\u0047\u24BC\uFF27\u01F4\u011C\u1E20\u011E\u0120\u01E6\u0122\u01E4\u0193\uA7A0\uA77D\uA77E' },
  { base : 'H' , letters : '\u0048\u24BD\uFF28\u0124\u1E22\u1E26\u021E\u1E24\u1E28\u1E2A\u0126\u2C67\u2C75\uA78D' },
  { base : 'I' , letters : '\u0049\u24BE\uFF29\u00CC\u00CD\u00CE\u0128\u012A\u012C\u0130\u00CF\u1E2E\u1EC8\u01CF\u0208\u020A\u1ECA\u012E\u1E2C\u0197' },
  { base : 'J' , letters : '\u004A\u24BF\uFF2A\u0134\u0248' },
  { base : 'K' , letters : '\u004B\u24C0\uFF2B\u1E30\u01E8\u1E32\u0136\u1E34\u0198\u2C69\uA740\uA742\uA744\uA7A2' },
  { base : 'L' , letters : '\u004C\u24C1\uFF2C\u013F\u0139\u013D\u1E36\u1E38\u013B\u1E3C\u1E3A\u0141\u023D\u2C62\u2C60\uA748\uA746\uA780' },
  { base : 'LJ', letters : '\u01C7' },
  { base : 'Lj', letters : '\u01C8' },
  { base : 'M' , letters : '\u004D\u24C2\uFF2D\u1E3E\u1E40\u1E42\u2C6E\u019C' },
  { base : 'N' , letters : '\u004E\u24C3\uFF2E\u01F8\u0143\u00D1\u1E44\u0147\u1E46\u0145\u1E4A\u1E48\u0220\u019D\uA790\uA7A4' },
  { base : 'NJ', letters : '\u01CA' },
  { base : 'Nj', letters : '\u01CB' },
  { base : 'O' , letters : '\u004F\u24C4\uFF2F\u00D2\u00D3\u00D4\u1ED2\u1ED0\u1ED6\u1ED4\u00D5\u1E4C\u022C\u1E4E\u014C\u1E50\u1E52\u014E\u022E\u0230\u00D6\u022A\u1ECE\u0150\u01D1\u020C\u020E\u01A0\u1EDC\u1EDA\u1EE0\u1EDE\u1EE2\u1ECC\u1ED8\u01EA\u01EC\u00D8\u01FE\u0186\u019F\uA74A\uA74C' },
  { base : 'OI', letters : '\u01A2' },
  { base : 'OO', letters : '\uA74E' },
  { base : 'OU', letters : '\u0222' },
  { base : 'OE', letters : '\u008C\u0152' },
  { base : 'oe', letters : '\u009C\u0153' },
  { base : 'P' , letters : '\u0050\u24C5\uFF30\u1E54\u1E56\u01A4\u2C63\uA750\uA752\uA754' },
  { base : 'Q' , letters : '\u0051\u24C6\uFF31\uA756\uA758\u024A' },
  { base : 'R' , letters : '\u0052\u24C7\uFF32\u0154\u1E58\u0158\u0210\u0212\u1E5A\u1E5C\u0156\u1E5E\u024C\u2C64\uA75A\uA7A6\uA782' },
  { base : 'S' , letters : '\u0053\u24C8\uFF33\u1E9E\u015A\u1E64\u015C\u1E60\u0160\u1E66\u1E62\u1E68\u0218\u015E\u2C7E\uA7A8\uA784' },
  { base : 'T' , letters : '\u0054\u24C9\uFF34\u1E6A\u0164\u1E6C\u021A\u0162\u1E70\u1E6E\u0166\u01AC\u01AE\u023E\uA786' },
  { base : 'TZ', letters : '\uA728' },
  { base : 'U' , letters : '\u0055\u24CA\uFF35\u00D9\u00DA\u00DB\u0168\u1E78\u016A\u1E7A\u016C\u00DC\u01DB\u01D7\u01D5\u01D9\u1EE6\u016E\u0170\u01D3\u0214\u0216\u01AF\u1EEA\u1EE8\u1EEE\u1EEC\u1EF0\u1EE4\u1E72\u0172\u1E76\u1E74\u0244' },
  { base : 'V' , letters : '\u0056\u24CB\uFF36\u1E7C\u1E7E\u01B2\uA75E\u0245' },
  { base : 'VY', letters : '\uA760' },
  { base : 'W' , letters : '\u0057\u24CC\uFF37\u1E80\u1E82\u0174\u1E86\u1E84\u1E88\u2C72' },
  { base : 'X' , letters : '\u0058\u24CD\uFF38\u1E8A\u1E8C' },
  { base : 'Y' , letters : '\u0059\u24CE\uFF39\u1EF2\u00DD\u0176\u1EF8\u0232\u1E8E\u0178\u1EF6\u1EF4\u01B3\u024E\u1EFE' },
  { base : 'Z' , letters : '\u005A\u24CF\uFF3A\u0179\u1E90\u017B\u017D\u1E92\u1E94\u01B5\u0224\u2C7F\u2C6B\uA762' },
  { base : 'a' , letters : '\u0061\u24D0\uFF41\u1E9A\u00E0\u00E1\u00E2\u1EA7\u1EA5\u1EAB\u1EA9\u00E3\u0101\u0103\u1EB1\u1EAF\u1EB5\u1EB3\u0227\u01E1\u00E4\u01DF\u1EA3\u00E5\u01FB\u01CE\u0201\u0203\u1EA1\u1EAD\u1EB7\u1E01\u0105\u2C65\u0250' },
  { base : 'aa', letters : '\uA733' },
  { base : 'ae', letters : '\u00E6\u01FD\u01E3' },
  { base : 'ao', letters : '\uA735' },
  { base : 'au', letters : '\uA737' },
  { base : 'av', letters : '\uA739\uA73B' },
  { base : 'ay', letters : '\uA73D' },
  { base : 'b' , letters : '\u0062\u24D1\uFF42\u1E03\u1E05\u1E07\u0180\u0183\u0253' },
  { base : 'c' , letters : '\u0063\u24D2\uFF43\u0107\u0109\u010B\u010D\u00E7\u1E09\u0188\u023C\uA73F\u2184' },
  { base : 'd' , letters : '\u0064\u24D3\uFF44\u1E0B\u010F\u1E0D\u1E11\u1E13\u1E0F\u0111\u018C\u0256\u0257\uA77A' },
  { base : 'dz', letters : '\u01F3\u01C6' },
  { base : 'e' , letters : '\u0065\u24D4\uFF45\u00E8\u00E9\u00EA\u1EC1\u1EBF\u1EC5\u1EC3\u1EBD\u0113\u1E15\u1E17\u0115\u0117\u00EB\u1EBB\u011B\u0205\u0207\u1EB9\u1EC7\u0229\u1E1D\u0119\u1E19\u1E1B\u0247\u025B\u01DD' },
  { base : 'f' , letters : '\u0066\u24D5\uFF46\u1E1F\u0192\uA77C' },
  { base : 'g' , letters : '\u0067\u24D6\uFF47\u01F5\u011D\u1E21\u011F\u0121\u01E7\u0123\u01E5\u0260\uA7A1\u1D79\uA77F' },
  { base : 'h' , letters : '\u0068\u24D7\uFF48\u0125\u1E23\u1E27\u021F\u1E25\u1E29\u1E2B\u1E96\u0127\u2C68\u2C76\u0265' },
  { base : 'hv', letters : '\u0195' },
  { base : 'i' , letters : '\u0069\u24D8\uFF49\u00EC\u00ED\u00EE\u0129\u012B\u012D\u00EF\u1E2F\u1EC9\u01D0\u0209\u020B\u1ECB\u012F\u1E2D\u0268\u0131' },
  { base : 'j' , letters : '\u006A\u24D9\uFF4A\u0135\u01F0\u0249' },
  { base : 'k' , letters : '\u006B\u24DA\uFF4B\u1E31\u01E9\u1E33\u0137\u1E35\u0199\u2C6A\uA741\uA743\uA745\uA7A3' },
  { base : 'l' , letters : '\u006C\u24DB\uFF4C\u0140\u013A\u013E\u1E37\u1E39\u013C\u1E3D\u1E3B\u017F\u0142\u019A\u026B\u2C61\uA749\uA781\uA747' },
  { base : 'lj', letters : '\u01C9' },
  { base : 'm' , letters : '\u006D\u24DC\uFF4D\u1E3F\u1E41\u1E43\u0271\u026F' },
  { base : 'n' , letters : '\u006E\u24DD\uFF4E\u01F9\u0144\u00F1\u1E45\u0148\u1E47\u0146\u1E4B\u1E49\u019E\u0272\u0149\uA791\uA7A5' },
  { base : 'nj', letters : '\u01CC' },
  { base : 'o' , letters : '\u006F\u24DE\uFF4F\u00F2\u00F3\u00F4\u1ED3\u1ED1\u1ED7\u1ED5\u00F5\u1E4D\u022D\u1E4F\u014D\u1E51\u1E53\u014F\u022F\u0231\u00F6\u022B\u1ECF\u0151\u01D2\u020D\u020F\u01A1\u1EDD\u1EDB\u1EE1\u1EDF\u1EE3\u1ECD\u1ED9\u01EB\u01ED\u00F8\u01FF\u0254\uA74B\uA74D\u0275' },
  { base : 'oi', letters : '\u01A3' },
  { base : 'ou', letters : '\u0223' },
  { base : 'oo', letters : '\uA74F' },
  { base : 'p' , letters : '\u0070\u24DF\uFF50\u1E55\u1E57\u01A5\u1D7D\uA751\uA753\uA755' },
  { base : 'q' , letters : '\u0071\u24E0\uFF51\u024B\uA757\uA759' },
  { base : 'r' , letters : '\u0072\u24E1\uFF52\u0155\u1E59\u0159\u0211\u0213\u1E5B\u1E5D\u0157\u1E5F\u024D\u027D\uA75B\uA7A7\uA783' },
  { base : 's' , letters : '\u0073\u24E2\uFF53\u00DF\u015B\u1E65\u015D\u1E61\u0161\u1E67\u1E63\u1E69\u0219\u015F\u023F\uA7A9\uA785\u1E9B' },
  { base : 't' , letters : '\u0074\u24E3\uFF54\u1E6B\u1E97\u0165\u1E6D\u021B\u0163\u1E71\u1E6F\u0167\u01AD\u0288\u2C66\uA787' },
  { base : 'tz', letters : '\uA729' },
  { base : 'u' , letters : '\u0075\u24E4\uFF55\u00F9\u00FA\u00FB\u0169\u1E79\u016B\u1E7B\u016D\u00FC\u01DC\u01D8\u01D6\u01DA\u1EE7\u016F\u0171\u01D4\u0215\u0217\u01B0\u1EEB\u1EE9\u1EEF\u1EED\u1EF1\u1EE5\u1E73\u0173\u1E77\u1E75\u0289' },
  { base : 'v' , letters : '\u0076\u24E5\uFF56\u1E7D\u1E7F\u028B\uA75F\u028C' },
  { base : 'vy', letters : '\uA761' },
  { base : 'w' , letters : '\u0077\u24E6\uFF57\u1E81\u1E83\u0175\u1E87\u1E85\u1E98\u1E89\u2C73' },
  { base : 'x' , letters : '\u0078\u24E7\uFF58\u1E8B\u1E8D' },
  { base : 'y' , letters : '\u0079\u24E8\uFF59\u1EF3\u00FD\u0177\u1EF9\u0233\u1E8F\u00FF\u1EF7\u1E99\u1EF5\u01B4\u024F\u1EFF' },
  { base : 'z' , letters : '\u007A\u24E9\uFF5A\u017A\u1E91\u017C\u017E\u1E93\u1E95\u01B6\u0225\u0240\u2C6C\uA763' }
];

var diacriticsMap = {};
for (var i = 0; i < defaultDiacriticsRemovalMap.length; i++) {
  var letters = defaultDiacriticsRemovalMap[i].letters;
  for (var j = 0; j < letters.length; j++) {
    diacriticsMap[letters[j]] = defaultDiacriticsRemovalMap[i].base;
  }
}

/**
 * Unaccent string
 * @param {String}
 * @returns {String}
 */
lu_e['unaccent'] = function removeDiacritics (str) {
  return str.replace(/[^u0000-u007E]/g, function (a) {
    return diacriticsMap[a] || a;
  });
};

/**
 * Queue
 * @param {Array} items
 * @param {Function} handler function to handle item in items -> handler(item, next {Function})
 * @param {Function} done    function called when every items have been processed
 */
lu_e['queue'] = function queue (items, handler, done) {
  var iterator = -1;

  function next () {
    iterator++;
    var item = items[iterator];

    if (!item) {
      return done();
    }

    handler(items[iterator], next);
  }

  next();
};

/**
 * Get process time in ms
 */
lu_e['getProcessTime'] = function getProcessTime (before) {
  if (!isBrowser) {
    return 0;
  }

  if (!before) {
    return window.performance.now();
  }

  return window.performance.now() - before;
};

/**
 * Delete rows when version.length === 2
 */
lu_e['deleteRows'] = function deleteRows (data) {
  var _length = data.length;
  for (var i = _length - 1; i >= 0; i--) {
    if (data[i]._version.length === 1) {
      continue;
    }

    data.splice(i, 1);
  }
};

        
        return lu_e;
      })([_exports_js], {});
    
      var _localStorageDriver_js = (function(lu_i, lu_e) {
        var logger            = lu_i[0];
var lunarisExports    = lu_i[1];
var offlineVersionKey = 'lunaris:indexedDB_version';
var LIMIT_ITEMS       = 10000;

var database;
function _isDatabaseExists (dbname, callback) {
  var _request = window.indexedDB.open(dbname);
  var _existed = true;
  _request.onsuccess = function () {
    _request.result.close();
    if (!_existed) {
      window.indexedDB.deleteDatabase(dbname);
    }
    callback(_existed);
  };
  _request.onupgradeneeded = function () {
    _existed = false;
  };
}

/**
 * Init database
 * @param {int} versionNumber
 * @param {Array} stores array of string
 * @param {Function} callback optional
 */
function initIndexedDB (versionNumber, stores, callback) {
  window.indexedDB      = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
  if (!window.indexedDB) {
    if (callback) {
      callback(true);
    }
    return;
  }
  window.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || { READ_WRITE : 'readwrite' };
  window.IDBKeyRange    = window.IDBKeyRange    || window.webkitIDBKeyRange    || window.msIDBKeyRange;

  _isDatabaseExists('lunaris', function (isExisted) {
    var _request;
    if (isExisted) {
      var _lastVersionNumber = drivers.localStorage.get(offlineVersionKey);

      if (versionNumber < _lastVersionNumber) {
        versionNumber = _lastVersionNumber;
      }

      _request = window.indexedDB.open('lunaris', versionNumber);
    }
    else {
      _request = window.indexedDB.open('lunaris');
    }

    _request.onerror = function (e) {
      logger.warn('Error when requesting indexedDB', e.target.error);
      if (callback) {
        callback(true);
      }
    };

    _request.onsuccess = function (e) {
      database = e.target.result;
      if (callback) {
        callback(null, database);
      }

      database.onerror = function (e) {
        logger.warn('[IndexedDB]', e.target.errorCode);
      };
    };

    _request.onupgradeneeded = function (e) {
      drivers.localStorage.set(offlineVersionKey, versionNumber);

      var _db = e.target.result;

      for (var i = 0; i < stores.length; i++) {
        var _key = stores[i];
        if (!_db.objectStoreNames.contains(_key)) {
          _db.createObjectStore(_key, { keyPath : '_rowId' });
        }
      }

      if (!_db.objectStoreNames.contains('_states')) {
        _db.createObjectStore('_states', { keyPath : 'store' });
      }

      if (!_db.objectStoreNames.contains('_invalidations')) {
        _db.createObjectStore('_invalidations', { keyPath : 'url' });
      }

      if (!_db.objectStoreNames.contains('cache')) {
        _db.createObjectStore('cache', { keyPath : 'hash' });
      }
    };
  });
}

var _queue      = [];
var _isQueueing = false;

/**
 * Start queue
 */
function _startQueue () {
  if (!_isQueueing) {
    _isQueueing = true;
    _processQueue();
  }
}

/**
 * Add in queue
 * If offline strategies are desactivated, the arguments will not be push to the queue
 * @param {Array} args [handler fn, key, value, callback]
 */
function _addInQueue (args) {
  if (!lunarisExports.isOfflineStrategies) {
    var _callback = args.pop();
    if (typeof _callback === 'function') {
      _callback();
    }
    return ;
  }

  _queue.push(args);
  _startQueue();
}

function _batchify (_currentItem, callback) {
  var _data = _currentItem[2];

  while (_data.length > LIMIT_ITEMS) {
    _addInQueue([_currentItem[0], _currentItem[1], _data.splice(0, LIMIT_ITEMS), _data.length ? null : callback]);
  }

  if (_data.length) {
    _addInQueue([_currentItem[0], _currentItem[1], _data.splice(0, _data.length), callback]);
  }
}

/**
 * Process indexedDB queue
 */
function _processQueue () {
  var _currentItem = _queue.shift();

  if (!_currentItem) {
    _isQueueing = false;
    return;
  }

  var _callback = _currentItem.pop();
  var _args     = _currentItem.slice(1);

  if (_currentItem.length === 3 && Array.isArray(_currentItem[2]) && _currentItem[2].length > LIMIT_ITEMS) {
    _batchify(_currentItem, _callback);
    return _processQueue();
  }

  _args.push(function (err, data) {
    if (_callback) {
      _callback(err, data);
    }

    _processQueue();
  });

  _currentItem[0].apply(null, _args);
}

/**
 * Add a value
 * @param {String} key
 * @param {Array/object} value
 * @param {Function} callback @optional
 */
function _add (key, value, callback) {
  if (!database) {
    return callback ();
  }

  try {
    var _transaction = database.transaction(key, 'readwrite');
  }
  catch (e) {
    return callback(e);
  }

  _transaction.onerror = function (e) {
    callback(e);
  };
  _transaction.onblocked = function (e) {
    callback(e);
  };
  _transaction.oncomplete = function () {
    callback();
  };

  var _objectStore = _transaction.objectStore(key);

  if (!Array.isArray(value)) {
    value = [value];
  }

  for (var i = 0, len = value.length; i < len; i++) {
    _objectStore.add(value[i]);
  }
}

/**
 * Update a value
 * @param {String} key
 * @param {Array/Object} value
 * @param {Function} callback @optional
 */
function _upsert (key, value, callback) {
  if (!database) {
    return callback();
  }

  try {
    var _transaction = database.transaction(key, 'readwrite');
  }
  catch (e) {
    return callback(e);
  }

  _transaction.onerror = function (e) {
    callback(e);
  };
  _transaction.onblocked = function (e) {
    callback(e);
  };
  _transaction.oncomplete = function () {
    callback();
  };

  var _objectStore = _transaction.objectStore(key);

  if (!Array.isArray(value)) {
    value = [value];
  }

  for (var i = 0, len = value.length; i < len; i++) {
    _objectStore.put(value[i]);
  }
}

/**
 * Delete a value
 * @param {String} key
 * @param {Array/object} value
 * @param {Function} callback @optional
 */
function _del (key, value, callback) {
  if (!database) {
    return callback();
  }

  try {
    var _transaction = database.transaction(key, 'readwrite');
  }
  catch (e) {
    return callback(e);
  }

  _transaction.onerror = function (e) {
    callback(e);
  };
  _transaction.onblocked = function (e) {
    callback(e);
  };
  _transaction.oncomplete = function () {
    callback();
  };

  var _objectStore = _transaction.objectStore(key);

  if (!Array.isArray(value)) {
    value = [value];
  }

  for (var i = 0, len = value.length; i < len; i++) {
    _objectStore.delete(value[i]);
  }
}

/**
 * Get a value
 * @param {String} key
 * @param {*} value
 * @param {Function} callback
 */
function _get (key, value, callback) {
  if (!database) {
    return callback();
  }

  try {
    var _transaction = database.transaction(key, 'readonly');
  }
  catch (e) {
    return callback(e);
  }

  _transaction.onerror = function onerror (e) {
    callback(e);
  };
  _transaction.onblocked = function (e) {
    callback(e);
  };
  var _objectStore = _transaction.objectStore(key);
  var _request     = _objectStore.get(value);

  _request.onsuccess = function onsuccess (e) {
    callback(null, e.target.result);
  };
  _request.onerror = function onerror (e) {
    callback(e);
  };
}

/**
 * Get all value
 * @param {String} key
 * @param {Function} callback
 */
function _getAll (key, callback) {
  if (!database) {
    return callback();
  }

  try {
    var _transaction = database.transaction(key, 'readonly');
  }
  catch (e) {
    return callback(e);
  }

  _transaction.onerror = function onerror (e) {
    callback(e);
  };
  _transaction.onblocked = function (e) {
    callback(e);
  };
  var _objectStore = _transaction.objectStore(key);
  var _request     = _objectStore.getAll();

  _request.onsuccess = function onsuccess (e) {
    callback(null, e.target.result);
  };
  _request.onerror = function onerror (e) {
    callback(e);
  };
}

/**
 * Clear an object store
 * @param {String} key
 */
function _clear (key, callback) {
  if (!database) {
    return callback();
  }

  try {
    var _transaction = database.transaction(key, 'readwrite');
  }
  catch (e) {
    return callback(e);
  }

  _transaction.onerror = function onerror (e) {
    callback(e);
  };
  _transaction.onblocked = function (e) {
    callback(e);
  };
  _transaction.oncomplete = function onsuccess () {
    callback();
  };

  var _objectStore = _transaction.objectStore(key);
  _objectStore.clear();
}

var drivers = {
  indexedDB : {
    init : initIndexedDB,
    /**
     * Add a value
     * @param {String} key
     * @param {*} value
     * @param {Function} callback @optional
     */
    add  : function add (key, value, callback) {
      if (!database) {
        if (callback) {
          return callback();
        }
        return;
      }

      _addInQueue([_add, key, value, callback]);
    },

    /**
     * Update a value
     * @param {String} key
     * @param {*} value
     * @param {Function} callback @optional
     */
    upsert : function upsert (key, value, callback) {
      if (!database) {
        if (callback) {
          return callback();
        }
        return;
      }

      _addInQueue([_upsert, key, value, callback]);
    },

    /**
     * Delete a value
     * @param {String} key
     * @param {*} value
     * @param {Function} callback @optional
     */
    del : function del (key, value, callback) {
      if (!database) {
        if (callback) {
          return callback();
        }
        return;
      }

      _addInQueue([_del, key, value, callback]);
    },

    /**
     * Get a value
     * @param {String} key
     * @param {*} value
     * @param {Function} callback
     */
    get : function get (key, value, callback) {
      if (!database) {
        if (callback) {
          return callback();
        }
        return;
      }

      _addInQueue([_get, key, value, callback]);
    },

    /**
     * Get all value
     * @param {String} key
     * @param {Function} callback
     */
    getAll : function getAll (key, callback) {
      if (!database) {
        if (callback) {
          return callback();
        }
        return;
      }

      _addInQueue([_getAll, key, callback]);
    },

    /**
     * Clear an object store
     * @param {String} key
     */
    clear : function clear (key, callback) {
      if (!database) {
        if (callback) {
          return callback();
        }
        return;
      }

      _addInQueue([_clear, key, callback]);
    }
  },

  localStorage : {
    get : function get (key) {
      if (!lunarisExports.isBrowser || typeof localStorage === 'undefined') {
        return;
      }
      var _val = localStorage.getItem(key);
      if (_val) {
        return JSON.parse(_val);
      }
      return null;
    },

    set : function set (key, value) {
      if (!lunarisExports.isBrowser || typeof localStorage === 'undefined') {
        return;
      }
      return localStorage.setItem(key, value != null ? JSON.stringify(value) : null);
    },

    clear : function clear (key) {
      if (!lunarisExports.isBrowser || typeof localStorage === 'undefined') {
        return;
      }
      return localStorage.setItem(key, null);
    }
  }
};

lu_e = drivers;

        
        return lu_e;
      })([_logger_js,_exports_js], {});
    
      var _store_store_utils_js = (function(lu_i, lu_e) {
        var lunarisExports     = lu_i[0];
var logger             = lu_i[1];
var utils              = lu_i[2];
var localStorageDriver = lu_i[3];
var database           = localStorageDriver.indexedDB;

/**
 * Get store
 * @param {String} storeName
 * @returns {Object}
 */
function getStore (storeName) {
  if (/@/.test(storeName)) {
    storeName = storeName.split('@');
    storeName = storeName[storeName.length - 1];
  }
  var lunarisExports = lu_i[4];
  var _store         = lunarisExports._stores[storeName];
  if (!_store) {
    throw new Error('The store "' + storeName + '" has not been defined');
  }

  return lunarisExports._stores[storeName];
}

/**
 * Get translated store's name
 * @param {String} storeName
 * @returns {String}
 */
function getTranslatedStoreName (storeName) {
  var store = getStore(storeName);

  return store.nameTranslated;
}

/**
 * Get store collection
 * @param {Object} store
 * @returns {Object}
 */
function getCollection (store) {
  var _collection = store.data;

  if (!_collection) {
    throw new Error('"' + store + '" has not been defined!');
  }

  return _collection;
}

/**
 * Get primary key value for update and delete
 * @param {Object} store
 * @param {Object} value
 * @param {Boolean} isInsertOrMassiveUpdate
 * @returns {String}
 */
function getPrimaryKeyValue (store, value, isInsertOrMassiveUpdate) {
  var _id = null;

  if (isInsertOrMassiveUpdate) {
    return _id;
  }
  if (store.getPrimaryKeyFn) {
    return store.getPrimaryKeyFn.call(null, value);
  }
  if (!store.primaryKey && !store.isStoreObject) {
    logger.tip(
      'No primary key has been found in store "' + store.name + '", fallback to lunaris object attribute "_id".',
      'To declare a primary key, use the notation [\'<<int>>\'] in the map or add the \'primaryKey\' attribute in the store description.'
    );
    return value._id;
  }

  var _primaryKey = store.primaryKey;
  if (Array.isArray(_primaryKey)) {
    _id = [];
    for (var i = 0; i < _primaryKey.length; i++) {
      var _value = value[_primaryKey[i]];
      if (_value === undefined || _value === null) {
        return null;
      }

      _id.push(_value);
    }

    if (_id.length > 1) {
      _id = _id.join('-');
    }

    return _id[0];
  }

  return value[store.primaryKey];
}

/**
 * Set primary key value for update
 * @param {Object} store
 * @param {Object} value
 * @param {String} id
 * @returns {String}
 */
function setPrimaryKeyValue (store, value, id) {
  var _valueId = getPrimaryKeyValue(store, value, false);

  if (_valueId !== null && _valueId !== undefined) {
    return;
  }
  var _id = '_';
  if (store.setPrimaryKeyFn) {
    return store.setPrimaryKeyFn.call(null, value, id);
  }

  if (!store.primaryKey || (store.primaryKey && !store.primaryKey.length)) {
    return null;
  }

  var _primaryKey = store.primaryKey;
  if (Array.isArray(_primaryKey)) {
    if (value[_primaryKey[0]] === null || value[_primaryKey[0]] === undefined) {
      value[_primaryKey[0]] = '_' + id;
    }

    if (_primaryKey.length > 1) {
      return logger.tip('lunaris cannot set a composite primary key');
    }

    return _id;
  }

  return value[store.primaryKey] = _id + id;
}

/**
 * Check arguments for upsert, get, deleteStore
 * @param {String} store
 * @param {*} value
 * @param {Boolean} isNoValue enable or not value check
 */
function checkArgs (store, value, isNoValue) {
  if (value === undefined && !isNoValue) {
    throw new Error('Must have a value, provided value: ' + value);
  }
  if (!store || typeof store !== 'string') {
    throw new Error('Must have a correct store value: @<store>');
  }
}


/**
 * Decompose object path to get the attribute value
 * attribute
 * attribute.test
 * @param {Array} objectPathParts
 * @returns {Object}
 */
function getPathValue (objectPathParts) {
  var _parts = utils.clone(objectPathParts);
  var _obj   = {};
  var _part  = _parts.shift();

  if (!_parts.length) {
    return _obj[_part];
  }

  return getPathValue(objectPathParts) || null;
}

/**
 * Decompose object path to set the attribute value
 * attribute
 * attribute.test
 * @param {Array} objectPathParts
 * @param {*} value
 * @returns {Object}
 */
function setPathValue (objectPathParts, value, obj) {
  var _parts = utils.clone(objectPathParts);
  var _obj   = obj || {};
  var _part  = _parts.shift();

  if (!_parts.length) {
    _obj[_part] = value;
    return _obj;
  }

  _obj[_part] = setPathValue(_parts, value);
  return _obj;
}

/**
 * Set values for given path to an object
 * @param {Object} objectPathValues  { path : value }
 * @param {*} data
 */
function setObjectPathValues (objectPathValues, data) {
  var _paths = Object.keys(objectPathValues);
  for (var i = 0; i< _paths.length; i++) {
    setPathValue(_paths[i].split('.'), objectPathValues[_paths[i]], data);
  }
}

/**
 * Get JSON patch path
 * @param {String} path element.label
 * @returns {String} element/label
 */
function getJSONPatchPath (path) {
  return path.replace('.', '/');
}

/**
 * Save
 * @param {Object} store
 * @param {Object} collection
 * @param {Function} callback
 */
function saveState (store, collection, callback) {
  if (!lunarisExports.isBrowser) {
    if (callback) {
      return callback();
    }

    return;
  }

  var _state = {
    store          : store.name,
    massOperations : store.massOperations,
    collection     : {
      currentId    : collection.getCurrentId(),
      currentRowId : collection.getCurrentRowId()
    }
  };

  database.upsert('_states', _state, callback);
}

/**
 * Get cache object
 * @param {Object} store
 * @returns {Object}
 */
function getCache (store) {
  return store.cache;
}

lu_e['getStore'] = getStore;
lu_e['getCollection'] = getCollection;
lu_e['getCache'] = getCache;
lu_e['getPrimaryKeyValue'] = getPrimaryKeyValue;
lu_e['setPrimaryKeyValue'] = setPrimaryKeyValue;
lu_e['checkArgs'] = checkArgs;
lu_e['getTranslatedStoreName'] = getTranslatedStoreName;
lu_e['getPathValue'] = getPathValue;
lu_e['setPathValue'] = setPathValue;
lu_e['setObjectPathValues'] = setObjectPathValues;
lu_e['getJSONPatchPath'] = getJSONPatchPath;
lu_e['saveState'] = saveState;

        
        return lu_e;
      })([_exports_js,_logger_js,_utils_js,_localStorageDriver_js,_exports_js], {});
    
      var _store_store_aggregate_js = (function(lu_i, lu_e) {
        var utils = lu_i[0];
var index = utils.index;

var sum = {
  type : 'number',
  init : {
    start : 0
  },
  add : function (prevState, value) {
    if (!prevState) {
      prevState = { value : this.init.start };
    }
    return { value : prevState.value + (value || this.init.start) };
  },
  remove : function (prevState, value) {
    if (!prevState) {
      prevState = { value : this.init.start };
    }
    return { value : prevState.value - (value || this.init.start) };
  },
  getStartValue : function () {
    return this.init.start;
  }
};

var count = {
  type : 'int',
  init : {
    start : 0
  },
  add : function (prevState) {
    if (!prevState) {
      prevState = { value : this.init.start };
    }
    return { value : prevState.value + 1 };
  },
  remove : function (prevState) {
    if (!prevState) {
      prevState = { value : this.init.start };
    }
    return { value : prevState.value - 1 };
  },
  getStartValue : function () {
    return this.init.start;
  }
};

var countBoolTrue = {
  type : 'int',
  init : {
    start : 0
  },
  add : function (prevState, value) {
    if (!prevState) {
      prevState = { value : this.init.start };
    }

    if (value === true) {
      prevState.value = prevState.value + 1;
    }

    return prevState;
  },
  remove : function (prevState, value) {
    if (!prevState) {
      prevState = { value : this.init.start };
    }

    if (value !== true || prevState.value === 0) {
      return prevState;
    }

    prevState.value = prevState.value - 1;
    return prevState;
  },
  getStartValue : function () {
    return this.init.start;
  }
};

var min = {
  type : '*',
  init : {
    start  : null,
    values : []
  },
  add : function (prevState, value) {
    if (!prevState) {
      prevState = {
        value  : this.init.start,
        values : []
      };
    }

    if (!value) {
      return prevState;
    }

    var _search = index.binarySearch(prevState.values, value);
    index.insertAt(prevState.values, _search.index, value);
    prevState.value = prevState.values[0];
    return prevState;
  },
  remove : function (prevState, value) {
    if (!prevState) {
      prevState = { value : this.init.start, values : [] };
    }

    if (!prevState.value) {
      return prevState;
    }

    var _search = index.binarySearch(prevState.values, value);
    if (_search.found) {
      index.removeAt(prevState.values, _search.index);
      prevState.value = prevState.values[0];
    }

    return prevState;
  },
  getStartValue : function () {
    return this.init.start;
  }
};

var max = {
  type : '*',
  init : {
    start  : null,
    values : []
  },
  add : function (prevState, value) {
    if (!prevState) {
      prevState = {
        value  : this.init.start,
        values : []
      };
    }

    if (!value) {
      return prevState;
    }

    var _search = index.binarySearch(prevState.values, value);
    index.insertAt(prevState.values, _search.index, value);
    prevState.value = prevState.values[prevState.values.length - 1];
    return prevState;
  },
  remove : function (prevState, value) {
    if (!prevState) {
      prevState = { value : this.init.start, values : [] };
    }

    if (!prevState.value) {
      return prevState;
    }

    var _search = index.binarySearch(prevState.values, value);
    if (_search.found) {
      index.removeAt(prevState.values, _search.index);
      prevState.value = prevState.values[prevState.values.length - 1];
    }

    return prevState;
  },
  getStartValue : function () {
    return this.init.start;
  }
};

var avg = {
  type : 'number',
  init : {
    start : 0,
    count : 0
  },
  add : function (prevState, value) {
    if (!prevState) {
      prevState = {
        value : this.init.start,
        count : this.init.count
      };
    }

    if (!value) {
      value = 0;
    }

    prevState.count++;
    prevState.value += (value - prevState.value) / prevState.count;
    return prevState;
  },
  remove : function (prevState, value) {
    if (!prevState) {
      prevState = {
        value : this.init.start,
        count : this.init.count
      };
    }

    if (!value) {
      value = 0;
    }

    prevState.count--;
    prevState.value -= (value - prevState.value) / prevState.count;
    return prevState;
  },
  getStartValue : function () {
    return this.init.start;
  }
};

var aggregates = {
  sumAgg           : sum,
  countAgg         : count,
  avgAgg           : avg,
  minAgg           : min,
  maxAgg           : max,
  countBoolTrueAgg : countBoolTrue
};

lu_e['aggregates'] = aggregates;

        
        return lu_e;
      })([_utils_js], {});
    
      var _store_store_collection_js = (function(lu_i, lu_e) {
        var utils              = lu_i[0];
var index              = utils.index;
var OPERATIONS         = utils.OPERATIONS;
var aggregates         = lu_i[1].aggregates;
var lunarisExports     = lu_i[2];
var logger             = lu_i[3];
var localStorageDriver = lu_i[4];
var localStorage       = localStorageDriver.localStorage;
var localDatabase      = localStorageDriver.indexedDB;


/**
 * Version number :
 * Each item in the collection has an attribute `_version` which is an Array of 2 values :
 *  - first, the min version number
 *  - last, the max version number
 * The interval is [min, max)
 */
var currentVersionNumber = 1;


var _savedCurrentVersionNumber = localStorage.get('lunaris:versionNumber', 1);
if (_savedCurrentVersionNumber) {
  currentVersionNumber = _savedCurrentVersionNumber;
}

function incrementVersionNumber () {
  currentVersionNumber++;
  localStorage.set('lunaris:versionNumber', currentVersionNumber);
}

/**
 * @param {Function} getPrimaryKeyFn function built at app build step for the store
 * @param {Boolean} isStoreObject
 * @param {Object} joinsDescriptor {
 *  joins   : {Object} from schema parsing,
 *  joinFns : {Object} {
 *    set@(obj, { store1: val, storeN ... }),
 *    store1 : { insert@(obj, val), delete@(obj, value) },
 *    storeN : ...
 *  }
 *  collections : {Object} key / value (store / value to store)
 * }
 * @param {Function} aggregateFn function to set aggregate values
 * @param {Function} computedsFn function to set computed properties
 * @param {String} storeName
 * @param {Object} referencesDescriptor {
 *  referencesFn : { get : { storeN : fn }, update : { storeN : fn } },
 *  stores       : [ 'store1', storeN ],
 *  references   : { pathToRef : store }
 * }
 * @param {Function} cloneFn clone fn specifi to the store or default one
 */
function collection (getPrimaryKeyFn, isStoreObject, joinsDescriptor, aggregateFn, computedsFn, storeName, referencesDescriptor, cloneFn) {
  var _data                     = [];
  var _dataCache                = []; // data available
  var _dataCacheIndex           = {}; // key = _ids, value = index in _data
  var _currentId                = 1;
  var _currentRowId             = 1;
  var _transactions             = {};
  var _isTransactionCommit      = false;
  var _transactionVersionNumber = null;
  var _isStoreObject            = isStoreObject   || false;
  var _joinsDescriptor          = joinsDescriptor || {};
  var _joins                    = joinsDescriptor ? Object.keys(_joinsDescriptor.joins) : [];
  var _referencesDescriptor     = referencesDescriptor || {};
  var _references               = _referencesDescriptor.stores && _referencesDescriptor.stores.length ? _referencesDescriptor.stores : [];
  var _getPrimaryKey            = getPrimaryKeyFn;
  var _aggregateFn              = aggregateFn;
  var _computedsFn              = computedsFn;
  var _storeName                = storeName;

  // only for transactions
  var _locaDatabaseActions = [];

  var _idIndex = {}; // key = PK, value = _id
  /**
   * id : [[id], [_id]]
   * references : { storeN : [[PKs refrence store], [_ids local collection]] }
   */
  var _indexes = {
    id         : [[], []],
    references : {}
  };

  /**
   * Add peristence action to queue if in transaction or send to indexeddb if not
   * @param {Function} actionFn
   * @param {Object} data
   */
  function _addActionToLocalDatabase (actionFn, data) {
    if (_transactionVersionNumber == null) {
      return actionFn(_storeName, data);
    }

    _locaDatabaseActions.push(data);
  }

  /**
   * Add transaction to the transactions
   * @param {Int} versionNumber
   * @param {Object} data
   * @param {String} operation
   */
  function _addTransaction (versionNumber, data, operation) {
    if (!_transactions[versionNumber]) {
      return;
    }

    _transactions[versionNumber].push([versionNumber, data, operation]);
  }

  /**
   * Complete current object with join values
   * @param {Object} value
   */
  function _setJoinValues (value) {
    if (!_joins.length) {
      return;
    }

    var _joinValues = {};
    for (var i = 0; i < _joins.length; i++) {
      var _collection = _joinsDescriptor.collections[_joins[i]];
      if (_collection) {
        _joinValues[_joins[i]] = _collection.getAll();
      }
      else {
        _joinValues[_joins[i]] = null;
      }
    }

    _joinsDescriptor.joinFns.set(value, _joinValues, aggregates, lunarisExports.constants, logger);
  }

  /**
   * Complete current object with referenced object
   * @param {Object} value
   */
  function _setReferencedValues (value) {
    if (!_references.length) {
      return;
    }

    for (var _reference in _referencesDescriptor.references) {
      var _store =_referencesDescriptor.references[_reference];
      var _ids   = _referencesDescriptor.referencesFn.get[_reference](value);

      if (!_indexes.references[_store]) {
        _indexes.references[_store] = {};
      }

      for (var j = 0; j < _ids.length; j++) {
        if (!_indexes.references[_store][_ids[j]]) {
          _indexes.references[_store][_ids[j]] = [];
        }

        if (_indexes.references[_store][_ids[j]].indexOf(value._id) === -1) {
          _indexes.references[_store][_ids[j]].push(value._id);
        }
      }
    }
  }

  /**
   * Update references index
   * @param {Object} value
   */
  function _updateReferencesIndex (value) {
    if (!_references.length) {
      return;
    }

    for (var _reference in _referencesDescriptor.references) {
      var _store =_referencesDescriptor.references[_reference];
      var _ids   = _referencesDescriptor.referencesFn.get[_reference](value);

      if (!_indexes.references[_store]) {
        _indexes.references[_store] = [[], []];
      }

      for (var j = 0; j < _ids.length; j++) {
        if (!_indexes.references[_store][_ids[j]]) {
          continue;
        }

        var _searchIndex = _indexes.references[_store][_ids[j]].indexOf(value._id);

        if (_searchIndex === -1) {
          continue;
        }

        _indexes.references[_store][_ids[j]].splice(_searchIndex, 1);

        if (!_indexes.references[_store][_ids[j]].length) {
          _indexes.references[_store][_ids[j]] = null;
        }
      }
    }
  }

  /**
   * Build data cache index
   */
  function _buildIndexes () {
    var _iterator = 0;
    for (var i = 0, len = _data.length; i < len; i++) {
      var _item = _data[i];
      if (_item._version.length > 1) {
        continue;
      }
      _dataCacheIndex[_item._id] = _iterator;
      _iterator++;

      if (_getPrimaryKey) {
        var _pk = _getPrimaryKey(_item);
        _idIndex[_pk] = _item._id;
      }

      _setReferencedValues(_item);
    }
  }
  /**
   * build data cache
   */
  function _buildDataCache () {
    _dataCache = [];

    for (var _id in _dataCacheIndex) {
      if (_dataCacheIndex[_id] != null) {
        _dataCache.push(_data[_dataCacheIndex[_id]]);
      }
    }
  }

  /**
   * Add value to the array of collection values and set the index id
   * @param {Object} value
   * @param {Int} versionNumber
   * @param {Boolean} isFromUpsert
   * @param {Boolean} isFromIndex
   */
  function _addToValues (value, versionNumber, isFromUpsert, isFromIndex) {
    if (value._id  && isFromUpsert) {
      if (_getPrimaryKey) {
        var _id = _getPrimaryKey(value);
        if (_id !== null && _id !== undefined) {
          var _search        = _idIndex[_id];
          if (_search == null) {
            _idIndex[_id] = value._id;
          }
        }
      }
      value._rowId = _currentRowId++;
      _setReferencedValues(value);
      if (_aggregateFn) {
        _aggregateFn(value, aggregates, lunarisExports.constants, logger);
      }
      _addActionToLocalDatabase(localDatabase.upsert, value);
      _dataCacheIndex[value._id] = _data.length;
      return _data.push(value);
    }

    value._id = _currentId;
    _currentId++;

    _setReferencedValues(value);
    _setJoinValues(value);
    if (_aggregateFn) {
      _aggregateFn(value, aggregates, lunarisExports.constants, logger);
    }

    if (isFromIndex || !_getPrimaryKey) {
      value._rowId = _currentRowId++;
      _addActionToLocalDatabase(localDatabase.upsert, value);
      _dataCacheIndex[value._id] = _data.length;
      return _data.push(value);
    }

    _id = _getPrimaryKey(value);
    if (!(_id !== null && value._id !== undefined)) {
      value._rowId = _currentRowId++;
      _addActionToLocalDatabase(localDatabase.upsert, value);
      _dataCacheIndex[value._id] = _data.length;
      return _data.push(value);
    }

    _search = _idIndex[_id];
    // We upsert the last version of the object
    if (_search != null) {
      value._id    = _idIndex[_id];
      value._rowId = _currentRowId;
      upsert(value, versionNumber, false, true);
      return;
    }

    _idIndex[_id] = value._id;
    _dataCacheIndex[value._id] = _data.length;
    value._rowId = _currentRowId++;
    _data.push(value);
    _addActionToLocalDatabase(localDatabase.upsert, value);
  }

  /**
   * Remove a value from the id index
   * @param {Int} _id
   * @param {Int} id
   */
  function _removeFromIndex (_id, id) {
    var _search = _idIndex[id];

    if (_search != null) {
      _idIndex[id] = null;
    }
  }

  /**
   * Add some values to the collection
   * @param {*} values
   * @param {Int} versionNumber force versionNumber (must call begin() first)
   * @returns {Object} inserted value
   */
  function add (value, versionNumber, isFromUpsert, isFromIndex) {
    if (value === undefined || value === null || typeof value !== 'object') {
      throw new Error('add must have a value. It must be an Object.');
    }

    if (versionNumber && !_isTransactionCommit) {
      _addTransaction(versionNumber, value, OPERATIONS.INSERT);
      return;
    }

    if (_computedsFn) {
      _computedsFn(value, lunarisExports.constants, logger);
    }

    value._version = [versionNumber || currentVersionNumber];
    if (!_isTransactionCommit) {
      incrementVersionNumber();
    }

    _addToValues(value, versionNumber, isFromUpsert, isFromIndex);

    if (!_isTransactionCommit) {
      _buildDataCache();
    }

    return value;
  }

  /**
   * Update an item
   * @param {*} value
   * @param {Int} versionNumber force versionNumber (must call begin() first)
   * @param {Boolean} isRemove
   * @param {Boolean} isFromIndex
   * @returns {Object} inserted / updated value
   */
  function upsert (value, versionNumber, isRemove, isFromIndex) {
    if ((value._id === null || value._id === undefined) && !isRemove) {
      return add(value, versionNumber);
    }

    if (versionNumber && !_isTransactionCommit) {
      _addTransaction(versionNumber, value, OPERATIONS.UPDATE, isFromIndex);
      return;
    }

    var _search = _dataCacheIndex[value._id];

    if (_search == null) {
      if (isRemove) {
        return;
      }

      return add(value, _transactionVersionNumber ? _transactionVersionNumber : null, true);
    }

    var _version      = _transactionVersionNumber || currentVersionNumber;
    var _dataObject   = _data[_search];
    var _lowerVersion = _dataObject._version[0];
    var _upperVersion = _dataObject._version[1] || _version;

    var _objToUpdate        = cloneFn(value);
    _dataObject._version[1] = _version;
    _updateReferencesIndex(_dataObject);

    //  During the same transaction :
    //   - If insert / update : the updated row will be merged with the inserted one
    //   - If Insert / delete : the inserted row will be removed
    if (_lowerVersion === _version && _upperVersion === _version && _dataObject._version[1] >= 0) {
      if (isRemove) {
        _addActionToLocalDatabase(localDatabase.upsert, _dataObject);
        _dataCacheIndex[value._id] = null;
        return;
      }
      utils.merge(_dataObject, _objToUpdate);
      _dataObject._version.pop();
      _addActionToLocalDatabase(localDatabase.upsert, _dataObject);
      return _dataObject;
    }
    else {
      _addActionToLocalDatabase(localDatabase.upsert, _dataObject);
    }

    if (!isRemove) {
      return add(_objToUpdate, _transactionVersionNumber ? _transactionVersionNumber : null, true, isFromIndex);
    }

    _dataCacheIndex[value._id] = null;

    if (!_isTransactionCommit) {
      _buildDataCache();
    }

    return _dataObject;
  }

  /**
   * Clear the collection
   */
  function clear () {
    _data               = [];
    _currentId          = 1;
    _currentRowId       = 1;
    _idIndex            = {};
    _indexes.references = {};
    _dataCache          = [];
    _dataCacheIndex     = {};
  }

  /**
   * Remove an item with the given id / value
   * @param {Object} value
   * @param {Int} versionNumber force versionNumber (must call begin() first)
   * @param {Boolean} isPK is primaryKey
   */
  function remove (value, versionNumber, isPK) {
    if (versionNumber && !_isTransactionCommit) {
      _addTransaction(versionNumber, { value : value, isPK : !!isPK }, OPERATIONS.DELETE);
      return;
    }

    if (_getPrimaryKey && !isPK) {
      var _obj = get(value._id);
      if (_obj) {
        _removeFromIndex(value._id, _getPrimaryKey(_obj));
      }
    }
    else if (_getPrimaryKey && isPK) {
      var _pk     = _getPrimaryKey(value);
      var _search = _idIndex[_pk];

      if (_search != null) {
        value._id     = _search;
        _idIndex[_pk] = null;
      }
    }

    return upsert({ _id : value._id }, versionNumber, true);
  }

  /**
   * Get a specific item
   * @param {Int} id
   * @param {Booelan} isPrimaryKey
   */
  function get (id, isPrimaryKey) {
    if (isPrimaryKey) {
      if (_idIndex[id] == null) {
        return null;
      }

      id = _idIndex[id];
    }

    if (_dataCacheIndex[id] == null) {
      return null;
    }

    return _data[_dataCacheIndex[id]];
  }

  /**
   * Get first item
   * @param {Int} id
   */
  function getFirst () {
    if (!_data[0]) {
      return undefined;
    }
    return get(_data[0]._id);
  }

  /**
   * Rollback items to the corresponding version number
   * @param {Int} versionNumber
   */
  function rollback (versionNumber) {
    var _transaction = _transactions[versionNumber];
    if (!_transaction) {
      return;
    }

    versionNumber = _transaction;

    var _objToRollback = [];
    for (var i = _data.length - 1; i >= 0; i--) {
      var _lowerVersion = _data[i]._version[0];
      var _upperVersion = _data[i]._version[1];
      if (
        (versionNumber === _upperVersion)
        ||
        (versionNumber === _lowerVersion && !_upperVersion)
      ) {
        _objToRollback.push(cloneFn(_data[i]));
      }
    }

    var _version = begin();
    for (var j = 0; j < _objToRollback.length; j++) {
      // Item added and removed in the same transaction
      if (_objToRollback[j]._version[0] === _objToRollback[j]._version[1]) {
        continue;
      }

      if (_objToRollback[j]._version[1]) {
        add(_objToRollback[j], _version);
      }
      else {
        remove({ _id : _objToRollback[j]._id }, _version, false);
      }
    }
    return _internalCommit(_version);
  }

  /**
   * Begin the collection transaction
   */
  function begin () {
    _transactions[currentVersionNumber] = [];
    _locaDatabaseActions                = [];
    return currentVersionNumber;
  }

  /**
   * Commit the transaction version number
   * @param {Int} versionNumber
   */
  function commit (versionNumber) {
    var _res = _internalCommit(versionNumber);
    if (_isStoreObject) {
      if (_res.length) {
        return _res[0];
      }

      return null;
    }

    return _res;
  }

  /**
   * Commit the transaction version number
   * @param {Int} versionNumber
   */
  function _internalCommit (versionNumber) {
    var _res         = [];
    var _transaction = _transactions[versionNumber];
    if (!_transaction) {
      return;
    }

    _isTransactionCommit      = true;
    _transactionVersionNumber = currentVersionNumber;

    for (var i = 0; i < _transaction.length; i++) {
      if (_transaction[i][2] === OPERATIONS.INSERT) {
        _res.push(add(_transaction[i][1], null, true));
      }
      else if (_transaction[i][2] === OPERATIONS.UPDATE) {
        _res.push(upsert(_transaction[i][1]));
      }
      else {
        var _remove = remove(_transaction[i][1].value, null, _transaction[i][1].isPK);
        // The _id can be unedfined
        if (_remove) {
          _res.push(_remove);
        }
      }
    }

    if (_locaDatabaseActions.length) {
      localDatabase.upsert(_storeName, _locaDatabaseActions);
      _locaDatabaseActions = [];
    }

    _transactions[versionNumber] = _transactionVersionNumber;
    _isTransactionCommit         = false;
    _transactionVersionNumber    = null;
    incrementVersionNumber();
    _buildDataCache();
    return cloneFn(_res);
  }

  /**
   * Propagate operation from joins
   * @param {String} store
   * @param {Object/Array} data object to delete or insert
   * @param {String} operation
   */
  function propagate (store, data, operation) {
    if (!_joinsDescriptor.joinFns[store]) {
      return;
    }

    if (data && !Array.isArray(data)) {
      data = [data];
    }

    /**
     * Update current object joins
     * @param {Object} object
     * @param {Object} data
     * @param {String} operation
     */
    function _updateObject (object, data, operation) {
      // For INSERT, we cannot garantie that the store will propagate multiple times an INSERT
      // Only the collection has a sytem to avoid duplicate values (based on primary key values)
      if (operation === OPERATIONS.INSERT || operation === OPERATIONS.UPDATE) {
        _joinsDescriptor.joinFns[store].delete(object, data, aggregates, lunarisExports.constants, logger);
        return _joinsDescriptor.joinFns[store].insert(object, data, aggregates, lunarisExports.constants, logger);
      }
      else if (operation === OPERATIONS.DELETE) {
        return _joinsDescriptor.joinFns[store].delete(object, data, aggregates, lunarisExports.constants, logger);
      }
    }

    var _version = begin();
    for (var i = 0; i < _data.length; i++) {
      var _item         = _data[i];
      var _lowerVersion = _item._version[0];
      var _upperVersion = _item._version[1];
      if (_lowerVersion <= currentVersionNumber && !_upperVersion) {
        // Remember, we cannot directly edit a value from the collection (clone)
        var _obj = cloneFn(_item);
        if (data && data.length) {
          for (var j = 0; j < data.length; j++) {
            _obj = _updateObject(_obj, data[j], operation);
          }
        }
        else {
          _obj = _updateObject(_obj, null, operation);
        }

        upsert(_obj, _version);
      }
    }

    return _internalCommit(_version);
  }

  /**
   * Propagate reference operations
   * @param {String} store
   * @param {String/int} lastPK
   * @param {String/int} newPK
   */
  function replaceReferences (store, lastPK, newPK) {
    if (!_referencesDescriptor.referencesFn) {
      return [];
    }

    if (!_indexes.references[store]) {
      return [];
    }

    if (!_indexes.references[store][lastPK]) {
      return [];
    }

    var _version = begin();
    var _index   = _indexes.references[store][lastPK];

    for (var i = 0; i < _data.length; i++) {
      var _item         = _data[i];
      var _lowerVersion = _item._version[0];
      var _upperVersion = _item._version[1];

      if (_lowerVersion <= currentVersionNumber && !_upperVersion && _index.indexOf(_item._id) !== -1) {
        // Remember, we cannot directly edit a value from the collection (clone)
        var _obj = cloneFn(_item);
        for (var path in _referencesDescriptor.references) {
          _referencesDescriptor.referencesFn.update[path](
            lastPK,
            newPK,
            _obj
          );
        }

        upsert(_obj, _version);
      }
    }

    return _internalCommit(_version);
  }

  return {
    get               : get,
    add               : add,
    upsert            : upsert,
    remove            : remove,
    clear             : clear,
    getFirst          : getFirst,
    begin             : begin,
    commit            : commit,
    rollback          : rollback,
    propagate         : propagate,
    replaceReferences : replaceReferences,

    getIndexId : function () {
      return _idIndex;
    },

    getIndexReferences : function () {
      return _indexes.references;
    },

    getIndexDataCache : function () {
      return _dataCacheIndex;
    },

    /**
     * Remove index id value
     * - when offline, the PK is generted from _id
     * - the collection ensures to not duplicate PK
     */
    removeIndexIdValue : function (key) {
      if (key == null) {
        return;
      }

      _removeFromIndex(key, '_' + key);
    },

    /**
     * Get all items in the collection
     * only for tests
     */
    _getAll : function () {
      return _data;
    },

    /**
     * Get all items in the collection available for list
     * only for tests
     */
    _getAllCache : function () {
      return _dataCache;
    },

    /**
     * Set data values
     * @param {Array} value
     */
    setData : function (value) {
      _data = value;
      _buildIndexes();
      _buildDataCache();
    },

    /**
     * Get all valid items in the collection
     * only for tests
     * @param {Array} ids
     */
    getAll : function (ids, isPK, isClone) {
      var _res = [];

      if (ids == null) {
        _res = _dataCache;
      }
      else {
        for (var i = 0; i < ids.length; i++) {
          var _id = ids[i];
          if (!isPK) {
            var _search = _dataCacheIndex[_id];

            if (_search != null) {
              _res.push(_data[_search]);
            }
            continue;
          }

          _search =  _idIndex[_id];
          if (_search == null) {
            continue;
          }

          _res.push(_data[_dataCacheIndex[_search]]);
        }
      }

      if (_isStoreObject) {
        _res = _res.length ? _res[0] : null;
      }

      if (isClone === false) {
        return _res;
      }

      return cloneFn(_res);
    },

    /**
     * Get current id
     */
    getCurrentId : function () {
      return _currentId;
    },

    /**
     * Set current row id
     * @param {Int} value
     */
    setCurrentId : function setCurrentId (value) {
      _currentId = value;
    },

    /**
     * Get current version number
     */
    getCurrentVersionNumber : function () {
      return currentVersionNumber;
    },

    /**
     * Get current row id
     */
    getCurrentRowId : function getCurrentRowId () {
      return _currentRowId;
    },

    /**
     * Set current row id
     * @param {Int} value
     */
    setCurrentRowId : function setRowId (value) {
      _currentRowId = value;
    }
  };
}

/**
 * Reset current version number
 */
function resetVersionNumber () {
  currentVersionNumber = 1;
  localStorage.set('lunaris:versionNumber', 1);
}

lu_e['collection'] = collection;
lu_e['resetVersionNumber'] = resetVersionNumber;

        
        return lu_e;
      })([_utils_js,_store_store_aggregate_js,_exports_js,_logger_js,_localStorageDriver_js], {});
    
      var _offline_js = (function(lu_i, lu_e) {
        var isOnline        = true;  // detect if browser is online or offline
var isOfflineMode   = false; // is offline mode enabled ? invalidations are recived but not propagated
var isSynchronizing = false; // is synchronizing ?

if (typeof navigator !== 'undefined') {
  isOnline = navigator.onLine !== undefined ? navigator.onLine : true;

  window.addEventListener('online', function () {
    isOnline = true;
  });
  window.addEventListener('offline', function () {
    isOnline = false;
  });
}

lu_e = {
  /**
   * If isOfflineMode is true, offline = false even if we are really online
   */
  get isOnline () {
    if (isOfflineMode) {
      return false;
    }

    return isOnline;
  },
  get isRealOnline () {
    return isOnline;
  },
  set isOnline (value) {
    isOnline = value;
  },
  get isOfflineMode () {
    return isOfflineMode;
  },
  set isOfflineMode (value) {
    isOfflineMode = value;
  },
  get isSynchronizing () {
    return isSynchronizing;
  },
  set isSynchronizing (value) {
    isSynchronizing = value;
  }
};

        
        return lu_e;
      })([], {});
    
      var _store_crud_crudUtils_js = (function(lu_i, lu_e) {
        var storeUtils = lu_i[0];
var hook       = lu_i[1];
var utils      = lu_i[2];
var queue      = utils.queue;

/**
 * Before action :
 *  - check args
 * @param {String} store
 * @param {Array/Object} value
 * @param {Boolean} isNoValue
 * @returns {Object} {
 *   value,
 *   store,
 *   collection
 * }
 */
function beforeAction (store, value, isNoValue) {
  storeUtils.checkArgs(store, value, isNoValue);

  var _store      = storeUtils.getStore(store);
  var _collection = storeUtils.getCollection(_store);

  if (!isNoValue) {
    value = _store.clone(value);
  }

  return {
    value      : value,
    store      : _store,
    collection : _collection
  };
}

/**
 * After action : freeze values
 * @param {Object} store
 * @param {String} event
 * @param {Object/Array} value
 * @param {String} message
 * @param {Int} transactionId
 */
function afterAction (store, event, value, message, callback) {
  var _value = null;
  if (value) {
    _value = utils.cloneAndFreeze(value, store.clone);
  }

  hook.pushToHandlers(store, event, _value, function () {
    if (message) {
      return hook.pushToHandlers(store, 'success', message, callback);
    }

    callback();
  });
}

/**
 * Push commit res objects to handlers
 * @param {Object} store
 * @param {String} hookKey
 * @param {Array} res
 * @param {Int} transactionId
 */
function pushCommitResToHandlers (store, hookKey, res, callback) {
  if (res && res.length) {
    if (store.isStoreObject) {
      res = res[0];
    }
    res = utils.cloneAndFreeze(res, store.clone);
    return hook.pushToHandlers(store, hookKey, res, callback);
  }

  callback();
}

/**
 * Propagate store actions to the dependent stores (joins)
 * @param {Object} store
 * @param {Object} data
 * @param {String} operation
 * @param {Int} transactionId
 */
function propagate (store, data, operation, callback) {
  if (!store.storesToPropagate.length) {
    return callback();
  }

  if ((!data && operation !== utils.OPERATIONS.DELETE) || (data && Array.isArray(data) && !data.length)) {
    return callback();
  }

  queue(store.storesToPropagate, function (storeToPropagate, next) {
    var _store            = storeUtils.getStore('@' + storeToPropagate);
    var _collection       = storeUtils.getCollection(_store);
    var _res              = _collection.propagate(store.name, data, operation);
    pushCommitResToHandlers(_store, 'update', _res, next);
  }, callback);
}

/**
 * Propagate references to the dependent stores (joins)
 * @param {Object} store
 * @param {Array} primaryKeys [ [oldPk, newPk], ... ]
 * @param {Int} transactionId
 */
function propagateReferences (store, primaryKeys, callback) {
  if (!store.storesToPropagateReferences || !store.storesToPropagateReferences.length) {
    return callback();
  }

  queue(store.storesToPropagateReferences, function (storeToPropagate, next) {
    var _store            = storeUtils.getStore('@' + storeToPropagate);
    var _collection       = storeUtils.getCollection(_store);
    var _res              = [];
    for (var i = 0; i < primaryKeys.length; i++) {
      _res = _res.concat(_collection.replaceReferences(store.name, primaryKeys[i][0], primaryKeys[i][1]));
    }

    pushCommitResToHandlers(_store, 'update', _res, next);
  }, callback);
}

lu_e['beforeAction'] = beforeAction;
lu_e['afterAction'] = afterAction;
lu_e['pushCommitResToHandlers'] = pushCommitResToHandlers;
lu_e['propagate'] = propagate;
lu_e['propagateReferences'] = propagateReferences;

        
        return lu_e;
      })([_store_store_utils_js,_store_store_hook_js,_utils_js], {});
    
      var _cache_js = (function(lu_i, lu_e) {
        /**
 * The cache architecture is :
 * [
 *   {
 *     hash   : hash,
 *     values    : [values],
 *     stores : [store1, storeN]
 *   },
 *   ...
 * ]
 */

var logger             = lu_i[0];
var localStorageDriver = lu_i[1];
var database           = localStorageDriver.indexedDB;
var cacheGraph         = lu_i[2].cacheGraph;
var offline            = lu_i[3];

// https://stackoverflow.com/questions/7837456/how-to-compare-arrays-in-javascript/14853974
Array.prototype.equals = function (array) {
  // if the other array is a falsy value, return
  if (!array) {
    return false;
  }

  // compare lengths - can save a lot of time
  if (this.length !== array.length) {
    return false;
  }

  for (var i = 0, l = this.length; i < l; i++) {
    // Check if we have nested arrays
    if (this[i] instanceof Array && array[i] instanceof Array) {
      // recurse into the nested arrays
      if (!this[i].equals(array[i])) {
        return false;
      }
    }
    else if (this[i] !== array[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false;
    }
  }
  return true;
};

var cache = [];

/**
 * @param {String} store
 * @param {String} hash route hashed
 * @param {Array} values [int]
 */
function _getOrUpdatevalues (store, hash, values) {
  var _cacheValue = null;
  for (var i = 0; i < cache.length; i++) {
    var _isFilterMatchValue = false;

    if (cache[i].hash === hash) {
      _isFilterMatchValue = true;
      _cacheValue = cache[i];
      break;
    }
  }

  if (_isFilterMatchValue && !values) {
    return _cacheValue.values;
  }
  if (_isFilterMatchValue && values) {
    if (_cacheValue.stores.indexOf(store) === -1) {
      _cacheValue.stores.push(store);
      if (offline.isOnline) {
        database.upsert('cache', _cacheValue);
      }
    }

    return _cacheValue.values = values;
  }

  return _cacheValue;
}

/**
 * Invalidate a store's cache
 */
function _internalInvalidate (store) {
  for (var i = cache.length - 1; i >= 0; i--) {
    if (cache[i].stores.indexOf(store) !== -1) {
      database.del('cache', cache[i].hash);
      cache.splice(i, 1);
    }
  }
}

/**
 * Cache object
 * @return {Object}
 */
lu_e = {

  /**
   * Init cache values from browser db
   * @param {Function} callback
   */
  init : function (callback) {
    database.getAll('cache', function (err, res) {
      if (err) {
        logger.warn('Error when init cache', err);
      }

      cache = res || [];
      callback();
    });
  },

  /**
   * Add values to cache
   * @param {String} store
   * @param {String} hash route hashed
   * @param {Array} values [object]
   */
  add : function (store, hash, values) {
    var _res = _getOrUpdatevalues(store, hash, values);

    if (!_res) {
      var _caheObj = {
        hash   : hash,
        values : values,
        stores : [store]
      };

      cache.push(_caheObj);

      if (offline.isOnline) {
        database.upsert('cache', _caheObj);
      }
    }
  },

  get : _getOrUpdatevalues,

  /**
   * Invalidate one or many values for a store
   * @param {String} store
   */
  invalidate : function invalidate (store) {
    store = store.replace(/^@/, '');

    _internalInvalidate(store);
    var _aliasStores = cacheGraph[store];

    if (!_aliasStores) {
      return;
    }

    for (var i = 0; i < _aliasStores.length; i++) {
      _internalInvalidate(_aliasStores[i]);
    }
  },

  /**
   * Clear cache values
   */
  clear : function () {
    database.clear('cache');
    cache = [];
  },

  /**
   * Return cache values. Uniquely for tests purposes
   */
  _cache : function () {
    return cache;
  }
};

        
        return lu_e;
      })([_logger_js,_localStorageDriver_js,_exports_js,_offline_js], {});
    
      var _store_store_transaction_js = (function(lu_i, lu_e) {
        var exportsLunaris = lu_i[0];
var logger         = lu_i[1];

/**
 * Begin a store transaction
 * @return {Function} rollback
 */
function begin () {
  return logger.deprecated('lunaris.begin has been removed!');
}

/**
 * Commit a transaction
 * @param {Function} callback
 */
function commit (callback) {
  return logger.deprecated('lunaris.commit has been removed!');
}

lu_e = {
  begin  : begin,
  commit : commit
};

        
        return lu_e;
      })([_exports_js,_logger_js], {});
    
      var _http_js = (function(lu_i, lu_e) {
        var lunarisExports = lu_i[0];
var utils          = lu_i[1];

var baseOptions = {
  onComplete : null
};

function setup (options) {
  baseOptions = utils.merge(baseOptions, options);
}

/**
 * Make HTTP request
 * @param {String} store
 * @param {String} method
 * @param {Object} body
 * @param {Function} callback
 * @param {Options} { 'Content-Type', store : '@store' }
 */
function request (method, request, body, callback, options) {
  var _body               = body;
  var _defaultContentType = 'application/json';
  var _headers            = {
    'Client-Version' : 2
  };

  options = options || {};
  _headers['Content-Type'] = options['Content-Type'] || _defaultContentType;

  // for server to detect dump request
  if (options['isOffline']) {
    _headers['Is-Offline'] = options['isOffline'];
  }

  if (_headers['Content-Type'] === _defaultContentType && body) {
    _body = JSON.stringify(body);

    if (lunarisExports.isProduction) {
      _headers['Content-Encoding'] = 'gzip';
      _body                        = pako.gzip(_body);
    }
  }

  fetch(lunarisExports.baseUrl + request, {
    method      : method,
    credentials : 'same-origin',
    headers     : _headers,
    body        : _body
  }).then(function (response) {
    if (response.status !== 200) {
      return Promise.reject({ error : response.status, message : response.statusText, errors : [] });
    }

    // IE does not have window.origin
    if (!window.origin) {
      window.origin = '';
    }

    // Redirection
    if (decodeURIComponent(response.url).indexOf(decodeURIComponent(request)) === -1) {
      return window.location = response.url;
    }

    if (baseOptions.onComplete) {
      baseOptions.onComplete(response);
    }

    return response.json();
  }).then(function (json) {
    if (json.success === false) {
      return callback({ error : json.error, message : json.message, errors : json.errors });
    }
    callback(null, json.data);
  }).catch(function (err) {
    callback(err);
  });
}

lu_e['request'] = request;
lu_e['setup'] = setup;

        
        return lu_e;
      })([_exports_js,_utils_js], {});
    
      var _store_store_url_js = (function(lu_i, lu_e) {
        var storeUtils     = lu_i[0];
var utils          = lu_i[1];
var logger         = lu_i[2];
var exportsLunaris = lu_i[3];
var offline        = lu_i[4];

// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/encodeURIComponent
function fixedEncodeURIComponent (str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

/**
 * Filter source value
 * @param {Function} whereFn
 * @param {Object} item
 * @returns {Boolean}
 */
function _runWhereCondition (whereFn, item) {
  if (typeof whereFn !== 'function') {
    logger.tip('A filter where must be a function : filter.sourceWhere = function (item) { return Boolean }.');
    return false;
  }

  var _res = whereFn.call(null, item, exportsLunaris.constants);
  if (typeof _res !== 'boolean') {
    logger.tip('A filter where must return a boolean.');
    return false;
  }

  return _res;
}

/**
* Get required params for HTTP request
* @param {Object} store
* @param {Sting} method
* @returns {object} {
*  isRequiredOptionsFilled    : {Boolean}
*  constructedRequiredOptions : {String}
*  requiredOptions            : {Object} { <source:attribute:operator> : {Array} }
*  optionalOptions            : {Object} { <source:attribute:operator> : {Array} }
*  cache                      : {Object}
* }
*/
function _getFilterValuesHTTPRequest (store, method) {
  var _filterValues            = {
    isRequiredOptionsFilled     : true,
    constructedRequiredOptions  : '',
    requiredOptions             : {},
    optionalOptions             : {},
    optionalUnsearchableOptions : {},
    cache                       : {}
  };
  var _nbRequiredFIlters       = 0;
  var _nbRequiredFilledFilters = 0;
  if (!store.filters.length) {
    return _filterValues;
  }

  for (var i = 0; i < store.filters.length; i++) {
    var _filter = store.filters[i];
    var _value  = [];

    if (!offline.isOnline && _filter.isOffline === false) {
      continue;
    }

    var _sourceStore = storeUtils.getStore(_filter.source);
    var _sourceValue = storeUtils.getCollection(_sourceStore).getAll();
    if (_sourceValue && !Array.isArray(_sourceValue)) {
      _sourceValue = [_sourceValue];
    }
    else if (!_sourceValue) {
      _sourceValue = [];
    }
    var _methods = [];
    if (_filter.httpMethods) {
      if (Array.isArray(_filter.httpMethods)) {
        _methods = _filter.httpMethods;
      }
    }
    else {
      _methods.push(method);
    }

    if (_filter.isRequired && _methods.indexOf(method) !== -1) {
      _nbRequiredFIlters++;
    }

    var _operator = _filter.operator;

    //if (!_sourceStore.isStoreObject) {
    //  _operator = 'ILIKE';
      // if (_filter.operator && _filter.operator !== 'ILIKE') {
      //   throw new Error('Array filter must declare ILIKE operator or nothing!');
      // }
    //}

    for (var j = _sourceValue.length - 1; j >= 0; j--) {
      if (!_filter.sourceWhere || (_filter.sourceWhere && _runWhereCondition(_filter.sourceWhere, _sourceValue[j]))) {
        _sourceValue[j] = _sourceValue[j][_filter.sourceAttribute];
      }
      else {
        _sourceValue.splice(j, 1);
      }
    }

    if (!_sourceValue.length) {
      _sourceValue = undefined;
    }

    if (_sourceStore.isStoreObject) {
      _sourceValue = _sourceValue ? _sourceValue[0] : undefined;
    }

    if (_sourceValue !== undefined) {
      var _filterKey = i;
      _value.push(_filter.attributeUrl, _filter.localAttribute, _sourceValue, _operator);

      if (_methods.indexOf(method) !== -1) {
        if (_filter.isRequired) {
          _nbRequiredFilledFilters++;
        }

        if (_filter.isSearchable === false) {
          _filterValues.optionalUnsearchableOptions[_filterKey] = _value;
        }
        else if (_value[3] && !_filter.isRequired) {
          _filterValues.optionalOptions[_filterKey] = _value;
        }
        else {
          if (Array.isArray(_sourceValue)) {
            throw new Error('A required filter must be a store object!');
          }
          _filterValues.constructedRequiredOptions += '/' + (_value[0] || _value[1]) + '/' + fixedEncodeURIComponent(_value[2]);
          _filterValues.requiredOptions[_filterKey] = _value;
        }

        _filterValues.cache[_filterKey] = _value[2];
      }
    }
  }

  _filterValues.isRequiredOptionsFilled = _nbRequiredFIlters === _nbRequiredFilledFilters;
  return _filterValues;
}

/**
* Construct search options
* @param {Array} filterValues
*/
function _getSearchOption (filterValues) {
  var _search    = '';
  var _operators = utils.OPERATORS;
  for (var j = 0; j < filterValues.length; j++) {
    var _operator = utils.OPERATORS.ILIKE;
    if (filterValues[j][3]) {
      _operator = _operators[filterValues[j][3]] || _operator;
    }
    var _value = filterValues[j][2];
    if (Array.isArray(_value)) {
      _value    = '[' + _value.join(',') + ']';

      if (_operator === utils.OPERATORS['=']) {
        _operator = utils.OPERATORS.ILIKE;
      }
      if (_operator === utils.OPERATORS['<>']) {
        _operator = ':!';
      }

    }
    var _attribute = filterValues[j][0] || filterValues[j][1];
    _search       += (_attribute) + fixedEncodeURIComponent(_operator) + fixedEncodeURIComponent(_value) + fixedEncodeURIComponent('+');
  }
  _search = _search.slice(0, _search.length - fixedEncodeURIComponent('+').length);
  return ['search', _search];
}

function _getUnsearchableOption (filterValue) {
  var _value = filterValue[2];
  if (Array.isArray(_value)) {
    _value = '[' + _value.join(',') + ']';
  }

  _value         = fixedEncodeURIComponent(_value);
  var _attribute = filterValue[0] || filterValue[1];

  return [_attribute, _value];
}

/**
* Get and construct the url options
* @param {Object} store
* @param {Boolean} isPagination
* @returns {String} ?option=optionvalue&...
*/
function _getUrlOptionsForHTTPRequest (store, isPagination, filterValues) {
  var _optionsStr = '';
  var _options    = [];

  // Pagination
  if (isPagination) {
    var _limit  = store.paginationLimit;
    var _offset = store.paginationOffset;
    _options.push(['limit' , _limit]);
    _options.push(['offset', _offset]);
  }

  var _keys = Object.keys(filterValues.optionalUnsearchableOptions);
  for (var i = 0; i < _keys.length; i++) {
    _options.push(_getUnsearchableOption(filterValues.optionalUnsearchableOptions[_keys[i]]));
  }

  var _optionsSearchable = [];
  _keys                  = Object.keys(filterValues.optionalOptions);
  for (i = 0; i < _keys.length; i++) {
    _optionsSearchable.push(filterValues.optionalOptions[_keys[i]]);
  }
  if (_optionsSearchable.length) {
    _options.push(_getSearchOption(_optionsSearchable));
  }

  if (_options.length) {
    _optionsStr += '?';
  }
  for (var i = 0; i < _options.length; i++) {
    _optionsStr += _options[i][0] + '=' + _options[i][1] + '&';
  }

  _optionsStr = _optionsStr.slice(0, _optionsStr.length - 1);
  return _optionsStr;
}

/**
* Create URL for givens tore and action
* @param {Object} store
* @param {Boolean} isGET is GET HTTP method ?
* @param {*} primaryKeyValue
* @param {Boolean} isPagination
* @returns {Object} {
*  isRequiredOptionsFilled    : {Boolean}
*  constructedRequiredOptions : {String}
*  requiredOptions            : {Object} { <source:attribute:operator> : {Array} }
*  optionalOptions            : {Object} { <source:attribute:operator> : {Array} }
*  cache                      : {Object}
* }
*/
function createUrl (store, method, primaryKeyValue, isPagination) {
  var _request = { request : '/', cache : {} };
  var _isGet   = method === 'GET' && isPagination !== false;
  var _url     = store.url || store.name;

  _request.request += _url;

  if (primaryKeyValue !== undefined && primaryKeyValue !== null) {
    _request.request += '/' + primaryKeyValue;
  }

  if (_isGet) {
    _request.cache.limit  = store.paginationLimit;
    _request.cache.offset = store.paginationOffset;
  }

  var _filterValues  = _getFilterValuesHTTPRequest(store, method);

  if (!_filterValues.isRequiredOptionsFilled) {
    return null;
  }

  _request.request += _filterValues.constructedRequiredOptions;

  if (store.urlSuffix) {
    _request.request += '/' + store.urlSuffix;
    logger.deprecated('store.urlSuffix is deprecated. It will be removed!');
  }

  _request.request += _getUrlOptionsForHTTPRequest(store, _isGet, _filterValues);

  utils.merge(_request.cache, _filterValues.cache);
  _request.requiredOptions            = _filterValues.requiredOptions;
  _request.optionalOptions            = _filterValues.optionalOptions;
  _request.constructedRequiredOptions = _filterValues.constructedRequiredOptions;
  return _request;
}

/**
 * Generate get request from urlObj
 * @param {Object} store
 * @param {Object} cacheObj {
 *  isRequiredOptionsFilled    : {Boolean}
 *  constructedRequiredOptions : {String}
 *  requiredOptions            : {Object} { <source:attribute:operator> : {Array} }
 *  optionalOptions            : {Object} { <source:attribute:operator> : {Array} }
 *  cache                      : {Object}
 * }
 */
function generateRequest (store, urlObj) {
  var _request = '/';
  var _url     = store.url || store.name;

  _request += _url;
  _request += urlObj.constructedRequiredOptions;

  var _options = [];
  var _keys    = Object.keys(urlObj.optionalOptions);
  for (var i = 0; i < _keys.length; i++) {
    _options.push(urlObj.optionalOptions[_keys[i]]);
  }
  var _search = _getSearchOption(_options);
  _request += '?limit=' + urlObj.cache.limit + '&offset=' + urlObj.cache.offset + '&' + _search[0] + '=' + _search[1];

  return _request;
}

lu_e['create'] = createUrl;
lu_e['createForOffline'] = generateRequest;

        
        return lu_e;
      })([_store_store_utils_js,_utils_js,_logger_js,_exports_js,_offline_js], {});
    
      var _store_store_template_js = (function(lu_i, lu_e) {
        /**
 * Replace words in given template
 * @param {Object} store
 * @param {String} method
 * @param {String} methodFemale
 * @param {String} template
 * @param {Boolean} isPlural
 * @returns {String}
 */
function _replaceTemplateWords (store, method, methodFemale, template, isPlural) {
  return template
    .replace('$methodFemale' , methodFemale)
    .replace('$method'       , method)
    .replace('$storeName'    , store.nameTranslated || store.name)
    .replace('$pronounMale'  , isPlural ? '${thePlural}' : '${the}')
    .replace('$pronounFemale', isPlural ? '${thePlural}' : '${theFemale}')
  ;
}

/**
 * Construct error template
 * @param {Object} err
 * @param {Object} store
 * @param {String} method
 * @param {Boolean} isPlural
 * @returns {String}
 */
function getError (err, store, method, isPlural, is) {
  if (!store.errorTemplate) {
    return '${An error has occured}';
  }

  var _methods = {
    GET    : '${load}',
    PUT    : '${edit}',
    POST   : '${create}',
    DELETE : '${delete}'
  };
  var _methodsFemale = {
    GET    : '${loadFemale}',
    PUT    : '${editFemale}',
    POST   : '${createFemale}',
    DELETE : '${deleteFemale}'
  };

  return _replaceTemplateWords(store, _methods[method], _methodsFemale[method], store.errorTemplate, isPlural);
}

/**
 * Construct validation template
 * @param {String} message
 * @param {Object} store
 * @param {String} method
 * @param {Boolean} isPlural
 * @returns {String}
 */
function getSuccess (message, store, method, isPlural) {
  if (!store.successTemplate) {
    return message;
  }

  var _methods = {
    GET    : '${loaded}',
    PUT    : '${edited}',
    POST   : '${created}',
    DELETE : '${deleted}'
  };
  var _methodsFemale = {
    GET    : '${loadedFemale}',
    PUT    : '${editedFemale}',
    POST   : '${createdFemale}',
    DELETE : '${deletedFemale}'
  };

  return _replaceTemplateWords(store, _methods[method], _methodsFemale[method], store.successTemplate, isPlural);
}

lu_e['getSuccess'] = getSuccess;
lu_e['getError'] = getError;

        
        return lu_e;
      })([], {});
    
      var _store_store_synchronisation_js = (function(lu_i, lu_e) {
        var lunarisExports              = lu_i[0];
var hook                        = lu_i[1];
var utils                       = lu_i[2];
var storeUtils                  = lu_i[3];
var collection                  = lu_i[4];
var transaction                 = lu_i[5];
var cache                       = lu_i[6];
var indexedDB                   = lu_i[7].indexedDB;
var localStorage                = lu_i[8].localStorage;
var OPERATIONS                  = utils.OPERATIONS;
var offlineTransactions         = [];
var offlineTransactionsInError  = [];
var OFFLINE_STORE               = utils.offlineStore;
var isPushingOfflineTransaction = false;

var imports = {};

lunarisExports._stores.lunarisOfflineTransactions = {
  name                  : OFFLINE_STORE,
  data                  : collection.collection(null, null, null, null, null, OFFLINE_STORE, null, utils.clone),
  filters               : [],
  paginationLimit       : 50,
  paginationOffset      : 0,
  paginationCurrentPage : 1,
  hooks                 : {},
  isLocal               : true,
  storesToPropagate     : [],
  isStoreObject         : false,
  massOperations        : {},
  clone                 : utils.clone
};

/**
 * get an object from a store's collection
 * @param {String} storeName
 * @param {Int} _id
 * @returns {Object}
 */
function _getObjectFromCollection (storeName, _id) {
  var _collection = storeUtils.getCollection(storeUtils.getStore(storeName));

  if (!_collection) {
    return;
  }

  return _collection.get(_id);
}

/**
 * Update offline transaction data
 * When an object has been POST, we must update the data in next transactions operations
 * We only update stores that have references. Because, only references have an impact.
 * @param {Array} storesToUpdate ['store1', 'storeN']
 */
function updateOfflineTransactionData (storesToUpdate) {
  var _lengthStoresToUpdate = storesToUpdate.length;

  if (!_lengthStoresToUpdate) {
    return;
  }


  for (var i = 0, len = offlineTransactions.length; i < len; i++) {
    var _transaction = offlineTransactions[i];
    for (var j = 0; j < _lengthStoresToUpdate; j++)  {
      if (_transaction.store !== storesToUpdate[j]) {
        continue;
      }

      if (storesToUpdate.indexOf(_transaction.store) === -1) {
        continue;
      }

      if (Array.isArray(_transaction.data)) {
        for (var k = 0; k < _transaction.data.length; k++) {
          _transaction.data[k] = _getObjectFromCollection(storesToUpdate[j], _transaction.data[k]._id);
        }

        continue;
      }

      _transaction.data = _getObjectFromCollection(storesToUpdate[j], _transaction.data._id);
    }
  }
}

/**
 * Push dependent transaction in error to error array
 * @param {Array} storesToUpdate
 */
function _pushDependentTransactionsInError (storesToUpdate) {
  var _lengthStoresToUpdate = storesToUpdate.length;

  if (!_lengthStoresToUpdate) {
    return;
  }


  for (var i = offlineTransactions.length - 1; i >= 0; i--) {
    var _transaction = offlineTransactions[i];
    for (var j = 0; j < _lengthStoresToUpdate; j++)  {
      if (_transaction.store !== storesToUpdate[j]) {
        continue;
      }

      if (storesToUpdate.indexOf(_transaction.store) === -1) {
        continue;
      }

      indexedDB.del(OFFLINE_STORE, _transaction._id);
      offlineTransactionsInError.splice(1, 0, offlineTransactions.splice(i, 1)[0]);
    }
  }
}

/**
 * Save transaction in error in collection
 */
function _saveTransactionsInError () {
  var _collection = lunarisExports._stores.lunarisOfflineTransactions.data;

  var _version = _collection.begin();

  for (var j = 0; j < offlineTransactionsInError.length; j++) {
    _collection.remove(utils.clone(offlineTransactionsInError[j]), _version);
    delete offlineTransactionsInError[j]._id;
    offlineTransactionsInError[j].isInError = true;
    _collection.add(offlineTransactionsInError[j], _version);
  }
  _collection.commit(_version);
  offlineTransactionsInError = [];
  storeUtils.saveState(lunarisExports._stores.lunarisOfflineTransactions, _collection);
}

/**
 * Push offline HTTP transactions when online in queue
 * @param {Function} callback
 */
function pushOfflineHttpTransactions (callback) {
  offlineTransactions = lunarisExports._stores.lunarisOfflineTransactions.data.getAll();

  function _processNextOfflineTransaction () {
    var _currentTransaction = offlineTransactions.shift();

    if (!_currentTransaction) {
      isPushingOfflineTransaction = false;
      _saveTransactionsInError();
      localStorage.set(OFFLINE_STORE, new Date());
      return callback();
    }

    function onEnd (error) {
      cache.invalidate(_currentTransaction.store);
      // We must hold the transaction in error and its dependent transactions
      if (error) {
        offlineTransactionsInError.push(_currentTransaction);
        if (_currentTransaction.method === OPERATIONS.INSERT) {
          _pushDependentTransactionsInError(storeUtils.getStore(_currentTransaction.store).storesToPropagateReferences);
        }
        hook.pushToHandlers(lunarisExports._stores.lunarisOfflineTransactions, 'syncError');
      }
      else {
        hook.pushToHandlers(lunarisExports._stores.lunarisOfflineTransactions, 'syncSuccess');
      }

      lunarisExports._stores.lunarisOfflineTransactions.data.remove(_currentTransaction);
      hook.pushToHandlers(lunarisExports._stores.lunarisOfflineTransactions, 'delete', _currentTransaction);
      _processNextOfflineTransaction();
      // indexedDB.del(OFFLINE_STORE, _currentTransaction._id, _processNextOfflineTransaction);
    };

    if (_currentTransaction.method === OPERATIONS.INSERT || _currentTransaction.method === OPERATIONS.UPDATE) {
      imports.upsert(_currentTransaction.store, _currentTransaction.data, { isLocal : false, retryOptions : _currentTransaction }, onEnd);
    }
    else if (_currentTransaction.method === OPERATIONS.DELETE) {
      imports.deleteStore(_currentTransaction.store, _currentTransaction.data, { retryOptions : _currentTransaction }, onEnd);
    }
  }

  isPushingOfflineTransaction = true;
  _processNextOfflineTransaction();
}

/**
 * Compute offline HTTP transactions
 * POST / DELETE -> do nothing
 * PUT  / DELETE -> DELETE
 * PUT  / PUT    -> PUT
 * POST / PUT    -> POST
 * @param {Array} transactions
 * @param {String} storeName
 * @param {String} method ex: GET, POST, etc.
 * @param {String} request
 * @param {Array/Object} value
 */
function computeStoreTransactions (transactions, storeName, method, request, value) {
  var _mustBeAdded  = true;
  var _isArrayValue = Array.isArray(value);

  if (!_isArrayValue) {
    value = [value];
  }

  var _lengthValue = value.length;
  var _nbInInserts = 0;

  for (var j = _lengthValue - 1; j >= 0; j--) {
    for (var i = transactions.length - 1; i >= 0; i--) {
      var _transaction               = transactions[i];
      var _isTransactionValueAnArray = Array.isArray(_transaction.data);

      if (!_isTransactionValueAnArray) {
        _transaction.data = [_transaction.data];
      }

      var _lengthTransactionValue = _transaction.data.length;

      if (_transaction.store !== storeName) {
        if (!_isTransactionValueAnArray) {
          _transaction.data = _transaction.data[0];
        }
        continue;
      }

      for (var k = _lengthTransactionValue - 1; k >= 0; k--) {
        if (_transaction.method === OPERATIONS.INSERT && method === OPERATIONS.UPDATE) {
          if (value[j]._id !== _transaction.data[k]._id) {
            continue;
          }

          _transaction.data[k] = value[j];
          value.splice(j, 1);
          _nbInInserts++;

          if (!j && _nbInInserts === _lengthValue) {
            _mustBeAdded = false;
          }

          break;
        }

        if (_transaction.method === OPERATIONS.UPDATE && method === OPERATIONS.UPDATE) {
          if (value[j]._id !== _transaction.data[k]._id) {
            continue;
          }

          _transaction.data[k] = value[j];
          _mustBeAdded          = false;
          break;
        }
      }

      if (!_isTransactionValueAnArray) {
        _transaction.data = _transaction.data[0];
      }

      if (!value[j]) {
        break;
      }
    }
  }

  if (_mustBeAdded) {
    transactions.push({
      store  : storeName,
      method : method,
      url    : request,
      data   : _isArrayValue ? value : value[0],
      date   : Date.now()
    });
  }

  return transactions;
}

/**
 * Save Http transactions into a store
 * Make sure to compute actions before inserting in store
 * @param {String} storeName
 * @param {String} method
 * @param {String} request
 * @param {Object/Array} value
 */
function setOfflineHttpTransaction (storeName, method, request, value) {
  var _collection   = lunarisExports._stores.lunarisOfflineTransactions.data;
  var _transactions = _collection.getAll();

  imports._clear(OFFLINE_STORE, true);
  computeStoreTransactions(_transactions, storeName, method, request, value);

  var _version = _collection.begin();
  for (var i = 0; i < _transactions.length; i++) {
    delete _transactions[i]._id;
    _collection.add(_transactions[i], _version);
  }
  _collection.commit(_version);
  storeUtils.saveState(lunarisExports._stores.lunarisOfflineTransactions, _collection);
  hook.pushToHandlers(lunarisExports._stores.lunarisOfflineTransactions, 'insert');
}

/**
 * Get date of the last synchro
 * @returns {String}
 */
function getLastSyncDate () {
  return localStorage.get(OFFLINE_STORE);
}


lu_e = {
  get isPushingOfflineTransaction () {
    return isPushingOfflineTransaction;
  },
  OFFLINE_STORE                : OFFLINE_STORE,
  updateOfflineTransactionData : updateOfflineTransactionData,
  pushOfflineHttpTransactions  : pushOfflineHttpTransactions,
  computeStoreTransactions     : computeStoreTransactions,
  setOfflineHttpTransaction    : setOfflineHttpTransaction,
  getLastSyncDate              : getLastSyncDate,
  setImportFunction            : function setImportFunction (fn) {
    imports[fn.name] = fn;
  }
};

        
        return lu_e;
      })([_exports_js,_store_store_hook_js,_utils_js,_store_store_utils_js,_store_store_collection_js,_store_store_transaction_js,_cache_js,_localStorageDriver_js,_localStorageDriver_js], {});
    
      var _store_crud__lazyLoad_js = (function(lu_i, lu_e) {
        var utils          = lu_i[0];
var indexedDB      = lu_i[1].indexedDB;
var lunarisExports = lu_i[2];
var storeUtils     = lu_i[3];
var hooks          = lu_i[4];

/**
 * Register hooks for a store
 * @param {Object} store
 */
function registerStore (store) {
  // Register hooks
  var _watchedStores = [];
  for (i = 0; i < store.filters.length; i++) {
    var _handler = function (item) {
      store.paginationCurrentPage = 1;
      store.paginationOffset      = 0;
      hooks.pushToHandlers(store, 'reset');
    };

    var _filter = store.filters[i].source;
    if (_watchedStores.indexOf(_filter) === -1) {
      hooks.hook('filterUpdated' + _filter, _handler, false, true);
      hooks.hook('reset'         + _filter, _handler, false, true);

      _watchedStores.push(_filter);
      _filter = _filter.replace('@', '');
      lunarisExports._stores[_filter].isFilter = true;
    }
  }
}

function _loadDependentStores (store, callback)  {
  var _dependentStores = [];
  _dependentStores = _dependentStores.concat(store.storesToPropagate || []).concat(store.storesToPropagateReferences || []);

  utils.queue(_dependentStores, function (storeToLoad, next) {
    try {
      var _store = storeUtils.getStore('@' + storeToLoad);
    }
    catch (e) {
      return next();
    }

    if (_store.isInitialized) {
      return next();
    }

    load(_store, [next, null]);
  }, callback);
}


function _end (store, fnAndParams) {
  _loadDependentStores(store, function () {
    fnAndParams[0].apply(null, fnAndParams[1]);
  });
}

/**
 * Init a store
 * Internal use to lazy load stores
 * @param {Object} store
 * @param {Array} fnAndParams [function to call, parameters]
 * @param {Boolean} isRetry whenever to retry or not after an error
 */
function load (store, fnAndParams, isRetry) {
  if (!lunarisExports.isBrowser) {
    store.isInitialized = true;
    return _end(store, fnAndParams);
  }

  // Retrieve store state
  indexedDB.get('_states', store.name, function (err, state) {
    if (err) {
      if (isRetry) {
        lunaris.warn('lazy_load@' + store.name, err);
        return _end(store, fnAndParams);
      }

      store.isInitialized = true;
      return load(store, fnAndParams, true);
    }

    if (!state) {
      store.isInitialized = true;
      return _end(store, fnAndParams);
    }

    store.data.setCurrentId(state.collection.currentId);
    store.data.setCurrentRowId(state.collection.currentRowId);
    store.massOperations = state.massOperations;

    // Retrieve store collection data
    indexedDB.getAll(store.name, function (err, data) {
      if (err) {
        if (isRetry) {
          lunaris.logger.warn(['lazy_load@' + store.name, 'Error when retrieving store collection'], err);
          return _end(store, fnAndParams);
        }

        store.isInitialized = true;
        return load(store, fnAndParams, true);
      }

      utils.deleteRows(data);
      store.data.setData(data);
      store.isInitialized = true;

      _end(store, fnAndParams);
    });
  });
}

lu_e['load'] = load;
lu_e['register'] = registerStore;

        
        return lu_e;
      })([_utils_js,_localStorageDriver_js,_exports_js,_store_store_utils_js,_store_store_hook_js], {});
    
      var _store_crud_upsert_js = (function(lu_i, lu_e) {
        var logger      = lu_i[0];
var cache       = lu_i[1];
var utils       = lu_i[2];
var storeUtils  = lu_i[3];
var offline     = lu_i[4];
var transaction = lu_i[5];
var hook        = lu_i[6];
var crudUtils   = lu_i[7];
var http        = lu_i[8];
var url         = lu_i[9];
var template    = lu_i[10];
var sync        = lu_i[11];
var lazyLoad    = lu_i[12];
var OPERATIONS  = utils.OPERATIONS;

var imports = {};

sync.setImportFunction(upsert);

/**
 * Update collection index id value
 * When offline push, we must replace offline generated primary key by new one returned by server
 * @param {Object} collection
 * @param {Object} value
 * @returns {int/sting} old primary key
 */
function _updateCollectionIndexId (collection, value) {
  return collection.removeIndexIdValue(value._id);
}

/**
 * Upsert collection
 * @param {Object} store
 * @param {Object} collection
 * @param {*} value
 * @param {Int} version
 * @param {Boolean} isMultipleItems
 * @param {Boolean} isUpdate
 * @param {Array} pathParts
 * @param {String} request
 * @param {Boolean} isLocal
 * @param {Function} callback ({ version : Integer, value : Object/Array, request : String })
 */
function _upsertCollection (store, collection, value, version, isMultipleItems, isUpdate, pathParts, request, method, isLocal, callback) {
  var _inputValue = value;

  if (pathParts.length) {
    // set or upddate massOperations rules
    store.massOperations[pathParts.join('.')] = value;
    var _data = collection.getAll();
    version   = collection.begin();
    for (var i = 0; i < _data.length; i++) {
      storeUtils.setPathValue(pathParts, value, _data[i]);
      collection.upsert(_data[i], version);
    }
  }
  else {
    version = collection.begin();
    if (isMultipleItems) {
      for (i = 0; i < value.length; i++) {
        // Set value if mass operation have been applied to the store
        storeUtils.setObjectPathValues(store.massOperations, value[i]);
        collection.upsert(value[i], version);
      }
    }
    else {
      if (store.isStoreObject) {
        // we always should update the same value for object store
        var _value = collection.getAll();
        var _id    = _value ? _value._id : null;
        value._id  = _id;
      }
      // If offline set PK
      if (!offline.isOnline && !isUpdate) {
        storeUtils.setPrimaryKeyValue(store, value, store.isStoreObject ? value._id : collection.getCurrentId());
      }
      // Set value if mass operation have been applied to the store
      storeUtils.setObjectPathValues(store.massOperations, value);

      collection.upsert(value, version);
    }
  }

  value = collection.commit(version);

  // If offline set PK
  if (isMultipleItems && !offline.isOnline && !isUpdate) {
    version = collection.begin();
    for (i = 0; i < value.length; i++) {
      storeUtils.setPrimaryKeyValue(store, value[i], value[i]._id);
      collection.upsert(value[i], version);
    }
    value = collection.commit(version);
  }

  cache.invalidate(store.name);

  // it's a patch !
  var _requestValue = value;

  if (!isMultipleItems && !store.isStoreObject) {
    _requestValue = _requestValue[0];
  }

  if (pathParts.length) {
    _inputValue = {
      op    : 'replace',
      path  : storeUtils.getJSONPatchPath(pathParts.join('.')),
      value : _inputValue
    };
    _requestValue = _inputValue;
  }

  request = url.create(store, method, storeUtils.getPrimaryKeyValue(
    store,
    _requestValue,
    !isUpdate || (isUpdate && isMultipleItems))
  );

  // required filters condition not fullfilled
  if (!request) {
    return callback('No url. Maybe the required filters are not set');
  }
  request = request.request;

  if (!offline.isOnline && !(store.isLocal || isLocal)) {
    sync.setOfflineHttpTransaction(store.name, method, request, !isMultipleItems && !store.isStoreObject ? value[0] : value);
  }


  crudUtils.propagate(store, value, method, function () {
    crudUtils.afterAction(store, isUpdate ? 'update' : 'insert', value, null, function () {
      storeUtils.saveState(store, collection, function () {
        callback(null, { version : version, value : _requestValue, request : request });
      });
    });
  });
}

/**
 * Send events and propagate values to dependent stores after HTTP upsert request
 * @param {Object} store
 * @param {Object} collection
 * @param {Object/Array} value
 * @param {Boolean} isUpdate
 * @param {String} method
 * @param {Function} callback
 */
function _upsertHTTPEvents (store, collection, value, isUpdate, method, callback) {
  crudUtils.propagate(store, value, utils.OPERATIONS.UPDATE, function () {
    crudUtils.afterAction(store, 'update', value, null, function () {
      crudUtils.afterAction(store,  isUpdate ? 'updated' : 'inserted', value, template.getSuccess(null, store, method, false), function () {
        storeUtils.saveState(store, collection, function () {
          if (store.isFilter) {
            return hook.pushToHandlers(store, 'filterUpdated', null, callback);
          }

          callback(null, value);
        });
      });
    });
  });
}

/**
 * Make HTTP request for upsert
 * @param {String} method  GET, POST, ...
 * @param {String} request url
 * @param {Boolean} isUpdate
 * @param {Boolean} isPatch
 * @param {Object} store
 * @param {Object} collection
 * @param {*} value
 * @param {Boolean} isMultipleItems
 * @param {Int} version
 * @param {Function} callback
 */
function _upsertHTTP (method, request, isUpdate, store, collection, value, isMultipleItems, version, callback) {
  http.request(method, request, value, function (err, data) {
    if (err) {
      var _error = template.getError(err, store, method, false);
      setLunarisError(store.name, method, request, value, version, err, _error);
      logger.warn(['lunaris.' + (isUpdate ? 'update' : 'insert') + '@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', { error : _error, data : utils.cloneAndFreeze(value)}, function () {
        callback(err);
      });
    }

    if (method === OPERATIONS.PATCH) {
      return crudUtils.afterAction(store, 'patched', null, callback);
    }

    var _isEvent = true;
    var _pks     = [];
    if (store.isStoreObject || !isMultipleItems) {
      if (store.isStoreObject && Array.isArray(data)) {
        return callback('The store "' + store.name + '" is a store object. The ' + method + ' method tries to ' + (isUpdate ? 'update' : 'insert') + ' multiple elements!');
      }
      if (Array.isArray(data)) {
        data = data[0];
      }

      value        = utils.merge(value, data);
      var _version = collection.begin();
      collection.upsert(value, _version);

      if (sync.isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
        _updateCollectionIndexId(collection, value);
        _pks.push(['_' + value._id, storeUtils.getPrimaryKeyValue(store, value)]);
      }

      value = collection.commit(_version);
      // the value must have been deleted
      if (!value) {
        _isEvent = false;
      }
    }
    else {
      var _isMultiple = Array.isArray(data);
      _version = collection.begin();

      for (var i = 0; i < value.length; i++) {
        if (_isMultiple) {
          for (var j = 0; j < data.length; j++) {
            if (value[i]._id === data[j]._id) {
              value[i] = utils.merge(store.clone(value[i]), data[j]);

              collection.upsert(value[i], _version);

              if (sync.isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
                _updateCollectionIndexId(collection, value[i]);
                _pks.push(['_' + value[i]._id, storeUtils.getPrimaryKeyValue(store, value[i])]);
              }
            }
          }
        }
        else {
          value[i] = utils.merge(value[i], data);
          collection.upsert(value[i], _version);

          if (sync.isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
            _updateCollectionIndexId(collection, value[i]);
            _pks.push(['_' + value[i]._id, storeUtils.getPrimaryKeyValue(store, value[i])]);
          }
        }
      }

      value = collection.commit(_version);
    }

    if (sync.isPushingOfflineTransaction && method === OPERATIONS.INSERT) {
      return crudUtils.propagateReferences(store, _pks, function () {
        sync.updateOfflineTransactionData(store.storesToPropagateReferences);

        if (!_isEvent) {
          return callback();
        }

        _upsertHTTPEvents(store, collection, value, isUpdate, method, callback);
      });
    }

    if (!_isEvent) {
      return callback();
    }

    _upsertHTTPEvents(store, collection, value, isUpdate, method, callback);
  });
}

/**
 * Upsert local values and send propagate updates to dependent stores
 * @param {Object} store
 * @param {Array/Object} value
 * @param {Boolean} isUpdate
 * @param {Boolean} isLocal
 * @param {Function} callback
 */
function _upsertLocal (store, value, isUpdate, isLocal, callback) {
  if (store.isLocal || isLocal) {
    if (store.isFilter) {
      return crudUtils.propagate(store, value, isUpdate ? utils.OPERATIONS.UPDATE : utils.OPERATIONS.INSERT, function () {
        hook.pushToHandlers(store, 'filterUpdated', null, callback);
      });
    }

    return crudUtils.propagate(store, value, isUpdate ? utils.OPERATIONS.UPDATE : utils.OPERATIONS.INSERT, callback);
  }

  callback();
}

/**
 * Upsert a value in a store
 * @param {Object} store
 * @param {Array} pathParts
 * @param {Object} collection
 * @param {Array/Object} value
 * @param {Boolean} isUpdate
 * @param {Object} options
 * @param {Function} callback
 */
function _upsert (store, collection, pathParts, value, isUpdate, options, callback) {
  if (!store.isInitialized) {
    return lazyLoad.load(store, [_upsert, arguments]);
  }

  var _isMultipleItems = Array.isArray(value);
  var _version;

  var _request = '/';
  if (options.retryOptions) {
    _request = options.retryOptions.url;
  }

  var _method  = OPERATIONS.UPDATE;
  if (!isUpdate) {
    _method = OPERATIONS.INSERT;
  }
  if (pathParts.length) {
    _method = OPERATIONS.PATCH;
  }

  if (!options.retryOptions) {
    return _upsertCollection(store, collection, value, _version, _isMultipleItems, isUpdate, pathParts, _request, _method, options.isLocal, function (err, _res) {
      if (err) {
        return callback(err);
      }

      _version = _res.version;
      value    = _res.value;
      _request = _res.request;

      _upsertLocal(store, value, isUpdate, options.isLocal, function () {
        if (store.isLocal || options.isLocal || !offline.isOnline) {
          return callback(null, value);
        }

        _upsertHTTP(_method, _request, isUpdate, store, collection, value, _isMultipleItems, _version, callback);
      });
    });
  }

  _version = options.retryOptions.version;

  if (!offline.isOnline) {
    return callback(null, value);
  }

  _upsertHTTP(_method, _request, isUpdate, store, collection, value, _isMultipleItems, _version, callback);
}


/**
 * Insert or Update a value in a store
 * @param {String} store
 * @param {*} value
 * @param {Object} options
 *  retryOptions { // for offline sync
 *    url,
 *    data,
 *    version
 *  },
 *  isLocal : {Boolean}
 * @param {Function} callback
 */
function upsert (store, value, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  if (!options) {
    options = {};
  }

  callback = callback || function () {};

  var _isUpdate = false;

  var _storeParts = (store && typeof store === 'string') ? store.split(':') : [];
  if (_storeParts.length) {
    store = _storeParts.shift();
  }
  if (_storeParts.length) {
    _isUpdate = true;
  }

  var _eventName = 'lunaris.' + (_isUpdate ? 'update' : 'insert') + store;
  try {
    if (options.retryOptions) {
      value = options.retryOptions.data;
    }

    var _options = crudUtils.beforeAction(store, value);
    if ((Array.isArray(value) && (value[0]._id !== null && value[0]._id !== undefined)) || (value._id !== null && value._id !== undefined)) {
      _isUpdate = true;
    }
    if (options.retryOptions && options.retryOptions.method === OPERATIONS.INSERT) {
      _isUpdate = false;
    }

    if (_options.store.validateFn && !_storeParts.length && !options.retryOptions) {
      return imports.validate(store, _options.value, _isUpdate, function (res) {
        if (!res) {
          return callback('Error when validating data');
        }

        _upsert(_options.store, _options.collection, _storeParts, _options.value, _isUpdate, options, function (err, res) {
          // do something when action end
          if (err) {
            callback(err);
            throw err;
          }

          callback(null, res);
        });
      }, _eventName);
    }

    _upsert(_options.store, _options.collection, _storeParts, _options.value, _isUpdate, options, function (err, res) {
      // do something when action end
      if (err) {
        callback(err);
        throw err;
      }

      callback(null, res);
    });
  }
  catch (e) {
    logger.warn([_eventName], e);
  }
}

/**
 * Set Lunaris Error
 * @param {String} storeName
 * @param {Stirng} method ge, post, etc.
 * @param {String} request url
 * @param {Array/Object} value
 * @param {Int} version versionDbNumber
 * @param {Object}err
 * @param {String} error message to display
 */
function setLunarisError (storeName, method, request, value, version, err, error) {
  upsert('@lunarisErrors', {
    version            : version,
    data               : value,
    url                : request,
    method             : method,
    storeName          : storeName,
    date               : dayjs(),
    messageError       : error,
    messageErrorServer : err
  });
}

lu_e['upsert'] = upsert;
lu_e['setLunarisError'] = setLunarisError;
lu_e['setImportFunction'] = function setImportFunction (fn) {
  imports[fn.name] = fn;
};

        
        return lu_e;
      })([_logger_js,_cache_js,_utils_js,_store_store_utils_js,_offline_js,_store_store_transaction_js,_store_store_hook_js,_store_crud_crudUtils_js,_http_js,_store_store_url_js,_store_store_template_js,_store_store_synchronisation_js,_store_crud__lazyLoad_js], {});
    
      var _md5_js = (function(lu_i, lu_e) {
        /*
 * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
 * Digest Algorithm, as defined in RFC 1321.
 * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
 * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
 * Distributed under the BSD License
 * See http://pajhome.org.uk/crypt/md5 for more info.
 */

/*
 * Configurable variables. You may need to tweak these to be compatible with
 * the server-side, but the defaults work in most cases.
 */
var hexcase = 0;   /* hex output format. 0 - lowercase; 1 - uppercase        */
var b64pad  = "";  /* base-64 pad character. "=" for strict RFC compliance   */

/*
 * These are the functions you'll usually want to call
 * They take string arguments and return either hex or base-64 encoded strings
 */
function md5 (s) { return rstr2hex(rstr_md5(str2rstr_utf8(s))); }
/*
 * Calculate the MD5 of a raw string
 */
function rstr_md5(s)
{
  return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
}

/*
 * Calculate the HMAC-MD5, of a key and some data (raw strings)
 */
function rstr_hmac_md5(key, data)
{
  var bkey = rstr2binl(key);
  if(bkey.length > 16) bkey = binl_md5(bkey, key.length * 8);

  var ipad = Array(16), opad = Array(16);
  for(var i = 0; i < 16; i++)
  {
    ipad[i] = bkey[i] ^ 0x36363636;
    opad[i] = bkey[i] ^ 0x5C5C5C5C;
  }

  var hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
  return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
}

/*
 * Convert a raw string to a hex string
 */
function rstr2hex(input)
{
  try { hexcase } catch(e) { hexcase=0; }
  var hex_tab = hexcase ? "0123456789ABCDEF" : "0123456789abcdef";
  var output = "";
  var x;
  for(var i = 0; i < input.length; i++)
  {
    x = input.charCodeAt(i);
    output += hex_tab.charAt((x >>> 4) & 0x0F)
           +  hex_tab.charAt( x        & 0x0F);
  }
  return output;
}

/*
 * Convert a raw string to a base-64 string
 */
function rstr2b64(input)
{
  try { b64pad } catch(e) { b64pad=''; }
  var tab = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  var output = "";
  var len = input.length;
  for(var i = 0; i < len; i += 3)
  {
    var triplet = (input.charCodeAt(i) << 16)
                | (i + 1 < len ? input.charCodeAt(i+1) << 8 : 0)
                | (i + 2 < len ? input.charCodeAt(i+2)      : 0);
    for(var j = 0; j < 4; j++)
    {
      if(i * 8 + j * 6 > input.length * 8) output += b64pad;
      else output += tab.charAt((triplet >>> 6*(3-j)) & 0x3F);
    }
  }
  return output;
}

/*
 * Convert a raw string to an arbitrary string encoding
 */
function rstr2any(input, encoding)
{
  var divisor = encoding.length;
  var i, j, q, x, quotient;

  /* Convert to an array of 16-bit big-endian values, forming the dividend */
  var dividend = Array(Math.ceil(input.length / 2));
  for(i = 0; i < dividend.length; i++)
  {
    dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
  }

  /*
   * Repeatedly perform a long division. The binary array forms the dividend,
   * the length of the encoding is the divisor. Once computed, the quotient
   * forms the dividend for the next step. All remainders are stored for later
   * use.
   */
  var full_length = Math.ceil(input.length * 8 /
                                    (Math.log(encoding.length) / Math.log(2)));
  var remainders = Array(full_length);
  for(j = 0; j < full_length; j++)
  {
    quotient = Array();
    x = 0;
    for(i = 0; i < dividend.length; i++)
    {
      x = (x << 16) + dividend[i];
      q = Math.floor(x / divisor);
      x -= q * divisor;
      if(quotient.length > 0 || q > 0)
        quotient[quotient.length] = q;
    }
    remainders[j] = x;
    dividend = quotient;
  }

  /* Convert the remainders to the output string */
  var output = "";
  for(i = remainders.length - 1; i >= 0; i--)
    output += encoding.charAt(remainders[i]);

  return output;
}

/*
 * Encode a string as utf-8.
 * For efficiency, this assumes the input is valid utf-16.
 */
function str2rstr_utf8(input)
{
  var output = "";
  var i = -1;
  var x, y;

  while(++i < input.length)
  {
    /* Decode utf-16 surrogate pairs */
    x = input.charCodeAt(i);
    y = i + 1 < input.length ? input.charCodeAt(i + 1) : 0;
    if(0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF)
    {
      x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
      i++;
    }

    /* Encode output as utf-8 */
    if(x <= 0x7F)
      output += String.fromCharCode(x);
    else if(x <= 0x7FF)
      output += String.fromCharCode(0xC0 | ((x >>> 6 ) & 0x1F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0xFFFF)
      output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
    else if(x <= 0x1FFFFF)
      output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
                                    0x80 | ((x >>> 12) & 0x3F),
                                    0x80 | ((x >>> 6 ) & 0x3F),
                                    0x80 | ( x         & 0x3F));
  }
  return output;
}

/*
 * Encode a string as utf-16
 */
function str2rstr_utf16le(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode( input.charCodeAt(i)        & 0xFF,
                                  (input.charCodeAt(i) >>> 8) & 0xFF);
  return output;
}

function str2rstr_utf16be(input)
{
  var output = "";
  for(var i = 0; i < input.length; i++)
    output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF,
                                   input.charCodeAt(i)        & 0xFF);
  return output;
}

/*
 * Convert a raw string to an array of little-endian words
 * Characters >255 have their high-byte silently ignored.
 */
function rstr2binl(input)
{
  var output = Array(input.length >> 2);
  for(var i = 0; i < output.length; i++)
    output[i] = 0;
  for(var i = 0; i < input.length * 8; i += 8)
    output[i>>5] |= (input.charCodeAt(i / 8) & 0xFF) << (i%32);
  return output;
}

/*
 * Convert an array of little-endian words to a string
 */
function binl2rstr(input)
{
  var output = "";
  for(var i = 0; i < input.length * 32; i += 8)
    output += String.fromCharCode((input[i>>5] >>> (i % 32)) & 0xFF);
  return output;
}

/*
 * Calculate the MD5 of an array of little-endian words, and a bit length.
 */
function binl_md5(x, len)
{
  /* append padding */
  x[len >> 5] |= 0x80 << ((len) % 32);
  x[(((len + 64) >>> 9) << 4) + 14] = len;

  var a =  1732584193;
  var b = -271733879;
  var c = -1732584194;
  var d =  271733878;

  for(var i = 0; i < x.length; i += 16)
  {
    var olda = a;
    var oldb = b;
    var oldc = c;
    var oldd = d;

    a = md5_ff(a, b, c, d, x[i+ 0], 7 , -680876936);
    d = md5_ff(d, a, b, c, x[i+ 1], 12, -389564586);
    c = md5_ff(c, d, a, b, x[i+ 2], 17,  606105819);
    b = md5_ff(b, c, d, a, x[i+ 3], 22, -1044525330);
    a = md5_ff(a, b, c, d, x[i+ 4], 7 , -176418897);
    d = md5_ff(d, a, b, c, x[i+ 5], 12,  1200080426);
    c = md5_ff(c, d, a, b, x[i+ 6], 17, -1473231341);
    b = md5_ff(b, c, d, a, x[i+ 7], 22, -45705983);
    a = md5_ff(a, b, c, d, x[i+ 8], 7 ,  1770035416);
    d = md5_ff(d, a, b, c, x[i+ 9], 12, -1958414417);
    c = md5_ff(c, d, a, b, x[i+10], 17, -42063);
    b = md5_ff(b, c, d, a, x[i+11], 22, -1990404162);
    a = md5_ff(a, b, c, d, x[i+12], 7 ,  1804603682);
    d = md5_ff(d, a, b, c, x[i+13], 12, -40341101);
    c = md5_ff(c, d, a, b, x[i+14], 17, -1502002290);
    b = md5_ff(b, c, d, a, x[i+15], 22,  1236535329);

    a = md5_gg(a, b, c, d, x[i+ 1], 5 , -165796510);
    d = md5_gg(d, a, b, c, x[i+ 6], 9 , -1069501632);
    c = md5_gg(c, d, a, b, x[i+11], 14,  643717713);
    b = md5_gg(b, c, d, a, x[i+ 0], 20, -373897302);
    a = md5_gg(a, b, c, d, x[i+ 5], 5 , -701558691);
    d = md5_gg(d, a, b, c, x[i+10], 9 ,  38016083);
    c = md5_gg(c, d, a, b, x[i+15], 14, -660478335);
    b = md5_gg(b, c, d, a, x[i+ 4], 20, -405537848);
    a = md5_gg(a, b, c, d, x[i+ 9], 5 ,  568446438);
    d = md5_gg(d, a, b, c, x[i+14], 9 , -1019803690);
    c = md5_gg(c, d, a, b, x[i+ 3], 14, -187363961);
    b = md5_gg(b, c, d, a, x[i+ 8], 20,  1163531501);
    a = md5_gg(a, b, c, d, x[i+13], 5 , -1444681467);
    d = md5_gg(d, a, b, c, x[i+ 2], 9 , -51403784);
    c = md5_gg(c, d, a, b, x[i+ 7], 14,  1735328473);
    b = md5_gg(b, c, d, a, x[i+12], 20, -1926607734);

    a = md5_hh(a, b, c, d, x[i+ 5], 4 , -378558);
    d = md5_hh(d, a, b, c, x[i+ 8], 11, -2022574463);
    c = md5_hh(c, d, a, b, x[i+11], 16,  1839030562);
    b = md5_hh(b, c, d, a, x[i+14], 23, -35309556);
    a = md5_hh(a, b, c, d, x[i+ 1], 4 , -1530992060);
    d = md5_hh(d, a, b, c, x[i+ 4], 11,  1272893353);
    c = md5_hh(c, d, a, b, x[i+ 7], 16, -155497632);
    b = md5_hh(b, c, d, a, x[i+10], 23, -1094730640);
    a = md5_hh(a, b, c, d, x[i+13], 4 ,  681279174);
    d = md5_hh(d, a, b, c, x[i+ 0], 11, -358537222);
    c = md5_hh(c, d, a, b, x[i+ 3], 16, -722521979);
    b = md5_hh(b, c, d, a, x[i+ 6], 23,  76029189);
    a = md5_hh(a, b, c, d, x[i+ 9], 4 , -640364487);
    d = md5_hh(d, a, b, c, x[i+12], 11, -421815835);
    c = md5_hh(c, d, a, b, x[i+15], 16,  530742520);
    b = md5_hh(b, c, d, a, x[i+ 2], 23, -995338651);

    a = md5_ii(a, b, c, d, x[i+ 0], 6 , -198630844);
    d = md5_ii(d, a, b, c, x[i+ 7], 10,  1126891415);
    c = md5_ii(c, d, a, b, x[i+14], 15, -1416354905);
    b = md5_ii(b, c, d, a, x[i+ 5], 21, -57434055);
    a = md5_ii(a, b, c, d, x[i+12], 6 ,  1700485571);
    d = md5_ii(d, a, b, c, x[i+ 3], 10, -1894986606);
    c = md5_ii(c, d, a, b, x[i+10], 15, -1051523);
    b = md5_ii(b, c, d, a, x[i+ 1], 21, -2054922799);
    a = md5_ii(a, b, c, d, x[i+ 8], 6 ,  1873313359);
    d = md5_ii(d, a, b, c, x[i+15], 10, -30611744);
    c = md5_ii(c, d, a, b, x[i+ 6], 15, -1560198380);
    b = md5_ii(b, c, d, a, x[i+13], 21,  1309151649);
    a = md5_ii(a, b, c, d, x[i+ 4], 6 , -145523070);
    d = md5_ii(d, a, b, c, x[i+11], 10, -1120210379);
    c = md5_ii(c, d, a, b, x[i+ 2], 15,  718787259);
    b = md5_ii(b, c, d, a, x[i+ 9], 21, -343485551);

    a = safe_add(a, olda);
    b = safe_add(b, oldb);
    c = safe_add(c, oldc);
    d = safe_add(d, oldd);
  }
  return Array(a, b, c, d);
}

/*
 * These functions implement the four basic operations the algorithm uses.
 */
function md5_cmn(q, a, b, x, s, t)
{
  return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s),b);
}
function md5_ff(a, b, c, d, x, s, t)
{
  return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
}
function md5_gg(a, b, c, d, x, s, t)
{
  return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
}
function md5_hh(a, b, c, d, x, s, t)
{
  return md5_cmn(b ^ c ^ d, a, b, x, s, t);
}
function md5_ii(a, b, c, d, x, s, t)
{
  return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
}

/*
 * Add integers, wrapping at 2^32. This uses 16-bit operations internally
 * to work around bugs in some JS interpreters.
 */
function safe_add(x, y)
{
  var lsw = (x & 0xFFFF) + (y & 0xFFFF);
  var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
  return (msw << 16) | (lsw & 0xFFFF);
}

/*
 * Bitwise rotate a 32-bit number to the left.
 */
function bit_rol(num, cnt)
{
  return (num << cnt) | (num >>> (32 - cnt));
}

lu_e = md5;

        
        return lu_e;
      })([], {});
    
      var _store_store_offline_js = (function(lu_i, lu_e) {
        var utils     = lu_i[0];
var OPERATORS = utils.OPERATORS;
var cache     = lu_i[1];
var md5       = lu_i[2];
var url       = lu_i[3];

/**
 * Delete fields
 * @param {Object} obj
 * @returns {Object}
 */
function _transformCacheData (obj, cloneFn) {
  var _clonedData = cloneFn(obj);
  delete _clonedData._id;
  delete _clonedData._version;
  delete _clonedData._rowId;
  return _clonedData;
}

/**
 * Preload
 * @param {Object} store
 * @param {Object} cache
 * @param {Object} filterValues
 * @param {Array} data
 */
function _preloadCache (store, filterValues, data) {
  var _len = data.length;
  var _cacheValues = [];
  for (var j = 0; j < _len && j < store.paginationLimit; j++) {
    _cacheValues.push(_transformCacheData(data[j], store.clone));
  }

  filterValues.cache.offset = 0;
  filterValues.cache.limit  = store.paginationLimit;

  cache.add(store.name, md5(url.createForOffline(store, filterValues)), _cacheValues);

  if (_len <= store.paginationLimit) {
    return data;
  }

  var _dataToReturn = data.slice(0, store.paginationLimit);
  _cacheValues  = [];
  var _n = 0;
  for (var i = store.paginationLimit; i < _len; i++) {
    _n++;
    _cacheValues.push(_transformCacheData(data[i], store.clone));

    if (!(_n % store.paginationLimit) || i + 1 === _len) {
      filterValues.cache.offset += store.paginationLimit;
      cache.add(store.name, md5(url.createForOffline(store, filterValues)), _cacheValues);
      _cacheValues = [];
    }

  }

  return _dataToReturn;
}

/**
 * Perform ilike operation for each given object
 * @param {*} filterValue
 * @param {*} objValue
 * @returns {Boolean}
 */
function ilike (filterValue, objValue) {
  var _document = objValue.split(' ');

  for (var j = 0; j < filterValue.length; j++) {
    var _nbSearchWordHasBeenFound = 0;
    for (var k = 0; k < filterValue[j].length; k++) {
      for (var i = 0; i < _document.length; i++) {
        var _unaccentWord = utils.unaccent(_document[i]).toLowerCase();

        if (_unaccentWord.indexOf(filterValue[j][k]) !== -1) {
          _nbSearchWordHasBeenFound++;

          if (_nbSearchWordHasBeenFound >= filterValue[j].length) {
            return true;
          }
        }
      }
    }
  }

  return false;
}

/**
 * Filter data by given filter
 * @param {Function} filterFn
 * @param {Array} filter [attributeUrl, attribute, value, operator]
 * @param {Array} data
 * @param {Boolean} isRequiredFilter
 */
function _reduce (filterFn, filter, data, isRequiredFilter) {
  if ((!filterFn && filter[3] !== OPERATORS.ILIKE) || !filter) {
    return data;
  }

  var _filterValue = filter[2];

  if (filter[3] === 'ILIKE' && !isRequiredFilter) {

    if (!Array.isArray(_filterValue)) {
      _filterValue = [_filterValue];
    }

    var _searchWords = [];
    for (var k = 0; k < _filterValue.length; k++) {
      _filterValue[k] = utils.unaccent(_filterValue[k]);
      _searchWords.push(_filterValue[k].toLowerCase().split(' '));
    }

    _filterValue = _searchWords;
  }


  var _res = [];
  for (var i = 0, len = data.length; i < len; i++) {
    if (filterFn.call(null, _filterValue, data[i], ilike)) {
      _res.push(data[i]);
    }
  }

  return _res;
}

/**
 * Filter the collection
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} filterValues {
 *  isRequiredOptionsFilled    : {Boolean}
 *  constructedRequiredOptions : {String}
 *  requiredOptions            : {Object} { <source:attribute:operator> : {Array} }
 *  optionalOptions            : {Object} { <source:attribute:operator> : {Array} }
 *  cache                      : {Object}
 * }
 */
function filter (store, collection, filterValues) {
  var _data = collection.getAll(null, false, false);

  if (!filterValues || !store.filterFns) {
    return _data;
  }

  if (store.isStoreObject) {
    _data = [_data];
  }

  var _requiredFilters = Object.keys(filterValues.requiredOptions);
  for (var i = 0; i < _requiredFilters.length; i++) {
    if (store.filterFns[_requiredFilters[i]] === undefined) {
      continue;
    }

    _data = _reduce(store.filterFns[_requiredFilters[i]], filterValues.requiredOptions[_requiredFilters[i]], _data, true);
  }

  var _optionalFilters = Object.keys(filterValues.optionalOptions);
  for (i = 0; i < _optionalFilters.length; i++) {
    if (store.filterFns[_optionalFilters[i]] === undefined) {
      continue;
    }

    _data = _reduce(store.filterFns[_optionalFilters[i]], filterValues.optionalOptions[_optionalFilters[i]], _data, false);
  }

  if (store.isStoreObject) {
    _data = _data[0] || null;
    return _data;
  }

  return _preloadCache(store, filterValues, _data);
}

lu_e['filter'] = filter;
lu_e['ilike'] = ilike;

        
        return lu_e;
      })([_utils_js,_cache_js,_md5_js,_store_store_url_js], {});
    
      var _store_crud_get_js = (function(lu_i, lu_e) {
        var storeOffline    = lu_i[0];
var md5             = lu_i[1];
var http            = lu_i[2];
var logger          = lu_i[3];
var cache           = lu_i[4];
var url             = lu_i[5];
var utils           = lu_i[6];
var storeUtils      = lu_i[7];
var crudUtils       = lu_i[8];
var offline         = lu_i[9];
var hook            = lu_i[10];
var template        = lu_i[11];
var upsertCRUD      = lu_i[12];
var indexedDB       = lu_i[13].indexedDB;
var lazyLoad        = lu_i[14];
var getRequestQueue = {};
var OPERATIONS      = utils.OPERATIONS;


/**
 * Process next get request in queue
 * @param {String} store
 */
function _processNextGetRequest (store) {
  var _getRequest = getRequestQueue[store].shift();

  if (!_getRequest) {
    return;
  }

  // if (_getRequest.length === 3) {
    _getRequest = _getRequest.concat([_processNextGetRequest]);
  // }

  _get.apply(null, _getRequest);
}

/**
 * Insert and return cache values in store collection
 * @param {*} store
 * @param {*} collection
 * @param {*} values
 */
function _transformGetCache (collection, values) {
  var _version = collection.begin();
  if (Array.isArray(values)) {
    for (var i = 0; i < values.length; i++) {
      collection.add(values[i], _version);
    }
  }
  else {
    collection.add(values, _version);
  }
  return collection.commit(_version);
}


/**
 * Return cache values
 * @param {Object} store
 * @param {Object} collection
 * @param {String} request
 * @param {Array} cacheValues
 * @param {Object} options
 * @param {Function} nextGet
 */
function _returnCacheValues (store, collection, request, cacheValues, options, nextGet) {
  var _values = [];

  if (typeof cacheValues === 'object') {
    storeUtils.saveState(store, collection);
    _values = _transformGetCache(collection, store.clone(cacheValues));
  }

  return crudUtils.afterAction(store, 'get', _values, null, function () {
    if (store.isFilter) {
      return hook.pushToHandlers(store, 'filterUpdated', null, function () {

        options.callback(null, _values);
        nextGet('@' + store.name);
      });
    }

    options.callback(null, _values);
    nextGet('@' + store.name);
  });
}

/**
 * Get local values and send evens for GET
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} request
 * @param {Object} options
 * @param {Function} nextGet handler to call next get in queue
 */
function _returnLocalValues (store, collection, request, options, nextGet) {
  var _res = storeOffline.filter(
    store,
    collection,
    request
  );

  crudUtils.afterAction(store, 'get', _res, null, function () {
    if (store.isFilter && ((store.isStoreObject && _res) || (!store.isStoreObject && _res.length))) {
      return hook.pushToHandlers(store, 'filterUpdated', null, function () {
        storeUtils.saveState(store, collection, function () {
          options.callback(null, _res);
          nextGet('@' + store.name);
        });
      });
    }

    storeUtils.saveState(store, collection, function () {
      options.callback(null, _res);
      nextGet('@' + store.name);
    });
  });
}

/**
 * Make a GET HTTP request
 * @param {Object} store
 * @param {Object} collection
 * @param {String} request
 * @param {*} primaryKeyValue -> GET /store/:primaryKeyValue
 * @param {Integer} transactionId
 * @param {Function} nextGet handler to call next get in queue
 */
function _getHTTP (store, collection, request, primaryKeyValue, options, nextGet) {
  http.request('GET', request, null, function (err, data) {
    if (err) {
      var _error = template.getError(err, store, 'GET', true);
      upsertCRUD.setLunarisError(store.name, 'GET', request, null, null, err, _error);
      logger.warn(['lunaris.get@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', { error : _error }, function () {
        options.callback(err);
        nextGet('@' + store.name);
      });
    }

    var _version = collection.begin();
    if (Array.isArray(data)) {
      if (store.isStoreObject) {
        err = 'The store "' + store.name + '" is an object store. The GET method cannot return multiple elements!';
        logger.warn(
          ['lunaris.get@' + store.name],
          new Error(err)
        );
        options.callback(err);
        return nextGet('@' + store.name);
      }

      cache.add(store.name, md5(request), store.clone(data));

      for (var i = 0; i < data.length; i++) {
        collection.upsert(data[i], _version);
      }

      if (primaryKeyValue && data.length) {
        data = data[0];
      }
    }
    else {
      cache.add(store.name, md5(request), store.clone(data));
      collection.upsert(data, _version);
    }

    data = collection.commit(_version);


    crudUtils.propagate(store, data, utils.OPERATIONS.INSERT, function () {
      crudUtils.afterAction(store, 'get', data, null, function () {
        if (store.isFilter) {
          return hook.pushToHandlers(store, 'filterUpdated', null, function () {
            storeUtils.saveState(store, collection, function () {
              options.callback(null, data);
              nextGet('@' + store.name);
            });
          });
        }

        storeUtils.saveState(store, collection, function () {
          options.callback(null, data);
          nextGet('@' + store.name);
        });
      });
    });
  }, { store : store.name });
}

/**
 * Make get
 * @param {String} store
 * @param {*} primaryKeyValue
 * @param {Object} options {
 *   callback
 * }
 * @param {Function} next _processNextGetRequest(store)
 */
function _get (store, primaryKeyValue, options, next) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);

    if (!_options.store.isInitialized) {
      return lazyLoad.load(_options.store, [_get, arguments]);
    }

    var _request = '/';

    _request = url.create(_options.store, 'GET', primaryKeyValue);
    _options.store.paginationOffset = _options.store.paginationLimit * _options.store.paginationCurrentPage;
    _options.store.paginationCurrentPage++;

    // required filters condition not fullfilled
    if (!_request) {
      options.callback('No url. Maybe the required filters are not set');
      return next(store);
    }

    var _cacheValues = cache.get(store.name, md5(_request.request));
    if (_cacheValues) {
      return _returnCacheValues(_options.store, _options.collection, _request.request, _cacheValues, options, next);
    }

    if (!offline.isOnline || _options.store.isLocal) {
      return _returnLocalValues(_options.store, _options.collection, _request, options, next);
    }

    _getHTTP(_options.store, _options.collection, _request.request, primaryKeyValue, options, next);
  }
  catch (e) {
    logger.warn(['lunaris.get' + store], e);
  }
}


/**
 * Get values
 * @param {String} store
 * @param {*} primaryKeyValue
 * @param {Object} options @optional
 * @param {Function}
 */
function get (store, primaryKeyValue, options, callback) {
  if (!getRequestQueue[store]) {
    getRequestQueue[store] = [];
  }

  if (typeof primaryKeyValue === 'function') {
    callback        = primaryKeyValue;
    primaryKeyValue = null;
  }

  if (typeof options === 'function') {
    callback = options;
    options  = null;
  }

  if (typeof primaryKeyValue === 'object') {
    options         = primaryKeyValue;
    primaryKeyValue = null;
  }

  if (!options) {
    options = {};
  }

  options.callback = callback || function () {};

  getRequestQueue[store].push([store, primaryKeyValue, options]);

  if (getRequestQueue[store].length === 1) {
    _processNextGetRequest(store);
  }
}


/**
 * Load all data from a store
 * @param {String} store ex: '@store'
 * @param {Object} options { limit : Int }
 * @param {Function} callback internal use for transaction
 */
function load (store, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = null;
  }

  if (!callback) {
    callback = function () {};
  }

  if (!options) {
    options = {};
  }

  try {
    if (!offline.isRealOnline) {
      throw new Error('You are offline!');
    }

    if (!offline.isOfflineMode) {
      throw new Error('Offline mode is not enabled!');
    }

    var _options = crudUtils.beforeAction(store, null, true);

    if (_options.store.isLocal) {
      throw new Error('The store is local!');
    }

    if (options == null) {
      options = {};
    }

    _options.store.paginationCurrentPage = 1;
    _options.store.paginationOffset      = 0;
    _options.store.paginationLimit       = 50;
    _options.store.massOperations        = {};
    cache.invalidate(_options.store.name);
    _options.collection.clear();
    indexedDB.clear(_options.store.name);

    storeUtils.saveState(_options.store, _options.collection, function () {
      if (options.limit) {
        _options.store.paginationLimit = options.limit;
      }

      var _request = url.create(_options.store, 'GET', null, !!options.limit).request;

      http.request('GET', _request, null, function (err, data) {
        if (err) {
          var _error = template.getError(err, _options.store, 'GET', true);
          upsertCRUD.setLunarisError(_options.store.name, 'GET', _request, null, null, err, _error);
          logger.warn(['lunaris.load@' + _options.store.name], err);
          return hook.pushToHandlers(_options.store, 'errorHttp', { error : _error }, function () {
            if (callback) {
              callback();
            }
          });
        }

        if (!Array.isArray(data)) {
          data = [data];
        }

        var _version = _options.collection.begin();
        for (var i = 0, len = data.length; i < len; i++) {
          _options.collection.add(data[i], _version);
        }

        _options.collection.commit(_version);

        storeUtils.saveState(_options.store, _options.collection, function () {
          hook.pushToHandlers(_options.store, 'loaded', null, function () {
            if (callback) {
              callback();
            }
          });
        });
      }, {
        isOffline : true,
        store     : _options.store.name
      });
    });
  }
  catch (e) {
    logger.warn(['lunaris.load' + store], e);
  }
}

lu_e['get'] = get;
lu_e['load'] = load;

        
        return lu_e;
      })([_store_store_offline_js,_md5_js,_http_js,_logger_js,_cache_js,_store_store_url_js,_utils_js,_store_store_utils_js,_store_crud_crudUtils_js,_offline_js,_store_store_hook_js,_store_store_template_js,_store_crud_upsert_js,_localStorageDriver_js,_store_crud__lazyLoad_js], {});
    
      var _store_crud_clear_js = (function(lu_i, lu_e) {
        var logger         = lu_i[0];
var cache          = lu_i[1];
var utils          = lu_i[2];
var storeUtils     = lu_i[3];
var crudUtils      = lu_i[4];
var offline        = lu_i[5];
var hook           = lu_i[6];
var lunarisExports = lu_i[7];
var sync           = lu_i[8];
var indexedDB      = lu_i[9].indexedDB;
var OPERATIONS     = utils.OPERATIONS;

sync.setImportFunction(_clear);

/**
 * Propagate for clear and save state
 * @param {Object} store
 * @param {Object} collection
 * @param {Function} callback
 */
function _clearPropagate (store, collection, callback) {
  crudUtils.propagate(store, null, OPERATIONS.DELETE, function () {
    storeUtils.saveState(store, collection, callback);
  });
}

function _clearSendEvents (store, collection, isSilent, callback) {
  if (!isSilent) {
    return _clearPropagate(store, collection, function () {
      hook.pushToHandlers(store, 'clear', null, function () {
        hook.pushToHandlers(store, 'reset', null, callback);
      });
    });
  }

  _clearPropagate(store, collection, callback);
}

/**
 * Clear the store collection
 * @param {String} store
 * @param {Object} options
 * @param {Function} callback
 */
function _clear (store, options, callback) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);

    _options.store.paginationCurrentPage = 1;
    _options.store.paginationOffset      = 0;
    _options.store.paginationLimit       = 50;
    _options.store.massOperations        = {};
    cache.invalidate(_options.store.name);

    if (offline.isOnline || _options.store.isLocal) {
      _options.collection.clear();
      return indexedDB.clear(_options.store.name, function () {
        _clearSendEvents(_options.store, _options.collection, options.isSilent, callback);
      });
    }

    _clearSendEvents(_options.store, _options.collection, options.isSilent, callback);
  }
  catch (e) {
    callback(e);
    logger.warn(['lunaris.clear' + store], e);
  }
}

/**
 * Clear the store collection
 * @param {String} store
 * @param {Object} options { isSilent : Boolean } // for compatibility reseons, options can be a Boolean = isSilent
 * @param {Function} callback (err)
 */
function clear (store, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = null;
  }

  if (typeof options === 'boolean') {
    options = { isSilent : options };
  }

  if (!options) {
    options = {};
  }

  options.isSilent = options.isSilent || false;

  // It is a regex, we must find the stores !
  if (/\*$/.test(store)) {
    if (!/^@/.test(store)) {
      return logger.warn(['lunaris.clear'], new Error('The store key must begin by \'@\''));
    }

    var _keyLength = store.length - 2;
    var _key       = store.slice(1, _keyLength + 1);

    return utils.queue(Object.keys(lunarisExports._stores), function (store, next) {
      if (store.slice(0, _keyLength) !== _key) {
        return next();
      }

      _clear('@' + store, options, next);
    }, function () {
      if (callback) {
        callback();
      }
    });
  }

  _clear(store, options, function (err) {
    if (callback) {
      callback(err);
    }
  });
}

lu_e['clear'] = clear;

        
        return lu_e;
      })([_logger_js,_cache_js,_utils_js,_store_store_utils_js,_store_crud_crudUtils_js,_offline_js,_store_store_hook_js,_exports_js,_store_store_synchronisation_js,_localStorageDriver_js], {});
    
      var _store_crud_delete_js = (function(lu_i, lu_e) {
        var logger     = lu_i[0];
var cache      = lu_i[1];
var utils      = lu_i[2];
var storeUtils = lu_i[3];
var offline    = lu_i[4];
var hook       = lu_i[5];
var crudUtils  = lu_i[6];
var http       = lu_i[7];
var url        = lu_i[8];
var template   = lu_i[9];
var sync       = lu_i[10];
var upsertCrud = lu_i[11];
var lazyLoad   = lu_i[12];
var queue      = utils.queue;
var OPERATIONS = utils.OPERATIONS;

sync.setImportFunction(deleteStore);

/**
 * Delete value in referenced stores
 * @param {Object} store
 * @param {Object} value
 * @param {Function} callback (err)
 */
function _deleteValueInReferencedStores (store, collection, value, callback) {
  // If references, we must find if the id is still referenced
  var _storesToPropagateLength = store.storesToPropagateReferences.length;

  if (!_storesToPropagateLength) {
    return callback();
  }

  var _indexIds    = collection.getIndexDataCache();
  var _indexArray  = _indexIds[value._id];

  if (_indexArray == null) {
    return callback();
  }

  var _pkValue = storeUtils.getPrimaryKeyValue(store, collection.get(value._id));

  queue(store.storesToPropagateReferences, function handlerItem (storeToPropagate, next) {
    var _store      = storeUtils.getStore('@' + storeToPropagate);
    var _collection = storeUtils.getCollection(_store);
    var _references = _collection.getIndexReferences();

    if (!_references[store.name]) {
      return next();
    }

    if (!_references[store.name][_pkValue]) {
      return next();
    }

    var error = '${Cannot delete the value, it is still referenced in the store} ' + _store.nameTranslated;
    hook.pushToHandlers(store, 'error', { error : error, data : null }, function () {
      callback(true);
    });
  }, callback);
}

/**
 * Delete value in collection
 * @param {Object} store
 * @param {Object} collection
 * @param {*} value
 * @param {Boolean} isLocal
 * @param {Function} callback
 */
function _deleteLocal (store, collection, value, isLocal, callback) {
  var _version = collection.begin();

  _deleteValueInReferencedStores(store, collection, value, function (isError) {
    if (isError) {
      return callback(isError);
    }

    collection.remove(value, _version, !isLocal);
    value = collection.commit(_version);
    var _isArray = Array.isArray(value);

    if (isLocal && ((!_isArray && !value) || (_isArray && !value.length))) {
      return callback(new Error('You cannot delete a value not in the store!'));
    }

    crudUtils.propagate(store, value, utils.OPERATIONS.DELETE, function () {
      crudUtils.afterAction(store, 'delete', value, null, function () {
        if (!store.isStoreObject) {
          value = value[0];
        }

        cache.invalidate(store.name);
        storeUtils.saveState(store, collection, function () {
          callback(null, [_version, value]);
        });
      });
    });
  });
}

/**
 * Make a DELETE HTTP request
 * @param {Object} store
 * @param {Object} collection
 * @param {Object} value
 * @param {Int} version
 * @param {Object} version
 * @param {Function} callback (err)
 */
function _deleteHttp (store, collection, value, version, options, callback) {
  if (store.isLocal || options.isLocal) {
    return callback(null, value);
  }

  var _request = '/';
  if (!options.retryOptions) {
    _request = url.create(store, 'DELETE', storeUtils.getPrimaryKeyValue(store, value));
    // required filters consition not fullfilled
    if (!_request) {
      return callback('No url. Maybe the required filters are not set');
    }
    _request = _request.request;
  }
  else {
    _request = options.retryOptions.url;
  }

  if (!offline.isOnline) {
    sync.setOfflineHttpTransaction(store.name, OPERATIONS.DELETE, _request, value);
    return callback();
  }

  http.request('DELETE', _request, null, function (err, data) {
    if (err) {
      var _error = template.getError(err, store, 'DELETE', false);
      upsertCrud.setLunarisError(store.name, 'DELETE', _request, value, version, err, _error);
      logger.warn(['lunaris.delete@' + store.name], err);
      return hook.pushToHandlers(store, 'errorHttp', { error : _error, data : value }, function () {
        callback(err);
      });
    }

    _deleteLocal(store, collection, data, false, function (err, data) {
      if (err) {
        return callback(err);
      }

      if (data[1]) {
        value = data[1];
      }

      crudUtils.afterAction(store, 'deleted', value, template.getSuccess(null, store, 'DELETE', false), function () {
        callback(null, value);
      });
    });
  });
}

/**
 * Delete a value from a store
 * @param {String} store
 * @param {*} value
 * @param {Object} options
 *  retryOptions { // for offline sync
 *    url,
 *    data,
 *    version
 *  },
 *  isLocal : {Boolean}
 * @param {Function} callback
 */
function deleteStore (store, value, options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options  = {};
  }

  if (!options) {
    options = {};
  }

  callback = callback || function () {};

  try {
    if (options.retryOptions) {
      value = options.retryOptions.data;
    }
    var _options = crudUtils.beforeAction(store, value);

    if (!_options.store.isInitialized) {
      return lazyLoad.load(_options.store, [deleteStore, arguments]);
    }

    var _version;
    if (!options.retryOptions) {
      return _deleteLocal(_options.store, _options.collection, value, true, function (err, data) {
        if (err) {
          callback(err);
          throw err;
        }

        _version = data[0];
        value    = data[1];

        _deleteHttp(_options.store, _options.collection, value, _version, options, function (err, data) {
          if (err) {
            callback(err);
            throw err;
          }

          callback(null, data);
        });
      });

    }

    _version = options.retryOptions.version;

    _deleteHttp(_options.store, _options.collection, value, _version, options, function (err, data) {
      if (err) {
        callback(err);
        throw err;
      }

      callback(null, data);
    });
  }
  catch (e) {
    logger.warn(['lunaris.delete' + store], e);
  }
}

lu_e['delete'] = deleteStore;

        
        return lu_e;
      })([_logger_js,_cache_js,_utils_js,_store_store_utils_js,_offline_js,_store_store_hook_js,_store_crud_crudUtils_js,_http_js,_store_store_url_js,_store_store_template_js,_store_store_synchronisation_js,_store_crud_upsert_js,_store_crud__lazyLoad_js], {});
    
      var _store_store_js = (function(lu_i, lu_e) {
        var lunarisExports              = lu_i[0];
var utils                       = lu_i[1];
var storeUtils                  = lu_i[2];
var logger                      = lu_i[3];
var collection                  = lu_i[4];
var offline                     = lu_i[5];
var crudUtils                   = lu_i[6];
var upsertCRUD                  = lu_i[7];
var getCRUD                     = lu_i[8];
var clearCrud                   = lu_i[9];
var deleteCrud                  = lu_i[10];
var storeUrl                    = lu_i[11];
var indexedDB                   = lu_i[12].indexedDB;
var emptyObject                 = {};

lunarisExports._stores.lunarisErrors = {
  name                  : 'lunarisErrors',
  data                  : collection.collection(null, false, null, null, null, 'lunarisErrors', null, utils.clone),
  filters               : [],
  paginationLimit       : 50,
  paginationOffset      : 0,
  paginationCurrentPage : 1,
  hooks                 : {},
  nameTranslated        : '${store.lunarisErrors}',
  isLocal               : true,
  storesToPropagate     : [],
  isStoreObject         : false,
  massOperations        : {},
  clone                 : utils.clone
};

upsertCRUD.setImportFunction(validate);

/** =================================================  *
 *                   Public methods                    *
 *  ================================================= **/

/**
 * Set store pagination
 * @param {String} store
 * @param {Int} page
 * @param {Int}} limit
 */
function setPagination (store, page, limit) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);

    _options.store.paginationLimit       = limit || _options.store.paginationLimit;
    _options.store.paginationCurrentPage = page  || 1;
    _options.store.paginationOffset      = (_options.store.paginationLimit * _options.store.paginationCurrentPage) - _options.store.paginationLimit;
    storeUtils.saveState(_options.store, _options.collection);
  }
  catch (e) {
    logger.warn(['lunaris.setPagination' + store], e);
  }
}

/**
 * Get firt value or the value identified by its _id
 * @param {String} store
 * @param {Int} id lunaris _id value
 * @param {Boolean} isPrimaryKey
 */
function getOne (store, id, isPrimaryKey) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);
    var _item;

    if (id)  {
      _item = _options.collection.get(id, isPrimaryKey);
    }
    else {
      _item = _options.collection.getFirst();
    }

    if (!_item) {
      return;
    }

    return utils.cloneAndFreeze(_item);
  }
  catch (e) {
    logger.warn(['lunaris.getOne' + store], e);
  }
}

/**
 * Rollback a store to the specified version
 * @param {String} store
 * @param {Int} version
 */
function rollback (store, version) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);
    _options.collection.rollback(version);
  }
  catch (e) {
    logger.warn(['lunaris.rollback' + store], e);
  }
}

/**
 * get store default value
 * @param {String} store
 * @return {Object}
 */
function getDefaultValue (store) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);
    if (!_options.store.defaultValue) {
      return emptyObject;
    }

    return utils.clone(_options.store.defaultValue);
  }
  catch (e) {
    logger.warn(['lunaris.getDefaultValue' + store], e);
  }
}

/**
 * Validate value against store valdiator
 * @param {String} store
 * @param {Array/Object} value
 * @param {Boolean} isUpdate
 * @param {Function} callback
 * @param {String} eventName internal arg to overwrite the validate error name
 */
function validate (store, value, isUpdate, callback, eventName) {
  try {
    var _isUpdate = isUpdate;
    storeUtils.checkArgs(store, value, true);

    if (!callback) {
      callback  = isUpdate;
      _isUpdate = false;
      if ((Array.isArray(value) && value[0]._id) || value._id) {
        _isUpdate = true;
      }
    }

    var _store = storeUtils.getStore(store);
    if (_store.validateFn) {
      var _valueToValidate = value;
      if (_store.isStoreObject && Array.isArray(value)) {
        throw new Error('The store "' + store.name + '" is a store object, you cannot add or update multiple elements!');
      }
      if (!_store.isStoreObject && !Array.isArray(value)) {
        _valueToValidate = [value];
      }

      var _isValidatingPK = offline.isOnline ? _isUpdate : false; // No primary validation
      return _store.validateFn(_valueToValidate, _store.onValidate, _isValidatingPK, function (err) {
        if (err.length) {
          for (var i = 0; i < err.length; i++) {
            logger.warn(['lunaris.' + (_isUpdate ? 'update' : 'insert') + store + ' Error when validating data'], err[i]);
          }
          return callback(false, err);
        }

        callback(true);
      });
    }

    throw new Error('The store does not have a map! You cannot validate a store without a map.');
  }
  catch (e) {
    logger.warn([eventName || ('lunaris.validate' + store)], e);
  }
}

/**
 * Create url for a store
 * @param {String} store  ex: '@store'
 * @param {String} method  ex: 'PUT'
 * @param {*} primaryKey @optional
 */
function createUrl (store, method, primaryKey) {
  try {
    var _options = crudUtils.beforeAction(store, null, true);

    if (!method) {
      throw new Error('Must provide a method, ex: GET, POST, etc.');
    }

    var _request = storeUrl.create(_options.store, method, primaryKey);

    if (_request) {
      return _request.request;
    }

    return;
  }
  catch (e) {
    logger.warn(['lunaris.createUrl'], e);
  }
}

lu_e['get'] = getCRUD.get;
lu_e['load'] = getCRUD.load;
lu_e['getOne'] = getOne;
lu_e['insert'] = upsertCRUD.upsert;
lu_e['update'] = upsertCRUD.upsert;
lu_e['upsert'] = upsertCRUD.upsert;
lu_e['delete'] = deleteCrud.delete;
lu_e['clear'] = clearCrud.clear;
lu_e['rollback'] = rollback;
lu_e['getDefaultValue'] = getDefaultValue;
lu_e['validate'] = validate;
lu_e['setPagination'] = setPagination;
lu_e['createUrl'] = createUrl;

        
        return lu_e;
      })([_exports_js,_utils_js,_store_store_utils_js,_logger_js,_store_store_collection_js,_offline_js,_store_crud_crudUtils_js,_store_crud_upsert_js,_store_crud_get_js,_store_crud_clear_js,_store_crud_delete_js,_store_store_url_js,_localStorageDriver_js], {});
    
      var _websocket_js = (function(lu_i, lu_e) {
        var logger         = lu_i[0];
var lunarisExports = lu_i[1];
var offline        = lu_i[2];

var ws                      = null;
var lastInterval            = 200;
var reconnectInterval       = 200;
var reconnectIntervalMax    = (20 * 1000);
var reconnectIntervalFactor = 1.2; // multiply last interval to slow down reconnection frequency
var timeout                 = null;

var isReload = false;
var handlers = {};

if (lunarisExports.isBrowser) {
  window.onbeforeunload = function () {
    isReload = true;
  };
}

/**
 * Reconnect function when websocket closed
 * @param {String} host
 */
function reconnect (host) {
  ws = null;

  lastInterval *= reconnectIntervalFactor;
  if (lastInterval > reconnectIntervalMax) {
    lastInterval = reconnectIntervalMax;
  }

  logger.info('[Websocket]', 'Reconnect to websocket server in ' + lastInterval.toFixed(2) + 'ms');

  timeout = setTimeout(function () {
    if (!offline.isOnline) {
      clearTimeout(timeout);
    }

    connect(host);
  }, lastInterval);
}

/**
 * Connect to websocket server
 * @param {String} host
 */
function connect (host) {
  if (ws) {
    return;
  }

  ws = new WebSocket(host);

  ws.onopen = function () {
    lastInterval = reconnectInterval;
    logger.info('[Websocket]', 'Connected!');

    _send('invalidations');
  };
  ws.onerror = function (evt) {
  };
  ws.onclose = function (evt) {
    if (!isReload) {
      reconnect(host);
    }
  };
  ws.onmessage = function (msg) {
    if (!msg.data) {
      return;
    }

    try {
      var message = JSON.parse(msg.data);

      if (handlers[message.channel]) {
        handlers[message.channel].call(null, message);
      }
    }
    catch (e) {
      logger.warn('[Websocket] Cannot parse incomming message', e);
    }
  };
}

/**
 * Send data from client to server
 * @param {String} channel
 * @param {*} data
 */
function _send (channel, data) {
  ws.send(JSON.stringify({
    channel : channel,
    data    : data,
    ts      : Date.now()
  }));
}

lu_e = {
  _handlers : handlers,
  connect   : connect,

  /**
   * Send data from client to server
   * @param {String} type
   * @param {*} data
   */
  send : function (channel, data) {
    // Only open websocket can send data
    if (ws.readyState !== WebSocket.OPEN) {
      return;
    }

    _send(channel, data);
  },

  /**
   * Close websocket
   * @param {Function} callback @optional
   */
  stop : function (callback) {
    if (!ws) {
      if (callback) {
        callback();
      }
      return;
    }

    // set isReload to avoid auto-reconnect mecanism
    isReload = true;
    ws.onclose = function () {
      if (callback) {
        callback();
      }
      isReload = false;
    };
    ws.close();
  },

  /**
   * Subscribe to a channel (or event)
   * @param {String} channel
   * @param {Function} handler
   */
  subscribe (channel, handler) {
    if (typeof handler !== 'function') {
      return logger.warn('[lunaris.websocket.subscribe] Handler is not a function');
    }

    if ((channel === 'invalidated' || channel === 'invalidations') && handlers[channel]) {
      return logger.warn('[lunaris.websocket.subscribe] Given channel is reserved');
    }

    handlers[channel] = handler;
  },

  /**
   * Unsubscribe from a channel (or event)
   * @param {String} channel
   */
  unsubscribe (channel) {
    delete handlers[channel];
  },
};

        
        return lu_e;
      })([_logger_js,_exports_js,_offline_js], {});
    
      var _invalidate_js = (function(lu_i, lu_e) {
        var indexedDB      = lu_i[0].indexedDB;
var lunarisExports = lu_i[1];
var cache          = lu_i[2];
var store          = lu_i[3];
var logger         = lu_i[4];
var offline        = lu_i[5];

var clientLightUrlInvalidations = {};
var events                      = {};
var INVALIDATE_EVENTS           = {
  INVALIDATE : 'invalidate'
};

/**
 * Add invalidation in cache
 * @param {String} url ex: 'GET /all'
 */
function addInvalidation (url) {
  var dateInvalidations            = Date.now();
  clientLightUrlInvalidations[url] = dateInvalidations;
  indexedDB.upsert('_invalidations', { url : url, date : dateInvalidations });
}

/**
 * Invalidate a store from the cache or an URL
 * @param {String} storeOrUrl ex: 'store1' or 'GET /all/#'
 */
lu_e = {

  invalidations : clientLightUrlInvalidations,

  /**
   * Init previous invalidations
   * @param {Function} callback
   */
  init : function (callback) {
    indexedDB.getAll('_invalidations', function (err, res) {
      if (err) {
        return callback();
      }

      for (var i = 0; i < res.length; i++) {
        clientLightUrlInvalidations[res[i].url] = res[i].date;
      }

      callback();
    });
  },

  /**
   * Invalidate a store or a group of store by light URL
   * If online mode and not synchronizing, we will not store the invalidation
   * @param {String} storeOrUrl
   */
  invalidate : function invalidate (storeOrUrl) {
    if (storeOrUrl == null || typeof storeOrUrl !== 'string') {
      return;
    }

    // Invalidate url
    if (/^GET\s/.test(storeOrUrl)) {
      if (!lunarisExports.urlsGraph[storeOrUrl]) {
        return;
      }

      // If we are offline (ie in offline-online mode)
      if (offline.isOfflineMode && !offline.isSynchronizing) {
        if (events[INVALIDATE_EVENTS.INVALIDATE]) {
          events[INVALIDATE_EVENTS.INVALIDATE](storeOrUrl);
        }
        return;
      }

      addInvalidation(storeOrUrl);

      for (var i = 0, len = lunarisExports.urlsGraph[storeOrUrl].length; i < len; i++) {
        logger.info('[Invalidate] ' + storeOrUrl + ' -> @' + lunarisExports.urlsGraph[storeOrUrl][i]);
        store.clear('@' + lunarisExports.urlsGraph[storeOrUrl][i]);
      }

      return;
    }

    cache.invalidate(storeOrUrl);
  },

  /**
   * Compute invalidations between server and client at websocket connection
   * @param {Object} lightUrlInvalidations { lightUrl : timestamp }, invalidations from the server
   */
  computeInvalidations : function (lightUrlInvalidations, stores) {
    var _storesToDeleteStates = [];
    var _invalidations        = [];

    function searchAndRemove (url) {
      if (!lunarisExports.urlsGraph[url]) {
        return;
      }

      var dateInvalidations            = Date.now();
      clientLightUrlInvalidations[url] = dateInvalidations;
      _invalidations.push({ url : url, date : dateInvalidations });

      for (var i = 0, len = lunarisExports.urlsGraph[url].length; i < len; i++) {
        var index = stores.indexOf(lunarisExports.urlsGraph[url][i]);
        if (index === -1) {
          continue;
        }

        store.clear('@' + stores[index]);
        stores.splice(index, 1);
      }
    }

    for (var url in lunarisExports.urlsGraph) {
      if (!lightUrlInvalidations[url] && clientLightUrlInvalidations[url]) {
        continue;
      }

      if (lightUrlInvalidations[url] && !clientLightUrlInvalidations[url]) {
        searchAndRemove(url);
        continue;
      }

      if (clientLightUrlInvalidations[url] < lightUrlInvalidations[url]) {
        searchAndRemove(url);
      }
    }

    /**
     * Push multiple invalidations at the same time
     * Better performance for browser than n transactions
     */
    if (_storesToDeleteStates.length) {
      indexedDB.del('_states', _storesToDeleteStates);
    }
    if (_invalidations.length) {
      indexedDB.upsert('_invalidations', _invalidations);
    }
  },

  /**
   * Set event handler
   * @param {String} event
   * @param {Function} handler
   */
  on : function (event, handler) {
    events[event] = handler;
  }
};

        
        return lu_e;
      })([_localStorageDriver_js,_exports_js,_cache_js,_store_store_js,_logger_js,_offline_js], {});
    
      var _store_dataQuery_queryResultSet_js = (function(lu_i, lu_e) {
        var ilike = lu_i[0].ilike;
var utils = lu_i[1];

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
 * Sort data
 * @param {Array|string} Sorts
 * @param {Array} data
 */
function _sort (sorts, data) {
  timsort.sort(data, getSortFn(sorts));
  return data;
}
/**
 * Filter data with where
 * @param {Function} whereFn
 * @param {Array} data
 */
function _where (whereFn, data) {
  var dataFiltered = [];
  for (var i = 0; i < data.length; i++) {
    var _res = whereFn.call(null, data[i]);

    if (_res) {
      dataFiltered.push(data[i]);
    }
  }
  return dataFiltered;
}

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
 * @param {Array} data
 * @returns {Array}
 */
function _find (query, data) {
  var dataFiltered = [];
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

  for (var i = 0, len = data.length; i < len; i++) {
    var item = data[i];

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

    dataFiltered.push(item);
  }

  return dataFiltered;
}

/**
 * Query
 * @param {Array} data
 * @param {Object} options
 * options.shouldClone
 */
function Query (data, options) {
  var _query         = {};
  var _hasBeenCloned = options && options.shouldClone === false ? true : false;

  /**
   * @private
   */
  function _cloneIfNotAlreadyIs () {
    if (!_hasBeenCloned) {
      data           = utils.clone(data);
      _hasBeenCloned = true;
    }
  }

  /**
   * Count the number of items
   * @public
   * @returns {Number}
   */
  _query.count = function count () {
    return data.length;
  };

  /**
   * Return result set's data
   * @public
   * @param @option {Object} options { freeze : Boolean }
   * @returns {Array}
   */
  _query.data = function _data (options) {
    _cloneIfNotAlreadyIs();

    if (options && options.freeze) {
      data = utils.cloneAndFreeze(data);
    }

    return data;
  };

  /**
   * Sort
   * @public
   * @param {Array/String} sorts 'label [ASC|DESC]'
   * @returns {CollectionResultSet}
   */
  _query.sort = function sort (sorts) {
    if (!sorts) {
      return _query;
    }

    if (!Array.isArray(sorts)) {
      sorts = [sorts];
    }

    _cloneIfNotAlreadyIs();

    _sort(sorts, data);
    return _query;
  };

  /**
   * Map
   * @param {Function} mapFn
   * @returns {CollectionResultSet}
   */
  _query.map = function map (mapFn) {
    if (typeof mapFn !== 'function') {
      throw new Error('mapFn is not a function');
    }

    _cloneIfNotAlreadyIs();

    var res = [];
    for (var i = 0; i < data.length; i++) {
      res[i] = mapFn.call(null, data[i], i, res);
    }

    data = res;
    return _query;
  };

  /**
   * Reduce
   * @public
   * @param {Function} reduceFn
   * @param {Object} options
   * options.initialValue {*} Initial value of the accumulator
   * @returns {*}
   */
  _query.reduce = function reduce (reduceFn, options) {
    if (typeof reduceFn !== 'function') {
      throw new Error('reduceFn is not a function');
    }

    _cloneIfNotAlreadyIs();

    var accumulator = options && options.initialValue !== undefined ? options.initialValue : null;
    for (var i = 0; i < data.length; i++) {
      accumulator = reduceFn.call(null, accumulator, data[i]);
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
  _query.mapReduce = function mapReduce (mapFn, reduceFn, options) {
    if (typeof mapFn !== 'function') {
      throw new Error('mapFn is not a function');
    }
    if (typeof reduceFn !== 'function') {
      throw new Error('reduceFn is not a function');
    }

    _cloneIfNotAlreadyIs();

    var newArray    = [];
    var accumulator = options && options.initialValue !== undefined ? options.initialValue : null;
    for (var i = 0; i < data.length; i++) {
      newArray[i] = mapFn.call(null, data[i], i, newArray);
      accumulator = reduceFn.call(null, accumulator, newArray[i]);
    }

    data = newArray;
    return accumulator;
  };

  /**
   * Apply a filter in js
   * @public
   * @param {Function} fn must return a boolean
   * @returns {CollectionResultSet}
   */
  _query.where = function where (fn) {
    if (typeof fn !== 'function') {
      throw new Error('fn is not a function');
    }

    _cloneIfNotAlreadyIs();

    var dataFiltered = _where(fn, data);

    data = dataFiltered;
    return _query;
  };

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
  _query.find = function find (query) {
    data = _find(query, data);
    return _query;
  };

  return _query;
}

lu_e = Query;
lu_e['operators'] = queryOpertors; // for tests

        
        return lu_e;
      })([_store_store_offline_js,_utils_js], {});
    
      var _store_dataQuery_store_collectionResultSet_js = (function(lu_i, lu_e) {
        var utils      = lu_i[0];
var storeUtils = lu_i[1];

var queryResultSet = lu_i[2];

/**
 * View
 * @param {String} store
 */
function CollectionResultSet (store) {
  // Init result set
  var _store = storeUtils.getStore(store);

  if (_store.isStoreObject) {
    throw new Error('Cannot initialize a CollectionResultSet on a store object');
  }

  var _collection = storeUtils.getCollection(_store);
  var _data       = utils.clone(_collection.getAll());

  var _resultSet = queryResultSet(_data);
  return _resultSet;
}

lu_e = CollectionResultSet;

        
        return lu_e;
      })([_utils_js,_store_store_utils_js,_store_dataQuery_queryResultSet_js], {});
    
      var _store_dataQuery_store_dynamicView_js = (function(lu_i, lu_e) {
        var storeUtils          = lu_i[0];
var hooks               = lu_i[1];
var collectionResultSet = lu_i[2];
var queryResultSet      = lu_i[3];

/**
 * DynamicView that auto-update on store changes
 * @param {String} store
 * @param {Object} options
 * options.shouldNotInitialize
 */
function dynamicView (store, options) {
  var _store               = storeUtils.getStore(store);
  var _dynamicView         = { idIdx : {} };
  var _data                = [];
  var _hasBeenMaterialized = false;
  var _pipeline            = [];

  _dynamicView.shouldNotInitialize = options && options.shouldNotInitialize ? true : false;

  if (_store.isStoreObject) {
    throw new Error('Cannot initialize a DynamicView on a store object');
  }

  function _isMaterialized () {
    if (_hasBeenMaterialized || _dynamicView.shouldNotInitialize) {
      return;
    }

    _dynamicView.materialize();
  }

  /**
   * Update data with items
   * @param {Array|Object} items
   */
  function update (items) {
    if (!Array.isArray(items)) {
      items = [items];
    }

    var _itemsFiltered = _runPipeline(items);

    var _index = _dynamicView.idIdx;
    for (var i = 0, len = _itemsFiltered.length; i < len; i++) {
      var _item = _itemsFiltered[i];
      if (_index[_item._id] != null) {
        _data.splice(_index[_item._id], 1, _item);
        continue;
      }

      _index[_item._id] = _data.length;
      _data.push(_item);
    }
  }

  /**
   * Move index when an item is removed from the view
   * @param {Int} index
   */
  function _moveIndex (index) {
    for (var i = index, len = _data.length; i < len; i++) {
      _dynamicView.idIdx[_data[i]._id]--;
    }
  }

  /**
   * Remove items from data
   * @param {Array|Object} items
   */
  function remove (items) {
    if (!Array.isArray(items)) {
      items = [items];
    }

    var _index = _dynamicView.idIdx;
    for (var i = 0, len = items.length; i < len; i++) {
      if (_index[items[i]._id] == null) {
        continue;
      }

      _data.splice(_index[items[i]._id], 1);
      _moveIndex(_index[items[i]._id]);
      _index[items[i]._id] = null;
      continue;
    }
  }

  /**
   * Reset view
   */
  function reset () {
    _data.splice(0);
    _dynamicView.idIdx   = {};
    _pipeline            = [];
    _hasBeenMaterialized = false;
  }

  /**
   * Count items
   * @public
   */
  _dynamicView.count = function count () {
    _isMaterialized();
    return _data.length;
  };

  /**
   * Return views data
   * @public
   */
  _dynamicView.data = function data () {
    _isMaterialized();
    return _data;
  };

  /**
   * Materialize view (internal use)
   * @pulbic
   */
  _dynamicView.materialize = function materialize () {
    var _resultSet = collectionResultSet(store);

    for (var i = 0; i < _pipeline.length; i++) {
      var _criteria = _pipeline[i];
      _resultSet[_criteria.type].call(null, _criteria.args);
    }

    _data                = _resultSet.data();
    _hasBeenMaterialized = true;
  };

  /**
   * Push find in pipeline
   * @public
   * @param {Object} queryResultSet find queryResultSet object from CollectionResultSet.find
   * @param {*} uid unique identifiant for the find
   * @returns {DynamicView}
   */
  _dynamicView.applyFindCriteria = function applyFindCriteria (queryResultSet, uid) {
    _pipeline.push({ id : uid, args : queryResultSet, type : 'find' });
    return _dynamicView;
  };
  /**
   * Push where in pipeline
   * @public
   * @param {Function} whereFn where function
   * @param {*} uid unique identifiant for the find
   * @returns {DynamicView}
   */
  _dynamicView.applyWhereCriteria = function applyWhereCriteria (whereFn, uid) {
    _pipeline.push({ id : uid, args : whereFn, type : 'where' });
    return _dynamicView;
  };
  /**
   * Push sort in pipeline
   * @public
   * @param {String|Array} sort
   * @param {*} uid unique identifiant for the find
   * @returns {DynamicView}
   */
  _dynamicView.applySortCriteria = function applySortCriteria (sort, uid) {
    _pipeline.push({ id : uid, args : sort, type : 'sort' });
    return _dynamicView;
  };

  /**
   * Remove a criteria
   * @param {*} uid unique identifiant for the criteria to remove
   * @returns {DynamicView}
   */
  _dynamicView.removeCriteria = function removeCriteria (uid) {
    for (var i = 0, len =_pipeline.length; i < len; i++) {
      if (_pipeline[i].id === uid && uid) {
        _pipeline.splice(i, 1);
        break;
      }
    }

    return _dynamicView;
  };
  /**
   * Remove all criterias
   * @returns {DynamicView}
   */
  _dynamicView.removeCriterias = function removeCriterias () {
    _pipeline = [];
    return _dynamicView;
  };

  function _runPipeline (data) {
    var _resultSet = queryResultSet(data, { shouldClone : false });

    for (var i = 0; i < _pipeline.length; i++) {
      var _criteria = _pipeline[i];
      _resultSet[_criteria.type].call(null, _criteria.args);
    }

    return _resultSet.data();
  }

  /**
   * Return a query object
   * @public
   * @returns {QueryResultSet}
   */
  _dynamicView.resultSet = function resultSet () {
    return queryResultSet(_data);
  };

  /**
   * Destroy view: remove hooks
   */
  _dynamicView.destroy = function destroy () {
    hooks.removeHook('get@'    + _store.name, update);
    hooks.removeHook('insert@' + _store.name, update);
    hooks.removeHook('update@' + _store.name, update);
    hooks.removeHook('delete@' + _store.name, remove);
    hooks.removeHook('reset@'  + _store.name, reset);
  };

  hooks.hook('get@'    + _store.name, update);
  hooks.hook('insert@' + _store.name, update);
  hooks.hook('update@' + _store.name, update);
  hooks.hook('delete@' + _store.name, remove);
  hooks.hook('reset@'  + _store.name, reset);

  /**
   * Expose for internal use
   */
  _dynamicView._update = update;
  _dynamicView._remove = remove;

  return _dynamicView;
}

lu_e = dynamicView;

        
        return lu_e;
      })([_store_store_utils_js,_store_store_hook_js,_store_dataQuery_store_collectionResultSet_js,_store_dataQuery_queryResultSet_js], {});
    
      var _devtools_js = (function(lu_i, lu_e) {
        /**
 * Send data to devtools
 * @param {*} data
 */
function send (data) {
  var event = new CustomEvent('lunaris-devtools', {
    detail : data
  });
  window.dispatchEvent(event);
}

lu_e = {
  send : send
};

        
        return lu_e;
      })([], {});
    
      var _index_js = (function(lu_i, lu_e) {
        var hook                = lu_i[0];
var store               = lu_i[1];
var storeSynchro        = lu_i[2];
var storeUtils          = lu_i[3];
var lunarisExports      = lu_i[4];
var collection          = lu_i[5];
var utils               = lu_i[6];
var logger              = lu_i[7];
var http                = lu_i[8];
var offline             = lu_i[9];
var cache               = lu_i[10];
var transaction    	    = lu_i[11];
var websocket           = lu_i[12];
var localStorageDriver  = lu_i[13];
var invalidate          = lu_i[14];
var lazyLoad            = lu_i[15];
var collectionResultSet = lu_i[16];
var dynamicView         = lu_i[17];
var devtools            = lu_i[18];

utils.getTranslatedStoreName = storeUtils.getTranslatedStoreName;

offline.pushOfflineHttpTransactions = storeSynchro.pushOfflineHttpTransactions,
offline.getLastSyncDate             = storeSynchro.getLastSyncDate,
offline.load                        = store.load;

lu_e = {
  _stores             : lunarisExports._stores,
  _collection         : collection.collection,
  _cache              : cache,
  _resetVersionNumber : collection.resetVersionNumber,
  _indexedDB          : localStorageDriver.indexedDB,
  _removeAllHooks     : hook.removeAllHooks,
  _initStore          : lazyLoad.load,
  _register           : lazyLoad.register,

  collectionResultSet : collectionResultSet,
  dynamicView         : dynamicView,

  devtools : devtools,

  utils  : utils,
  logger : logger,

  hook           : hook.hook,
  removeHook     : hook.removeHook,
  pushToHandlers : hook.pushToHandlers,

  http         : http,
  websocket    : websocket,
  offline      : offline,
  localStorage : localStorageDriver.localStorage,

  get             : store.get,
  getOne          : store.getOne,
  insert          : store.insert,
  update          : store.update,
  upsert          : store.upsert,
  delete          : store.delete,
  load            : store.load,
  clear           : store.clear,
  rollback        : store.rollback,
  getDefaultValue : store.getDefaultValue,
  validate        : store.validate,
  setPagination   : store.setPagination,
  createUrl       : store.createUrl,
  begin           : transaction.begin,
  commit          : transaction.commit,
  invalidate      : invalidate.invalidate,

  invalidations : {
    init           : invalidate.init,
    compute        : invalidate.computeInvalidations,
    on             : invalidate.on,
    _invalidations : invalidate.invalidations,
    /**
    * Get invalidations and compute
    */
    getAndCompute  : function () {
      lunaris.websocket.unsubscribe('invalidations');
      websocket.subscribe('invalidations', function (serverInvalidations) {
        invalidate.computeInvalidations(serverInvalidations.data, Object.keys(lunarisExports._stores));
      });

      websocket.send('invalidations');
    }
  },

  OPERATIONS : utils.OPERATIONS,
  exports    : lunarisExports,
  get constants () { return lunarisExports.constants; }
};

        
        return lu_e;
      })([_store_store_hook_js,_store_store_js,_store_store_synchronisation_js,_store_store_utils_js,_exports_js,_store_store_collection_js,_utils_js,_logger_js,_http_js,_offline_js,_cache_js,_store_store_transaction_js,_websocket_js,_localStorageDriver_js,_invalidate_js,_store_crud__lazyLoad_js,_store_dataQuery_store_collectionResultSet_js,_store_dataQuery_store_dynamicView_js,_devtools_js], {});
    
          global.lunaris = _index_js;
        })(typeof(module)!=='undefined'?global:this);
      