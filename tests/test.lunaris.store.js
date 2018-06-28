const collection   = require('../src/collection');
const buildLunaris = require('../lib/builder').buildLunaris;
const express      = require('express');
const fetch        = require('node-fetch');
const pluralize    = require('pluralize');

const port    = 4040;

var lunaris = {};
eval(buildLunaris({
  BASE_URL : "'http://localhost:" + port + "'"
}));
let server  = express();

describe('lunaris store', () => {

  before(done => {
    _startServer(done);
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

    it('should throw an error if no value is provided', () => {
      (function () {
        lunaris.insert('@store');
      }).should.throw('lunaris.<get|insert|update>(<store>, <value>) must have a value, provided value: undefined');
    });

    it('should throw an error if the store is not a string', () => {
      (function () {
        lunaris.insert({}, { id : 1 });
      }).should.throw('lunaris.<get|insert|update>(<store>, <value>) must have a correct store value: @<store>');
    });

    it('should throw an error if the store is not defined', () => {
      (function () {
        lunaris.insert('@store', { id : 1 });
      }).should.throw('The store "store" has not been defined');
    });

    it('should insert the value', () => {
      var _store = _initStore();
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A' });
    });

    it('should insert the value and execute the hook', done => {
      var _store                = _initStore('store1');
      var _expectedValue        = { _id : 1, id : 1, label : 'A' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('insert@store1', updatedValue => {
        should(updatedValue).eql({ _id : 1, id : 1, label : 'A' });
        done();
      });

      lunaris.insert('@store1', { id : 1, label : 'A' });
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

        if (_nbExecutedHandlers === 2) {
          done();
        }
        else {
          done(_nbExecutedHandlers);
        }
      });

      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
    });

    it('should update a value', () => {
      var _store = _initStore();
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql({ _id : 1, id : 1, label : 'A' });
      lunaris.update('@store1', { _id : 1, id : 1, label : 'B' });
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

      lunaris.insert('@store1', { id : 1, label : 'A' });
      lunaris.update('@store1', _expectedValue);
      should(_store.data.get(1)).eql(_expectedValue);
    });
  });

  describe('delete()', () => {
    it('insert() should be defined', () => {
      should(lunaris.delete).be.a.Function();
    });

    it('should throw an error if no value is provided', () => {
      (function () {
        lunaris.delete('@store');
      }).should.throw('lunaris.<get|insert|update>(<store>, <value>) must have a value, provided value: undefined');
    });

    it('should throw an error if the store is not a string', () => {
      (function () {
        lunaris.delete({}, { id : 1 });
      }).should.throw('lunaris.<get|insert|update>(<store>, <value>) must have a correct store value: @<store>');
    });

    it('should throw an error if the store is not defined', () => {
      (function () {
        lunaris.delete('@store', { id : 1 });
      }).should.throw('The store "store" has not been defined');
    });

    it('should delete the value', () => {
      var _value = { _id : 1, id : 1, label : 'A' };

      var _store = _initStore();
      lunaris._stores['store1'] = _store;
      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_value);
      lunaris.delete('@store1', _value);
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

      lunaris.insert('@store1', { id : 1, label : 'A' });
      should(_store.data.get(1)).eql(_expectedValue);
      lunaris.delete('@store1', _expectedValue);
    });

    it('should delete the value and execute the hook and return false if the value has not been deleted', done => {
      var _store                = _initStore();
      var _expectedValue        = { _id : 1, id : 1, label : 'A' };
      lunaris._stores['store1'] = _store;

      lunaris.hook('delete@store1', result => {
        should(result).eql(false);
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
      (function () {
        lunaris.getOne({});
      }).should.throw('lunaris.<get|insert|update>(<store>, <value>) must have a correct store value: @<store>');
    });

    it('should throw an error if the store is not defined', () => {
      (function () {
        lunaris.getOne('@store0');
      }).should.throw('The store "store0" has not been defined');
    });

    it('should get the first value', () => {
      var _store          = _initStore();
      var _expectedValues = [
        { _id : 1, id : 1, label : 'A' },
        { _id : 2, id : 2, label : 'B' }
      ];
      lunaris._stores['store1'] = _store;

      lunaris.insert('@store1', { id : 1, label : 'A' });
      lunaris.insert('@store1', { id : 2, label : 'B' });
      should(_store.data.get(1)).eql(_expectedValues[0]);
      should(_store.data.get(2)).eql(_expectedValues[1]);
      should(lunaris.getOne('@store1')).eql(_expectedValues[0]);
    });
  });

  describe('get()', () => {
    it('insert() should be defined', () => {
      should(lunaris.get).be.a.Function();
    });

    it('should throw an error if the store is not a string', () => {
      (function () {
        lunaris.get({});
      }).should.throw('lunaris.<get|insert|update>(<store>, <value>) must have a correct store value: @<store>');
    });

    it('should throw an error if the store is not defined', () => {
      (function () {
        lunaris.get('@store');
      }).should.throw('The store "store" has not been defined');
    });

    it('should get the values and execute the hook', done => {
      var _store                = _initStore('store1');
      lunaris._stores['store1'] = _store;

      lunaris.hook('get@store1', items => {
        should(items).eql([
          { _id : 1, id : 20, label : 'B' },
          { _id : 2, id : 30, label : 'D' },
          { _id : 3, id : 10, label : 'E' }
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
        should(err.status).eql(404);
        should(err.statusText).eql('Not Found');
        done();
      });

      lunaris.get('@store');
    });

    it('should fire the errorHttp event : application based error', done => {
      var _store               = _initStore('store2');
      lunaris._stores['store2'] = _store;

      lunaris.hook('errorHttp@store2', err => {
        should(err.error).eql('Error');
        should(err.message).eql(null);
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
            { _id : 1, id : 20, label : 'B' },
            { _id : 2, id : 30, label : 'D' },
            { _id : 3, id : 10, label : 'E' }
          ]);
          lunaris.get('@pagination');
          return;
        }
        if (_nbPages === 2) {
          should(items).eql([
            { _id : 4, id : 40, label : 'A' },
            { _id : 5, id : 50, label : 'C' },
            { _id : 6, id : 60, label : 'F' }
          ]);
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
      lunaris._stores['required.param.site'] = _initStore('required.param.site');
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
            { _id : 1, id : 1 }, { _id : 2, id : 2 }, { _id : 3, id : 3 }
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
          { _id : 4, id : 4 }, { _id : 5, id : 5 }, { _id : 6, id : 6 }
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
            { _id : 1, id : 20, label : 'B' },
            { _id : 2, id : 30, label : 'D' },
            { _id : 3, id : 10, label : 'E' }
          ]);
          lunaris.get('@pagination2');
          return;
        }
        if (_nbPages === 2) {
          should(items).eql([
            { _id : 4, id : 40, label : 'A' },
            { _id : 5, id : 50, label : 'C' },
            { _id : 6, id : 60, label : 'F' }
          ]);
          lunaris.update('@pagination2.param.site', {
            _id  : 1,
            site : 2
          });
          lunaris.get('@pagination2');
          return;
        }

        should(items).eql([
          { _id : 7, id : 70, label : 'G' },
          { _id : 8, id : 80, label : 'H' },
          { _id : 9, id : 90, label : 'I' }
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
        site : 1
      });
      lunaris._stores['optional']                = _initStore('optional');
      lunaris._stores['optional'].fakeAttributes = ['site'];
      lunaris._stores['optional'].filters.push({
        source          : '@optional.param.site',
        sourceAttribute : 'site',
        localAttribute  : 'site',
      });

      lunaris.hook('get@optional', items => {
        should(items).eql([
          { _id : 1, limit : '50', offset : '0', site : '1'}
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

/**
 * Utils
 */

function _initStore (name) {
  var _store                   = {};
  _store.name                  = name;
  _store.data                  = collection();
  _store.filters               = [];
  _store.hooks                 = {};
  _store.paginationLimit       = 50;
  _store.paginationOffset      = 0;
  _store.paginationCurrentPage = 1;
  return _store;
}

function _startServer (callback) {
  server.get('/store1S', (req, res) => {
    res.json({ success : true, error : null, message : null, data : [
      { id : 20, label : 'B' },
      { id : 30, label : 'D' },
      { id : 10, label : 'E' }
    ]});
  });

  server.get('/store2S', (req, res) => {
    res.json({ success : false, error : 'Error', message : null, data : [] });
  });

  server.get('/paginations', (req, res) => {
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

  server.get('/requireds/site/:idSite', (req, res) => {
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

  server.get('/optionals', (req, res) => {
    res.json({ success : true, error : null, message : null, data : [req.query] });
  });

  server.get('/pagination2S/site/:idSite', (req, res) => {
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

  server = server.listen(port, callback);
}

function _stopServer (callback) {
  server.close(callback);
}

