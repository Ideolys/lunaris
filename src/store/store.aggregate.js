var utils = require('../utils.js');
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

exports.aggregates = aggregates;
