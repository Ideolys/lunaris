describe('builder', () => {

  beforeEach(() => {
    lunaris.clear('@child');
    lunaris.clear('@childAggregate');
    lunaris.clear('@computed');
    lunaris.clear('@filter.parent');
    lunaris.clear('@filter.child');
    lunaris.clear('@filter.double');
    lunaris.clear('@double');
    lunaris.clear('@parent');
    lunaris.clear('@http');
    lunaris.clear('@reference');
    lunaris._resetVersionNumber();
  });

  it('should have defined constants', () => {
    delete lunaris.constants.indexedDBNumber;
    should(lunaris.constants).eql({
      CONSTANT1 : '1',
      ARRAY     : [1, 2, 3],
      OBJECT    : {
        STATUS : [1, 2]
      }
    });
  });

  it('should have set the computed', done => {
    var _hook = obj => {
      should(obj[0]).eql({
        id               : 1,
        label            : 'abc',
        labelCapitalized : 'ABC',
        _rowId           : 1,
        _id              : 1,
        _version         : [1]
      });

      lunaris.removeHook('insert@computed', _hook);
      done();
    };

    lunaris.hook('insert@computed', _hook);

    lunaris.insert('@computed', { id : 1, label : 'abc' });
  });

  it('should have set the computed with the constant', done => {
    var _hook = obj => {
      should(obj[0]).eql({
        id               : 1,
        label            : 'abc',
        labelCapitalized : 'ABC-1',
        _rowId           : 1,
        _id              : 1,
        _version         : [1]
      });

      lunaris.removeHook('insert@computedConstant', _hook);
      done();
    };

    lunaris.hook('insert@computedConstant', _hook);

    lunaris.insert('@computedConstant', { id : 1, label : 'abc' });
  });

  it('should filter when offline', done => {
    var _parentObj = {
      id : 1,
    };

    var _childObj = {
      id     : 2,
      parent : {
        id : 1
      }
    };

    var _childObj2 = {
      id     : 3,
      parent : {
        id : 1
      }
    };

    var _childObj3 = {
      id     : 4,
      parent : {
        id : 2
      }
    };

    lunaris.offline.isOnline = false;

    lunaris.insert('@filter.parent', _parentObj);
    lunaris.insert('@filter.child', _childObj);
    lunaris.insert('@filter.child', _childObj2);
    lunaris.insert('@filter.child', _childObj3);

    var _onGet = items => {
      should(items).eql([
        {
          id     : 2,
          parent : {
            id : 1
          },
          _rowId   : 1,
          _id      : 1,
          _version : [2]
        },
        {
          id     : 3,
          parent : {
            id : 1
          },
          _rowId   : 2,
          _id      : 2,
          _version : [4]
        }
      ]);

      lunaris.removeHook('get@filter.child', _onGet);
      lunaris.offline.isOnline = true;
      done();
    };

    lunaris.hook('get@filter.child', _onGet);

    lunaris.get('@filter.child');
  });

  it('should set the id when inserting in offline', () => {
    lunaris.offline.isOnline = false;
    lunaris.insert('@filter.child', { id : null, label : 'A', parent : { id : 1 }});

    should(lunaris.getOne('@filter.child', 1)).eql({
      id     : '_1',
      label  : 'A',
      parent : {
        id : 1
      },
      _rowId   : 1,
      _id      : 1,
      _version : [1]
    });
    lunaris.offline.isOnline = true;
  });

  it('should send one event filterUpdated', done => {
    var _nbHooks = 0;

    lunaris.hook('reset@double', () => {
      _nbHooks++;
    });

    lunaris.insert('@filter.double', { from : '1', to : '2' });

    setTimeout(() => {
      should(_nbHooks).eql(1);
      done();
    }, 60);
  });

  describe('joins', () => {

    it('should have found joins', () => {
      should(lunaris._stores.parent.storesToPropagate).eql(['child', 'childAggregate']);
      should(lunaris._stores.child.joins.joins).eql({ parent : 'parent' });
    });

    it('should set value at insert', () => {
      lunaris.insert('@child' , { id : 1 });
      should(lunaris._stores.child.data.getAll()).eql([{
        _rowId   : 1,
        _id      : 1,
        id       : 1,
        _version : [1],
        parent   : []
      }]);
    });

    it('should propagate update', done => {
      lunaris.hook('update@child', item => {
        should(item).eql([{
          _rowId   : 2,
          _id      : 1,
          id       : 1,
          _version : [3],
          parent   : [{
            _rowId   : 1,
            _id      : 1,
            id       : 1,
            _version : [2]
          }]
        }]);
        done();
      });

      lunaris.insert('@child' , { id : 1 });
      lunaris.insert('@parent', { id : 1 });
    });

    it('should propagate update and calculate aggregate', done => {
      lunaris.hook('update@childAggregate', item => {
        should(item).eql([{
          _rowId       : 2,
          _id          : 1,
          _version     : [4],
          id           : 1,
          total        : 4,
          _total_state : {
            value : 4
          },
          parent : [
            {
              _rowId   : 1,
              _id      : 1,
              id       : 1,
              price    : 1,
              _version : [2]
            },
            {
              _rowId   : 2,
              _id      : 2,
              id       : 2,
              price    : 3,
              _version : [2]
            }
          ]
        }]);
        done();
      });

      lunaris.insert('@childAggregate' , { id : 1 });
      lunaris.insert('@parent', [{ id : 1, price : 1 }, { id : 2, price : 3 }]);
    });

    it('should calculate aggregate value', () => {
      lunaris.insert('@childAggregateSum' , {
        id     : 1,
        total  : 4,
        parent : [
          {
            id   : 1,
            cost : 1,
          },
          {
            id   : 2,
            cost : 3,
          }
        ]
      });

      should(lunaris._stores.childAggregateSum.data.getAll()).eql([{
        _rowId   : 1,
        _id      : 1,
        _version : [1],
        id       : 1,
        total    : 4,
        parent   : [
          {
            id   : 1,
            cost : 1,
          },
          {
            id   : 2,
            cost : 3,
          }
        ]
      }]);
    });
  });

  it('should reference an object of the store when inserting', done => {
    var _referencedObj = { id : 10, label : 'A' };
    var _obj           = { id : 20, http : { id : 10 }};

    var _hook = references => {
      should(references[0].http.id).eql(10);
      should(references[0].http.label).eql('A');
      should(references[0].http._id).eql(1);

      lunaris.removeHook('insert@reference', _hook);
      done();
    };

    lunaris.hook('insert@reference', _hook);
    lunaris.insert('@http', _referencedObj);
    lunaris.insert('@reference', _obj);
  });

  it('should define the from', () => {
    should(lunaris._stores.http.data).eql(lunaris._stores.from.data);
    should(lunaris._stores.http.filterFns).be.an.Object().and.not.empty();
    should(lunaris._stores.from.filterFns).be.an.Object().and.empty();

    should(lunaris._stores.http.validateFn.toString()).eql(lunaris._stores.from.validateFn.toString());
    should(lunaris._stores.http.getPrimaryKeyFn.toString()).eql(lunaris._stores.from.getPrimaryKeyFn.toString());
    should(lunaris._stores.http.setPrimaryKeyFn.toString()).eql(lunaris._stores.from.setPrimaryKeyFn.toString());
  });
});
