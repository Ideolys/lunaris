const lunarisExports     = require('../src/exports');
lunarisExports.isBrowser = false;
const collectionModule = require('../src/store/store.collection');
const collection       = collectionModule.collection;
const schema           = require('../lib/_builder/store/schema');
const utils            = require('../src/utils');

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
      var _collection = collection(getPrimaryKey);
      _collection.add({ id : 1 });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, _version : [1]});

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([1]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);
    });

    it('should add multiple items to the collection', () => {
      var _collection = collection(getPrimaryKey);
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, _version : [1]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 2, _version : [2]});

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(2);
      should(_index[0]).eql([1, 2]);
      should(_index[1]).have.lengthOf(2);
      should(_index[1]).eql([1, 2]);
    });

    it('should add multiple items to the collection : inverse', () => {
      var _collection = collection(getPrimaryKey);
      _collection.add({ id : 20 });
      _collection.add({ id : 10 });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 20, _version : [1]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 10, _version : [2]});

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(2);
      should(_index[0]).eql([10, 20]);
      should(_index[1]).have.lengthOf(2);
      should(_index[1]).eql([2, 1]);
    });

    it('should start the id generation from 6', () => {
      var _collection = collection();
      _collection.setCurrentId(6);
      _collection.add({ id : 1 });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _rowId : 1, _id : 6, id : 1, _version : [1]});

      _collection.add({ id : 2 });
      _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[1]).eql({ _rowId : 2, _id : 7, id : 2, _version : [2]});
    });

    it('should clear the collection', () => {
      var _collection = collection(getPrimaryKey);
      _collection.add({ id : 1 });
      should(_collection._getAll()).be.an.Array().and.have.length(1);

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([1]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);

      _collection.clear();
      should(_collection._getAll()).be.an.Array().and.have.length(0);

      _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(0);
      should(_index[1]).have.lengthOf(0);
    });

    it('should clear the collection and the id', () => {
      var _collection = collection();
      _collection.setCurrentId(6);
      _collection.add({ id : 1 });
      should(_collection._getAll()).be.an.Array().and.have.length(1);

      var _values = _collection._getAll();
      should(_values[0]).eql({ _rowId : 1, _id : 6, id : 1, _version : [1]});

      _collection.clear();
      should(_collection._getAll()).be.an.Array().and.have.length(0);

      _collection.add({ id : 2 });
      _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 2, _version : [2]});
    });

    it('should add the value to the collection if no getPrimaryKey Function', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, _version : [1]});

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(0);
      should(_index[1]).have.lengthOf(0);
    });

    it('should add the value to the collection if no id has been returned by the function getPrimaryKey', () => {
      var _collection = collection();
      _collection.add({ label : 'A' });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _rowId : 1, _id : 1, label : 'A', _version : [1]});

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(0);
      should(_index[1]).have.lengthOf(0);
    });

    it('should not duplicate values if the same id has been already used', () => {
      var _collection = collection(getPrimaryKey);
      _collection.add({ id : 2, label : 'A' });
      _collection.add({ id : 2, label : 'B' });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1, 3]});
      should(_values[1]).eql({ _rowId : 2, _id : 1, id : 2, label : 'B', _version : [3]});

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([2]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);
    });

    it('should not duplicate values : insert / upsert', () => {
      var _collection = collection(getPrimaryKey);
      _collection.add({ id : null, label : 'A' });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : null, label : 'A', _version : [1]});

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(0);
      should(_index[0]).eql([]);
      should(_index[1]).have.lengthOf(0);
      should(_index[1]).eql([]);

      _collection.upsert({ _rowId : 1, _id : 1, id : 10, label : 'A', _version : [1]});

      _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : null, label : 'A', _version : [1, 2]});
      should(_values[1]).eql({ _rowId : 2, _id : 1, id : 10  , label : 'A', _version : [2]});

      _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([10]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);
    });

    it('should compute computed property', () => {
      var _obj = [{
        id               : ['<<int>>'],
        label            : ['string'],
        labelCapitalized : [function (obj) {
          return obj.label.toUpperCase();
        }]
      }];

      var _schema = schema.analyzeDescriptor(_obj);

      var _collection = collection(null, false, null, null, _schema.computedsFn);
      _collection.add({ id : 2, label : 'a' });
      _collection.add({ id : 3, label : 'b' });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 2, label : 'a', labelCapitalized : 'A', _version : [1]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 3, label : 'b', labelCapitalized : 'B', _version : [2]});
    });

    it('should compute computed property for upsert', () => {
      var _obj = [{
        id               : ['<<int>>'],
        label            : ['string'],
        labelCapitalized : [function (obj) {
          return obj.label.toUpperCase();
        }]
      }];

      var _schema = schema.analyzeDescriptor(_obj);

      var _collection = collection(getPrimaryKey, false, null, null, _schema.computedsFn);
      _collection.add({ id : 2, label : 'a' });
      _collection.add({ id : 3, label : 'b' });
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 2, label : 'a', labelCapitalized : 'A', _version : [1]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 3, label : 'b', labelCapitalized : 'B', _version : [2]});

      _collection.upsert({ _id : 1, id : 2, label : 'c' });
      _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(3);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 2, label : 'a', labelCapitalized : 'A', _version : [1, 3]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 3, label : 'b', labelCapitalized : 'B', _version : [2]});
      should(_values[2]).eql({ _rowId : 3, _id : 1, id : 2, label : 'c', labelCapitalized : 'C', _version : [3]});
    });

    describe('join / propagate / aggregate', () => {
      it('should join a store', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['@elements']
        };
        var _schema  = schema.analyzeDescriptor(_objectDescriptor);
        var _joinFns = schema.getJoinFns({ elements : { isStoreObject : true }}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

        var _elements         = collection(getPrimaryKey, false , { joins : {}, joinFns : {}, collections : {}});
        var _elementsOverview = collection(getPrimaryKey, false, {
          joins       : _schema.meta.joins,
          joinFns     : _joinFns,
          collections : {
            elements : _elements
          }
        });

        _elements.add({ id : 1, cost : 1 });
        _elements.add({ id : 2, cost : 2 });

        _elementsOverview.add({ id : 1 });
        should(_elementsOverview._getAll()).eql([
          {
            id       : 1,
            elements : [
              { id : 1, cost : 1, _id : 1, _version : [1], _rowId : 1 },
              { id : 2, cost : 2, _id : 2, _version : [2], _rowId : 2 }
            ],
            _id      : 1,
            _version : [3],
            _rowId   : 1
          }
        ]);
      });

      it('should join a store object', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['@elements']
        };
        var _schema  = schema.analyzeDescriptor(_objectDescriptor);
        var _joinFns = schema.getJoinFns({ elements : { isStoreObject : true }}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

        var _elements         = collection(getPrimaryKey, true , { joins : {}, joinFns : {}, collections : {}});
        var _elementsOverview = collection(getPrimaryKey, false, {
          joins       : _schema.meta.joins,
          joinFns     : _joinFns,
          collections : {
            elements : _elements
          }
        });

        _elements.add({ id : 1, cost : 1 });

        _elementsOverview.add({ id : 1 });
        should(_elementsOverview._getAll()).eql([
          {
            id       : 1,
            elements : { id : 1, cost : 1, _id : 1, _version : [1], _rowId : 1 },
            _id      : 1,
            _version : [2],
            _rowId   : 1
          }
        ]);
      });

      it('propagate should be defined', () => {
        var _elements         = collection(getPrimaryKey, true, { joins : {}, joinFns : {}, collections : {}});
        should(_elements.propagate).be.a.Function();
      });

      it('should join a store and propagate insert', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['@elements']
        };
        var _schema  = schema.analyzeDescriptor(_objectDescriptor);
        var _joinFns = schema.getJoinFns({}, _schema.compilation, _schema.compilation, _schema.meta.joins, _schema.meta.externalAggregates);

        var _elements         = collection(getPrimaryKey, false , { joins : {}, joinFns : {}, collections : {}});
        var _elementsOverview = collection(getPrimaryKey, false, {
          joins       : _schema.meta.joins,
          joinFns     : _joinFns,
          collections : {
            elements : _elements
          }
        });

        _elements.add({ id : 1, cost : 1 });
        _elements.add({ id : 2, cost : 2 });

        _elementsOverview.add({ id : 1 });
        should(_elementsOverview._getAll()).eql([
          {
            id       : 1,
            elements : [
              { id : 1, cost : 1, _id : 1, _version : [1], _rowId : 1 },
              { id : 2, cost : 2, _id : 2, _version : [2], _rowId : 2 }
            ],
            _id      : 1,
            _version : [3],
            _rowId   : 1
          }
        ]);

        var _res = _elementsOverview.propagate('elements', { _id : 3, id : 3, cost : 3 }, utils.OPERATIONS.INSERT);
        should(_elementsOverview.getAll()).eql(_res);
        should(_res).eql([
          {
            id       : 1,
            elements : [
              { id : 1, cost : 1, _id : 1, _version : [1], _rowId : 1 },
              { id : 2, cost : 2, _id : 2, _version : [2], _rowId : 2 },
              { id : 3, cost : 3, _id : 3 }
            ],
            _id      : 1,
            _version : [4],
            _rowId   : 2
          }
        ]);
      });

      it('should join a store and propagate insert : multiple data', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['@elements']
        };
        var _schema  = schema.analyzeDescriptor(_objectDescriptor);
        var _joinFns = schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

        var _elements         = collection(getPrimaryKey, false , { joins : {}, joinFns : {}, collections : {}});
        var _elementsOverview = collection(getPrimaryKey, false, {
          joins       : _schema.meta.joins,
          joinFns     : _joinFns,
          collections : {
            elements : _elements
          }
        });

        _elements.add({ id : 1, cost : 1 });
        _elements.add({ id : 2, cost : 2 });

        _elementsOverview.add({ id : 1 });
        should(_elementsOverview._getAll()).eql([
          {
            id       : 1,
            elements : [
              { id : 1, cost : 1, _id : 1, _version : [1], _rowId : 1 },
              { id : 2, cost : 2, _id : 2, _version : [2], _rowId : 2 }
            ],
            _id      : 1,
            _version : [3],
            _rowId   : 1
          }
        ]);

        var _res = _elementsOverview.propagate('elements', [
          { _id : 3, id : 3, cost : 3 },
          { _id : 4, id : 4, cost : 4 }
        ], utils.OPERATIONS.INSERT);
        should(_elementsOverview.getAll()).eql(_res);
        should(_res).eql([
          {
            id       : 1,
            elements : [
              { id : 1, cost : 1, _id : 1, _version : [1], _rowId : 1 },
              { id : 2, cost : 2, _id : 2, _version : [2], _rowId : 2 },
              { id : 3, cost : 3, _id : 3 },
              { id : 4, cost : 4, _id : 4 }
            ],
            _id      : 1,
            _version : [4],
            _rowId   : 2
          }
        ]);
      });

      it('should join a store and propagate update', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['@elements']
        };
        var _schema  = schema.analyzeDescriptor(_objectDescriptor);
        var _joinFns = schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

        var _elements         = collection(getPrimaryKey, false , { joins : {}, joinFns : {}, collections : {}});
        var _elementsOverview = collection(getPrimaryKey, false, {
          joins       : _schema.meta.joins,
          joinFns     : _joinFns,
          collections : {
            elements : _elements
          }
        });

        _elements.add({ id : 1, cost : 1 });
        _elements.add({ id : 2, cost : 2 });

        _elementsOverview.add({ id : 1 });
        should(_elementsOverview._getAll()).eql([
          {
            id       : 1,
            elements : [
              { id : 1, cost : 1, _id : 1, _version : [1], _rowId : 1 },
              { id : 2, cost : 2, _id : 2, _version : [2], _rowId : 2 }
            ],
            _id      : 1,
            _version : [3],
            _rowId   : 1
          }
        ]);

        var _res = _elementsOverview.propagate('elements', { _id : 2, id : 2, cost : 3 }, utils.OPERATIONS.UPDATE);
        should(_elementsOverview.getAll()).eql(_res);
        should(_res).eql([
          {
            id       : 1,
            elements : [
              { id : 1, cost : 1, _id : 1, _version : [1], _rowId : 1},
              { id : 2, cost : 3, _id : 2}
            ],
            _id      : 1,
            _version : [4],
            _rowId   : 2
          }
        ]);
      });

      it('should join a store and propagate update : multiple data', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['@elements']
        };
        var _schema  = schema.analyzeDescriptor(_objectDescriptor);
        var _joinFns = schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

        var _elements         = collection(getPrimaryKey, false , { joins : {}, joinFns : {}, collections : {}});
        var _elementsOverview = collection(getPrimaryKey, false, {
          joins       : _schema.meta.joins,
          joinFns     : _joinFns,
          collections : {
            elements : _elements
          }
        });

        _elements.add({ id : 1, cost : 1 });
        _elements.add({ id : 2, cost : 2 });

        _elementsOverview.add({ id : 1 });
        should(_elementsOverview._getAll()).eql([
          {
            id       : 1,
            elements : [
              { id : 1, cost : 1, _id : 1, _version : [1], _rowId : 1 },
              { id : 2, cost : 2, _id : 2, _version : [2], _rowId : 2 }
            ],
            _id      : 1,
            _version : [3],
            _rowId   : 1
          }
        ]);

        var _res = _elementsOverview.propagate('elements', [
          { _id : 2, id : 2, cost : 3 },
          { _id : 1, id : 1, cost : 2 }
        ], utils.OPERATIONS.UPDATE);
        should(_elementsOverview.getAll()).eql(_res);
        should(_res).eql([
          {
            id       : 1,
            elements : [
              { id : 2, cost : 3, _id : 2 },
              { id : 1, cost : 2, _id : 1 },
            ],
            _id      : 1,
            _version : [4],
            _rowId   : 2
          }
        ]);
      });

      it('should join a store and propagate delete', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['@elements']
        };
        var _schema  = schema.analyzeDescriptor(_objectDescriptor);
        var _joinFns = schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

        var _elements         = collection(getPrimaryKey, false , { joins : {}, joinFns : {}, collections : {}});
        var _elementsOverview = collection(getPrimaryKey, false, {
          joins       : _schema.meta.joins,
          joinFns     : _joinFns,
          collections : {
            elements : _elements
          }
        });

        _elements.add({ id : 1, cost : 1 });
        _elements.add({ id : 2, cost : 2 });

        _elementsOverview.add({ id : 1 });
        should(_elementsOverview._getAll()).eql([
          {
            id       : 1,
            elements : [
              { id : 1, cost : 1, _id : 1, _version : [1], _rowId : 1 },
              { id : 2, cost : 2, _id : 2, _version : [2], _rowId : 2 }
            ],
            _id      : 1,
            _version : [3],
            _rowId   : 1
          }
        ]);

        var _res = _elementsOverview.propagate('elements', { _id : 1 }, utils.OPERATIONS.DELETE);
        should(_elementsOverview.getAll()).eql(_res);
        should(_res).eql([
          {
            id       : 1,
            elements : [
              { id : 2, cost : 2, _id : 2, _version : [2], _rowId : 2 }
            ],
            _id      : 1,
            _version : [4],
            _rowId   : 2
          }
        ]);
      });

      it('should join a store and propagate delete : multiple data', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['@elements']
        };
        var _schema  = schema.analyzeDescriptor(_objectDescriptor);
        var _joinFns = schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

        var _elements         = collection(getPrimaryKey, false , { joins : {}, joinFns : {}, collections : {}});
        var _elementsOverview = collection(getPrimaryKey, false, {
          joins       : _schema.meta.joins,
          joinFns     : _joinFns,
          collections : {
            elements : _elements
          }
        });

        _elements.add({ id : 1, cost : 1 });
        _elements.add({ id : 2, cost : 2 });

        _elementsOverview.add({ id : 1 });
        should(_elementsOverview._getAll()).eql([
          {
            id       : 1,
            elements : [
              { id : 1, cost : 1, _id : 1, _version : [1], _rowId : 1 },
              { id : 2, cost : 2, _id : 2, _version : [2], _rowId : 2 }
            ],
            _id      : 1,
            _version : [3],
            _rowId   : 1
          }
        ]);

        var _res = _elementsOverview.propagate('elements', [{ _id : 1 }, { _id : 2 }], utils.OPERATIONS.DELETE);
        should(_elementsOverview.getAll()).eql(_res);
        should(_res).eql([
          {
            id       : 1,
            elements : [],
            _id      : 1,
            _version : [4],
            _rowId   : 2
          }
        ]);
      });

      it('should set aggregate values', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          sum      : ['sumAgg', 'elements.cost'],
          elements : ['array', {
            id   : ['<<int>>'],
            cost : ['number']
          }]
        };
        var _schema   = schema.analyzeDescriptor(_objectDescriptor);
        var _elements = collection(getPrimaryKey, false , { joins : {}, joinFns : {}, collections : {}}, _schema.aggregateFn);

        _elements.add({
          id       : 1,
          elements : [
            { id : 1, cost : 1 },
            { id : 2, cost : 2 },
            { id : 3, cost : 6 },
          ]
        });

        should(_elements._getAll()).eql([
          {
            id         : 1,
            sum        : 9,
            _sum_state : {
              value : 9
            },
            elements : [
              { id : 1, cost : 1 },
              { id : 2, cost : 2 },
              { id : 3, cost : 6 },
            ],
            _id      : 1,
            _version : [1],
            _rowId   : 1
          }
        ]);
      });

      it('should set aggregate values and join values', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          sum      : ['sumAgg', 'elements.cost'],
          elements : ['array', {
            id   : ['<<int>>'],
            cost : ['number']
          }],
          total : ['sumAgg', '@elements.cost']
        };
        var _schema   = schema.analyzeDescriptor(_objectDescriptor);
        var _joinFns  = schema.getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);
        var _elements         = collection(getPrimaryKey, false , { joins : {}, joinFns : {}, collections : {}});
        var _elementsOverview = collection(
          getPrimaryKey,
          false,
          {
            joins       : _schema.meta.joins,
            joinFns     : _joinFns,
            collections : {
              elements : _elements
            }
          },
          _schema.aggregateFn
        );

        _elements.add({ id : 1, cost : 1 });
        _elements.add({ id : 2, cost : 2 });

        _elementsOverview.add({
          id       : 1,
          elements : [
            { id : 1, cost : 1 },
            { id : 2, cost : 2 },
            { id : 3, cost : 6 },
          ]
        });

        should(_elementsOverview._getAll()).eql([
          {
            id         : 1,
            sum        : 9,
            _sum_state : {
              value : 9
            },
            elements : [
              { id : 1, cost : 1 },
              { id : 2, cost : 2 },
              { id : 3, cost : 6 },
            ],
            total        : 3,
            _total_state : {
              value : 3
            },
            join_elements : [
              { id : 1, cost : 1 , _id : 1, _version : [1], _rowId : 1 },
              { id : 2, cost : 2 , _id : 2, _version : [2], _rowId : 2 },
            ],
            _id      : 1,
            _version : [3],
            _rowId   : 1
          }
        ]);
      });

    });
  });

  describe('references', () => {

    it('propagateReferences should be defined', () => {
      var _elements = collection(getPrimaryKey, true, { joins : {}, joinFns : {}, collections : {}});
      should(_elements.propagateReferences).be.a.Function();
    });

    it('should reference a store', () => {
      var _objectDescriptor = [{
        id       : ['<<id>>'],
        elements : ['array', 'ref', '@reference']
      }];
      var _referencedDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _schemaObj = schema.analyzeDescriptor(_objectDescriptor);
      var _schemaRef = schema.analyzeDescriptor(_referencedDescriptor);

      var _referenceCollection = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}});
      var _objectCollection    = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}}, null, null, null, {
        referencesFn     : _schemaObj.referencesFn,
        getPrimaryKeyFns : { reference : _schemaRef.getPrimaryKey },
        collections      : {
          reference : _referenceCollection
        }
      });

      _referenceCollection.add({ id : 1, label : 'A' });
      _referenceCollection.add({ id : 2, label : 'B' });

      _objectCollection.add({ id : 1, elements : [{ id : 1 }] });
      should(_objectCollection._getAll()).eql([
        {
          id       : 1,
          elements : [
            { id : 1, label : 'A', _id : 1, _version : [1], _rowId : 1 }
          ],
          _id      : 1,
          _version : [3],
          _rowId   : 1
        }
      ]);

      should(_objectCollection.getIndexReferences()).eql({
        reference : [[1], [[1]]]
      });
    });

    it('should reference a store object', () => {
      var _objectDescriptor = [{
        id      : ['<<id>>'],
        element : ['object', 'ref', '@reference']
      }];
      var _referencedDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _schemaObj = schema.analyzeDescriptor(_objectDescriptor);
      var _schemaRef = schema.analyzeDescriptor(_referencedDescriptor);

      var _referenceCollection = collection(getPrimaryKey, true, { joins : {}, joinFns : {}, collections : {}});
      var _objectCollection    = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}}, null, null, null, {
        referencesFn     : _schemaObj.referencesFn,
        getPrimaryKeyFns : { reference : _schemaRef.getPrimaryKey },
        collections      : {
          reference : _referenceCollection
        }
      });

      _referenceCollection.add({ id : 1, label : 'A' });
      _objectCollection.add({ id : 1, element : { id : 1 } });

      should(_objectCollection._getAll()).eql([
        {
          id       : 1,
          element  : { id : 1, label : 'A', _id : 1, _version : [1], _rowId : 1 },
          _id      : 1,
          _version : [2],
          _rowId   : 1
        }
      ]);

      should(_objectCollection.getIndexReferences()).eql({
        reference : [[1], [[1]]]
      });
    });

    it('should reference a store and propagate multiple values', () => {
      var _objectDescriptor = [{
        id       : ['<<id>>'],
        elements : ['array', 'ref', '@reference']
      }];
      var _referencedDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _schemaObj = schema.analyzeDescriptor(_objectDescriptor);
      var _schemaRef = schema.analyzeDescriptor(_referencedDescriptor);

      var _referenceCollection = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}});
      var _objectCollection    = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}}, null, null, null, {
        referencesFn     : _schemaObj.referencesFn,
        getPrimaryKeyFns : { reference : _schemaRef.getPrimaryKey },
        collections      : {
          reference : _referenceCollection
        }
      });

      _referenceCollection.add({ id : 1, label : 'A' });
      _referenceCollection.add({ id : 2, label : 'B' });
      _referenceCollection.add({ id : 3, label : 'C' });

      _objectCollection.add({ id : 1, elements : [{ id : 1 }, { id : 2 }, { id : 3 }]});
      should(_objectCollection._getAll()).eql([
        {
          id       : 1,
          elements : [
            { id : 1, label : 'A', _id : 1, _version : [1], _rowId : 1 },
            { id : 2, label : 'B', _id : 2, _version : [2], _rowId : 2 },
            { id : 3, label : 'C', _id : 3, _version : [3], _rowId : 3 }
          ],
          _id      : 1,
          _version : [4],
          _rowId   : 1
        }
      ]);

      should(_objectCollection.getIndexReferences()).eql({
        reference : [[1, 2, 3], [[1], [1], [1]]]
      });
    });

    it('should reference a store and propagate multiple stores', () => {
      var _objectDescriptor = [{
        id       : ['<<id>>'],
        elements : ['array', 'ref', '@reference'],
        type     : ['object', 'ref', '@type']
      }];
      var _referencedDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _typeDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _schemaObj  = schema.analyzeDescriptor(_objectDescriptor);
      var _schemaRef  = schema.analyzeDescriptor(_referencedDescriptor);
      var _schemaType = schema.analyzeDescriptor(_typeDescriptor);

      var _referenceCollection = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}});
      var _typeCollection      = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}});
      var _objectCollection    = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}}, null, null, null, {
        referencesFn     : _schemaObj.referencesFn,
        getPrimaryKeyFns : { reference : _schemaRef.getPrimaryKey, type : _schemaType.getPrimaryKey },
        collections      : {
          reference : _referenceCollection,
          type      : _typeCollection
        }
      });

      _referenceCollection.add({ id : 1, label : 'A' });
      _referenceCollection.add({ id : 2, label : 'B' });
      _referenceCollection.add({ id : 3, label : 'C' });

      _typeCollection.add({ id : 1, label : 'Type_A' });
      _typeCollection.add({ id : 2, label : 'Type_B' });

      _objectCollection.add({ id : 1, elements : [{ id : 1 }, { id : 2 }, { id : 3 }], type : { id : 2 } });
      should(_objectCollection._getAll()).eql([
        {
          id       : 1,
          elements : [
            { id : 1, label : 'A', _id : 1, _version : [1], _rowId : 1 },
            { id : 2, label : 'B', _id : 2, _version : [2], _rowId : 2 },
            { id : 3, label : 'C', _id : 3, _version : [3], _rowId : 3 }
          ],
          type     : { id : 2, label : 'Type_B', _id : 2, _version : [5], _rowId : 2 },
          _id      : 1,
          _version : [6],
          _rowId   : 1
        }
      ]);

      should(_objectCollection.getIndexReferences()).eql({
        reference : [[1, 2, 3], [[1], [1], [1]]],
        type      : [[2], [[1]]]
      });
    });

    it('should update refrences index when updating', () => {
      var _objectDescriptor = [{
        id       : ['<<id>>'],
        elements : ['array', 'ref', '@reference'],
        type     : ['object', 'ref', '@type']
      }];
      var _referencedDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _typeDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _schemaObj  = schema.analyzeDescriptor(_objectDescriptor);
      var _schemaRef  = schema.analyzeDescriptor(_referencedDescriptor);
      var _schemaType = schema.analyzeDescriptor(_typeDescriptor);

      var _referenceCollection = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}});
      var _typeCollection      = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}});
      var _objectCollection    = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}}, null, null, null, {
        referencesFn     : _schemaObj.referencesFn,
        getPrimaryKeyFns : { reference : _schemaRef.getPrimaryKey, type : _schemaType.getPrimaryKey },
        collections      : {
          reference : _referenceCollection,
          type      : _typeCollection
        }
      });

      _referenceCollection.add({ id : 1, label : 'A' });
      _referenceCollection.add({ id : 2, label : 'B' });
      _referenceCollection.add({ id : 3, label : 'C' });

      _typeCollection.add({ id : 1, label : 'Type_A' });
      _typeCollection.add({ id : 2, label : 'Type_B' });

      _objectCollection.add({ id : 1, elements : [{ id : 1 }, { id : 2 }, { id : 3 }], type : { id : 2 } });
      should(_objectCollection._getAll()).eql([
        {
          id       : 1,
          elements : [
            { id : 1, label : 'A', _id : 1, _version : [1], _rowId : 1 },
            { id : 2, label : 'B', _id : 2, _version : [2], _rowId : 2 },
            { id : 3, label : 'C', _id : 3, _version : [3], _rowId : 3 }
          ],
          type     : { id : 2, label : 'Type_B', _id : 2, _version : [5], _rowId : 2 },
          _id      : 1,
          _version : [6],
          _rowId   : 1
        }
      ]);

      should(_objectCollection.getIndexReferences()).eql({
        reference : [[1, 2, 3], [[1], [1], [1]]],
        type      : [[2], [[1]]]
      });

      _objectCollection.upsert({
        id       : 1,
        elements : [
          { id : 1, label : 'A', _id : 1, _version : [1], _rowId : 1 },
          { id : 3, label : 'C', _id : 3, _version : [3], _rowId : 3 },
          { id : 4 }
        ],
        type     : { id : 2, label : 'Type_B', _id : 2, _version : [5], _rowId : 2 },
        _id      : 1,
        _version : [6],
        _rowId   : 1
      });

      should(_objectCollection.getIndexReferences()).eql({
        reference : [[1, 3], [[1], [1]]],
        type      : [[2], [[1]]]
      });
    });

    it('should update refrences index when deleting', () => {
      var _objectDescriptor = [{
        id       : ['<<id>>'],
        elements : ['array', 'ref', '@reference'],
        type     : ['object', 'ref', '@type']
      }];
      var _referencedDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _typeDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _schemaObj  = schema.analyzeDescriptor(_objectDescriptor);
      var _schemaRef  = schema.analyzeDescriptor(_referencedDescriptor);
      var _schemaType = schema.analyzeDescriptor(_typeDescriptor);

      var _referenceCollection = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}});
      var _typeCollection      = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}});
      var _objectCollection    = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}}, null, null, null, {
        referencesFn     : _schemaObj.referencesFn,
        getPrimaryKeyFns : { reference : _schemaRef.getPrimaryKey, type : _schemaType.getPrimaryKey },
        collections      : {
          reference : _referenceCollection,
          type      : _typeCollection
        }
      });

      _referenceCollection.add({ id : 1, label : 'A' });
      _referenceCollection.add({ id : 2, label : 'B' });
      _referenceCollection.add({ id : 3, label : 'C' });

      _typeCollection.add({ id : 1, label : 'Type_A' });
      _typeCollection.add({ id : 2, label : 'Type_B' });

      _objectCollection.add({ id : 1, elements : [{ id : 1 }, { id : 2 }, { id : 3 }], type : { id : 2 } });
      should(_objectCollection._getAll()).eql([
        {
          id       : 1,
          elements : [
            { id : 1, label : 'A', _id : 1, _version : [1], _rowId : 1 },
            { id : 2, label : 'B', _id : 2, _version : [2], _rowId : 2 },
            { id : 3, label : 'C', _id : 3, _version : [3], _rowId : 3 }
          ],
          type     : { id : 2, label : 'Type_B', _id : 2, _version : [5], _rowId : 2 },
          _id      : 1,
          _version : [6],
          _rowId   : 1
        }
      ]);

      should(_objectCollection.getIndexReferences()).eql({
        reference : [[1, 2, 3], [[1], [1], [1]]],
        type      : [[2], [[1]]]
      });

      _objectCollection.remove({ _id : 1 });

      should(_objectCollection.getIndexReferences()).eql({
        reference : [[], []],
        type      : [[], []]
      });
    });

    it('should update refrences index when updating &nd deleting multiple objects', () => {
      var _objectDescriptor = [{
        id       : ['<<id>>'],
        elements : ['array', 'ref', '@reference'],
        type     : ['object', 'ref', '@type']
      }];
      var _referencedDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _typeDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _schemaObj  = schema.analyzeDescriptor(_objectDescriptor);
      var _schemaRef  = schema.analyzeDescriptor(_referencedDescriptor);
      var _schemaType = schema.analyzeDescriptor(_typeDescriptor);

      var _referenceCollection = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}});
      var _typeCollection      = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}});
      var _objectCollection    = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}}, null, null, null, {
        referencesFn     : _schemaObj.referencesFn,
        getPrimaryKeyFns : { reference : _schemaRef.getPrimaryKey, type : _schemaType.getPrimaryKey },
        collections      : {
          reference : _referenceCollection,
          type      : _typeCollection
        }
      });

      _referenceCollection.add({ id : 1, label : 'A' });
      _referenceCollection.add({ id : 2, label : 'B' });
      _referenceCollection.add({ id : 3, label : 'C' });
      _referenceCollection.add({ id : 4, label : 'D' });
      _referenceCollection.add({ id : 5, label : 'E' });

      _typeCollection.add({ id : 1, label : 'Type_A' });
      _typeCollection.add({ id : 2, label : 'Type_B' });

      _objectCollection.add({ id : 1, elements : [{ id : 1 }, { id : 2 }, { id : 3 }], type : { id : 2 } });
      _objectCollection.add({ id : 2, elements : [{ id : 1 }, { id : 4 }], type : { id : 2 } });
      _objectCollection.add({ id : 3, elements : [{ id : 5 }], type : { id : 1 } });

      should(_objectCollection.getIndexReferences()).eql({
        reference : [
          [1, 2, 3, 4, 5],
          [[1, 2], [1], [1], [2], [3]]
        ],
        type : [
          [1, 2],
          [[3], [1, 2]]
        ]
      });

      var _obj2 = utils.clone(_objectCollection.get(2));
      _obj2.elements.shift();
      _obj2.elements.push({ id : 3 });
      _obj2.type = null;
      _objectCollection.upsert(_obj2);

      var _obj3 = utils.clone(_objectCollection.get(3));
      _obj3.type = null;
      _objectCollection.upsert(_obj3);

      should(_objectCollection.getIndexReferences()).eql({
        reference : [
          [1, 2, 3, 4, 5],
          [[1], [1], [1, 2], [2], [3]]
        ],
        type : [
          [2],
          [[1]]
        ]
      });
    });

    it('should update refrences index when clearing', () => {
      var _objectDescriptor = [{
        id       : ['<<id>>'],
        elements : ['array', 'ref', '@reference'],
        type     : ['object', 'ref', '@type']
      }];
      var _referencedDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _typeDescriptor = [{
        id    : ['<<id>>'],
        label : ['string']
      }];
      var _schemaObj  = schema.analyzeDescriptor(_objectDescriptor);
      var _schemaRef  = schema.analyzeDescriptor(_referencedDescriptor);
      var _schemaType = schema.analyzeDescriptor(_typeDescriptor);

      var _referenceCollection = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}});
      var _typeCollection      = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}});
      var _objectCollection    = collection(getPrimaryKey, false, { joins : {}, joinFns : {}, collections : {}}, null, null, null, {
        referencesFn     : _schemaObj.referencesFn,
        getPrimaryKeyFns : { reference : _schemaRef.getPrimaryKey, type : _schemaType.getPrimaryKey },
        collections      : {
          reference : _referenceCollection,
          type      : _typeCollection
        }
      });

      _referenceCollection.add({ id : 1, label : 'A' });
      _referenceCollection.add({ id : 2, label : 'B' });
      _referenceCollection.add({ id : 3, label : 'C' });

      _typeCollection.add({ id : 1, label : 'Type_A' });
      _typeCollection.add({ id : 2, label : 'Type_B' });

      _objectCollection.add({ id : 1, elements : [{ id : 1 }, { id : 2 }, { id : 3 }], type : { id : 2 } });
      should(_objectCollection._getAll()).eql([
        {
          id       : 1,
          elements : [
            { id : 1, label : 'A', _id : 1, _version : [1], _rowId : 1 },
            { id : 2, label : 'B', _id : 2, _version : [2], _rowId : 2 },
            { id : 3, label : 'C', _id : 3, _version : [3], _rowId : 3 }
          ],
          type     : { id : 2, label : 'Type_B', _id : 2, _version : [5], _rowId : 2 },
          _id      : 1,
          _version : [6],
          _rowId   : 1
        }
      ]);

      should(_objectCollection.getIndexReferences()).eql({
        reference : [[1, 2, 3], [[1], [1], [1]]],
        type      : [[2], [[1]]]
      });

      _objectCollection.clear();

      should(_objectCollection.getIndexReferences()).eql({});
    });

  });

  describe('remove()', () => {
    it('should remove the item', () => {
      var _collection = collection(getPrimaryKey);
      _collection.add({ id : 10 });

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([10]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);

      _collection.remove({ _id : 1 });
      var _data = _collection._getAll();
      should(_data).have.length(1);
      should(_data[0]).eql({ _rowId : 1, _id : 1, id : 10, _version : [1, 2]});
      should(_collection.get(2)).eql(null);

      _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(0);
      should(_index[0]).eql([]);
      should(_index[1]).have.lengthOf(0);
      should(_index[1]).eql([]);
    });

    it('should remove the item by PK', () => {
      var _collection = collection(getPrimaryKey);
      _collection.add({ id : 10 });

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([10]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);

      _collection.remove({ id : 10 }, null, true);
      var _data = _collection._getAll();
      should(_data).have.length(1);
      should(_data[0]).eql({ _rowId : 1,_id : 1, id : 10, _version : [1, 2]});
      should(_collection.get(2)).eql(null);

      _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(0);
      should(_index[0]).eql([]);
      should(_index[1]).have.lengthOf(0);
      should(_index[1]).eql([]);
    });

    it('should remove the item from multiple items', () => {
      var _collection = collection(getPrimaryKey);
      _collection.add({ id : 10 });
      _collection.add({ id : 20 });
      _collection.remove({ _id : 2 });
      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 10, _version : [1]   });
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 20, _version : [2, 3]});
      should(_collection.get(2)).eql(null);

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([10]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);
    });

    it('should remove items within the same transaction', () => {
      var _collection = collection(getPrimaryKey);
      var _version = _collection.begin();
      _collection.add({ id : 10 }, _version);
      _collection.add({ id : 20 }, _version);
      _collection.commit(_version);

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(2);
      should(_index[0]).eql([10, 20]);
      should(_index[1]).have.lengthOf(2);
      should(_index[1]).eql([1, 2]);

      _version = _collection.begin();
      _collection.remove({ _id : 2 }, _version);
      _collection.remove({ _id : 1 }, _version);
      _collection.commit(_version);

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 10, _version : [1, 2]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 20, _version : [1, 2]});
      should(_collection.get(1)).eql(null);
      should(_collection.get(2)).eql(null);

      _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(0);
      should(_index[0]).eql([]);
      should(_index[1]).have.lengthOf(0);
      should(_index[1]).eql([]);
    });
  });

  describe('get()', () => {
    it('should get the item', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      should(_collection.get(1)).eql({ _rowId : 1, _id : 1, id : 1, _version : [1]});
    });

    it('should get the item from multiple items', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      should(_collection.get(1)).eql({ _rowId : 1, _id : 1, id : 1, _version : [1]});
      should(_collection.get(2)).eql({ _rowId : 2, _id : 2, id : 2, _version : [2]});
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
      _collection.remove({ _id : 1 });
      _collection.upsert({ _id : 2, id : 2, label : 'A' });
      _collection.add({ id : 3 });

      var _items = _collection.getAll();
      should(_items).be.an.Array().and.have.lengthOf(2);
      should(_items[0]).eql({ _rowId : 3, _id : 2, id : 2, label : 'A', _version : [3] });
      should(_items[1]).eql({ _rowId : 4, _id : 3, id : 3, _version : [4] });
    });

    it('should return the valid items in the collection filtered by ids', () => {
      var _collection = collection();
      _collection.add({ id : 1 });
      _collection.add({ id : 2 });
      _collection.remove({ _id : 1 });
      _collection.upsert({ _rowId : 3, _id : 2, id : 2, label : 'A' });

      var _items = _collection.getAll([1, 2]);
      should(_items).be.an.Array().and.have.lengthOf(1);
      should(_items[0]).eql({ _rowId : 3, _id : 2, id : 2, label : 'A', _version : [3] });
    });

    it('should return the valid items in the collection filtered by ids with PK', () => {
      var _collection = collection(item => { return item.id; });
      _collection.add({ id : 10 });
      _collection.add({ id : 20 });
      _collection.add({ id : 30 });
      _collection.remove({ _id : 1 });
      _collection.upsert({ _rowId : 3, _id : 2, id : 20, label : 'A' });

      var _items = _collection.getAll([10, 20, 30], true);
      should(_items).be.an.Array().and.have.lengthOf(2);
      should(_items[0]).eql({ _rowId : 3, _id : 3, id : 30, _version : [3] });
      should(_items[1]).eql({ _rowId : 4, _id : 2, id : 20, label : 'A', _version : [4] });
    });

    it('should return the valid items in the collection filtered by ids with PK : fallback to _id if no getPrimaryKey function', () => {
      var _collection = collection();
      _collection.add({ id : 10 });
      _collection.add({ id : 20 });
      _collection.add({ id : 30 });
      _collection.remove({ _id : 1 });
      _collection.upsert({ _rowId : 3, _id : 2, id : 20, label : 'A' });

      var _items = _collection.getAll([10, 20, 30], true);
      should(_items).be.an.Array().and.have.lengthOf(0);
    });

    it('should return the valid items in the collection filtered by ids', () => {
      var _collection = collection();
      _collection.add({ id : 10 });
      _collection.add({ id : 20 });
      _collection.add({ id : 30 });
      _collection.remove({ _id : 1 });
      _collection.upsert({ _rowId : 3, _id : 2, id : 20, label : 'A' });

      var _items = _collection.getAll([]);
      should(_items).be.an.Array().and.have.lengthOf(0);
    });

    it('should return the valid items in the collection filtered by ids with PK', () => {
      var _collection = collection();
      _collection.add({ id : 10 });
      _collection.add({ id : 20 });
      _collection.add({ id : 30 });
      _collection.remove({ _id : 1 });
      _collection.upsert({ _rowId : 3, _id : 2, id : 20, label : 'A' });

      var _items = _collection.getAll([], true);
      should(_items).be.an.Array().and.have.lengthOf(0);
    });
  });

  describe('upsert()', () => {
    it('should update the item', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });
      _collection.upsert({ _id : 1, id : 1, test : 2 });
      should(_collection.get(1)).eql({ _rowId : 2, _id : 1, id : 1, test : 2, _version : [2]});

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 1, _version : [1, 2]});
    });

    it('should update the item, multiple items', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });
      _collection.add({ id : 2, test : 2 });
      _collection.upsert({ _id : 2, id : 2, test : 3 });
      should(_collection.get(2)).eql({ _rowId : 3, _id : 2, id : 2, test : 3, _version : [3]});

      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 1, _version : [1]   });
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 2, test : 2, _version : [2, 3]});
      should(_values[2]).eql({ _rowId : 3, _id : 2, id : 2, test : 3, _version : [3]   });
    });

    it('should not update an older version of the item', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });
      _collection.upsert({ _id : 1, id : 1, test : 2 });
      _collection.upsert({ _id : 1, id : 1, test : 3 });
      should(_collection.get(1)).eql({ _rowId : 3, _id : 1, id : 1, test : 3, _version : [3]});

      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 1, _version : [1, 2]});
      should(_values[1]).eql({ _rowId : 2, _id : 1, id : 1, test : 2, _version : [2, 3]});
      should(_values[2]).eql({ _rowId : 3, _id : 1, id : 1, test : 3, _version : [3]   });
    });

    it('should insert the item if the id is not present in the collection', () => {
      var _collection = collection();
      _collection.upsert({ id : 1, test : 2 });
      should(_collection.get(1)).eql({ _rowId : 1, _id : 1, id : 1, test : 2, _version : [1]});
    });

    it('should update the item with primaryKey index', () => {
      var _collection = collection(null, getPrimaryKey);
      _collection.add({ id : 1, test : 1 });
      _collection.upsert({ _id : 1, id : 1, test : 2 });

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 1, _version : [1, 2]});
      should(_values[1]).eql({ _rowId : 2, _id : 1, id : 1, test : 2, _version : [2]});
    });

    it('should update the item with primaryKey index and commit/begin', () => {
      var _collection = collection(null, getPrimaryKey);
      _collection.add({ id : 1, test : 1 });
      var _version = _collection.begin();
      _collection.upsert({ _id : 1, id : 1, test : 2 }, _version);
      _collection.commit(_version);

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 1, _version : [1, 2]});
      should(_values[1]).eql({ _rowId : 2, _id : 1, id : 1, test : 2, _version : [2]});
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

  describe('getCurrentRowId()', () => {
    it('should be defined', () => {
      should(collection().getCurrentRowId).be.ok();
    });

    it('should return the default id', () => {
      should(collection().getCurrentRowId()).eql(1);
    });

    it('should return the next id after insert', () => {
      var _collection = collection();
      should(_collection.getCurrentRowId()).eql(1);
      _collection.add({ id : 1, test : 1 });
      should(_collection.getCurrentRowId()).eql(2);
    });
  });

  describe('setData()', () => {
    it('should be defined', () => {
      should(collection().setData).be.ok();
    });

    it('should set data', () => {
      var _collection = collection();
      should(_collection._getAll()).eql([]);
      _collection.setData([{ _id : 1, id : 1, _version : [1] }]);
      should(_collection._getAll()).eql([
        { _id : 1, id : 1, _version : [1] }
      ]);
    });
  });

  describe('setIndexId()', () => {
    it('should be defined', () => {
      should(collection().setIndexId).be.ok();
    });

    it('should set index id', () => {
      var _collection = collection();
      should(_collection.getIndexId()).eql([
        [], []
      ]);
      _collection.setIndexId([[1], [1]]);
      should(_collection.getIndexId()).eql([
        [1], [1]
      ]);
    });
  });

  describe('setIndexIdValue()', () => {
    it('should be defined', () => {
      should(collection().setIndexIdValue).be.ok();
    });

    it('should not set index id value', () => {
      var _collection = collection();
      should(_collection.getIndexId()).eql([
        [], []
      ]);
      _collection.setIndexIdValue(1, 2);
      should(_collection.getIndexId()).eql([
        [], []
      ]);
    });

    it('should set index id value', () => {
      var _collection = collection((item) => {
        return item.id;
      });
      should(_collection.getIndexId()).eql([
        [], []
      ]);

      _collection.add({ id : '_1', label : 'A' });

      should(_collection.getIndexId()).eql([
        ['_1'], [1]
      ]);

      _collection.setIndexIdValue(1, 2);
      should(_collection.getIndexId()).eql([
        [2], [1]
      ]);
    });

    it('should set index id value = 0', () => {
      var _collection = collection((item) => {
        return item.id;
      });
      should(_collection.getIndexId()).eql([
        [], []
      ]);

      _collection.add({ id : '_1', label : 'A' });

      should(_collection.getIndexId()).eql([
        ['_1'], [1]
      ]);

      _collection.setIndexIdValue(1, 0);
      should(_collection.getIndexId()).eql([
        [0], [1]
      ]);
    });

    it('should not set index id value if key = null', () => {
      var _collection = collection((item) => {
        return item.id;
      });
      should(_collection.getIndexId()).eql([
        [], []
      ]);

      _collection.add({ id : '_1', label : 'A' });

      should(_collection.getIndexId()).eql([
        ['_1'], [1]
      ]);

      _collection.setIndexIdValue(null, 0);
      should(_collection.getIndexId()).eql([
        ['_1'], [1]
      ]);
    });

    it('should not set index id value if key = undefined', () => {
      var _collection = collection((item) => {
        return item.id;
      });
      should(_collection.getIndexId()).eql([
        [], []
      ]);

      _collection.add({ id : '_1', label : 'A' });

      should(_collection.getIndexId()).eql([
        ['_1'], [1]
      ]);

      _collection.setIndexIdValue(undefined, 0);
      should(_collection.getIndexId()).eql([
        ['_1'], [1]
      ]);
    });

    it('should not set index id value if value = undefined', () => {
      var _collection = collection((item) => {
        return item.id;
      });
      should(_collection.getIndexId()).eql([
        [], []
      ]);

      _collection.add({ id : '_1', label : 'A' });

      should(_collection.getIndexId()).eql([
        ['_1'], [1]
      ]);

      _collection.setIndexIdValue(1, undefined);
      should(_collection.getIndexId()).eql([
        ['_1'], [1]
      ]);
    });

    it('should not set index id value if value = null', () => {
      var _collection = collection((item) => {
        return item.id;
      });
      should(_collection.getIndexId()).eql([
        [], []
      ]);

      _collection.add({ id : '_1', label : 'A' });

      should(_collection.getIndexId()).eql([
        ['_1'], [1]
      ]);

      _collection.setIndexIdValue(1, null);
      should(_collection.getIndexId()).eql([
        ['_1'], [1]
      ]);
    });

    it('should set index id value with multiple in the collection', () => {
      var _collection = collection((item) => {
        return item.id;
      });
      should(_collection.getIndexId()).eql([
        [], []
      ]);

      _collection.add({ id : '_1', label : 'A' });
      _collection.add({ id : '_2', label : 'B' });
      _collection.add({ id : '_3', label : 'C' });
      _collection.add({ id : '_4', label : 'D' });

      should(_collection.getIndexId()).eql([
        ['_1', '_2', '_3', '_4'],
        [1, 2, 3, 4]
      ]);

      _collection.setIndexIdValue(3, 33);
      should(_collection.getIndexId()).eql([
        ['_1', '_2', 33, '_4'],
        [1, 2, 3, 4]
      ]);
    });
  });

  describe('setIndexReferences()', () => {
    it('should be defined', () => {
      should(collection().setIndexReferences).be.a.Function();
    });

    it('should set index id', () => {
      var _collection = collection();
      should(_collection.getIndexReferences()).eql({});
      _collection.setIndexReferences({ store : [[1], [[1]]] });
      should(_collection.getIndexReferences()).eql({ store : [[1], [[1]]] });
    });
  });

  describe('setCurrentId()', () => {
    it('should be defined', () => {
      should(collection().setCurrentId).be.ok();
    });

    it('should return the default id', () => {
      var _collection = collection();
      should(_collection.getCurrentId()).eql(1);
      _collection.setCurrentId(5);
      should(_collection.getCurrentId()).eql(5);
      _collection.add({ id : 1 });
      should(_collection.getAll()).eql([{ _rowId : 1, _id : 5, _version : [1], id : 1 }]);
    });
  });

  describe('setCurrentRowId()', () => {
    it('should be defined', () => {
      should(collection().setCurrentRowId).be.ok();
    });

    it('should return the default id', () => {
      var _collection = collection();
      should(_collection.getCurrentRowId()).eql(1);
      _collection.setCurrentRowId(5);
      should(_collection.getCurrentRowId()).eql(5);
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
      should(_collection.getFirst()).eql({ _rowId : 1, _id : 1, id : 1, test : 1, _version : [1]});
    });

    it('should return the good first item', () => {
      var _collection = collection();
      should(_collection.getFirst()).eql(undefined);
      _collection.add({ id : 1, test : 1 });
      _collection.upsert({_id : 1, id : 1, test : 2});
      should(_collection.getFirst()).eql({ _rowId : 2, _id : 1, id : 1, test : 2, _version : [2]});
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
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 1, _version : [1]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 2, test : 2, _version : [1]});
    });

    it('should begin and end the transactions and return an array', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 }, _version);

      var _version = _collection.begin();
      _collection.upsert({ _id : 1, id : 1, test : 'B' });
      _collection.upsert({ _id : 1, id : 1, test : 'A' }, _version);
      var _res = _collection.commit(_version);
      should(_res).be.an.Array().and.have.lengthOf(1);
      should(_res).eql([{ _rowId : 3, _id : 1, id : 1, test : 'A', _version : [3] }]);

      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 1  , _version : [1, 2] });
      should(_values[1]).eql({ _rowId : 2, _id : 1, id : 1, test : 'B', _version : [2, 3] });
      should(_values[2]).eql({ _rowId : 3, _id : 1, id : 1, test : 'A', _version : [3]    });
    });

    it('should begin and end the transactions and return and object', () => {
      var _collection = collection(null, true);
      _collection.add({ id : 1, test : 1 }, _version);

      var _version = _collection.begin();
      _collection.upsert({ _id : 1, id : 1, test : 'B' }, _version);
      var _res = _collection.commit(_version);
      should(_res).be.an.Object();
      should(_res).eql({ _rowId : 2, _id : 1, id : 1, test : 'B', _version : [2] });

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 1  , _version : [1, 2] });
      should(_values[1]).eql({ _rowId : 2, _id : 1, id : 1, test : 'B', _version : [2]    });
    });

    it('should not duplicate values if the same id has been already used within a transaction', () => {
      var _collection = collection(getPrimaryKey);
      var _version    = _collection.begin();
      _collection.add({ id : 2, label : 'A' }, _version);
      _collection.add({ id : 2, label : 'B' }, _version);
      _collection.commit(_version);
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(1);
      // Must _rowId = 2
      should(_values[0]).eql({ _rowId : 2, _id : 1, id : 2, label : 'B', _version : [1]});

      var _index = _collection.getIndexId();
      should(_index).have.lengthOf(2);
      should(_index[0]).have.lengthOf(1);
      should(_index[0]).eql([2]);
      should(_index[1]).have.lengthOf(1);
      should(_index[1]).eql([1]);
    });

    it('should not duplicate values if the same id has been already used in two different transactions', () => {
      var _collection = collection(getPrimaryKey);
      var _version    = _collection.begin();
      _collection.add({ id : 2, label : 'A' }, _version);
      _collection.commit(_version);
      _version  = _collection.begin();
      _collection.add({ id : 2, label : 'B' }, _version);
      _collection.commit(_version);
      var _values = _collection._getAll();
      should(_values).be.an.Array().and.have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 2, label : 'A', _version : [1, 2]});
      should(_values[1]).eql({ _rowId : 2, _id : 1, id : 2, label : 'B', _version : [2]});

      var _index = _collection.getIndexId();
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
      should(_collection.get(1)).eql({ _rowId : 2, _id : 1, id : 1, test : 2, _version : [2]});
      _collection.rollback(_version);
      should(_collection.get(1)).eql({ _rowId : 3, _id : 1, id : 1, test : 1, _version : [3]});

      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 1, _version : [1, 2]});
      should(_values[1]).eql({ _rowId : 2, _id : 1, id : 1, test : 2, _version : [2, 3]});
      should(_values[2]).eql({ _rowId : 3, _id : 1, id : 1, test : 1, _version : [3]   });
    });

    it('should rollback the items : updates', () => {
      var _collection = collection();

      var _version = _collection.begin();
      _collection.add({ id : 1, test : 1 }, _version);
      _collection.add({ id : 2, test : 2 }, _version);
      _collection.commit(_version);

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 1, _version : [1]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 2, test : 2, _version : [1]});

      _version = _collection.begin();
      _collection.upsert({ _rowId : 1, _id : 1, id : 1, test : 1.1 }, _version);
      _collection.upsert({ _rowId : 2, _id : 2, id : 2, test : 2.2 }, _version);
      _collection.commit(_version);

      _values = _collection._getAll();
      should(_values).have.length(4);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 1,   _version : [1, 2] });
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 2, test : 2,   _version : [1, 2] });
      should(_values[2]).eql({ _rowId : 3, _id : 1, id : 1, test : 1.1, _version : [2]    });
      should(_values[3]).eql({ _rowId : 4, _id : 2, id : 2, test : 2.2, _version : [2]    });

      _collection.rollback(_version);
      _values = _collection._getAll();
      should(_values).have.length(6);
      should(_values[2]).eql({ _rowId : 3, _id : 1, id : 1, test : 1.1, _version : [2, 3]});
      should(_values[3]).eql({ _rowId : 4, _id : 2, id : 2, test : 2.2, _version : [2, 3]});
      should(_values[4]).eql({ _rowId : 5, _id : 2, id : 2, test : 2,   _version : [3]   });
      should(_values[5]).eql({ _rowId : 6, _id : 1, id : 1, test : 1,   _version : [3]   });
    });

    it('should rollback deleted items : delete', () => {
      var _collection = collection();
      var _version = _collection.begin();
      _collection.add({ id : 1 }, _version);
      _collection.add({ id : 2 }, _version);
      _collection.commit(_version);

      _version = _collection.begin();
      _collection.remove({ _id : 2 }, _version);
      _collection.remove({ _id : 1 }, _version);
      _collection.commit(_version);

      var _values = _collection._getAll();
      should(_values).have.length(2);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, _version : [1, 2]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 2, _version : [1, 2]});

      _collection.rollback(_version);
      _values = _collection._getAll();
      should(_values).have.length(4);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, _version : [1, 2]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 2, _version : [1, 2]});
      should(_values[2]).eql({ _rowId : 3, _id : 2, id : 2, _version : [3]   });
      should(_values[3]).eql({ _rowId : 4, _id : 1, id : 1, _version : [3]   });

      _version = _collection.begin();
      _collection.remove({ _id : 1 }, _version);
      _collection.remove({ _id : 2 }, _version);
      _collection.commit(_version);

      _values = _collection._getAll();
      should(_values).have.length(4);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, _version : [1, 2]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 2, _version : [1, 2]});
      should(_values[2]).eql({ _rowId : 3, _id : 2, id : 2, _version : [3, 4]});
      should(_values[3]).eql({ _rowId : 4, _id : 1, id : 1, _version : [3, 4]});


      _collection.rollback(_version);
      _values = _collection._getAll();
      should(_values).have.length(6);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, _version : [1, 2]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 2, _version : [1, 2]});
      should(_values[2]).eql({ _rowId : 3, _id : 2, id : 2, _version : [3, 4]});
      should(_values[3]).eql({ _rowId : 4, _id : 1, id : 1, _version : [3, 4]});
      should(_values[4]).eql({ _rowId : 5, _id : 1, id : 1, _version : [5]});
      should(_values[5]).eql({ _rowId : 6, _id : 2, id : 2, _version : [5]});
    });

    it('should rollback the item : insert & update', () => {
      var _collection = collection();
      var _version = _collection.begin();
      _collection.add({ id : 1, test : 1 }            , _version);
      _collection.upsert({ _id : 1, id : 1, test : 2 }, _version);
      _collection.commit(_version);
      should(_collection.get(1)).eql({ _rowId : 1, _id : 1, id : 1, test : 2, _version : [1]});
      _collection.rollback(_version);
      var _values = _collection._getAll();
      should(_values).have.length(1);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 2, _version : [1, 2]});
      should(_collection.get(1)).eql(null);
    });

    it('should rollback the item : insert & update & delete', () => {
      var _collection = collection();
      var _version    = _collection.begin();
      _collection.add({ id : 1, test : 1 }            , _version);
      _collection.upsert({ _id : 1, id : 1, test : 2 }, _version);
      _collection.remove({ _id : 1 }, _version);
      _collection.commit(_version);
      should(_collection.get(1)).eql(null);
      _collection.rollback(_version);
      var _values = _collection._getAll();
      should(_values).have.length(0);
    });

    it('should rollback the item : delete & insert', () => {
      var _collection = collection();
      _collection.add({ id : 1, test : 1 });

      var _version = _collection.begin();
      _collection.remove({ _id : 1 }, _version);
      _collection.add({ id : 1, test : 2 }, _version);
      _collection.commit(_version);


      should(_collection.get(2)).eql({ _rowId : 2, _id : 2, id : 1, test : 2, _version : [2]});
      _collection.rollback(_version);
      var _values = _collection._getAll();
      should(_values).have.length(3);
      should(_values[0]).eql({ _rowId : 1, _id : 1, id : 1, test : 1, _version : [1, 2]});
      should(_values[1]).eql({ _rowId : 2, _id : 2, id : 1, test : 2, _version : [2, 3]});
      should(_values[2]).eql({ _rowId : 3, _id : 1, id : 1, test : 1, _version : [3]});

      should(_collection.get(1)).eql({ _rowId : 3, _id : 1, id : 1, test : 1, _version : [3]});
      should(_collection.get(2)).eql(null);
    });
  });

});
