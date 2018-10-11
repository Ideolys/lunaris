describe.only('builder', () => {

  beforeEach(() => {
    lunaris.clear('@child');
    lunaris.clear('@childAggregate');
    lunaris.clear('@parent');
    lunaris._resetVersionNumber();
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

    it.only('should propagate reflexive update', done => {
      var _parentObj = {
        _id    : 1,
        id     : 1,
        label  : 'A',
        parent : null
      };

      var _childObj = {
        _id    : 2,
        id     : 2,
        label  : 'A-1',
        parent : {
          _id   : 1,
          id    : 1,
          label : 'A'
        }
      };

      var _childObj2 = {
        _id    : 3,
        id     : 3,
        label  : 'A-2',
        parent : {
          _id   : 1,
          id    : 1,
          label : 'A'
        }
      };

      var _childObj3 = {
        _id    : 4,
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
        console.log(items);
        if (_nbCalled === 1) {
          should(items).eql([{
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
        }
      });

      lunaris.update('@childParent', { _id : 1, id : 1, label : 'B' });
      console.log(lastError);
    });
  });

});
