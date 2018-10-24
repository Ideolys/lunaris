describe('builder', () => {

  beforeEach(() => {
    lunaris.clear('@child');
    lunaris.clear('@childAggregate');
    lunaris.clear('@parent');
    lunaris.clear('@childParent');
    lunaris.clear('@computed');
    lunaris._resetVersionNumber();
  });

  it('should have defined constants', () => {
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
        _id              : 1,
        _version         : [1]
      });

      lunaris.removeHook('insert@computed', _hook);
      done();
    };

    lunaris.hook('insert@computed', _hook);

    lunaris.insert('@computed', { id : 1, label : 'abc' });
  });

  describe('joins', () => {

    it('should have found joins', () => {
      should(lunaris._stores.parent.storesToPropagate).eql(['child', 'childAggregate']);
      should(lunaris._stores.child.joins.joins).eql({ parent : 'parent' });
    });

    it('should set value at insert', () => {
      lunaris.insert('@child' , { id : 1 });
      should(lunaris._stores.child.data.getAll()).eql([{
        _id      : 1,
        id       : 1,
        _version : [1],
        parent   : []
      }]);
    });

    it('should propagate update', done => {
      lunaris.hook('update@child', item => {
        should(item).eql([{
          _id      : 1,
          id       : 1,
          _version : [3],
          parent   : [{
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
          _id          : 1,
          _version     : [4],
          id           : 1,
          total        : 4,
          _total_state : {
            value : 4
          },
          parent   : [
            {
              _id      : 1,
              id       : 1,
              price    : 1,
              _version : [2]
            },
            {
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
      });

      should(lunaris._stores.childAggregateSum.data.getAll()).eql([{
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

    it('should propagate reflexive update', done => {
      var _parentObj = {
        id     : 1,
        label  : 'A',
        parent : null
      };

      var _childObj = {
        id     : 2,
        label  : 'A-1',
        parent : {
          _id   : 1,
          id    : 1,
          label : 'A'
        }
      };

      var _childObj2 = {
        id     : 3,
        label  : 'A-2',
        parent : {
          _id   : 1,
          id    : 1,
          label : 'A'
        }
      };

      var _childObj3 = {
        id     : 4,
        label  : 'C',
        parent : null
      };

      lunaris.insert('@childParent', _parentObj);
      lunaris.insert('@childParent', _childObj);
      lunaris.insert('@childParent', _childObj2);
      lunaris.insert('@childParent', _childObj3);

      var _nbCalled = 0;
      lunaris.hook('update@childParent', items => {
        _nbCalled++;
        if (_nbCalled === 2) {
          should(items).eql([
            {
              id     : 2,
              label  : 'A-1',
              parent : {
                id       : 1,
                label    : 'B',
                _id      : 1,
                _version : [5]
              },
              _id      : 2,
              _version : [6]
            },
            {
              id     : 3,
              label  : 'A-2',
              parent : {
                id       : 1,
                label    : 'B',
                _id      : 1,
                _version : [5]
              },
              _id      : 3,
              _version : [6]
            }
          ]);
          done();
        }
      });

      lunaris.update('@childParent', { _id : 1, id : 1, label : 'B' });
    });

    it('should propagate reflexive delete', done => {
      var _parentObj = {
        id     : 1,
        label  : 'A',
        parent : null
      };

      var _childObj = {
        id     : 2,
        label  : 'A-1',
        parent : {
          _id   : 1,
          id    : 1,
          label : 'A'
        }
      };

      var _childObj2 = {
        id     : 3,
        label  : 'A-2',
        parent : {
          _id   : 1,
          id    : 1,
          label : 'A'
        }
      };

      var _childObj3 = {
        id     : 4,
        label  : 'C',
        parent : null
      };

      lunaris.insert('@childParent', _parentObj);
      lunaris.insert('@childParent', _childObj);
      lunaris.insert('@childParent', _childObj2);
      lunaris.insert('@childParent', _childObj3);

      lunaris.hook('update@childParent', items => {
        should(items).eql([
          {
            id       : 2,
            label    : 'A-1',
            parent   : null,
            _id      : 2,
            _version : [6]
          },
          {
            id       : 3,
            label    : 'A-2',
            parent   : null,
            _id      : 3,
            _version : [6]
          }
        ]);
        done();
      });

      lunaris.delete('@childParent', { _id : 1 });
    });
  });

});
