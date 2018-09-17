var aggregates = {
  sum : {
    type : 'number',
    init : {
      start : 0
    },

    add : function (prevValue, value) {
      return (prevValue || this.init.start) + (value || this.init.start);
    },

    remove : function (prevValue, value) {
      return (prevValue || this.init.start) - (value || this.init.start);
    }
  }
};

exports.aggregates = aggregates;
