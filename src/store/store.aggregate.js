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
};

exports.aggregates = aggregates;
