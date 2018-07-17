const collection   = require('../src/collection');
const buildLunaris = require('../lib/builder').buildLunaris;
const express      = require('express');
const bodyParser   = require('body-parser')
const fetch        = require('node-fetch');
const compression  = require('compression')

const port    = 4040;

var lastError = [];
console.error = function () {
  lastError = [arguments[0], arguments[1]];
}

var lunaris = {};
eval(buildLunaris({}, {
  BASE_URL      : "'http://localhost:" + port + "'",
  IS_PRODUCTION : false
}));
let server  = express();

describe('lunaris store', () => {

  before(done => {
    _startServer(done);
  });

  beforeEach(() => {
    collection.resetVersionNumber();
    lastError = [];
  });

  after(done => {
    _stopServer(done);
  });

  afterEach(() => {
    for (store in lunaris._stores) {
      delete lunaris._stores[store];
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
      var _store = _initStore('store1');
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A', _version : [1], _operation : 'I' });
    });

    it('should insert the value and execute the hooks : insert & inserted', done => {
      var _isUpdateHook                    = false;
      var _isUpdatedHook                   = false;
      var _store                           = _initStore('store1');
      var _expectedValue                   = { _id : 1, id : 2, label : 'A', _version : [1], _operation : 'I' };
      lunaris._stores['store1']            = _store;
      lunaris._stores['store1'].primaryKey = 'id';

      lunaris.hook('insert@store1', updatedValue => {
        should(updatedValue).eql(_expectedValue);
        should(Object.isFrozen(updatedValue)).eql(true);
        _isUpdateHook = true;
      });

      lunaris.hook('inserted@store1', data => {
        _isUpdatedHook = true;
        should(data.query).be.ok();
        should(data.params).be.ok();
        should(data.query).eql({});
        should(data.params).eql({});
        should(data.body).be.ok();
        should(data.body).eql(_expectedValue);

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
      var _store                           = _initStore('store1');
      var _expectedValue                   = { _id : 1, id : 2, label : 'A', _version : [1], _operation : 'I' };
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

    it('should update a value', () => {
      var _store = _initStore('store1');
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A', _version : [1], _operation : 'I' });
      lunaris.update('@store1', { _id : 1, id : 1, label : 'B'});
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'B', _version : [3], _operation : 'U' });
    });

    it('should update the value and execute the hooks : update and updated', done => {
      var _isUpdateHook         = false;
      var _isUpdatedHook        = false;
      var _store                = _initStore('store1');
      var _expectedValue        = { _id : 1, id : 1, label : 'B', _version : [3], _operation : 'U' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('update@store1', updatedValue => {
        _isUpdateHook = true;
        should(_store.data.get(1)).eql(_expectedValue);
        should(updatedValue).eql(_expectedValue);
        should(Object.isFrozen(updatedValue)).eql(true);
      });

      lunaris.hook('updated@store1', data => {
        _isUpdatedHook = true;
        should(data.query).be.ok();
        should(data.params).be.ok();
        should(data.query).eql({});
        should(data.params).eql({ id : '1' });
        should(data.body).be.ok();
        should(data.body).eql(_expectedValue);

        if (_isUpdateHook && _isUpdatedHook) {
          done();
        }
      });

      lunaris.hook('errorHttp@store1', (err) => {
        done(err);
      });

      lunaris.insert('@store1', { id : 1, label : 'A' });
      lunaris.update('@store1', { _id : 1, id : 1, label : 'B', _version : [1], _operation : 'I' });
    });

    it('should update the value and not execute the hook updated', done => {
      var _isUpdateHook         = false;
      var _isUpdatedHook        = false;
      var _store                = _initStore('store1');
      var _expectedValue        = { _id : 1, id : 1, label : 'B' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('update@store1', updatedValue => {
        _isUpdateHook = true;
      });

      lunaris.hook('updated@store1', data => {
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
      var _store                = _initStore('store1');
      _store.isLocal            = true;
      var _expectedValue        = { _id : 1, id : 1, label : 'B' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('update@store1', updatedValue => {
        _isUpdateHook = true;
      });

      lunaris.hook('updated@store1', data => {
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
      var _store                = _initStore('store1');
      var _expectedValue        = { _id : 1, id : 1, label : 'A', _version : [3], _operation : 'I' };
      lunaris._stores['optional'] = _initStore('optional');
      lunaris._stores['optional'].data.add({
        site : 2
      });

      lunaris._stores['required'] = _initStore('required');
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
        should(_store.data.get(1)).eql(_expectedValue);
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
        should(data.body).eql({ _id : 1, id : 1, label : 'A', _version : [6], _operation : 'U' });

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
      var _store                = _initStore('store1');
      var _expectedValue        = { _id : 1, id : 1, label : 'A', _version : [3], _operation : 'I' };
      lunaris._stores['optional'] = _initStore('optional');
      lunaris._stores['optional'].data.add({
        site : 2
      });

      lunaris._stores['required'] = _initStore('required');
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
        should(_store.data.get(1)).eql(_expectedValue);
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
        should(data.body).eql({ _id : 1, id : 1, label : 'A', _version : [6], _operation : 'U' });

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
      var _store                = _initStore('store1');
      var _expectedValue        = { _id : 1, id : 1, label : 'A', _version : [3], _operation : 'I' };
      lunaris._stores['required'] = _initStore('required');
      lunaris._stores['required'].data.add({
        site : 2
      });

      lunaris._stores['optional'] = _initStore('optional');
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
        should(_store.data.get(1)).eql(_expectedValue);
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
        should(data.body).eql({ _id : 1, id : 1, label : 'A', _version : [6], _operation : 'U' });

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
      var _value = { _id : 1, id : 1, label : 'A', _version : [1], _operation : 'I' };

      var _store = _initStore('store1');
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_value);
      lunaris.delete('@store1', _value);
      should(_store.data.get(1)).eql(null);
    });

    it('should delete the value and execute the hooks : delete & deleted', done => {
      var _isDeleteHook                    = false;
      var _isDeletedHook                   = false;
      var _store                           = _initStore('store1');
      var _expectedValue                   = { _id : 1, id : 2, label : 'A', _version : [1], _operation : 'I' };
      lunaris._stores['store1']            = _store;
      lunaris._stores['store1'].primaryKey = 'id';

      lunaris.hook('delete@store1', () => {
        _isDeleteHook = true;
      });

      lunaris.hook('deleted@store1', data => {
        _isDeletedHook = true;
        should(data.query).be.ok();
        should(data.params).be.ok();
        should(data.query).eql({});
        should(data.params).eql({ id : '2' });

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
      var _store                           = _initStore('store1');
      var _expectedValue                   = { _id : 1, id : 2, label : 'A', _version : [1], _operation : 'I' };
      lunaris._stores['store1']            = _store;
      lunaris._stores['store1'].primaryKey = 'id';
      lunaris._stores['store1'].isLocal    = true;

      lunaris.hook('delete@store1', result => {
        _isDeleteHook = true;
      });

      lunaris.hook('deleted@store1', data => {
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

    it('should delete the value and execute the hook and return false if the value has not been deleted', done => {
      var _store                = _initStore('store1');
      var _expectedValue        = { _id : 1, id : 1, label : 'A', _version : [1], _operation : 'I' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('delete@store1', () => {
        done();
      });

      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      lunaris.delete('@store1', { _id : 2, id : 2, label : 'B' });
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
      var _store          = _initStore('store1');
      var _expectedValues = [
        { _id : 1, id : 1, label : 'A', _version : [1], _operation : 'I' },
        { _id : 2, id : 2, label : 'B', _version : [2], _operation : 'I' }
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

    it('should get undefined if no value is in the collection', () => {
      var _store                = _initStore('store1');
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
      var _store                = _initStore('store1');
      lunaris._stores['store1'] = _store;

      lunaris.hook('get@store1', items => {
        should(items).eql([
          { _id : 1, id : 20, label : 'B', _version : [1], _operation : 'I' },
          { _id : 2, id : 30, label : 'D', _version : [1], _operation : 'I' },
          { _id : 3, id : 10, label : 'E', _version : [1], _operation : 'I' }
        ]);

        done();
      });

      lunaris.hook('errorHttp@store1', err => {
        done(err);
      });

      lunaris.get('@store1');
    });

    it('should fire the errorHttp event : HTTP error', done => {
      var _store               = _initStore('store');
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

    it('should fire the errorHttp event : application based error', done => {
      var _store               = _initStore('store2');
      lunaris._stores['store2'] = _store;

      lunaris.hook('errorHttp@store2', err => {
        should(err).eql('Error : null');
        done();
      });

      lunaris.get('@store2');
    });

    it('should get the values and execute the hook', done => {
      var _nbPages                  = 0;
      var _store                    = _initStore('pagination');
      lunaris._stores['pagination'] = _store;

      lunaris.hook('get@pagination', items => {
        _nbPages++;
        if (_nbPages === 1) {
          should(items).eql([
            { _id : 1, id : 20, label : 'B', _version : [1], _operation : 'I' },
            { _id : 2, id : 30, label : 'D', _version : [1], _operation : 'I' },
            { _id : 3, id : 10, label : 'E', _version : [1], _operation : 'I' }
          ]);
          for (var i = 0; i < items.length; i++) {
            should(Object.isFrozen(items[i])).eql(true);
          }
          lunaris.get('@pagination');
          return;
        }
        if (_nbPages === 2) {
          should(items).eql([
            { _id : 4, id : 40, label : 'A', _version : [2], _operation : 'I' },
            { _id : 5, id : 50, label : 'C', _version : [2], _operation : 'I' },
            { _id : 6, id : 60, label : 'F', _version : [2], _operation : 'I' }
          ]);
          for (var i = 0; i < items.length; i++) {
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
      lunaris._stores['required.param.site']         = _initStore('required.param.site');
      lunaris._stores['required.param.site'].isLocal = true;
      lunaris._stores['required.param.site'].data.add({
        site : 1
      });
      lunaris._stores['required']                = _initStore('required');
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
            { _id : 1, id : 1, _version : [2], _operation : 'I' },
            { _id : 2, id : 2, _version : [2], _operation : 'I' },
            { _id : 3, id : 3, _version : [2], _operation : 'I' }
          ]);
          _isFirstCall = false;
          lunaris.update('@required.param.site', {
            _id      : 1,
            site     : 2
          });
          lunaris.get('@required');
          return;
        }
        should(items).eql([
          { _id : 4, id : 4, _version : [6], _operation : 'I' },
          { _id : 5, id : 5, _version : [6], _operation : 'I' },
          { _id : 6, id : 6, _version : [6], _operation : 'I' }
        ]);

        done();
      });

      lunaris.hook('errorHttp@required', err => {
        done(err);
      });

      lunaris.get('@required');
    });

    it('should filter the store by a required filter and paginate', done => {
      var _nbPages                             = 0;
      lunaris._stores['pagination2.param.site'] = _initStore('pagination2.param.site');
      lunaris._stores['pagination2.param.site'].data.add({
        site : 1
      });
      lunaris._stores['pagination2']            = _initStore('pagination2');
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
            { _id : 1, id : 20, label : 'B', _version : [2], _operation : 'I' },
            { _id : 2, id : 30, label : 'D', _version : [2], _operation : 'I' },
            { _id : 3, id : 10, label : 'E', _version : [2], _operation : 'I' }
          ]);
          lunaris.get('@pagination2');
          return;
        }
        if (_nbPages === 2) {
          should(items).eql([
            { _id : 4, id : 40, label : 'A', _version : [4], _operation : 'I' },
            { _id : 5, id : 50, label : 'C', _version : [4], _operation : 'I' },
            { _id : 6, id : 60, label : 'F', _version : [4], _operation : 'I' }
          ]);
          lunaris.update('@pagination2.param.site', {
            _id      : 1,
            site     : 2
          });
          lunaris.get('@pagination2');
          return;
        }

        should(items).eql([
          { _id : 7, id : 70, label : 'G', _version : [8], _operation : 'I' },
          { _id : 8, id : 80, label : 'H', _version : [8], _operation : 'I' },
          { _id : 9, id : 90, label : 'I', _version : [8], _operation : 'I' }
        ]);

        done();
      });

      lunaris.hook('errorHttp@pagination2', err => {
        done(err);
      });

      lunaris.get('@pagination2');
    });

    it('should filter the store by an optional filter', done => {
      lunaris._stores['optional.param.site'] = _initStore('optional.param.site');
      lunaris._stores['optional.param.site'].data.add({
        id : 1
      });
      lunaris._stores['optional'] = _initStore('optional');
      lunaris._stores['optional'].filters.push({
        source          : '@optional.param.site',
        sourceAttribute : 'id',
        localAttribute  : 'id',
        operator        : '='
      });

      lunaris.hook('get@optional', items => {
        should(items).eql([
          { _id : 1, limit : '50', offset : '0', search : 'id:=1', _version : [2], _operation : 'I'}
        ]);

        done();
      });

      lunaris.hook('errorHttp@optional', err => {
        done(err);
      });

      lunaris.get('@optional');
    });

    it('should filter the store by two optional filters', done => {
      lunaris._stores['optional.param.site'] = _initStore('optional.param.site');
      lunaris._stores['optional.param.site'].data.add({
        id : 1
      });
      lunaris._stores['optional.param.category'] = _initStore('optional.param.category');
      lunaris._stores['optional.param.category'].data.add({
        id : 2
      });
      lunaris._stores['optional'] = _initStore('optional');
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
          { _id : 1, limit : '50', offset : '0', search : 'id:=1+category:=2', _version : [3], _operation : 'I'}
        ]);

        done();
      });

      lunaris.hook('errorHttp@optional', err => {
        done(err);
      });

      lunaris.get('@optional');
    });

    it('should not filter the store if the optional filter is not set', done => {
      lunaris._stores['optional.param.site']     = _initStore('optional.param.site');
      lunaris._stores['optional']                = _initStore('optional');
      lunaris._stores['optional'].fakeAttributes = ['site'];
      lunaris._stores['optional'].filters.push({
        source          : '@optional.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
      });

      lunaris.hook('get@optional', items => {
        should(items).eql([
          { _id : 1, limit : '50', offset : '0', _version : [1], _operation : 'I'}
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
      lunaris._stores['get'] = _initStore('get');
      lunaris.hook('get@get', item => {
        if (_currentId === 1) {
          should(item).be.an.Object();
          should(item).eql({
            _id : 1,
            id  : 1,
            _version : [1],
            _operation : 'I'
          });
          _currentId++;
          lunaris.get('@get', _currentId);
          return;
        }

        should(item).eql({
          _id : 2,
          id  : 2,
          _version : [2],
          _operation : 'I'
        });

        done();
      });

      lunaris.hook('errorHttp@get', err => {
        done(err);
      });

      lunaris.get('@get', _currentId);
    });

    it('should not filter the store by a required filter if the filer is not authorized for the current method', done => {
      lunaris._stores['required.param.site'] = _initStore('required.param.site');
      lunaris._stores['required.param.site'].data.add({
        site : 1
      });
      lunaris._stores['methods']                = _initStore('methods');
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
        lunaris._stores['optional.param.site'] = _initStore('optional.param.site');
        lunaris._stores['optional.param.site'].data.add({
          id : 1
        });
        lunaris._stores['optional'] = _initStore('optional');
        lunaris._stores['optional'].filters.push({
          source          : '@optional.param.site',
          sourceAttribute : 'id',
          localAttribute  : 'id',
          operator        : '='
        });

        lunaris.hook('get@optional', items => {
          should(items).eql([
            { _id : 1, limit : '50', offset : '0', search : 'id:=1', _version : [2], _operation : 'I'}
          ]);

          done();
        });

        lunaris.hook('errorHttp@optional', err => {
          done(err);
        });

        lunaris.get('@optional');
      });

      it('should filter the store by an "ILIKE" filter', done => {
        lunaris._stores['optional.param.site'] = _initStore('optional.param.site');
        lunaris._stores['optional.param.site'].data.add({
          id : 1
        });
        lunaris._stores['optional'] = _initStore('optional');
        lunaris._stores['optional'].filters.push({
          source          : '@optional.param.site',
          sourceAttribute : 'id',
          localAttribute  : 'id',
          operator        : 'ILIKE'
        });

        lunaris.hook('get@optional', items => {
          should(items).eql([
            { _id : 1, limit : '50', offset : '0', search : 'id:1', _version : [2], _operation : 'I'}
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
      var _store = _initStore('store1');
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A', _version : [1], _operation : 'I' });
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
      var _store        = _initStore('store1');
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A', _version : [1], _operation : 'I' });

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

});

/**
 * Utils
 */

function _initStore (name) {
  var _store                   = {};
  _store.name                  = name;
  _store.primaryKey            = null;
  _store.data                  = collection.collection();
  _store.filters               = [];
  _store.hooks                 = {};
  _store.paginationLimit       = 50;
  _store.paginationOffset      = 0;
  _store.paginationCurrentPage = 1;
  return _store;
}

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
  server.get('/methods'                , _postPutDelHandler);
  server.post('/store1'                , _postPutDelHandler);
  server.put('/store1/:id'             , _postPutDelHandler);
  server.delete('/store1/:id'          , _postPutDelHandler);
  server.post('/store1/site/:idSite'   , _postPutDelHandler);
  server.put('/store1/:id/site/:idSite', _postPutDelHandler);

  server = server.listen(port, callback);
}

function _stopServer (callback) {
  server.close(callback);
}

