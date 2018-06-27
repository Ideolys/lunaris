const collection = require('../src/collection');

describe('lunaris internal collection', () => {
  it('should return an object', () => {
    var _collection = collection();
    should(_collection).be.an.Object();
    should(_collection.add).be.a.Function();
    should(_collection.remove).be.a.Function();
    should(_collection.clear).be.a.Function();
    should(_collection.get).be.a.Function();
    should(_collection.getAll).be.a.Function();
  });

  it('should return the full collection', () => {
    var _collection = collection();
    should(_collection.getAll()).be.an.Array().and.have.length(0);
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
      var _values = _collection.getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _id : 1, id : 1});
    });

    it('should add multiple items to the collection', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      var _values = _collection.getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[0]).eql({ _id : 1, id : 1});
      should(_values[1]).eql({ _id : 2, id : 2});
    });

    it('should start the index generation from 6', () => {
      var _collection = collection(6);
      _collection.add({ id : 1 });
      var _values = _collection.getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _id : 6, id : 1});

      _collection.add({ id : 2 });
      _values = _collection.getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[1]).eql({ _id : 7, id : 2});
    });

    it('should clear the collection', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      should(_collection.getAll()).be.an.Array().and.have.length(1);

      _collection.clear();
      should(_collection.getAll()).be.an.Array().and.have.length(0);
    });

    it('should clear the collection and clear the index', () => {
      var _collection = collection(6);
      _collection.add({ id : 1 });
      should(_collection.getAll()).be.an.Array().and.have.length(1);

      var _values = _collection.getAll();
      should(_values[0]).eql({ _id : 6, id : 1});

      _collection.clear();
      should(_collection.getAll()).be.an.Array().and.have.length(0);

      _collection.add({ id : 2 });
      _values = _collection.getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _id : 1, id : 2});
    });
  });

  describe('remove()', () => {
    it('should remove the item', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      var _res = _collection.remove(1);
      should(_res).eql(true);
      should(_collection.getAll()).have.length(0);
    });

    it('should remove the item from multiple items', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      var _res = _collection.remove(2);
      should(_res).eql(true);
      var _values = _collection.getAll()
      should(_values).have.length(1);
      should(_values[0]).eql({ _id : 1, id : 1 });
    });
  });

  describe('get()', () => {
    it('should get the item', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      should(_collection.get(1)).eql({ _id : 1, id : 1 });
    });

    it('should get the item from multiple items', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      should(_collection.get(1)).eql({ _id : 1, id : 1 });
      should(_collection.get(2)).eql({ _id : 2, id : 2 });
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
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 2 });
    });

    it('should update the item, multiple items', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });
      _collection.add({ id : 2, test : 2 });
      _collection.upsert({ _id : 2, id : 2, test : 3 });
      should(_collection.get(2)).eql({ _id : 2, id : 2, test : 3 });
    });

    it('should insert the item if the id is not present in the collection', () => {
      var _collection = collection();
      _collection.upsert({ id : 1, test : 2 });
      should(_collection.get(1)).eql({ _id : 1, id : 1, test : 2 });
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

  describe('getFirst()', () => {
    it('should be defined', () => {
      should(collection().getFirst).be.ok();
    });

    it('should return the first item', () => {
      var _collection = collection();
      should(_collection.getFirst()).eql(undefined);
      _collection.add({ id : 1, test : 1 });
      should(_collection.getFirst()).eql({ _id : 1, id : 1, test : 1 });
    });
  });

});
