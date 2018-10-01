describe.only('builder', () => {

  describe('joins', () => {

    it('should have found joins', () => {
      should(lunaris._stores.parent.storesToPropagate).eql(['child']);
      should(lunaris._stores.child.joins.joins).eql({ parent : 'parent' });
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


  });

});
