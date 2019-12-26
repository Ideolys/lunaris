const lunarisExports     = require('../src/exports');
lunarisExports.isBrowser = false;
const testUtils    = require('./testUtils');
const initStore    = testUtils.initStore;
const buildLunaris = require('../lib/builder').buildLunaris;
const dayjs        = require('dayjs');
const pako         = require('pako');
const timsort      = require('timsort');

const window = {};
var lunaris  = {};
eval(buildLunaris({
  IS_PRODUCTION : false,
  IS_BROWSER    : false
}));

lunaris._stores.db         = initStore('db');
lunaris._stores.db.isLocal = true;


describe('collectionResultSet', () => {

  beforeEach(() => {
    lunaris._stores.db.data.clear();
  });

  it('should be defined', () => {
    should(lunaris.collectionResultSet).be.a.Function();
  });

  it('should throw an error if store does not exist : no @', () => {
    try {
      lunaris.collectionResultSet('undefinedStore');
    }
    catch (e) {
      should(e.message).eql('The store "undefinedStore" has not been defined');
    }
  });

  it('should throw an error if store does not exist', () => {
    try {
      lunaris.collectionResultSet('@undefinedStore');
    }
    catch (e) {
      should(e.message).eql('The store "undefinedStore" has not been defined');
    }
  });

  it('should not throw an error if store exists', () => {
    try {
      lunaris.collectionResultSet('@db');
    }
    catch (e) {
      should(e).eql(undefined);
    }
  });

  it('should have defined public properties', () => {
    should(lunaris.collectionResultSet('@db')).keys(
      'count',
      'data',
      'map',
      'sort',
      'where'
    );
  });

  describe('data', () => {

    it('should return all data of the collection by default', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').data();

      should(res).have.lengthOf(3);
      should(res).eql(items);
    });

    it('shouold be the end', () => {
      let res = lunaris.collectionResultSet('@db').data();
      should(res.data).not.ok();
    });

    it('should clone the data', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').data();

      res[0].label = res[0].label.toUpperCase();
      should(res[0]).not.eql(items[0]);
    });

    it('should freeze', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').data({ freeze : true });

      res.forEach(item => {
        should(Object.isFrozen(item)).eql(true);
      });
    });

  });

  describe('sort', () => {

    it('should be chainable', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').sort('label');
      should(res.data).be.ok();
    });

    it('should not sort undefined root attribute', () => {
      let items = [
        { id : 2, label : 'b' },
        { id : 1, label : 'c' },
        { id : 3, label : 'a' }
      ];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').sort(['label', 'category']).data();

      should(res).have.lengthOf(3);
      should(res[0].id).eql(3);
      should(res[1].id).eql(2);
      should(res[2].id).eql(1);
    });

    it('should sort the data : ASC default & one sort', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').sort('label').data();

      should(res).have.lengthOf(3);
      should(res[0].label).eql('a');
      should(res[1].label).eql('b');
      should(res[2].label).eql('c');
    });

    it('should sort the data : ASC & one sort', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').sort('label ASC').data();

      should(res).have.lengthOf(3);
      should(res[0].label).eql('a');
      should(res[1].label).eql('b');
      should(res[2].label).eql('c');
    });

    it('should sort the data : DESC & one sort', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').sort('label DESC').data();

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
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').sort(['label', 'type']).data();

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
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').sort(['label', 'type DESC']).data();

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
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').sort(['label DESC', 'type']).data();

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
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').sort(['label DESC', 'type DESC']).data();

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
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').sort(['label', 'type.id']).data();

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
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').sort(['label', 'category.id']).data();

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
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').sort(['label', 'type.id']).data();

      should(res).have.lengthOf(3);
      should(res[0].id).eql(3);
      should(res[1].id).eql(2);
      should(res[2].id).eql(1);
    });
  });

  describe('count', () => {

    it('should count the number of items : no data', () => {
      let res = lunaris.collectionResultSet('@db').count();
      should(res).eql(0);
    });

    it('should count the number of items', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').count();
      should(res).eql(3);
    });
  });

  describe('map', () => {

    it('should be chainable', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').map(item => item.label);

      should(res.data).be.ok();
    });

    it('should map data', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').map(item => item.label).data();

      should(res).have.lengthOf(3);
      should(res).eql(['b', 'c', 'a']);
    });

    it('should clone data', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').map(item => {
        item.label = item.label.toUpperCase();
        return item;
      }).data();

      should(res).have.lengthOf(3);
      should(res[0].label).eql('B');
      should(items[0].label).not.eql(res[0].label);
    });
  });

  describe('where', () => {

    it('should be chainable', () => {
      let items = [{ label : 'b' }, { label : 'c' }, { label : 'a' }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').where(() => {});
      should(res.data).be.ok();
    });

    it('should throw an error if the given param is not a function', () => {
      try {
        lunaris.collectionResultSet('@db').where();
      }
      catch (e) {
        should(e.message).eql('fn is not a function');
      }
    });

    it('should apply the where', () => {
      let items = [{ amount : 2 }, { amount : 10 }, { amount : 20 }];

      items.forEach(item => {
        lunaris._stores.db.data.add(item);
      });

      let res = lunaris.collectionResultSet('@db').where(item => {
        return item.amount > 10;
      }).data();

      should(res).have.lengthOf(1);
      should(res[0].amount).eql(20);
    });

    it('should apply the where on no data', () => {
      let res = lunaris.collectionResultSet('@db').where(item => {
        return item.amount > 10;
      }).data();

      should(res).have.lengthOf(0);
    });

  });

});
