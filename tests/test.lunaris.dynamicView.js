const lunarisExports     = require('../src/exports');
lunarisExports.isBrowser = false;
const testUtils          = require('./testUtils');
const initStore          = testUtils.initStore;
const buildLunaris       = require('../lib/builder').buildLunaris;
const dayjs              = require('dayjs');
const pako               = require('pako');
const timsort            = require('timsort');

const window = {};
var lunaris  = {};
eval(buildLunaris({
  IS_PRODUCTION : false,
  IS_BROWSER    : false
}));

lunaris._stores.db         = initStore('db');
lunaris._stores.db.isLocal = true;

describe('Dynamic view', () => {

  beforeEach(() => {
    lunaris._stores.db.data.clear();
  });

  it('should be defined', () => {
    should(lunaris.dynamicView).be.a.Function();
  });


  it('should throw an error if store does not exist : no @', () => {
    try {
      lunaris.dynamicView('undefinedStore');
    }
    catch (e) {
      should(e.message).eql('The store "undefinedStore" has not been defined');
    }
  });

  it('should throw an error if store does not exist', () => {
    try {
      lunaris.dynamicView('@undefinedStore');
    }
    catch (e) {
      should(e.message).eql('The store "undefinedStore" has not been defined');
    }
  });

  it('should not throw an error if store exists', () => {
    try {
      lunaris.dynamicView('@db');
    }
    catch (e) {
      should(e).eql(undefined);
    }
  });

  it('should throw an error if store is a store object', () => {
    try {
      lunaris._stores.db2               = initStore('db2');
      lunaris._stores.db2.isStoreObject = true;
      lunaris.dynamicView('@db2');
    }
    catch (e) {
      should(e.message).eql('Cannot initialize a DynamicView on a store object');
    }
  });

  it('should have defined public properties', () => {
    should(lunaris.dynamicView('@db')).be.an.Object();
    should(lunaris.dynamicView('@db')).keys(
      'data',
      'count',
      'materialize'
    );
  });

  it('should be chainable', () => {
    should(lunaris.dynamicView('@db').data).be.a.Function();
  });

  it('should init data with an empty array', () => {
    should(lunaris.dynamicView('@db').data()).eql([]);
  });

  describe('shouldNotInitialize = false @default', () => {

    it('should materialize when calling @data', () => {
      let dynamicView = lunaris.dynamicView('@db');
      lunaris._stores.db.data.add({ id : 1 });
      lunaris._stores.db.data.add({ id : 2 });

      let res = dynamicView.data();
      should(res.length).eql(2);
      should(res[0].id).eql(1);
      should(res[1].id).eql(2);
    });

    it('should materialize when calling @count', () => {
      let dynamicView = lunaris.dynamicView('@db');
      lunaris._stores.db.data.add({ id : 1 });
      lunaris._stores.db.data.add({ id : 2 });

      let res = dynamicView.count();
      should(res).eql(2);
    });

    it('should not materialize when calling each time @data', () => {
      let dynamicView = lunaris.dynamicView('@db');
      lunaris._stores.db.data.add({ id : 1 });
      lunaris._stores.db.data.add({ id : 2 });

      let res = dynamicView.data();

      lunaris._stores.db.data.add({ id : 3 });

      should(res.length).eql(2);
      should(res[0].id).eql(1);
      should(res[1].id).eql(2);
    });

    it('should not materialize when calling each time @count', () => {
      let dynamicView = lunaris.dynamicView('@db');
      lunaris._stores.db.data.add({ id : 1 });
      lunaris._stores.db.data.add({ id : 2 });

      let res = dynamicView.count();

      lunaris._stores.db.data.add({ id : 3 });

      should(res).eql(2);
    });

    it('should materialize when calling @materialize', () => {
      let dynamicView = lunaris.dynamicView('@db');
      lunaris._stores.db.data.add({ id : 1 });
      lunaris._stores.db.data.add({ id : 2 });

      lunaris._stores.db.data.add({ id : 3 });

      dynamicView.materialize();

      let res = dynamicView.count();
      should(res).eql(3);
    });
  });

  describe('shouldNotInitialize = true', () => {
    it('should watch store : get', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'get', [{ _id : 1 }, { _id : 2 }]);
      should(dynamicView.count()).eql(2);
      should(dynamicView.data()).eql([{ _id : 1 }, { _id : 2 }]);
    });

    it('should watch store and not duplicate items : get', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'get', [{ _id : 1 }, { _id : 2 }]);
      lunaris.pushToHandlers(lunaris._stores.db, 'get', [{ _id : 1 }, { _id : 3 }]);
      should(dynamicView.count()).eql(3);
      should(dynamicView.data()).eql([{ _id : 1 }, { _id : 2 }, { _id : 3 }]);
    });

    it('should watch store : insert one item', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'insert', { _id : 1 });
      should(dynamicView.count()).eql(1);
      should(dynamicView.data()).eql([{ _id : 1 }]);
    });

    it('should watch store : insert multiple items', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'insert', [{ _id : 1 }, { _id : 2 }]);
      should(dynamicView.count()).eql(2);
      should(dynamicView.data()).eql([{ _id : 1 }, { _id : 2 }]);
    });

    it('should watch store : update one item', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'insert', { _id : 1 });
      lunaris.pushToHandlers(lunaris._stores.db, 'update', { _id : 1, label : 'A' });
      should(dynamicView.count()).eql(1);
      should(dynamicView.data()).eql([{ _id : 1, label : 'A' }]);
    });

    it('should watch store : update with _id = 0', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'insert', { _id : 0 });
      lunaris.pushToHandlers(lunaris._stores.db, 'update', { _id : 0, label : 'A' });
      should(dynamicView.count()).eql(1);
      should(dynamicView.data()).eql([{ _id : 0, label : 'A' }]);
    });

    it('should watch store : update multiple items', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'insert', [{ _id : 1 }, { _id : 2 }]);
      lunaris.pushToHandlers(lunaris._stores.db, 'update', [{ _id : 1, label : 'A' }, { _id : 2, label : 'B' }]);
      should(dynamicView.count()).eql(2);
      should(dynamicView.data()).eql([{ _id : 1, label : 'A' }, { _id : 2, label : 'B' }]);
    });

    it('should watch store : upsert an item', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'insert', { _id : 1 });
      lunaris.pushToHandlers(lunaris._stores.db, 'update', { _id : 2 });
      should(dynamicView.count()).eql(2);
      should(dynamicView.data()).eql([{ _id : 1 }, { _id : 2 }]);
    });

    it('should watch store : upsert multiple items', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'insert', [{ _id : 1 }, { _id : 2 }]);
      lunaris.pushToHandlers(lunaris._stores.db, 'update', [{ _id : 1, label : 'A' }, { _id : 3 }]);
      should(dynamicView.count()).eql(3);
      should(dynamicView.data()).eql([{ _id : 1, label : 'A' }, { _id : 2 }, { _id : 3 }]);
    });

    it('should watch store : delete one item', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'insert', { _id : 1 });
      lunaris.pushToHandlers(lunaris._stores.db, 'delete', { _id : 1 });
      should(dynamicView.count()).eql(0);
      should(dynamicView.data()).eql([]);
    });

    it('should watch store : delete multiple items', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'insert', [{ _id : 1 }, { _id : 2 }]);
      lunaris.pushToHandlers(lunaris._stores.db, 'delete', [{ _id : 1 }, { _id : 2 }]);
      should(dynamicView.count()).eql(0);
      should(dynamicView.data()).eql([]);
    });

    it('should watch store : delete an item not in the view', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'insert', [{ _id : 1 }, { _id : 2 }]);
      lunaris.pushToHandlers(lunaris._stores.db, 'delete', { _id : 3 });
      should(dynamicView.count()).eql(2);
      should(dynamicView.data()).eql([{ _id : 1 }, { _id : 2 }]);
    });

    it('should watch store : reset an empty view', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'reset');
      should(dynamicView.count()).eql(0);
      should(dynamicView.data()).eql([]);
    });

    it('should watch store : reset', () => {
      let dynamicView = lunaris.dynamicView('@db', { shouldNotInitialize : true });
      lunaris.pushToHandlers(lunaris._stores.db, 'insert', [{ _id : 1 }, { _id : 2 }]);
      lunaris.pushToHandlers(lunaris._stores.db, 'reset');
      should(dynamicView.count()).eql(0);
      should(dynamicView.data()).eql([]);
    });
  });

});
