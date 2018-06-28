const lunaris = require('../src/index');

describe('Lunaris hooks', () => {
  it('hook() should be defined', () => {
    should(lunaris.hook).be.ok();
  });

  it('removeHook() should be defined', () => {
    should(lunaris.removeHook).be.ok();
  });

  describe('add hook', () => {
    it('should throw an error if the handler is not a function', () => {
      (function () {
        lunaris.hook('a');
      }).should.throw('handler must be a Function');
    });

    it('should throw an error if the hook is not well configured', () => {
      (function () {
        lunaris.hook('a', function () {});
      }).should.throw('A hook must be: <event>@<store>');
    });

    it('should throw an error if the store is not defined', () => {
      (function () {
        lunaris.hook('get@store1', function () {});
      }).should.throw('Cannor register hook "get@store1", store "store1" has not been defined!');
    });

    it('should register the hook', () => {
      var _handler              = function () {}
      lunaris._stores['store1'] = { hooks : [] };
      lunaris.hook('get@store1', _handler);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(1);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler);
      delete lunaris._stores['store1'];
    });

    it('should register multiple handlers for a hook', () => {
      var _handler1             = function handler1 () {}
      var _handler2             = function handler2 () {}
      lunaris._stores['store1'] = { hooks : [] };
      lunaris.hook('get@store1', _handler1);
      lunaris.hook('get@store1', _handler2);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(2);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler1);
      should(lunaris._stores['store1'].hooks.get[1]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[1]).eql(_handler2);
      delete lunaris._stores['store1'];
    });
  });

  describe('remove hook', () => {
    it('should throw an error if the handler is not a function', () => {
      (function () {
        lunaris._stores['store1'] = { hooks : [] };
        lunaris.hook('get@store1', function () {});
        lunaris.removeHook('get@store');
      }).should.throw('handler must be a Function');
      delete lunaris._stores['store1'];
    });

    it('should throw an error if the hook is not well configured', () => {
      (function () {
        lunaris._stores['store1'] = { hooks : [] };
        lunaris.hook('get@store1', function () {});
        lunaris.removeHook('a', function () {});
      }).should.throw('A hook must be: <event>@<store>');
      delete lunaris._stores['store1'];
    });

    it('should throw an error if the store is not defined', () => {
      (function () {
        lunaris.removeHook('get@store1', function () {});
      }).should.throw('Cannor remove hook "get@store1", store "store1" has not been defined!');
    });

    it('should remove a hook', () => {
      var _handler              = function () {}
      lunaris._stores['store1'] = { hooks : [] };
      lunaris.hook('get@store1', _handler);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(1);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler);
      lunaris.removeHook('get@store1', _handler);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(0);
      delete lunaris._stores['store1'];
    });

    it('should remove one handler from a list of handlers', () => {
      var _handler1             = function handler1 () {}
      var _handler2             = function handler2 () {}
      lunaris._stores['store1'] = { hooks : [] };
      lunaris.hook('get@store1', _handler1);
      lunaris.hook('get@store1', _handler2);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(2);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler1);
      should(lunaris._stores['store1'].hooks.get[1]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[1]).eql(_handler2);
      lunaris.removeHook('get@store1', _handler1);
      should(lunaris._stores['store1'].hooks).be.an.Array();
      should(lunaris._stores['store1'].hooks.get).have.length(1);
      should(lunaris._stores['store1'].hooks.get[0]).be.a.Function();
      should(lunaris._stores['store1'].hooks.get[0]).eql(_handler2);
      delete lunaris._stores['store1'];
    });
  });
});
