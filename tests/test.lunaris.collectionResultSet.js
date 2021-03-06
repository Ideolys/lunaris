const lunarisExports     = require('../src/exports');
lunarisExports.isBrowser = false;
const testUtils          = require('./testUtils');
const initStore          = testUtils.initStore;
const buildLunaris       = require('../lib/builder').buildLunaris;
const dayjs              = require('dayjs');
const pako               = require('pako');
const timsort            = require('timsort');
const resultSetOperators = require('../src/store/dataQuery/queryResultSet').operators;
const fs                 = require('fs');
const path               = require('path');

const window = {};
var lunarisGlobal  = {};

describe('collectionResultSet', () => {

  before(done => {
    eval(fs.readFileSync(path.join(__dirname, '..', 'dist', 'lunaris.js'), 'utf-8'));

    lunaris.exports.setOptions({
      isProduction : false,
      isBrowser    : false
    });

    lunarisGlobal = lunaris;

    lunarisGlobal._stores.db         = initStore('db');
    lunarisGlobal._stores.db.isLocal = true;

    done();
  });

  beforeEach(() => {
    lunarisGlobal._stores.db.data.clear();
  });

  it('should be defined', () => {
    should(lunarisGlobal.collectionResultSet).be.a.Function();
  });

  it('should throw an error if store does not exist : no @', () => {
    try {
      lunarisGlobal.collectionResultSet('undefinedStore');
    }
    catch (e) {
      should(e.message).eql('The store "undefinedStore" has not been defined');
    }
  });

  it('should throw an error if store does not exist', () => {
    try {
      lunarisGlobal.collectionResultSet('@undefinedStore');
    }
    catch (e) {
      should(e.message).eql('The store "undefinedStore" has not been defined');
    }
  });

  it('should not throw an error if store exists', () => {
    try {
      lunarisGlobal.collectionResultSet('@db');
    }
    catch (e) {
      should(e).eql(undefined);
    }
  });

  it('should throw an error if store is a store object', () => {
    try {
      lunarisGlobal._stores.db2               = initStore('db2');
      lunarisGlobal._stores.db2.isStoreObject = true;
      lunarisGlobal.collectionResultSet('@db2');
    }
    catch (e) {
      should(e.message).eql('Cannot initialize a CollectionResultSet on a store object');
    }
  });

  it('should have defined public properties', () => {
    should(lunarisGlobal.collectionResultSet('@db')).keys(
      'count',
      'data',
      'map',
      'sort',
      'where',
      'reduce',
      'mapReduce',
      'find'
    );
  });

  describe('data', () => {

    it('should return all data of the collection by default', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').data();

      should(res).have.lengthOf(3);
      should(res).eql(items);
    });

    it('shouold be the end', () => {
      let res = lunarisGlobal.collectionResultSet('@db').data();
      should(res.data).not.ok();
    });

    it('should clone the data', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').data();

      res[0].label = res[0].label.toUpperCase();
      should(res[0]).not.eql(items[0]);
    });

    it('should freeze', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').data({ freeze : true });

      res.forEach(item => {
        should(Object.isFrozen(item)).eql(true);
      });
    });

  });

  describe('sort', () => {

    it('should be chainable', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').sort('label');
      should(res.data).be.ok();
    });

    it('should not sort undefined root attribute', () => {
      let items = [
        { id : 2, label : 'b' },
        { id : 1, label : 'c' },
        { id : 3, label : 'a' }
      ];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').sort(['label', 'category']).data();

      should(res).have.lengthOf(3);
      should(res[0].id).eql(3);
      should(res[1].id).eql(2);
      should(res[2].id).eql(1);
    });

    it('should sort the data : ASC default & one sort', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').sort('label').data();

      should(res).have.lengthOf(3);
      should(res[0].label).eql('a');
      should(res[1].label).eql('b');
      should(res[2].label).eql('c');
    });

    it('should sort the data : ASC & one sort', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').sort('label ASC').data();

      should(res).have.lengthOf(3);
      should(res[0].label).eql('a');
      should(res[1].label).eql('b');
      should(res[2].label).eql('c');
    });

    it('should sort the data : DESC & one sort', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').sort('label DESC').data();

      should(res).have.lengthOf(3);
      should(res[0].label).eql('c');
      should(res[1].label).eql('b');
      should(res[2].label).eql('a');
    });

    it('should sort the data : ASC, multiple sorts', () => {
      let items = [
        { id : 2, label : 'b', type : 2 },
        { id : 1, label : 'b', type : 1 },
        { id : 3, label : 'a', type : 2 }
      ];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').sort(['label', 'type']).data();

      should(res).have.lengthOf(3);
      should(res[0].id).eql(3);
      should(res[1].id).eql(1);
      should(res[2].id).eql(2);
    });

    it('should sort the data : ASC & DESC, multiple sorts', () => {
      let items = [
        { id : 2, label : 'b', type : 2 },
        { id : 1, label : 'b', type : 1 },
        { id : 3, label : 'a', type : 2 }
      ];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').sort(['label', 'type DESC']).data();

      should(res).have.lengthOf(3);
      should(res[0].id).eql(3);
      should(res[1].id).eql(2);
      should(res[2].id).eql(1);
    });

    it('should sort the data : DESC & ASC, multiple sorts', () => {
      let items = [
        { id : 2, label : 'b', type : 2 },
        { id : 1, label : 'b', type : 1 },
        { id : 3, label : 'a', type : 2 }
      ];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').sort(['label DESC', 'type']).data();

      should(res).have.lengthOf(3);
      should(res[0].id).eql(1);
      should(res[1].id).eql(2);
      should(res[2].id).eql(3);
    });

    it('should sort the data : DESC & DESC, multiple sorts', () => {
      let items = [
        { id : 2, label : 'b', type : 2 },
        { id : 1, label : 'b', type : 1 },
        { id : 3, label : 'a', type : 2 }
      ];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').sort(['label DESC', 'type DESC']).data();

      should(res).have.lengthOf(3);
      should(res[0].id).eql(2);
      should(res[1].id).eql(1);
      should(res[2].id).eql(3);
    });

    it('should sort sub object', () => {
      let items = [
        { id : 2, label : 'b', type : { id : 2 }},
        { id : 1, label : 'b', type : { id : 1 }},
        { id : 3, label : 'a', type : { id : 2 }}
      ];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').sort(['label', 'type.id']).data();

      should(res).have.lengthOf(3);
      should(res[0].id).eql(3);
      should(res[1].id).eql(1);
      should(res[2].id).eql(2);
    });

    it('should not sort undefined sub object', () => {
      let items = [
        { id : 2, label : 'b', type : { id : 2 }},
        { id : 1, label : 'b', type : { id : 1 }},
        { id : 3, label : 'a', type : { id : 2 }}
      ];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').sort(['label', 'category.id']).data();

      should(res).have.lengthOf(3);
      should(res[0].id).eql(3);
      should(res[1].id).eql(2);
      should(res[2].id).eql(1);
    });

    it('should not sort sub array', () => {
      let items = [
        { id : 2, label : 'b', type : [{ id : 2 }] },
        { id : 1, label : 'b', type : [{ id : 1 }] },
        { id : 3, label : 'a', type : [{ id : 2 }] }
      ];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').sort(['label', 'type.id']).data();

      should(res).have.lengthOf(3);
      should(res[0].id).eql(3);
      should(res[1].id).eql(2);
      should(res[2].id).eql(1);
    });
  });

  describe('count', () => {

    it('should count the number of items : no data', () => {
      let res = lunarisGlobal.collectionResultSet('@db').count();
      should(res).eql(0);
    });

    it('should count the number of items', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').count();
      should(res).eql(3);
    });
  });

  describe('map', () => {

    it('should be chainable', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').map(item => item.label);

      should(res.data).be.ok();
    });

    it('should map data', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').map(item => item.label).data();

      should(res).have.lengthOf(3);
      should(res).eql(['b', 'c', 'a']);
    });

    it('should clone data', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').map(item => {
        item.label = item.label.toUpperCase();
        return item;
      }).data();

      should(res).have.lengthOf(3);
      should(res[0].label).eql('B');
      should(items[0].label).not.eql(res[0].label);
    });

    it('should map data and provide i', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').map((item, i) => i).data();

      should(res).have.lengthOf(3);
      should(res).eql([0, 1, 2]);
    });

    it('should map data and provide new array', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').map((item, i, newArray) => newArray.length).data();

      should(res).have.lengthOf(3);
      should(res).eql([0, 1, 2]);
    });
  });

  describe('reduce', () => {

    it('should not be chainable', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').reduce((accu, item) => accu + item.label);

      should(res.data).be.not.ok();
    });

    it('should reduce data', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').reduce((accu, item) => accu + item.label);
      should(res).eql('nullbca');
    });

    it('should clone data', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').reduce((accu, item) => {
        item.label = item.label.toUpperCase();
        return accu + item.label;
      });

      should(res).eql('nullBCA');
      should(items[0].label).not.eql('B');
    });

    it('should set initial accumulator value', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').reduce((accu, item) => {
        return accu + item.label;
      }, { initialValue : '' });

      should(res).eql('bca');
    });
  });

  describe('mapReduce', () => {

    it('should not be chainable', () => {
      let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let mapFn    = item => item.amount;
      let reduceFn = (accu, value) => accu + value;

      let res = lunarisGlobal.collectionResultSet('@db').mapReduce(mapFn, reduceFn);
      should(res.data).be.not.ok();
    });

    it('should map and reduce data', () => {
      let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let mapFn    = item => item.amount;
      let reduceFn = (accu, value) => accu + value;

      let res = lunarisGlobal.collectionResultSet('@db').mapReduce(mapFn, reduceFn);
      should(res).eql(12);
    });

    it('should map by providing i and reduce data', () => {
      let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let mapFn    = (item, i) => i;
      let reduceFn = (accu, value) => accu + value;

      let res = lunarisGlobal.collectionResultSet('@db').mapReduce(mapFn, reduceFn);
      should(res).eql(3);
    });

    it('should map by providing newArray and reduce data', () => {
      let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let mapFn    = (item, i, newArray) => newArray.length;
      let reduceFn = (accu, value) => accu + value;

      let res = lunarisGlobal.collectionResultSet('@db').mapReduce(mapFn, reduceFn);
      should(res).eql(3);
    });

    it('should clone data', () => {
      let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let mapFn    = item => {
        item.amount = item.amount * 2;
        return item;
      };
      let reduceFn = (accu, item) => accu + item.amount;

      let res = lunarisGlobal.collectionResultSet('@db').mapReduce(mapFn, reduceFn);
      should(res).eql(24);
      should(items[0].amount).not.eql(4);
    });

    it('should set initial accumulator value', () => {
      let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let mapFn    = item => item.amount;
      let reduceFn = (accu, value) => accu + value;

      let res = lunarisGlobal.collectionResultSet('@db').mapReduce(mapFn, reduceFn, { initialValue : 20 });
      should(res).eql(32);
    });
  });

  describe('where', () => {

    it('should be chainable', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').where(() => {});
      should(res.data).be.ok();
    });

    it('should throw an error if the given param is not a function', () => {
      try {
        lunarisGlobal.collectionResultSet('@db').where();
      }
      catch (e) {
        should(e.message).eql('fn is not a function');
      }
    });

    it('should apply the where', () => {
      let items = [{ amount : 2 }, { amount : 10 }, { amount : 20 }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').where(item => {
        return item.amount > 10;
      }).data();

      should(res).have.lengthOf(1);
      should(res[0].amount).eql(20);
    });

    it('should apply the where on no data', () => {
      let res = lunarisGlobal.collectionResultSet('@db').where(item => {
        return item.amount > 10;
      }).data();

      should(res).have.lengthOf(0);
    });

  });

  describe('find', () => {

    it('should be chainable', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunarisGlobal._stores.db.data.add(item);
      });

      let res = lunarisGlobal.collectionResultSet('@db').find({ label : 'c' });
      should(res.data).be.ok();
    });

    describe('one attribute : AND', () => {

      it('should query an attribute at root level : = shorthand', () => {
        let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ label : 'c' }).data();
        should(res).have.lengthOf(1);
        should(res[0].label).eql('c');
      });

      it('should query an attribute at root level : = explicit', () => {
        let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ label : { '=' : 'c' }}).data();
        should(res).have.lengthOf(1);
        should(res[0].label).eql('c');
      });

      it('should query an attribute at root level : >', () => {
        let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ amount : { '>' : 2 } }).data();
        should(res).have.lengthOf(2);
        should(res[0].amount).eql(4);
        should(res[1].amount).eql(6);
      });

      it('should query an attribute at root level : >=', () => {
        let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ amount : { '>=' : 2 } }).data();
        should(res).have.lengthOf(3);
      });

      it('should query an attribute at root level : <=', () => {
        let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ amount : { '<=' : 6 } }).data();
        should(res).have.lengthOf(3);
      });

      it('should query an attribute at root level : <', () => {
        let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ amount : { '<' : 6 } }).data();
        should(res).have.lengthOf(2);
        should(res[0].amount).eql(2);
        should(res[1].amount).eql(4);
      });

      it('should query an attribute at root level : $in', () => {
        let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ amount : { $in : [1,2,3,4] } }).data();
        should(res).have.lengthOf(2);
        should(res[0].amount).eql(2);
        should(res[1].amount).eql(4);
      });

      it('should query an attribute at root level : $nin', () => {
        let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ amount : { $nin : [1,2,3,4] } }).data();
        should(res).have.lengthOf(1);
        should(res[0].amount).eql(6);
      });

      it('should query an attribute at root level : !=', () => {
        let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ amount : { '!=' : 2 } }).data();
        should(res).have.lengthOf(2);
        should(res[0].amount).eql(4);
        should(res[1].amount).eql(6);
      });

      it('should query an attribute at root level : $where', () => {
        let items = [{ amount : 2 }, { amount : 4 }, { amount : 6 }];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({
          amount : {
            $where : value => value === 2
          }
        }).data();
        should(res).have.lengthOf(1);
        should(res[0].amount).eql(2);
      });

      it('should query an attribute at root level : $text', () => {
        let items = [{ label : 'pur??e' }, { label : 'puree' }, { label : 'chaude pur??e' }];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({
          label : {
            $text : 'pur??e'
          }
        }).data();
        should(res).have.lengthOf(3);

        res = lunarisGlobal.collectionResultSet('@db').find({
          label : {
            $text : 'chaud'
          }
        }).data();
        should(res).have.lengthOf(1);
        should(res[0].label).eql('chaude pur??e');
      });
    });

    describe('sub objects', () => {

      it('should query an attribute at sub level 1', () => {
        let items = [
          { label : 'b', type : { id : 1 } },
          { label : 'c', type : { id : 2 } },
          { label : 'a', type : { id : 3 } }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ 'type.id' : 2 }).data();
        should(res).have.lengthOf(1);
        should(res[0].label).eql('c');
      });

      it('should not crash if objects is undefined', () => {
        let items = [
          { label : 'b', type : { id : 1 } },
          { label : 'c',                   },
          { label : 'a', type : { id : 3 } }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ 'type.id' : 2 }).data();
        should(res).have.lengthOf(0);
      });

      it('should not crash if objects is null', () => {
        let items = [
          { label : 'b', type : { id : 1 } },
          { label : 'c', type : null       },
          { label : 'a', type : { id : 3 } }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ 'type.id' : 2 }).data();
        should(res).have.lengthOf(0);
      });

      it('should not crash if middle sub object is null', () => {
        let items = [
          { label : 'b', type : { category : { id : 1 }} },
          { label : 'c', type : null       },
          { label : 'a', type : { category : { id : 3 }} }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ 'type.category.id' : 2 }).data();
        should(res).have.lengthOf(0);
      });

      it('should not crash if middle sub object is undefined', () => {
        let items = [
          { label : 'b', type : { category : { id : 1 }} },
          { label : 'c', type : undefined                },
          { label : 'a', type : { category : { id : 3 }} }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ 'type.category.id' : 2 }).data();
        should(res).have.lengthOf(0);
      });

      it('should find sub in sub', () => {
        let items = [
          { label : 'b', type : { category : { id : 1 }} },
          { label : 'c', type : { category : { id : 2 }} },
          { label : 'a', type : { category : { id : 3 }} }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({ 'type.category.id' : 2 }).data();
        should(res).have.lengthOf(1);
        should(res[0].label).eql('c');
      });

    });

    describe('multiple AND', () => {

      it('should find multiple', () => {
        let items = [
          { amount : 2, type : 1 },
          { amount : 4, type : 2 },
          { amount : 6, type : 3 }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({
          'type.id' : {
            $in : [1, 3]
          },
          amount : {
            '>' : 2
          }
        }).data();
        should(res).have.lengthOf(1);
        should(res[0].amount).eql(6);
      });

      it('should find multiple on same attribute', () => {
        let items = [
          { amount : 2, type : 1 },
          { amount : 4, type : 2 },
          { amount : 6, type : 3 }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({
          amount : {
            '>' : 2,
            '<' : 6
          }
        }).data();
        should(res).have.lengthOf(1);
        should(res[0].amount).eql(4);
      });

      it('should find multiple (with sub object)', () => {
        let items = [
          { amount : 2, type : { id : 1 } },
          { amount : 4, type : { id : 2 } },
          { amount : 6, type : { id : 3 } }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({
          'type.id' : 2,
          amount    : {
            '>' : 2
          }
        }).data();
        should(res).have.lengthOf(1);
        should(res[0].amount).eql(4);
      });

      it('should find multiple (with sub object) : with $and multiple', () => {
        let items = [
          { amount : 2, type : { id : 1 } },
          { amount : 4, type : { id : 2 } },
          { amount : 6, type : { id : 3 } }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({
          $and : [
            {
              'type.id' : 2
            },
            {
              amount : {
                '>' : 2
              }
            }
          ]
        }).data();
        should(res).have.lengthOf(1);
        should(res[0].amount).eql(4);
      });

      it('should find multiple (with sub object) : with $and', () => {
        let items = [
          { amount : 2, type : { id : 1 } },
          { amount : 4, type : { id : 2 } },
          { amount : 6, type : { id : 3 } }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({
          $and : [
            {
              'type.id' : 2,
              amount    : {
                '>' : 2
              }
            }
          ]
        }).data();
        should(res).have.lengthOf(1);
        should(res[0].amount).eql(4);
      });

    });

    describe('only OR', () => {

      it('should find with or on the same attribute', () => {
        let items = [
          { amount : 2 },
          { amount : 4 },
          { amount : 6 }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({
          $or : [
            { amount : 2 },
            { amount : 6 },
          ]
        }).data();
        should(res).have.lengthOf(2);
        should(res[0].amount).eql(2);
        should(res[1].amount).eql(6);
      });

      it('should find with different attributes', () => {
        let items = [
          { amount : 2, type : 1 },
          { amount : 4, type : 1 },
          { amount : 6, type : 2 },
          { amount : 8, category : { id : 2 }}
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({
          $or : [
            { amount : 2, type : 1 },
            { type : 2 },
            { 'category.id' : 2 }
          ]
        }).data();
        should(res).have.lengthOf(3);
        should(res[0].amount).eql(2);
        should(res[1].amount).eql(6);
        should(res[2].amount).eql(8);
      });

      it('should find with OR', () => {
        let items = [
          { amount : 2, type : 1 },
          { amount : 4, type : 1 },
          { amount : 6, type : 1 }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({
          $or : [
            { amount : { '>' : 2 }},
            { amount : { '<' : 6 }}
          ]
        }).data();
        should(res).have.lengthOf(3);
      });

    });

    describe('OR and AND', () => {

      it('should find with OR and AND', () => {
        let items = [
          { amount : 2, type : 1 },
          { amount : 4, type : 1 },
          { amount : 6, type : 1 },
          { amount : 8, category : { id : 2 }}
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({
          type : 1,
          $or  : [
            { amount : 2 },
            { amount : 6 }
          ]
        }).data();
        should(res).have.lengthOf(2);
        should(res[0].amount).eql(2);
        should(res[1].amount).eql(6);
      });

      it('should find with OR and AND', () => {
        let items = [
          { amount : 2, type : 1 },
          { amount : 4, type : 1 },
          { amount : 6, type : 1 },
          { amount : 6, type : 2 }
        ];

        items.forEach(item => {
          lunarisGlobal._stores.db.data.add(item);
        });

        let res = lunarisGlobal.collectionResultSet('@db').find({
          type : 1,
          $or  : [
            { amount : 2 },
            { amount : 6 }
          ]
        }).data();
        should(res).have.lengthOf(2);
        should(res[0].amount).eql(2);
        should(res[1].amount).eql(6);
      });

    });
  });

});
