const cache = require('../src/store/store.cache.js');

describe('store cache', () => {

  it('getter should be defined', () => {
    should(cache.cache).be.ok();
    should(cache.cache).be.a.Function();
  });

  it('should return an object', () => {
    should(cache.cache()).be.an.Object();
  });

  it('should return a cache object', () => {
    var _cache = cache.cache();
    should(_cache.add).be.a.Function();
    should(_cache.cache).be.a.Function();
    should(_cache.get).be.a.Function();
    should(_cache.invalidate).be.a.Function();
    should(_cache.clear).be.a.Function();
  });

  describe('add', () => {

    it ('should add nothing', () => {
      var _cache         = cache.cache();
      var _expectedValue = [];
      _cache.add({}, [1, 2]);
      should(_cache.cache()).eql(_expectedValue);
    });

    it ('should add the pagination values and the result _ids', () => {
      var _cache         = cache.cache();
      var _expectedValue = [[
        {
          offset : 0,
          limit  : 2,
        },
        [1, 2]
      ]];
      _cache.add({
        offset : 0,
        limit  : 2,
      },
      [1, 2]);
      should(_cache.cache()).eql(_expectedValue);
    });

    it('should clear the cache', () => {
      var _cache         = cache.cache();
      _cache.add({
        offset : 0,
        limit  : 2,
      },
      [1, 2]);
      _cache.clear();
      should(_cache.cache()).eql([]);
    });

    it ('should update the previous cache value', () => {
      var _cache         = cache.cache();
      var _expectedValue = [[
        {
          offset : 0,
          limit  : 2,
        },
        [1, 2]
      ]];
      _cache.add({
        offset : 0,
        limit  : 2,
      },
      [1, 2]);
      should(_cache.cache()).eql(_expectedValue);

      _cache.add({
        offset : 0,
        limit  : 2,
      },
      [1]);
      _expectedValue[0][1].splice(1, 1);
      should(_cache.cache()).eql(_expectedValue);
    });
  });

  describe('get', () => {

    it('should return null if no cached values', () => {
      var _cache = cache.cache();
      should(_cache.get({
        offset : 0,
        limit  : 2,
      })).eql(null);
    });

    it('should return an array', () => {
      var _cache = cache.cache();

      _cache.add({
        offset : 0,
        limit  : 2,
      },
      []);

      should(_cache.get({
        offset : 0,
        limit  : 2,
      })).eql([]);
    });

    it('should compare arrays', () => {
      var _cache = cache.cache();

      _cache.add({
        offset : [false],
      },
      [1]);

      should(_cache.get({
        offset : [false],
      })).eql([1]);
    });

    it('should return the cached ids', () => {
      var _cache = cache.cache();

      _cache.add({
        offset : 0,
        limit  : 2,
      },
      [1, 2]);

      should(_cache.get({
        offset : 0,
        limit  : 2,
      })).eql([1, 2]);
    });

    it('should return the cached ids : multiple cached values', () => {
      var _cache = cache.cache();

      _cache.add({
        offset : 0,
        limit  : 2,
      },
      [1, 2]);
      _cache.add({
        offset : 2,
        limit  : 4,
      },
      [3, 4]);
      _cache.add({
        offset : 4,
        limit  : 6,
      },
      [5, 6]);

      should(_cache.get({
        offset : 0,
        limit  : 2,
      })).eql([1, 2]);
      should(_cache.get({
        offset : 2,
        limit  : 4,
      })).eql([3, 4]);
      should(_cache.get({
        offset : 4,
        limit  : 6,
      })).eql([5, 6]);
    });

    it('should return the cached ids : multiple different cached values', () => {
      var _cache = cache.cache();

      _cache.add({
        offset : 0,
        limit  : 2,
        search : 'bla'
      },
      [1, 2]);
      _cache.add({
        offset : 0,
        limit  : 2,
      },
      [1, 2, 3, 4]);
      _cache.add({
        offset : 4,
        limit  : 6,
        mode   : 1
      },
      [2, 3]);

      should(_cache.get({
        offset : 0,
        limit  : 2,
        search : 'bla',
      })).eql([1, 2]);
      should(_cache.get({
        offset : 0,
        limit  : 2,
      })).eql([1, 2, 3, 4]);
      should(_cache.get({
        offset : 4,
        limit  : 6,
        mode   : 1,
      })).eql([2, 3]);
    });

  });

  describe('invalidate', () => {
    it('should invalidate an id', () => {
      var _cache = cache.cache();

      _cache.add({
        offset : 0,
        limit  : 2,
      },
      [1, 2]);

      _cache.invalidate(1);
      should(_cache.cache()).eql([[
        {
          offset : 0,
          limit  : 2,
        },
        [2]
      ]]);
    });

    it('should invalidate id  in multiple values', () => {
      var _cache = cache.cache();

      _cache.add({
        offset : 0,
        limit  : 2,
        search : 'bla'
      },
      [1, 2]);
      _cache.add({
        offset : 0,
        limit  : 2,
      },
      [1, 2, 3, 4]);
      _cache.add({
        offset : 4,
        limit  : 6,
        mode   : 1
      },
      [2, 3]);

      _cache.invalidate(2);
      should(_cache.cache()).eql([
        [
          {
            offset : 0,
            limit  : 2,
            search : 'bla'
          },
          [1]
        ],
        [
          {
            offset : 0,
            limit  : 2,
          },
          [1, 3, 4]
        ],
        [
          {
            offset : 4,
            limit  : 6,
            mode   : 1
          },
          [3]
        ]
      ]);
    });

    it('should invalidate multiple ids  in multiple values', () => {
      var _cache = cache.cache();

      _cache.add({
        offset : 0,
        limit  : 2,
        search : 'bla'
      },
      [1, 2]);
      _cache.add({
        offset : 0,
        limit  : 2,
      },
      [1, 2, 3, 4]);
      _cache.add({
        offset : 4,
        limit  : 6,
        mode   : 1
      },
      [2, 3]);

      _cache.invalidate([2, 3]);
      should(_cache.cache()).eql([
        [
          {
            offset : 0,
            limit  : 2,
            search : 'bla'
          },
          [1]
        ],
        [
          {
            offset : 0,
            limit  : 2,
          },
          [1, 4]
        ]
      ]);
    });

    it('should invalidate the cached filter values', () => {
      var _cache = cache.cache();

      _cache.add({
        offset : 0,
        limit  : 2,
      },
      [1, 2]);

      _cache.invalidate(1, true);
      should(_cache.cache()).eql([]);
    });

    it('should invalidate multiple ids and the cached filter values', () => {
      var _cache = cache.cache();

      _cache.add({
        offset : 0,
        limit  : 2,
        search : 'bla'
      },
      [1, 2]);
      _cache.add({
        offset : 0,
        limit  : 2,
      },
      [1, 2, 3, 4]);
      _cache.add({
        offset : 4,
        limit  : 6,
        mode   : 1
      },
      [2, 3]);

      _cache.invalidate([3, 4], true);
      should(_cache.cache()).eql([
        [
          {
            offset : 0,
            limit  : 2,
            search : 'bla'
          },
          [1, 2]
        ]
      ]);
    });
  });

  describe('set', () => {
    it('should be defined', () => {
      var _cache = cache.cache();
      should(_cache.set).be.a.Function();
    });

    it('should set the value', () => {
      var _cache = cache.cache();
      should(_cache.cache()).eql([]);
      _cache.set([[{ test : 1 }, []]]);
      should(_cache.cache()).eql([
        [{ test : 1 }, []]
      ]);
    });
  });

});
