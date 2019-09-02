const transaction = require('../src/store/store.transaction');

describe('transaction', () => {

  describe('transction.reduce', () => {

    it('should return an empty array if no events', () => {
      should(transaction.reduce(
        0,
        [],
        [],
        {}
      )).eql([]);
    });

    it('should not crash if nothing', () => {
      should(transaction.reduce(
        0,
        [],
        [],
        {}
      )).eql([]);
    });

    it('should reduce with level at 1', () => {
      should(transaction.reduce(
        1,
        [
          '@storeA.filter.a',
          '@storeB.filter.b',
          '@storeC.filter.c',
        ],
        [
          '@storeA',
          '@storeB',
          '@storeC'
        ],
        {
          '@storeA' : ['@storeA.filter.a'],
          '@storeB' : ['@storeB.filter.b'],
          '@storeC' : ['@storeC.filter.c'],
        }
      )).eql([
        '@storeA.filter.a',
        '@storeB.filter.b',
        '@storeC.filter.c',
      ]);
    });

    it('should reduce with level at 1 with 2 events for a store', () => {
      should(transaction.reduce(
        1,
        [
          '@storeA.filter.a',
          '@storeB.filter.b'
        ],
        [
          '@storeA'
        ],
        {
          '@storeA' : ['@storeA.filter.a', '@storeB.filter.b'],
        }
      )).eql([
        '@storeA.filter.a'
      ]);
    });

    it('should reduce with level at 1 with 2 events for multiple stores', () => {
      should(transaction.reduce(
        1,
        [
          '@storeA.filter.a',
          '@storeA.filter.b',
          '@storeB.filter.a',
          '@storeB.filter.b'
        ],
        [
          '@storeA',
          '@storeB'
        ],
        {
          '@storeA' : ['@storeA.filter.a', '@storeA.filter.b'],
          '@storeB' : ['@storeB.filter.a', '@storeB.filter.b']
        }
      )).eql([
        '@storeA.filter.a',
        '@storeB.filter.a'
      ]);
    });

    it('should reduce with level at 2', () => {
      should(transaction.reduce(
        2,
        [
          '@storeA.filter.a',
          '@storeB.filter.b',
        ],
        [
          '@storeA',
          '@storeB'
        ],
        {
          '@storeA' : ['@storeA.filter.a', '@storeB.filter.b'],
          '@storeB' : ['@storeB.filter.b']
        }
      )).eql([
        '@storeB.filter.b'
      ]);
    });

    it('should reduce with tree stores and 2 with a common filter', () => {
      should(transaction.reduce(
        3,
        [
          '@storeA.filter.a',
          '@storeB.filter.b',
          '@storeC.filter.c',
        ],
        [
          '@storeA',
          '@storeB',
          '@storeC'
        ],
        {
          '@storeA' : ['@storeA.filter.a', '@storeB.filter.b'],
          '@storeB' : ['@storeB.filter.b'],
          '@storeC' : ['@storeC.filter.c'],
        }
      )).eql([
        '@storeB.filter.b',
        '@storeC.filter.c',
      ]);
    });

    it('should reduce with four stores and 2 with a common filter', () => {
      should(transaction.reduce(
        4,
        [
          '@storeA.filter.a',
          '@storeB.filter.b',
          '@storeC.filter.c',
          '@storeD.filter.d',
        ],
        [
          '@storeA',
          '@storeB',
          '@storeC',
          '@storeD',
        ],
        {
          '@storeA' : ['@storeA.filter.a', '@storeB.filter.b'],
          '@storeB' : ['@storeB.filter.b'],
          '@storeC' : ['@storeC.filter.c'],
          '@storeD' : ['@storeD.filter.d'],
        }
      )).eql([
        '@storeB.filter.b',
        '@storeC.filter.c',
        '@storeD.filter.d',
      ]);
    });

    it('should reduce with four stores which have common filters by pair', () => {
      should(transaction.reduce(
        4,
        [
          '@storeA.filter.a',
          '@storeB.filter.b',
          '@storeC.filter.c',
          '@storeD.filter.d',
        ],
        [
          '@storeA',
          '@storeB',
          '@storeC',
          '@storeD',
        ],
        {
          '@storeA' : ['@storeA.filter.a', '@storeB.filter.b'],
          '@storeB' : ['@storeB.filter.b'],
          '@storeC' : ['@storeC.filter.c'],
          '@storeD' : ['@storeD.filter.d', '@storeC.filter.c'],
        }
      )).eql([
        '@storeB.filter.b',
        '@storeC.filter.c',
      ]);
    });

    it('should reduce with four stores which have common filters 3 > 2 > 1', () => {
      should(transaction.reduce(
        4,
        [
          '@storeA.filter.a',
          '@storeB.filter.b',
          '@storeC.filter.c',
          '@storeD.filter.d',
        ],
        [
          '@storeA',
          '@storeB',
          '@storeC',
          '@storeD',
        ],
        {
          '@storeA' : ['@storeA.filter.a', '@storeB.filter.b', '@storeC.filter.c'],
          '@storeB' : ['@storeB.filter.b'],
          '@storeC' : ['@storeC.filter.c'],
          '@storeD' : ['@storeD.filter.d', '@storeC.filter.c'],
        }
      )).eql([
        '@storeC.filter.c',
        '@storeB.filter.b',
      ]);
    });
  });
});
