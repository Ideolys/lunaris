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

  describe('clone', () => {

    it('should clone null', () => {
      should(utils.clone(null)).eql(null);
    });

    it('should clone undefined', () => {
      should(utils.clone(undefined)).eql(undefined);
    });

    it('should clone base type', () => {
      should(utils.clone('a')).eql('a');
      should(utils.clone(1)).eql(1);
      should(utils.clone(1.23)).eql(1.23);
    });

    it('should clone an object', () => {
      let obj = { label : 'A' };
      let res = utils.clone(obj);
      should(res).eql(obj);
      res.label = 'B';
      should(res).not.eql(obj);
    });

    it('should clone an object with deps', () => {
      let obj = {
        label    : 'A',
        subObj   : { type : 1 },
        subArray : [
          { label : 'a' },
          { label : 'b' }
        ]
      };
      let res = utils.clone(obj);
      should(res).eql(obj);
      res.label                 = 'B';
      res.subObj.otherAttribute = 2;
      res.subArray[0].label     = 'c';
      should(res).not.eql(obj);
      should(res.subObj).not.eql(obj.subObj);
      should(res.subArray).not.eql(obj.subArray);
      res.subArray.push({ label : 'd' });
      should(obj.subArray.length).eql(2);
    });

    it('should clone an array', () => {
      let obj = [
        { label : 'A' },
        { label : 'B' },
        { label : 'C' }
      ];
      let res = utils.clone(obj);
      should(res).eql(obj);
      res[1].label = 'B-1';
      should(res).not.eql(obj);
    });

    it('should not clone a function', () => {
      let obj = { label : () => {
        return 'A';
      }};
      let res = utils.clone(obj);
      should(res).not.eql(obj);
      should(res.label).eql(undefined);
    });

    it('should not clone a non primitive object', () => {
      function Obj () {
        this.label = 'A';
      }

      let obj = { obj : new Obj() };
      let res = utils.clone(obj);
      should(res).not.eql(obj);
      should(res.obj).eql('[object Object]');
    });

    it('should use toString of non primitive object if is exists', () => {
      var Obj = function Obj () {
        this.label = 'A';

        this.toString = function () {
          return this.label;
        };
      };

      let obj = { obj : new Obj() };
      let res = utils.clone(obj);
      should(res).not.eql(obj);
      should(res.obj).eql('A');
    });

  });
});
