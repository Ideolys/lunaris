const cache = require('../src/cache');
const md5   = require('../src/md5');

describe('cache', () => {

  beforeEach(() => {
    cache.clear();
  });

  it('getter should be defined', () => {
    should(cache).be.an.Object();
    should(cache.add).be.a.Function();
    should(cache._cache).be.a.Function();
    should(cache.get).be.a.Function();
    should(cache.invalidate).be.a.Function();
    should(cache.clear).be.a.Function();
  });

  describe('add', () => {

    it ('should add to the cache', () => {
      var _expectedValue = [
        {
          hash   : '6666cd76f96956469e7be39d750cc7d9',
          values : [1, 2],
          stores : ['store1']
        }
      ];
      cache.add('store1', md5('/'), [1, 2]);
      should(cache._cache()).eql(_expectedValue);
    });

    it ('should add to the cache an other store', () => {
      cache.add('store1', md5('/'), [1, 2]);
      should(cache._cache()).eql([{
        hash   : '6666cd76f96956469e7be39d750cc7d9',
        values : [1, 2],
        stores : ['store1']
      }]);
      cache.add('store2', md5('/'), [1, 2]);
      should(cache._cache()).eql([{
        hash   : '6666cd76f96956469e7be39d750cc7d9',
        values : [1, 2],
        stores : ['store1', 'store2']
      }]);
    });

    it ('should add the pagination values and the result _values', () => {
      var _expectedValue = [
        {
          hash   : '35e78095e9f3eec8249a8921105f2200',
          values : [1, 2],
          stores : ['store1']
        }
      ];
      cache.add('store1', md5('/?offset=0&limit=2'), [1, 2]);
      should(cache._cache()).eql(_expectedValue);
    });

    it('should clear the cache', () => {
      cache.add('/', md5('/?offset=0&limit=2'), [1, 2]);
      cache.clear();
      should(cache._cache()).eql([]);
    });

    it ('should update the previous cache value', () => {
      cache.add('store1', md5('/?offset=0&limit=2'), [1, 2]);
      should(cache._cache()).eql([
        {
          hash   : '35e78095e9f3eec8249a8921105f2200',
          values : [1, 2],
          stores : ['store1']
        }
      ]);

      cache.add('store1', md5('/?offset=0&limit=2'), []);
      should(cache._cache()).eql([
        {
          hash   : '35e78095e9f3eec8249a8921105f2200',
          values : [],
          stores : ['store1']
        }
      ]);
    });
  });

  describe('get', () => {

    it('should return null if no cached values', () => {
      should(cache.get('store1', md5('/?offset=0&limit=2'))).eql(null);
    });

    it('should return an array', () => {
      cache.add('store1', md5('/?offset=0&limit=2'), []);
      should(cache.get('store1', md5('/?offset=0&limit=2'))).eql([]);
    });

    it('should compare arrays', () => {
      cache.add('store1', md5('/?offset=[false]'), [1]);
      should(cache.get('store1', md5('/?offset=[false]'))).eql([1]);
    });

    it('should return the cached values', () => {
      cache.add('/', md5('/?offset=0&limit=2'), [1, 2]);
      should(cache.get('/', md5('/?offset=0&limit=2'))).eql([1, 2]);
    });

    it('should return the cached values : multiple cached values', () => {
      cache.add('/', md5('/?offset=0&limit=2'), [1, 2]);
      cache.add('/', md5('/?offset=2&limit=4'), [3, 4]);
      cache.add('/', md5('/?offset=4&limit=6'), [5, 6]);

      should(cache.get('/', md5('/?offset=0&limit=2'))).eql([1, 2]);
      should(cache.get('/', md5('/?offset=2&limit=4'))).eql([3, 4]);
      should(cache.get('/', md5('/?offset=4&limit=6'))).eql([5, 6]);
    });

    it('should return the cached values : multiple different cached values', () => {
      cache.add('/', md5('/?offset=0&limit=2&search=bla'), [1, 2]);
      cache.add('/', md5('/?offset=0&limit=2'), [1, 2, 3, 4]);
      cache.add('/', md5('/?offset=4&limit=6&mode=1'), [2, 3]);

      should(cache.get('/', md5('/?offset=0&limit=2&search=bla'))).eql([1, 2]);
      should(cache.get('/', md5('/?offset=0&limit=2'))).eql([1, 2, 3, 4]);
      should(cache.get('/', md5('/?offset=4&limit=6&mode=1'))).eql([2, 3]);
    });
  });

  describe('invalidate', () => {
    it('should invalidate a store', () => {
      cache.add('store1', md5('/?offset=0&limit=2'), [1, 2]);

      cache.invalidate('store1');
      should(cache._cache()).eql([]);
    });

    it('should invalidate the cache for the two stores', () => {
      cache.add('store1', md5('/'), [1, 2]);
      cache.add('store2', md5('/'), [1, 2]);

      cache.invalidate('store1');
      should(cache._cache()).eql([]);
    });
  });

});
