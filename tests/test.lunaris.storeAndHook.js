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
const fs           = require('fs');
const path         = require('path');

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

var lunarisGlobal = {};
let server  = express();
var nbCallsPagination2 = 0;

describe('lunaris store', function () {
  this.retries(3);

  before(done => {
    eval(fs.readFileSync(path.join(__dirname, '..', 'dist', 'lunaris.js'), 'utf-8'));

    lunaris.exports.setOptions({
      baseUrl      : 'http://localhost:' + port,
      isProduction : false,
      isBrowser    : false
    });

    lunarisGlobal = lunaris;
    lunarisGlobal._stores.lunarisErrors.data = collection.collection(null, false, null, null, null, 'lunarisErrors', null, lunarisGlobal.utils.clone);

    _startServer(done);
  });

  beforeEach(() => {
    collection.resetVersionNumber();
    lastError = [];
    lastTip   = [];
    lunarisGlobal._stores.lunarisErrors.data.clear();
    lunarisGlobal._cache.clear();
  });

  after(done => {
    _stopServer(done);
  });

  beforeEach(() => {
    for (var store in lunarisGlobal._stores) {
      if (store !== 'lunarisErrors') {
        delete lunarisGlobal._stores[store];
      }
    }
  });

  describe('insert() / update()', () => {
    it('insert() should be defined', () => {
      should(lunarisGlobal.insert).be.a.Function();
    });

    it('update should be defined', () => {
      should(lunarisGlobal.update).be.a.Function();
    });

    it('upsert should be defined', () => {
      should(lunarisGlobal.upsert).be.a.Function();
    });

    it('should throw an error if no value is provided', () => {
      lunarisGlobal.insert('@store');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.insert@store');
      should(lastError[1]).eql(new Error('Must have a value, provided value: undefined'));
    });

    it('should throw an error if the store is not a string', () => {
      lunarisGlobal.insert({}, { id : 1 });
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.insert' + {});
      should(lastError[1]).eql(new Error('Must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunarisGlobal.insert('@store', { id : 1 });
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.insert@store');
      should(lastError[1]).eql(new Error('The store "store" has not been defined'));
    });

    it('should insert the value', () => {
      var _store = initStore('store1');
      lunarisGlobal._stores['store1'] = _store;
      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] });
    });

    it('should insert the value and execute the hooks : insert & inserted', done => {
      var _isFirstInsertEvent                   = true;
      var _isUpdateHook                         = false;
      var _isUpdatedHook                        = false;
      var _store                                = initStore('store1');
      var _expectedValue                        = [{ _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] }];
      lunarisGlobal._stores['store1']                 = _store;
      lunarisGlobal._stores['store1'].primaryKey      = 'id';
      lunarisGlobal._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunarisGlobal.hook('insert@store1', updatedValue => {
        if (_isFirstInsertEvent) {
          should(updatedValue).be.an.Array().have.lengthOf(1);
          should(updatedValue).eql(_expectedValue);
          should(Object.isFrozen(updatedValue[0])).eql(true);
          return _isFirstInsertEvent = false;
        }
      });

      lunarisGlobal.hook('update@store1', () => {
        _isUpdateHook = true;
      });

      lunarisGlobal.hook('success@store1', message => {
        should(message).eql('${the} store1 has been successfully ${created}');
      });

      lunarisGlobal.hook('inserted@store1', (data) => {
        _isUpdatedHook = true;
        var _res       = Object.assign(_expectedValue[0], {
          body     : { _rowId : 1, _id : 1, id : 2, label : 'A' },
          query    : {},
          params   : {},
          _version : [2],
          _rowId   : 2
        });
        should(data).eql([_res]);

        if (_isUpdateHook && _isUpdatedHook) {
          done();
        }
      });

      lunarisGlobal.hook('errorHttp@store1', (err) => {
        done(err);
      });


      lunarisGlobal.insert('@store1', { id : 2, label : 'A' });
    });

    it('should insert the value and execute the hooks', done => {
      var _nbExecutedHandlers              = 0;
      var _store                           = initStore('store1');
      var _expectedValue                   = [{ _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] }];
      lunarisGlobal._stores['store1']            = _store;
      lunarisGlobal._stores['store1'].primaryKey = 'id';

      lunarisGlobal.hook('insert@store1', updatedValue => {
        should(updatedValue).eql(_expectedValue);
        _nbExecutedHandlers++;
      });

      lunarisGlobal.hook('insert@store1', updatedValue => {
        should(updatedValue).eql(_expectedValue);
        _nbExecutedHandlers++;

        if (_nbExecutedHandlers === 2) {
          done();
        }
        else {
          done(_nbExecutedHandlers);
        }
      });

      lunarisGlobal.insert('@store1', { id : 2, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
    });

    it('should fire an error for insert', done => {
      var _store                           = initStore('store_insert_post');
      lunarisGlobal._stores['store_insert_post']            = _store;
      lunarisGlobal._stores['store_insert_post'].primaryKey = 'id';

      lunarisGlobal.hook('errorHttp@store_insert_post', err => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris error] lunaris.insert@store_insert_post');
        should(lastError[1]).eql({ error : 404, message : 'Not Found', errors : [] });
        should(err).be.an.Object();
        should(err.error).eql('${An error has occured}');
        done();
      });

      lunarisGlobal.insert('@store_insert_post', { id : 2, label : 'A' });
    });

    it('should add the error into lunarisErrors store : insert', done => {
      var _store                           = initStore('store_insert_post');
      lunarisGlobal._stores['store_insert_post']            = _store;
      lunarisGlobal._stores['store_insert_post'].primaryKey = 'id';

      lunarisGlobal.hook('errorHttp@store_insert_post', () => {
        var _values = lunarisGlobal._stores.lunarisErrors.data.getAll();
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
          messageErrorServer : { error : 404, message : 'Not Found', errors : [] },
        });
        done();
      });

      lunarisGlobal.insert('@store_insert_post', { id : 2, label : 'A' });
    });

    it('should fire an error for insert if the the validation failed', () => {
      var _store                                      = initStore('store_insert_post', [{ id : ['<<int>>'], label : ['string'] }]);
      lunarisGlobal._stores['store_insert_post']            = _store;
      lunarisGlobal._stores['store_insert_post'].primaryKey = 'id';

      lunarisGlobal.insert('@store_insert_post', { id : 2, label : 1 });

      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.insert@store_insert_post Error when validating data');
      should(lastError[1]).eql({ error : '${must be a string}', field : 'label', value : 1, index : 0});
    });

    it('should update a value', done => {
      var _store = initStore('store1');
      lunarisGlobal._stores['store1'] = _store;
      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] });

      lunarisGlobal.hook('updated@store1', () => {
        done();
      });

      lunarisGlobal.update('@store1', { _id : 1, id : 1, label : 'B'});
      should(_store.data.get(1)).eql({ _rowId : 2, _id : 1, id : 1, label : 'B', _version : [2] });
    });

    it('should update the value and execute the hooks : update and updated', done => {
      var _isFirstUpdateEvent   = true;
      var _isUpdateHook         = false;
      var _isUpdatedHook        = false;
      var _store                = initStore('store1');
      var _expectedValue        = { _rowId : 2, _id : 1, id : 1, label : 'B', _version : [2] };
      lunarisGlobal._stores['store1'] = _store;
      lunarisGlobal._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunarisGlobal.hook('update@store1', updatedValue => {
        _isUpdateHook = true;
        if (_isFirstUpdateEvent) {
          should(_store.data.get(1)).eql(_expectedValue);
          should(updatedValue).eql([_expectedValue]);
          should(Object.isFrozen(updatedValue[0])).eql(true);
          _isFirstUpdateEvent = false;
          return;
        }
      });

      lunarisGlobal.hook('success@store1', message => {
        should(message).eql('${the} store1 has been successfully ${edited}');
      });

      lunarisGlobal.hook('updated@store1', (data) => {
        _isUpdatedHook = true;
        should(data).eql([Object.assign(_expectedValue, {
          body     : { _rowId : 2, _id : 1, id : 1, label : 'B'},
          query    : {},
          params   : { id : '1' },
          _version : [3],
          _rowId   : 3
        })]);

        if (_isUpdateHook && _isUpdatedHook) {
          done();
        }
      });

      lunarisGlobal.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunarisGlobal._stores['store1'].data.add({ id : 1, label : 'A' });
      lunarisGlobal.update('@store1', { _id : 1, id : 1, label : 'B'});
    });

    it('should insert a value and fire an error for update', done => {
      var _store                                     = initStore('store_insert_put');
      lunarisGlobal._stores['store_insert_put']            = _store;
      lunarisGlobal._stores['store_insert_put'].primaryKey = 'id';

      lunarisGlobal.hook('inserted@store_insert_put', () => {
        lunarisGlobal.update('@store_insert_put', { _id : 1, id : 1, label : 'B' });
      });

      lunarisGlobal.hook('errorHttp@store_insert_put', err => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris error] lunaris.update@store_insert_put');
        should(lastError[1]).eql({ error : 404, message : 'Not Found', errors : [] });
        should(err).be.an.Object();
        should(err.error).eql('${An error has occured}');
        done();
      });

      lunarisGlobal.insert('@store_insert_put', { id : 1 });
    });

    it('should insert a value and fire an error for update when validating', done => {
      var _store                                     = initStore('store_insert_put', [{ id : ['<<int>>'], label : ['string'] }]);
      lunarisGlobal._stores['store_insert_put']            = _store;
      lunarisGlobal._stores['store_insert_put'].primaryKey = 'id';

      lunarisGlobal.hook('inserted@store_insert_put', () => {
        lunarisGlobal.update('@store_insert_put', { _id : 1, id : 1, label : 2 });
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris error] lunaris.update@store_insert_put Error when validating data');
        should(lastError[1]).eql({ error : '${must be a string}', field : 'label', value : 2, index : 0});
        done();
      });

      lunarisGlobal.insert('@store_insert_put', { id : 1, label : 'A' });
    });

    it('should always update the same value for store object', done => {
      var _store                             = initStore('storeObject', { id : ['<<int>>'], label : ['string'] });
      lunarisGlobal._stores['storeObject']         = _store;
      lunarisGlobal._stores['storeObject'].isLocal = true;

      lunarisGlobal.hook('insert@storeObject', () => {
        lunarisGlobal.update('@storeObject', { _id : 2, id : 1, label : 'string' });
        should(lunarisGlobal._stores['storeObject'].data.getAll()).eql({
          _rowId   : 2,
          _id      : 1,
          id       : 1,
          label    : 'string',
          _version : [2]
        });
        done();
      });

      lunarisGlobal.insert('@storeObject', { id : 1, label : 'A' });
    });

    it('should insert a value and add an error into lunarisErrors store : update', done => {
      var _store                                     = initStore('store_insert_put');
      lunarisGlobal._stores['store_insert_put']            = _store;
      lunarisGlobal._stores['store_insert_put'].primaryKey = 'id';

      lunarisGlobal.hook('inserted@store_insert_put', () => {
        lunarisGlobal.update('@store_insert_put', { _id : 1, id : 1, label : 'B' });
      });

      lunarisGlobal.hook('errorHttp@store_insert_put', () => {
        var _values = lunarisGlobal._stores.lunarisErrors.data.getAll();
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
          messageErrorServer : { error : 404, message : 'Not Found', errors : [] },
        });
        done();
      });

      lunarisGlobal.insert('@store_insert_put', { id : 1 });
    });

    it('should update the value and not execute the hook updated', done => {
      var _isUpdateHook         = false;
      var _isUpdatedHook        = false;
      var _store                = initStore('store1');
      var _expectedValue        = { _id : 1, id : 1, label : 'B' };
      lunarisGlobal._stores['store1'] = _store;

      lunarisGlobal.hook('update@store1', () => {
        _isUpdateHook = true;
      });

      lunarisGlobal.hook('updated@store1', () => {
        _isUpdatedHook = true;
      });

      lunarisGlobal.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
      lunarisGlobal.update('@store1', _expectedValue, { isLocal : true });

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
      lunarisGlobal._stores['store1'] = _store;

      lunarisGlobal.hook('update@store1', () => {
        _isUpdateHook = true;
      });

      lunarisGlobal.hook('updated@store1', () => {
        _isUpdatedHook = true;
      });

      lunarisGlobal.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
      lunarisGlobal.update('@store1', _expectedValue);

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
      lunarisGlobal._stores['optional'] = initStore('optional');
      lunarisGlobal._stores['optional'].isStoreObject = true;
      lunarisGlobal._stores['optional'].data.add({
        site : 2
      });

      lunarisGlobal._stores['required']               = initStore('required');
      lunarisGlobal._stores['required'].isStoreObject = true;
      lunarisGlobal._stores['required'].data.add({
        category : 'A'
      });
      lunarisGlobal._stores['store1']                = _store;
      lunarisGlobal._stores['store1'].fakeAttributes = ['site'];
      lunarisGlobal._stores['store1'].filters.push({
        source          : '@required',
        sourceAttribute : 'category',
        localAttribute  : 'category',
        operator        : ['=']
      });
      lunarisGlobal._stores['store1'].filters.push({
        source          : '@optional',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      });

      lunarisGlobal.hook('inserted@store1', data => {
        _isInsertedHook = true;
        should(data[0].query).be.ok();
        should(data[0].params).be.ok();
        should(data[0].params).eql({ idSite : '2' });
        should(data[0].query).eql({ search : 'category:=A' });
        lunarisGlobal.update('@store1', _expectedValue);
        should(data[0].body).be.ok();
        should(data[0].body).eql(_expectedValue);
      });

      lunarisGlobal.hook('updated@store1', data => {
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

      lunarisGlobal.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
    });

    it('should insert and update the values and execute the hooks with no filters', done => {
      var _isInsertedHook       = false;
      var _isUpdatedHook        = false;
      var _store                = initStore('store1');
      var _expectedValue        = { _rowId : 1, _id : 1, id : 1, label : 'A' };
      lunarisGlobal._stores['optional'] = initStore('optional');
      lunarisGlobal._stores['optional'].data.add({
        site : 2
      });

      lunarisGlobal._stores['required'] = initStore('required');
      lunarisGlobal._stores['required'].data.add({
        category : 'A'
      });
      lunarisGlobal._stores['store1'] = _store;
      lunarisGlobal._stores['store1'].fakeAttributes = ['site'];
      lunarisGlobal._stores['store1'].filters.push({
        source          : '@required',
        sourceAttribute : 'category',
        localAttribute  : 'category',
        isRequired      : false,
        httpMethods     : ['GET']
      });
      lunarisGlobal._stores['store1'].filters.push({
        source          : '@optional',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true,
        httpMethods     : ['GET']
      });

      lunarisGlobal.hook('inserted@store1', data => {
        _isInsertedHook = true;
        should(data[0].query).be.ok();
        should(data[0].params).be.ok();
        should(data[0].params).eql({});
        should(data[0].query).eql({});
        should(data[0].body).be.ok();
        should(data[0].body).eql(_expectedValue);
        lunarisGlobal.update('@store1', _expectedValue);
      });

      lunarisGlobal.hook('updated@store1', data => {
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

      lunarisGlobal.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
    });

    it('should insert and update the values and execute the hooks with authorized filters', done => {
      var _isInsertedHook                       = false;
      var _isUpdatedHook                        = false;
      var _store                                = initStore('store1', { id : ['<<int>>'] });
      var _expectedValue                        = { _rowId : 1, _id : 1, id : 1, label : 'A' };
      lunarisGlobal._stores['required']               = initStore('required');
      lunarisGlobal._stores['required'].isStoreObject = true;
      lunarisGlobal._stores['required'].data.add({
        site : 2
      });

      lunarisGlobal._stores['optional']               = initStore('optional');
      lunarisGlobal._stores['optional'].isStoreObject = true;
      lunarisGlobal._stores['optional'].data.add({
        category : 'A'
      });
      lunarisGlobal._stores['store1']                = _store;
      lunarisGlobal._stores['store1'].fakeAttributes = ['site'];
      lunarisGlobal._stores['store1'].isStoreObject  = true;
      lunarisGlobal._stores['store1'].filters.push({
        source          : '@optional',
        sourceAttribute : 'category',
        localAttribute  : 'category',
        httpMethods     : ['GET', 'POST'],
        operator        : '='
      });
      lunarisGlobal._stores['store1'].filters.push({
        source          : '@required',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        httpMethods     : ['PUT'],
        isRequired      : true
      });

      lunarisGlobal.hook('inserted@store1', data => {
        _isInsertedHook = true;
        should(data.query).be.ok();
        should(data.params).be.ok();
        should(data.params).eql({});
        should(data.query).eql({ search : 'category:=A' });
        should(data.body).be.ok();
        should(data.body).eql(_expectedValue);
        lunarisGlobal.update('@store1', _expectedValue);
      });

      lunarisGlobal.hook('updated@store1', data => {
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

      lunarisGlobal.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
    });

    describe('callback', () => {

      it('should insert the value', () => {
        var _store = initStore('store1');
        lunarisGlobal._stores['store1'] = _store;
        lunarisGlobal.insert('@store1', { id : 1, label : 'A' }, (err, res) => {
          should(res[0]).eql({ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] });
        });
      });

      it('should return the HTTP error', () => {
        var _store = initStore('store2');
        lunarisGlobal._stores['store2'] = _store;
        lunarisGlobal.insert('@store2', { id : 1, label : 'A' }, (err, res) => {
          should(err).ok();
          should(res).not.ok();
        });
      });

      it('should return valdiation error', done => {
        var _store                                           = initStore('store_insert_put', [{ id : ['<<int>>'], label : ['string'] }]);
        lunarisGlobal._stores['store_insert_put']            = _store;
        lunarisGlobal._stores['store_insert_put'].primaryKey = 'id';

        lunarisGlobal.insert('@store_insert_put', { id : 1, label : 2 }, (err, data) => {
          should(err).eql('Error when validating data');
          should(data).not.ok();
          done();
        });
      });

      it('should return valdiation error on update', done => {
        var _store                                           = initStore('store_insert_put', [{ id : ['<<int>>'], label : ['string'] }]);
        lunarisGlobal._stores['store_insert_put']            = _store;
        lunarisGlobal._stores['store_insert_put'].primaryKey = 'id';

        lunarisGlobal.insert('@store_insert_put', { id : 1, label : 'a' }, (err, data) => {
          should(err).not.ok();
          data[0].label = 2;

          lunarisGlobal.update('@store_insert_put', data[0], null, (err, data) => {
            should(err).eql('Error when validating data');
            should(data).not.ok();
            done();
          });
        });
      });

      it('should return error from server', done => {
        var _store                                           = initStore('store_insert_error', [{ id : ['<<int>>'], label : ['string'] }]);
        lunarisGlobal._stores['store_insert_put']            = _store;
        lunarisGlobal._stores['store_insert_put'].primaryKey = 'id';

        lunarisGlobal.insert('@store_insert_put', [{ label : 'a' }], (err, data) => {
          should(err).be.ok();
          done();
        });
      });

      it('should insert the value and execute the hooks', done => {
        var _nbExecutedHandlers                    = 0;
        var _store                                 = initStore('store1');
        lunarisGlobal._stores['store1']            = _store;
        lunarisGlobal._stores['store1'].primaryKey = 'id';

        lunarisGlobal.hook('insert@store1', () => {
          _nbExecutedHandlers++;
        });

        lunarisGlobal.hook('inserted@store1', () => {
          _nbExecutedHandlers++;
        });

        lunarisGlobal.insert('@store1', { id : 2, label : 'A' }, (err, res) => {
          should(err).not.ok();
          should(res).be.ok();

          setTimeout(() => {
            should(_nbExecutedHandlers).eql(2);
            done();
          }, 200);
        });
      });

      it('should return an error if required filter is not set', done => {
        var _store = initStore('store1');

        lunarisGlobal._stores['required']               = initStore('required');
        lunarisGlobal._stores['required'].isStoreObject = true;
        lunarisGlobal._stores['store1']                = _store;
        lunarisGlobal._stores['store1'].fakeAttributes = ['site'];
        lunarisGlobal._stores['store1'].filters.push({
          source          : '@required',
          sourceAttribute : 'category',
          localAttribute  : 'category',
          operator        : ['='],
          isRequired      : true
        });

        lunarisGlobal.insert('@store1', { id : 1, label : 'A' }, (err, res) => {
          should(err).eql('No url. Maybe the required filters are not set');
          should(res).not.be.ok();
          done();
        });
      });

    });

  });

  describe('multiple insert() / update()', () => {

    it('should insert the values', (done) => {
      var _store = initStore('multiple');
      lunarisGlobal._stores['multiple'] = _store;
      lunarisGlobal.insert('@multiple', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);

      should(_store.data._getAll()).eql([
        { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] },
        { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [1] }
      ]);

      lunarisGlobal.hook('inserted@multiple', () => {
        done();
      });
    });

    it('should insert the value and execute the hooks : insert & inserted', done => {
      var _isFirstInsertEvent                   = true;
      var _isUpdateHook                         = false;
      var _isUpdatedHook                        = false;
      var _store                                = initStore('multiple');
      lunarisGlobal._stores['multiple']                 = _store;
      lunarisGlobal._stores['multiple'].primaryKey      = 'id';
      lunarisGlobal._stores['multiple'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunarisGlobal.hook('insert@multiple', updatedValue => {
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

      lunarisGlobal.hook('update@multiple', () => {
        _isUpdateHook = true;
      });

      lunarisGlobal.hook('success@multiple', message => {
        should(message).eql('${the} multiple has been successfully ${created}');
      });

      lunarisGlobal.hook('inserted@multiple', (data) => {
        _isUpdatedHook = true;
        should(data).be.an.Array();
        should(data).eql([
          { _rowId : 3, _id : 1, id : 2, label : 'A', post : true, _version : [2] },
          { _rowId : 4, _id : 2, id : 1, label : 'B', post : true, _version : [2] }
        ]);

        for (var i = 0; i < data.length; i++) {
          should(Object.isFrozen(data[i])).eql(true);
        }

        if (_isUpdateHook && _isUpdatedHook) {
          done();
        }
      });

      lunarisGlobal.hook('errorHttp@multiple', (err) => {
        done(err);
      });

      lunarisGlobal.insert('@multiple', [
        { id : null, label : 'A' },
        { id : null, label : 'B' }
      ]);
    });

    it('should fire an error for insert', done => {
      var _store                                      = initStore('store_insert_post');
      lunarisGlobal._stores['store_insert_post']            = _store;
      lunarisGlobal._stores['store_insert_post'].primaryKey = 'id';

      lunarisGlobal.hook('errorHttp@store_insert_post', err => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris error] lunaris.insert@store_insert_post');
        should(lastError[1]).eql({ error : 404, message : 'Not Found', errors : [] });
        should(err.error).eql('${An error has occured}');
        done();
      });

      lunarisGlobal.insert('@store_insert_post', [{ id : 2, label : 'A' }, { id : 3, label : 'B' }]);
    });

    it('should add the error into lunarisErrors store : insert', done => {
      var _store                           = initStore('store_insert_post');
      lunarisGlobal._stores['store_insert_post']            = _store;
      lunarisGlobal._stores['store_insert_post'].primaryKey = 'id';

      lunarisGlobal.hook('errorHttp@store_insert_post', () => {
        var _values = lunarisGlobal._stores.lunarisErrors.data.getAll();
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
          messageErrorServer : { error : 404, message : 'Not Found', errors : [] },
        });
        done();
      });

      lunarisGlobal.insert('@store_insert_post', [{ id : 1, label : 'A' }, { id : 2, label : 'B' }]);
    });

    it('should fire an error for insert if the the validation failed', () => {
      var _store                                      = initStore('store_insert_post', [{ id : ['<<int>>'], label : ['string'] }]);
      lunarisGlobal._stores['store_insert_post']            = _store;
      lunarisGlobal._stores['store_insert_post'].primaryKey = 'id';

      lunarisGlobal.insert('@store_insert_post', [{ id : null, label : '1' }, { id : null, label : 1 }]);

      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.insert@store_insert_post Error when validating data');
      should(lastError[1]).eql({ error : '${must be a string}', field : 'label', value : 1, index : 1});
    });

    it('should update a value', () => {
      var _store = initStore('multiple');
      lunarisGlobal._stores['multiple'] = _store;
      lunarisGlobal.insert('@multiple', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
      lunarisGlobal.update('@multiple', [
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
      lunarisGlobal._stores['multiple'] = _store;
      lunarisGlobal._stores['multiple'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunarisGlobal.hook('inserted@multiple', () => {
        lunarisGlobal.update('@multiple', [
          { _id : 1, id : 1, label : 'A-1' },
          { _id : 2, id : 2, label : 'B-1' }
        ]);
      });

      lunarisGlobal.hook('update@multiple', updatedValue => {
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

      var nbcallsSuccess = 0;
      lunarisGlobal.hook('success@multiple', message => {
        nbcallsSuccess++;
        if (nbcallsSuccess === 1) {
          return should(message).eql('${the} multiple has been successfully ${created}');
        }
        should(message).eql('${the} multiple has been successfully ${edited}');
      });

      lunarisGlobal.hook('updated@multiple', (data) => {
        _isUpdatedHook = true;
        should(data).eql([
          { _rowId : 7, _id : 1, id : 1, label : 'A-1', put : true, _version : [4] },
          { _rowId : 8, _id : 2, id : 2, label : 'B-1', put : true, _version : [4] }
        ]);

        if (_isUpdateHook && _isUpdatedHook) {
          done();
        }
      });

      lunarisGlobal.hook('errorHttp@multiple', (err) => {
        done(err);
      });

      lunarisGlobal.insert('@multiple', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
    });

    it('should insert a value and fire an error for update', done => {
      var _store                                     = initStore('store_insert_put');
      lunarisGlobal._stores['store_insert_put']            = _store;
      lunarisGlobal._stores['store_insert_put'].primaryKey = 'id';

      lunarisGlobal.hook('inserted@store_insert_put', () => {
        lunarisGlobal.update('@store_insert_put', [{ _id : 1, id : 1, label : '1' }, { _id : 2, id : 2, label : '2' }]);
      });

      lunarisGlobal.hook('errorHttp@store_insert_put', err => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris error] lunaris.update@store_insert_put');
        should(lastError[1]).eql({ error : 404, message : 'Not Found', errors : [] });
        should(err.error).eql('${An error has occured}');
        done();
      });

      lunarisGlobal.insert('@store_insert_put', [{ id : 1 }, { id : 2 }]);
    });

    it('should insert a value and fire an error for update when validating', done => {
      var _store                                     = initStore('store_insert_put', [{ id : ['<<int>>'], label : ['string'] }]);
      lunarisGlobal._stores['store_insert_put']            = _store;
      lunarisGlobal._stores['store_insert_put'].primaryKey = 'id';

      lunarisGlobal.hook('inserted@store_insert_put', () => {
        lunarisGlobal.update('@store_insert_put', [{ _id : 1, id : 1, label : '1' }, { _id : 2, id : 2, label : 2 }]);
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris error] lunaris.update@store_insert_put Error when validating data');
        should(lastError[1]).eql({ error : '${must be a string}', field : 'label', value : 2, index : 1});
        done();
      });

      lunarisGlobal.insert('@store_insert_put', [{ id : 1, label : '' }, { id : 2, label : '' }]);
    });

    it('should insert a value and fire an error for update when validating (ids)', done => {
      var _store                                     = initStore('store_insert_put', [{ id : ['<<int>>'], label : ['string'] }]);
      lunarisGlobal._stores['store_insert_put']            = _store;
      lunarisGlobal._stores['store_insert_put'].primaryKey = 'id';

      lunarisGlobal.hook('inserted@store_insert_put', () => {
        lunarisGlobal.update('@store_insert_put', [{ _id : 1, id : 1, label : '1' }, { _id : 2, id : null, label : '2' }]);
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris error] lunaris.update@store_insert_put Error when validating data');
        should(lastError[1]).eql({ error : '${must be an integer}', field : 'id', value : null, index : 1});
        done();
      });

      lunarisGlobal.insert('@store_insert_put', [{ id : 1, label : '' }, { id : 2, label : '' }]);
    });

    it('should insert a value and add an error into lunarisErrors store : update', done => {
      var _store                                     = initStore('store_insert_put');
      lunarisGlobal._stores['store_insert_put']            = _store;
      lunarisGlobal._stores['store_insert_put'].primaryKey = 'id';

      lunarisGlobal.hook('inserted@store_insert_put', () => {
        lunarisGlobal.update('@store_insert_put', [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }]);
      });

      lunarisGlobal.hook('errorHttp@store_insert_put', () => {
        var _values = lunarisGlobal._stores.lunarisErrors.data.getAll();
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
          messageErrorServer : { error : 404, message : 'Not Found', errors : [] },
        });
        done();
      });

      lunarisGlobal.insert('@store_insert_put', [{ id : 1 }, { id : 2 }]);
    });

    it('should insert the values : callback', done => {
      var _store = initStore('multiple');
      lunarisGlobal._stores['multiple'] = _store;
      lunarisGlobal.insert('@multiple', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ], (err, res) => {
        should(err).not.ok();
        should(res).eql([
          { _rowId : 3, _id : 1, id : 2, label : 'A', _version : [2], post : true },
          { _rowId : 4, _id : 2, id : 1, label : 'B', _version : [2], post : true }
        ]);
        done();
      });
    });
  });

  describe('mass', () => {
    it('should update all object in the store and make a patch', done => {
      var _nbCalled     = 0;
      lunarisGlobal._stores['mass'] = initStore('mass');

      lunarisGlobal.hook('errorHttp@mass', done);
      lunarisGlobal.hook('patched@mass', () => {
        done();
      });
      lunarisGlobal.hook('inserted@mass', () => {
        lunarisGlobal.update('@mass:label', 'A');
      });
      lunarisGlobal.hook('update@mass', (items) => {
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
            { _rowId : 9 , id : 1, _id : 1, _version : [3], post : true, label : 'A' },
            { _rowId : 10, id : 2, _id : 2, _version : [3], post : true, label : 'A' },
            { _rowId : 11, id : 3, _id : 3, _version : [3], post : true, label : 'A' },
            { _rowId : 12, id : 4, _id : 4, _version : [3], post : true, label : 'A' }
          ]);
          return;
        }
        // should not update mass store another time
        done(_nbCalled);
      });

      lunarisGlobal.hook('insert@mass', function (items) {
        should(items).eql([
          { _rowId : 1, id : 1, _id : 1, _version : [1] },
          { _rowId : 2, id : 2, _id : 2, _version : [1] },
          { _rowId : 3, id : 3, _id : 3, _version : [1] },
          { _rowId : 4, id : 4, _id : 4, _version : [1] }
        ]);
      });

      lunarisGlobal.insert('@mass', [
        { id : 1 },
        { id : 2 },
        { id : 3 },
        { id : 4 }
      ]);
    });

    it('should conserve a mass operation for next insert', done => {
      lunarisGlobal._stores['mass'] = initStore('mass');

      lunarisGlobal.hook('errorHttp@mass', done);
      lunarisGlobal.hook('patched@mass', () => {
        lunarisGlobal.insert('@mass', [{ id : 1 }]);
      });
      lunarisGlobal.hook('inserted@mass', (items) => {
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

      lunarisGlobal.hook('insert@mass', function (items) {
        should(items).eql([{
          id       : 1,
          label    : 'A',
          _rowId   : 1,
          _id      : 1,
          _version : [2]
        }]);
      });

      lunarisGlobal.update('@mass:label', 'A');
    });

    it('should conserve a mass operation for next update', done => {
      lunarisGlobal._stores['mass'] = initStore('mass');

      lunarisGlobal.hook('errorHttp@mass', done);
      lunarisGlobal.hook('patched@mass', () => {
        lunarisGlobal.update('@mass', { id : 1, label : 'B', _id : 1 });
      });
      lunarisGlobal.hook('inserted@mass', (items) => {
        should(items).eql([{
          id       : 1,
          post     : true,
          _rowId   : 2,
          _id      : 1,
          _version : [2]
        }]);
        lunarisGlobal.update('@mass:label', 'A');
      });

      var _nbCalled = 0;
      lunarisGlobal.hook('update@mass', items => {
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

      lunarisGlobal.hook('insert@mass', items => {
        should(items).eql([{
          id       : 1,
          _rowId   : 1,
          _id      : 1,
          _version : [1]
        }]);
      });

      lunarisGlobal.insert('@mass', { id : 1 });
    });
  });

  describe('delete()', () => {
    it('insert() should be defined', () => {
      should(lunarisGlobal.delete).be.a.Function();
    });

    it('should throw an error if no value is provided', () => {
      lunarisGlobal.delete('@store');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.delete@store');
      should(lastError[1]).eql(new Error('Must have a value, provided value: undefined'));
    });

    it('should throw an error if the store is not a string', () => {
      lunarisGlobal.delete({}, { id : 1 });
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.delete' + {});
      should(lastError[1]).eql(new Error('Must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunarisGlobal.delete('@store', { id : 1 });
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.delete@store');
      should(lastError[1]).eql(new Error('The store "store" has not been defined'));
    });

    it('should delete the value', () => {
      var _value = { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] };

      var _store = initStore('store1');
      lunarisGlobal._stores['store1'] = _store;
      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_value);
      lunarisGlobal.delete('@store1', _value);
      should(_store.data.get(1)).eql(null);
    });

    it('should fire an error for delete', done => {
      var _store                              = initStore('store_del');
      lunarisGlobal._stores['store_del']            = _store;
      lunarisGlobal._stores['store_del'].primaryKey = 'id';

      lunarisGlobal.hook('errorHttp@store_del', err => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris error] lunaris.delete@store_del');
        should(lastError[1]).eql({ error : 404, message : 'Not Found', errors : [] });
        should(err).be.an.Object();
        should(err.error).eql('${An error has occured}');
        done();
      });

      lunarisGlobal._stores['store_del'].data.add({ _id : 1, id : 1 });
      lunarisGlobal.delete('@store_del', { _id : 1, id : 1 });
    });

    it('should add an error into lunarisErrors store : delete', done => {
      var _store                              = initStore('store_del');
      lunarisGlobal._stores['store_del']            = _store;
      lunarisGlobal._stores['store_del'].primaryKey = 'id';

      lunarisGlobal.hook('errorHttp@store_del', () => {
        var _values = lunarisGlobal._stores.lunarisErrors.data.getAll();
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
          messageErrorServer : { error : 404, message : 'Not Found', errors : [] },
        });
        done();
      });

      lunarisGlobal._stores['store_del'].data.add({ id : 1 });
      lunarisGlobal.delete('@store_del', { _id : 1, id : 1 });
    });

    it('should delete the value and execute the hooks : delete & deleted', done => {
      var _isDeleteHook                    = false;
      var _isDeletedHook                   = false;
      var _store                           = initStore('store1');
      var _expectedValue                   = { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] };
      lunarisGlobal._stores['store1']            = _store;
      lunarisGlobal._stores['store1'].primaryKey = 'id';
      lunarisGlobal._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      var _nbCalls = false;
      lunarisGlobal.hook('delete@store1', data => {
        _nbCalls++;
        // delete is sent before and after HTTP DELETE
        if (_nbCalls > 1) {
          return;
        }
        _isDeleteHook = true;
        should(data).be.an.Array().and.have.lengthOf(1);
        should(data).eql([{ _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1, 2] }]);
      });

      var _nbCallsSuccess = 0;
      lunarisGlobal.hook('success@store1', message => {
        _nbCallsSuccess++;
        if (_nbCallsSuccess === 1) {
          return should(message).eql('${the} store1 has been successfully ${created}');
        }
        return should(message).eql('${the} store1 has been successfully ${deleted}');
      });

      lunarisGlobal.hook('deleted@store1', (data) => {
        _isDeletedHook = true;

        // body, query, params come from insert
        should(data).eql({
          _rowId   : 1,
          _id      : 1,
          id       : 2,
          label    : 'A',
          _version : [1, 2]
        });

        if (_isDeletedHook && _isDeleteHook) {
          done();
        }
      });

      lunarisGlobal.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunarisGlobal.insert('@store1', { id : 2, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      lunarisGlobal.delete('@store1', _expectedValue);
    });

    it('should delete the value and execute the hooks, even if a GET have resurected the deleted primary key', done => {
      var _store = initStore('store1', [{
        id : ['<<int>>']
      }]);
      var _expectedValue                        = { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] };
      lunarisGlobal._stores['store1']                 = _store;
      lunarisGlobal._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      var _nbCalls = false;
      lunarisGlobal.hook('delete@store1', data => {
        _nbCalls++;
        // delete is sent before and after HTTP DELETE
        if (_nbCalls === 1) {
          should(data).be.an.Array().and.have.lengthOf(1);
          should(data).eql([{
            _rowId   : 2,
            _id      : 1,
            id       : 2,
            label    : 'A',
            _version : [2, 3],
            body     : { id : 2, label : 'A', _id : 1, _rowId : 1 },
            query    : {},
            params   : {}
          }]);
          should(_store.data.getAll()).have.lengthOf(0);

          // we simulate collection insert
          _store.data.add({ id : 2, label : 'A' });
          return;
        }

        should(data).be.an.Array().and.have.lengthOf(1);
        should(data).eql([{ _rowId : 3, _id : 2, id : 2, label : 'A', _version : [4, 5] }]);
        should(_store.data.getAll()).have.lengthOf(0);
        done();
      });

      lunarisGlobal.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunarisGlobal.insert('@store1', { id : 2, label : 'A' }, () => {
        lunarisGlobal.delete('@store1', _expectedValue);
      });
    });

    it('should delete the value and display the tip : no primary key', done => {
      var _isDeleteHook                    = false;
      var _isDeletedHook                   = false;
      var _store                           = initStore('store1');
      var _expectedValue                   = { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] };
      lunarisGlobal._stores['store1']            = _store;
      lunarisGlobal._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunarisGlobal.hook('delete@store1', () => {
        _isDeleteHook = true;
      });

      var _nbCallsSuccess = 0;
      lunarisGlobal.hook('success@store1', message => {
        _nbCallsSuccess++;
        if (_nbCallsSuccess === 1) {
          return should(message).eql('${the} store1 has been successfully ${created}');
        }
        return should(message).eql('${the} store1 has been successfully ${deleted}');
      });

      lunarisGlobal.hook('deleted@store1', (data) => {
        _isDeletedHook = true;
        should(data).eql({
          _rowId   : 1,
          _id      : 1,
          id       : 2,
          label    : 'A',
          _version : [1, 2]
        });

        if (_isDeletedHook && _isDeleteHook) {
          should(lastTip.length).eql(2);
          should(lastTip[0]).eql('[Lunaris tip] No primary key has been found in store "store1", fallback to lunaris object attribute "_id".');
          should(lastTip[1]).eql('To declare a primary key, use the notation [\'<<int>>\'] in the map or add the \'primaryKey\' attribute in the store description.');
          done();
        }
      });

      lunarisGlobal.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunarisGlobal.insert('@store1', { id : 2, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      lunarisGlobal.delete('@store1', _expectedValue);
    });

    it('should delete the value and not execute the hook deleted', done => {
      var _isDeleteHook                    = false;
      var _isDeletedHook                   = false;
      var _store                           = initStore('store1');
      var _expectedValue                   = { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] };
      lunarisGlobal._stores['store1']            = _store;
      lunarisGlobal._stores['store1'].primaryKey = 'id';
      lunarisGlobal._stores['store1'].isLocal    = true;

      lunarisGlobal.hook('delete@store1', () => {
        _isDeleteHook = true;
      });

      lunarisGlobal.hook('deleted@store1', () => {
        _isDeletedHook = true;
      });

      lunarisGlobal.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunarisGlobal.insert('@store1', { id : 2, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      lunarisGlobal.delete('@store1', _expectedValue);

      setTimeout(() => {
        should(_isDeleteHook).eql(true);
        should(_isDeletedHook).eql(false);
        done();
      }, 200);
    });

    it('should delete the value and execute the hook and return false if the value has not been deleted', () => {
      var _store                = initStore('store1');
      lunarisGlobal._stores['store1'] = _store;

      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
      lunarisGlobal.delete('@store1', { _id : 2, id : 2, label : 'B' });
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.delete@store1');
      should(lastError[1]).eql(new Error('You cannot delete a value not in the store!'));
    });

    it('should delete the value and not execute the hook deleted : options.isLocal = true', done => {
      var _isDeleteHook                    = false;
      var _isDeletedHook                   = false;
      var _store                           = initStore('store1');
      var _expectedValue                   = { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1] };
      lunarisGlobal._stores['store1']            = _store;
      lunarisGlobal._stores['store1'].primaryKey = 'id';

      lunarisGlobal.hook('delete@store1', () => {
        _isDeleteHook = true;
      });

      lunarisGlobal.hook('deleted@store1', () => {
        _isDeletedHook = true;
      });

      lunarisGlobal.insert('@store1', { id : 2, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      lunarisGlobal.delete('@store1', _expectedValue, { isLocal : true });

      setTimeout(() => {
        should(_isDeleteHook).eql(true);
        should(_isDeletedHook).eql(false);
        done();
      }, 200);
    });

    it('should delete the value: fn signature -> store, value, callback', done => {
      var _store                           = initStore('store1');
      var _expectedValue                   = { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1, 2] };
      lunarisGlobal._stores['store1']            = _store;
      lunarisGlobal._stores['store1'].primaryKey = 'id';
      lunarisGlobal._stores['store1'].isLocal    = true;

      lunarisGlobal.insert('@store1', { id : 2, label : 'A' });
      lunarisGlobal.delete('@store1', _expectedValue, (err, res) => {
        should(err).not.ok();
        should(res).eql(_expectedValue);
        done();
      });
    });

    it('should delete the value: fn signature -> store, value, options, callback', done => {
      var _isDeleteHook                    = false;
      var _isDeletedHook                   = false;
      var _store                           = initStore('store1');
      var _expectedValue                   = { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1, 2] };
      lunarisGlobal._stores['store1']            = _store;
      lunarisGlobal._stores['store1'].primaryKey = 'id';

      lunarisGlobal.hook('delete@store1', () => {
        _isDeleteHook = true;
      });

      lunarisGlobal.hook('deleted@store1', () => {
        _isDeletedHook = true;
      });

      lunarisGlobal.insert('@store1', { id : 2, label : 'A' });
      lunarisGlobal.delete('@store1', _expectedValue, { isLocal : true }, (err, res) => {
        should(err).not.ok();
        should(res).eql(_expectedValue);

        setTimeout(() => {
          should(_isDeleteHook).eql(true);
          should(_isDeletedHook).eql(false);
          done();
        }, 200);
      });
    });

    it('should delete the value and execute the hooks: fn signature -> store, value, callback', done => {
      var _isDeleteHook                    = false;
      var _isDeletedHook                   = false;
      var _store                           = initStore('store1');
      var _expectedValue                   = { _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1, 2] };
      lunarisGlobal._stores['store1']            = _store;
      lunarisGlobal._stores['store1'].primaryKey = 'id';

      lunarisGlobal.hook('delete@store1', () => {
        _isDeleteHook = true;
      });

      lunarisGlobal.hook('deleted@store1', () => {
        _isDeletedHook = true;
      });

      lunarisGlobal.insert('@store1', { id : 2, label : 'A' });
      lunarisGlobal.delete('@store1', _expectedValue, (err, res) => {
        should(err).not.ok();
        should(res).eql(_expectedValue);


        setTimeout(() => {
          should(_isDeleteHook).eql(true);
          should(_isDeletedHook).eql(true);
          done();
        }, 200);
      });
    });

    it('should delete the value and fail HTTP', done => {
      var _store                                 = initStore('store2');
      lunarisGlobal._stores['store2']            = _store;
      lunarisGlobal._stores['store2'].primaryKey = 'id';
      lunarisGlobal._stores['store2'].isLocal    = true;

      lunarisGlobal.insert('@store2', { id : 2, label : 'A' });
      lunarisGlobal.delete('@store2', { id : 2, label : 'A' }, (err, res) => {
        should(err).ok();
        should(err.message).eql('You cannot delete a value not in the store!');
        done();
      });
    });
  });

  describe('getOne()', () => {
    it('insert() should be defined', () => {
      should(lunarisGlobal.getOne).be.a.Function();
    });

    it('should throw an error if the store is not a string', () => {
      lunarisGlobal.getOne({});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.getOne' + {});
      should(lastError[1]).eql(new Error('Must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunarisGlobal.getOne('@store0');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.getOne@store0');
      should(lastError[1]).eql(new Error('The store "store0" has not been defined'));
    });

    it('should get the first value', () => {
      var _store          = initStore('store1');
      var _expectedValues = [
        { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] },
        { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] }
      ];
      lunarisGlobal._stores['store1'] = _store;

      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
      lunarisGlobal.insert('@store1', { id : 2, label : 'B' });
      should(_store.data.get(1)).eql(_expectedValues[0]);
      should(_store.data.get(2)).eql(_expectedValues[1]);
      var _val = lunarisGlobal.getOne('@store1');
      should(_val).eql(_expectedValues[0]);
      // should(Object.isFrozen(_val)).eql(true);
    });

    it('should get the identified value', () => {
      var _store                = initStore('store1');
      lunarisGlobal._stores['store1'] = _store;

      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
      lunarisGlobal.insert('@store1', { id : 2, label : 'B' });
      var _val = lunarisGlobal.getOne('@store1', 2);
      should(_val).eql(
        { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [2] }
      );
    });

    it('should get the identified value by PK', () => {
      var _store                = initStore('store1', [{ id : ['<<int>>'], label : ['string'] }]);
      lunarisGlobal._stores['store1'] = _store;

      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
      lunarisGlobal.insert('@store1', { id : 3, label : 'B' });
      lunarisGlobal.insert('@store1', { id : 2, label : 'B' });
      var _val = lunarisGlobal.getOne('@store1', 2, true);
      should(_val).eql(
        { _rowId : 3, _id : 3, id : 2, label : 'B', _version : [3] }
      );
    });

    it('should get undefined if no value is in the collection', () => {
      var _store                = initStore('store1');
      lunarisGlobal._stores['store1'] = _store;
      should(lunarisGlobal.getOne('@store1')).eql(undefined);
    });
  });

  describe('get()', () => {
    it('insert() should be defined', () => {
      should(lunarisGlobal.get).be.a.Function();
    });

    it('should throw an error if the store is not a string', () => {
      lunarisGlobal.get({});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.get' + {});
      should(lastError[1]).eql(new Error('Must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunarisGlobal.get('@store');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.get@store');
      should(lastError[1]).eql(new Error('The store "store" has not been defined'));
    });

    it('should get the values and execute the hook', done => {
      var _store                = initStore('store1');
      lunarisGlobal._stores['store1'] = _store;

      lunarisGlobal.hook('get@store1', items => {
        should(items).eql([
          { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [1] },
          { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [1] },
          { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [1] }
        ]);

        done();
      });

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.get('@store1');
    });

    it('should get the all the values of the colection and execute the hook if the store is local', done => {
      var _store                        = initStore('store1');
      lunarisGlobal._stores['store1']         = _store;
      lunarisGlobal._stores['store1'].isLocal = true;
      lunarisGlobal._stores['store1'].data.add({ id : 1});
      lunarisGlobal._stores['store1'].data.add({ id : 2});

      lunarisGlobal.hook('get@store1', items => {
        should(items).be.an.Array().and.have.lengthOf(2);
        should(items).eql([
          { _rowId : 1, _id : 1, id : 1, _version : [1] },
          { _rowId : 2, _id : 2, id : 2, _version : [2] }
        ]);
        done();
      });

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.get('@store1');
    });

    it('should filter the store even if it is local', done => {
      lunarisGlobal._stores['source']         = initStore('source', {});
      lunarisGlobal._stores['source'].isLocal = true;

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
      lunarisGlobal._stores['store1']         = _store;
      lunarisGlobal._stores['store1'].isLocal = true;
      lunarisGlobal.insert('store1', [
        { id : 1, label : 'A'},
        { id : 2, label : 'B'}
      ]);
      lunarisGlobal.insert('@source', { label : 'B' });

      lunarisGlobal.hook('get@store1', items => {
        should(items).be.an.Array().and.have.lengthOf(1);
        should(items).eql([
          { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [1] }
        ]);
        done();
      });

      lunarisGlobal.get('@store1');
    });

    it('should get null if the store is object and it has no value', done => {
      var _store                        = initStore('store1', { id : ['<<int>>'] });
      lunarisGlobal._stores['store1']         = _store;
      lunarisGlobal._stores['store1'].isLocal = true;
      lunarisGlobal._stores['store1'].data.add({ id : 1});

      lunarisGlobal.hook('get@store1', items => {
        should(items).be.an.Object();
        should(items).eql({ _rowId : 1, _id : 1, id : 1, _version : [1] });
        done();
      });

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.get('@store1');
    });

    it('should get a value if the store is object', done => {
      var _store                        = initStore('store1', { id : ['<<int>>'] });
      lunarisGlobal._stores['store1']         = _store;
      lunarisGlobal._stores['store1'].isLocal = true;

      lunarisGlobal.hook('get@store1', items => {
        should(items).eql(null);
        done();
      });

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.get('@store1');
    });

    it('should fire the errorHttp event : HTTP error', done => {
      var _store               = initStore('store');
      lunarisGlobal._stores['store'] = _store;

      lunarisGlobal.hook('errorHttp@store', err => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris error] lunaris.get@store');
        should(lastError[1]).eql({ error : 404, message : 'Not Found', errors : [] });
        should(err).be.an.Object();
        should(err.error).eql('${An error has occured}');
        done();
      });

      lunarisGlobal.get('@store');
    });

    it('should throw an error', done => {
      var _store               = initStore('pagination', { id : ['int'] });
      lunarisGlobal._stores['pagination'] = _store;

      lunarisGlobal.get('@pagination');

      setTimeout(() => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris error] lunaris.get@pagination');
        should(lastError[1]).eql(new Error('The store "pagination" is an object store. The GET method cannot return multiple elements!'));
        done();
      }, 200);
    });

    it('should add the error into lunarisErrors store', done => {
      var _store               = initStore('store');
      lunarisGlobal._stores['store'] = _store;

      lunarisGlobal.hook('errorHttp@store', () => {
        var _values = lunarisGlobal._stores.lunarisErrors.data.getAll();
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
          messageErrorServer : { error : 404, message : 'Not Found', errors : [] },
        });
        done();
      });

      lunarisGlobal.get('@store');
    });

    it('should fire the errorHttp event : application based error', done => {
      var _store               = initStore('store2');
      lunarisGlobal._stores['store2'] = _store;

      lunarisGlobal.hook('errorHttp@store2', err => {
        should(err).be.an.Object();
        should(err.error).eql('${An error has occured}');
        done();
      });

      lunarisGlobal.get('@store2');
    });

    it('should get the values and execute the hook', done => {
      var _nbPages                  = 0;
      var _store                    = initStore('pagination');
      lunarisGlobal._stores['pagination'] = _store;

      lunarisGlobal.hook('get@pagination', items => {
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
          lunarisGlobal.get('@pagination');
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

      lunarisGlobal.hook('errorHttp@pagination', err => {
        done(err);
      });

      lunarisGlobal.get('@pagination');
    });

    it('should get the values without duplicating values', done => {
      var _nbPages                  = 0;
      var _store                    = initStore('pagination_duplicate');
      _store.data = collection.collection((item) => {
        return item.id;
      }, null, null, null, null, null, null, lunarisGlobal.utils.clone);
      lunarisGlobal._stores['pagination_duplicate'] = _store;

      lunarisGlobal.hook('get@pagination_duplicate', items => {
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
          lunarisGlobal.get('@pagination_duplicate');
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

      lunarisGlobal.hook('errorHttp@pagination_duplicate', err => {
        done(err);
      });

      lunarisGlobal.get('@pagination_duplicate');
    });

    it('should filter the store by a required filter', done => {
      var _isFirstCall = true;
      lunarisGlobal._stores['required.param.site']               = initStore('required.param.site', {});
      lunarisGlobal._stores['required.param.site'].isStoreObject = true;
      lunarisGlobal._stores['required.param.site'].isLocal       = true;
      lunarisGlobal._stores['required.param.site'].data.add({
        site : 1
      });
      var map = [{
        id   : ['<<int>>'],
        site : ['int']
      }];
      lunarisGlobal._stores['required'] = initStore('required', map, null, null, [{
        source          : '@required.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        operator        : '=',
        isRequired      : true
      }]);

      lunarisGlobal.hook('get@required', items => {
        if (_isFirstCall) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 1, _version : [2] },
            { _rowId : 2, _id : 2, id : 2, _version : [2] },
            { _rowId : 3, _id : 3, id : 3, _version : [2] }
          ]);
          _isFirstCall = false;
          lunarisGlobal.update('@required.param.site', {
            _id  : 1,
            site : 2
          });
          lunarisGlobal.get('@required');
          return;
        }
        should(items).eql([
          { _rowId : 4, _id : 4, id : 4, _version : [4] },
          { _rowId : 5, _id : 5, id : 5, _version : [4] },
          { _rowId : 6, _id : 6, id : 6, _version : [4] }
        ]);

        done();
      });

      lunarisGlobal.hook('errorHttp@required', err => {
        done(err);
      });

      lunarisGlobal.get('@required');
    });

    it('should not filter the store by a required filter if there is no value in the filter', done => {
      var _hasBeenCalled = false;
      lunarisGlobal._stores['required.param.site']         = initStore('required.param.site');
      lunarisGlobal._stores['required.param.site'].isLocal = true;
      var _map = [{
        id   : ['<<int>>'],
        site : ['int']
      }];
      lunarisGlobal._stores['required'] = initStore('required', _map, null, null, [{
        source          : '@required.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true,
        operator        : '=',
      }]);

      lunarisGlobal.hook('get@required', () => {
        _hasBeenCalled = true;
      });

      lunarisGlobal.hook('errorHttp@required', err => {
        done(err);
      });

      lunarisGlobal.get('@required');

      setTimeout(() => {
        should(_hasBeenCalled).eql(false);
        done();
      }, 200);
    });

    it('should filter the store by a required filter and paginate', done => {
      var _nbPages                                            = 0;
      lunarisGlobal._stores['pagination2.param.site']               = initStore('pagination2.param.site', {});
      lunarisGlobal._stores['pagination2.param.site'].isStoreObject = true;
      lunarisGlobal._stores['pagination2.param.site'].data.add({
        site : 1
      });
      var _map = [{
        id   : ['<<int>>'],
        site : ['int']
      }];
      lunarisGlobal._stores['pagination2']= initStore('pagination2', _map,  null, null, [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true,
        operator        : '=',
      }]);

      lunarisGlobal.hook('update@pagination2.param.site', () => {
        lunarisGlobal._stores['pagination2'].paginationCurrentPage = 1;
        lunarisGlobal._stores['pagination2'].paginationOffset      = 0;
      });

      lunarisGlobal.hook('get@pagination2', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunarisGlobal.get('@pagination2');
          return;
        }
        if (_nbPages === 2) {
          should(items).eql([
            { _rowId : 4, _id : 4, id : 40, label : 'A', _version : [3] },
            { _rowId : 5, _id : 5, id : 50, label : 'C', _version : [3] },
            { _rowId : 6, _id : 6, id : 60, label : 'F', _version : [3] }
          ]);
          lunarisGlobal.update('@pagination2.param.site', {
            _id  : 1,
            site : 2
          });
          lunarisGlobal.get('@pagination2');
          return;
        }

        should(items).eql([
          { _rowId : 7, _id : 7, id : 70, label : 'G', _version : [5] },
          { _rowId : 8, _id : 8, id : 80, label : 'H', _version : [5] },
          { _rowId : 9, _id : 9, id : 90, label : 'I', _version : [5] }
        ]);

        done();
      });

      lunarisGlobal.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunarisGlobal.get('@pagination2');
    });

    it('should filter the store by an optional filter', done => {
      lunarisGlobal._stores['optional.param.site']               = initStore('optional.param.site');
      lunarisGlobal._stores['optional.param.site'].isStoreObject = true;
      lunarisGlobal._stores['optional.param.site'].data.add({
        id : 1
      });
      var _map = [{
        id : ['<<int>>']
      }];
      lunarisGlobal._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@optional.param.site',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      }]);

      lunarisGlobal.hook('get@optional', items => {
        should(items).eql([
          { _rowId : 1, _id : 1, limit : '50', offset : '0', search : 'id:=1', _version : [2]}
        ]);

        done();
      });

      lunarisGlobal.hook('errorHttp@optional', err => {
        done(err);
      });

      lunarisGlobal.get('@optional');
    });

    it('should fire the event filterUpdated', done => {
      lunarisGlobal._stores['optional.param.site']          = initStore('optional.param.site');
      lunarisGlobal._stores['optional.param.site'].isLocal  = true;
      lunarisGlobal._stores['optional.param.site'].isFilter = true;
      var _map = [{
        id : ['<<int>>']
      }];
      lunarisGlobal._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@optional.param.site',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      }]);

      lunarisGlobal.hook('filterUpdated@optional.param.site', () => {
        done();
      });

      lunarisGlobal.hook('errorHttp@optional', err => {
        done(err);
      });

      lunarisGlobal.insert('@optional.param.site', { id : 1 });
    });

    it('should fire the event filterUpdated for GET : store object', done => {
      lunarisGlobal._stores['store1']          = initStore('store1');
      lunarisGlobal._stores['store1'].isLocal  = true;
      lunarisGlobal._stores['store1'].isFilter = true;
      var _map = {
        id : ['int']
      };
      lunarisGlobal._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@store1',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      }]);

      lunarisGlobal.hook('filterUpdated@store1', () => {
        done();
      });

      lunarisGlobal.hook('errorHttp@optional', err => {
        done(err);
      });

      lunarisGlobal._stores['store1'].data.add({ id : 1 });
      lunarisGlobal.get('@store1');
    });

    it('should not fire the event filterUpdated for GET : store object', done => {
      lunarisGlobal._stores['store1']          = initStore('store1');
      lunarisGlobal._stores['store1'].isLocal  = true;
      lunarisGlobal._stores['store1'].isFilter = true;
      var _map = {
        id : ['int']
      };
      lunarisGlobal._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@store1',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      }]);

      var _hasBeenCalled = false;
      lunarisGlobal.hook('filterUpdated@store1', () => {
        _hasBeenCalled = true;
      });

      lunarisGlobal.hook('errorHttp@optional', () => {
        _hasBeenCalled = true;
      });

      setTimeout(() => {
        should(_hasBeenCalled).eql(false);
        done();
      }, 100);

      lunarisGlobal.get('@store1');
    });

    it('should fire the event filterUpdated for GET : store array', done => {
      lunarisGlobal._stores['store1']          = initStore('store1');
      lunarisGlobal._stores['store1'].isFilter = true;
      var _map = [{
        id : ['<<int>>']
      }];
      lunarisGlobal._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@store1',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      }]);

      lunarisGlobal.hook('filterUpdated@store1', () => {
        done();
      });

      lunarisGlobal.hook('errorHttp@optional', err => {
        done(err);
      });

      lunarisGlobal.get('@store1');
    });

    it('should filter the store by two optional filters', done => {
      lunarisGlobal._stores['optional.param.site']               = initStore('optional.param.site');
      lunarisGlobal._stores['optional.param.site'].isStoreObject = true;
      lunarisGlobal._stores['optional.param.site'].data.add({
        id : 1
      });
      lunarisGlobal._stores['optional.param.category']               = initStore('optional.param.category');
      lunarisGlobal._stores['optional.param.category'].isStoreObject = true;
      lunarisGlobal._stores['optional.param.category'].data.add({
        id : 2
      });
      var _map = [{
        id       : ['<<int>>'],
        category : ['int']
      }];
      lunarisGlobal._stores['optional'] = initStore('optional', _map, null, null, [
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

      lunarisGlobal.hook('get@optional', items => {
        should(items).eql([
          { _rowId : 1, _id : 1, limit : '50', offset : '0', search : 'id:=1+category:=2', _version : [3]}
        ]);

        done();
      });

      lunarisGlobal.hook('errorHttp@optional', err => {
        done(err);
      });

      lunarisGlobal.get('@optional');
    });

    it('should filter the store by an optional array filter', done => {
      lunarisGlobal._stores['optional.param.site'] = initStore('optional.param.site');
      lunarisGlobal._stores['optional.param.site'].data.add({
        id : 1
      });
      lunarisGlobal._stores['optional.param.site'].data.add({
        id : 2
      });
      var _map = [{
        id : ['<<int>>']
      }];
      lunarisGlobal._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@optional.param.site',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      }]);

      lunarisGlobal.hook('get@optional', items => {
        should(items).eql([
          { _rowId : 1, _id : 1, limit : '50', offset : '0', search : 'id:[1,2]', _version : [3]}
        ]);

        done();
      });

      lunarisGlobal.hook('errorHttp@optional', err => {
        done(err);
      });

      lunarisGlobal.get('@optional');
    });

    it('should not filter the store if the optional filter is not set', done => {
      lunarisGlobal._stores['optional.param.site']     = initStore('optional.param.site');
      var _map = [{
        id   : ['<<int>>'],
        site : ['string']
      }];
      lunarisGlobal._stores['optional'] = initStore('optional', _map, null, null, [{
        source          : '@optional.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        operator        : 'ILIKE'
      }]);

      lunarisGlobal.hook('get@optional', items => {
        should(items).eql([
          { _rowId : 1, _id : 1, limit : '50', offset : '0', _version : [1]}
        ]);

        done();
      });

      lunarisGlobal.hook('errorHttp@optional', err => {
        done(err);
      });

      lunarisGlobal.get('@optional');
    });

    it('should get the item identified by its id', done => {
      var _currentId = 1;
      lunarisGlobal._stores['get'] = initStore('get');
      lunarisGlobal.hook('get@get', item => {
        if (_currentId === 1) {
          should(item).be.an.Object();
          should(item).eql([{
            _rowId   : 1,
            _id      : 1,
            id       : 1,
            _version : [1]
          }]);
          _currentId++;
          lunarisGlobal.get('@get', _currentId);
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

      lunarisGlobal.hook('errorHttp@get', err => {
        done(err);
      });

      lunarisGlobal.get('@get', _currentId);
    });

    it('should get the item identified by its id = 0', done => {
      var _currentId = 0;
      lunarisGlobal._stores['get'] = initStore('get');
      lunarisGlobal.hook('get@get', item => {
        if (_currentId === 0) {
          should(item).be.an.Object();
          should(item).eql([{
            _rowId   : 1,
            _id      : 1,
            id       : 0,
            _version : [1]
          }]);
          _currentId++;
          lunarisGlobal.get('@get', _currentId);
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

      lunarisGlobal.hook('errorHttp@get', err => {
        done(err);
      });

      lunarisGlobal.get('@get', _currentId);
    });

    it('should not filter the store by a required filter if the filer is not authorized for the current method', done => {
      lunarisGlobal._stores['required.param.site'] = initStore('required.param.site');
      lunarisGlobal._stores['required.param.site'].data.add({
        site : 1
      });
      var _map = [{
        id   : ['<<int>>'],
        site : ['string']
      }];
      lunarisGlobal._stores['methods'] = initStore('methods', _map, null, null, [{
        source          : '@required.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true,
        httpMethods     : ['POST'],
        operator        : 'ILIKE'
      }]);

      lunarisGlobal.hook('get@methods', data => {
        should(data[0].query).be.ok();
        should(data[0].params).be.ok();
        should(data[0].query).eql({ limit : '50', offset : '0' });
        should(data[0].params).eql({});
        should(data[0].body).be.ok();
        should(data[0].body).eql({});
        done();
      });

      lunarisGlobal.hook('errorHttp@methods', err => {
        done(err);
      });

      lunarisGlobal.get('@methods');
    });

    it('should get the value for store object and update the current vlaue of the store instaead of inserting the new value', done => {
      let _store                         = initStore('getObject', { id : ['int'] });
      lunarisGlobal._stores['getObject'] = _store;

      let res1 = {
        _id      : 1,
        _rowId   : 1,
        _version : [1],
        id       : 0
      };

      let res2 = {
        _id      : 1,
        _rowId   : 2,
        _version : [2],
        id       : 1
      };

      lunarisGlobal.get('@getObject', 0, (err, res) => {
        should(err).not.ok();
        should(res).eql(res1);

        lunarisGlobal.get('@getObject', 1, (err, res) => {
          should(err).not.ok();
          should(res).eql(res2);

          should(_store.data.getAll()).not.eql(res1);
          should(_store.data.getAll()).eql(res2);
          done();
        });
      });
    });

    describe('callback', () => {

      it('should get the values : function signature (store, cb)', done => {
        var _store                = initStore('store1');
        lunarisGlobal._stores['store1'] = _store;

        lunarisGlobal.get('@store1', (err, res) => {
          should(err).not.ok();
          should(res).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [1] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [1] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [1] }
          ]);
          done();
        });
      });

      it('should get the values : function signature (store, null, cb)', done => {
        var _store                = initStore('store1');
        lunarisGlobal._stores['store1'] = _store;

        lunarisGlobal.get('@store1', null, (err, res) => {
          should(err).not.ok();
          should(res).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [1] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [1] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [1] }
          ]);
          done();
        });
      });

      it('should get the values : function signature (store, pk, options, cb)', done => {
        var _store                = initStore('store1');
        lunarisGlobal._stores['store1'] = _store;

        lunarisGlobal.get('@store1', null, {}, (err, res) => {
          should(err).not.ok();
          should(res).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [1] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [1] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [1] }
          ]);
          done();
        });
      });

      it('should get local values', done => {
        var _store = initStore('store1');
        lunarisGlobal._stores['store1']         = _store;
        lunarisGlobal._stores['store1'].isLocal = true;
        lunarisGlobal.insert('store1', [
          { id : 1, label : 'A'},
          { id : 2, label : 'B'}
        ]);

        lunarisGlobal.get('@store1', (err, res) => {
          should(err).not.ok();
          should(res).eql([
            { _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] },
            { _rowId : 2, _id : 2, id : 2, label : 'B', _version : [1] }
          ]);
          done();
        });
      });

      it('should get the values from the cache', done => {
        var _store                = initStore('store1');
        lunarisGlobal._stores['store1'] = _store;

        lunarisGlobal.get('@store1', (err, res) => {
          should(err).not.ok();
          should(res).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [1] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [1] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [1] }
          ]);


          lunarisGlobal.setPagination('@store1', 1);
          lunarisGlobal.get('@store1', (err, res) => {
            should(err).not.ok();
            should(res).eql([
              { _rowId : 4, _id : 4, id : 20, label : 'B', _version : [2] },
              { _rowId : 5, _id : 5, id : 30, label : 'D', _version : [2] },
              { _rowId : 6, _id : 6, id : 10, label : 'E', _version : [2] }
            ]);
            done();
          });
        });
      });

      it('should http error', done => {
        var _store               = initStore('store');
        lunarisGlobal._stores['store'] = _store;

        lunarisGlobal.get('@store', err => {
          should(err).ok();
          should(err).eql({ error : 404, message : 'Not Found', errors : [] });
          done();
        });
      });

      it('should return error', done => {
        var _store               = initStore('pagination', { id : ['int'] });
        lunarisGlobal._stores['pagination'] = _store;

        lunarisGlobal.get('@pagination', err => {
          should(err).eql('The store "pagination" is an object store. The GET method cannot return multiple elements!');
          done();
        });
      });

      it('should get the item identified by its id', done => {
        var _currentId = 1;
        lunarisGlobal._stores['get'] = initStore('get');

        lunarisGlobal.get('@get', _currentId, (err, res) => {
          should(err).not.ok();
          should(res).eql([{
            _rowId   : 1,
            _id      : 1,
            id       : 1,
            _version : [1]
          }]);
          done();
        });
      });

    });
  });

  describe('load()', () => {
    beforeEach(() => {
      lunarisGlobal.offline.isOfflineMode = true;
    });

    after(() => {
      lunarisGlobal.offline.isOfflineMode = false;
    });

    it('should throw an error if we are not online', () => {
      lunarisGlobal.offline.isOnline = false;
      lunarisGlobal.load('@store');

      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.load@store');
      should(lastError[1]).eql(new Error('You are offline!'));
      lunarisGlobal.offline.isOnline = true;
    });

    it('should throw an error if offline mode is desactivated', () => {
      lunarisGlobal.offline.isOfflineMode = false;

      lunarisGlobal.load('@store');

      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.load@store');
      should(lastError[1]).eql(new Error('Offline mode is not enabled!'));
    });

    it('should throw an error if store is local', () => {
      lunarisGlobal._stores['load']         = initStore('load');
      lunarisGlobal._stores['load'].isLocal = true;

      lunarisGlobal.load('@load');

      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.load@load');
      should(lastError[1]).eql(new Error('The store is local!'));
    });

    it('should load store & emit loaded event', done => {
      lunarisGlobal._stores['load'] = initStore('load');

      const hook = () => {
        let data = lunarisGlobal._stores.load.data.getAll();
        should(data).have.lengthOf(6);
        should(data).eql([
          { id : 1, label : 'a', header : 'ok', _id : 1, _rowId : 1, _version : [1] },
          { id : 2, label : 'b', header : 'ok', _id : 2, _rowId : 2, _version : [1] },
          { id : 3, label : 'c', header : 'ok', _id : 3, _rowId : 3, _version : [1] },
          { id : 4, label : 'd', header : 'ok', _id : 4, _rowId : 4, _version : [1] },
          { id : 5, label : 'e', header : 'ok', _id : 5, _rowId : 5, _version : [1] },
          { id : 6, label : 'f', header : 'ok', _id : 6, _rowId : 6, _version : [1] }
        ]);
        lunarisGlobal.removeHook('loaded@load', hook);
        done();
      };

      lunarisGlobal.hook('loaded@load', hook);
      lunarisGlobal.load('@load');
    });

    it('should load store & emit loaded event with option limit = 3', done => {
      lunarisGlobal._stores['load'] = initStore('load');

      const hook = () => {
        let data = lunarisGlobal._stores.load.data.getAll();
        should(data).have.lengthOf(3);
        should(data).eql([
          { id : 1, label : 'a', header : 'ok', _id : 1, _rowId : 1, _version : [1] },
          { id : 2, label : 'b', header : 'ok', _id : 2, _rowId : 2, _version : [1] },
          { id : 3, label : 'c', header : 'ok', _id : 3, _rowId : 3, _version : [1] }
        ]);
        lunarisGlobal.removeHook('loaded@load', hook);
        done();
      };

      lunarisGlobal.hook('loaded@load', hook);
      lunarisGlobal.load('@load', { limit : 3 });
    });

    it('should use filters : required', done => {
      lunarisGlobal._stores['load.filter.a']               = initStore('load.filter.a');
      lunarisGlobal._stores['load.filter.a'].isLocal       = true;
      lunarisGlobal._stores['load.filter.a'].isFilter      = true;
      lunarisGlobal._stores['load.filter.a'].isStoreObject = true;

      lunarisGlobal._stores['load']          = initStore('load', [{ id : ['<<int>>'], label : ['string'] }], null, null, [{
        source          : '@load.filter.a',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : '=',
        isRequired      : true
      }]);

      const hook = () => {
        let data = lunarisGlobal._stores.load.data.getAll();
        should(data).have.lengthOf(1);
        should(data).eql([
          { id : 1, label : 'a', url : '/load/label/a', _id : 1, _rowId : 1, _version : [2] }
        ]);
        lunarisGlobal.removeHook('loaded@load', hook);
        done();
      };

      lunarisGlobal.hook('loaded@load', hook);
      lunarisGlobal.insert('@load.filter.a', { label : 'a' });
      lunarisGlobal.load('@load');
    });

    it('should use filters : optional', done => {
      lunarisGlobal._stores['load.filter.a']               = initStore('load.filter.a');
      lunarisGlobal._stores['load.filter.a'].isLocal       = true;
      lunarisGlobal._stores['load.filter.a'].isFilter      = true;
      lunarisGlobal._stores['load.filter.a'].isStoreObject = true;

      lunarisGlobal._stores['load']          = initStore('load', [{ id : ['<<int>>'], label : ['string'] }], null, null, [{
        source          : '@load.filter.a',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : '='
      }]);

      const hook = () => {
        let data = lunarisGlobal._stores.load.data.getAll();
        should(data).have.lengthOf(6);
        should(data).eql([
          { id : 1, label : 'a', header : 'ok', _id : 1, _rowId : 1, _version : [2] },
          { id : 2, label : 'b', header : 'ok', _id : 2, _rowId : 2, _version : [2] },
          { id : 3, label : 'c', header : 'ok', _id : 3, _rowId : 3, _version : [2] },
          { id : 4, label : 'd', header : 'ok', _id : 4, _rowId : 4, _version : [2] },
          { id : 5, label : 'e', header : 'ok', _id : 5, _rowId : 5, _version : [2] },
          { id : 6, label : 'f', header : 'ok', _id : 6, _rowId : 6, _version : [2] }
        ]);
        lunarisGlobal.removeHook('loaded@load', hook);
        done();
      };

      lunarisGlobal.hook('loaded@load', hook);
      lunarisGlobal.insert('@load.filter.a', { label : 'a' });
      lunarisGlobal.load('@load');
    });

    it('should use filters : required & optional', done => {
      lunarisGlobal._stores['load.filter.a']               = initStore('load.filter.a');
      lunarisGlobal._stores['load.filter.a'].isLocal       = true;
      lunarisGlobal._stores['load.filter.a'].isFilter      = true;
      lunarisGlobal._stores['load.filter.a'].isStoreObject = true;
      lunarisGlobal._stores['load.filter.b']               = initStore('load.filter.b');
      lunarisGlobal._stores['load.filter.b'].isLocal       = true;
      lunarisGlobal._stores['load.filter.b'].isFilter      = true;
      lunarisGlobal._stores['load.filter.b'].isStoreObject = true;

      lunarisGlobal._stores['load']          = initStore('load', [{ id : ['<<int>>'], label : ['string'] }], null, null, [
        {
          source          : '@load.filter.a',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '=',
          isRequired      : true
        },
        {
          source          : '@load.filter.b',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '=',
        }
      ]);

      const hook = () => {
        let data = lunarisGlobal._stores.load.data.getAll();
        should(data).have.lengthOf(1);
        should(data).eql([
          { id : 1, label : 'a', url : '/load/label/a?search=label' + encodeURIComponent(':=') + 'b', _id : 1, _rowId : 1, _version : [3] }
        ]);
        lunarisGlobal.removeHook('loaded@load', hook);
        done();
      };

      lunarisGlobal.hook('loaded@load', hook);
      lunarisGlobal.insert('@load.filter.a', { label : 'a' });
      lunarisGlobal.insert('@load.filter.b', { label : 'b' });
      lunarisGlobal.load('@load');
    });
  });

  describe('offline', () => {
    before(() => {
      lunarisGlobal.offline.isOnline = false;
    });
    after(() => {
      lunarisGlobal.offline.isOnline = true;
    });

    it('should filter the store by a required filter when offline', done => {
      lunarisGlobal._stores['required.param.site']               = initStore('required.param.site', {});
      lunarisGlobal._stores['required.param.site'].isStoreObject = true;
      lunarisGlobal._stores['required.param.site'].isLocal       = true;
      lunarisGlobal._stores['required.param.site'].data.add({
        site : 1
      });
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      lunarisGlobal._stores['required'] = initStore('required', _map, null, null, [{
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
      lunarisGlobal.hook('inserted@required', () => {
        _hasBeenCalled = true;
      });
      lunarisGlobal.hook('errorHttp@required', () => {
        _hasBeenCalled = true;
      });

      lunarisGlobal.insert('@required', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' },
        { id : 3, label : 'C' },
        { id : 4, label : 'D' }
      ]);

      lunarisGlobal.hook('get@required', items => {
        should(items).eql([
          { _rowId : 5, _id : 1, id : 1, label : 'A', _version : [3] }
        ]);
        should(Object.isFrozen(items[0])).eql(true);
        should(_hasBeenCalled).eql(false);
        done();
      });

      lunarisGlobal.get('@required');
    });

    it('should filter the store by an optional filter when offline', done => {
      lunarisGlobal._stores['optional.param.site']               = initStore('optional.param.site', {});
      lunarisGlobal._stores['optional.param.site'].isStoreObject = true;
      lunarisGlobal._stores['optional.param.site'].isLocal       = true;
      lunarisGlobal._stores['optional.param.site'].data.add({
        site : 1
      });
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      lunarisGlobal._stores['optional'] = initStore('optional', _map, null, null, [{
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

      lunarisGlobal.insert('@optional', [
        { id : 1, label : 'A', site : { id : 1 } },
        { id : 2, label : 'B', site : { id : 2 } },
        { id : 3, label : 'C', site : { id : 1 } },
        { id : 4, label : 'D', site : { id : 2 } }
      ]);

      var _hasBeenCalled = false;
      lunarisGlobal.hook('inserted@optional', () => {
        _hasBeenCalled = true;
      });
      lunarisGlobal.hook('errorHttp@optional', () => {
        _hasBeenCalled = true;
      });

      lunarisGlobal.hook('get@optional', items => {
        should(items).eql([
          { _rowId : 5, _id : 1, id : 1, label : 'A', site : { id : 1 }, _version : [3] },
          { _rowId : 7, _id : 3, id : 3, label : 'C', site : { id : 1 }, _version : [3] },
        ]);
        should(Object.isFrozen(items[0])).eql(true);
        should(Object.isFrozen(items[1])).eql(true);
        should(_hasBeenCalled).eql(false);
        done();
      });

      lunarisGlobal.get('@optional');
    });

    it('should filter the store by an optional filter when offline and add to the cache', done => {
      lunarisGlobal._stores['optional.param.site']               = initStore('optional.param.site', {});
      lunarisGlobal._stores['optional.param.site'].isStoreObject = true;
      lunarisGlobal._stores['optional.param.site'].isLocal       = true;
      lunarisGlobal._stores['optional.param.site'].data.add({
        site : 2
      });
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      lunarisGlobal._stores['optional'] = initStore('optional', _map, null, null, [{
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
      lunarisGlobal.hook('inserted@optional', () => {
        _hasBeenCalled = true;
      });
      lunarisGlobal.hook('errorHttp@optional', () => {
        _hasBeenCalled = true;
      });

      lunarisGlobal.insert('@optional', [
        { id : 1, label : 'A', site : { id : 2 } },
        { id : 2, label : 'B', site : { id : 2 } },
        { id : 3, label : 'C', site : { id : 1 } },
        { id : 4, label : 'D', site : { id : 2 } }
      ]);

      lunarisGlobal.setPagination('@optional', 1, 2);

      lunarisGlobal.hook('get@optional', items => {
        should(items).eql([
          { _rowId : 5, _id : 1, id : 1, label : 'A', site : { id : 2 }, _version : [3] },
          { _rowId : 6, _id : 2, id : 2, label : 'B', site : { id : 2 }, _version : [3] },
        ]);
        should(Object.isFrozen(items[0])).eql(true);
        should(Object.isFrozen(items[1])).eql(true);
        should(_hasBeenCalled).eql(false);
        should(lunarisGlobal._cache._cache()).eql([
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

      lunarisGlobal.get('@optional');
    });

    it('should not make an http request when offline : UPSERT', done => {
      lunarisGlobal._stores['optional.param.site']               = initStore('optional.param.site', {});
      lunarisGlobal._stores['optional.param.site'].isStoreObject = true;
      lunarisGlobal._stores['optional.param.site'].isLocal       = true;
      lunarisGlobal._stores['optional.param.site'].data.add({
        site : 2
      });
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      lunarisGlobal._stores['optional'] = initStore('optional', _map, null, null, [{
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
      lunarisGlobal.hook('inserted@optional', () => {
        _hasBeenCalled = true;
      });
      lunarisGlobal.hook('errorHttp@optional', () => {
        _hasBeenCalled = true;
      });

      lunarisGlobal.insert('@optional', [
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
      lunarisGlobal._stores['optional.param.site']               = initStore('optional.param.site', {});
      lunarisGlobal._stores['optional.param.site'].isStoreObject = true;
      lunarisGlobal._stores['optional.param.site'].isLocal       = true;
      lunarisGlobal._stores['optional.param.site'].data.add({
        site : 2
      });
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      lunarisGlobal._stores['optional'] = initStore('optional', _map, null, null, [{
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
      lunarisGlobal.hook('deleted@optional', () => {
        _hasBeenCalled = true;
      });
      lunarisGlobal.hook('errorHttp@optional', () => {
        _hasBeenCalled = true;
      });

      lunarisGlobal.insert('@optional', [
        { id : 1, label : 'A', site : { id : 2 } },
        { id : 2, label : 'B', site : { id : 2 } },
        { id : 3, label : 'C', site : { id : 1 } },
        { id : 4, label : 'D', site : { id : 2 } }
      ]);

      lunarisGlobal.delete('@optional', { _id : 1 });

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
      lunarisGlobal._stores['required'] = initStore('required', _map);

      lunarisGlobal.insert('@required', { id : null, label : 'A' });

      should(lunarisGlobal.getOne('@required', 1)).eql({
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
      lunarisGlobal._stores['required'] = initStore('required', _map);

      lunarisGlobal.insert('@required', { id : null, label : 'A' });

      should(lunarisGlobal.getOne('@required', 1)).eql({
        id       : '_1',
        label    : 'A',
        _rowId   : 1,
        _id      : 1,
        _version : [1]
      });
    });

    it('should set the id when inserting : simpleKey && no map', () => {
      lunarisGlobal._stores['required']            = initStore('required');
      lunarisGlobal._stores['required'].primaryKey = ['id'];

      lunarisGlobal.insert('@required', { id : null, label : 'A' });

      should(lunarisGlobal.getOne('@required', 1)).eql({
        id       : '_1',
        label    : 'A',
        _rowId   : 1,
        _id      : 1,
        _version : [1]
      });
    });

    it('should set the id when inserting : composite key && no map', () => {
      lunarisGlobal._stores['required'] = initStore('required');
      lunarisGlobal._stores['required'].primaryKey = ['id', 'label'];

      lunarisGlobal.insert('@required', { id : null, label : 'A' });

      should(lunarisGlobal.getOne('@required', 1)).eql({
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
      should(lunarisGlobal.clear).be.ok();
      should(lunarisGlobal.clear).be.Function();
    });

    it('should throw an error if the store is not a string', () => {
      lunarisGlobal.clear({});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.clear' + {});
      should(lastError[1]).eql(new Error('Must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunarisGlobal.clear('@store');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.clear@store');
      should(lastError[1]).eql(new Error('The store "store" has not been defined'));
    });

    it('should clear the store', () => {
      var _store = initStore('store1');
      lunarisGlobal._stores['store1'] = _store;
      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] });
      lunarisGlobal.clear('@store1');
      should(lunarisGlobal._stores['store1'].data._getAll()).be.an.Array().and.have.length(0);
      lunarisGlobal.get('@store1');
      lunarisGlobal.get('@store1');
      should(lunarisGlobal._stores['store1'].paginationCurrentPage).eql(3);
      should(lunarisGlobal._stores['store1'].paginationOffset).eql(100);
      lunarisGlobal.clear('@store1');
      should(lunarisGlobal._stores['store1'].paginationCurrentPage).eql(1);
      should(lunarisGlobal._stores['store1'].paginationOffset).eql(0);
    });

    it('should clear the store and enver trigger the hook reset', done => {
      var _hasFiredHook = false;
      var _store        = initStore('store1');
      lunarisGlobal._stores['store1'] = _store;
      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] });

      lunarisGlobal.hook('reset@store1', () => {
        _hasFiredHook = true;
      });

      lunarisGlobal.clear('@store1', true);
      setTimeout(() => {
        should(_hasFiredHook).eql(false);
        done();
      }, 200);
    });

    it('should clear the store and enver trigger the hook clear', done => {
      var _hasFiredHook = false;
      var _store        = initStore('store1');
      lunarisGlobal._stores['store1'] = _store;
      lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] });

      lunarisGlobal.hook('clear@store1', () => {
        _hasFiredHook = true;
      });

      lunarisGlobal.clear('@store1', true);
      setTimeout(() => {
        should(_hasFiredHook).eql(false);
        done();
      }, 200);
    });

    it('should not clear multiple stores and not send events', done => {
      var _hooks = {};
      lunarisGlobal._stores['store.filter.A']         = initStore('store.filter.A');
      lunarisGlobal._stores['store.filter.A'].isLocal = true;
      lunarisGlobal._stores['store.filter.B']         = initStore('store.filter.B');
      lunarisGlobal._stores['store.filter.B'].isLocal = true;
      lunarisGlobal._stores['store.C']                = initStore('store.C');
      lunarisGlobal._stores['store.C'].isLocal        = true;

      lunarisGlobal.hook('reset@store.filter.A', () => {
        _hooks['store.filter.A'] = true;
      });
      lunarisGlobal.hook('reset@store.filter.B', () => {
        _hooks['store.filter.B'] = true;
      });
      lunarisGlobal.hook('reset@store.C', () => {
        _hooks['store.C'] = true;
      });

      lunarisGlobal.insert('@store.filter.A', {
        label : 'A'
      });
      lunarisGlobal.insert('@store.filter.B', {
        label : 'B'
      });
      lunarisGlobal.insert('@store.C', {
        label : 'C'
      });

      lunarisGlobal.clear('store.filter.*');
      setTimeout(() => {
        should(Object.keys(_hooks)).eql([]);
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris error] lunaris.clear');
        should(lastError[1]).eql(new Error('The store key must begin by \'@\''));
        done();
      }, 100);
    });

    it('should clear multiple stores and send events', done => {
      var _hooks = {};
      lunarisGlobal._stores['store.filter.A'] = initStore('store.filter.A');
      lunarisGlobal._stores['store.filter.B'] = initStore('store.filter.B');
      lunarisGlobal._stores['store.C']        = initStore('store.C');

      lunarisGlobal.hook('reset@store.filter.A', () => {
        _hooks['store.filter.A'] = true;
      });
      lunarisGlobal.hook('reset@store.filter.B', () => {
        _hooks['store.filter.B'] = true;
      });
      lunarisGlobal.hook('reset@store.C', () => {
        _hooks['store.C'] = true;
      });

      lunarisGlobal.insert('@store.filter.A', {
        label : 'A'
      });
      lunarisGlobal.insert('@store.filter.B', {
        label : 'B'
      });
      lunarisGlobal.insert('@store.C', {
        label : 'C'
      });

      lunarisGlobal.clear('@store.filter.*');
      setTimeout(() => {
        should(_hooks).eql({
          'store.filter.A' : true,
          'store.filter.B' : true
        });
        should(lunarisGlobal._stores['store.filter.A'].data.getAll()).eql([]);
        should(lunarisGlobal._stores['store.filter.B'].data.getAll()).eql([]);
        should(lunarisGlobal._stores['store.C'].data.getAll()).eql([{
          _id      : 1,
          _rowId   : 1,
          _version : [3],
          label    : 'C'
        }]);
        done();
      }, 100);
    });

    it('should clear multiple stores and not send events', done => {
      lunarisGlobal._stores['store.filter.A'] = initStore('store.filter.A');
      lunarisGlobal._stores['store.filter.B'] = initStore('store.filter.B');
      lunarisGlobal._stores['store.C']        = initStore('store.C');

      lunarisGlobal.insert('@store.filter.A', {
        label : 'A'
      });
      lunarisGlobal.insert('@store.filter.B', {
        label : 'B'
      });
      lunarisGlobal.insert('@store.C', {
        label : 'C'
      });

      lunarisGlobal.clear('@store.filter.*');
      setTimeout(() => {
        should(lunarisGlobal._stores['store.filter.A'].data.getAll()).eql([]);
        should(lunarisGlobal._stores['store.filter.B'].data.getAll()).eql([]);
        should(lunarisGlobal._stores['store.C'].data.getAll()).eql([{
          _id      : 1,
          _rowId   : 1,
          _version : [3],
          label    : 'C'
        }]);
        done();
      }, 100);
    });

    describe('callback', () => {
      it('should throw an error if the store is not a string', done => {
        lunarisGlobal.clear({}, err => {
          should(err).eql(new Error('Must have a correct store value: @<store>'));
          done();
        });
      });

      it('should clear the store', done => {
        var _store = initStore('store1');
        lunarisGlobal._stores['store1'] = _store;
        lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
        should(_store.data.get(1)).eql({ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] });
        lunarisGlobal.clear('@store1', () => {
          should(lunarisGlobal._stores['store1'].data._getAll()).be.an.Array().and.have.length(0);
          done();
        });
      });

      it('should clear the store and not trigger the hook reset', done => {
        var _hasFiredHook = false;
        var _store        = initStore('store1');
        lunarisGlobal._stores['store1'] = _store;
        lunarisGlobal.insert('@store1', { id : 1, label : 'A' });
        should(_store.data.get(1)).eql({ _rowId : 1, _id : 1, id : 1, label : 'A', _version : [1] });

        lunarisGlobal.hook('reset@store1', () => {
          _hasFiredHook = true;
        });

        lunarisGlobal.clear('@store1', { isSilent : true }, () => {
          setTimeout(() => {
            should(_hasFiredHook).eql(false);
            done();
          }, 200);
        });
      });

      it('should clear multiple stores and send events', done => {
        var _hooks = {};
        lunarisGlobal._stores['store.filter.A'] = initStore('store.filter.A');
        lunarisGlobal._stores['store.filter.B'] = initStore('store.filter.B');
        lunarisGlobal._stores['store.C']        = initStore('store.C');

        lunarisGlobal.hook('reset@store.filter.A', () => {
          _hooks['store.filter.A'] = true;
        });
        lunarisGlobal.hook('reset@store.filter.B', () => {
          _hooks['store.filter.B'] = true;
        });
        lunarisGlobal.hook('reset@store.C', () => {
          _hooks['store.C'] = true;
        });

        lunarisGlobal.insert('@store.filter.A', {
          label : 'A'
        });
        lunarisGlobal.insert('@store.filter.B', {
          label : 'B'
        });
        lunarisGlobal.insert('@store.C', {
          label : 'C'
        });

        lunarisGlobal.clear('@store.filter.*', () => {
          setTimeout(() => {
            should(_hooks).eql({
              'store.filter.A' : true,
              'store.filter.B' : true
            });
            should(lunarisGlobal._stores['store.filter.A'].data.getAll()).eql([]);
            should(lunarisGlobal._stores['store.filter.B'].data.getAll()).eql([]);
            should(lunarisGlobal._stores['store.C'].data.getAll()).eql([{
              _id      : 1,
              _rowId   : 1,
              _version : [3],
              label    : 'C'
            }]);
            done();
          }, 100);
        });
      });

      it('should clear multiple stores and not send events', done => {
        var _hooks = {};
        lunarisGlobal._stores['store.filter.A'] = initStore('store.filter.A');
        lunarisGlobal._stores['store.filter.B'] = initStore('store.filter.B');
        lunarisGlobal._stores['store.C']        = initStore('store.C');

        lunarisGlobal.hook('reset@store.filter.A', () => {
          _hooks['store.filter.A'] = true;
        });
        lunarisGlobal.hook('reset@store.filter.B', () => {
          _hooks['store.filter.B'] = true;
        });
        lunarisGlobal.hook('reset@store.C', () => {
          _hooks['store.C'] = true;
        });

        lunarisGlobal.insert('@store.filter.A', {
          label : 'A'
        });
        lunarisGlobal.insert('@store.filter.B', {
          label : 'B'
        });
        lunarisGlobal.insert('@store.C', {
          label : 'C'
        });

        lunarisGlobal.clear('@store.filter.*', { isSilent : true }, () => {
          setTimeout(() => {
            should(_hooks).eql({});
            should(lunarisGlobal._stores['store.filter.A'].data.getAll()).eql([]);
            should(lunarisGlobal._stores['store.filter.B'].data.getAll()).eql([]);
            should(lunarisGlobal._stores['store.C'].data.getAll()).eql([{
              _id      : 1,
              _rowId   : 1,
              _version : [3],
              label    : 'C'
            }]);
            done();
          }, 100);
        });
      });
    });
  });

  describe('rollback', () => {
    it('should be defined', () => {
      should(lunarisGlobal.rollback).be.ok();
      should(lunarisGlobal.rollback).be.Function();
    });

    it('should throw an error if the store is not a string', () => {
      lunarisGlobal.rollback({});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.rollback' + {});
      should(lastError[1]).eql(new Error('Must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunarisGlobal.rollback('@store');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.rollback@store');
      should(lastError[1]).eql(new Error('The store "store" has not been defined'));
    });

    it('should rollback the store', done => {
      var _store                                      = initStore('store_insert_post');
      lunarisGlobal._stores['store_insert_post']            = _store;
      lunarisGlobal._stores['store_insert_post'].primaryKey = 'id';

      lunarisGlobal.hook('errorHttp@store_insert_post', () => {
        lunarisGlobal.rollback('@store_insert_post', lunarisGlobal._stores.lunarisErrors.data.getAll()[0].version);
        should(lunarisGlobal._stores.store_insert_post.data.getAll()).have.lengthOf(0);
        done();
      });

      lunarisGlobal.insert('@store_insert_post', { id : 2, label : 'A' });
      should(lunarisGlobal._stores.store_insert_post.data.getAll()).have.lengthOf(1);
    });
  });

  describe('getDefaultValue()', () => {
    it('should be defined', () => {
      should(lunarisGlobal.getDefaultValue).be.ok();
      should(lunarisGlobal.getDefaultValue).be.Function();
    });

    it('should throw an error if the store value is not correct', () => {
      lunarisGlobal.getDefaultValue({});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.getDefaultValue' + {});
      should(lastError[1]).eql(new Error('Must have a correct store value: @<store>'));
    });

    it('should return an empty object if no map has been provided', () => {
      lunarisGlobal._stores['store1'] = initStore('store1');
      should(lunarisGlobal.getDefaultValue('@store1')).eql({});
    });

    it('should return a default object', () => {
      lunarisGlobal._stores['store1'] = initStore('store1', [{
        id    : ['<<int>>', 2],
        label : ['string'],
        menus : ['array', {
          id    : ['<<int>>'],
          label : ['string']
        }]
      }]);
      should(lunarisGlobal.getDefaultValue('@store1')).eql({
        id    : 2,
        label : null,
        menus : []
      });
    });

    it('should return a default object and not edit the base object', () => {
      lunarisGlobal._stores['store1'] = initStore('store1', [{
        id    : ['<<int>>', 2],
        label : ['string'],
        menus : ['array', {
          id    : ['<<int>>'],
          label : ['string']
        }]
      }]);

      var _defaultValue = lunarisGlobal.getDefaultValue('@store1');
      _defaultValue.id    = 3;
      _defaultValue.label = 5;

      should(lunarisGlobal._stores['store1'].meta.defaultValue).eql({
        id    : 2,
        label : null,
        menus : []
      });
    });
  });

  describe('validate', () => {
    it('should be defined', () => {
      should(lunarisGlobal.validate).be.ok();
      should(lunarisGlobal.validate).be.a.Function();
    });

    it('should throw an error if the store has not map', done => {
      lunarisGlobal._stores['store'] = initStore('store');
      delete lunarisGlobal._stores['store'].validateFn;

      lunarisGlobal.validate('@store', { id : 1, label : 1 }, true);
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.validate@store');
      should(lastError[1]).eql(new Error('The store does not have a map! You cannot validate a store without a map.'));
      done();
    });

    it('should throw an error if value is an array and store is an object store', done => {
      lunarisGlobal._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunarisGlobal.validate('@store', { id : 1, label : 1 }, true, () => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris error] lunaris.update@store Error when validating data');
        should(lastError[1]).eql({ value : 1, field : 'label', error : '${must be a string}', index : null });
        done();
      });
    });

    it('should validate for insert', done => {
      lunarisGlobal._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunarisGlobal.validate('@store', { id : 1, label : 'A' }, isValid => {
        should(isValid).eql(true);
        done();
      });
    });

    it('should not validate for insert', done => {
      lunarisGlobal._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunarisGlobal.validate('@store', { id : 'A', label : 1 }, isValid => {
        should(isValid).eql(false);
        done();
      });
    });

    it('should validate for update', done => {
      lunarisGlobal._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunarisGlobal.validate('@store', { id : 1, label : 'B' }, true, isValid => {
        should(isValid).eql(true);
        done();
      });
    });

    it('should not validate primary key for update', done => {
      lunarisGlobal._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunarisGlobal.validate('@store', { id : 'A', label : '1' }, true, isValid => {
        should(isValid).eql(false);
        done();
      });
    });

    it('should not validate other keys for update', done => {
      lunarisGlobal._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunarisGlobal.validate('@store', { id : 1, label : 1 }, true, isValid => {
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
      lunarisGlobal._stores['pagination2.param.site']               = initStore('pagination2.param.site');
      lunarisGlobal._stores['pagination2.param.site'].isStoreObject = true;
      lunarisGlobal._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunarisGlobal._stores['pagination2'] = initStore('pagination2', [{
        id : ['<<int>>']
      }]);
      lunarisGlobal._stores['pagination2'].filters = [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      }];

      lunarisGlobal.hook('get@pagination2', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunarisGlobal.setPagination('@pagination2', 1, 50);
          lunarisGlobal.get('@pagination2');
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

      lunarisGlobal.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunarisGlobal.get('@pagination2');
    });

    it('should cache the values and not save collection\'s attributes', done => {
      var _nbPages                                            = 0;
      lunarisGlobal._stores['pagination2.param.site']               = initStore('pagination2.param.site');
      lunarisGlobal._stores['pagination2.param.site'].isStoreObject = true;
      lunarisGlobal._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunarisGlobal._stores['pagination2'] = initStore('pagination2', [{
        id : ['<<int>>']
      }]);
      lunarisGlobal._stores['pagination2'].filters = [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      }];

      lunarisGlobal.hook('get@pagination2', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunarisGlobal.setPagination('@pagination2', 1, 50);
          lunarisGlobal.get('@pagination2');
          return;
        }

        should(items).eql([
          { _rowId : 4, _id : 1, id : 20, label : 'B', _version : [3] },
          { _rowId : 5, _id : 2, id : 30, label : 'D', _version : [3] },
          { _rowId : 6, _id : 3, id : 10, label : 'E', _version : [3] }
        ]);

        var _cacheRes =lunarisGlobal._cache._cache();
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

      lunarisGlobal.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunarisGlobal.get('@pagination2');
    });

    it('should invalidate the cache if a value has been updated', done => {
      var _nbPages                                            = 0;
      lunarisGlobal._stores['pagination2.param.site']               = initStore('pagination2.param.site');
      lunarisGlobal._stores['pagination2.param.site'].isStoreObject = true;
      lunarisGlobal._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunarisGlobal._stores['pagination2']            = initStore('pagination2');
      lunarisGlobal._stores['pagination2'].filters    = [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      }];

      lunarisGlobal.hook('get@pagination2', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunarisGlobal.setPagination('@pagination2', 1, 50);
          lunarisGlobal.update('@pagination2', { _id : 3, id : 10, label : 'E-2'}, { isLocal : true });
          lunarisGlobal.get('@pagination2');
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

      lunarisGlobal.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunarisGlobal.get('@pagination2');
    });

    it('should invalidate the cache id if it is deleted', done => {
      var _nbPages                                            = 0;
      lunarisGlobal._stores['pagination2.param.site']               = initStore('pagination2.param.site');
      lunarisGlobal._stores['pagination2.param.site'].isStoreObject = true;
      lunarisGlobal._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunarisGlobal._stores['pagination2'] = initStore('pagination2', [{
        id : ['<<int>>']
      }]);
      lunarisGlobal._stores['pagination2'].filters = [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      }];

      lunarisGlobal.hook('get@pagination2', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _rowId : 1, _id : 1, id : 20, label : 'B', _version : [2] },
            { _rowId : 2, _id : 2, id : 30, label : 'D', _version : [2] },
            { _rowId : 3, _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunarisGlobal.setPagination('@pagination2', 1, 50);
          lunarisGlobal.delete('@pagination2', { _id : 3, id : 10, label : 'E'}, { isLocal : true });
          lunarisGlobal.get('@pagination2');
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

      lunarisGlobal.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunarisGlobal.get('@pagination2');
    });
  });

  describe('Set pagination', () => {
    it('should reset the pagiantion : page 1', done => {
      lunarisGlobal._stores['pagination2.param.site'] = initStore('pagination2.param.site');
      lunarisGlobal._stores['pagination2.param.site'].isStoreObject = true;
      lunarisGlobal._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunarisGlobal._stores['pagination2']            = initStore('pagination2');
      lunarisGlobal._stores['pagination2'].filters    = [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      }];

      lunarisGlobal.hook('get@pagination2', () => {
        should(lunarisGlobal._stores['pagination2'].paginationLimit).eql(50);
        should(lunarisGlobal._stores['pagination2'].paginationCurrentPage).eql(2);
        should(lunarisGlobal._stores['pagination2'].paginationOffset).eql(50);
        lunarisGlobal.setPagination('@pagination2', 1, 20);
        should(lunarisGlobal._stores['pagination2'].paginationLimit).eql(20);
        should(lunarisGlobal._stores['pagination2'].paginationCurrentPage).eql(1);
        should(lunarisGlobal._stores['pagination2'].paginationOffset).eql(0);
        done();
      });

      lunarisGlobal.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunarisGlobal.get('@pagination2');
    });

    it('should reset the pagiantion : page > 1', done => {
      lunarisGlobal._stores['pagination2.param.site'] = initStore('pagination2.param.site');
      lunarisGlobal._stores['pagination2.param.site'].isStoreObject = true;
      lunarisGlobal._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunarisGlobal._stores['pagination2']            = initStore('pagination2');
      lunarisGlobal._stores['pagination2'].filters    = [{
        source          : '@pagination2.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      }];

      lunarisGlobal.hook('get@pagination2', () => {
        should(lunarisGlobal._stores['pagination2'].paginationLimit).eql(50);
        should(lunarisGlobal._stores['pagination2'].paginationCurrentPage).eql(2);
        should(lunarisGlobal._stores['pagination2'].paginationOffset).eql(50);
        lunarisGlobal.setPagination('@pagination2', 4, 20);
        should(lunarisGlobal._stores['pagination2'].paginationLimit).eql(20);
        should(lunarisGlobal._stores['pagination2'].paginationCurrentPage).eql(4);
        should(lunarisGlobal._stores['pagination2'].paginationOffset).eql(60);
        done();
      });

      lunarisGlobal.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunarisGlobal.get('@pagination2');
    });
  });

  describe('createUrl', () => {
    it('createUrl() should be defined', () => {
      should(lunarisGlobal.createUrl).be.a.Function();
    });

    it('should throw an error if the store is not a string', () => {
      lunarisGlobal.createUrl({});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.createUrl');
      should(lastError[1]).eql(new Error('Must have a correct store value: @<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunarisGlobal.createUrl('@store');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.createUrl');
      should(lastError[1]).eql(new Error('The store "store" has not been defined'));
    });

    it('should throw an error if not method has been given', () => {
      lunarisGlobal._stores['store'] = initStore('store1');

      lunarisGlobal.createUrl('@store');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.createUrl');
      should(lastError[1]).eql(new Error('Must provide a method, ex: GET, POST, etc.'));
    });

    it('should build the url : GET', () => {
      lunarisGlobal._stores['store'] = initStore('store');

      should(lunarisGlobal.createUrl('@store', 'GET')).eql(
        '/store?limit=50&offset=0'
      );
    });

    it('should build the url & not increment pagination: GET', () => {
      lunarisGlobal._stores['store'] = initStore('store');

      should(lunarisGlobal.createUrl('@store', 'GET')).eql(
        '/store?limit=50&offset=0'
      );
      should(lunarisGlobal.createUrl('@store', 'GET')).eql(
        '/store?limit=50&offset=0'
      );
    });

    it('should build the url with PK : GET', () => {
      lunarisGlobal._stores['store'] = initStore('store');

      should(lunarisGlobal.createUrl('@store', 'GET', 1)).eql(
        '/store/1?limit=50&offset=0'
      );
    });

    it('should build the url: POST', () => {
      lunarisGlobal._stores['store'] = initStore('store');

      should(lunarisGlobal.createUrl('@store', 'POST')).eql(
        '/store'
      );
    });

    it('should build the url: PUT', () => {
      lunarisGlobal._stores['store'] = initStore('store');

      should(lunarisGlobal.createUrl('@store', 'PUT')).eql(
        '/store'
      );
    });

    it('should build the url with PK : PUT', () => {
      lunarisGlobal._stores['store'] = initStore('store');

      should(lunarisGlobal.createUrl('@store', 'PUT', 1)).eql(
        '/store/1'
      );
    });

    it('should build the url: PATCH', () => {
      lunarisGlobal._stores['store'] = initStore('store');

      should(lunarisGlobal.createUrl('@store', 'PATCH')).eql(
        '/store'
      );
    });

    it('should build the url: DELETE', () => {
      lunarisGlobal._stores['store'] = initStore('store');

      should(lunarisGlobal.createUrl('@store', 'DELETE')).eql(
        '/store'
      );
    });

    it('should build the url with PK : DELETE', () => {
      lunarisGlobal._stores['store'] = initStore('store');

      should(lunarisGlobal.createUrl('@store', 'DELETE', 1)).eql(
        '/store/1'
      );
    });
  });

  describe('propagation', () => {

    it('should propagate to a store object : GET', done => {
      var _store                = initStore('store1', null, null, ['propagate']);
      lunarisGlobal._stores['store1'] = _store;

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
      lunarisGlobal._stores['propagate'] = _storeToPropagate;

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.insert('@propagate', { id : 1 });
      lunarisGlobal.get('@store1');
      lunarisGlobal.hook('update@propagate', res => {
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
      lunarisGlobal._stores['store1'] = _store;

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
      lunarisGlobal._stores['propagate'] = _storeToPropagate;

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.insert('@propagate', [{ id : 1 }, { id : 2 }]);
      lunarisGlobal.get('@store1');

      lunarisGlobal.hook('update@propagate', res => {
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
      lunarisGlobal._stores['emptyArray'] = _store;

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
      lunarisGlobal._stores['propagate'] = _storeToPropagate;

      lunarisGlobal.hook('errorHttp@emptyArray', err => {
        done(err);
      });

      lunarisGlobal.insert('@propagate', [{ id : 1 }, { id : 2 }]);
      lunarisGlobal.get('@emptyArray');

      var _hasBeenCalled = false;
      lunarisGlobal.hook('update@propagate', () => {
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
      lunarisGlobal._stores['store1'] = _store;

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
      lunarisGlobal._stores['propagate'] = _storeToPropagate;

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.insert('@propagate', [{ id : 1 }, { id : 2 }]);
      lunarisGlobal.get('@store1');

      lunarisGlobal.hook('update@propagate', res => {
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
          return lunarisGlobal.clear('@store1');
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
      lunarisGlobal._stores['store1'] = _store;

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
      lunarisGlobal._stores['propagate'] = _storeToPropagate;

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.insert('@propagate', { id : 1 });
      lunarisGlobal.get('@store1');

      lunarisGlobal.hook('update@propagate', res => {
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

          return lunarisGlobal.clear('@store1');
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
      lunarisGlobal._stores['store1'] = _store;

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
      lunarisGlobal._stores['propagate'] = _storeToPropagate;

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.insert('@propagate', [{ id : 1 }, { id : 2 }]);
      lunarisGlobal.get('@store1');

      lunarisGlobal.hook('deleted@store1', () => {
        done();
      });

      lunarisGlobal.hook('update@propagate', res => {
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

          return lunarisGlobal.delete('@store1', { _id : 1});
        }

        if (_nbCalled === 2) {
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
        }
      });
    });

    it('should propagate to a store object : DELETE', done => {
      var _nbCalled             = 0;
      var _store                = initStore('store1', null, null, ['propagate']);
      lunarisGlobal._stores['store1'] = _store;

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
      lunarisGlobal._stores['propagate'] = _storeToPropagate;

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.insert('@propagate', { id : 1 });
      lunarisGlobal.get('@store1');

      lunarisGlobal.hook('deleted@store1', () => {
        done();
      });

      lunarisGlobal.hook('update@propagate', res => {
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

          return lunarisGlobal.delete('@store1', { _id : 1});
        }

        if (_nbCalled === 2) {
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
        }
      });
    });

    it('should propagate to a store object : INSERT', done => {
      var _store                = initStore('store1', null, null, ['propagate']);
      lunarisGlobal._stores['store1'] = _store;

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
      lunarisGlobal._stores['propagate'] = _storeToPropagate;

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.insert('@propagate', { id : 1 });

      var _nbCalled = 0;
      lunarisGlobal.hook('update@propagate', res => {
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

      lunarisGlobal.insert('@store1', [{ id : 1, label : 'A' }, { id : 2, label : 'B' }]);
    });

    it('should propagate to a store : INSERT', done => {
      var _store                = initStore('store1', null, null, ['propagate']);
      lunarisGlobal._stores['store1'] = _store;

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
      lunarisGlobal._stores['propagate'] = _storeToPropagate;

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.insert('@propagate', [{ id : 1 }, { id : 2 }]);

      var _nbCalled = 0;
      lunarisGlobal.hook('update@propagate', res => {
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

      lunarisGlobal.insert('@store1', [{ id : 1, label : 'A' }, { id : 2, label : 'B' }]);
    });

    it('should propagate to a store object : UPDATE', done => {
      var _nbCalled             = 0;
      var _store                = initStore('store1', null, null, ['propagate']);
      lunarisGlobal._stores['store1'] = _store;

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
      lunarisGlobal._stores['propagate'] = _storeToPropagate;

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });


      lunarisGlobal.hook('update@propagate', res => {
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

          return lunarisGlobal.update('@store1', { _id : 1, id : 1, label : 'A-1' });
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

      lunarisGlobal.insert('@propagate', { id : 1 });
      lunarisGlobal.insert('@store1', [{ id : 1, label : 'A' }, { id : 2, label : 'B' }]);
    });

    it('should propagate to a store : UPDATE', done => {
      var _store                = initStore('store1', null, null, ['propagate']);
      lunarisGlobal._stores['store1'] = _store;

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
      lunarisGlobal._stores['propagate'] = _storeToPropagate;

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.insert('@propagate', [{ id : 1 }, { id : 2 }]);
      lunarisGlobal.insert('@store1', [{ id : 1, label : 'A' }, { id : 2, label : 'B' }]);
      lunarisGlobal.update('@store1', { _id : 2, id : 2, label : 'B-2' });

      var _nbCalls = 0;
      lunarisGlobal.hook('update@propagate', (objects) => {
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
      lunarisGlobal._stores['store1'] = _store;
      var _store2               = initStore('store2', null, null, ['propagate']);
      _store2.isLocal           = true;
      lunarisGlobal._stores['store2'] = _store2;

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
      lunarisGlobal._stores['propagate'] = _storeToPropagate;

      lunarisGlobal.hook('errorHttp@store1', err => {
        done(err);
      });

      lunarisGlobal.hook('insert@propagate', (objects) => {
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
        lunarisGlobal.insert('@store2', { id : 1, label : 'A-2' });
      });

      lunarisGlobal.hook('update@propagate', (objects) => {
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

      lunarisGlobal.insert('@store1', { id : 1, label : 'A-1' });
      lunarisGlobal.insert('@propagate', [{ id : 1 }]);
    });

  });

  describe('References propagation', () => {

    it('should not propagate DELETE if the object is already referenced in one store', done => {
      var _storeDescriptor = [{
        id : ['<<int>>']
      }];
      var _store                = initStore('store1', _storeDescriptor, null, null, null, null, null, ['reference']);
      lunarisGlobal._stores['store1'] = _store;

      var _objectDescriptor     = {
        id          : ['<<int>>'],
        store1Value : ['object', {
          id : ['int', 'ref', '@store1']
        }]
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn : _schema.referencesFn,
        references   : { 'store1Value.id' : 'store1' },
        stores       : ['store1']
      });
      _storeToPropagate.isLocal        = true;
      _storeToPropagate.nameTranslated = '${reference}';
      _store.isLocal                   = true;
      lunarisGlobal._stores['reference'] = _storeToPropagate;

      lunarisGlobal.hook('error@store1', (error) => {
        should(error.data).not.ok();
        should(error.error).eql('${Cannot delete the value, it is still referenced in the store} ${reference}');
        should(lunarisGlobal.getOne('@store1', 1)).be.ok();
        done();
      });

      _store.data.add({ id : 20, label : 'B' });
      _storeToPropagate.data.add({ id : 1, store1Value : { id : 20 } });

      lunarisGlobal.delete('@store1', { _id : 1 });
    });


    it('should not propagate DELETE if the object is already referenced in one store : multiple stores', done => {
      var _storeMap = [{
        id : ['<<int>>']
      }];
      var _store                = initStore('store1', _storeMap, null, null, null, null, null, ['reference', 'reference2']);
      lunarisGlobal._stores['store1'] = _store;

      var _objectDescriptor     = {
        id           : ['<<int>>'],
        store1Values : ['array', {
          id : ['<<int>>', 'ref', '@store1']
        }]
      };
      var _schema           = schema.analyzeDescriptor(_objectDescriptor);
      var _storeToPropagate = initStore('reference', _objectDescriptor, null, null, null, null, {
        referencesFn : _schema.referencesFn,
        references   : { 'store1Values.id' : 'store1' },
        stores       : ['store1']
      });

      var _object2Descriptor = {
        id          : ['<<int>>'],
        store1Value : ['object', {
          id : ['int', 'ref', '@store1']
        }]
      };
      var _schema2           = schema.analyzeDescriptor(_object2Descriptor);
      var _storeToPropagate2 = initStore('reference2', _object2Descriptor, null, null, null, null, {
        referencesFn : _schema2.referencesFn,
        references   : { 'store1Value.id' : 'store1' },
        stores       : ['store1']
      });

      _storeToPropagate.isLocal     = true;
      _storeToPropagate2.isLocal    = true;
      _storeToPropagate.nameTranslated  = '${reference}';
      _storeToPropagate2.nameTranslated = '${reference2}';
      lunarisGlobal._stores['reference']  = _storeToPropagate;
      lunarisGlobal._stores['reference2'] = _storeToPropagate2;

      lunarisGlobal.hook('error@store1', (error) => {
        should(error.data).not.ok();
        should(error.error).eql('${Cannot delete the value, it is still referenced in the store} ${reference2}');
        should(lunarisGlobal.getOne('@store1', 1)).be.ok();
        done();
      });

      _store.data.add({ id : 20, label : 'B' });
      _storeToPropagate.data.add({ id : 1, store1Values : [{ id : 30 }] });
      _storeToPropagate.data.add({ id : 1, store1Values : [{ id : 30 }] });
      _storeToPropagate2.data.add({ id : 1, store1Value : { id : 20 } });


      lunarisGlobal.delete('@store1', { _id : 1 });
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

  server.get('/getObject/:id', (req, res) => {
    if (req.params.id === '0') {
      return res.json({ success : true, error : null, message : null, data : { id : 0 } });
    }
    if (req.params.id === '1') {
      return res.json({ success : true, error : null, message : null, data : { id : 1 } });
    }
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

  server.post('/store_insert_error', (req, res) => {
    res.json({ success : false, error : null, errors : [] });
  });

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

  server.get('/load', (req, res) => {
    if (req.query.limit === '3' && req.query.offset === '0') {
      res.json({
        success : true,
        error   : null,
        message : null,
        data    : [
          { id : 1, label : 'a', header : req.headers['is-offline'] ? 'ok' : 'nok' },
          { id : 2, label : 'b', header : req.headers['is-offline'] ? 'ok' : 'nok' },
          { id : 3, label : 'c', header : req.headers['is-offline'] ? 'ok' : 'nok' }
        ]
      });
    }

    res.json({
      success : true,
      error   : null,
      message : null,
      data    : [
        { id : 1, label : 'a', header : req.headers['is-offline'] ? 'ok' : 'nok' },
        { id : 2, label : 'b', header : req.headers['is-offline'] ? 'ok' : 'nok' },
        { id : 3, label : 'c', header : req.headers['is-offline'] ? 'ok' : 'nok' },
        { id : 4, label : 'd', header : req.headers['is-offline'] ? 'ok' : 'nok' },
        { id : 5, label : 'e', header : req.headers['is-offline'] ? 'ok' : 'nok' },
        { id : 6, label : 'f', header : req.headers['is-offline'] ? 'ok' : 'nok' }
      ]
    });
  });
  server.get('/load/label/:id', (req, res) => {
    res.json({
      success : true,
      error   : null,
      message : null,
      data    : [
        { id : 1, label : 'a', url : req.url }
      ]
    });
  });

  server = server.listen(port, callback);
}

function _stopServer (callback) {
  server.close(callback);
}


describe('lunarisGlobal hooks', () => {

  beforeEach(() => {
    for (var store in lunarisGlobal._stores) {
      delete lunarisGlobal._stores[store];
    }
    lastError = [];
  });

  it('hook() should be defined', () => {
    should(lunarisGlobal.hook).be.ok();
  });

  it('removeHook() should be defined', () => {
    should(lunarisGlobal.removeHook).be.ok();
  });

  describe('add hook', () => {
    it('should throw an error if the handler is not a function', () => {
      lunarisGlobal.hook('a');
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.hook:a');
      should(lastError[1]).eql(new Error('A handler must be a Function'));
    });

    it('should throw an error if the hook is not well configured', () => {
      lunarisGlobal.hook('a', function () {});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.hook:a');
      should(lastError[1]).eql(new Error('A hook must be: <event>@<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunarisGlobal.hook('get@store1', function () {});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.hook:get@store1');
      should(lastError[1]).eql(new Error('Cannot register hook "get@store1", store "store1" has not been defined!'));
    });

    it('should register the hook', () => {
      var _handler              = function () {};
      lunarisGlobal._stores['store1'] = { hooks : [] };
      lunarisGlobal.hook('get@store1', _handler);
      should(lunarisGlobal._stores['store1'].hooks).be.an.Array();
      should(lunarisGlobal._stores['store1'].hooks.get).have.length(1);
      should(lunarisGlobal._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunarisGlobal._stores['store1'].realHooks.get[0]).eql(_handler);
      delete lunarisGlobal._stores['store1'];
    });

    it('should register multiple handlers for a hook', () => {
      var _handler1             = function handler1 () {};
      var _handler2             = function handler2 () {};
      lunarisGlobal._stores['store1'] = { hooks : [] };
      lunarisGlobal.hook('get@store1', _handler1);
      lunarisGlobal.hook('get@store1', _handler2);
      should(lunarisGlobal._stores['store1'].hooks).be.an.Array();
      should(lunarisGlobal._stores['store1'].hooks.get).have.length(2);
      should(lunarisGlobal._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunarisGlobal._stores['store1'].realHooks.get[0]).eql(_handler1);
      should(lunarisGlobal._stores['store1'].hooks.get[1]).be.a.Function();
      should(lunarisGlobal._stores['store1'].realHooks.get[1]).eql(_handler2);
      delete lunarisGlobal._stores['store1'];
    });

    it('should not register multiple handlers for a hook if isUnique option is active', () => {
      var _handler1 = function handler1 () {};
      lunarisGlobal._stores['store1'] = { hooks : [] };
      lunarisGlobal.hook('get@store1', _handler1, true);
      lunarisGlobal.hook('get@store1', _handler1, true);
      should(lunarisGlobal._stores['store1'].hooks).be.an.Array();
      should(lunarisGlobal._stores['store1'].hooks.get).have.length(1);
      should(lunarisGlobal._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunarisGlobal._stores['store1'].realHooks.get[0]).eql(_handler1);
      delete lunarisGlobal._stores['store1'];
    });
  });

  describe('remove hook', () => {
    it('should throw an error if the handler is not a function', () => {
      lunarisGlobal._stores['store1'] = { hooks : [] };
      lunarisGlobal.hook('get@store1', function () {});
      lunarisGlobal.removeHook('get@store');

      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.removeHook:get@store');
      should(lastError[1]).eql(new Error('A handler must be a Function'));
    });

    it('should throw an error if the hook is not well configured', () => {
      lunarisGlobal._stores['store1'] = { hooks : [] };
      lunarisGlobal.hook('get@store1', function () {});
      lunarisGlobal.removeHook('a', function () {});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.removeHook:a');
      should(lastError[1]).eql(new Error('A hook must be: <event>@<store>'));
    });

    it('should throw an error if the store is not defined', () => {
      lunarisGlobal.removeHook('get@store1', function () {});
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] lunaris.removeHook:get@store1');
      should(lastError[1]).eql(new Error('Cannot remove hook "get@store1", store "store1" has not been defined!'));
    });

    it('should remove a hook', () => {
      var _handler              = function () {};
      lunarisGlobal._stores['store1'] = { hooks : [] };
      lunarisGlobal.hook('get@store1', _handler);
      should(lunarisGlobal._stores['store1'].hooks).be.an.Array();
      should(lunarisGlobal._stores['store1'].hooks.get).have.length(1);
      should(lunarisGlobal._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunarisGlobal._stores['store1'].realHooks.get[0]).eql(_handler);
      lunarisGlobal.removeHook('get@store1', _handler);
      should(lunarisGlobal._stores['store1'].hooks).be.an.Array();
      should(lunarisGlobal._stores['store1'].hooks.get).have.length(0);
      delete lunarisGlobal._stores['store1'];
    });

    it('should remove one handler from a list of handlers', () => {
      var _handler1             = function handler1 () {};
      var _handler2             = function handler2 () {};
      lunarisGlobal._stores['store1'] = { hooks : [] };
      lunarisGlobal.hook('get@store1', _handler1);
      lunarisGlobal.hook('get@store1', _handler2);
      should(lunarisGlobal._stores['store1'].hooks).be.an.Array();
      should(lunarisGlobal._stores['store1'].hooks.get).have.length(2);
      should(lunarisGlobal._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunarisGlobal._stores['store1'].realHooks.get[0]).eql(_handler1);
      should(lunarisGlobal._stores['store1'].hooks.get[1]).be.a.Function();
      should(lunarisGlobal._stores['store1'].realHooks.get[1]).eql(_handler2);
      lunarisGlobal.removeHook('get@store1', _handler1);
      should(lunarisGlobal._stores['store1'].hooks).be.an.Array();
      should(lunarisGlobal._stores['store1'].hooks.get).have.length(1);
      should(lunarisGlobal._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunarisGlobal._stores['store1'].realHooks.get[0]).eql(_handler2);
      delete lunarisGlobal._stores['store1'];
    });

    it('should remove one handler from a list of handlers', () => {
      var _handler1             = function handler1 () {};
      var _handler2             = function handler1 () {};
      lunarisGlobal._stores['store1'] = { hooks : [] };
      lunarisGlobal.hook('get@store1', _handler1);
      lunarisGlobal.hook('get@store1', _handler2);
      should(lunarisGlobal._stores['store1'].hooks).be.an.Array();
      should(lunarisGlobal._stores['store1'].hooks.get).have.length(2);
      should(lunarisGlobal._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunarisGlobal._stores['store1'].realHooks.get[0]).eql(_handler1);
      should(lunarisGlobal._stores['store1'].hooks.get[1]).be.a.Function();
      should(lunarisGlobal._stores['store1'].realHooks.get[1]).eql(_handler2);
      lunarisGlobal.removeHook('get@store1', _handler1);
      should(lunarisGlobal._stores['store1'].hooks).be.an.Array();
      should(lunarisGlobal._stores['store1'].hooks.get).have.length(1);
      should(lunarisGlobal._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunarisGlobal._stores['store1'].realHooks.get[0]).eql(_handler2);
      delete lunarisGlobal._stores['store1'];
    });

    it('should remove all handlers of one store', () => {
      var _handler1             = function handler1 () {};
      var _handler2             = function handler1 () {};
      lunarisGlobal._stores['store1'] = { hooks : {} };
      lunarisGlobal.hook('get@store1', _handler1);
      lunarisGlobal.hook('get@store1', _handler2);
      should(lunarisGlobal._stores['store1'].hooks.get).be.an.Array().and.have.lengthOf(2);
      lunarisGlobal._removeAllHooks();
      should(lunarisGlobal._stores['store1'].hooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store1'].realHooks.get).be.an.Array().and.have.lengthOf(0);
      delete lunarisGlobal._stores['store1'];
    });

    it('should remove all handlers of multiple stores', () => {
      var _handler1             = function handler1 () {};
      var _handler2             = function handler1 () {};
      lunarisGlobal._stores['store1'] = { hooks : {} };
      lunarisGlobal._stores['store2'] = { hooks : {} };
      lunarisGlobal._stores['store3'] = { hooks : {} };
      lunarisGlobal.hook('get@store1', _handler1);
      lunarisGlobal.hook('get@store1', _handler2);
      lunarisGlobal.hook('get@store2', _handler1);
      lunarisGlobal.hook('get@store3', _handler1);
      lunarisGlobal.hook('get@store3', _handler2);
      should(lunarisGlobal._stores['store1'].hooks.get).be.an.Array().and.have.lengthOf(2);
      should(lunarisGlobal._stores['store2'].hooks.get).be.an.Array().and.have.lengthOf(1);
      should(lunarisGlobal._stores['store3'].hooks.get).be.an.Array().and.have.lengthOf(2);
      lunarisGlobal._removeAllHooks();
      should(lunarisGlobal._stores['store1'].hooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store1'].realHooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store2'].hooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store2'].realHooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store3'].hooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store3'].realHooks.get).be.an.Array().and.have.lengthOf(0);
      delete lunarisGlobal._stores['store1'];
      delete lunarisGlobal._stores['store2'];
      delete lunarisGlobal._stores['store3'];
    });

    it('should remove all handlers of multiple stores : extended', () => {
      var _handler1             = function handler1 () {};
      var _handler2             = function handler1 () {};
      lunarisGlobal._stores['store1'] = { hooks : {} };
      lunarisGlobal._stores['store2'] = { hooks : {} };
      lunarisGlobal._stores['store3'] = { hooks : {} };
      lunarisGlobal.hook('get@store1', _handler1);
      lunarisGlobal.hook('get@store1', _handler2);
      lunarisGlobal.hook('update@store1', _handler2);
      lunarisGlobal.hook('get@store2', _handler1);
      lunarisGlobal.hook('get@store3', _handler1);
      lunarisGlobal.hook('get@store3', _handler2);
      lunarisGlobal.hook('del@store3', _handler2);
      lunarisGlobal.hook('error@store3', _handler2);
      lunarisGlobal.hook('error@store3', _handler1);
      should(lunarisGlobal._stores['store1'].hooks.get).be.an.Array().and.have.lengthOf(2);
      should(lunarisGlobal._stores['store1'].hooks.update).be.an.Array().and.have.lengthOf(1);
      should(lunarisGlobal._stores['store2'].hooks.get).be.an.Array().and.have.lengthOf(1);
      should(lunarisGlobal._stores['store3'].hooks.get).be.an.Array().and.have.lengthOf(2);
      should(lunarisGlobal._stores['store3'].hooks.del).be.an.Array().and.have.lengthOf(1);
      should(lunarisGlobal._stores['store3'].hooks.error).be.an.Array().and.have.lengthOf(2);
      lunarisGlobal._removeAllHooks();
      should(lunarisGlobal._stores['store1'].hooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store1'].hooks.update).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store2'].hooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store3'].hooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store3'].hooks.del).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store3'].hooks.error).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store1'].realHooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store1'].realHooks.update).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store2'].realHooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store3'].realHooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store3'].realHooks.del).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store3'].realHooks.error).be.an.Array().and.have.lengthOf(0);
      delete lunarisGlobal._stores['store1'];
      delete lunarisGlobal._stores['store2'];
      delete lunarisGlobal._stores['store3'];
    });

    it('should not remove internal hooks', () => {
      var _handler1             = function handler1 () {};
      var _handler2             = function handler1 () {};
      lunarisGlobal._stores['store1'] = { hooks : {} };
      lunarisGlobal._stores['store2'] = { hooks : {} };
      lunarisGlobal._stores['store3'] = { hooks : {} };
      lunarisGlobal.hook('get@store1', _handler1, false, true);
      lunarisGlobal.hook('get@store1', _handler2);
      lunarisGlobal.hook('update@store1', _handler2);
      lunarisGlobal.hook('get@store2', _handler1);
      lunarisGlobal.hook('get@store3', _handler1, false, true);
      lunarisGlobal.hook('get@store3', _handler2);
      lunarisGlobal.hook('del@store3', _handler2);
      lunarisGlobal.hook('error@store3', _handler2, false, true);
      lunarisGlobal.hook('error@store3', _handler1, false, true);
      should(lunarisGlobal._stores['store1'].hooks.get).be.an.Array().and.have.lengthOf(2);
      should(lunarisGlobal._stores['store1'].hooks.update).be.an.Array().and.have.lengthOf(1);
      should(lunarisGlobal._stores['store2'].hooks.get).be.an.Array().and.have.lengthOf(1);
      should(lunarisGlobal._stores['store3'].hooks.get).be.an.Array().and.have.lengthOf(2);
      should(lunarisGlobal._stores['store3'].hooks.del).be.an.Array().and.have.lengthOf(1);
      should(lunarisGlobal._stores['store3'].hooks.error).be.an.Array().and.have.lengthOf(2);
      lunarisGlobal._removeAllHooks();
      should(lunarisGlobal._stores['store1'].hooks.get).be.an.Array().and.have.lengthOf(1);
      should(lunarisGlobal._stores['store1'].hooks.update).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store2'].hooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store3'].hooks.get).be.an.Array().and.have.lengthOf(1);
      should(lunarisGlobal._stores['store3'].hooks.del).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store3'].hooks.error).be.an.Array().and.have.lengthOf(2);
      should(lunarisGlobal._stores['store1'].realHooks.get).be.an.Array().and.have.lengthOf(1);
      should(lunarisGlobal._stores['store1'].realHooks.update).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store2'].realHooks.get).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store3'].realHooks.get).be.an.Array().and.have.lengthOf(1);
      should(lunarisGlobal._stores['store3'].realHooks.del).be.an.Array().and.have.lengthOf(0);
      should(lunarisGlobal._stores['store3'].realHooks.error).be.an.Array().and.have.lengthOf(2);
      delete lunarisGlobal._stores['store1'];
      delete lunarisGlobal._stores['store2'];
      delete lunarisGlobal._stores['store3'];
    });
  });
});
