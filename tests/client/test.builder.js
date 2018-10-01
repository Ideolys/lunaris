describe('builder', () => {

  describe('joins', () => {

    it('should have found joins', () => {
      should(lunaris._stores.parent.storesToPropagate).eql(['child']);
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
      lunaris.clear('@child');
      lunaris._resetVersionNumber();
    });

    it('should propagate update', done => {
      lunaris.hook('update@child', item => {
        console.log(item);
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


  });

});
