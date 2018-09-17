const aggregates = require('../src/store/store.aggregate').aggregates;

describe('aggregate', () => {

  it('should be an object', () => {
    should(aggregates).be.an.Object();
  });

  it('sum should be defined', () => {
    should(aggregates.sum).be.an.Object();
    should(aggregates.sum.type).eql('number');
    should(aggregates.sum.init).be.an.Object();
    should(aggregates.sum.init).eql({ start : 0 });
    should(aggregates.sum.add).be.a.Function();
    should(aggregates.sum.remove).be.a.Function();
  });

  describe('sum', () => {

    it('should start at 0', () => {
      var _aggregate = aggregates.sum;
      should(_aggregate.init.start).be.a.Number();
      should(_aggregate.init.start).eql(0);
    });

    it('should add value and return the sum', () => {
      var _aggregate = aggregates.sum;
      var _sum       = _aggregate.add(0, 2);
      should(_sum).eql(2);
      _sum = _aggregate.add(2, 3);
      should(_sum).eql(5);
    });

    it('should remove value and return the sum', () => {
      var _aggregate = aggregates.sum;
      var _sum       = _aggregate.add(0, 2);
      should(_sum).eql(2);
      _sum = _aggregate.remove(2, 2);
      should(_sum).eql(0);
    });
  });
});
