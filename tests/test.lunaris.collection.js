const collectionModule = require('../src/store/store.collection');
const collection       = collectionModule.collection;

function getPrimaryKey (value) {
  return value.id;
}

describe('lunaris internal collection', () => {
  beforeEach(() => {
    collectionModule.resetVersionNumber();
  });

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
      var _collection = collection(null, getPrimaryKey);
      _collection.add({ id : 1 });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1]});

      var _index = _collection._getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([1]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);
    });

    it('should add multiple items to the collection', () => {
      var _collection = collection(null, getPrimaryKey);
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1]});
      should(_values[1]).eql({ _id : 2, id : 2, _version : [2]});

      var _index = _collection._getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(2);
      should(_index[0]).eql([1, 2]);
      should(_index[1]).have.lengthOf(2);
      should(_index[1]).eql([1, 2]);
    });

    it('should start the id generation from 6', () => {
      var _collection = collection(6);
      _collection.add({ id : 1 });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _id : 6, id : 1, _version : [1]});

      _collection.add({ id : 2 });
      _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[1]).eql({ _id : 7, id : 2, _version : [2]});
    });

    it('should clear the collection', () => {
      var _collection = collection(null, getPrimaryKey);
      _collection.add({ id : 1 });
      should(_collection._getAll()).be.an.Array().and.have.length(1);

      var _index = _collection._getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([1]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);

      _collection.clear();
      should(_collection._getAll()).be.an.Array().and.have.length(0);

      _index = _collection._getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(0);
      should(_index[1]).have.lengthOf(0);
    });

    it('should clear the collection and the id', () => {
      var _collection = collection(6);
      _collection.add({ id : 1 });
      should(_collection._getAll()).be.an.Array().and.have.length(1);

      var _values = _collection._getAll();
      should(_values[0]).eql({ _id : 6, id : 1, _version : [1]});

      _collection.clear();
      should(_collection._getAll()).be.an.Array().and.have.length(0);

      _collection.add({ id : 2 });
      _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _id : 1, id : 2, _version : [2]});
    });

    it('should add the value to the collection if no getPrimaryKey Function', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1]});

      var _index = _collection._getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(0);
      should(_index[1]).have.lengthOf(0);
    });

    it('should add the value to the collection if no id has been returned by the function getPrimaryKey', () => {
      var _collection = collection();
      _collection.add({ label : 'A' });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _id : 1, label : 'A', _version : [1]});

      var _index = _collection._getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(0);
      should(_index[1]).have.lengthOf(0);
    });

    it('should not duplicate values if the same id has been already used', () => {
      var _collection = collection(null, getPrimaryKey);
      _collection.add({ id : 2, label : 'A' });
      _collection.add({ id : 2, label : 'B' });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[0]).eql({ _id : 1, id : 2, label : 'A', _version : [1, 3]});
      should(_values[1]).eql({ _id : 1, id : 2, label : 'B', _version : [3]});

      var _index = _collection._getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([2]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);
    });
  });

  describe('remove()', () => {
    it('should remove the item', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.remove(1);
      var _data = _collection._getAll();
      should(_data).have.length(1);
      should(_data[0]).eql({ _id : 1, id : 1, _version : [1, 2]});
      should(_collection.get(2)).eql(null);
    });

    it('should remove the item from multiple items', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      _collection.remove(2);
      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1]   });
      should(_values[1]).eql({ _id : 2, id : 2, _version : [2, 3]});
      should(_collection.get(2)).eql(null);
    });

    it('should remove items within the same transaction', () => {
      var _collection = collection();
      var _version = _collection.begin();
      _collection.add({ id : 1 }, _version);
      _collection.add({ id : 2 }, _version);
      _collection.commit(_version);

      _version = _collection.begin();
      _collection.remove(2, _version);
      _collection.remove(1, _version);
      _collection.commit(_version);

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1, 2]});
      should(_values[1]).eql({ _id : 2, id : 2, _version : [1, 2]});
      should(_collection.get(1)).eql(null);
      should(_collection.get(2)).eql(null);
    });
  });

  describe('get()', () => {
    it('should get the item', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      should(_collection.get(1)).eql({ _id : 1, id : 1, _version : [1]});
    });

    it('should get the item from multiple items', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      should(_collection.get(1)).eql({ _id : 1, id : 1, _version : [1]});
      should(_collection.get(2)).eql({ _id : 2, id : 2, _version : [2]});
    });

    it('should return null if not value has been found', () => {
      var _collection = collection();
      should(_collection.get(1)).eql(null);
    });
  });

  describe('getAll()', () => {
    it('should be defined', () => {
      var _collection = collection();
      should(_collection.getAll).be.ok();
      should(_collection.getAll).be.a.Function();
    });

    it('should return the valid items in the collection', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      _collection.remove(1);
      _collection.upsert({ _id : 2, id : 2, label : 'A' });
      _collection.add({ id : 3 });

      var _items = _collection.getAll();
      should(_items).be.an.Array().and.have.lengthOf(2);
      should(_items[0]).eql({ _id : 2, id : 2, label : 'A', _version : [3] });
      should(_items[1]).eql({ _id : 3, id : 3, _version : [4] });
    });

    it('should return the valid items in the collection filtered by ids', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      _collection.remove(1);
      _collection.upsert({ _id : 2, id : 2, label : 'A' });

      var _items = _collection.getAll([1, 2]);
      should(_items).be.an.Array().and.have.lengthOf(1);
      should(_items[0]).eql({ _id : 2, id : 2, label : 'A', _version : [3] });
    });
  });

  describe('upsert()', () => {
    it('should update the item', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });
      _collection.upsert({ _id : 1, id : 1, test : 2 });
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 2, _version : [2]});

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1, 2]});
    });

    it('should update the item, multiple items', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });
      _collection.add({ id : 2, test : 2 });
      _collection.upsert({ _id : 2, id : 2, test : 3 });
      should(_collection.get(2)).eql({ _id : 2, id : 2, test : 3, _version : [3]});

      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1]   });
      should(_values[1]).eql({ _id : 2, id : 2, test : 2, _version : [2, 3]});
      should(_values[2]).eql({ _id : 2, id : 2, test : 3, _version : [3]   });
    });

    it('should not update an older version of the item', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });
      _collection.upsert({ _id : 1, id : 1, test : 2 });
      _collection.upsert({ _id : 1, id : 1, test : 3 });
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 3, _version : [3]});

      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1, 2]});
      should(_values[1]).eql({ _id : 1, id : 1, test : 2, _version : [2, 3]});
      should(_values[2]).eql({ _id : 1, id : 1, test : 3, _version : [3]   });
    });

    it('should insert the item if the id is not present in the collection', () => {
      var _collection = collection();
      _collection.upsert({ id : 1, test : 2 });
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 2, _version : [1]});
    });
  });

  describe('getCurrentId()', () => {
    it('should be defined', () => {
      should(collection().getCurrentId).be.ok();
    });

    it('should return the default id', () => {
      should(collection().getCurrentId()).eql(1);
    });

    it('should return the next id after insert', () => {
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

    it('should return the default id', () => {
      should(collection().getCurrentVersionNumber()).be.a.Number();
    });

    it('should return the default id', () => {
      should(collection().getCurrentVersionNumber()).eql(1);
    });

    it('should return the next id after insert', () => {
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
      should(_collection.getFirst()).eql({ _id : 1, id : 1, test : 1, _version : [1]});
    });

    it('should return the good first item', () => {
      var _collection = collection();
      should(_collection.getFirst()).eql(undefined);
      _collection.add({ id : 1, test : 1 });
      _collection.upsert({_id : 1, id : 1, test : 2});
      should(_collection.getFirst()).eql({ _id : 1, id : 1, test : 2, _version : [2]});
    });
  });

  describe('begin()', () => {
    it('should be defined', () => {
      should(collection().begin).be.ok();
    });

    it('should be equal to currentVersionNumber()', () => {
      var _collection = collection();
      var _version    = _collection.begin();
      should(_version).eql(1);
    });

    it('should begin', () => {
      var _collection = collection();

      var _version = _collection.begin();
      _collection.add({ id : 1, test : 1 }, _version);
      _collection.add({ id : 2, test : 2 }, _version);
      _collection.commit(_version);

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1]});
      should(_values[1]).eql({ _id : 2, id : 2, test : 2, _version : [1]});
    });

    it('should begin and end the transactions', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 }, _version);

      var _version = _collection.begin();
      _collection.upsert({ _id : 1, id : 1, test : 'B' });
      _collection.upsert({ _id : 1, id : 1, test : 'A' }, _version);
      _collection.commit(_version);

      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1  , _version : [1, 2] });
      should(_values[1]).eql({ _id : 1, id : 1, test : 'B', _version : [2, 3] });
      should(_values[2]).eql({ _id : 1, id : 1, test : 'A', _version : [3]    });
    });

    it('should not duplicate values if the same id has been already used within a transaction', () => {
      var _collection = collection(null, getPrimaryKey);
      var _version    = _collection.begin();
      _collection.add({ id : 2, label : 'A' }, _version);
      _collection.add({ id : 2, label : 'B' }, _version);
      _collection.commit(_version);
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _id : 1, id : 2, label : 'B', _version : [1]});

      var _index = _collection._getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([2]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);
    });

    it('should not duplicate values if the same id has been already used in two different transactions', () => {
      var _collection = collection(null, getPrimaryKey);
      var _version    = _collection.begin();
      _collection.add({ id : 2, label : 'A' }, _version);
      _collection.commit(_version);
      _version  = _collection.begin();
      _collection.add({ id : 2, label : 'B' }, _version);
      _collection.commit(_version);
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[0]).eql({ _id : 1, id : 2, label : 'A', _version : [1, 2]});
      should(_values[1]).eql({ _id : 1, id : 2, label : 'B', _version : [2]});

      var _index = _collection._getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([2]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);
    });
  });

  describe('rollback()', () => {
    it('should be defined', () => {
      should(collection().rollback).be.ok();
    });

    it('should rollback the item : insert', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });
      var _version = _collection.begin();
      _collection.upsert({ _id : 1, id : 1, test : 2 }, _version);
      _collection.commit(_version);
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 2, _version : [2]});
      _collection.rollback(_version);
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 1, _version : [3]});

      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1, 2]});
      should(_values[1]).eql({ _id : 1, id : 1, test : 2, _version : [2, 3]});
      should(_values[2]).eql({ _id : 1, id : 1, test : 1, _version : [3]   });
    });

    it('should rollback the items : updates', () => {
      var _collection = collection();

      var _version = _collection.begin();
      _collection.add({ id : 1, test : 1 }, _version);
      _collection.add({ id : 2, test : 2 }, _version);
      _collection.commit(_version);

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1]});
      should(_values[1]).eql({ _id : 2, id : 2, test : 2, _version : [1]});

      _version = _collection.begin();
      _collection.upsert({ _id : 1, id : 1, test : 1.1 }, _version);
      _collection.upsert({ _id : 2, id : 2, test : 2.2 }, _version);
      _collection.commit(_version);

      _values = _collection._getAll();
      should(_values).have.length(4);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1,   _version : [1, 2] });
      should(_values[1]).eql({ _id : 2, id : 2, test : 2,   _version : [1, 2] });
      should(_values[2]).eql({ _id : 1, id : 1, test : 1.1, _version : [2]    });
      should(_values[3]).eql({ _id : 2, id : 2, test : 2.2, _version : [2]    });

      _collection.rollback(_version);
      _values = _collection._getAll();
      should(_values).have.length(6);
      should(_values[2]).eql({ _id : 1, id : 1, test : 1.1, _version : [2, 3]});
      should(_values[3]).eql({ _id : 2, id : 2, test : 2.2, _version : [2, 3]});
      should(_values[4]).eql({ _id : 2, id : 2, test : 2,   _version : [3]   });
      should(_values[5]).eql({ _id : 1, id : 1, test : 1,   _version : [3]   });
    });

    it('should rollback deleted items : delete', () => {
      var _collection = collection();
      var _version = _collection.begin();
      _collection.add({ id : 1 }, _version);
      _collection.add({ id : 2 }, _version);
      _collection.commit(_version);

      _version = _collection.begin();
      _collection.remove(2, _version);
      _collection.remove(1, _version);
      _collection.commit(_version);

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1, 2]});
      should(_values[1]).eql({ _id : 2, id : 2, _version : [1, 2]});

      _collection.rollback(_version);
      _values = _collection._getAll();
      should(_values).have.length(4);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1, 2]});
      should(_values[1]).eql({ _id : 2, id : 2, _version : [1, 2]});
      should(_values[2]).eql({ _id : 2, id : 2, _version : [3]   });
      should(_values[3]).eql({ _id : 1, id : 1, _version : [3]   });

      _version = _collection.begin();
      _collection.remove(1, _version);
      _collection.remove(2, _version);
      _collection.commit(_version);

      _values = _collection._getAll();
      should(_values).have.length(4);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1, 2]});
      should(_values[1]).eql({ _id : 2, id : 2, _version : [1, 2]});
      should(_values[2]).eql({ _id : 2, id : 2, _version : [3, 4]});
      should(_values[3]).eql({ _id : 1, id : 1, _version : [3, 4]});


      _collection.rollback(_version);
      _values = _collection._getAll();
      should(_values).have.length(6);
      should(_values[0]).eql({ _id : 1, id : 1, _version : [1, 2]});
      should(_values[1]).eql({ _id : 2, id : 2, _version : [1, 2]});
      should(_values[2]).eql({ _id : 2, id : 2, _version : [3, 4]});
      should(_values[3]).eql({ _id : 1, id : 1, _version : [3, 4]});
      should(_values[4]).eql({ _id : 1, id : 1, _version : [5]});
      should(_values[5]).eql({ _id : 2, id : 2, _version : [5]});
    });

    it('should rollback the item : insert & update', () => {
      var _collection = collection();
      var _version = _collection.begin();
      _collection.add({ id : 1, test : 1 }            , _version);
      _collection.upsert({ _id : 1, id : 1, test : 2 }, _version);
      _collection.commit(_version);
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 2, _version : [1]});
      _collection.rollback(_version);
      _values = _collection._getAll();
      should(_values).have.length(1);
      should(_values[0]).eql({ _id : 1, id : 1, test : 2, _version : [1, 2]});
      should(_collection.get(1)).eql(null);
    });

    it('should rollback the item : insert & update & delete', () => {
      var _collection = collection();
      var _version    = _collection.begin();
      _collection.add({ id : 1, test : 1 }            , _version);
      _collection.upsert({ _id : 1, id : 1, test : 2 }, _version);
      _collection.remove(1, _version);
      _collection.commit(_version);
      should(_collection.get(1)).eql(null);
      _collection.rollback(_version);
      _values = _collection._getAll();
      should(_values).have.length(0);
    });

    it('should rollback the item : delete & insert', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });

      var _version = _collection.begin();
      _collection.remove(1, _version);
      _collection.add({ id : 1, test : 2 }, _version);
      _collection.commit(_version);


      should(_collection.get(2)).eql({ _id : 2, id : 1, test : 2, _version : [2]});
      _collection.rollback(_version);
      _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _id : 1, id : 1, test : 1, _version : [1, 2]});
      should(_values[1]).eql({ _id : 2, id : 1, test : 2, _version : [2, 3]});
      should(_values[2]).eql({ _id : 1, id : 1, test : 1, _version : [3]});

      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 1, _version : [3]});
      should(_collection.get(2)).eql(null);
    });
  });

});
