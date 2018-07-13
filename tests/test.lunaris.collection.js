const collection = require('../src/collection');

describe('lunaris internal collection', () => {
  it('should return an object', () => {
    var _collection = collection();
    should(_collection).be.an.Object();
    should(_collection.add).be.a.Function();
    should(_collection.remove).be.a.Function();
    should(_collection.clear).be.a.Function();
    should(_collection.get).be.a.Function();
    should(_collection._getAll).be.a.Function();
  });

  it('should return the full collection', () => {
    var _collection = collection();
    should(_collection._getAll()).be.an.Array().and.have.length(0);
  });

  describe('add() / clear()', () => {
    it('should throw an error if no value is provided', () => {
      (function () {
        var _collection = collection();
        _collection.add();
      }).should.throw('add must have a value. It must be an Object.');
    });

    it('should add one item to the collection', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1], _operation : 'I'});
    });

    it('should add multiple items to the collection', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1], _operation : 'I'});
      should(_values[1]).eql({ _id : 2, id : 2, _version : [2], _operation : 'I'});
    });

    it('should start the index generation from 6 and version from 10', () => {
      var _collection = collection(6, 10);
      _collection.add({ id : 1 });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _id : 6, id : 1, _version : [10], _operation : 'I'});

      _collection.add({ id : 2 });
      _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[1]).eql({ _id : 7, id : 2, _version : [11], _operation : 'I'});
    });

    it('should clear the collection', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      should(_collection._getAll()).be.an.Array().and.have.length(1);

      _collection.clear();
      should(_collection._getAll()).be.an.Array().and.have.length(0);
    });

    it('should clear the collection , the index and the version', () => {
      var _collection = collection(6, 10);
      _collection.add({ id : 1 });
      should(_collection._getAll()).be.an.Array().and.have.length(1);

      var _values = _collection._getAll();
      should(_values[0]).eql({ _id : 6, id : 1, _version : [10], _operation : 'I'});

      _collection.clear();
      should(_collection._getAll()).be.an.Array().and.have.length(0);

      _collection.add({ id : 2 });
      _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _id : 1, id : 2, _version : [1], _operation : 'I'});
    });
  });

  describe('remove()', () => {
    it('should remove the item', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.remove(1);
      var _data = _collection._getAll();
      should(_data).have.length(2);
      should(_data[0]).eql({ _id : 1, id : 1, _version : [1, 2], _operation : 'I'});
      should(_data[1]).eql({ _id : 1, id : 1, _version : [3],    _operation : 'D'});
      should(_collection.get(2)).eql(null);
    });

    it('should remove the item from multiple items', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      _collection.remove(2);
      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1]   , _operation : 'I' });
      should(_values[1]).eql({ _id : 2, id : 2, _version : [2, 3], _operation : 'I' });
      should(_values[2]).eql({ _id : 2, id : 2, _version : [4]   , _operation : 'D' });
      should(_collection.get(2)).eql(null);
    });

    it('should remove items within the same transaction', () => {
      var _collection = collection();
      var _version = _collection.begin();
      _collection.add({ id : 1 }, _version);
      _collection.add({ id : 2 }, _version);
      _collection.commit();

      _version = _collection.begin();
      _collection.remove(2, _version);
      _collection.remove(1, _version);
      _collection.commit();

      var _values = _collection._getAll();
      should(_values).have.length(4);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1, _version], _operation : 'I' });
      should(_values[1]).eql({ _id : 2, id : 2, _version : [1, _version], _operation : 'I' });
      should(_values[2]).eql({ _id : 2, id : 2, _version : [3]          , _operation : 'D' });
      should(_values[3]).eql({ _id : 1, id : 1, _version : [3]          , _operation : 'D' });
      should(_collection.get(1)).eql(null);
      should(_collection.get(2)).eql(null);
    });
  });

  describe('get()', () => {
    it('should get the item', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      should(_collection.get(1)).eql({ _id : 1, id : 1, _version : [1], _operation : 'I' });
    });

    it('should get the item from multiple items', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      should(_collection.get(1)).eql({ _id : 1, id : 1, _version : [1], _operation : 'I' });
      should(_collection.get(2)).eql({ _id : 2, id : 2, _version : [2], _operation : 'I' });
    });

    it('should return null if not value has been found', () => {
      var _collection = collection();
      should(_collection.get(1)).eql(null);
    });
  });

  describe('upsert()', () => {
    it('should update the item', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });
      _collection.upsert({ _id : 1, id : 1, test : 2 });
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 2, _version : [3], _operation : 'U' });

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1, 2], _operation : 'I' });
    });

    it('should update the item, multiple items', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });
      _collection.add({ id : 2, test : 2 });
      _collection.upsert({ _id : 2, id : 2, test : 3 });
      should(_collection.get(2)).eql({ _id : 2, id : 2, test : 3, _version : [4], _operation : 'U' });

      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1], _operation : 'I' });
      should(_values[1]).eql({ _id : 2, id : 2, test : 2, _version : [2, 3], _operation : 'I' });
      should(_values[2]).eql({ _id : 2, id : 2, test : 3, _version : [4], _operation : 'U' });
    });

    it('should not update an older version of the item', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });
      _collection.upsert({ _id : 1, id : 1, test : 2 });
      _collection.upsert({ _id : 1, id : 1, test : 3 });
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 3, _version : [5], _operation : 'U' });

      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1, 2], _operation : 'I' });
      should(_values[1]).eql({ _id : 1, id : 1, test : 2, _version : [3, 4], _operation : 'U' });
      should(_values[2]).eql({ _id : 1, id : 1, test : 3, _version : [5]   , _operation : 'U' });
    });

    it('should insert the item if the id is not present in the collection', () => {
      var _collection = collection();
      _collection.upsert({ id : 1, test : 2 });
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 2, _version : [1], _operation : 'I' });
    });
  });

  describe('getCurrentId()', () => {
    it('should be defined', () => {
      should(collection().getCurrentId).be.ok();
    });

    it('should return the default index', () => {
      should(collection().getCurrentId()).eql(1);
    });

    it('should return the next index after insert', () => {
      var _collection = collection();
      should(_collection.getCurrentId()).eql(1);
      _collection.add({ id : 1, test : 1 });
      should(_collection.getCurrentId()).eql(2);
    });
  });

  describe('getCurrentVersionNumber()', () => {
    it('should be defined', () => {
      should(collection().getCurrentVersionNumber).be.ok();
    });

    it('should return the default index', () => {
      should(collection().getCurrentVersionNumber()).be.a.Number();
    });

    it('should return the default index', () => {
      should(collection().getCurrentVersionNumber()).eql(1);
    });

    it('should return the next index after insert', () => {
      var _collection = collection();
      should(_collection.getCurrentVersionNumber()).eql(1);
      _collection.add({ id : 1, test : 1 });
      should(_collection.getCurrentVersionNumber()).eql(2);
    });
  });

  describe('getFirst()', () => {
    it('should be defined', () => {
      should(collection().getFirst).be.ok();
    });

    it('should return the first item', () => {
      var _collection = collection();
      should(_collection.getFirst()).eql(undefined);
      _collection.add({ id : 1, test : 1 });
      should(_collection.getFirst()).eql({ _id : 1, id : 1, test : 1, _version : [1], _operation : 'I' });
    });

    it('should return the good first item', () => {
      var _collection = collection();
      should(_collection.getFirst()).eql(undefined);
      _collection.add({ id : 1, test : 1 });
      _collection.upsert({_id : 1, id : 1, test : 2, _version : [1] });
      should(_collection.getFirst()).eql({ _id : 1, id : 1, test : 2, _version : [3], _operation : 'U' });
    });
  });

  describe('begin()', () => {
    it('should be defined', () => {
      should(collection().begin).be.ok();
    });

    it('should be equal to currentVersionNumber()', () => {
      var _collection     = collection();
      var _version        = _collection.begin();
      var _currentVersion = _collection.getCurrentVersionNumber();
      should(_version).eql(_currentVersion);
    });

    it('should be less than currentVersionNumber()', () => {
      var _collection     = collection();
      _collection.add({ id : 1, test : 1 }, _version);
      var _version        = _collection.begin();
      var _currentVersion = _collection.getCurrentVersionNumber();
      should(_version).lessThan(_currentVersion);
    });

    it('should begin', () => {
      var _collection = collection();

      var _version = _collection.begin();
      _collection.add({ id : 1, test : 1 }, _version);
      _collection.add({ id : 2, test : 2 }, _version);

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1], _operation : 'I' });
      should(_values[1]).eql({ _id : 2, id : 2, test : 2, _version : [1], _operation : 'I' });
    });
  });

  describe('rollback()', () => {
    it('should be defined', () => {
      should(collection().rollback).be.ok();
    });

    it('should rollback the item', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });
      var _version = _collection.begin();
      _collection.upsert({ _id : 1, id : 1, test : 2 }, _version);
      _collection.commit();
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 2, _version : [3], _operation  : 'U' });
      _collection.rollback(_version);
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 1, _version : [5], _operation  : 'U' });

      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1, 2], _operation : 'I' });
      should(_values[1]).eql({ _id : 1, id : 1, test : 2, _version : [3, 4], _operation : 'U' });
      should(_values[2]).eql({ _id : 1, id : 1, test : 1, _version : [5]   , _operation : 'U' });
    });

    it('should rollback the items', () => {
      var _collection = collection();

      var _version = _collection.begin();
      _collection.add({ id : 1, test : 1 }, _version);
      _collection.add({ id : 2, test : 2 }, _version);
      _collection.commit();

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1], _operation  : 'I' });
      should(_values[1]).eql({ _id : 2, id : 2, test : 2, _version : [1], _operation  : 'I' });

      _version = _collection.begin();
      _collection.upsert({ _id : 1, id : 1, test : 1.1 }, _version);
      _collection.upsert({ _id : 2, id : 2, test : 2.2 }, _version);
      _collection.commit();

      var _values = _collection._getAll();
      should(_values).have.length(4);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1,   _version : [1, 2], _operation  : 'I' });
      should(_values[1]).eql({ _id : 2, id : 2, test : 2,   _version : [1, 2], _operation  : 'I' });
      should(_values[2]).eql({ _id : 1, id : 1, test : 1.1, _version : [3]   , _operation  : 'U' });
      should(_values[3]).eql({ _id : 2, id : 2, test : 2.2, _version : [3]   , _operation  : 'U' });

      _collection.rollback(_version);
      var _values = _collection._getAll();
      should(_values).have.length(6);
      should(_values[2]).eql({ _id : 1, id : 1, test : 1.1, _version : [3, 4], _operation  : 'U' });
      should(_values[3]).eql({ _id : 2, id : 2, test : 2.2, _version : [3, 4], _operation  : 'U' });
      should(_values[4]).eql({ _id : 1, id : 1, test : 1,   _version : [5]   , _operation  : 'U'});
      should(_values[5]).eql({ _id : 2, id : 2, test : 2,   _version : [5]   , _operation  : 'U'});
    });

    it('should rollback deleted items', () => {
      var _collection = collection();
      var _version = _collection.begin();
      _collection.add({ id : 1 }, _version);
      _collection.add({ id : 2 }, _version);
      _collection.commit();

      _version = _collection.begin();
      _collection.remove(2, _version);
      _collection.remove(1, _version);
      _collection.commit();

      var _values = _collection._getAll();
      should(_values).have.length(4);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1, _version], _operation : 'I' });
      should(_values[1]).eql({ _id : 2, id : 2, _version : [1, _version], _operation : 'I' });
      should(_values[2]).eql({ _id : 2, id : 2, _version : [3]          , _operation : 'D' });
      should(_values[3]).eql({ _id : 1, id : 1, _version : [3]          , _operation : 'D' });

      _collection.rollback(_version);
      _values = _collection._getAll();
      should(_values).have.length(6);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1, 2], _operation : 'I' });
      should(_values[1]).eql({ _id : 2, id : 2, _version : [1, 2], _operation : 'I' });
      should(_values[2]).eql({ _id : 2, id : 2, _version : [3, 4], _operation : 'D' });
      should(_values[3]).eql({ _id : 1, id : 1, _version : [3, 4], _operation : 'D' });
      should(_values[4]).eql({ _id : 1, id : 1, _version : [5]   , _operation : 'I' });
      should(_values[5]).eql({ _id : 2, id : 2, _version : [5]   , _operation : 'I' });

      _version = _collection.begin();
      _collection.remove(1, _version);
      _collection.remove(2, _version);
      _collection.commit();

      _values = _collection._getAll();
      should(_values).have.length(8);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1, 2], _operation : 'I' });
      should(_values[1]).eql({ _id : 2, id : 2, _version : [1, 2], _operation : 'I' });
      should(_values[2]).eql({ _id : 2, id : 2, _version : [3, 4], _operation : 'D' });
      should(_values[3]).eql({ _id : 1, id : 1, _version : [3, 4], _operation : 'D' });
      should(_values[4]).eql({ _id : 1, id : 1, _version : [5, 6], _operation : 'I' });
      should(_values[5]).eql({ _id : 2, id : 2, _version : [5, 6], _operation : 'I' });
      should(_values[6]).eql({ _id : 1, id : 1, _version : [7]   , _operation : 'D' });
      should(_values[7]).eql({ _id : 2, id : 2, _version : [7]   , _operation : 'D' });


      _collection.rollback(_version);
      _values = _collection._getAll();
      should(_values).have.length(10);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1, 2], _operation : 'I' });
      should(_values[1]).eql({ _id : 2, id : 2, _version : [1, 2], _operation : 'I' });
      should(_values[2]).eql({ _id : 2, id : 2, _version : [3, 4], _operation : 'D' });
      should(_values[3]).eql({ _id : 1, id : 1, _version : [3, 4], _operation : 'D' });
      should(_values[4]).eql({ _id : 1, id : 1, _version : [5, 6], _operation : 'I' });
      should(_values[5]).eql({ _id : 2, id : 2, _version : [5, 6], _operation : 'I' });
      should(_values[6]).eql({ _id : 1, id : 1, _version : [7, 8], _operation : 'D' });
      should(_values[7]).eql({ _id : 2, id : 2, _version : [7, 8], _operation : 'D' });
      should(_values[8]).eql({ _id : 1, id : 1, _version : [9],    _operation : 'I' });
      should(_values[9]).eql({ _id : 2, id : 2, _version : [9],    _operation : 'I' });
    });

    it('should rollback the item : insert & update', () => {
      var _collection = collection();
      var _version = _collection.begin();
      _collection.add({ id : 1, test : 1 }            , _version);
      _collection.upsert({ _id : 1, id : 1, test : 2 }, _version);
      _collection.commit();
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 2, _version : [1], _operation  : 'I' });
      _collection.rollback(_version);
      _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1, test : 2, _version : [1, 2], _operation : 'I' });
      should(_values[1]).eql({ _id : 1, id : 1, test : 2, _version : [3]   , _operation : 'D' });
      should(_collection.get(1)).eql(null);
    });
  });

});
