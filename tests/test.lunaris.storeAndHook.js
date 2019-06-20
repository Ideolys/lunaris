const testUtils    = require('./testUtils');
const initStore    = testUtils.initStore;
const collection   = require('../src/store/store.collection');
const buildLunaris = require('../lib/builder').buildLunaris;
const schema       = require('../lib/_builder/store/schema');
const express      = require('express');
const compression  = require('compression');
const bodyParser   = require('body-parser');
const fetch        = require('node-fetch');
const dayjs        = require('dayjs');
const pako         = require('pako');

const window = {};

const port    = 4040;

var lastError = [];
console.error = function () {
  lastError = [arguments[0], arguments[1]];
};
var lastTip = [];
console.warn = function () {
  lastTip = [arguments[0], arguments[1]];
};

var lunaris = {};
eval(buildLunaris({
  BASE_URL           : "'http://localhost:" + port + "'",
  IS_PRODUCTION      : false,
  STORE_DEPENDENCIES : JSON.stringify({
    transaction       : [],
    transaction_1     : [],
    transaction_A     : ['transaction', 'transaction_1'],
    transaction_B     : ['transaction'],
    transaction_cache : ['pagination']
  }),
  IS_BROWSER : false
}));
let server  = express();
lunaris._stores.lunarisErrors.data = collection.collection();

var nbCallsPagination2 = 0;

describe('lunaris store', function () {
  this.retries(3);

  before(done => {
    _startServer(done);
  });

  beforeEach(() => {
    collection.resetVersionNumber();
    lastError = [];
    lastTip   = [];
    lunaris._stores.lunarisErrors.data.clear();
    lunaris._cache.clear();
  });

  after(done => {
    _stopServer(done);
  });

  afterEach(() => {
    for (var store in lunaris._stores) {
      if (store !== 'lunarisErrors') {
        delete lunaris._stores[store];
      }
    }
  });

  describe('insert() / update()', () => {
    it('insert() should be defined', () => {
      should(lunaris.insert).be.a.Function();
    });

    it('update should be defined', () => {
      should(lunaris.update).be.a.Function();
    });

    it('upsert should be defined', () => {
      should(lunaris.upsert).be.a.Function();
    });

    it('should throw an error if no value is provided', () => {
      lunaris.insert('@store');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.insert@store');
      should(lastError[1]).eql(new Error('lunaris.<insert|update|delete>(<store>, <value>) must have a value, provided value: undefined'));
    });

    it('should throw an error if the store is not a string', () => {
      lunaris.insert({}, { id : 1 });
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.insert' + {});
      should(lastError[1]).eql(new Error('lunaris.<get|insert|update|clear|delete>(<store>, <value>) must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunaris.insert('@store', { id : 1 });
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.insert@store');
      should(lastError[1]).eql(new Error('The store "store" has not been defined'));
    });

    it('should insert the value', () => {
      var _store = initStore('store1');
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] });
    });

    it('should insert the value and execute the hooks : insert & inserted', done => {
      var _isFirstInsertEvent                   = true;
      var _isUpdateHook                         = false;
      var _isUpdatedHook                        = false;
      var _store                                = initStore('store1');
      var _expectedValue                        = [{ _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] }];
      lunaris._stores['store1']                 = _store;
      lunaris._stores['store1'].primaryKey      = 'id';
      lunaris._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunaris.hook('insert@store1', updatedValue => {
        if (_isFirstInsertEvent) {
          should(updatedValue).be.an.Array().have.lengthOf(1);
          should(updatedValue).eql(_expectedValue);
          should(Object.isFrozen(updatedValue[0])).eql(true);
          return _isFirstInsertEvent = false;
        }
      });

      lunaris.hook('update@store1', () => {
        _isUpdateHook = true;
      });

      lunaris.hook('inserted@store1', (data, message) => {
        _isUpdatedHook = true;
        var _res       = Object.assign(_expectedValue[0], {
          body     : { _rowId : 1, _id : 1, id : 2, label : 'A' },
          query    : {},
          params   : {},
          _version : [2],
          _rowId   : 2
        });
        should(data).eql([_res]);
        should(message).eql('${the} store1 has been successfully ${created}');

        if (_isUpdateHook && _isUpdatedHook) {
          done();
        }
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });


      lunaris.insert('@store1', { id : 2, label : 'A' });
    });

    it('should insert the value and execute the hooks', done => {
      var _nbExecutedHandlers              = 0;
      var _store                           = initStore('store1');
      var _expectedValue                   = [{ _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] }];
      lunaris._stores['store1']            = _store;
      lunaris._stores['store1'].primaryKey = 'id';

      lunaris.hook('insert@store1', updatedValue => {
        should(updatedValue).eql(_expectedValue);
        _nbExecutedHandlers++;
      });

      lunaris.hook('insert@store1', updatedValue => {
        should(updatedValue).eql(_expectedValue);
        _nbExecutedHandlers++;

        if (_nbExecutedHandlers === 2) {
          done();
        }
        else {
          done(_nbExecutedHandlers);
        }
      });

      lunaris.insert('@store1', { id : 2, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
    });

    it('should fire an error for insert', done => {
      var _store                           = initStore('store_insert_post');
      lunaris._stores['store_insert_post']            = _store;
      lunaris._stores['store_insert_post'].primaryKey = 'id';

      lunaris.hook('errorHttp@store_insert_post', err => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.insert@store_insert_post');
        should(lastError[1]).eql({ error : 404, message : 'Not Found'});
        should(err).eql('${An error has occured}');
        done();
      });

      lunaris.insert('@store_insert_post', { id : 2, label : 'A' });
    });

    it('should add the error into lunarisErrors store : insert', done => {
      var _store                           = initStore('store_insert_post');
      lunaris._stores['store_insert_post']            = _store;
      lunaris._stores['store_insert_post'].primaryKey = 'id';

      lunaris.hook('errorHttp@store_insert_post', () => {
        var _values = lunaris._stores.lunarisErrors.data.getAll();
        should(_values).have.lengthOf(1);
        delete _values[0].date;
        should(_values[0]).eql({
          _rowId             : 1,
          _id                : 1,
          _version           : [2],
          version            : 1,
          data               : { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] },
          url                : '/store_insert_post',
          method             : 'POST',
          storeName          : 'store_insert_post',
          messageError       : '${An error has occured}',
          messageErrorServer : { error : 404, message : 'Not Found'},
        });
        done();
      });

      lunaris.insert('@store_insert_post', { id : 2, label : 'A' });
    });

    it('should fire an error for insert if the the validation failed', () => {
      var _store                                      = initStore('store_insert_post', [{ id : ['<<int>>'], label : ['string'] }]);
      lunaris._stores['store_insert_post']            = _store;
      lunaris._stores['store_insert_post'].primaryKey = 'id';

      lunaris.insert('@store_insert_post', { id : 2, label : 1 });

      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.insert@store_insert_post Error when validating data');
      should(lastError[1]).eql({ error : '${must be a string}', field : 'label', value : 1, index : 0});
    });

    it('should update a value', done => {
      var _store = initStore('store1');
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] });

      lunaris.hook('updated@store1', () => {
        done();
      });

      lunaris.update('@store1', { _id : 1, id : 1, label : 'B'});
      should(_store.data.get(1)).eql({ _rowId : 2, _id : 1, id : 1, label : 'B', _version : [2] });
    });

    it('should update the value and execute the hooks : update and updated', done => {
      var _isFirstUpdateEvent   = true;
      var _isUpdateHook         = false;
      var _isUpdatedHook        = false;
      var _store                = initStore('store1');
      var _expectedValue        = { _rowId : 2, _id : 1, id : 1, label : 'B', _version : [2] };
      lunaris._stores['store1'] = _store;
      lunaris._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunaris.hook('update@store1', updatedValue => {
        _isUpdateHook = true;
        if (_isFirstUpdateEvent) {
          should(_store.data.get(1)).eql(_expectedValue);
          should(updatedValue).eql([_expectedValue]);
          should(Object.isFrozen(updatedValue[0])).eql(true);
          _isFirstUpdateEvent = false;
          return;
        }
      });

      lunaris.hook('updated@store1', (data, message) => {
        _isUpdatedHook = true;
        should(data).eql([Object.assign(_expectedValue, {
          body     : { _rowId : 2, _id : 1, id : 1, label : 'B'},
          query    : {},
          params   : { id : '1' },
          _version : [3],
          _rowId   : 3
        })]);

        should(message).eql('${the} store1 has been successfully ${edited}');

        if (_isUpdateHook && _isUpdatedHook) {
          done();
        }
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunaris._stores['store1'].data.add({ id : 1, label : 'A' });
      lunaris.update('@store1', { _id : 1, id : 1, label : 'B'});
    });

    it('should insert a value and fire an error for update', done => {
      var _store                                     = initStore('store_insert_put');
      lunaris._stores['store_insert_put']            = _store;
      lunaris._stores['store_insert_put'].primaryKey = 'id';

      lunaris.hook('inserted@store_insert_put', () => {
        lunaris.update('@store_insert_put', { _id : 1, id : 1, label : 'B' });
      });

      lunaris.hook('errorHttp@store_insert_put', err => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.update@store_insert_put');
        should(lastError[1]).eql({ error : 404, message : 'Not Found'});
        should(err).eql('${An error has occured}');
        done();
      });

      lunaris.insert('@store_insert_put', { id : 1 });
    });

    it('should insert a value and fire an error for update when validating', done => {
      var _store                                     = initStore('store_insert_put', [{ id : ['<<int>>'], label : ['string'] }]);
      lunaris._stores['store_insert_put']            = _store;
      lunaris._stores['store_insert_put'].primaryKey = 'id';

      lunaris.hook('inserted@store_insert_put', () => {
        lunaris.update('@store_insert_put', { _id : 1, id : 1, label : 2 });
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.update@store_insert_put Error when validating data');
        should(lastError[1]).eql({ error : '${must be a string}', field : 'label', value : 2, index : 0});
        done();
      });

      lunaris.insert('@store_insert_put', { id : 1, label : 'A' });
    });

    it('should always update the same value for store object', done => {
      var _store                             = initStore('storeObject', { id : ['<<int>>'], label : ['string'] });
      lunaris._stores['storeObject']         = _store;
      lunaris._stores['storeObject'].isLocal = true;

      lunaris.hook('insert@storeObject', () => {
        lunaris.update('@storeObject', { _id : 2, id : 1, label : 'string' });
        should(lunaris._stores['storeObject'].data.getAll()).eql({
          _rowId   : 2,
          _id      : 1,
          id       : 1,
          label    : 'string',
          _version : [2]
        });
        done();
      });

      lunaris.insert('@storeObject', { id : 1, label : 'A' });
    });

    it('should insert a value and add an error into lunarisErrors store : update', done => {
      var _store                                     = initStore('store_insert_put');
      lunaris._stores['store_insert_put']            = _store;
      lunaris._stores['store_insert_put'].primaryKey = 'id';

      lunaris.hook('inserted@store_insert_put', () => {
        lunaris.update('@store_insert_put', { _id : 1, id : 1, label : 'B' });
      });

      lunaris.hook('errorHttp@store_insert_put', () => {
        var _values = lunaris._stores.lunarisErrors.data.getAll();
        should(_values).have.lengthOf(1);
        delete _values[0].date;
        should(_values[0]).eql({
          _rowId             : 1,
          _id                : 1,
          _version           : [4],
          version            : 3,
          data               : { _rowId : 3, _id : 1, id : 1, label : 'B', _version : [3] },
          url                : '/store_insert_put/1',
          method             : 'PUT',
          storeName          : 'store_insert_put',
          messageError       : '${An error has occured}',
          messageErrorServer : { error : 404, message : 'Not Found'},
        });
        done();
      });

      lunaris.insert('@store_insert_put', { id : 1 });
    });

    it('should update the value and not execute the hook updated', done => {
      var _isUpdateHook         = false;
      var _isUpdatedHook        = false;
      var _store                = initStore('store1');
      var _expectedValue        = { _id : 1, id : 1, label : 'B' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('update@store1', () => {
        _isUpdateHook = true;
      });

      lunaris.hook('updated@store1', () => {
        _isUpdatedHook = true;
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunaris.insert('@store1', { id : 1, label : 'A' });
      lunaris.update('@store1', _expectedValue, true);

      setTimeout(() => {
        should(_isUpdateHook).eql(true);
        should(_isUpdatedHook).eql(false);
        done();
      }, 200);
    });

    it('should update the value and not execute the hook updated : store.isLocal = true', done => {
      var _isUpdateHook         = false;
      var _isUpdatedHook        = false;
      var _store                = initStore('store1');
      _store.isLocal            = true;
      var _expectedValue        = { _id : 1, id : 1, label : 'B' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('update@store1', () => {
        _isUpdateHook = true;
      });

      lunaris.hook('updated@store1', () => {
        _isUpdatedHook = true;
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunaris.insert('@store1', { id : 1, label : 'A' });
      lunaris.update('@store1', _expectedValue);

      setTimeout(() => {
        should(_isUpdateHook).eql(true);
        should(_isUpdatedHook).eql(false);
        done();
      }, 200);
    });

    it('should insert and update the values and execute the hooks with filters', done => {
      var _isInsertedHook       = false;
      var _isUpdatedHook        = false;
      var _store                = initStore('store1');
      var _expectedValue        = { _rowId : 1, _id : 1, id : 1, label : 'A' };
      lunaris._stores['optional'] = initStore('optional');
      lunaris._stores['optional'].isStoreObject = true;
      lunaris._stores['optional'].data.add({
        site : 2
      });

      lunaris._stores['required']               = initStore('required');
      lunaris._stores['required'].isStoreObject = true;
      lunaris._stores['required'].data.add({
        category : 'A'
      });
      lunaris._stores['store1']                = _store;
      lunaris._stores['store1'].fakeAttributes = ['site'];
      lunaris._stores['store1'].filters.push({
        source          : '@required',
        sourceAttribute : 'category',
        localAttribute  : 'category',
        operator        : ['=']
      });
      lunaris._stores['store1'].filters.push({
        source          : '@optional',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      });

      lunaris.hook('inserted@store1', data => {
        _isInsertedHook = true;
        should(data[0].query).be.ok();
        should(data[0].params).be.ok();
        should(data[0].params).eql({ idSite : '2' });
        should(data[0].query).eql({ search : 'category:=A' });
        lunaris.update('@store1', _expectedValue);
        should(data[0].body).be.ok();
        should(data[0].body).eql(_expectedValue);
      });

      lunaris.hook('updated@store1', data => {
        _isUpdatedHook = true;
        should(data[0].query).be.ok();
        should(data[0].params).be.ok();
        should(data[0].params).eql({ id : '1', idSite : '2' });
        should(data[0].query).eql({ search : 'category:=A' });
        should(data[0].body).be.ok();
        should(data[0].body).eql({ _rowId : 3, _id : 1, id : 1, label : 'A' });

        if (_isInsertedHook && _isUpdatedHook) {
          done();
        }
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunaris.insert('@store1', { id : 1, label : 'A' });
    });

    it('should insert and update the values and execute the hooks with no filters', done => {
      var _isInsertedHook       = false;
      var _isUpdatedHook        = false;
      var _store                = initStore('store1');
      var _expectedValue        = { _rowId : 1, _id : 1, id : 1, label : 'A' };
      lunaris._stores['optional'] = initStore('optional');
      lunaris._stores['optional'].data.add({
        site : 2
      });

      lunaris._stores['required'] = initStore('required');
      lunaris._stores['required'].data.add({
        category : 'A'
      });
      lunaris._stores['store1'] = _store;
      lunaris._stores['store1'].fakeAttributes = ['site'];
      lunaris._stores['store1'].filters.push({
        source          : '@required',
        sourceAttribute : 'category',
        localAttribute  : 'category',
        isRequired      : false,
        httpMethods     : ['GET']
      });
      lunaris._stores['store1'].filters.push({
        source          : '@optional',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true,
        httpMethods     : ['GET']
      });

      lunaris.hook('inserted@store1', data => {
        _isInsertedHook = true;
        should(data[0].query).be.ok();
        should(data[0].params).be.ok();
        should(data[0].params).eql({});
        should(data[0].query).eql({});
        should(data[0].body).be.ok();
        should(data[0].body).eql(_expectedValue);
        lunaris.update('@store1', _expectedValue);
      });

      lunaris.hook('updated@store1', data => {
        _isUpdatedHook = true;
        should(data[0].query).be.ok();
        should(data[0].params).be.ok();
        should(data[0].params).eql({ id : '1'});
        should(data[0].query).eql({});
        should(data[0].body).be.ok();
        should(data[0].body).eql({ _rowId : 3, _id : 1, id : 1, label : 'A' });

        if (_isInsertedHook && _isUpdatedHook) {
          done();
        }
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunaris.insert('@store1', { id : 1, label : 'A' });
    });

    it('should insert and update the values and execute the hooks with authorized filters', done => {
      var _isInsertedHook                       = false;
      var _isUpdatedHook                        = false;
      var _store                                = initStore('store1', { id : ['<<int>>'] });
      var _expectedValue                        = { _rowId : 1, _id : 1, id : 1, label : 'A' };
      lunaris._stores['required']               = initStore('required');
      lunaris._stores['required'].isStoreObject = true;
      lunaris._stores['required'].data.add({
        site : 2
      });

      lunaris._stores['optional']               = initStore('optional');
      lunaris._stores['optional'].isStoreObject = true;
      lunaris._stores['optional'].data.add({
        category : 'A'
      });
      lunaris._stores['store1']                = _store;
      lunaris._stores['store1'].fakeAttributes = ['site'];
      lunaris._stores['store1'].isStoreObject  = true;
      lunaris._stores['store1'].filters.push({
        source          : '@optional',
        sourceAttribute : 'category',
        localAttribute  : 'category',
        httpMethods     : ['GET', 'POST'],
        operator        : '='
      });
      lunaris._stores['store1'].filters.push({
        source          : '@required',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        httpMethods     : ['PUT'],
        isRequired      : true
      });

      lunaris.hook('inserted@store1', data => {
        _isInsertedHook = true;
        should(data.query).be.ok();
        should(data.params).be.ok();
        should(data.params).eql({});
        should(data.query).eql({ search : 'category:=A' });
        should(data.body).be.ok();
        should(data.body).eql(_expectedValue);
        lunaris.update('@store1', _expectedValue);
      });

      lunaris.hook('updated@store1', data => {
        _isUpdatedHook = true;
        should(data.query).be.ok();
        should(data.params).be.ok();
        should(data.params).eql({ id : '1', idSite : '2'});
        should(data.query).eql({});
        should(data.body).be.ok();
        should(data.body).eql({ _rowId : 3, _id : 1, id : 1, label : 'A'});

        if (_isInsertedHook && _isUpdatedHook) {
          done();
        }
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunaris.insert('@store1', { id : 1, label : 'A' });
    });
  });

  describe('multiple insert() / update()', () => {

    it('should insert the values', (done) => {
      var _store = initStore('multiple');
      lunaris._stores['multiple'] = _store;
      lunaris.insert('@multiple', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);

      should(_store.data._getAll()).eql([
        { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] },
        { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [1] }
      ]);

      lunaris.hook('inserted@multiple', () => {
        done();
      });
    });

    it('should insert the value and execute the hooks : insert & inserted', done => {
      var _isFirstInsertEvent                   = true;
      var _isUpdateHook                         = false;
      var _isUpdatedHook                        = false;
      var _store                                = initStore('multiple');
      lunaris._stores['multiple']                 = _store;
      lunaris._stores['multiple'].primaryKey      = 'id';
      lunaris._stores['multiple'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunaris.hook('insert@multiple', updatedValue => {
        if (_isFirstInsertEvent) {
          should(updatedValue).be.an.Array();
          should(updatedValue).eql([
            { _rowId : 1, _id : 1, id : null, label : 'A', _version : [1] },
            { _rowId : 2, _id : 2, id : null, label : 'B', _version : [1] }
          ]);

          for (var i = 0; i < updatedValue.length; i++) {
            should(Object.isFrozen(updatedValue[i])).eql(true);
          }
          return _isFirstInsertEvent = false;
        }
      });

      lunaris.hook('update@multiple', () => {
        _isUpdateHook = true;
      });

      lunaris.hook('inserted@multiple', (data, message) => {
        _isUpdatedHook = true;
        should(data).be.an.Array();
        should(data).eql([
          { _rowId : 3, _id : 1, id : 2, label : 'A', post : true, _version : [2] },
          { _rowId : 4, _id : 2, id : 1, label : 'B', post : true, _version : [2] }
        ]);

        for (var i = 0; i < data.length; i++) {
          should(Object.isFrozen(data[i])).eql(true);
        }
        should(message).eql('${the} multiple has been successfully ${created}');

        if (_isUpdateHook && _isUpdatedHook) {
          done();
        }
      });

      lunaris.hook('errorHttp@multiple', (err) => {
        done(err);
      });

      lunaris.insert('@multiple', [
        { id : null, label : 'A' },
        { id : null, label : 'B' }
      ]);
    });

    it('should fire an error for insert', done => {
      var _store                                      = initStore('store_insert_post');
      lunaris._stores['store_insert_post']            = _store;
      lunaris._stores['store_insert_post'].primaryKey = 'id';

      lunaris.hook('errorHttp@store_insert_post', err => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.insert@store_insert_post');
        should(lastError[1]).eql({ error : 404, message : 'Not Found'});
        should(err).eql('${An error has occured}');
        done();
      });

      lunaris.insert('@store_insert_post', [{ id : 2, label : 'A' }, { id : 3, label : 'B' }]);
    });

    it('should add the error into lunarisErrors store : insert', done => {
      var _store                           = initStore('store_insert_post');
      lunaris._stores['store_insert_post']            = _store;
      lunaris._stores['store_insert_post'].primaryKey = 'id';

      lunaris.hook('errorHttp@store_insert_post', () => {
        var _values = lunaris._stores.lunarisErrors.data.getAll();
        should(_values).have.lengthOf(1);
        delete _values[0].date;
        should(_values[0]).eql({
          _rowId             : 1,
          _id                : 1,
          _version           : [2],
          version            : 1,
          data               : [{ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] }, { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [1] }],
          url                : '/store_insert_post',
          method             : 'POST',
          storeName          : 'store_insert_post',
          messageError       : '${An error has occured}',
          messageErrorServer : { error : 404, message : 'Not Found'},
        });
        done();
      });

      lunaris.insert('@store_insert_post', [{ id : 1, label : 'A' }, { id : 2, label : 'B' }]);
    });

    it('should fire an error for insert if the the validation failed', () => {
      var _store                                      = initStore('store_insert_post', [{ id : ['<<int>>'], label : ['string'] }]);
      lunaris._stores['store_insert_post']            = _store;
      lunaris._stores['store_insert_post'].primaryKey = 'id';

      lunaris.insert('@store_insert_post', [{ id : null, label : '1' }, { id : null, label : 1 }]);

      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.insert@store_insert_post Error when validating data');
      should(lastError[1]).eql({ error : '${must be a string}', field : 'label', value : 1, index : 1});
    });

    it('should update a value', () => {
      var _store = initStore('multiple');
      lunaris._stores['multiple'] = _store;
      lunaris.insert('@multiple', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
      lunaris.update('@multiple', [
        { _id : 1, id : 1, label : 'A-1' },
        { _id : 2, id : 2, label : 'B-1' }
      ]);
      should(_store.data.get(1)).eql({ _rowId : 3, _id : 1, id : 1, label : 'A-1', _version : [2] });
      should(_store.data.get(2)).eql({ _rowId : 4, _id : 2, id : 2, label : 'B-1', _version : [2] });
    });

    it('should update the value and execute the hooks : update and updated', done => {
      var _nbCalls            = 0;
      var _isUpdateHook       = false;
      var _isUpdatedHook      = false;
      var _store              = initStore('multiple');
      lunaris._stores['multiple'] = _store;
      lunaris._stores['multiple'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunaris.hook('inserted@multiple', () => {
        lunaris.update('@multiple', [
          { _id : 1, id : 1, label : 'A-1' },
          { _id : 2, id : 2, label : 'B-1' }
        ]);
      });

      lunaris.hook('update@multiple', updatedValue => {
        _isUpdateHook = true;
        if (_nbCalls === 0) {
          return _nbCalls++;
        }

        if (_nbCalls === 1) {
          should(updatedValue).be.an.Array();
          should(updatedValue).eql([
            { _rowId : 5, _id : 1, id : 1, label : 'A-1', _version : [3] },
            { _rowId : 6, _id : 2, id : 2, label : 'B-1', _version : [3] }
          ]);

          for (var i = 0; i < updatedValue.length; i++) {
            should(Object.isFrozen(updatedValue[i])).eql(true);
          }
          return _nbCalls++;
        }

        if (_nbCalls === 2) {
          should(updatedValue).be.an.Array();
          should(updatedValue).eql([
            { _rowId : 7, _id : 1, id : 1, label : 'A-1', _version : [4], put : true },
            { _rowId : 8, _id : 2, id : 2, label : 'B-1', _version : [4], put : true }
          ]);

          for (i = 0; i < updatedValue.length; i++) {
            should(Object.isFrozen(updatedValue[i])).eql(true);
          }
        }
        return _nbCalls++;
      });

      lunaris.hook('updated@multiple', (data, message) => {
        _isUpdatedHook = true;
        should(data).eql([
          { _rowId : 7, _id : 1, id : 1, label : 'A-1', put : true, _version : [4] },
          { _rowId : 8, _id : 2, id : 2, label : 'B-1', put : true, _version : [4] }
        ]);

        should(message).eql('${the} multiple has been successfully ${edited}');

        if (_isUpdateHook && _isUpdatedHook) {
          done();
        }
      });

      lunaris.hook('errorHttp@multiple', (err) => {
        done(err);
      });

      lunaris.insert('@multiple', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
    });

    it('should insert a value and fire an error for update', done => {
      var _store                                     = initStore('store_insert_put');
      lunaris._stores['store_insert_put']            = _store;
      lunaris._stores['store_insert_put'].primaryKey = 'id';

      lunaris.hook('inserted@store_insert_put', () => {
        lunaris.update('@store_insert_put', [{ _id : 1, id : 1, label : '1' }, { _id : 2, id : 2, label : '2' }]);
      });

      lunaris.hook('errorHttp@store_insert_put', err => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.update@store_insert_put');
        should(lastError[1]).eql({ error : 404, message : 'Not Found'});
        should(err).eql('${An error has occured}');
        done();
      });

      lunaris.insert('@store_insert_put', [{ id : 1 }, { id : 2 }]);
    });

    it('should insert a value and fire an error for update when validating', done => {
      var _store                                     = initStore('store_insert_put', [{ id : ['<<int>>'], label : ['string'] }]);
      lunaris._stores['store_insert_put']            = _store;
      lunaris._stores['store_insert_put'].primaryKey = 'id';

      lunaris.hook('inserted@store_insert_put', () => {
        lunaris.update('@store_insert_put', [{ _id : 1, id : 1, label : '1' }, { _id : 2, id : 2, label : 2 }]);
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.update@store_insert_put Error when validating data');
        should(lastError[1]).eql({ error : '${must be a string}', field : 'label', value : 2, index : 1});
        done();
      });

      lunaris.insert('@store_insert_put', [{ id : 1, label : '' }, { id : 2, label : '' }]);
    });

    it('should insert a value and fire an error for update when validating (ids)', done => {
      var _store                                     = initStore('store_insert_put', [{ id : ['<<int>>'], label : ['string'] }]);
      lunaris._stores['store_insert_put']            = _store;
      lunaris._stores['store_insert_put'].primaryKey = 'id';

      lunaris.hook('inserted@store_insert_put', () => {
        lunaris.update('@store_insert_put', [{ _id : 1, id : 1, label : '1' }, { _id : 2, id : null, label : '2' }]);
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.update@store_insert_put Error when validating data');
        should(lastError[1]).eql({ error : '${must be an integer}', field : 'id', value : null, index : 1});
        done();
      });

      lunaris.insert('@store_insert_put', [{ id : 1, label : '' }, { id : 2, label : '' }]);
    });

    it('should insert a value and add an error into lunarisErrors store : update', done => {
      var _store                                     = initStore('store_insert_put');
      lunaris._stores['store_insert_put']            = _store;
      lunaris._stores['store_insert_put'].primaryKey = 'id';

      lunaris.hook('inserted@store_insert_put', () => {
        lunaris.update('@store_insert_put', [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }]);
      });

      lunaris.hook('errorHttp@store_insert_put', () => {
        var _values = lunaris._stores.lunarisErrors.data.getAll();
        should(_values).have.lengthOf(1);
        delete _values[0].date;
        should(_values[0]).eql({
          _rowId             : 1,
          _id                : 1,
          _version           : [4],
          version            : 3,
          data               : [{ _rowId : 5, _id : 1, id : 1, label : 'A', _version : [3] }, { _rowId : 6, _id : 2, id : 2, label : 'B', _version : [3] }],
          url                : '/store_insert_put',
          method             : 'PUT',
          storeName          : 'store_insert_put',
          messageError       : '${An error has occured}',
          messageErrorServer : { error : 404, message : 'Not Found'},
        });
        done();
      });

      lunaris.insert('@store_insert_put', [{ id : 1 }, { id : 2 }]);
    });
  });

  describe('mass', () => {
    it('should update all object in the store and make a patch', done => {
      var _nbCalled     = 0;
      lunaris._stores['mass'] = initStore('mass');

      lunaris.hook('errorHttp@mass', done);
      lunaris.hook('patched@mass', () => {
        done();
      });
      lunaris.hook('inserted@mass', () => {
        lunaris.update('@mass:label', 'A');
      });
      lunaris.hook('update@mass', (items) => {
        _nbCalled++;

        if (_nbCalled === 1) {
          should(items).eql([
            { _rowId : 5, id : 1, _id : 1, _version : [2], post : true },
            { _rowId : 6, id : 2, _id : 2, _version : [2], post : true },
            { _rowId : 7, id : 3, _id : 3, _version : [2], post : true },
            { _rowId : 8, id : 4, _id : 4, _version : [2], post : true }
          ]);
          return;
        }
        else if (_nbCalled === 2) {
          should(items).eql([
            { _rowId : 9, id : 1, _id : 1, _version : [3], post : true, label : 'A' },
            { _rowId : 10, id : 2, _id : 2, _version : [3], post : true, label : 'A' },
            { _rowId : 11, id : 3, _id : 3, _version : [3], post : true, label : 'A' },
            { _rowId : 12, id : 4, _id : 4, _version : [3], post : true, label : 'A' }
          ]);
          return;
        }
        // should not update mass store another time
        done(_nbCalled);
      });

      lunaris.hook('insert@mass', function (items) {
        should(items).eql([
          { _rowId : 1, id : 1, _id : 1, _version : [1] },
          { _rowId : 2, id : 2, _id : 2, _version : [1] },
          { _rowId : 3, id : 3, _id : 3, _version : [1] },
          { _rowId : 4, id : 4, _id : 4, _version : [1] }
        ]);
      });

      lunaris.insert('@mass', [
        { id : 1 },
        { id : 2 },
        { id : 3 },
        { id : 4 }
      ]);
    });

    it('should conserve a mass operation for next insert', done => {
      lunaris._stores['mass'] = initStore('mass');

      lunaris.hook('errorHttp@mass', done);
      lunaris.hook('patched@mass', () => {
        lunaris.insert('@mass', [{ id : 1 }]);
      });
      lunaris.hook('inserted@mass', (items) => {
        should(items).eql([{
          id       : 1,
          label    : 'A',
          post     : true,
          _rowId   : 2,
          _id      : 1,
          _version : [3]
        }]);
        done();
      });

      lunaris.hook('insert@mass', function (items) {
        should(items).eql([{
          id       : 1,
          label    : 'A',
          _rowId   : 1,
          _id      : 1,
          _version : [2]
        }]);
      });

      lunaris.update('@mass:label', 'A');
    });

    it('should conserve a mass operation for next update', done => {
      lunaris._stores['mass'] = initStore('mass');

      lunaris.hook('errorHttp@mass', done);
      lunaris.hook('patched@mass', () => {
        lunaris.update('@mass', { id : 1, label : 'B', _id : 1 });
      });
      lunaris.hook('inserted@mass', (items) => {
        should(items).eql([{
          id       : 1,
          post     : true,
          _rowId   : 2,
          _id      : 1,
          _version : [2]
        }]);
        lunaris.update('@mass:label', 'A');
      });

      var _nbCalled = 0;
      lunaris.hook('update@mass', items => {
        _nbCalled++;

        if (_nbCalled === 1) {
          should(items).eql([{
            id       : 1,
            _rowId   : 2,
            _id      : 1,
            _version : [2],
            post     : true
          }]);
          return;
        }
        else if (_nbCalled === 2) {
          should(items).eql([{
            id       : 1,
            _rowId   : 3,
            _id      : 1,
            _version : [3],
            post     : true,
            label    : 'A'
          }]);
          return;
        }
        else if (_nbCalled === 3) {
          should(items).eql([{
            id       : 1,
            _rowId   : 4,
            _id      : 1,
            _version : [4],
            label    : 'A'
          }]);
          return;
        }
        else if (_nbCalled === 4) {
          should(items).eql([{
            id       : 1,
            _rowId   : 5,
            _id      : 1,
            _version : [5],
            label    : 'A',
            put      : true
          }]);
          return done();
        }

        done(_nbCalled);
      });

      lunaris.hook('insert@mass', items => {
        should(items).eql([{
          id       : 1,
          _rowId   : 1,
          _id      : 1,
          _version : [1]
        }]);
      });

      lunaris.insert('@mass', { id : 1 });
    });
  });

  describe('delete()', () => {
    it('insert() should be defined', () => {
      should(lunaris.delete).be.a.Function();
    });

    it('should throw an error if no value is provided', () => {
      lunaris.delete('@store');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.delete@store');
      should(lastError[1]).eql(new Error('lunaris.<insert|update|delete>(<store>, <value>) must have a value, provided value: undefined'));
    });

    it('should throw an error if the store is not a string', () => {
      lunaris.delete({}, { id : 1 });
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.delete' + {});
      should(lastError[1]).eql(new Error('lunaris.<get|insert|update|clear|delete>(<store>, <value>) must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunaris.delete('@store', { id : 1 });
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.delete@store');
      should(lastError[1]).eql(new Error('The store "store" has not been defined'));
    });

    it('should delete the value', () => {
      var _value = { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] };

      var _store = initStore('store1');
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_value);
      lunaris.delete('@store1', _value);
      should(_store.data.get(1)).eql(null);
    });

    it('should fire an error for delete', done => {
      var _store                              = initStore('store_del');
      lunaris._stores['store_del']            = _store;
      lunaris._stores['store_del'].primaryKey = 'id';

      lunaris.hook('errorHttp@store_del', err => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.delete@store_del');
        should(lastError[1]).eql({ error : 404, message : 'Not Found'});
        should(err).eql('${An error has occured}');
        done();
      });

      lunaris._stores['store_del'].data.add({ _id : 1, id : 1 });
      lunaris.delete('@store_del', { _id : 1, id : 1 });
    });

    it('should add an error into lunarisErrors store : delete', done => {
      var _store                              = initStore('store_del');
      lunaris._stores['store_del']            = _store;
      lunaris._stores['store_del'].primaryKey = 'id';

      lunaris.hook('errorHttp@store_del', () => {
        var _values = lunaris._stores.lunarisErrors.data.getAll();
        should(_values).have.lengthOf(1);
        delete _values[0].date;
        should(_values[0]).eql({
          _rowId             : 1,
          _id                : 1,
          _version           : [3],
          version            : 2,
          data               : { _rowId : 1, _id : 1, id : 1, _version : [1, 2]},
          url                : '/store_del/1',
          method             : 'DELETE',
          storeName          : 'store_del',
          messageError       : '${An error has occured}',
          messageErrorServer : { error : 404, message : 'Not Found'},
        });
        done();
      });

      lunaris._stores['store_del'].data.add({ id : 1 });
      lunaris.delete('@store_del', { _id : 1, id : 1 });
    });

    it('should delete the value and execute the hooks : delete & deleted', done => {
      var _isDeleteHook                    = false;
      var _isDeletedHook                   = false;
      var _store                           = initStore('store1');
      var _expectedValue                   = { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] };
      lunaris._stores['store1']            = _store;
      lunaris._stores['store1'].primaryKey = 'id';
      lunaris._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      var _nbCalls = false;
      lunaris.hook('delete@store1', data => {
        _nbCalls++;
        // delete is sent before and after HTTP DELETE
        if (_nbCalls > 1) {
          return;
        }
        _isDeleteHook = true;
        should(data).be.an.Array().and.have.lengthOf(1);
        should(data).eql([{ _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1, 2] }]);
      });

      lunaris.hook('deleted@store1', (data, message) => {
        _isDeletedHook = true;
        should(data).eql({ _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1, 2] });

        should(message).eql('${the} store1 has been successfully ${deleted}');

        if (_isDeletedHook && _isDeleteHook) {
          done();
        }
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunaris.insert('@store1', { id : 2, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      lunaris.delete('@store1', _expectedValue);
    });

    it('should delete the value and execute the hooks, even if a GET have resurected the deleted primary key', done => {
      var _store = initStore('store1', [{
        id : ['<<int>>']
      }]);
      var _expectedValue                        = { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] };
      lunaris._stores['store1']                 = _store;
      lunaris._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      var _nbCalls = false;
      lunaris.hook('delete@store1', data => {
        _nbCalls++;
        // delete is sent before and after HTTP DELETE
        if (_nbCalls === 1) {
          should(data).be.an.Array().and.have.lengthOf(1);
          should(data).eql([{ _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1, 2] }]);
          should(_store.data.getAll()).have.lengthOf(0);

          // we simulate collection insert
          _store.data.add({ id : 2, label : 'A' });
          return;
        }

        should(data).be.an.Array().and.have.lengthOf(1);
        should(data).eql([{ _rowId : 2, _id : 2, id : 2, label : 'A', _version : [3, 5] }]);
        should(_store.data.getAll()).have.lengthOf(0);
        done();
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunaris.insert('@store1', { id : 2, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      lunaris.delete('@store1', _expectedValue);
    });

    it('should delete the value and display the tip : no primary key', done => {
      var _isDeleteHook                    = false;
      var _isDeletedHook                   = false;
      var _store                           = initStore('store1');
      var _expectedValue                   = { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] };
      lunaris._stores['store1']            = _store;
      lunaris._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunaris.hook('delete@store1', () => {
        _isDeleteHook = true;
      });

      lunaris.hook('deleted@store1', (data, message) => {
        _isDeletedHook = true;
        should(data).eql({ _rowId : 1, id : 2, label : 'A', _id : 1, _version : [1, 2] });

        should(message).eql('${the} store1 has been successfully ${deleted}');

        if (_isDeletedHook && _isDeleteHook) {
          should(lastTip.length).eql(2);
          should(lastTip[0]).eql('[Lunaris tip] No primary key has been found in store "store1", fallback to lunaris object attribute "_id".');
          should(lastTip[1]).eql('To declare a primary key, use the notation [\'<<int>>\'] in the map or add the \'primaryKey\' attribute in the store description.');
          done();
        }
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunaris.insert('@store1', { id : 2, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      lunaris.delete('@store1', _expectedValue);
    });

    it('should delete the value and execute the hook deleted', done => {
      var _isDeleteHook                    = false;
      var _isDeletedHook                   = false;
      var _store                           = initStore('store1');
      var _expectedValue                   = { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] };
      lunaris._stores['store1']            = _store;
      lunaris._stores['store1'].primaryKey = 'id';
      lunaris._stores['store1'].isLocal    = true;

      lunaris.hook('delete@store1', () => {
        _isDeleteHook = true;
      });

      lunaris.hook('deleted@store1', () => {
        _isDeletedHook = true;
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunaris.insert('@store1', { id : 2, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      lunaris.delete('@store1', _expectedValue);

      setTimeout(() => {
        should(_isDeleteHook).eql(true);
        should(_isDeletedHook).eql(false);
        done();
      }, 200);
    });

    it('should delete the value and execute the hook and return false if the value has not been deleted', () => {
      var _store                = initStore('store1');
      var _expectedValue        = { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] };
      lunaris._stores['store1'] = _store;

      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      lunaris.delete('@store1', { _id : 2, id : 2, label : 'B' });
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.delete@store1');
      should(lastError[1]).eql(new Error('You cannot delete a value not in the store!'));
    });
  });

  describe('getOne()', () => {
    it('insert() should be defined', () => {
      should(lunaris.getOne).be.a.Function();
    });

    it('should throw an error if the store is not a string', () => {
      lunaris.getOne({});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.getOne' + {});
      should(lastError[1]).eql(new Error('lunaris.<get|insert|update|clear|delete>(<store>, <value>) must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunaris.getOne('@store0');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.getOne@store0');
      should(lastError[1]).eql(new Error('The store "store0" has not been defined'));
    });

    it('should get the first value', () => {
      var _store          = initStore('store1');
      var _expectedValues = [
        { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] },
        { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] }
      ];
      lunaris._stores['store1'] = _store;

      lunaris.insert('@store1', { id : 1, label : 'A' });
      lunaris.insert('@store1', { id : 2, label : 'B' });
      should(_store.data.get(1)).eql(_expectedValues[0]);
      should(_store.data.get(2)).eql(_expectedValues[1]);
      var _val = lunaris.getOne('@store1');
      should(_val).eql(_expectedValues[0]);
      // should(Object.isFrozen(_val)).eql(true);
    });

    it('should get the identified value', () => {
      var _store                = initStore('store1');
      lunaris._stores['store1'] = _store;

      lunaris.insert('@store1', { id : 1, label : 'A' });
      lunaris.insert('@store1', { id : 2, label : 'B' });
      var _val = lunaris.getOne('@store1', 2);
      should(_val).eql(
        { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] }
      );
    });

    it('should get undefined if no value is in the collection', () => {
      var _store                = initStore('store1');
      lunaris._stores['store1'] = _store;
      should(lunaris.getOne('@store1')).eql(undefined);
    });
  });

  describe('get()', () => {
    it('insert() should be defined', () => {
      should(lunaris.get).be.a.Function();
    });

    it('should throw an error if the store is not a string', () => {
      lunaris.get({});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.get' + {});
      should(lastError[1]).eql(new Error('lunaris.<get|insert|update|clear|delete>(<store>, <value>) must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunaris.get('@store');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.get@store');
      should(lastError[1]).eql(new Error('The store "store" has not been defined'));
    });

    it('should get the values and execute the hook', done => {
      var _store                = initStore('store1');
      lunaris._stores['store1'] = _store;

      lunaris.hook('get@store1', items => {
        should(items).eql([
          { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [1] },
          { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [1] },
          { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [1] }
        ]);

        done();
      });

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.get('@store1');
    });

    it('should get the all the values of the colection and execute the hook if the store is local', done => {
      var _store                        = initStore('store1');
      lunaris._stores['store1']         = _store;
      lunaris._stores['store1'].isLocal = true;
      lunaris._stores['store1'].data.add({ id : 1});
      lunaris._stores['store1'].data.add({ id : 2});

      lunaris.hook('get@store1', items => {
        should(items).be.an.Array().and.have.lengthOf(2);
        should(items).eql([
          { _rowId : 1, _id : 1, id : 1, _version : [1] },
          { _rowId : 2, _id : 2, id : 2, _version : [2] }
        ]);
        done();
      });

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.get('@store1');
    });

    it('should filter the store even if it is local', done => {
      lunaris._stores['source']         = initStore('source', {});
      lunaris._stores['source'].isLocal = true;

      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      var _store = initStore('store1', _map, null, null, [{
        source          : '@source',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : 'ILIKE'
      }], { source : { isStoreObject : true } });
      lunaris._stores['store1']         = _store;
      lunaris._stores['store1'].isLocal = true;
      lunaris.insert('store1', [
        { id : 1, label : 'A'},
        { id : 2, label : 'B'}
      ]);
      lunaris.insert('@source', { label : 'B' });

      lunaris.hook('get@store1', items => {
        should(items).be.an.Array().and.have.lengthOf(1);
        should(items).eql([
          { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [1] }
        ]);
        done();
      });

      lunaris.get('@store1');
    });

    it('should get null if the store is object and it has no value', done => {
      var _store                        = initStore('store1', { id : ['<<int>>'] });
      lunaris._stores['store1']         = _store;
      lunaris._stores['store1'].isLocal = true;
      lunaris._stores['store1'].data.add({ id : 1});

      lunaris.hook('get@store1', items => {
        should(items).be.an.Object();
        should(items).eql({ _rowId : 1, _id : 1, id : 1, _version : [1] });
        done();
      });

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.get('@store1');
    });

    it('should get a value if the store is object', done => {
      var _store                        = initStore('store1', { id : ['<<int>>'] });
      lunaris._stores['store1']         = _store;
      lunaris._stores['store1'].isLocal = true;

      lunaris.hook('get@store1', items => {
        should(items).eql(null);
        done();
      });

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.get('@store1');
    });

    it('should fire the errorHttp event : HTTP error', done => {
      var _store               = initStore('store');
      lunaris._stores['store'] = _store;

      lunaris.hook('errorHttp@store', err => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.get@store');
        should(lastError[1]).eql({ error : 404, message : 'Not Found'});
        should(err).eql('${An error has occured}');
        done();
      });

      lunaris.get('@store');
    });

    it('should throw an error', done => {
      var _store               = initStore('pagination', { id : ['int'] });
      lunaris._stores['pagination'] = _store;

      lunaris.get('@pagination');

      setTimeout(() => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.get@pagination');
        should(lastError[1]).eql(new Error('The store "pagination" is an object store. The GET method cannot return multiple elements!'));
        done();
      }, 200);
    });

    it('should add the error into lunarisErrors store', done => {
      var _store               = initStore('store');
      lunaris._stores['store'] = _store;

      lunaris.hook('errorHttp@store', () => {
        var _values = lunaris._stores.lunarisErrors.data.getAll();
        should(_values).have.lengthOf(1);
        delete _values[0].date;
        should(_values[0]).eql({
          _rowId             : 1,
          _id                : 1,
          _version           : [1],
          version            : null,
          data               : null,
          url                : '/store?limit=50&offset=0',
          method             : 'GET',
          storeName          : 'store',
          messageError       : '${An error has occured}',
          messageErrorServer : { error : 404, message : 'Not Found'},
        });
        done();
      });

      lunaris.get('@store');
    });

    it('should fire the errorHttp event : application based error', done => {
      var _store               = initStore('store2');
      lunaris._stores['store2'] = _store;

      lunaris.hook('errorHttp@store2', err => {
        should(err).eql('${An error has occured}');
        done();
      });

      lunaris.get('@store2');
    });

    it('should get the values and execute the hook', done => {
      var _nbPages                  = 0;
      var _store                    = initStore('pagination');
      lunaris._stores['pagination'] = _store;

      lunaris.hook('get@pagination', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [1] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [1] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [1] }
          ]);
          for (var i = 0; i < items.length; i++) {
            should(Object.isFrozen(items[i])).eql(true);
          }
          lunaris.get('@pagination');
          return;
        }
        if (_nbPages === 2) {
          should(items).eql([
            { _rowId : 4, _id : 4, id : 40, label : 'A', _version : [2] },
            { _rowId : 5, _id : 5, id : 50, label : 'C', _version : [2] },
            { _rowId : 6, _id : 6, id : 60, label : 'F', _version : [2] }
          ]);
          for (i = 0; i < items.length; i++) {
            should(Object.isFrozen(items[i])).eql(true);
          }
        }

        done();
      });

      lunaris.hook('errorHttp@pagination', err => {
        done(err);
      });

      lunaris.get('@pagination');
    });

    it('should get the values without duplicating values', done => {
      var _nbPages                  = 0;
      var _store                    = initStore('pagination_duplicate');
      _store.data = collection.collection((item) => {
        return item.id;
      });
      lunaris._stores['pagination_duplicate'] = _store;

      lunaris.hook('get@pagination_duplicate', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [1] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [1] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [1] }
          ]);
          for (var i = 0; i < items.length; i++) {
            should(Object.isFrozen(items[i])).eql(true);
          }
          lunaris.get('@pagination_duplicate');
          return;
        }

        should(items).eql([
          { _rowId : 4, _id : 1, id : 20, label : 'A', _version : [2] },
          { _rowId : 5, _id : 2, id : 30, label : 'D', _version : [2] },
          { _rowId : 6, _id : 3, id : 10, label : 'C', _version : [2] }
        ]);
        for (i = 0; i < items.length; i++) {
          should(Object.isFrozen(items[i])).eql(true);
        }

        done();
      });

      lunaris.hook('errorHttp@pagination_duplicate', err => {
        done(err);
      });

      lunaris.get('@pagination_duplicate');
    });

    it('should filter the store by a required filter', done => {
      var _isFirstCall = true;
      lunaris._stores['required.param.site']               = initStore('required.param.site', {});
      lunaris._stores['required.param.site'].isStoreObject = true;
      lunaris._stores['required.param.site'].isLocal       = true;
      lunaris._stores['required.param.site'].data.add({
        site : 1
      });
      var map = [{
        id   : ['<<int>>'],
        site : ['int']
      }];
      lunaris._stores['required'] = initStore('required', map, null, null, [{
        source          : '@required.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        operator        : '=',
        isRequired      : true
      }]);

      lunaris.hook('get@required', items => {
        if (_isFirstCall) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 1, _version : [2] },
            { _rowId : 2, _id : 2, id : 2, _version : [2] },
            { _rowId : 3, _id : 3, id : 3, _version : [2] }
          ]);
          _isFirstCall = false;
          lunaris.update('@required.param.site', {
            _id  : 1,
            site : 2
          });
          lunaris.get('@required');
          return;
        }
        should(items).eql([
          { _rowId : 4, _id : 4, id : 4, _version : [4] },
          { _rowId : 5, _id : 5, id : 5, _version : [4] },
          { _rowId : 6, _id : 6, id : 6, _version : [4] }
        ]);

        done();
      });

      lunaris.hook('errorHttp@required', err => {
        done(err);
      });

      lunaris.get('@required');
    });

    it('should not filter the store by a required filter if there is no value in the filter', done => {
      var _hasBeenCalled = false;
      lunaris._stores['required.param.site']         = initStore('required.param.site');
      lunaris._stores['required.param.site'].isLocal = true;
      var _map = [{
        id   : ['<<int>>'],
        site : ['int']
      }];
      lunaris._stores['required'] = initStore('required', _map, null, null, [{
        source          : '@required.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true,
        operator        : '=',
      }]);

      lunaris.hook('get@required', () => {
        _hasBeenCalled = true;
      });

      lunaris.hook('errorHttp@required', err => {
        done(err);
      });

      lunaris.get('@required');

      setTimeout(() => {
        should(_hasBeenCalled).eql(false);
        done();
      }, 200);
    });

    it('should filter the store by a required filter and paginate', done => {
      var _nbPages                                            = 0;
      lunaris._stores['pagination2.param.site']               = initStore('pagination2.param.site', {});
      lunaris._stores['pagination2.param.site'].isStoreObject = true;
      lunaris._stores['pagination2.param.site'].data.add({
        site : 1
      });
      var _map = [{
        id   : ['<<int>>'],
        site : ['int']
      }];
      lunaris._stores['pagination2']= initStore('pagination2', _map,  null, null, [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true,
        operator        : '=',
      }]);

      lunaris.hook('update@pagination2.param.site', () => {
        lunaris._stores['pagination2'].paginationCurrentPage = 1;
        lunaris._stores['pagination2'].paginationOffset      = 0;
      });

      lunaris.hook('get@pagination2', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunaris.get('@pagination2');
          return;
        }
        if (_nbPages === 2) {
          should(items).eql([
            { _rowId : 4, _id : 4, id : 40, label : 'A', _version : [3] },
            { _rowId : 5, _id : 5, id : 50, label : 'C', _version : [3] },
            { _rowId : 6, _id : 6, id : 60, label : 'F', _version : [3] }
          ]);
          lunaris.update('@pagination2.param.site', {
            _id  : 1,
            site : 2
          });
          lunaris.get('@pagination2');
          return;
        }

        should(items).eql([
          { _rowId : 7, _id : 7, id : 70, label : 'G', _version : [5] },
          { _rowId : 8, _id : 8, id : 80, label : 'H', _version : [5] },
          { _rowId : 9, _id : 9, id : 90, label : 'I', _version : [5] }
        ]);

        done();
      });

      lunaris.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunaris.get('@pagination2');
    });

    it('should filter the store by an optional filter', done => {
      lunaris._stores['optional.param.site']               = initStore('optional.param.site');
      lunaris._stores['optional.param.site'].isStoreObject = true;
      lunaris._stores['optional.param.site'].data.add({
        id : 1
      });
      var _map = [{
        id : ['<<int>>']
      }];
      lunaris._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@optional.param.site',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      }]);

      lunaris.hook('get@optional', items => {
        should(items).eql([
          { _rowId : 1, _id : 1, limit : '50', offset : '0', search : 'id:=1', _version : [2]}
        ]);

        done();
      });

      lunaris.hook('errorHttp@optional', err => {
        done(err);
      });

      lunaris.get('@optional');
    });

    it('should fire the event filterUpdated', done => {
      lunaris._stores['optional.param.site']          = initStore('optional.param.site');
      lunaris._stores['optional.param.site'].isLocal  = true;
      lunaris._stores['optional.param.site'].isFilter = true;
      var _map = [{
        id : ['<<int>>']
      }];
      lunaris._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@optional.param.site',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      }]);

      lunaris.hook('filterUpdated@optional.param.site', () => {
        done();
      });

      lunaris.hook('errorHttp@optional', err => {
        done(err);
      });

      lunaris.insert('@optional.param.site', { id : 1 });
    });

    it('should fire the event filterUpdated for GET : store object', done => {
      lunaris._stores['store1']          = initStore('store1');
      lunaris._stores['store1'].isLocal  = true;
      lunaris._stores['store1'].isFilter = true;
      var _map = {
        id : ['int']
      };
      lunaris._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@store1',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      }]);

      lunaris.hook('filterUpdated@store1', () => {
        done();
      });

      lunaris.hook('errorHttp@optional', err => {
        done(err);
      });

      lunaris._stores['store1'].data.add({ id : 1 });
      lunaris.get('@store1');
    });

    it('should not fire the event filterUpdated for GET : store object', done => {
      lunaris._stores['store1']          = initStore('store1');
      lunaris._stores['store1'].isLocal  = true;
      lunaris._stores['store1'].isFilter = true;
      var _map = {
        id : ['int']
      };
      lunaris._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@store1',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      }]);

      var _hasBeenCalled = false;
      lunaris.hook('filterUpdated@store1', () => {
        _hasBeenCalled = true;
      });

      lunaris.hook('errorHttp@optional', () => {
        _hasBeenCalled = true;
      });

      setTimeout(() => {
        should(_hasBeenCalled).eql(false);
        done();
      }, 100);

      lunaris.get('@store1');
    });

    it('should fire the event filterUpdated for GET : store array', done => {
      lunaris._stores['store1']          = initStore('store1');
      lunaris._stores['store1'].isFilter = true;
      var _map = [{
        id : ['<<int>>']
      }];
      lunaris._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@store1',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      }]);

      lunaris.hook('filterUpdated@store1', () => {
        done();
      });

      lunaris.hook('errorHttp@optional', err => {
        done(err);
      });

      lunaris.get('@store1');
    });

    it('should filter the store by two optional filters', done => {
      lunaris._stores['optional.param.site']               = initStore('optional.param.site');
      lunaris._stores['optional.param.site'].isStoreObject = true;
      lunaris._stores['optional.param.site'].data.add({
        id : 1
      });
      lunaris._stores['optional.param.category']               = initStore('optional.param.category');
      lunaris._stores['optional.param.category'].isStoreObject = true;
      lunaris._stores['optional.param.category'].data.add({
        id : 2
      });
      var _map = [{
        id       : ['<<int>>'],
        category : ['int']
      }];
      lunaris._stores['optional'] = initStore('optional', _map, null, null, [
        {
          source          : '@optional.param.site',
          sourceAttribute : 'id',
          localAttribute  : 'id',
          operator        : '='
        }, {
          source          : '@optional.param.category',
          sourceAttribute : 'id',
          localAttribute  : 'category',
          operator        : '='
        }
      ]);

      lunaris.hook('get@optional', items => {
        should(items).eql([
          { _rowId : 1, _id : 1, limit : '50', offset : '0', search : 'id:=1+category:=2', _version : [3]}
        ]);

        done();
      });

      lunaris.hook('errorHttp@optional', err => {
        done(err);
      });

      lunaris.get('@optional');
    });

    it('should filter the store by an optional array filter', done => {
      lunaris._stores['optional.param.site'] = initStore('optional.param.site');
      lunaris._stores['optional.param.site'].data.add({
        id : 1
      });
      lunaris._stores['optional.param.site'].data.add({
        id : 2
      });
      var _map = [{
        id : ['<<int>>']
      }];
      lunaris._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@optional.param.site',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      }]);

      lunaris.hook('get@optional', items => {
        should(items).eql([
          { _rowId : 1, _id : 1, limit : '50', offset : '0', search : 'id:[1,2]', _version : [3]}
        ]);

        done();
      });

      lunaris.hook('errorHttp@optional', err => {
        done(err);
      });

      lunaris.get('@optional');
    });

    it('should not filter the store if the optional filter is not set', done => {
      lunaris._stores['optional.param.site']     = initStore('optional.param.site');
      var _map = [{
        id   : ['<<int>>'],
        site : ['string']
      }];
      lunaris._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@optional.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        operator        : 'ILIKE'
      }]);

      lunaris.hook('get@optional', items => {
        should(items).eql([
          { _rowId : 1, _id : 1, limit : '50', offset : '0', _version : [1]}
        ]);

        done();
      });

      lunaris.hook('errorHttp@optional', err => {
        done(err);
      });

      lunaris.get('@optional');
    });

    it('should get the item identified by its id', done => {
      var _currentId = 1;
      lunaris._stores['get'] = initStore('get');
      lunaris.hook('get@get', item => {
        if (_currentId === 1) {
          should(item).be.an.Object();
          should(item).eql([{
            _rowId   : 1,
            _id      : 1,
            id       : 1,
            _version : [1]
          }]);
          _currentId++;
          lunaris.get('@get', _currentId);
          return;
        }

        should(item).eql([{
          _rowId   : 2,
          _id      : 2,
          id       : 2,
          _version : [2]
        }]);

        done();
      });

      lunaris.hook('errorHttp@get', err => {
        done(err);
      });

      lunaris.get('@get', _currentId);
    });

    it('should get the item identified by its id = 0', done => {
      var _currentId = 0;
      lunaris._stores['get'] = initStore('get');
      lunaris.hook('get@get', item => {
        if (_currentId === 0) {
          should(item).be.an.Object();
          should(item).eql([{
            _rowId   : 1,
            _id      : 1,
            id       : 0,
            _version : [1]
          }]);
          _currentId++;
          lunaris.get('@get', _currentId);
          return;
        }

        should(item).eql([{
          _rowId   : 2,
          _id      : 2,
          id       : 1,
          _version : [2]
        }]);

        done();
      });

      lunaris.hook('errorHttp@get', err => {
        done(err);
      });

      lunaris.get('@get', _currentId);
    });

    it('should not filter the store by a required filter if the filer is not authorized for the current method', done => {
      lunaris._stores['required.param.site'] = initStore('required.param.site');
      lunaris._stores['required.param.site'].data.add({
        site : 1
      });
      var _map = [{
        id   : ['<<int>>'],
        site : ['string']
      }];
      lunaris._stores['methods'] = initStore('methods', _map, null, null, [{
        source          : '@required.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true,
        httpMethods     : ['POST'],
        operator        : 'ILIKE'
      }]);

      lunaris.hook('get@methods', data => {
        should(data[0].query).be.ok();
        should(data[0].params).be.ok();
        should(data[0].query).eql({ limit : '50', offset : '0' });
        should(data[0].params).eql({});
        should(data[0].body).be.ok();
        should(data[0].body).eql({});
        done();
      });

      lunaris.hook('errorHttp@methods', err => {
        done(err);
      });

      lunaris.get('@methods');
    });
  });

  describe('offline', () => {
    before(() => {
      lunaris.offline.isOnline = false;
    });
    after(() => {
      lunaris.offline.isOnline = true;
    });

    it('should filter the store by a required filter when offline', done => {
      lunaris._stores['required.param.site']               = initStore('required.param.site', {});
      lunaris._stores['required.param.site'].isStoreObject = true;
      lunaris._stores['required.param.site'].isLocal       = true;
      lunaris._stores['required.param.site'].data.add({
        site : 1
      });
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      lunaris._stores['required'] = initStore('required', _map, null, null, [{
        source          : '@required.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'id',
        isRequired      : true,
        operator        : '='
      }], {
        'required.param.site' : {
          isStoreObject : true
        }
      });

      var _hasBeenCalled = false;
      lunaris.hook('inserted@required', () => {
        _hasBeenCalled = true;
      });
      lunaris.hook('errorHttp@required', () => {
        _hasBeenCalled = true;
      });

      lunaris.insert('@required', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' },
        { id : 3, label : 'C' },
        { id : 4, label : 'D' }
      ]);

      lunaris.hook('get@required', items => {
        should(items).eql([
          { _rowId : 5, _id : 1, id : 1, label : 'A', _version : [3] }
        ]);
        should(Object.isFrozen(items[0])).eql(true);
        should(_hasBeenCalled).eql(false);
        done();
      });

      lunaris.get('@required');
    });

    it('should filter the store by an optional filter when offline', done => {
      lunaris._stores['optional.param.site']               = initStore('optional.param.site', {});
      lunaris._stores['optional.param.site'].isStoreObject = true;
      lunaris._stores['optional.param.site'].isLocal       = true;
      lunaris._stores['optional.param.site'].data.add({
        site : 1
      });
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      lunaris._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@optional.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site.id',
        isRequired      : true,
        operator        : '='
      }], {
        'optional.param.site' : {
          isStoreObject : true
        }
      });

      lunaris.insert('@optional', [
        { id : 1, label : 'A', site : { id : 1 } },
        { id : 2, label : 'B', site : { id : 2 } },
        { id : 3, label : 'C', site : { id : 1 } },
        { id : 4, label : 'D', site : { id : 2 } }
      ]);

      var _hasBeenCalled = false;
      lunaris.hook('inserted@optional', () => {
        _hasBeenCalled = true;
      });
      lunaris.hook('errorHttp@optional', () => {
        _hasBeenCalled = true;
      });

      lunaris.hook('get@optional', items => {
        should(items).eql([
          { _rowId : 5, _id : 1, id : 1, label : 'A', site : { id : 1 }, _version : [3] },
          { _rowId : 7, _id : 3, id : 3, label : 'C', site : { id : 1 }, _version : [3] },
        ]);
        should(Object.isFrozen(items[0])).eql(true);
        should(Object.isFrozen(items[1])).eql(true);
        should(_hasBeenCalled).eql(false);
        done();
      });

      lunaris.get('@optional');
    });

    it('should filter the store by an optional filter when offline and add to the cache', done => {
      lunaris._stores['optional.param.site']               = initStore('optional.param.site', {});
      lunaris._stores['optional.param.site'].isStoreObject = true;
      lunaris._stores['optional.param.site'].isLocal       = true;
      lunaris._stores['optional.param.site'].data.add({
        site : 2
      });
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      lunaris._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@optional.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site.id',
        isRequired      : true,
        operator        : '='
      }], {
        'optional.param.site' : {
          isStoreObject : true
        }
      });

      var _hasBeenCalled = false;
      lunaris.hook('inserted@optional', () => {
        _hasBeenCalled = true;
      });
      lunaris.hook('errorHttp@optional', () => {
        _hasBeenCalled = true;
      });

      lunaris.insert('@optional', [
        { id : 1, label : 'A', site : { id : 2 } },
        { id : 2, label : 'B', site : { id : 2 } },
        { id : 3, label : 'C', site : { id : 1 } },
        { id : 4, label : 'D', site : { id : 2 } }
      ]);

      lunaris.setPagination('@optional', 1, 2);

      lunaris.hook('get@optional', items => {
        should(items).eql([
          { _rowId : 5, _id : 1, id : 1, label : 'A', site : { id : 2 }, _version : [3] },
          { _rowId : 6, _id : 2, id : 2, label : 'B', site : { id : 2 }, _version : [3] },
        ]);
        should(Object.isFrozen(items[0])).eql(true);
        should(Object.isFrozen(items[1])).eql(true);
        should(_hasBeenCalled).eql(false);
        should(lunaris._cache._cache()).eql([
          {
            hash   : '3bf9c704386d507fcbb9937429d5cdf8',
            values : [
              { id : 1, label : 'A', site : { id : 2 } },
              { id : 2, label : 'B', site : { id : 2 } }
            ],
            stores : ['optional']
          },
          {
            hash   : '69025bf6ea0bc4767ce95680392ed9ce',
            values : [{ id : 4, label : 'D', site : { id : 2 } }],
            stores : ['optional']
          }
        ]);
        done();
      });

      lunaris.get('@optional');
    });

    it('should not make an http request when offline : UPSERT', done => {
      lunaris._stores['optional.param.site']               = initStore('optional.param.site', {});
      lunaris._stores['optional.param.site'].isStoreObject = true;
      lunaris._stores['optional.param.site'].isLocal       = true;
      lunaris._stores['optional.param.site'].data.add({
        site : 2
      });
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      lunaris._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@optional.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site.id',
        isRequired      : true,
        operator        : '='
      }], {
        'optional.param.site' : {
          isStoreObject : true
        }
      });

      var _hasBeenCalled = false;
      lunaris.hook('inserted@optional', () => {
        _hasBeenCalled = true;
      });
      lunaris.hook('errorHttp@optional', () => {
        _hasBeenCalled = true;
      });

      lunaris.insert('@optional', [
        { id : 1, label : 'A', site : { id : 2 } },
        { id : 2, label : 'B', site : { id : 2 } },
        { id : 3, label : 'C', site : { id : 1 } },
        { id : 4, label : 'D', site : { id : 2 } }
      ]);

      setTimeout(() => {
        should(_hasBeenCalled).eql(false);
        done();
      }, 100);
    });

    it('should not make an http request when offline : DELETE', done => {
      lunaris._stores['optional.param.site']               = initStore('optional.param.site', {});
      lunaris._stores['optional.param.site'].isStoreObject = true;
      lunaris._stores['optional.param.site'].isLocal       = true;
      lunaris._stores['optional.param.site'].data.add({
        site : 2
      });
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      lunaris._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@optional.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site.id',
        isRequired      : true,
        operator        : '='
      }], {
        'optional.param.site' : {
          isStoreObject : true
        }
      });

      var _hasBeenCalled = false;
      lunaris.hook('deleted@optional', () => {
        _hasBeenCalled = true;
      });
      lunaris.hook('errorHttp@optional', () => {
        _hasBeenCalled = true;
      });

      lunaris.insert('@optional', [
        { id : 1, label : 'A', site : { id : 2 } },
        { id : 2, label : 'B', site : { id : 2 } },
        { id : 3, label : 'C', site : { id : 1 } },
        { id : 4, label : 'D', site : { id : 2 } }
      ]);

      lunaris.delete('@optional', { _id : 1 });

      setTimeout(() => {
        should(_hasBeenCalled).eql(false);
        done();
      }, 100);
    });

    it('should set the id when inserting : simpleKey', () => {
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      lunaris._stores['required'] = initStore('required', _map);

      lunaris.insert('@required', { id : null, label : 'A' });

      should(lunaris.getOne('@required', 1)).eql({
        id       : '_1',
        label    : 'A',
        _rowId   : 1,
        _id      : 1,
        _version : [1]
      });
    });

    it('should set the id when inserting : composite key', () => {
      var _map = [{
        id    : ['<<int>>'],
        label : ['<<string>>']
      }];
      lunaris._stores['required'] = initStore('required', _map);

      lunaris.insert('@required', { id : null, label : 'A' });

      should(lunaris.getOne('@required', 1)).eql({
        id       : '_1',
        label    : 'A',
        _rowId   : 1,
        _id      : 1,
        _version : [1]
      });
    });

    it('should set the id when inserting : simpleKey && no map', () => {
      lunaris._stores['required']            = initStore('required');
      lunaris._stores['required'].primaryKey = ['id'];

      lunaris.insert('@required', { id : null, label : 'A' });

      should(lunaris.getOne('@required', 1)).eql({
        id       : '_1',
        label    : 'A',
        _rowId   : 1,
        _id      : 1,
        _version : [1]
      });
    });

    it('should set the id when inserting : composite key && no map', () => {
      lunaris._stores['required'] = initStore('required');
      lunaris._stores['required'].primaryKey = ['id', 'label'];

      lunaris.insert('@required', { id : null, label : 'A' });

      should(lunaris.getOne('@required', 1)).eql({
        id       : '_1',
        label    : 'A',
        _rowId   : 1,
        _id      : 1,
        _version : [1]
      });
    });
  });


  describe('clear()', () => {
    it('should be defined', () => {
      should(lunaris.clear).be.ok();
      should(lunaris.clear).be.Function();
    });

    it('should throw an error if the store is not a string', () => {
      lunaris.clear({});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.clear' + {});
      should(lastError[1]).eql(new Error('lunaris.<get|insert|update|clear|delete>(<store>, <value>) must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunaris.clear('@store');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.clear@store');
      should(lastError[1]).eql(new Error('The store "store" has not been defined'));
    });

    it('should clear the store', () => {
      var _store = initStore('store1');
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] });
      lunaris.clear('@store1');
      should(lunaris._stores['store1'].data._getAll()).be.an.Array().and.have.length(0);
      lunaris.get('@store1');
      lunaris.get('@store1');
      should(lunaris._stores['store1'].paginationCurrentPage).eql(3);
      should(lunaris._stores['store1'].paginationOffset).eql(100);
      lunaris.clear('@store1');
      should(lunaris._stores['store1'].paginationCurrentPage).eql(1);
      should(lunaris._stores['store1'].paginationOffset).eql(0);
    });

    it('should clear the store and enver trigger the hook', done => {
      var _hasFiredHook = false;
      var _store        = initStore('store1');
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] });

      lunaris.hook('reset@store1', () => {
        _hasFiredHook = true;
      });

      lunaris.clear('@store1', true);
      setTimeout(() => {
        should(_hasFiredHook).eql(false);
        done();
      }, 200);
    });

    it('should not clear multiple stores and not send events', done => {
      var _hooks = {};
      lunaris._stores['store.filter.A']         = initStore('store.filter.A');
      lunaris._stores['store.filter.A'].isLocal = true;
      lunaris._stores['store.filter.B']         = initStore('store.filter.B');
      lunaris._stores['store.filter.B'].isLocal = true;
      lunaris._stores['store.C']                = initStore('store.C');
      lunaris._stores['store.C'].isLocal        = true;

      lunaris.hook('reset@store.filter.A', () => {
        _hooks['store.filter.A'] = true;
      });
      lunaris.hook('reset@store.filter.B', () => {
        _hooks['store.filter.B'] = true;
      });
      lunaris.hook('reset@store.C', () => {
        _hooks['store.C'] = true;
      });

      lunaris.insert('@store.filter.A', {
        label : 'A'
      });
      lunaris.insert('@store.filter.B', {
        label : 'B'
      });
      lunaris.insert('@store.C', {
        label : 'C'
      });

      lunaris.clear('store.filter.*');
      setTimeout(() => {
        should(Object.keys(_hooks)).eql([]);
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.clear');
        should(lastError[1]).eql(new Error('The store key must begin by \'@\''));
        done();
      }, 100);
    });

    it('should clear multiple stores and send events', done => {
      var _hooks = {};
      lunaris._stores['store.filter.A'] = initStore('store.filter.A');
      lunaris._stores['store.filter.B'] = initStore('store.filter.B');
      lunaris._stores['store.C']        = initStore('store.C');

      lunaris.hook('reset@store.filter.A', () => {
        _hooks['store.filter.A'] = true;
      });
      lunaris.hook('reset@store.filter.B', () => {
        _hooks['store.filter.B'] = true;
      });
      lunaris.hook('reset@store.C', () => {
        _hooks['store.C'] = true;
      });

      lunaris.insert('@store.filter.A', {
        label : 'A'
      });
      lunaris.insert('@store.filter.B', {
        label : 'B'
      });
      lunaris.insert('@store.C', {
        label : 'C'
      });

      lunaris.clear('@store.filter.*');
      setTimeout(() => {
        should(_hooks).eql({
          'store.filter.A' : true,
          'store.filter.B' : true
        });
        should(lunaris._stores['store.filter.A'].data.getAll()).eql([]);
        should(lunaris._stores['store.filter.B'].data.getAll()).eql([]);
        should(lunaris._stores['store.C'].data.getAll()).eql([{
          _id      : 1,
          _rowId   : 1,
          _version : [3],
          label    : 'C'
        }]);
        done();
      }, 100);
    });

    it('should clear multiple stores and not send events', done => {
      lunaris._stores['store.filter.A'] = initStore('store.filter.A');
      lunaris._stores['store.filter.B'] = initStore('store.filter.B');
      lunaris._stores['store.C']        = initStore('store.C');

      lunaris.insert('@store.filter.A', {
        label : 'A'
      });
      lunaris.insert('@store.filter.B', {
        label : 'B'
      });
      lunaris.insert('@store.C', {
        label : 'C'
      });

      lunaris.clear('@store.filter.*');
      setTimeout(() => {
        should(lunaris._stores['store.filter.A'].data.getAll()).eql([]);
        should(lunaris._stores['store.filter.B'].data.getAll()).eql([]);
        should(lunaris._stores['store.C'].data.getAll()).eql([{
          _id      : 1,
          _rowId   : 1,
          _version : [3],
          label    : 'C'
        }]);
        done();
      }, 100);
    });
  });

  describe('rollback', () => {
    it('should be defined', () => {
      should(lunaris.rollback).be.ok();
      should(lunaris.rollback).be.Function();
    });

    it('should throw an error if the store is not a string', () => {
      lunaris.rollback({});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.rollback' + {});
      should(lastError[1]).eql(new Error('lunaris.<get|insert|update|clear|delete>(<store>, <value>) must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunaris.rollback('@store');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.rollback@store');
      should(lastError[1]).eql(new Error('The store "store" has not been defined'));
    });

    it('should rollback the store', done => {
      var _store                                      = initStore('store_insert_post');
      lunaris._stores['store_insert_post']            = _store;
      lunaris._stores['store_insert_post'].primaryKey = 'id';

      lunaris.hook('errorHttp@store_insert_post', () => {
        lunaris.rollback('@store_insert_post', lunaris._stores.lunarisErrors.data.getAll()[0].version);
        should(lunaris._stores.store_insert_post.data.getAll()).have.lengthOf(0);
        done();
      });

      lunaris.insert('@store_insert_post', { id : 2, label : 'A' });
      should(lunaris._stores.store_insert_post.data.getAll()).have.lengthOf(1);
    });
  });

  describe('retry', () => {
    it('should be defined', () => {
      should(lunaris.retry).be.ok();
      should(lunaris.retry).be.Function();
    });

    it('should retry : insert', done => {
      var _store                                      = initStore('store_insert_post');
      var _nbExecuted                                 = 0;
      lunaris._stores['store_insert_post']            = _store;
      lunaris._stores['store_insert_post'].primaryKey = 'id';

      lunaris.hook('errorHttp@store_insert_post', () => {
        var _values = lunaris._stores.lunarisErrors.data.getAll();
        _nbExecuted++;
        if (_nbExecuted === 1) {
          should(_values).have.lengthOf(1);
          delete _values[0].date;
          should(_values[0]).eql({
            _rowId             : 1,
            _id                : 1,
            _version           : [2],
            version            : 1,
            data               : { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] },
            url                : '/store_insert_post',
            method             : 'POST',
            storeName          : 'store_insert_post',
            messageError       : '${An error has occured}',
            messageErrorServer : { error : 404, message : 'Not Found'},
          });
          lunaris.retry('@store_insert_post', _values[0].url, _values[0].method, _values[0].data, _values[0].version);
          return;
        }

        should(_values).have.lengthOf(2);
        delete _values[1].date;
        should(_values[1]).eql({
          _rowId             : 2,
          _id                : 2,
          _version           : [3],
          version            : 1,
          data               : { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] },
          url                : '/store_insert_post',
          method             : 'POST',
          storeName          : 'store_insert_post',
          messageError       : '${An error has occured}',
          messageErrorServer : { error : 404, message : 'Not Found'},
        });
        done();
      });

      lunaris.insert('@store_insert_post', { id : 2, label : 'A' });
    });

    it('should retry : update', done => {
      var _nbExecuted = 0;
      var _store                                     = initStore('store_insert_put');
      lunaris._stores['store_insert_put']            = _store;
      lunaris._stores['store_insert_put'].primaryKey = 'id';

      lunaris.hook('inserted@store_insert_put', () => {
        lunaris.update('@store_insert_put', { _id : 1, id : 2, label : 'A' });
      });

      lunaris.hook('errorHttp@store_insert_put', () => {
        var _values = lunaris._stores.lunarisErrors.data.getAll();
        _nbExecuted++;
        if (_nbExecuted === 1) {
          should(_values).have.lengthOf(1);
          delete _values[0].date;
          should(_values[0]).eql({
            _rowId             : 1,
            _id                : 1,
            _version           : [4],
            version            : 3,
            data               : { _rowId : 3, _id : 1, id : 2, label : 'A', _version : [3] },
            url                : '/store_insert_put/2',
            method             : 'PUT',
            storeName          : 'store_insert_put',
            messageError       : '${An error has occured}',
            messageErrorServer : { error : 404, message : 'Not Found'},
          });
          lunaris.retry('@store_insert_put', _values[0].url, _values[0].method, _values[0].data, _values[0].version);
          return;
        }
        should(_values).have.lengthOf(2);
        delete _values[1].date;
        should(_values[1]).eql({
          _rowId             : 2,
          _id                : 2,
          _version           : [5],
          version            : 3,
          data               : { _rowId : 3, _id : 1, id : 2, label : 'A', _version : [3] },
          url                : '/store_insert_put/2',
          method             : 'PUT',
          storeName          : 'store_insert_put',
          messageError       : '${An error has occured}',
          messageErrorServer : { error : 404, message : 'Not Found'},
        });
        done();
      });

      lunaris.insert('@store_insert_put', { id : 2, label : 'A' });
    });

    it('should retry : get', done => {
      var _nbExecuted = 0;
      var _store               = initStore('store');
      lunaris._stores['store'] = _store;

      lunaris.hook('errorHttp@store', () => {
        var _values = lunaris._stores.lunarisErrors.data.getAll();
        _nbExecuted++;
        if (_nbExecuted === 1) {
          should(_values).have.lengthOf(1);
          delete _values[0].date;
          should(_values[0]).eql({
            _rowId             : 1,
            _id                : 1,
            _version           : [1],
            version            : null,
            data               : null,
            url                : '/store?limit=50&offset=0',
            method             : 'GET',
            storeName          : 'store',
            messageError       : '${An error has occured}',
            messageErrorServer : { error : 404, message : 'Not Found'},
          });
          lunaris.retry('@store', _values[0].url, _values[0].method, _values[0].data, _values[0].version);
          return;
        }

        should(_values).have.lengthOf(2);
        delete _values[1].date;
        should(_values[1]).eql({
          _rowId             : 2,
          _id                : 2,
          _version           : [2],
          version            : null,
          data               : null,
          url                : '/store?limit=50&offset=0',
          method             : 'GET',
          storeName          : 'store',
          messageError       : '${An error has occured}',
          messageErrorServer : { error : 404, message : 'Not Found'},
        });
        done();
      });

      lunaris.get('@store');
    });

    it('should retry : delete', done => {
      var _nbExecuted = 0;
      var _store               = initStore('store_del');
      lunaris._stores['store_del'] = _store;

      lunaris.hook('errorHttp@store_del', () => {
        var _values = lunaris._stores.lunarisErrors.data.getAll();
        _nbExecuted++;
        if (_nbExecuted === 1) {
          should(_values).have.lengthOf(1);
          delete _values[0].date;
          should(_values[0]).eql({
            _rowId             : 1,
            _id                : 1,
            _version           : [3],
            version            : 2,
            data               : { _rowId : 1, _id : 1, id : 1, _version : [1, 2] },
            url                : '/store_del/1',
            method             : 'DELETE',
            storeName          : 'store_del',
            messageError       : '${An error has occured}',
            messageErrorServer : { error : 404, message : 'Not Found'},
          });
          lunaris.retry('@store_del', _values[0].url, _values[0].method, _values[0].data, _values[0].version);
          return;
        }

        should(_values).have.lengthOf(2);
        delete _values[1].date;
        should(_values[1]).eql({
          _rowId             : 2,
          _id                : 2,
          _version           : [4],
          version            : 2,
          data               : { _rowId : 1, _id : 1, id : 1, _version : [1, 2] },
          url                : '/store_del/1',
          method             : 'DELETE',
          storeName          : 'store_del',
          messageError       : '${An error has occured}',
          messageErrorServer : { error : 404, message : 'Not Found'},
        });
        done();
      });

      lunaris._stores['store_del'].data.add({ id : 1 });
      lunaris.delete('@store_del', { _id : 1 });
    });
  });

  describe('getDefaultValue()', () => {
    it('should be defined', () => {
      should(lunaris.getDefaultValue).be.ok();
      should(lunaris.getDefaultValue).be.Function();
    });

    it('should throw an error if the store value is not correct', () => {
      lunaris.getDefaultValue({});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.getDefaultValue' + {});
      should(lastError[1]).eql(new Error('lunaris.<get|insert|update|clear|delete>(<store>, <value>) must have a correct store value: @<store>'));
    });

    it('should return an empty object if no map has been provided', () => {
      lunaris._stores['store1'] = initStore('store1');
      should(lunaris.getDefaultValue('@store1')).eql({});
    });

    it('should return a default object', () => {
      lunaris._stores['store1'] = initStore('store1', [{
        id    : ['<<int>>', 2],
        label : ['string'],
        menus : ['array', {
          id    : ['<<int>>'],
          label : ['string']
        }]
      }]);
      should(lunaris.getDefaultValue('@store1')).eql({
        id    : 2,
        label : null,
        menus : []
      });
    });

    it('should return a default object and not edit the base object', () => {
      lunaris._stores['store1'] = initStore('store1', [{
        id    : ['<<int>>', 2],
        label : ['string'],
        menus : ['array', {
          id    : ['<<int>>'],
          label : ['string']
        }]
      }]);

      var _defaultValue = lunaris.getDefaultValue('@store1');
      _defaultValue.id    = 3;
      _defaultValue.label = 5;

      should(lunaris._stores['store1'].meta.defaultValue).eql({
        id    : 2,
        label : null,
        menus : []
      });
    });
  });

  describe('validate', () => {
    it('should be defined', () => {
      should(lunaris.validate).be.ok();
      should(lunaris.validate).be.a.Function();
    });

    it('should throw an error if the store has not map', done => {
      lunaris._stores['store'] = initStore('store');
      delete lunaris._stores['store'].validateFn;

      lunaris.validate('@store', { id : 1, label : 1 }, true);
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.validate@store');
      should(lastError[1]).eql(new Error('The store does not have a map! You cannot validate a store without a map.'));
      done();
    });

    it('should throw an error if value is an array and store is an object store', done => {
      lunaris._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunaris.validate('@store', { id : 1, label : 1 }, true, () => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.update@store Error when validating data');
        should(lastError[1]).eql({ value : 1, field : 'label', error : '${must be a string}', index : null });
        done();
      });
    });

    it('should validate for insert', done => {
      lunaris._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunaris.validate('@store', { id : 1, label : 'A' }, isValid => {
        should(isValid).eql(true);
        done();
      });
    });

    it('should not validate for insert', done => {
      lunaris._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunaris.validate('@store', { id : 'A', label : 1 }, isValid => {
        should(isValid).eql(false);
        done();
      });
    });

    it('should validate for update', done => {
      lunaris._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunaris.validate('@store', { id : 1, label : 'B' }, true, isValid => {
        should(isValid).eql(true);
        done();
      });
    });

    it('should not validate primary key for update', done => {
      lunaris._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunaris.validate('@store', { id : 'A', label : '1' }, true, isValid => {
        should(isValid).eql(false);
        done();
      });
    });

    it('should not validate other keys for update', done => {
      lunaris._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunaris.validate('@store', { id : 1, label : 1 }, true, isValid => {
        should(isValid).eql(false);
        done();
      });
    });
  });

  describe('cache', () => {

    beforeEach(() => {
      nbCallsPagination2 = 0;
    });

    it('should cache the values', done => {
      var _nbPages                                            = 0;
      lunaris._stores['pagination2.param.site']               = initStore('pagination2.param.site');
      lunaris._stores['pagination2.param.site'].isStoreObject = true;
      lunaris._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunaris._stores['pagination2'] = initStore('pagination2', [{
        id : ['<<int>>']
      }]);
      lunaris._stores['pagination2'].filters = [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      }];

      lunaris.hook('get@pagination2', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunaris.setPagination('@pagination2', 1, 50);
          lunaris.get('@pagination2');
          return;
        }


        should(items).eql([
          { _rowId : 4, _id : 1, id : 20, label : 'B', _version : [3] },
          { _rowId : 5, _id : 2, id : 30, label : 'D', _version : [3] },
          { _rowId : 6, _id : 3, id : 10, label : 'E', _version : [3] }
        ]);

        should(nbCallsPagination2).eql(1);

        done();
      });

      lunaris.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunaris.get('@pagination2');
    });

    it('should cache the values and not save collection\'s attributes', done => {
      var _nbPages                                            = 0;
      lunaris._stores['pagination2.param.site']               = initStore('pagination2.param.site');
      lunaris._stores['pagination2.param.site'].isStoreObject = true;
      lunaris._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunaris._stores['pagination2'] = initStore('pagination2', [{
        id : ['<<int>>']
      }]);
      lunaris._stores['pagination2'].filters = [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      }];

      lunaris.hook('get@pagination2', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunaris.setPagination('@pagination2', 1, 50);
          lunaris.get('@pagination2');
          return;
        }

        should(items).eql([
          { _rowId : 4, _id : 1, id : 20, label : 'B', _version : [3] },
          { _rowId : 5, _id : 2, id : 30, label : 'D', _version : [3] },
          { _rowId : 6, _id : 3, id : 10, label : 'E', _version : [3] }
        ]);

        var _cacheRes =lunaris._cache._cache();
        should(_cacheRes).have.lengthOf(1);
        should(_cacheRes[0].values).have.lengthOf(3);
        should(_cacheRes[0].values[0]._id).not.ok();
        should(_cacheRes[0].values[0]._rowId).not.ok();
        should(_cacheRes[0].values[0]._version).not.ok();
        should(_cacheRes[0].values[1]._id).not.ok();
        should(_cacheRes[0].values[1]._rowId).not.ok();
        should(_cacheRes[0].values[1]._version).not.ok();
        should(_cacheRes[0].values[2]._id).not.ok();
        should(_cacheRes[0].values[2]._rowId).not.ok();
        should(_cacheRes[0].values[2]._version).not.ok();
        should(nbCallsPagination2).eql(1);

        done();
      });

      lunaris.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunaris.get('@pagination2');
    });

    it('should unvalidate the cache if a value has been updated', done => {
      var _nbPages                                            = 0;
      lunaris._stores['pagination2.param.site']               = initStore('pagination2.param.site');
      lunaris._stores['pagination2.param.site'].isStoreObject = true;
      lunaris._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunaris._stores['pagination2']            = initStore('pagination2');
      lunaris._stores['pagination2'].filters    = [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      }];

      lunaris.hook('get@pagination2', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunaris.setPagination('@pagination2', 1, 50);
          lunaris.update('@pagination2', { _id : 3, id : 10, label : 'E-2'}, true);
          lunaris.get('@pagination2');
          return;
        }

        should(items).eql([
          { _rowId : 5, _id : 4, id : 20, label : 'B', _version : [4] },
          { _rowId : 6, _id : 5, id : 30, label : 'D', _version : [4] },
          { _rowId : 7, _id : 6, id : 10, label : 'E', _version : [4] }
        ]);

        should(nbCallsPagination2).eql(2);

        done();
      });

      lunaris.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunaris.get('@pagination2');
    });

    it('should unvalidate the cache id if it is deleted', done => {
      var _nbPages                                            = 0;
      lunaris._stores['pagination2.param.site']               = initStore('pagination2.param.site');
      lunaris._stores['pagination2.param.site'].isStoreObject = true;
      lunaris._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunaris._stores['pagination2'] = initStore('pagination2', [{
        id : ['<<int>>']
      }]);
      lunaris._stores['pagination2'].filters = [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      }];

      lunaris.hook('get@pagination2', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunaris.setPagination('@pagination2', 1, 50);
          lunaris.delete('@pagination2', { _id : 3, id : 10, label : 'E'}, null, true);
          lunaris.get('@pagination2');
          return;
        }

        should(items).eql([
          { _rowId : 4, _id : 1, id : 20, label : 'B', _version : [4] },
          { _rowId : 5, _id : 2, id : 30, label : 'D', _version : [4] },
          { _rowId : 6, _id : 6, id : 10, label : 'E', _version : [4] }
        ]);

        should(nbCallsPagination2).eql(2);

        done();
      });

      lunaris.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunaris.get('@pagination2');
    });
  });

  describe('Set pagination', () => {
    it('should reset the pagiantion : page 1', done => {
      lunaris._stores['pagination2.param.site'] = initStore('pagination2.param.site');
      lunaris._stores['pagination2.param.site'].isStoreObject = true;
      lunaris._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunaris._stores['pagination2']            = initStore('pagination2');
      lunaris._stores['pagination2'].filters    = [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      }];

      lunaris.hook('get@pagination2', () => {
        should(lunaris._stores['pagination2'].paginationLimit).eql(50);
        should(lunaris._stores['pagination2'].paginationCurrentPage).eql(2);
        should(lunaris._stores['pagination2'].paginationOffset).eql(50);
        lunaris.setPagination('@pagination2', 1, 20);
        should(lunaris._stores['pagination2'].paginationLimit).eql(20);
        should(lunaris._stores['pagination2'].paginationCurrentPage).eql(1);
        should(lunaris._stores['pagination2'].paginationOffset).eql(0);
        done();
      });

      lunaris.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunaris.get('@pagination2');
    });

    it('should reset the pagiantion : page > 1', done => {
      lunaris._stores['pagination2.param.site'] = initStore('pagination2.param.site');
      lunaris._stores['pagination2.param.site'].isStoreObject = true;
      lunaris._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunaris._stores['pagination2']            = initStore('pagination2');
      lunaris._stores['pagination2'].filters    = [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      }];

      lunaris.hook('get@pagination2', () => {
        should(lunaris._stores['pagination2'].paginationLimit).eql(50);
        should(lunaris._stores['pagination2'].paginationCurrentPage).eql(2);
        should(lunaris._stores['pagination2'].paginationOffset).eql(50);
        lunaris.setPagination('@pagination2', 4, 20);
        should(lunaris._stores['pagination2'].paginationLimit).eql(20);
        should(lunaris._stores['pagination2'].paginationCurrentPage).eql(4);
        should(lunaris._stores['pagination2'].paginationOffset).eql(80);
        done();
      });

      lunaris.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunaris.get('@pagination2');
    });
  });

  describe('transaction', () => {

    beforeEach(() => {
      lunaris._resetTransaction();
    });

    it('should fire the event "filterUpdated"', done => {
      lunaris._stores['transaction_A']               = initStore('transaction_A');
      lunaris._stores['transaction_A'].isLocal       = true;
      lunaris._stores['transaction_A'].isFilter      = true;
      lunaris._stores['transaction_A'].isStoreObject = true;

      lunaris.hook('filterUpdated@transaction_A', () => {
        done();
      });

      lunaris.begin();
      lunaris.insert('@transaction_A', { id : 1 });
      lunaris.commit();
    });

    it('should fire the event "filterUpdated" once', done => {
      lunaris._stores['transaction'] = initStore('transaction');
      lunaris._stores['transaction'].filters[
        {
          source          : '@transaction_A',
          sourceAttribute : 'label',
          localAttribute  : 'label'
        }, {
          source          : '@transaction_B',
          sourceAttribute : 'label',
          localAttribute  : 'label'
        }
      ];
      lunaris._stores['transaction_1'] = initStore('transaction_1');
      lunaris._stores['transaction_1'].isStoreObject = true;

      lunaris._stores['transaction_1'].filters[
        {
          source          : '@transaction_A',
          sourceAttribute : 'label',
          localAttribute  : 'label'
        }
      ];
      lunaris._stores['transaction_A']               = initStore('transaction_A');
      lunaris._stores['transaction_A'].isLocal       = true;
      lunaris._stores['transaction_A'].isFilter      = true;
      lunaris._stores['transaction_A'].isStoreObject = true;
      lunaris._stores['transaction_B']               = initStore('transaction_B');
      lunaris._stores['transaction_B'].isLocal       = true;
      lunaris._stores['transaction_B'].isFilter      = true;
      lunaris._stores['transaction_B'].isStoreObject = true;

      var _hasBeenCalledA = 0;
      var _hasBeenCalledB = 0;

      lunaris.hook('filterUpdated@transaction_A', () => {
        _hasBeenCalledA++;
      });

      lunaris.hook('filterUpdated@transaction_B', () => {
        _hasBeenCalledB++;
      });

      lunaris.begin();
      lunaris.insert('@transaction_A', { id : 1 });
      lunaris.insert('@transaction_B', { id : 1 });
      lunaris.commit();

      setTimeout(() => {
        should(_hasBeenCalledA).eql(0);
        should(_hasBeenCalledB).eql(1);
        done();
      }, 40);
    });

    it('should commit a store', done => {
      var _store                  = initStore('multiple');
      lunaris._stores['multiple'] = _store;

      var _events = [];
      lunaris.hook('insert@multiple', () => {
        _events.push('insert@multiple');
      });
      lunaris.hook('inserted@multiple', () => {
        _events.push('inserted@multiple');
      });

      lunaris.begin();
      lunaris.insert('@multiple', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
      lunaris.commit();

      setTimeout(() => {
        should(_events).eql([
          'insert@multiple',
          'inserted@multiple'
        ]);
        done();
      }, 100);
    });

    it('should cancel a commit', done => {
      var _store                  = initStore('multiple');
      lunaris._stores['multiple'] = _store;

      var _events = [];
      lunaris.hook('insert@multiple', () => {
        _events.push('insert@multiple');
      });
      lunaris.hook('inserted@multiple', () => {
        _events.push('inserted@multiple');
      });

      var rollback = lunaris.begin();
      lunaris.insert('@multiple', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
      rollback();

      lunaris.begin();
      lunaris.insert('@multiple', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
      lunaris.commit();

      setTimeout(() => {
        should(_events).eql([
          'insert@multiple',
          'inserted@multiple'
        ]);
        done();
      }, 100);
    });

    it('should commit multiple stores sequentially', done => {
      lunaris._stores['multiple'] = initStore('multiple');
      lunaris._stores['store1']   = initStore('store1');

      var _events = [];
      lunaris.hook('insert@multiple', () => {
        _events.push('insert@multiple');
      });
      lunaris.hook('inserted@multiple', () => {
        _events.push('inserted@multiple');
      });
      lunaris.hook('insert@store1', () => {
        _events.push('insert@store1');
      });
      lunaris.hook('get@store1', () => {
        _events.push('get@store1');
      });
      lunaris.hook('inserted@store1', () => {
        _events.push('inserted@store1');
      });

      lunaris.begin();
      lunaris.insert('@store1', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
      lunaris.get('@store1');
      lunaris.insert('@multiple', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
      lunaris.commit(() => {
        should(_events).eql([
          'insert@store1',
          'inserted@store1',
          'get@store1',
          'insert@multiple',
          'inserted@multiple',
        ]);
        done();
      });
    });

    it('should commit a store : GET with cache', done => {
      var _store                    = initStore('pagination');
      _store.isFilter               = true;
      lunaris._stores['pagination'] = _store;

      lunaris._stores['transaction_cache'] = initStore('transaction_cache');
      lunaris._stores['transaction_cache'].filters[
        {
          source          : '@pagination',
          sourceAttribute : 'label',
          localAttribute  : 'label'
        }
      ];

      var _events = [];
      var _nbCalls = 0;
      lunaris.hook('get@pagination', () => {
        _nbCalls++;
        _events.push('get@pagination');

        if (_nbCalls === 1) {
          lunaris.setPagination('@pagination');
          lunaris.begin();
          lunaris.get('@pagination');
          lunaris.commit(() => {
            setTimeout(() => {
              should(_events).eql([
                'get@pagination',
                'get@pagination',
                'filterUpdated@pagination'
              ]);
              done();
            }, 200);
          });
        }
      });

      lunaris.hook('filterUpdated@pagination', () => {
        _events.push('filterUpdated@pagination');
      });

      lunaris.get('@pagination');
    });

    it('should commit multiple stores sequentially : GET', done => {
      lunaris._stores['pagination'] = initStore('pagination');
      lunaris._stores['store1']   = initStore('store1');

      var _events = [];
      lunaris.hook('get@pagination', () => {
        _events.push('get@pagination');
      });
      lunaris.hook('get@store1', () => {
        _events.push('get@store1');
      });

      lunaris.begin();
      lunaris.get('@store1');
      lunaris.get('@pagination');
      lunaris.commit(() => {
        should(_events).eql([
          'get@store1',
          'get@pagination'
        ]);
        done();
      });
    });

    it('should commit multiple stores sequentially : GET with a store filter', done => {
      lunaris._stores['pagination']          = initStore('pagination');
      lunaris._stores['pagination'].isFilter = true;
      lunaris._stores['store1']              = initStore('store1');

      var _events = [];
      lunaris.hook('get@pagination', () => {
        _events.push('get@pagination');
      });
      lunaris.hook('get@store1', () => {
        _events.push('get@store1');
      });

      lunaris.begin();
      lunaris.get('@store1');
      lunaris.get('@pagination');
      lunaris.commit(() => {
        should(_events).eql([
          'get@store1',
          'get@pagination'
        ]);
        done();
      });
    });

    it('should commit multiple filter stores sequentially and fire the event "filterUpdated" once', done => {
      lunaris._stores['transaction'] = initStore('transaction');
      lunaris._stores['transaction'].filters[
        {
          source          : '@transaction_A',
          sourceAttribute : 'label',
          localAttribute  : 'label'
        }, {
          source          : '@transaction_B',
          sourceAttribute : 'label',
          localAttribute  : 'label'
        }
      ];
      lunaris._stores['transaction_1'] = initStore('transaction_1');
      lunaris._stores['transaction_1'].isStoreObject = true;

      lunaris._stores['transaction_1'].filters[
        {
          source          : '@transaction_A',
          sourceAttribute : 'label',
          localAttribute  : 'label'
        }
      ];
      lunaris._stores['transaction_A']               = initStore('transaction_A');
      lunaris._stores['transaction_A'].isFilter      = true;
      lunaris._stores['transaction_A'].isStoreObject = true;
      lunaris._stores['transaction_B']               = initStore('transaction_B');
      lunaris._stores['transaction_B'].isFilter      = true;
      lunaris._stores['transaction_B'].isStoreObject = true;

      var _hasBeenCalledA = 0;
      var _hasBeenCalledB = 0;

      lunaris.hook('filterUpdated@transaction_A', () => {
        _hasBeenCalledA++;
      });

      lunaris.hook('filterUpdated@transaction_B', () => {
        _hasBeenCalledB++;
      });

      var _events = [];
      lunaris.hook('insert@transaction_A', () => {
        _events.push('insert@transaction_A');
      });
      lunaris.hook('inserted@transaction_A', () => {
        _events.push('inserted@transaction_A');
      });
      lunaris.hook('insert@transaction_B', () => {
        _events.push('insert@transaction_B');
      });
      lunaris.hook('inserted@transaction_B', () => {
        _events.push('inserted@transaction_B');
      });

      lunaris.begin();
      lunaris.insert('@transaction_A', { id : 1 });
      lunaris.insert('@transaction_A', { id : 2 });
      lunaris.insert('@transaction_B', { id : 1 });
      lunaris.commit();

      setTimeout(() => {
        should(_hasBeenCalledA).eql(0);
        should(_hasBeenCalledB).eql(1);
        should(_events).eql([
          'insert@transaction_A',
          'inserted@transaction_A',
          'insert@transaction_A',
          'inserted@transaction_A',
          'insert@transaction_B',
          'inserted@transaction_B'
        ]);
        done();
      }, 100);
    });

    it('should rollback a store : INSERT', done => {
      lunaris._stores['multiple1'] = initStore('multiple1'); // multiple1 must crash
      lunaris._stores['store1']    = initStore('store1');

      var _events = [];
      lunaris.hook('insert@multiple1', () => {
        _events.push('insert@multiple1');
      });
      lunaris.hook('inserted@multiple1', () => {
        _events.push('inserted@multiple1');
      });
      lunaris.hook('insert@store1', () => {
        _events.push('insert@store1');
      });
      lunaris.hook('inserted@store1', () => {
        _events.push('inserted@store1');
      });
      lunaris.hook('delete@store1', () => {
        _events.push('delete@store1');
      });
      lunaris.hook('deleted@store1', () => {
        _events.push('deleted@store1');
      });

      lunaris.begin();
      lunaris.insert('@store1', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
      lunaris.insert('@multiple1', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
      lunaris.commit(() => {
        should(_events).eql([
          'insert@store1',
          'inserted@store1',
          'insert@multiple1',
          'delete@store1', // Remember, lunaris.delete sends two delete events, onve before HTTP request and one after
          'delete@store1', // Remember, lunaris.delete sends two delete events, onve before HTTP request and one after
          'deleted@store1',
        ]);
        done();
      });
    });

    it('should rollback a store : UPDATE', done => {
      lunaris._stores['multiple1'] = initStore('multiple1'); // multiple1 must crash
      lunaris._stores['store1']    = initStore('store1');

      var _events  = [];
      var _nbCalls = 0;
      lunaris.hook('update@store1', () => {
        _nbCalls++;
        if (_nbCalls > 1) {
          _events.push('update@store1');
        }
      });
      lunaris.hook('inserted@store1', (insertedObjs) => {
        insertedObjs[0].label = 'B';

        lunaris.hook('updated@store1', () => {
          _events.push('updated@store1');
        });
        lunaris.hook('insert@multiple1', () => {
          _events.push('insert@multiple1');
        });
        lunaris.hook('inserted@multiple1', () => {
          _events.push('inserted@multiple1');
        });
        lunaris.hook('delete@store1', () => {
          _events.push('delete@store1');
        });
        lunaris.hook('deleted@store1', () => {
          _events.push('deleted@store1');
        });

        lunaris.begin();
        lunaris.update('@store1', insertedObjs[0]);
        lunaris.insert('@multiple1', [
          { id : 1, label : 'A' },
          { id : 2, label : 'B' }
        ]);
        lunaris.commit(() => {
          should(_events).eql([
            'update@store1', // one before HTTP request
            'update@store1', // one after  HTTP request
            'updated@store1',
            'insert@multiple1',
            'update@store1',
            'update@store1',
            'updated@store1',
          ]);
          done();
        });
      });

      lunaris.insert('@store1', { id : 1, label : 'A' });
    });

    it('should rollback a store : DELETE', done => {
      lunaris._stores['multiple1'] = initStore('multiple1'); // multiple1 must crash
      lunaris._stores['store1']    = initStore('store1');

      var _nbCalls = 0;
      var _events  = [];
      lunaris.hook('inserted@store1', (insertedObjs) => {
        _nbCalls++;
        if (_nbCalls > 1) {
          _events.push('inserted@store1');
          return;
        }
        insertedObjs[0].label = 'B';

        lunaris.hook('insert@multiple1', () => {
          _events.push('insert@multiple1');
        });
        lunaris.hook('inserted@multiple1', () => {
          _events.push('inserted@multiple1');
        });
        lunaris.hook('insert@store1', () => {
          _events.push('insert@store1');
        });
        lunaris.hook('update@store1', () => {
          _events.push('update@store1');
        });
        lunaris.hook('updated@store1', () => {
          _events.push('updated@store1');
        });
        lunaris.hook('delete@store1', () => {
          _events.push('delete@store1');
        });
        lunaris.hook('deleted@store1', () => {
          _events.push('deleted@store1');
        });

        lunaris.begin();
        lunaris.delete('@store1', insertedObjs[0]);
        lunaris.insert('@multiple1', [
          { id : 1, label : 'A' },
          { id : 2, label : 'B' }
        ]);
        lunaris.commit(() => {
          should(_events).eql([
            'delete@store1', // one before HTTP request
            'delete@store1', // one after  HTTP request
            'deleted@store1',
            'insert@multiple1',
            'insert@store1',
            'update@store1',
            'inserted@store1',
          ]);
          done();
        });
      });

      lunaris.insert('@store1', { id : 1, label : 'A' });
    });

    it('should not rollback a store : GET', done => {
      lunaris._stores['multiple1'] = initStore('multiple1'); // multiple1 must crash
      var _events  = [];

      lunaris.hook('insert@multiple1', () => {
        _events.push('insert@multiple1');
      });
      lunaris.hook('inserted@multiple1', () => {
        _events.push('inserted@multiple1');
      });
      lunaris.hook('update@multiple1', () => {
        _events.push('update@multiple1');
      });
      lunaris.hook('updated@multiple1', () => {
        _events.push('updated@multiple1');
      });
      lunaris.hook('delete@multiple1', () => {
        _events.push('delete@multiple1');
      });
      lunaris.hook('deleted@multiple1', () => {
        _events.push('deleted@multiple1');
      });

      lunaris.begin();
      lunaris.get('@multiple1');
      lunaris.commit(() => {
        should(_events).eql([]);
        done();
      });
    });
  });

  describe('propagation', () => {

    it('should propagate to a store object : GET', done => {
      var _store                = initStore('store1', null, null, ['propagate']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('propagate', _objectDescriptor, {
        joins       : _schema.meta.joins,
        joinFns     : schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates),
        collections : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['propagate'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.insert('@propagate', { id : 1 });
      lunaris.get('@store1');
      lunaris.hook('update@propagate', res => {
        should(res).eql({
          _rowId       : 2,
          _id          : 1,
          id           : 1,
          store1Values : [
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ],
          _version : [3]
        });
        done();
      });
    });

    it('should propagate to a store : GET', done => {
      var _store                = initStore('store1', null, null, ['propagate']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = [{
        id           : ['<<int>>'],
        store1Values : ['@store1']
      }];
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('propagate', _objectDescriptor, {
        joins       : _schema.meta.joins,
        joinFns     : schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates),
        collections : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['propagate'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.insert('@propagate', [{ id : 1 }, { id : 2 }]);
      lunaris.get('@store1');

      lunaris.hook('update@propagate', res => {
        should(res).eql([
          {
            _rowId       : 3,
            _id          : 1,
            id           : 1,
            store1Values : [
              { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
              { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
              { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
            ],
            _version : [3]
          },
          {
            _rowId       : 4,
            _id          : 2,
            id           : 2,
            store1Values : [
              { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
              { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
              { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
            ],
            _version : [3]
          }
        ]);
        done();
      });
    });

    it('should not propagate to a store if values = [] : GET', done => {
      var _store                = initStore('emptyArray', null, null, ['propagate']);
      lunaris._stores['emptyArray'] = _store;

      var _objectDescriptor     = [{
        id           : ['<<int>>'],
        store1Values : ['@emptyArray']
      }];
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('propagate', _objectDescriptor, {
        joins       : _schema.meta.joins,
        joinFns     : schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates),
        collections : {
          emptyArray : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['propagate'] = _storeToPropagate;

      lunaris.hook('errorHttp@emptyArray', err => {
        done(err);
      });

      lunaris.insert('@propagate', [{ id : 1 }, { id : 2 }]);
      lunaris.get('@emptyArray');

      var _hasBeenCalled = false;
      lunaris.hook('update@propagate', () => {
        _hasBeenCalled = true;
      });

      setTimeout(() => {
        should(_hasBeenCalled).eql(false);
        should(_storeToPropagate.data.getAll()).eql([
          {
            _rowId       : 1,
            _id          : 1,
            id           : 1,
            store1Values : [],
            _version     : [1]
          }, {
            _rowId       : 2,
            _id          : 2,
            id           : 2,
            store1Values : [],
            _version     : [1]
          },
        ]);
        done();
      }, 30);
    });

    it('should propagate to a store : CLEAR', done => {
      var _nbCalled             = 0;
      var _store                = initStore('store1', null, null, ['propagate']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = [{
        id           : ['<<int>>'],
        store1Values : ['@store1']
      }];
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('propagate', _objectDescriptor, {
        joins       : _schema.meta.joins,
        joinFns     : schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates),
        collections : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['propagate'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.insert('@propagate', [{ id : 1 }, { id : 2 }]);
      lunaris.get('@store1');

      lunaris.hook('update@propagate', res => {
        _nbCalled++;

        if (_nbCalled === 1) {
          should(res).eql([
            {
              _rowId       : 3,
              _id          : 1,
              id           : 1,
              store1Values : [
                { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
                { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
                { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
              ],
              _version : [3]
            },
            {
              _rowId       : 4,
              _id          : 2,
              id           : 2,
              store1Values : [
                { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
                { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
                { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
              ],
              _version : [3]
            }
          ]);
          return lunaris.clear('@store1');
        }

        should(res).eql([
          {
            _rowId       : 5,
            _id          : 1,
            id           : 1,
            store1Values : [],
            _version     : [4]
          },
          {
            _rowId       : 6,
            _id          : 2,
            id           : 2,
            store1Values : [],
            _version     : [4]
          }
        ]);

        done();
      });
    });

    it('should propagate to a store object : CLEAR', done => {
      var _nbCalled             = 0;
      var _store                = initStore('store1', null, null, ['propagate']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('propagate', _objectDescriptor, {
        joins       : _schema.meta.joins,
        joinFns     : schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates),
        collections : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['propagate'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.insert('@propagate', { id : 1 });
      lunaris.get('@store1');

      lunaris.hook('update@propagate', res => {
        _nbCalled++;

        if (_nbCalled === 1) {
          should(res).eql({
            _rowId       : 2,
            _id          : 1,
            id           : 1,
            store1Values : [
              { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
              { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
              { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
            ],
            _version : [3]
          });

          return lunaris.clear('@store1');
        }

        should(res).eql({
          _rowId       : 3,
          _id          : 1,
          id           : 1,
          store1Values : [],
          _version     : [4]
        });
        done();
      });
    });

    it('should propagate to a store : DELETE', done => {
      var _nbCalled             = 0;
      var _store                = initStore('store1', null, null, ['propagate']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = [{
        id           : ['<<int>>'],
        store1Values : ['@store1']
      }];
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('propagate', _objectDescriptor, {
        joins       : _schema.meta.joins,
        joinFns     : schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates),
        collections : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['propagate'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.insert('@propagate', [{ id : 1 }, { id : 2 }]);
      lunaris.get('@store1');

      lunaris.hook('update@propagate', res => {
        _nbCalled++;
        if (_nbCalled === 1) {
          should(res).eql([
            {
              _rowId       : 3,
              _id          : 1,
              id           : 1,
              store1Values : [
                { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
                { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
                { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
              ],
              _version : [3]
            },
            {
              _rowId       : 4,
              _id          : 2,
              id           : 2,
              store1Values : [
                { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
                { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
                { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
              ],
              _version : [3]
            }
          ]);

          return lunaris.delete('@store1', { _id : 1});
        }

        should(res).eql([
          {
            _rowId       : 5,
            _id          : 1,
            id           : 1,
            store1Values : [
              { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
              { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
            ],
            _version : [5]
          },
          {
            _rowId       : 6,
            _id          : 2,
            id           : 2,
            store1Values : [
              { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
              { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
            ],
            _version : [5]
          }
        ]);
        done();
      });
    });

    it('should propagate to a store object : DELETE', done => {
      var _nbCalled             = 0;
      var _store                = initStore('store1', null, null, ['propagate']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('propagate', _objectDescriptor, {
        joins       : _schema.meta.joins,
        joinFns     : schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates),
        collections : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['propagate'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.insert('@propagate', { id : 1 });
      lunaris.get('@store1');

      lunaris.hook('update@propagate', res => {
        _nbCalled++;
        if (_nbCalled === 1) {
          should(res).eql({
            _rowId       : 2,
            _id          : 1,
            id           : 1,
            store1Values : [
              { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
              { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
              { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
            ],
            _version : [3]
          });

          return lunaris.delete('@store1', { _id : 1});
        }

        should(res).eql({
          _rowId       : 3,
          _id          : 1,
          id           : 1,
          store1Values : [
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ],
          _version : [5]
        });
        done();
      });
    });

    it('should propagate to a store object : INSERT', done => {
      var _store                = initStore('store1', null, null, ['propagate']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('propagate', _objectDescriptor, {
        joins       : _schema.meta.joins,
        joinFns     : schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates),
        collections : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['propagate'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.insert('@propagate', { id : 1 });

      var _nbCalled = 0;
      lunaris.hook('update@propagate', res => {
        _nbCalled++;
        if (_nbCalled === 1) {
          should(res).eql({
            _rowId       : 2,
            _id          : 1,
            id           : 1,
            store1Values : [
              { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [2] },
              { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] },
            ],
            _version : [3]
          });
          return;
        }

        should(res).eql({
          _rowId       : 3,
          _id          : 1,
          id           : 1,
          store1Values : [
            {
              _rowId   : 3,
              _id      : 1,
              id       : 1,
              label    : 'A',
              _version : [4],
              body     : [
                { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [2] },
                { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] },
              ],
              query  : {},
              params : {}
            },
            {
              _rowId   : 4,
              _id      : 2,
              id       : 2,
              label    : 'B',
              _version : [4],
              body     : [
                { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [2] },
                { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] },
              ],
              query  : {},
              params : {}
            },
          ],
          _version : [5]
        });
        done();
      });

      lunaris.insert('@store1', [{ id : 1, label : 'A' }, { id : 2, label : 'B' }]);
    });

    it('should propagate to a store : INSERT', done => {
      var _store                = initStore('store1', null, null, ['propagate']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = [{
        id           : ['<<int>>'],
        store1Values : ['@store1']
      }];
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('propagate', _objectDescriptor, {
        joins       : _schema.meta.joins,
        joinFns     : schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates),
        collections : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['propagate'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.insert('@propagate', [{ id : 1 }, { id : 2 }]);

      var _nbCalled = 0;
      lunaris.hook('update@propagate', res => {
        _nbCalled++;
        if (_nbCalled === 1) {
          should(res).eql([
            {
              _rowId       : 3,
              _id          : 1,
              id           : 1,
              store1Values : [
                { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [2] },
                { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] },
              ],
              _version : [3]
            }, {
              _rowId       : 4,
              _id          : 2,
              id           : 2,
              store1Values : [
                { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [2] },
                { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] },
              ],
              _version : [3]
            }
          ]);
          return;
        }

        should(res).eql([
          {
            _rowId       : 5,
            _id          : 1,
            id           : 1,
            store1Values : [
              {
                _rowId   : 3,
                _id      : 1,
                id       : 1,
                label    : 'A',
                _version : [4],
                body     : [
                  { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [2] },
                  { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] },
                ],
                query  : {},
                params : {}
              },
              {
                _rowId   : 4,
                _id      : 2,
                id       : 2,
                label    : 'B',
                _version : [4],
                body     : [
                  { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [2] },
                  { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] },
                ],
                query  : {},
                params : {}
              },
            ],
            _version : [5]
          }, {
            _rowId       : 6,
            _id          : 2,
            id           : 2,
            store1Values : [
              {
                _rowId   : 3,
                _id      : 1,
                id       : 1,
                label    : 'A',
                _version : [4],
                body     : [
                  { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [2] },
                  { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] },
                ],
                query  : {},
                params : {}
              },
              {
                _rowId   : 4,
                _id      : 2,
                id       : 2,
                label    : 'B',
                _version : [4],
                body     : [
                  { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [2] },
                  { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] },
                ],
                query  : {},
                params : {}
              },
            ],
            _version : [5]
          }
        ]);
        done();
      });

      lunaris.insert('@store1', [{ id : 1, label : 'A' }, { id : 2, label : 'B' }]);
    });

    it('should propagate to a store object : UPDATE', done => {
      var _nbCalled             = 0;
      var _store                = initStore('store1', null, null, ['propagate']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('propagate', _objectDescriptor, {
        joins       : _schema.meta.joins,
        joinFns     : schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates),
        collections : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['propagate'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });


      lunaris.hook('update@propagate', res => {
        _nbCalled++;
        if (_nbCalled ===1 ) {
          return;
        }
        if (_nbCalled === 2) {
          should(res).eql({
            _rowId       : 3,
            _id          : 1,
            id           : 1,
            store1Values : [
              {
                _rowId   : 3,
                _id      : 1,
                id       : 1,
                label    : 'A',
                _version : [4],
                body     : [
                  { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [2] },
                  { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] },
                ],
                params : {},
                query  : {}
              }, {
                _rowId   : 4,
                _id      : 2,
                id       : 2,
                label    : 'B',
                _version : [4],
                body     : [
                  { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [2] },
                  { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] },
                ],
                params : {},
                query  : {}
              }
            ],
            _version : [5]
          });

          return lunaris.update('@store1', { _id : 1, id : 1, label : 'A-1' });
        }

        if (_nbCalled === 3) {
          should(res).eql({
            _rowId       : 4,
            _id          : 1,
            id           : 1,
            store1Values : [
              {
                _rowId   : 4,
                _id      : 2,
                id       : 2,
                label    : 'B',
                _version : [4],
                body     : [
                  { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [2] },
                  { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] },
                ],
                params : {},
                query  : {}
              }, {
                _rowId   : 5,
                _id      : 1,
                id       : 1,
                label    : 'A-1',
                _version : [6]
              },
            ],
            _version : [7]
          });
          return;
        }

        should(res).eql({
          _rowId       : 5,
          _id          : 1,
          id           : 1,
          store1Values : [
            {
              _rowId   : 4,
              _id      : 2,
              id       : 2,
              label    : 'B',
              _version : [4],
              body     : [
                { _id : 1, id : 1, label : 'A', _version : [2] , _rowId : 1 },
                { _id : 2, id : 2, label : 'B', _version : [2] , _rowId : 2 },
              ],
              params : {},
              query  : {}
            }, {
              _rowId   : 6,
              _id      : 1,
              id       : 1,
              label    : 'A-1',
              _version : [8],
              body     : { _id : 1, id : 1, label : 'A-1', _rowId : 5 },
              params   : { id : '1' },
              query    : {}
            },
          ],
          _version : [9]
        });
        done();
      });

      lunaris.insert('@propagate', { id : 1 });
      lunaris.insert('@store1', [{ id : 1, label : 'A' }, { id : 2, label : 'B' }]);
    });

    it('should propagate to a store : UPDATE', done => {
      var _store                = initStore('store1', null, null, ['propagate']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = [{
        id           : ['<<int>>'],
        store1Values : ['@store1']
      }];
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('propagate', _objectDescriptor, {
        joins       : _schema.meta.joins,
        joinFns     : schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates),
        collections : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['propagate'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.insert('@propagate', [{ id : 1 }, { id : 2 }]);
      lunaris.insert('@store1', [{ id : 1, label : 'A' }, { id : 2, label : 'B' }]);
      lunaris.update('@store1', { _id : 2, id : 2, label : 'B-2' });

      var _nbCalls = 0;
      lunaris.hook('update@propagate', (objects) => {
        _nbCalls++;
        if (_nbCalls !== 2) {
          return;
        }

        should(objects).eql([
          {
            _rowId       : 9,
            _id          : 1,
            id           : 1,
            store1Values : [
              {
                _rowId   : 4,
                _id      : 1,
                id       : 1,
                label    : 'A',
                _version : [6],
                body     : [
                  {
                    _rowId   : 1,
                    _id      : 1,
                    _version : [2],
                    id       : 1,
                    label    : 'A'
                  },
                  {
                    _rowId   : 2,
                    _id      : 2,
                    _version : [2],
                    id       : 2,
                    label    : 'B'
                  }
                ],
                params : {},
                query  : {}
              }, {
                _rowId   : 6,
                _id      : 2,
                id       : 2,
                label    : 'B-2',
                _version : [8],
                body     : {
                  _rowId : 3,
                  _id    : 2,
                  id     : 2,
                  label  : 'B-2',
                },
                params : { id : '2' },
                query  : {}
              },
            ],
            _version : [9]
          },
          {
            _rowId       : 10,
            _id          : 2,
            id           : 2,
            store1Values : [
              {
                _rowId   : 4,
                _id      : 1,
                _version : [6],
                id       : 1,
                label    : 'A',
                body     : [
                  {
                    _rowId   : 1,
                    id       : 1,
                    label    : 'A',
                    _id      : 1,
                    _version : [2]
                  }, {
                    _rowId   : 2,
                    id       : 2,
                    label    : 'B',
                    _id      : 2,
                    _version : [2]
                  }
                ],
                params : {},
                query  : {}
              }, {
                _rowId   : 6,
                _id      : 2,
                id       : 2,
                label    : 'B-2',
                _version : [8],
                body     : {
                  _rowId : 3,
                  _id    : 2,
                  id     : 2,
                  label  : 'B-2',
                },
                params : { id : '2' },
                query  : {}
              },
            ],
            _version : [9]
          }
        ]);
        done();
      });
    });

    it('should propagate to a store with multiple joins', done => {
      var _store                = initStore('store1', null, null, ['propagate']);
      _store.isLocal            = true;
      lunaris._stores['store1'] = _store;
      var _store2               = initStore('store2', null, null, ['propagate']);
      _store2.isLocal           = true;
      lunaris._stores['store2'] = _store2;

      var _objectDescriptor     = [{
        id           : ['<<int>>'],
        store1Values : ['@store1'],
        store2Values : ['@store2']
      }];
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('propagate', _objectDescriptor, {
        joins       : _schema.meta.joins,
        joinFns     : schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates),
        collections : {
          store1 : _store.data,
          store2 : _store2.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['propagate'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.hook('insert@propagate', (objects) => {
        should(objects).eql([
          {
            _rowId       : 1,
            _id          : 1,
            id           : 1,
            store1Values : [
              {
                _rowId   : 1,
                _id      : 1,
                id       : 1,
                label    : 'A-1',
                _version : [1]
              },
            ],
            store2Values : [],
            _version     : [4]
          }
        ]);
        lunaris.insert('@store2', { id : 1, label : 'A-2' });
      });

      lunaris.hook('update@propagate', (objects) => {
        should(objects).eql([
          {
            _rowId       : 2,
            _id          : 1,
            id           : 1,
            store1Values : [
              {
                _rowId   : 1,
                _id      : 1,
                id       : 1,
                label    : 'A-1',
                _version : [1],
              },
            ],
            store2Values : [
              { _rowId : 1, _id : 1, id : 1, label : 'A-2', _version : [5] }
            ],
            _version : [6]
          }
        ]);
        done();
      });

      lunaris.insert('@store1', { id : 1, label : 'A-1' });
      lunaris.insert('@propagate', [{ id : 1 }]);
    });

  });

  describe('References propagation', () => {
    it('should propagate to a store object : GET', done => {
      var _store                = initStore('store1', null, null, null, null, null, null, ['reference']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id          : ['<<int>>'],
        store1Value : ['object', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['reference'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.insert('@reference', { id : 1, store1Value : { id : 20 } });
      lunaris.get('@store1');
      lunaris.hook('update@reference', res => {
        should(res).eql({
          _rowId      : 2,
          _id         : 1,
          id          : 1,
          store1Value : { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
          _version    : [3]
        });
        done();
      });
    });

    it('should propagate to a store array : GET', done => {
      var _store                = initStore('store1', null, null, null, null, null, null, ['reference']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['array', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['reference'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.insert('@reference', { id : 1, store1Values : [{ id : 20 }, { id : 10 }] });
      lunaris.get('@store1');
      lunaris.hook('update@reference', res => {
        should(res).eql({
          _rowId       : 2,
          _id          : 1,
          id           : 1,
          store1Values : [
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ],
          _version : [3]
        });
        done();
      });
    });

    it('should propagate to a store array and a store object : GET', done => {
      var _store                = initStore('store1', null, null, null, null, null, null, ['reference', 'reference2']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['array', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });

      var _object2Descriptor = {
        id          : ['<<int>>'],
        store1Value : ['object', 'ref', '@store1']
      };
      var _schema2           = schema.analyzeDescriptor(_object2Descriptor);
      var _storeToPropagate2 = initStore('reference2', _object2Descriptor, null, null, null, null, {
        referencesFn     : _schema2.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });

      _storeToPropagate.isLocal     = true;
      _storeToPropagate2.isLocal    = true;
      lunaris._stores['reference']  = _storeToPropagate;
      lunaris._stores['reference2'] = _storeToPropagate2;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.insert('@reference', { id : 1, store1Values : [{ id : 20 }, { id : 10 }] });
      lunaris.insert('@reference2', { id : 1, store1Value : { id : 20 } });
      lunaris.hook('update@reference', res => {
        should(res).eql({
          _rowId       : 2,
          _id          : 1,
          id           : 1,
          store1Values : [
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [3] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [3] }
          ],
          _version : [4]
        });
      });
      lunaris.hook('update@reference2', res => {
        should(res).eql({
          _rowId      : 2,
          _id         : 1,
          id          : 1,
          store1Value : { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [3] },
          _version    : [5]
        });
        done();
      });
      lunaris.get('@store1');
    });

    it('should propagate to a store object : set object', done => {
      var _storeDescriptor = [{
        id : ['<<int>>']
      }];
      var _store                = initStore('store1', _storeDescriptor, null, null, null, null, null, ['reference']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id          : ['<<int>>'],
        store1Value : ['object', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      _store.isLocal               = true;
      lunaris._stores['reference'] = _storeToPropagate;

      lunaris.hook('insert@reference', res => {
        should(res).eql({
          _rowId      : 1,
          _id         : 1,
          id          : 1,
          store1Value : { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [1] },
          _version    : [2]
        });
        done();
      });

      lunaris.hook('insert@store1', () => {
        lunaris.insert('@reference', { id : 1, store1Value : { id : 20 } });
      });

      lunaris.insert('@store1', { id : 20, label : 'B' });
    });

    it('should propagate to a store object : INSERT', done => {
      var _store                = initStore('store1', null, null, null, null, null, null, ['reference']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id          : ['<<int>>'],
        store1Value : ['object', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      _store.isLocal               = true;
      lunaris._stores['reference'] = _storeToPropagate;

      lunaris.hook('update@reference', res => {
        should(res).eql({
          _rowId      : 2,
          _id         : 1,
          id          : 1,
          store1Value : { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
          _version    : [3]
        });
        done();
      });

      lunaris.insert('@reference', { id : 1, store1Value : { id : 20 } });
      lunaris.insert('@store1', { id : 20, label : 'B' });
    });

    it('should propagate to a store array : INSERT', done => {
      var _store                = initStore('store1', null, null, null, null, null, null, ['reference']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['array', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });
      _store.isLocal               = true;
      _storeToPropagate.isLocal    = true;
      lunaris._stores['reference'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.hook('update@reference', res => {
        should(res).eql({
          _rowId       : 2,
          _id          : 1,
          id           : 1,
          store1Values : [
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ],
          _version : [3]
        });
        done();
      });
      lunaris.insert('@reference', { id : 1, store1Values : [{ id : 20 }, { id : 10 }] });
      lunaris.insert('@store1', [{ id : 20, label : 'B' }, { id : 30, label : 'D' }, { id : 10, label : 'E' }]);
    });

    it('should propagate to a store array : INSERT & not local store', done => {
      var _store                = initStore('store1', null, null, null, null, null, null, ['reference']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['array', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['reference'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      var _nbCalls = 0;
      lunaris.hook('update@reference', res => {
        _nbCalls++;

        if (_nbCalls === 1) {
          should(res).eql({
            _rowId       : 2,
            _id          : 1,
            id           : 1,
            store1Values : [
              { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
              { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
            ],
            _version : [3]
          });
          return;
        }

        delete res.store1Values[0].body;
        delete res.store1Values[1].body;

        should(res).eql({
          _rowId       : 3,
          _id          : 1,
          id           : 1,
          store1Values : [
            { _rowId : 4, _id : 1, id : 20, label : 'B', _version : [4], query : {}, params : {} },
            { _rowId : 6, _id : 3, id : 10, label : 'E', _version : [4], query : {}, params : {} }
          ],
          _version : [5]
        });
        done();
      });
      lunaris.insert('@reference', { id : 1, store1Values : [{ id : 20 }, { id : 10 }] });
      lunaris.insert('@store1', [{ id : 20, label : 'B' }, { id : 30, label : 'D' }, { id : 10, label : 'E' }]);
    });

    it('should propagate to a store object : UPDATE', done => {
      var _storeDescriptor = [{
        id : ['<<int>>']
      }];
      var _store                = initStore('store1', _storeDescriptor, null, null, null, null, null, ['reference']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id          : ['<<int>>'],
        store1Value : ['object', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      _store.isLocal               = true;
      lunaris._stores['reference'] = _storeToPropagate;

      lunaris.hook('update@reference', res => {
        should(res).eql({
          _rowId      : 2,
          _id         : 1,
          id          : 1,
          store1Value : { _rowId : 2, _id : 1, id : 20, label : 'B-1', _version : [3] },
          _version    : [4]
        });
        done();
      });

      _store.data.add({ id : 20, label : 'B' });
      lunaris.insert('@reference', { id : 1, store1Value : { id : 20 } });

      lunaris.update('@store1', { _id : 1, id : 20, label : 'B-1' });
    });

    it('should propagate to a store array : UPDATE', done => {
      var _storeDescriptor = [{
        id : ['<<int>>']
      }];
      var _store                = initStore('store1', _storeDescriptor, null, null, null, null, null, ['reference']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['array', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });
      _store.isLocal               = true;
      _storeToPropagate.isLocal    = true;
      lunaris._stores['reference'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.hook('update@reference', res => {
        should(res).eql({
          _rowId       : 2,
          _id          : 1,
          id           : 1,
          store1Values : [
            { _rowId : 4, _id : 1, id : 20, label : 'B-1', _version : [3] },
            { _rowId : 5, _id : 3, id : 10, label : 'E-1', _version : [3] }
          ],
          _version : [4]
        });
        done();
      });
      var _version = _store.data.begin();
      _store.data.add({ id : 20, label : 'B' }, _version);
      _store.data.add({ id : 30, label : 'D' }, _version);
      _store.data.add({ id : 10, label : 'E' }, _version);
      _store.data.commit(_version);

      lunaris.insert('@reference', { id : 1, store1Values : [{ id : 20 }, { id : 10 }] });
      lunaris.update('@store1', [{ _id : 1, id : 20, label : 'B-1' }, { _id : 3, id : 10, label : 'E-1' }]);
    });

    it('should propagate to a store array : UPDATE & not local store', done => {
      var _storeDescriptor = [{
        id : ['<<int>>']
      }];
      var _store                = initStore('store1', _storeDescriptor, null, null, null, null, null, ['reference']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['array', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal    = true;
      lunaris._stores['reference'] = _storeToPropagate;

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      var _nbCalls = 0;
      lunaris.hook('update@reference', res => {
        _nbCalls++;

        if (_nbCalls === 1) {
          should(res).eql({
            _rowId       : 2,
            _id          : 1,
            id           : 1,
            store1Values : [
              { _rowId : 4, _id : 1, id : 20, label : 'B-1', _version : [3] },
              { _rowId : 3, _id : 3, id : 10, label : 'E'  , _version : [1] }
            ],
            _version : [4]
          });
          return;
        }

        delete res.store1Values[0].body;

        should(res).eql({
          _rowId       : 3,
          _id          : 1,
          id           : 1,
          store1Values : [
            { _rowId : 5, _id : 1, id : 20, label : 'B-1', _version : [5], query : {}, params : { id : '20'} },
            { _rowId : 3, _id : 3, id : 10, label : 'E'  , _version : [1] }
          ],
          _version : [6]
        });
        done();
      });

      var _version = _store.data.begin();
      _store.data.add({ id : 20, label : 'B' }, _version);
      _store.data.add({ id : 30, label : 'D' }, _version);
      _store.data.add({ id : 10, label : 'E' }, _version);
      _store.data.commit(_version);

      lunaris.insert('@reference', { id : 1, store1Values : [{ id : 20 }, { id : 10 }] });
      lunaris.update('@store1', { _id : 1, id : 20, label : 'B-1' });
    });

    it('should not propagate DELETE if the object is already referenced in one store', done => {
      var _storeDescriptor = [{
        id : ['<<int>>']
      }];
      var _store                = initStore('store1', _storeDescriptor, null, null, null, null, null, ['reference']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id          : ['<<int>>'],
        store1Value : ['object', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });
      _storeToPropagate.isLocal        = true;
      _storeToPropagate.nameTranslated = '${reference}';
      _store.isLocal                   = true;
      lunaris._stores['reference'] = _storeToPropagate;

      lunaris.hook('error@store1', (data, message) => {
        should(data).not.ok();
        should(message).eql('${Cannot delete the value, it is still referenced in the store} ${reference}');
        should(lunaris.getOne('@store1', 1)).be.ok();
        done();
      });

      _store.data.add({ id : 20, label : 'B' });
      _storeToPropagate.data.add({ id : 1, store1Value : { id : 20 } });

      lunaris.delete('@store1', { _id : 1 });
    });

    it('should not propagate DELETE if the object is already referenced in one store : multiple stores', done => {
      var _storeMap = [{
        id : ['<<int>>']
      }];
      var _store                = initStore('store1', _storeMap, null, null, null, null, null, ['reference', 'reference2']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['array', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });

      var _object2Descriptor = {
        id          : ['<<int>>'],
        store1Value : ['object', 'ref', '@store1']
      };
      var _schema2           = schema.analyzeDescriptor(_object2Descriptor);
      var _storeToPropagate2 = initStore('reference2', _object2Descriptor, null, null, null, null, {
        referencesFn     : _schema2.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });

      _storeToPropagate.isLocal     = true;
      _storeToPropagate2.isLocal    = true;
      _storeToPropagate.nameTranslated  = '${reference}';
      _storeToPropagate2.nameTranslated = '${reference2}';
      lunaris._stores['reference']  = _storeToPropagate;
      lunaris._stores['reference2'] = _storeToPropagate2;

      lunaris.hook('error@store1', (data, message) => {
        should(data).not.ok();
        should(message).eql('${Cannot delete the value, it is still referenced in the store} ${reference2}');
        should(lunaris.getOne('@store1', 1)).be.ok();
        done();
      });

      _store.data.add({ id : 20, label : 'B' });
      _storeToPropagate.data.add({ id : 1, store1Values : [{ id : 30 }] });
      _storeToPropagate.data.add({ id : 1, store1Values : [{ id : 30 }] });
      _storeToPropagate2.data.add({ id : 1, store1Value : { id : 20 } });


      lunaris.delete('@store1', { _id : 1 });
    });

    it('should not propagate DELETE if the object is already referenced in multiple stores', done => {
      var _storeMap = [{
        id : ['<<int>>']
      }];
      var _store                = initStore('store1', _storeMap, null, null, null, null, null, ['reference', 'reference2']);
      lunaris._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['array', 'ref', '@store1']
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn     : _schema.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });

      var _object2Descriptor = {
        id          : ['<<int>>'],
        store1Value : ['object', 'ref', '@store1']
      };
      var _schema2           = schema.analyzeDescriptor(_object2Descriptor);
      var _storeToPropagate2 = initStore('reference2', _object2Descriptor, null, null, null, null, {
        referencesFn     : _schema2.referencesFn,
        getPrimaryKeyFns : { store1 : (item) => { return item.id; } },
        collections      : {
          store1 : _store.data
        }
      });

      _storeToPropagate.isLocal     = true;
      _storeToPropagate2.isLocal    = true;
      _storeToPropagate.nameTranslated  = '${reference}';
      _storeToPropagate2.nameTranslated = '${reference2}';
      lunaris._stores['reference']  = _storeToPropagate;
      lunaris._stores['reference2'] = _storeToPropagate2;

      lunaris.hook('error@store1', (data, message) => {
        should(data).not.ok();
        should(message).eql('${Cannot delete the value, it is still referenced in the store} ${reference}');
        should(lunaris.getOne('@store1', 1)).be.ok();
        done();
      });

      _store.data.add({ id : 20, label : 'B' });
      _storeToPropagate.data.add({ id : 1, store1Values : [{ id : 20 }] });
      _storeToPropagate2.data.add({ id : 1, store1Value : { id : 20 } });


      lunaris.delete('@store1', { _id : 1 });
    });
  });

});

function _startServer (callback) {
  server.use(compression());
  server.use(bodyParser.json());
  server.get('/store1', (req, res) => {
    res.json({
      success : true,
      error   : null,
      message : null,
      data    : [
        { id : 20, label : 'B' },
        { id : 30, label : 'D' },
        { id : 10, label : 'E' }
      ]
    });
  });

  server.get('/store2', (req, res) => {
    res.json({ success : false, error : 'Error', message : null, data : [] });
  });

  server.get('/pagination', (req, res) => {
    if (req.query.limit === '50' && req.query.offset === '0') {
      return res.json({ success : true, error : null, message : null, data : [
        { id : 20, label : 'B' },
        { id : 30, label : 'D' },
        { id : 10, label : 'E' }
      ]});
    }
    if (req.query.limit === '50' && req.query.offset === '50') {
      return res.json({ success : true, error : null, message : null, data : [
        { id : 40, label : 'A' },
        { id : 50, label : 'C' },
        { id : 60, label : 'F' }
      ]});
    }

    res.json({ success : false, error : 'Error', message : null, data : []});
  });

  server.get('/pagination_duplicate', (req, res) => {
    if (req.query.limit === '50' && req.query.offset === '0') {
      return res.json({ success : true, error : null, message : null, data : [
        { id : 20, label : 'B' },
        { id : 30, label : 'D' },
        { id : 10, label : 'E' }
      ]});
    }
    if (req.query.limit === '50' && req.query.offset === '50') {
      return res.json({ success : true, error : null, message : null, data : [
        { id : 20, label : 'A' },
        { id : 30, label : 'D' },
        { id : 10, label : 'C' }
      ]});
    }

    res.json({ success : false, error : 'Error', message : null, data : []});
  });

  server.get('/required/site/:idSite', (req, res) => {
    if (req.params.idSite === '1') {
      res.json({ success : true, error : null, message : null, data : [
        { id : 1}, { id : 2 }, { id : 3 }
      ]});
    }
    if (req.params.idSite === '2') {
      res.json({ success : true, error : null, message : null, data : [
        { id : 4 }, { id : 5 }, { id : 6 }
      ]});
    }
  });

  server.get('/optional', (req, res) => {
    res.json({ success : true, error : null, message : null, data : [req.query] });
  });

  server.get('/pagination2/site/:idSite', (req, res) => {
    nbCallsPagination2++;
    if (req.query.limit === '50' && req.query.offset === '0' && req.params.idSite === '1') {
      return res.json({ success : true, error : null, message : req.params.id, data : [
        { id : 20, label : 'B' },
        { id : 30, label : 'D' },
        { id : 10, label : 'E' }
      ]});
    }
    if (req.query.limit === '50' && req.query.offset === '50' && req.params.idSite === '1') {
      return res.json({ success : true, error : null, message : req.params.id, data : [
        { id : 40, label : 'A' },
        { id : 50, label : 'C' },
        { id : 60, label : 'F' }
      ]});
    }
    if (req.query.limit === '50' && req.query.offset === '0' && req.params.idSite === '2') {
      return res.json({ success : true, error : null, message : req.params.id, data : [
        { id : 70, label : 'G' },
        { id : 80, label : 'H' },
        { id : 90, label : 'I' }
      ]});
    }

    res.json({ success : false, error : 'Error', message : null, data : []});
  });

  server.get('/get/:id', (req, res) => {
    if (req.params.id === '0') {
      return res.json({ success : true, error : null, message : null, data : [{ id : 0 }] });
    }
    if (req.params.id === '1') {
      return res.json({ success : true, error : null, message : null, data : [{ id : 1 }] });
    }
    if (req.params.id === '2') {
      return res.json({ success : true, error : null, message : null, data : [{ id : 2 }] });
    }

    return res.json({ success : true, error : null, message : null, data : [{ id : 3 }, { id : 4 }] });
  });

  var _postPutDelHandler = (req, res) => {
    delete req.body._version;

    if (req.method === 'DELETE') {
      // We do not send any body for a DELETE request
      return setTimeout(() => {
        res.json({
          success : true,
          error   : null,
          message : null,
          data    : req.params
        });
      }, 200);
    }
    return res.json({
      success : true,
      error   : null,
      message : null,
      data    : {
        body   : req.body,
        query  : req.query,
        params : req.params
      }
    });
  };
  server.post('/transaction_A'         , _postPutDelHandler);
  server.post('/transaction_B'         , _postPutDelHandler);
  server.post('/store_insert_put'      , _postPutDelHandler);
  server.get('/methods'                , _postPutDelHandler);
  server.post('/store1'                , _postPutDelHandler);
  server.put('/store1/:id'             , _postPutDelHandler);
  server.delete('/store1/:id'          , _postPutDelHandler);
  server.post('/store1/site/:idSite'   , _postPutDelHandler);
  server.put('/store1/:id/site/:idSite', _postPutDelHandler);

  server.post('/multiple', (req, res) => {
    req.body.reverse();
    for (var i = 0; i < req.body.length; i++) {
      req.body[i].id   = i + 1;
      req.body[i].post = true;
      delete req.body[i]._version;
    }
    res.json({ success : true, error : null, message : null, data : req.body });
  });
  server.put('/multiple', (req, res) => {
    req.body.reverse();
    for (var i = 0; i < req.body.length; i++) {
      req.body[i].put = true;
      delete req.body[i]._version;
    }
    res.json({ success : true, error : null, message : null, data : req.body });
  });

  server.get('/emptyArray', (req, res) => {
    res.json({ success : true, error : null, message : null, data : [] });
  });

  server.patch('/mass', (req, res) => {
    res.json({ success : true, error : null, message : null, data : [] });
  });
  server.post('/mass', (req, res) => {
    if (!Array.isArray(req.body)) {
      req.body = [req.body];
    }
    for (var i = 0; i < req.body.length; i++) {
      req.body[i].post = true;
    }
    res.json({ success : true, error : null, message : null, data : req.body });
  });
  server.put('/mass/:id', (req, res) => {
    if (!Array.isArray(req.body)) {
      req.body = [req.body];
    }
    for (var i = 0; i < req.body.length; i++) {
      req.body[i].put = true;
    }
    res.json({ success : true, error : null, message : null, data : req.body });
  });

  server = server.listen(port, callback);
}

function _stopServer (callback) {
  server.close(callback);
}


describe('Lunaris hooks', () => {

  beforeEach(() => {
    for (var store in lunaris._stores) {
      delete lunaris._stores[store];
    }
    lastError = [];
  });

  it('hook() should be defined', () => {
    should(lunaris.hook).be.ok();
  });

  it('removeHook() should be defined', () => {
    should(lunaris.removeHook).be.ok();
  });

  describe('add hook', () => {
    it('should throw an error if the handler is not a function', () => {
      lunaris.hook('a');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.hook:a');
      should(lastError[1]).eql(new Error('A handler must be a Function'));
    });

    it('should throw an error if the hook is not well configured', () => {
      lunaris.hook('a', function () {});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.hook:a');
      should(lastError[1]).eql(new Error('A hook must be: <event>@<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunaris.hook('get@store1', function () {});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.hook:get@store1');
      should(lastError[1]).eql(new Error('Cannot register hook "get@store1", store "store1" has not been defined!'));
    });

    it('should register the hook', () => {
      var _handler              = function () {};
      lunaris._stores['store1'] = { hooks : [] };
      lunaris.hook('get@store1', _handler);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(1);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler);
      delete lunaris._stores['store1'];
    });

    it('should register multiple handlers for a hook', () => {
      var _handler1             = function handler1 () {};
      var _handler2             = function handler2 () {};
      lunaris._stores['store1'] = { hooks : [] };
      lunaris.hook('get@store1', _handler1);
      lunaris.hook('get@store1', _handler2);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(2);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler1);
      should(lunaris._stores['store1'].hooks.get[1]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[1]).eql(_handler2);
      delete lunaris._stores['store1'];
    });

    it('should not register multiple handlers for a hook if isUnique option is active', () => {
      var _handler1 = function handler1 () {};
      lunaris._stores['store1'] = { hooks : [] };
      lunaris.hook('get@store1', _handler1, true);
      lunaris.hook('get@store1', _handler1, true);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(1);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler1);
      delete lunaris._stores['store1'];
    });
  });

  describe('remove hook', () => {
    it('should throw an error if the handler is not a function', () => {
      lunaris._stores['store1'] = { hooks : [] };
      lunaris.hook('get@store1', function () {});
      lunaris.removeHook('get@store');

      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.removeHook:get@store');
      should(lastError[1]).eql(new Error('A handler must be a Function'));
    });

    it('should throw an error if the hook is not well configured', () => {
      lunaris._stores['store1'] = { hooks : [] };
      lunaris.hook('get@store1', function () {});
      lunaris.removeHook('a', function () {});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.removeHook:a');
      should(lastError[1]).eql(new Error('A hook must be: <event>@<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunaris.removeHook('get@store1', function () {});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris warn] lunaris.removeHook:get@store1');
      should(lastError[1]).eql(new Error('Cannot remove hook "get@store1", store "store1" has not been defined!'));
    });

    it('should remove a hook', () => {
      var _handler              = function () {};
      lunaris._stores['store1'] = { hooks : [] };
      lunaris.hook('get@store1', _handler);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(1);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler);
      lunaris.removeHook('get@store1', _handler);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(0);
      delete lunaris._stores['store1'];
    });

    it('should remove one handler from a list of handlers', () => {
      var _handler1             = function handler1 () {};
      var _handler2             = function handler2 () {};
      lunaris._stores['store1'] = { hooks : [] };
      lunaris.hook('get@store1', _handler1);
      lunaris.hook('get@store1', _handler2);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(2);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler1);
      should(lunaris._stores['store1'].hooks.get[1]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[1]).eql(_handler2);
      lunaris.removeHook('get@store1', _handler1);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(1);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler2);
      delete lunaris._stores['store1'];
    });

    it('should remove one handler from a list of handlers', () => {
      var _handler1             = function handler1 () {};
      var _handler2             = function handler1 () {};
      lunaris._stores['store1'] = { hooks : [] };
      lunaris.hook('get@store1', _handler1);
      lunaris.hook('get@store1', _handler2);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(2);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler1);
      should(lunaris._stores['store1'].hooks.get[1]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[1]).eql(_handler2);
      lunaris.removeHook('get@store1', _handler1);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(1);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler2);
      delete lunaris._stores['store1'];
    });
  });
});
