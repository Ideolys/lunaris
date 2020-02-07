const lunarisExports     = require('../src/exports');
lunarisExports.isBrowser = false;
const testUtils          = require('./testUtils');
const initStore          = testUtils.initStore;
const buildLunaris       = require('../lib/builder').buildLunaris;
const dayjs              = require('dayjs');
const pako               = require('pako');
const timsort            = require('timsort');

const window    = {};
var lunarisGlobal = {};
let dynamicView = null;

describe('Dynamic view', () => {

  before(done => {
    buildLunaris({
      IS_PRODUCTION : false,
      IS_BROWSER    : false
    }, (err, code) => {
      if (err) {
        console.log(err);
      }

      eval(code);
      lunarisGlobal = lunaris;
      lunarisGlobal._stores.db         = initStore('db');
      lunarisGlobal._stores.db.isLocal = true;
      done();
    });
  });

  beforeEach(() => {
    lunarisGlobal._stores.db.data.clear();

    if (dynamicView) {
      dynamicView.destroy();
    }
  });

  it('should be defined', () => {
    should(lunarisGlobal.dynamicView).be.a.Function();
  });


  it('should throw an error if store does not exist : no @', () => {
    try {
      lunarisGlobal.dynamicView('undefinedStore');
    }
    catch (e) {
      should(e.message).eql('The store "undefinedStore" has not been defined');
    }
  });

  it('should throw an error if store does not exist', () => {
    try {
      lunarisGlobal.dynamicView('@undefinedStore');
    }
    catch (e) {
      should(e.message).eql('The store "undefinedStore" has not been defined');
    }
  });

  it('should not throw an error if store exists', () => {
    try {
      dynamicView = lunarisGlobal.dynamicView('@db');
    }
    catch (e) {
      should(e).eql(undefined);
    }
  });

  it('should throw an error if store is a store object', () => {
    try {
      lunarisGlobal._stores.db2               = initStore('db2');
      lunarisGlobal._stores.db2.isStoreObject = true;
      lunarisGlobal.dynamicView('@db2');
    }
    catch (e) {
      should(e.message).eql('Cannot initialize a DynamicView on a store object');
    }
  });

  it('should have defined public properties', () => {
    dynamicView = lunarisGlobal.dynamicView('@db');
    should(dynamicView).be.an.Object();
    should(dynamicView).keys(
      'data',
      'count',
      'materialize',
      'destroy',
      'applyFindCriteria',
      'applySortCriteria',
      'applyWhereCriteria',
      'removeCriteria',
      'removeCriterias',
      'resultSet'
    );
  });

  it('should be chainable', () => {
    dynamicView = lunarisGlobal.dynamicView('@db');
    should(dynamicView.data).be.a.Function();
  });

  it('should init data with an empty array', () => {
    dynamicView = lunarisGlobal.dynamicView('@db');
    should(dynamicView.data()).eql([]);
  });

  describe('shouldNotInitialize = false @default', () => {

    it('should materialize when calling @data', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });

      let res = dynamicView.data();
      should(res.length).eql(2);
      should(res[0].id).eql(1);
      should(res[1].id).eql(2);
    });

    it('should materialize when calling @count', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });

      let res = dynamicView.count();
      should(res).eql(2);
    });

    it('should not materialize when calling each time @data', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });

      let res = dynamicView.data();

      lunarisGlobal._stores.db.data.add({ id : 3 });

      should(res.length).eql(2);
      should(res[0].id).eql(1);
      should(res[1].id).eql(2);
    });

    it('should not materialize when calling each time @count', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });

      let res = dynamicView.count();

      lunarisGlobal._stores.db.data.add({ id : 3 });

      should(res).eql(2);
    });

    it('should materialize when calling @materialize', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });

      lunarisGlobal._stores.db.data.add({ id : 3 });

      dynamicView.materialize();

      let res = dynamicView.count();
      should(res).eql(3);
    });
  });

  describe('shouldNotInitialize = true', () => {
    it('should watch store : get', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'get', [{ _id : 1 }, { _id : 2 }]);
      should(dynamicView.count()).eql(2);
      should(dynamicView.data()).eql([{ _id : 1 }, { _id : 2 }]);
    });

    it('should watch store and not duplicate items : get', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'get', [{ _id : 1 }, { _id : 2 }]);
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'get', [{ _id : 1 }, { _id : 3 }]);
      should(dynamicView.count()).eql(3);
      should(dynamicView.data()).eql([{ _id : 1 }, { _id : 2 }, { _id : 3 }]);
    });

    it('should watch store : insert one item', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'insert', { _id : 1 });
      should(dynamicView.count()).eql(1);
      should(dynamicView.data()).eql([{ _id : 1 }]);
    });

    it('should watch store : insert multiple items', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'insert', [{ _id : 1 }, { _id : 2 }]);
      should(dynamicView.count()).eql(2);
      should(dynamicView.data()).eql([{ _id : 1 }, { _id : 2 }]);
    });

    it('should watch store : update one item', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'insert', { _id : 1 });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'update', { _id : 1, label : 'A' });
      should(dynamicView.count()).eql(1);
      should(dynamicView.data()).eql([{ _id : 1, label : 'A' }]);
    });

    it('should watch store : update with _id = 0', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'insert', { _id : 0 });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'update', { _id : 0, label : 'A' });
      should(dynamicView.count()).eql(1);
      should(dynamicView.data()).eql([{ _id : 0, label : 'A' }]);
    });

    it('should watch store : update multiple items', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'insert', [{ _id : 1 }, { _id : 2 }]);
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'update', [{ _id : 1, label : 'A' }, { _id : 2, label : 'B' }]);
      should(dynamicView.count()).eql(2);
      should(dynamicView.data()).eql([{ _id : 1, label : 'A' }, { _id : 2, label : 'B' }]);
    });

    it('should watch store : upsert an item', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'insert', { _id : 1 });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'update', { _id : 2 });
      should(dynamicView.count()).eql(2);
      should(dynamicView.data()).eql([{ _id : 1 }, { _id : 2 }]);
    });

    it('should watch store : upsert multiple items', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'insert', [{ _id : 1 }, { _id : 2 }]);
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'update', [{ _id : 1, label : 'A' }, { _id : 3 }]);
      should(dynamicView.count()).eql(3);
      should(dynamicView.data()).eql([{ _id : 1, label : 'A' }, { _id : 2 }, { _id : 3 }]);
    });

    it('should watch store : delete one item', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'insert', { _id : 1 });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'delete', { _id : 1 });
      should(dynamicView.count()).eql(0);
      should(dynamicView.data()).eql([]);
    });

    it('should watch store : delete multiple items', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'insert', [{ _id : 1 }, { _id : 2 }]);
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'delete', [{ _id : 1 }, { _id : 2 }]);
      should(dynamicView.count()).eql(0);
      should(dynamicView.data()).eql([]);
    });

    it('should watch store : delete an item not in the view', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'insert', [{ _id : 1 }, { _id : 2 }]);
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'delete', { _id : 3 });
      should(dynamicView.count()).eql(2);
      should(dynamicView.data()).eql([{ _id : 1 }, { _id : 2 }]);
    });

    it('should watch store : reset an empty view', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'reset');
      should(dynamicView.count()).eql(0);
      should(dynamicView.data()).eql([]);
    });

    it('should watch store : reset', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'insert', [{ _id : 1 }, { _id : 2 }]);
      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'reset');
      should(dynamicView.count()).eql(0);
      should(dynamicView.data()).eql([]);
    });
  });

  it('should remove the hooks when calling destroy', () => {
    dynamicView = lunarisGlobal.dynamicView('@db');

    should(lunarisGlobal._stores.db.hooks.get).have.lengthOf(1);
    should(lunarisGlobal._stores.db.hooks.insert).have.lengthOf(1);
    should(lunarisGlobal._stores.db.hooks.update).have.lengthOf(1);
    should(lunarisGlobal._stores.db.hooks.delete).have.lengthOf(1);
    should(lunarisGlobal._stores.db.hooks.reset).have.lengthOf(1);

    dynamicView.destroy();

    should(lunarisGlobal._stores.db.hooks.get).have.lengthOf(0);
    should(lunarisGlobal._stores.db.hooks.insert).have.lengthOf(0);
    should(lunarisGlobal._stores.db.hooks.update).have.lengthOf(0);
    should(lunarisGlobal._stores.db.hooks.delete).have.lengthOf(0);
    should(lunarisGlobal._stores.db.hooks.reset).have.lengthOf(0);
  });

  describe('criterias', () => {

    it('should apply a sort criteria', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });
      lunarisGlobal._stores.db.data.add({ id : 3 });

      dynamicView.applySortCriteria('id DESC');

      let res = dynamicView.data();
      should(res).have.length(3);
      should(res[0].id).eql(3);
      should(res[1].id).eql(2);
      should(res[2].id).eql(1);
    });

    it('should apply a find criteria', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });
      lunarisGlobal._stores.db.data.add({ id : 3 });

      dynamicView.applyFindCriteria({ id : 2 });

      let res = dynamicView.data();
      should(res).have.length(1);
      should(res[0].id).eql(2);
    });

    it('should apply a where criteria', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });
      lunarisGlobal._stores.db.data.add({ id : 3 });

      dynamicView.applyWhereCriteria(item => item.id > 1);

      let res = dynamicView.data();
      should(res).have.length(2);
      should(res[0].id).eql(2);
      should(res[1].id).eql(3);
    });

    it('should materialize with criterias', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });
      lunarisGlobal._stores.db.data.add({ id : 3 });

      dynamicView.applyWhereCriteria(item => item.id > 1);
      dynamicView.applyFindCriteria({ id : 3 });

      let res = dynamicView.data();
      should(res).have.length(1);
      should(res[0].id).eql(3);
    });

    it('should materialize with criterias', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });
      lunarisGlobal._stores.db.data.add({ id : 3 });

      dynamicView.applyWhereCriteria(item => item.id > 1);
      dynamicView.applyFindCriteria({ id : 3 });

      let res = dynamicView.data();
      should(res).have.length(1);
      should(res[0].id).eql(3);
    });

    it('should apply criterias for updates : shouldNotInitialize = true', () => {
      dynamicView = lunarisGlobal.dynamicView('@db', { shouldNotInitialize : true });
      dynamicView.applyWhereCriteria(item => item.type > 1);

      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'insert', [{ _id : 1, type : 1 }, { _id : 2, type : 2 }]);

      let res = dynamicView.data();
      should(res).have.length(1);
      should(res[0]._id).eql(2);

      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'update', { _id : 1, type : 2 });

      res = dynamicView.data();
      should(res).have.length(2);
      should(res[0]._id).eql(2);
      should(res[0]._id).eql(2);
    });

    it('should apply criterias for updates', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      dynamicView.applyWhereCriteria(item => item.type > 1);

      lunarisGlobal._stores.db.data.add({ id : 1, type : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2, type : 2 });

      let res = dynamicView.data();
      should(res).have.length(1);
      should(res[0]._id).eql(2);

      lunarisGlobal.pushToHandlers(lunarisGlobal._stores.db, 'update', { _id : 1, type : 2 });

      res = dynamicView.data();
      should(res).have.length(2);
      should(res[0]._id).eql(2);
      should(res[0]._id).eql(2);
    });

    it('should remove a find criteria', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });
      lunarisGlobal._stores.db.data.add({ id : 3 });

      dynamicView.applyFindCriteria({ id : 2 }, 'find');

      let res = dynamicView.data();
      should(res).have.length(1);
      should(res[0].id).eql(2);

      dynamicView.removeCriteria('find').materialize();

      res = dynamicView.data();
      should(res).have.length(3);
      should(res[0].id).eql(1);
      should(res[1].id).eql(2);
      should(res[2].id).eql(3);
    });

    it('should remove a sort criteria', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });
      lunarisGlobal._stores.db.data.add({ id : 3 });

      dynamicView.applySortCriteria('id DESC', 'sort');

      let res = dynamicView.data();
      should(res).have.length(3);
      should(res[0].id).eql(3);
      should(res[1].id).eql(2);
      should(res[2].id).eql(1);

      dynamicView.removeCriteria('sort').materialize();

      res = dynamicView.data();
      should(res).have.length(3);
      should(res[0].id).eql(1);
      should(res[1].id).eql(2);
      should(res[2].id).eql(3);
    });

    it('should remove a where criteria', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });
      lunarisGlobal._stores.db.data.add({ id : 3 });

      dynamicView.applyWhereCriteria(item => item.id > 1, 'where');

      let res = dynamicView.data();
      should(res).have.length(2);
      should(res[0].id).eql(2);
      should(res[1].id).eql(3);

      dynamicView.removeCriteria('where').materialize();

      res = dynamicView.data();
      should(res).have.length(3);
      should(res[0].id).eql(1);
      should(res[1].id).eql(2);
      should(res[2].id).eql(3);
    });

    it('should remove criterias', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');
      lunarisGlobal._stores.db.data.add({ id : 1 });
      lunarisGlobal._stores.db.data.add({ id : 2 });
      lunarisGlobal._stores.db.data.add({ id : 3 });

      dynamicView.applyWhereCriteria(item => item.id > 1, 'where');
      dynamicView.applyFindCriteria({ id : 3 }, 'find');

      let res = dynamicView.data();
      should(res).have.length(1);
      should(res[0].id).eql(3);

      dynamicView.removeCriterias().materialize();

      res = dynamicView.data();
      should(res).have.length(3);
      should(res[0].id).eql(1);
      should(res[1].id).eql(2);
      should(res[2].id).eql(3);
    });

    it('should get a resultSet object', () => {
      dynamicView = lunarisGlobal.dynamicView('@db');

      let query = dynamicView.resultSet();
      should(query).be.an.Object();
      should(query.data).be.a.Function();
      should(query.count).be.a.Function();
    });
  });

});
