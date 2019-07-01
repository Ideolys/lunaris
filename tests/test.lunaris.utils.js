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

  describe('binarySearch', () => {

    it('should not found the int in the collection', () => {
      should(utils.index.binarySearch([], 0)).eql({ index : 0, found : false });
      should(utils.index.binarySearch([], 1)).eql({ index : 0, found : false });
      should(utils.index.binarySearch([], 1000)).eql({ index : 0, found : false });
      should(utils.index.binarySearch([], -1)).eql({ index : 0, found : false });
      should(utils.index.binarySearch([], -0)).eql({ index : 0, found : false });

      should(utils.index.binarySearch([-2, -1, 0, 1, 2], 10)).eql({
        index : 5,
        found : false
      });
      should(utils.index.binarySearch([-2, -1, 0, 1, 2], -3)).eql({
        index : 0,
        found : false
      });
    });

    it('should found the int in the collection', () => {
      should(utils.index.binarySearch([-2, -1, 0, 1, 2], 0)).eql({
        index : 2,
        found : true
      });
      should(utils.index.binarySearch([-2, -1, 0, 1, 2], -1)).eql({
        index : 1,
        found : true
      });
      should(utils.index.binarySearch([-2, -1, 0, 1, 2], -1)).eql({
        index : 1,
        found : true
      });
      should(utils.index.binarySearch([-2, -1, 0, 1, 2], 2)).eql({
        index : 4,
        found : true
      });
    });

    it('should not found the string in the collection : _int', () => {
      should(utils.index.binarySearch([], '_0')).eql({ index : 0, found : false });
      should(utils.index.binarySearch([], '_1')).eql({ index : 0, found : false });
      should(utils.index.binarySearch([], '_1000')).eql({ index : 0, found : false });

      should(utils.index.binarySearch(['_1', '_2', '_3'], '_10')).eql({
        index : 3,
        found : false
      });
      should(utils.index.binarySearch(['_1', '_2', '_4'], '_3')).eql({
        index : 2,
        found : false
      });
    });

    it('should found the string in the collection : _int', () => {
      should(utils.index.binarySearch(['_1', '_2', '_3'], '_2')).eql({
        index : 1,
        found : true
      });
      should(utils.index.binarySearch(['_1', '_2', '_4'], '_4')).eql({
        index : 2,
        found : true
      });
    });

    it('should not found the string in the collection', () => {
      should(utils.index.binarySearch([], '0')).eql({ index : 0, found : false });
      should(utils.index.binarySearch([], '1')).eql({ index : 0, found : false });
      should(utils.index.binarySearch([], '1000')).eql({ index : 0, found : false });
      should(utils.index.binarySearch(['1', '2', '3'], '10')).eql({
        index : 3,
        found : false
      });
      should(utils.index.binarySearch(['1', '2', '4'], '3')).eql({
        index : 2,
        found : false
      });
      should(utils.index.binarySearch(['1-1-1', '1-1-2', '1-1-3'], '1-2-1')).eql({
        index : 3,
        found : false
      });
    });

    it('should found the string in the collection', () => {
      should(utils.index.binarySearch(['1', '2', '3'], '2')).eql({
        index : 1,
        found : true
      });
      should(utils.index.binarySearch(['1', '2', '4'], '4')).eql({
        index : 2,
        found : true
      });
      should(utils.index.binarySearch(['1-1-1', '1-1-2', '1-1-3'], '1-1-2')).eql({
        index : 1,
        found : true
      });
    });


  });
});
