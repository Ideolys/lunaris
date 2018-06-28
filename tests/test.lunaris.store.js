const store      = require('../src/store');
const collection = require('../src/collection');
const lunaris    = require('../src/index');

describe('lunaris store', () => {

  describe('insert() / update()', () => {
    it('insert() should be defined', () => {
      should(store.insert).be.a.Function();
    });

    it('update should be defined', () => {
      should(store.update).be.a.Function();
    });

    it('should throw an error if no value is provided', () => {
      (function () {
        store.insert('@store');
      }).should.throw('lunaris.<get|insert|update>(<store>, <value>) must have a value, provided value: undefined');
    });

    it('should throw an error if the store is not a string', () => {
      (function () {
        store.insert({}, { id : 1 });
      }).should.throw('lunaris.<get|insert|update>(<store>, <value>) must have a correct store value: @<store>');
    });

    it('should throw an error if the store is not defined', () => {
      (function () {
        store.insert('@store', { id : 1 });
      }).should.throw('The store "store" has not been defined');
    });

    it('should insert the value', () => {
      var _store = _initStore();
      lunaris._stores['store1'] = _store;
      store.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A' });
      delete lunaris._stores['store1'];
    });

    it('should insert the value and execute the hook', done => {
      var _store                = _initStore();
      var _expectedValue        = { _id : 1, id : 1, label : 'A' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('insert@store1', updatedValue => {
        should(updatedValue).eql({ _id : 1, id : 1, label : 'A' });
        delete lunaris._stores['store1'];
        done();
      });

      store.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
    });

    it('should insert the value and execute the hooks', done => {
      var _nbExecutedHandlers   = 0;
      var _store                = _initStore();
      var _expectedValue        = { _id : 1, id : 1, label : 'A' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('insert@store1', updatedValue => {
        should(updatedValue).eql({ _id : 1, id : 1, label : 'A' });
        _nbExecutedHandlers++;
      });

      lunaris.hook('insert@store1', updatedValue => {
        should(updatedValue).eql({ _id : 1, id : 1, label : 'A' });
        _nbExecutedHandlers++;

        delete lunaris._stores['store1'];
        if (_nbExecutedHandlers === 2) {
          done();
        }
        else {
          done(_nbExecutedHandlers);
        }
      });

      store.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
    });

    it('should update a value', () => {
      var _store = _initStore();
      lunaris._stores['store1'] = _store;
      store.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A' });
      store.update('@store1', { _id : 1, id : 1, label : 'B' });
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'B' });
      delete lunaris._stores['store1'];
    });

    it('should update the value and execute the hook', done => {
      var _store                = _initStore();
      var _expectedValue        = { _id : 1, id : 1, label : 'B' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('update@store1', updatedValue => {
        should(updatedValue).eql(_expectedValue);
        delete lunaris._stores['store1'];
        done();
      });

      store.insert('@store1', { id : 1, label : 'A' });
      store.update('@store1', _expectedValue);
      should(_store.data.get(1)).eql(_expectedValue);
    });
  });

  describe('delete()', () => {
    it('insert() should be defined', () => {
      should(store.delete).be.a.Function();
    });

    it('should throw an error if no value is provided', () => {
      (function () {
        store.delete('@store');
      }).should.throw('lunaris.<get|insert|update>(<store>, <value>) must have a value, provided value: undefined');
    });

    it('should throw an error if the store is not a string', () => {
      (function () {
        store.delete({}, { id : 1 });
      }).should.throw('lunaris.<get|insert|update>(<store>, <value>) must have a correct store value: @<store>');
    });

    it('should throw an error if the store is not defined', () => {
      (function () {
        store.delete('@store', { id : 1 });
      }).should.throw('The store "store" has not been defined');
    });

    it('should delete the value', () => {
      var _value = { _id : 1, id : 1, label : 'A' };

      var _store = _initStore();
      lunaris._stores['store1'] = _store;
      store.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_value);
      store.delete('@store1', _value);
      should(_store.data.getAll()).have.length(0);
    });

    it('should delete the value and execute the hook', done => {
      var _store                = _initStore();
      var _expectedValue        = { _id : 1, id : 1, label : 'A' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('delete@store1', result => {
        should(result).eql(true);
        done();
      });

      store.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      store.delete('@store1', _expectedValue);
    });

    it('should delete the value and execute the hook and return false if the value has not been deleted', done => {
      var _store                = _initStore();
      var _expectedValue        = { _id : 1, id : 1, label : 'A' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('delete@store1', result => {
        should(result).eql(false);
        done();
      });

      store.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      store.delete('@store1', { _id : 2, id : 2, label : 'B' });
    });
  });

  describe('get()', () => {
    it('insert() should be defined', () => {
      should(store.get).be.a.Function();
    });

    it('should throw an error if the store is not a string', () => {
      (function () {
        store.get({});
      }).should.throw('lunaris.<get|insert|update>(<store>, <value>) must have a correct store value: @<store>');
    });

    it('should throw an error if the store is not defined', () => {
      (function () {
        store.get('@store');
      }).should.throw('The store "store" has not been defined');
    });

    it('should get the values and execute the hook', done => {
      var _store          = _initStore();
      var _expectedValues = [
        { _id : 1, id : 1, label : 'A' },
        { _id : 2, id : 2, label : 'B' }
      ];
      lunaris._stores['store1'] = _store;

      lunaris.hook('get@store1', items => {
        should(items).eql(_expectedValues);
        delete lunaris._stores['store1'];
        done();
      });

      store.insert('@store1', { id : 1, label : 'A' });
      store.insert('@store1', { id : 2, label : 'B' });
      should(_store.data.get(1)).eql(_expectedValues[0]);
      should(_store.data.get(2)).eql(_expectedValues[1]);
      store.get('@store1');
    });
  });

  describe('getOne()', () => {
    it('insert() should be defined', () => {
      should(store.getOne).be.a.Function();
    });

    it('should throw an error if the store is not a string', () => {
      (function () {
        store.getOne({});
      }).should.throw('lunaris.<get|insert|update>(<store>, <value>) must have a correct store value: @<store>');
    });

    it('should throw an error if the store is not defined', () => {
      (function () {
        store.getOne('@store');
      }).should.throw('The store "store" has not been defined');
    });

    it('should get the first value', () => {
      var _store          = _initStore();
      var _expectedValues = [
        { _id : 1, id : 1, label : 'A' },
        { _id : 2, id : 2, label : 'B' }
      ];
      lunaris._stores['store1'] = _store;

      store.insert('@store1', { id : 1, label : 'A' });
      store.insert('@store1', { id : 2, label : 'B' });
      should(_store.data.get(1)).eql(_expectedValues[0]);
      should(_store.data.get(2)).eql(_expectedValues[1]);
      should(store.getOne('@store1')).eql(_expectedValues[0]);
      delete lunaris._stores['store1'];
    });
  });

});

function _initStore () {
  var _store   = {};
  _store.data  = collection();
  _store.hooks = {};
  return _store;
}
