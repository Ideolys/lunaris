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

    prevState.values.push(value);
    prevState.values.sort();
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

    var _index = prevState.values.indexOf(value);
    if (_index !== -1) {
      prevState.values.splice(_index, 1);
      prevState.values.sort();
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

    prevState.values.push(value);
    prevState.values.sort();
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

    var _index = prevState.values.indexOf(value);
    if (_index !== -1) {
      prevState.values.splice(_index, 1);
      prevState.values.sort();
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
  sum   : sum,
  count : count,
  avg   : avg,
  min   : min,
  max   : max
};

exports.aggregates = aggregates;
