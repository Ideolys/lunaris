const testUtils    = require('./testUtils');
const initStore    = testUtils.initStore;
const collection   = require('../src/store/store.collection');
const buildLunaris = require('../lib/builder').buildLunaris;
const express      = require('express');
const bodyParser   = require('body-parser');
const fetch        = require('node-fetch');
const compression  = require('compression');
const dayjs        = require('dayjs');

const window = {};

const port    = 4040;

var lastError = [];
console.error = function () {
  lastError = [arguments[0], arguments[1]];
};

var lunaris = {};
eval(buildLunaris({
  BASE_URL      : "'http://localhost:" + port + "'",
  IS_PRODUCTION : false
}));
let server  = express();
lunaris._stores.lunarisErrors.data = collection.collection();

var nbCallsPagination2 = 0;

describe('lunaris store', () => {

  before(done => {
    _startServer(done);
  });

  beforeEach(() => {
    lastError = [];
    lunaris._stores.lunarisErrors.data.clear();
    collection.resetVersionNumber();
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
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A', _version : [1] });
    });

    it('should insert the value and execute the hooks : insert & inserted', done => {
      var _isFirstInsertEvent                   = true;
      var _isUpdateHook                         = false;
      var _isUpdatedHook                        = false;
      var _store                                = initStore('store1');
      var _expectedValue                        = { _id : 1, id : 2, label : 'A', _version : [1] };
      lunaris._stores['store1']                 = _store;
      lunaris._stores['store1'].primaryKey      = 'id';
      lunaris._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunaris.hook('insert@store1', updatedValue => {
        if (_isFirstInsertEvent) {
          should(updatedValue).eql(_expectedValue);
          should(Object.isFrozen(updatedValue)).eql(true);
          return _isFirstInsertEvent = false;
        }
      });

      lunaris.hook('update@store1', updatedValue => {
        _isUpdateHook = true;
      });

      lunaris.hook('inserted@store1', (data, message) => {
        _isUpdatedHook = true;
        should(data).eql(Object.assign(_expectedValue, {
          body     : { _id : 1, id : 2, label : 'A', _version : [ 1 ] },
          query    : {},
          params   : {},
          _version : [2]
        }));
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
      var _expectedValue                   = { _id : 1, id : 2, label : 'A', _version : [1] };
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
        should(err).eql('404 : Not Found');
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
          _id                : 1,
          _version           : [2],
          version            : 1,
          data               : { _id : 1, id : 2, label : 'A', _version : [1] },
          url                : '/store_insert_post',
          method             : 'POST',
          storeName          : 'store_insert_post',
          messageError       : '404 : Not Found',
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
      should(lastError[1]).eql({ error : 'must be a string', field : 'label', value : 1});
    });

    it('should update a value', () => {
      var _store = initStore('store1');
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A', _version : [1] });
      lunaris.update('@store1', { _id : 1, id : 1, label : 'B'});
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'B', _version : [2] });
    });

    it('should update the value and execute the hooks : update and updated', done => {
      var _isFirstUpdateEvent   = true;
      var _isUpdateHook         = false;
      var _isUpdatedHook        = false;
      var _store                = initStore('store1');
      var _expectedValue        = { _id : 1, id : 1, label : 'B', _version : [2] };
      lunaris._stores['store1'] = _store;
      lunaris._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunaris.hook('update@store1', updatedValue => {
        _isUpdateHook = true;
        if (_isFirstUpdateEvent) {
          should(_store.data.get(1)).eql(_expectedValue);
          should(updatedValue).eql(_expectedValue);
          should(Object.isFrozen(updatedValue)).eql(true);
          _isFirstUpdateEvent = false;
          return;
        }
      });

      lunaris.hook('updated@store1', (data, message) => {
        _isUpdatedHook = true;
        should(data).eql(Object.assign(_expectedValue, {
          body     : { _id : 1, id : 1, label : 'B', _version : [ 2 ] },
          query    : {},
          params   : { id : '1' },
          _version : [4]
        }));

        should(message).eql('${the} store1 has been successfully ${edited}');

        if (_isUpdateHook && _isUpdatedHook) {
          done();
        }
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunaris.insert('@store1', { id : 1, label : 'A' });
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
        should(err).eql('404 : Not Found');
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
        should(lastError[1]).eql({ error : 'must be a string', field : 'label', value : 2});
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
        should(lunaris._stores['storeObject'].data.getAll()).eql([{
          _id      : 1,
          id       : 1,
          label    : 'string',
          _version : [2]
        }]);
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
          _id                : 1,
          _version           : [4],
          version            : 3,
          data               : { _id : 1, id : 1, label : 'B', _version : [3] },
          url                : '/store_insert_put/1',
          method             : 'PUT',
          storeName          : 'store_insert_put',
          messageError       : '404 : Not Found',
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
      var _expectedValue        = { _id : 1, id : 1, label : 'A', _version : [3] };
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
        operator        : ['=']
      });
      lunaris._stores['store1'].filters.push({
        source          : '@optional',
        sourceAttribute : 'site',
        localAttribute  : 'site'
      });

      lunaris.hook('inserted@store1', data => {
        _isInsertedHook = true;
        should(data.query).be.ok();
        should(data.params).be.ok();
        should(data.params).eql({ idSite : '2' });
        should(data.query).eql({ search : 'category:=A' });
        lunaris.update('@store1', _expectedValue);
        should(data.body).be.ok();
        should(data.body).eql(_expectedValue);
      });

      lunaris.hook('updated@store1', data => {
        _isUpdatedHook = true;
        should(data.query).be.ok();
        should(data.params).be.ok();
        should(data.params).eql({ id : '1', idSite : '2' });
        should(data.query).eql({ search : 'category:=A' });
        should(data.body).be.ok();
        should(data.body).eql({ _id : 1, id : 1, label : 'A', _version : [5] });

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
      var _expectedValue        = { _id : 1, id : 1, label : 'A', _version : [3] };
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
        should(data.query).be.ok();
        should(data.params).be.ok();
        should(data.params).eql({});
        should(data.query).eql({});
        should(data.body).be.ok();
        should(data.body).eql(_expectedValue);
        lunaris.update('@store1', _expectedValue);
      });

      lunaris.hook('updated@store1', data => {
        _isUpdatedHook = true;
        should(data.query).be.ok();
        should(data.params).be.ok();
        should(data.params).eql({ id : '1'});
        should(data.query).eql({});
        should(data.body).be.ok();
        should(data.body).eql({ _id : 1, id : 1, label : 'A', _version : [5] });

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
      var _isInsertedHook       = false;
      var _isUpdatedHook        = false;
      var _store                = initStore('store1');
      var _expectedValue        = { _id : 1, id : 1, label : 'A', _version : [3] };
      lunaris._stores['required'] = initStore('required');
      lunaris._stores['required'].data.add({
        site : 2
      });

      lunaris._stores['optional'] = initStore('optional');
      lunaris._stores['optional'].data.add({
        category : 'A'
      });
      lunaris._stores['store1'] = _store;
      lunaris._stores['store1'].fakeAttributes = ['site'];
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
        httpMethods     : ['PUT']
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
        should(data.body).eql({ _id : 1, id : 1, label : 'A', _version : [5] });

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

  describe('mass insert() / update()', () => {

    it('should insert the values', () => {
      var _store = initStore('mass');
      lunaris._stores['mass'] = _store;
      lunaris.insert('@mass', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);

      should(_store.data._getAll()).eql([
        { _id : 1, id : 1, label : 'A', _version : [1] },
        { _id : 2, id : 2, label : 'B', _version : [1] }
      ]);
    });

    it('should insert the value and execute the hooks : insert & inserted', done => {
      var _isFirstInsertEvent                   = true;
      var _isUpdateHook                         = false;
      var _isUpdatedHook                        = false;
      var _store                                = initStore('mass');
      lunaris._stores['mass']                 = _store;
      lunaris._stores['mass'].primaryKey      = 'id';
      lunaris._stores['mass'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunaris.hook('insert@mass', updatedValue => {
        if (_isFirstInsertEvent) {
          should(updatedValue).be.an.Array();
          should(updatedValue).eql([
            { _id : 1, id : 1, label : 'A', _version : [1] },
            { _id : 2, id : 2, label : 'B', _version : [1] }
          ]);

          for (var i = 0; i < updatedValue.length; i++) {
            should(Object.isFrozen(updatedValue[i])).eql(true);
          }
          return _isFirstInsertEvent = false;
        }
      });

      lunaris.hook('update@mass', updatedValue => {
        _isUpdateHook = true;
      });

      lunaris.hook('inserted@mass', (data, message) => {
        _isUpdatedHook = true;
        should(data).be.an.Array();
        should(data).eql([
          { _id : 1, id : 1, label : 'A', post : true, _version : [2] },
          { _id : 2, id : 2, label : 'B', post : true, _version : [2] }
        ]);

        for (var i = 0; i < data.length; i++) {
          should(Object.isFrozen(data[i])).eql(true);
        }
        should(message).eql('${the} mass has been successfully ${created}');

        if (_isUpdateHook && _isUpdatedHook) {
          done();
        }
      });

      lunaris.hook('errorHttp@mass', (err) => {
        done(err);
      });


      lunaris.insert('@mass', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
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
        should(err).eql('404 : Not Found');
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
          _id                : 1,
          _version           : [2],
          version            : 1,
          data               : [{ _id : 1, id : 1, label : 'A', _version : [1] }, { _id : 2, id : 2, label : 'B', _version : [1] }],
          url                : '/store_insert_post',
          method             : 'POST',
          storeName          : 'store_insert_post',
          messageError       : '404 : Not Found',
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
      should(lastError[1]).eql({ error : 'must be a string', field : 'label', value : 1});
    });

    it('should update a value', () => {
      var _store = initStore('mass');
      lunaris._stores['mass'] = _store;
      lunaris.insert('@mass', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
      lunaris.update('@mass', [
        { _id : 1, id : 1, label : 'A-1' },
        { _id : 2, id : 2, label : 'B-1' }
      ]);
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A-1', _version : [2] });
      should(_store.data.get(2)).eql({ _id : 2, id : 2, label : 'B-1', _version : [2] });
    });

    it('should update the value and execute the hooks : update and updated', done => {
      var _isFirstUpdateEvent = true;
      var _isUpdateHook       = false;
      var _isUpdatedHook      = false;
      var _store              = initStore('mass');
      lunaris._stores['mass'] = _store;
      lunaris._stores['mass'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunaris.hook('update@mass', updatedValue => {
        _isUpdateHook = true;
        if (_isFirstUpdateEvent) {
          should(updatedValue).be.an.Array();
          should(updatedValue).eql([
            { _id : 1, id : 1, label : 'A-1', _version : [2] },
            { _id : 2, id : 2, label : 'B-1', _version : [2] }
          ]);

          for (var i = 0; i < updatedValue.length; i++) {
            should(Object.isFrozen(updatedValue[i])).eql(true);
          }
          _isFirstUpdateEvent = false;
          return;
        }
      });

      lunaris.hook('updated@mass', (data, message) => {
        _isUpdatedHook = true;
        should(data).eql([
          { _id : 1, id : 1, label : 'A-1', put : true, _version : [4] },
          { _id : 2, id : 2, label : 'B-1', put : true, _version : [4] }
        ]);

        should(message).eql('${the} mass has been successfully ${edited}');

        if (_isUpdateHook && _isUpdatedHook) {
          done();
        }
      });

      lunaris.hook('errorHttp@mass', (err) => {
        done(err);
      });

      lunaris.insert('@mass', [
        { id : 1, label : 'A' },
        { id : 2, label : 'B' }
      ]);
      lunaris.update('@mass', [
        { _id : 1, id : 1, label : 'A-1' },
        { _id : 2, id : 2, label : 'B-1' }
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
        should(err).eql('404 : Not Found');
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
        should(lastError[1]).eql({ error : 'must be a string', field : 'label', value : 2});
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
        should(lastError[1]).eql({ error : 'must be an integer', field : 'id', value : null});
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
          _id                : 1,
          _version           : [4],
          version            : 3,
          data               : [{ _id : 1, id : 1, label : 'A', _version : [3] }, { _id : 2, id : 2, label : 'B', _version : [3] }],
          url                : '/store_insert_put',
          method             : 'PUT',
          storeName          : 'store_insert_put',
          messageError       : '404 : Not Found',
          messageErrorServer : { error : 404, message : 'Not Found'},
        });
        done();
      });

      lunaris.insert('@store_insert_put', [{ id : 1 }, { id : 2 }]);
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
      var _value = { _id : 1, id : 1, label : 'A', _version : [1] };

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
        should(err).eql('404 : Not Found');
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
          _id                : 1,
          _version           : [3],
          version            : 2,
          data               : { _id : 1, id : 1, _version : [1, 2]},
          url                : '/store_del/1',
          method             : 'DELETE',
          storeName          : 'store_del',
          messageError       : '404 : Not Found',
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
      var _expectedValue                   = { _id : 1, id : 2, label : 'A', _version : [1] };
      lunaris._stores['store1']            = _store;
      lunaris._stores['store1'].primaryKey = 'id';
      lunaris._stores['store1'].successTemplate = '$pronounMale $storeName has been successfully $method';

      lunaris.hook('delete@store1', () => {
        _isDeleteHook = true;
      });

      lunaris.hook('deleted@store1', (data, message) => {
        _isDeletedHook = true;
        should(data.query).be.ok();
        should(data.params).be.ok();
        should(data.query).eql({});
        should(data.params).eql({ id : '2' });

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

    it('should delete the value and execute the hook deleted', done => {
      var _isDeleteHook                    = false;
      var _isDeletedHook                   = false;
      var _store                           = initStore('store1');
      var _expectedValue                   = { _id : 1, id : 2, label : 'A', _version : [1] };
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
      var _expectedValue        = { _id : 1, id : 1, label : 'A', _version : [1] };
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
        { _id : 1, id : 1, label : 'A', _version : [1] },
        { _id : 2, id : 2, label : 'B', _version : [2] }
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
        { _id : 2, id : 2, label : 'B', _version : [2] }
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
          { _id : 1, id : 20, label : 'B', _version : [1] },
          { _id : 2, id : 30, label : 'D', _version : [1] },
          { _id : 3, id : 10, label : 'E', _version : [1] }
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
          { _id : 1, id : 1, _version : [1] },
          { _id : 2, id : 2, _version : [2] }
        ]);
        done();
      });

      lunaris.hook('errorHttp@store1', err => {
        done(err);
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
        should(items).eql({_id : 1, id : 1, _version : [1]});
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
        should(err).eql('404 : Not Found');
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
          _id                : 1,
          _version           : [1],
          version            : null,
          data               : null,
          url                : '/store?limit=50&offset=0',
          method             : 'GET',
          storeName          : 'store',
          messageError       : '404 : Not Found',
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
        should(err).eql('Error : null');
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
            { _id : 1, id : 20, label : 'B', _version : [1] },
            { _id : 2, id : 30, label : 'D', _version : [1] },
            { _id : 3, id : 10, label : 'E', _version : [1] }
          ]);
          for (var i = 0; i < items.length; i++) {
            should(Object.isFrozen(items[i])).eql(true);
          }
          lunaris.get('@pagination');
          return;
        }
        if (_nbPages === 2) {
          should(items).eql([
            { _id : 4, id : 40, label : 'A', _version : [2] },
            { _id : 5, id : 50, label : 'C', _version : [2] },
            { _id : 6, id : 60, label : 'F', _version : [2] }
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

    it('should filter the store by a required filter', done => {
      var _isFirstCall = true;
      lunaris._stores['required.param.site']         = initStore('required.param.site');
      lunaris._stores['required.param.site'].isLocal = true;
      lunaris._stores['required.param.site'].data.add({
        site : 1
      });
      lunaris._stores['required']                = initStore('required');
      lunaris._stores['required'].fakeAttributes = ['site'];
      lunaris._stores['required'].filters.push({
        source          : '@required.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      });

      lunaris.hook('get@required', items => {
        if (_isFirstCall) {
          should(items).eql([
            { _id : 1, id : 1, _version : [2] },
            { _id : 2, id : 2, _version : [2] },
            { _id : 3, id : 3, _version : [2] }
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
          { _id : 4, id : 4, _version : [4] },
          { _id : 5, id : 5, _version : [4] },
          { _id : 6, id : 6, _version : [4] }
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
      lunaris._stores['required']                = initStore('required');
      lunaris._stores['required'].fakeAttributes = ['site'];
      lunaris._stores['required'].filters.push({
        source          : '@required.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true
      });

      lunaris.hook('get@required', items => {
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
      var _nbPages                             = 0;
      lunaris._stores['pagination2.param.site'] = initStore('pagination2.param.site');
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

      lunaris.hook('update@pagination2.param.site', () => {
        lunaris._stores['pagination2'].paginationCurrentPage = 1;
        lunaris._stores['pagination2'].paginationOffset      = 0;
      });

      lunaris.hook('get@pagination2', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _id : 1, id : 20, label : 'B', _version : [2] },
            { _id : 2, id : 30, label : 'D', _version : [2] },
            { _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunaris.get('@pagination2');
          return;
        }
        if (_nbPages === 2) {
          should(items).eql([
            { _id : 4, id : 40, label : 'A', _version : [3] },
            { _id : 5, id : 50, label : 'C', _version : [3] },
            { _id : 6, id : 60, label : 'F', _version : [3] }
          ]);
          lunaris.update('@pagination2.param.site', {
            _id  : 1,
            site : 2
          });
          lunaris.get('@pagination2');
          return;
        }

        should(items).eql([
          { _id : 7, id : 70, label : 'G', _version : [6] },
          { _id : 8, id : 80, label : 'H', _version : [6] },
          { _id : 9, id : 90, label : 'I', _version : [6] }
        ]);

        done();
      });

      lunaris.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunaris.get('@pagination2');
    });

    it('should filter the store by an optional filter', done => {
      lunaris._stores['optional.param.site'] = initStore('optional.param.site');
      lunaris._stores['optional.param.site'].data.add({
        id : 1
      });
      lunaris._stores['optional'] = initStore('optional');
      lunaris._stores['optional'].filters.push({
        source          : '@optional.param.site',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      });

      lunaris.hook('get@optional', items => {
        should(items).eql([
          { _id : 1, limit : '50', offset : '0', search : 'id:=1', _version : [2]}
        ]);

        done();
      });

      lunaris.hook('errorHttp@optional', err => {
        done(err);
      });

      lunaris.get('@optional');
    });

    it('should filter the store by two optional filters', done => {
      lunaris._stores['optional.param.site'] = initStore('optional.param.site');
      lunaris._stores['optional.param.site'].data.add({
        id : 1
      });
      lunaris._stores['optional.param.category'] = initStore('optional.param.category');
      lunaris._stores['optional.param.category'].data.add({
        id : 2
      });
      lunaris._stores['optional'] = initStore('optional');
      lunaris._stores['optional'].filters.push({
        source          : '@optional.param.site',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      });
      lunaris._stores['optional'].filters.push({
        source          : '@optional.param.category',
        sourceAttribute : 'id',
        localAttribute  : 'category',
        operator        : '='
      });

      lunaris.hook('get@optional', items => {
        should(items).eql([
          { _id : 1, limit : '50', offset : '0', search : 'id:=1+category:=2', _version : [3]}
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
      lunaris._stores['optional']                = initStore('optional');
      lunaris._stores['optional'].fakeAttributes = ['site'];
      lunaris._stores['optional'].filters.push({
        source          : '@optional.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
      });

      lunaris.hook('get@optional', items => {
        should(items).eql([
          { _id : 1, limit : '50', offset : '0', _version : [1]}
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
          should(item).eql({
            _id      : 1,
            id       : 1,
            _version : [1]
          });
          _currentId++;
          lunaris.get('@get', _currentId);
          return;
        }

        should(item).eql({
          _id      : 2,
          id       : 2,
          _version : [2]
        });

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
      lunaris._stores['methods']                = initStore('methods');
      lunaris._stores['methods'].fakeAttributes = ['site'];
      lunaris._stores['methods'].filters.push({
        source          : '@required.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
        isRequired      : true,
        httpMethods     : ['POST']
      });

      lunaris.hook('get@methods', data => {
        should(data.query).be.ok();
        should(data.params).be.ok();
        should(data.query).eql({ limit : '50', offset : '0' });
        should(data.params).eql({});
        should(data.body).be.ok();
        should(data.body).eql({});
        done();
      });

      lunaris.hook('errorHttp@methods', err => {
        done(err);
      });

      lunaris.get('@methods');
    });

    describe('search', () => {
      it('should filter the store by an "=" filter', done => {
        lunaris._stores['optional.param.site'] = initStore('optional.param.site');
        lunaris._stores['optional.param.site'].data.add({
          id : 1
        });
        lunaris._stores['optional'] = initStore('optional');
        lunaris._stores['optional'].filters.push({
          source          : '@optional.param.site',
          sourceAttribute : 'id',
          localAttribute  : 'id',
          operator        : '='
        });

        lunaris.hook('get@optional', items => {
          should(items).eql([
            { _id : 1, limit : '50', offset : '0', search : 'id:=1', _version : [2]}
          ]);

          done();
        });

        lunaris.hook('errorHttp@optional', err => {
          done(err);
        });

        lunaris.get('@optional');
      });

      it('should filter the store by an "ILIKE" filter', done => {
        lunaris._stores['optional.param.site'] = initStore('optional.param.site');
        lunaris._stores['optional.param.site'].data.add({
          id : 1
        });
        lunaris._stores['optional'] = initStore('optional');
        lunaris._stores['optional'].filters.push({
          source          : '@optional.param.site',
          sourceAttribute : 'id',
          localAttribute  : 'id',
          operator        : 'ILIKE'
        });

        lunaris.hook('get@optional', items => {
          should(items).eql([
            { _id : 1, limit : '50', offset : '0', search : 'id:1', _version : [2]}
          ]);

          done();
        });

        lunaris.hook('errorHttp@optional', err => {
          done(err);
        });

        lunaris.get('@optional');
      });

      it('should filter the store by an ">" filter', done => {
        lunaris._stores['optional.param.site'] = initStore('optional.param.site');
        lunaris._stores['optional.param.site'].data.add({
          id : 1
        });
        lunaris._stores['optional'] = initStore('optional');
        lunaris._stores['optional'].filters.push({
          source          : '@optional.param.site',
          sourceAttribute : 'id',
          localAttribute  : 'id',
          operator        : '>'
        });

        lunaris.hook('get@optional', items => {
          should(items).eql([
            { _id : 1, limit : '50', offset : '0', search : 'id:>1', _version : [2]}
          ]);

          done();
        });

        lunaris.hook('errorHttp@optional', err => {
          done(err);
        });

        lunaris.get('@optional');
      });

      it('should filter the store by an ">=" filter', done => {
        lunaris._stores['optional.param.site'] = initStore('optional.param.site');
        lunaris._stores['optional.param.site'].data.add({
          id : 1
        });
        lunaris._stores['optional'] = initStore('optional');
        lunaris._stores['optional'].filters.push({
          source          : '@optional.param.site',
          sourceAttribute : 'id',
          localAttribute  : 'id',
          operator        : '>='
        });

        lunaris.hook('get@optional', items => {
          should(items).eql([
            { _id : 1, limit : '50', offset : '0', search : 'id:>=1', _version : [2]}
          ]);

          done();
        });

        lunaris.hook('errorHttp@optional', err => {
          done(err);
        });

        lunaris.get('@optional');
      });

      it('should filter the store by an "<" filter', done => {
        lunaris._stores['optional.param.site'] = initStore('optional.param.site');
        lunaris._stores['optional.param.site'].data.add({
          id : 1
        });
        lunaris._stores['optional'] = initStore('optional');
        lunaris._stores['optional'].filters.push({
          source          : '@optional.param.site',
          sourceAttribute : 'id',
          localAttribute  : 'id',
          operator        : '<'
        });

        lunaris.hook('get@optional', items => {
          should(items).eql([
            { _id : 1, limit : '50', offset : '0', search : 'id:<1', _version : [2]}
          ]);

          done();
        });

        lunaris.hook('errorHttp@optional', err => {
          done(err);
        });

        lunaris.get('@optional');
      });

      it('should filter the store by an "<=" filter', done => {
        lunaris._stores['optional.param.site'] = initStore('optional.param.site');
        lunaris._stores['optional.param.site'].data.add({
          id : 1
        });
        lunaris._stores['optional'] = initStore('optional');
        lunaris._stores['optional'].filters.push({
          source          : '@optional.param.site',
          sourceAttribute : 'id',
          localAttribute  : 'id',
          operator        : '<='
        });

        lunaris.hook('get@optional', items => {
          should(items).eql([
            { _id : 1, limit : '50', offset : '0', search : 'id:<=1', _version : [2]}
          ]);

          done();
        });

        lunaris.hook('errorHttp@optional', err => {
          done(err);
        });

        lunaris.get('@optional');
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
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A', _version : [1] });
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
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A', _version : [1] });

      lunaris.hook('reset@store1', () => {
        _hasFiredHook = true;
      });

      lunaris.clear('@store1', true);
      setTimeout(() => {
        should(_hasFiredHook).eql(false);
        done();
      }, 200);
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
      var _nbExecuted = 0;
      var _store                                      = initStore('store_insert_post');
      lunaris._stores['store_insert_post']            = _store;
      lunaris._stores['store_insert_post'].primaryKey = 'id';

      lunaris.hook('errorHttp@store_insert_post', () => {
        var _values = lunaris._stores.lunarisErrors.data.getAll();
        _nbExecuted++;
        if (_nbExecuted === 1) {
          should(_values).have.lengthOf(1);
          delete _values[0].date;
          should(_values[0]).eql({
            _id                : 1,
            _version           : [2],
            version            : 1,
            data               : { _id : 1, id : 2, label : 'A', _version : [1] },
            url                : '/store_insert_post',
            method             : 'POST',
            storeName          : 'store_insert_post',
            messageError       : '404 : Not Found',
            messageErrorServer : { error : 404, message : 'Not Found'},
          });
          lunaris.retry('@store_insert_post', _values[0].url, _values[0].method, _values[0].data, _values[0].version);
          return;
        }

        should(_values).have.lengthOf(2);
        delete _values[1].date;
        should(_values[1]).eql({
          _id                : 2,
          _version           : [3],
          version            : 1,
          data               : { _id : 1, id : 2, label : 'A', _version : [1] },
          url                : '/store_insert_post',
          method             : 'POST',
          storeName          : 'store_insert_post',
          messageError       : '404 : Not Found',
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
            _id                : 1,
            _version           : [4],
            version            : 3,
            data               : { _id : 1, id : 2, label : 'A', _version : [3] },
            url                : '/store_insert_put/2',
            method             : 'PUT',
            storeName          : 'store_insert_put',
            messageError       : '404 : Not Found',
            messageErrorServer : { error : 404, message : 'Not Found'},
          });
          lunaris.retry('@store_insert_put', _values[0].url, _values[0].method, _values[0].data, _values[0].version);
          return;
        }
        should(_values).have.lengthOf(2);
        delete _values[1].date;
        should(_values[1]).eql({
          _id                : 2,
          _version           : [5],
          version            : 3,
          data               : { _id : 1, id : 2, label : 'A', _version : [3] },
          url                : '/store_insert_put/2',
          method             : 'PUT',
          storeName          : 'store_insert_put',
          messageError       : '404 : Not Found',
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
            _id                : 1,
            _version           : [1],
            version            : null,
            data               : null,
            url                : '/store?limit=50&offset=0',
            method             : 'GET',
            storeName          : 'store',
            messageError       : '404 : Not Found',
            messageErrorServer : { error : 404, message : 'Not Found'},
          });
          lunaris.retry('@store', _values[0].url, _values[0].method, _values[0].data, _values[0].version);
          return;
        }

        should(_values).have.lengthOf(2);
        delete _values[1].date;
        should(_values[1]).eql({
          _id                : 2,
          _version           : [2],
          version            : null,
          data               : null,
          url                : '/store?limit=50&offset=0',
          method             : 'GET',
          storeName          : 'store',
          messageError       : '404 : Not Found',
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
            _id                : 1,
            _version           : [3],
            version            : 2,
            data               : { _id : 1, id : 1, _version : [1, 2] },
            url                : '/store_del/1',
            method             : 'DELETE',
            storeName          : 'store_del',
            messageError       : '404 : Not Found',
            messageErrorServer : { error : 404, message : 'Not Found'},
          });
          lunaris.retry('@store_del', _values[0].url, _values[0].method, _values[0].data, _values[0].version);
          return;
        }

        should(_values).have.lengthOf(2);
        delete _values[1].date;
        should(_values[1]).eql({
          _id                : 2,
          _version           : [4],
          version            : 2,
          data               : { _id : 1, id : 1, _version : [1, 2] },
          url                : '/store_del/1',
          method             : 'DELETE',
          storeName          : 'store_del',
          messageError       : '404 : Not Found',
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

    it('should throw an error if value is an array and store is an object store', done => {
      lunaris._stores['store'] = initStore('store', {
        id    : ['<<int>>'],
        label : ['string']
      });

      lunaris.validate('@store', { id : 1, label : 1 }, true, () => {
        should(lastError.length).eql(2);
        should(lastError[0]).eql('[Lunaris warn] lunaris.update@store Error when validating data');
        should(lastError[1]).eql({ value : 1, field : 'label', error : 'must be a string' });
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
      var _nbPages                             = 0;
      lunaris._stores['pagination2.param.site'] = initStore('pagination2.param.site');
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
            { _id : 1, id : 20, label : 'B', _version : [2] },
            { _id : 2, id : 30, label : 'D', _version : [2] },
            { _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunaris.setPagination('@pagination2', 1, 50);
          lunaris.get('@pagination2');
          return;
        }

        should(items).eql([
          { _id : 1, id : 20, label : 'B', _version : [2] },
          { _id : 2, id : 30, label : 'D', _version : [2] },
          { _id : 3, id : 10, label : 'E', _version : [2] }
        ]);

        should(nbCallsPagination2).eql(1);

        done();
      });

      lunaris.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunaris.get('@pagination2');
    });

    it('should unvalidate the cache if a value has been updated', done => {
      var _nbPages                             = 0;
      lunaris._stores['pagination2.param.site'] = initStore('pagination2.param.site');
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
            { _id : 1, id : 20, label : 'B', _version : [2] },
            { _id : 2, id : 30, label : 'D', _version : [2] },
            { _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunaris.setPagination('@pagination2', 1, 50);
          lunaris.update('@pagination2', { _id : 3, id : 10, label : 'E-2'}, true);
          lunaris.get('@pagination2');
          return;
        }


        should(items).eql([
          { _id : 4, id : 20, label : 'B', _version : [4] },
          { _id : 5, id : 30, label : 'D', _version : [4] },
          { _id : 6, id : 10, label : 'E', _version : [4] }
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
      var _nbPages                             = 0;
      lunaris._stores['pagination2.param.site'] = initStore('pagination2.param.site');
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
            { _id : 1, id : 20, label : 'B', _version : [2] },
            { _id : 2, id : 30, label : 'D', _version : [2] },
            { _id : 3, id : 10, label : 'E', _version : [2] }
          ]);
          lunaris.setPagination('@pagination2', 1, 50);
          lunaris.delete('@pagination2', { _id : 3, id : 10, label : 'E-2'}, null, true);
          lunaris.get('@pagination2');
          return;
        }


        should(items).eql([
          { _id : 1, id : 20, label : 'B', _version : [2] },
          { _id : 2, id : 30, label : 'D', _version : [2] },
        ]);

        should(nbCallsPagination2).eql(1);

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

});

function _startServer (callback) {
  server.use(compression());
  server.use(bodyParser.json());
  server.get('/store1', (req, res) => {
    res.json({ success : true, error : null, message : null, data : [
      { id : 20, label : 'B' },
      { id : 30, label : 'D' },
      { id : 10, label : 'E' }
    ]});
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
    if (req.params.id === '1') {
      return res.json({ success : true, error : null, message : null, data : [{ id : 1 }] });
    }
    if (req.params.id === '2') {
      return res.json({ success : true, error : null, message : null, data : [{ id : 2 }] });
    }

    return res.json({ success : true, error : null, message : null, data : [{ id : 3 }, { id : 4 }] });
  });

  var _postPutDelHandler = (req, res) => {
    return res.json({ success : true, error : null, message : null, data : {
      body   : req.body,
      query  : req.query,
      params : req.params
    }});
  };
  server.post('/store_insert_put'      , _postPutDelHandler);
  server.get('/methods'                , _postPutDelHandler);
  server.post('/store1'                , _postPutDelHandler);
  server.put('/store1/:id'             , _postPutDelHandler);
  server.delete('/store1/:id'          , _postPutDelHandler);
  server.post('/store1/site/:idSite'   , _postPutDelHandler);
  server.put('/store1/:id/site/:idSite', _postPutDelHandler);

  server.post('/mass', (req, res) => {
    req.body.reverse();
    for (var i = 0; i < req.body.length; i++) {
      req.body[i].post = true;
    }
    res.json({ success : true, error : null, message : null, data : req.body });
  });
  server.put('/mass', (req, res) => {
    req.body.reverse();
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
  });
});
