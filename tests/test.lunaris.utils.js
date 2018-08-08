const utils = require('../src/utils');

describe('utils', () => {

  describe('merge', () => {
    it('should be defined', () => {
      should(utils.merge).be.ok();
      should(utils.merge).be.a.Function();
    });

    it ('should return an object', () => {
      should(utils.merge({}, {})).eql({});
    });

    it ('should merge the child attribute into parent object', () => {
      var _parent = {};
      var _child  = { id : null };
      utils.merge(_parent, _child);
      should(_parent).eql(_child);
    });

    it ('should merge the child attributes into parent object', () => {
      var _parent = {};
      var _child  = { id : 1, label : 2 };
      utils.merge(_parent, _child);
      should(_parent).eql(_child);
    });

    it ('should merge the child attributes into parent object. Parent have attributes', () => {
      var _parent = { test : 1 };
      var _child  = { id : 1, label : 2 };
      utils.merge(_parent, _child);
      should(_parent).eql({ id : 1, label : 2, test : 1 });
    });

    it ('should merge the child attributes into parent object : sub object', () => {
      var _parent = { test : 1, child : null};
      var _child  = { id : 1, label : 2, child : { id : 1, label : 'cat' } };
      utils.merge(_parent, _child);
      should(_parent).eql({
        id    : 1,
        label : 2,
        test  : 1,
        child : { id : 1, label : 'cat' }
      });
    });

    it ('should merge the child attributes into parent object : sub object defined in parent', () => {
      var _parent = { test : 1, child : { id : 1, label : 'dog', bla : 1 }};
      var _child  = { id : 1, label : 2, child : { id : 1, label : 'cat' } };
      utils.merge(_parent, _child);
      should(_parent).eql({
        id    : 1,
        label : 2,
        test  : 1,
        child : { id : 1, label : 'cat', bla : 1 }
      });
    });

    it ('should merge the child attributes into parent object : sub in sub', () => {
      var _parent = { test : 1, child : { id : 1, label : 'dog', bla : 1, sub : { id : 1 } }};
      var _child  = { id : 1, label : 2, child : { id : 1, label : 'cat', sub : { id : 2 } } };
      utils.merge(_parent, _child);
      should(_parent).eql({
        id    : 1,
        label : 2,
        test  : 1,
        child : { id : 1, label : 'cat', bla : 1, sub : { id : 2 } }
      });
    });

    it ('should merge the child attributes into parent object : object in array', () => {
      var _parent = { id : 1, arr : [{ id : 1 }] };
      var _child  = { id : 1, arr : [, { id : 2}] };
      utils.merge(_parent, _child);
      should(_parent).eql({
        id  : 1,
        arr : [
          { id : 1 },
          { id : 2 }
        ]
      });
    });

    it ('should merge the child attributes into parent object : object in array', () => {
      var _parent = { id : 1, arr : [{ id : 1 }, ,{ id : 3, label : 'cat' }] };
      var _child  = { id : 1, arr : [, { id : 2 }, { id : 3, label : 'dog' }] };
      utils.merge(_parent, _child);
      should(_parent).eql({
        id  : 1,
        arr : [
          { id : 1 },
          { id : 2 },
          { id : 3, label : 'dog'}
        ]
      });
    });
  });
});
