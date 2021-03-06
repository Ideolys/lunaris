const aggregates = require('../src/store/store.aggregate').aggregates;

describe('aggregate', () => {

  it('should be an object', () => {
    should(aggregates).be.an.Object();
  });

  it('sumAgg should be defined', () => {
    should(aggregates.sumAgg).be.an.Object();
    should(aggregates.sumAgg.type).eql('number');
    should(aggregates.sumAgg.init).be.an.Object();
    should(aggregates.sumAgg.init).eql({ start : 0 });
    should(aggregates.sumAgg.add).be.a.Function();
    should(aggregates.sumAgg.remove).be.a.Function();
  });

  it('getStarValue must be defined for each aggregate', () => {
    var _aggregates = Object.keys(aggregates);
    for (var i = 0; i < _aggregates.length; i++) {
      should(aggregates[_aggregates[i]].getStartValue).be.a.Function();
    }
  });

  describe('sumAgg', () => {

    it('should start at 0', () => {
      var _aggregate = aggregates.sumAgg;
      should(_aggregate.init.start).be.a.Number();
      should(_aggregate.init.start).eql(0);
    });

    it('should add value and return the state', () => {
      var _aggregate = aggregates.sumAgg;
      var _sum       = _aggregate.add(null, 2);
      should(_sum).eql({ value : 2 });
      _sum = _aggregate.add({ value : 2 }, 3);
      should(_sum).eql({ value : 5 });
    });

    it('should not increment the init value', () => {
      var _aggregate = aggregates.sumAgg;
      var _sum       = _aggregate.add(0, 1);
      should(_sum).eql({ value : 1 });
      should(_aggregate.init.start).eql(0);
    });

    it('should take undefined in paramters', () => {
      var _aggregate = aggregates.sumAgg;
      var _sum       = _aggregate.add({ value : 0 }, undefined);
      should(_sum).eql({ value : 0 });
    });

    it('should remove value and return the sum', () => {
      var _aggregate = aggregates.sumAgg;
      var _sum       = _aggregate.add(null, 2);
      should(_sum).eql({ value : 2 });
      _sum = _aggregate.remove({ value : 2 }, 2);
      should(_sum).eql({ value : 0 });
    });
  });

  describe('count', () => {

    it('should start at 0', () => {
      var _aggregate = aggregates.countAgg;
      should(_aggregate.init.start).be.a.Number();
      should(_aggregate.init.start).eql(0);
    });

    it('getStartValue should return 0', () => {
      var _aggregate = aggregates.countAgg;
      should(_aggregate.getStartValue()).be.a.Number();
      should(_aggregate.getStartValue()).eql(0);
    });

    it('should increment value and return the count', () => {
      var _aggregate = aggregates.countAgg;
      var _count       = _aggregate.add(null);
      should(_count).eql({ value : 1 });
      _count = _aggregate.add({ value : 1 });
      should(_count).eql({ value : 2 });
    });

    it('should not increment the init value', () => {
      var _aggregate = aggregates.countAgg;
      var _count       = _aggregate.add(null);
      should(_count).eql({ value : 1 });
      should(_aggregate.init.start).eql(0);
    });

    it('should take undefined in paramters', () => {
      var _aggregate = aggregates.countAgg;
      var _count       = _aggregate.add(null, undefined);
      should(_count).eql({ value : 1 });
    });

    it('should remove value and return the count', () => {
      var _aggregate = aggregates.countAgg;
      var _count     = _aggregate.add(null);
      should(_count).eql({ value : 1 });
      _count = _aggregate.remove({ value : 1 });
      should(_count).eql({ value : 0 });
    });
  });

  describe('countBoolTrue', () => {

    it('should start at 0', () => {
      var _aggregate = aggregates.countBoolTrueAgg;
      should(_aggregate.init.start).be.a.Number();
      should(_aggregate.init.start).eql(0);
    });

    it('getStartValue should return 0', () => {
      var _aggregate = aggregates.countBoolTrueAgg;
      should(_aggregate.getStartValue()).be.a.Number();
      should(_aggregate.getStartValue()).eql(0);
    });

    it('should increment value and return the countBoolTrue', () => {
      var _aggregate    =  aggregates.countBoolTrueAgg;
      var countBoolTrue = _aggregate.add(null, true);
      should(countBoolTrue).eql({ value : 1 });
      countBoolTrue = _aggregate.add({ value : 1 }, true);
      should(countBoolTrue).eql({ value : 2 });
      countBoolTrue = _aggregate.add({ value : 2 }, false);
      should(countBoolTrue).eql({ value : 2 });
    });

    it('should not increment the init value', () => {
      var _aggregate    = aggregates.countBoolTrueAgg;
      var countBoolTrue = _aggregate.add(null, true);
      should(countBoolTrue).eql({ value : 1 });
      should(_aggregate.init.start).eql(0);
    });

    it('should take undefined in paramters', () => {
      var _aggregate    = aggregates.countBoolTrueAgg;
      var countBoolTrue = _aggregate.add(null, undefined);
      should(countBoolTrue).eql({ value : 0 });
    });

    it('should remove value and return the countBoolTrue', () => {
      var _aggregate    = aggregates.countBoolTrueAgg;
      var countBoolTrue = _aggregate.add(null, true);
      should(countBoolTrue).eql({ value : 1 });
      countBoolTrue = _aggregate.remove({ value : 1 }, true);
      should(countBoolTrue).eql({ value : 0 });
    });

    it('should not crash if currentValue is 0', () => {
      var _aggregate    = aggregates.countBoolTrueAgg;
      var countBoolTrue = _aggregate.add(null, false);
      should(countBoolTrue).eql({ value : 0 });
    });
  });

  describe('avg', () => {

    it('should start at 0', () => {
      var _aggregate = aggregates.avgAgg;
      should(_aggregate.init.start).be.a.Number();
      should(_aggregate.init.start).eql(0);
    });

    it('getStartValue should return 0', () => {
      var _aggregate = aggregates.avgAgg;
      should(_aggregate.getStartValue()).be.a.Number();
      should(_aggregate.getStartValue()).eql(0);
    });

    it('should increment value and return the avg', () => {
      var _aggregate = aggregates.avgAgg;
      var _avg       = _aggregate.add(null, 2);
      should(_avg).eql({ value : 2, count : 1 });
      _avg = _aggregate.add({ value : 2, count : 1 }, 2);
      should(_avg).eql({ value : 2, count : 2 });
    });

    it('should not increment the init value', () => {
      var _aggregate = aggregates.avgAgg;
      var _avg       = _aggregate.add(null, 2);
      should(_avg).eql({ value : 2, count : 1 });
      should(_aggregate.init.start).eql(0);
      should(_aggregate.init.count).eql(0);
    });

    it('should take undefined in paramters', () => {
      var _aggregate = aggregates.avgAgg;
      var _avg       = _aggregate.add(null, undefined);
      should(_avg).eql({ value : 0, count : 1 });
    });

    it('should remove value and return the avg', () => {
      var _aggregate = aggregates.avgAgg;
      var _avg       = _aggregate.add(null, 2);
      should(_avg).eql({ value : 2, count : 1 });
      _avg = _aggregate.add({ value : 2, count : 1 }, 4);
      should(_avg).eql({ value : 3, count : 2 });
      _avg = _aggregate.remove({ value : 3, count : 2 }, 2);
      should(_avg).eql({ value : 4, count : 1 });
    });
  });

  describe('min', () => {

    it('should start at 0', () => {
      var _aggregate = aggregates.minAgg;
      should(_aggregate.init.start).eql(null);
    });

    it('getStartValue should return 0', () => {
      var _aggregate = aggregates.minAgg;
      should(_aggregate.getStartValue()).eql(null);
    });

    it('should set min value and return the min', () => {
      var _aggregate = aggregates.minAgg;
      var _min       = _aggregate.add(null, 2);
      should(_min).eql({ value : 2, values : [2] });
      _min = _aggregate.add({ value : 2, values : [2] }, 1);
      should(_min).eql({ value : 1, values : [1, 2] });
    });

    it('should not alter the init value', () => {
      var _aggregate = aggregates.minAgg;
      var _min       = _aggregate.add(null, 2);
      should(_min).eql({ value : 2, values : [2] });
      should(_aggregate.init.start).eql(null);
      should(_aggregate.init.values).eql([]);
    });

    it('should take undefined in paramters', () => {
      var _aggregate = aggregates.minAgg;
      var _min       = _aggregate.add(null, undefined);
      should(_min).eql({ value : null, values : [] });
    });

    it('should remove value and return the min', () => {
      var _aggregate = aggregates.minAgg;
      var _min       = _aggregate.add(null, 2);
      should(_min).eql({ value : 2, values : [2] });
      _min = _aggregate.add({ value : 2, values : [2] }, 4);
      should(_min).eql({ value : 2, values : [2, 4] });
      _min = _aggregate.remove({ value : 2, values : [2, 4] }, 2);
      should(_min).eql({ value : 4, values : [4] });
    });

    it('should do not crash if the values does not exist', () => {
      var _aggregate = aggregates.minAgg;
      var _min       = _aggregate.add(null, 2);
      should(_min).eql({ value : 2, values : [2] });
      _min = _aggregate.add({ value : 2, values : [2] }, 4);
      should(_min).eql({ value : 2, values : [2, 4] });
      _min = _aggregate.remove({ value : 2, values : [2, 4] }, 5);
      should(_min).eql({ value : 2, values : [2, 4] });
    });
  });

  describe('max', () => {

    it('should start at 0', () => {
      var _aggregate = aggregates.maxAgg;
      should(_aggregate.init.start).eql(null);
    });

    it('getStartValue should return 0', () => {
      var _aggregate = aggregates.maxAgg;
      should(_aggregate.getStartValue()).eql(null);
    });

    it('should set max value and return the max', () => {
      var _aggregate = aggregates.maxAgg;
      var _max       = _aggregate.add(null, 2);
      should(_max).eql({ value : 2, values : [2] });
      _max = _aggregate.add({ value : 2, values : [2] }, 1);
      should(_max).eql({ value : 2, values : [1, 2] });
    });

    it('should not alter the init value', () => {
      var _aggregate = aggregates.maxAgg;
      var _max       = _aggregate.add(null, 2);
      should(_max).eql({ value : 2, values : [2] });
      should(_aggregate.init.start).eql(null);
      should(_aggregate.init.values).eql([]);
    });

    it('should take undefined in paramters', () => {
      var _aggregate = aggregates.maxAgg;
      var _max       = _aggregate.add(null, undefined);
      should(_max).eql({ value : null, values : [] });
    });

    it('should remove value and return the max', () => {
      var _aggregate = aggregates.maxAgg;
      var _max       = _aggregate.add(null, 2);
      should(_max).eql({ value : 2, values : [2] });
      _max = _aggregate.add({ value : 2, values : [2] }, 4);
      should(_max).eql({ value : 4, values : [2, 4] });
      _max = _aggregate.remove({ value : 4, values : [2, 4] }, 4);
      should(_max).eql({ value : 2, values : [2] });
    });

    it('should do not crash if the values does not exist', () => {
      var _aggregate = aggregates.maxAgg;
      var _max       = _aggregate.add(null, 2);
      should(_max).eql({ value : 2, values : [2] });
      _max = _aggregate.add({ value : 2, values : [2] }, 4);
      should(_max).eql({ value : 4, values : [2, 4] });
      _max = _aggregate.remove({ value : 4, values : [2, 4] }, 5);
      should(_max).eql({ value : 4, values : [2, 4] });
    });
  });
});
