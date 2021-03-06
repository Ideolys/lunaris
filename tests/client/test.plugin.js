var lastError = [];
var lastTip   = [];
console.error = function () {
  lastError = [arguments[0], arguments[1]];
};
console.tip = function () {
  lastTip = [arguments[0], arguments[1]];
};

describe('Store plugin', () => {

  afterEach(() => {
    lastError = [];
    lastTip   = [];
    lunaris._vue._vm.$data.$stores['test'].state.splice(0); // reset
    lunaris._resetVersionNumber();
    lunaris._stores.testObject.data.clear();
    lunaris._stores.test.data.clear();
  });

  it('store define state in vue data', () => {
    should(lunaris._vue._vm).be.ok();
    should(lunaris._vue._vm.$data.$stores).be.ok();
    should(lunaris._vue._vm.$data.$stores.test).be.ok();
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test)).eql({
      silent        : true,
      state         : [],
      isStoreObject : false,
      view          : null
    });
  });

  it('should throw an error if vm.stores is not an array', () => {
    const vm = new Vue({
      name   : 'test',
      el     : '#app',
      stores : 'test',
    });
    should(lastError.length).eql(2);
    should(lastError[0]).eql('[Lunaris error] Error in component "test":');
    should(lastError[1]).eql('vm.stores must be an Array!');
    should(lastTip.length).eql(2);
    should(lastTip[0]).eql('[Lunaris tip] Please register a store with: vm.stores = [<store>, ...]');
    vm.$destroy();
  });

  it('should throw an error if store is not defined', () => {
    const vm = new Vue({
      name   : 'test2',
      el     : '#app',
      stores : ['test2'],
    });
    should(lastError.length).eql(2);
    should(lastError[0]).eql('[Lunaris error] Error in component "test2":');
    should(lastError[1]).eql('Store "test2" has not been defined!');
    should(lastTip.length).eql(2);
    should(lastTip[0]).eql('[Lunaris tip] Please define a store in stores folder');
    vm.$destroy();
  });

  it('should throw an error if storeHooks is not an object', () => {
    const vm = new Vue({
      name       : 'test3',
      el         : '#app',
      stores     : ['test'],
      storeHooks : function () {}
    });
    should(lastError.length).eql(2);
    should(lastError[0]).eql('[Lunaris error] Error in component "test3":');
    should(lastError[1]).eql('vm.storeHooks must be an Object!');
    vm.$destroy();
  });

  it('should throw an error if storeHooks hook is not a function', () => {
    const vm = new Vue({
      name       : 'test4',
      el         : '#app',
      stores     : ['test'],
      storeHooks : {
        test : {}
      }
    });
    should(lastError.length).eql(2);
    should(lastError[0]).eql('[Lunaris error] Error in component "test4":');
    should(lastError[1]).eql('vm.storeHooks.test must be a Function!');
    vm.$destroy();
  });

  it('store test should be defined', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });
    should(vm.$test).be.ok();
    should(vm.$test).eql(lunaris._vue._vm.$data.$stores.test.state);
    vm.$destroy();
  });

  it('hooks must be defined', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });
    var _hooks = Object.keys(lunaris._stores.test.hooks);
    should(_hooks).eql([
      'success', 'errorHttp', 'error', 'get', 'insert', 'update', 'delete', 'reset'
    ]);

    should(lunaris._stores.test.hooks.success).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.success[0].name).eql('successHttp');

    should(lunaris._stores.test.hooks.errorHttp).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.errorHttp[0].name).eql('errorHttp');

    should(lunaris._stores.test.hooks.error).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.error[0].name).eql('errorHttp');

    should(lunaris._stores.test.hooks.get).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.get[0].name).eql('update');

    should(lunaris._stores.test.hooks.reset).have.lengthOf(2);
    should(lunaris._stores.test.realHooks.reset[0].name).eql('reset');
    should(lunaris._stores.test.realHooks.reset[1].name).eql('resetMagic');

    should(lunaris._stores.test.hooks.insert).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.insert[0].name).eql('update');

    should(lunaris._stores.test.hooks.update).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.update[0].name).eql('update');

    should(lunaris._stores.test.hooks.delete).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.delete[0].name).eql('remove');
    vm.$destroy();
  });

  it('reset hook must be not destroyed when component is', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });
    vm.$destroy();
    var _hooks = Object.keys(lunaris._stores.test.hooks);

    should(_hooks).eql([
      'success', 'errorHttp', 'error', 'get', 'insert', 'update', 'delete', 'reset'
    ]);

    should(lunaris._stores.test.hooks.success).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.success[0].name).eql('successHttp');

    should(lunaris._stores.test.hooks.errorHttp).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.errorHttp[0].name).eql('errorHttp');

    should(lunaris._stores.test.hooks.error).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.error[0].name).eql('errorHttp');

    should(lunaris._stores.test.hooks.get).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.get[0].name).eql('update');

    should(lunaris._stores.test.hooks.reset).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.reset[0].name).eql('reset');

    should(lunaris._stores.test.hooks.insert).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.insert[0].name).eql('update');

    should(lunaris._stores.test.hooks.update).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.update[0].name).eql('update');

    should(lunaris._stores.test.hooks.delete).have.lengthOf(1);
    should(lunaris._stores.test.realHooks.delete[0].name).eql('remove');
    vm.$destroy();
  });

  it('should remove handlers', () => {
    const vm = new Vue({
      el         : '#app',
      stores     : ['test'],
      storeHooks : {
        'insert@test' : function test () {
        }
      }
    });
    vm.$destroy();
    should(lunaris._stores.test.hooks.insert).have.lengthOf(1);
    vm.$destroy();
  });

  it('should call storeHooks base handler', done => {
    let _hasBeenCalled = false;
    const vm = new Vue({
      el         : '#app',
      stores     : ['test'],
      storeHooks : {
        'insert@test' : function test () {
          _hasBeenCalled = true;
        }
      }
    });

    lunaris.insert('@test', { id : 1 });

    setTimeout(() => {
      should(_hasBeenCalled).eql(true);
      vm.$destroy();
      lunaris.clear('@test');
      done();
    }, 50);
  });

  it('should add socket handlers', () => {
    const vm = new Vue({
      el             : '#app',
      stores         : ['test'],
      socketChannels : {
        channel : function test () {
        }
      }
    });
    should(lunaris.websocket._handlers).have.keys('channel');
    vm.$destroy();
  });

  it('should remove socket handlers', () => {
    const vm = new Vue({
      el             : '#app',
      stores         : ['test'],
      socketChannels : {
        channel : function test () {
        },
        channel2 : function test2 () {
        }
      }
    });
    should(lunaris.websocket._handlers).have.keys('channel', 'channel2');
    vm.$destroy();
    should(lunaris.websocket._handlers).not.have.keys('channel', 'channel2');
  });

  it('should call socketChannel handler', () => {
    let _hasBeenCalled = false;
    const vm = new Vue({
      el             : '#app',
      stores         : ['test'],
      socketChannels : {
        channel : function test () {
          _hasBeenCalled = true;
        }
      }
    });

    lunaris.websocket._handlers.channel();
    should(_hasBeenCalled).eql(true);
    vm.$destroy();
  });

  it('should update the state when get : store array', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get', Object.freeze(_payload));
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test.state)).eql(_payload);

    vm.$destroy();
  });

  it('should not reset the state if another component requires the same store', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get', Object.freeze(_payload));
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test.state)).eql(lunaris.utils.clone(_payload));

    const vm2 = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test.state)).eql(lunaris.utils.clone(_payload));
    vm.$destroy();
    vm2.$destroy();
  });

  it('should update the state when get : store object', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['testObject'],
    });

    var _payload = { _id : 1, id : 1, label : 'A' };
    lunaris.pushToHandlers(lunaris._stores.testObject, 'get', Object.freeze(_payload));
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.testObject.state)).eql(_payload);

    vm.$destroy();
  });

  it('should update the state when insert : store array -> one item', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload));
    lunaris.pushToHandlers(lunaris._stores.test, 'insert', { _id : 3, id : 3, label : 'C' });
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test.state)).eql(_payload.concat({ _id : 3, id : 3, label : 'C' }));

    vm.$destroy();
  });

  it('should update the state when insert : store array -> multiple items', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload));
    lunaris.pushToHandlers(lunaris._stores.test, 'insert', [{ _id : 3, id : 3, label : 'C' }, { _id : 4, id : 4, label : 'D' }]);
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test.state)).eql(_payload.concat([
      { _id : 3, id : 3, label : 'C' },
      { _id : 4, id : 4, label : 'D' }
    ]));

    vm.$destroy();
  });

  it('should update the state when insert : store object', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['testObject'],
    });

    var _payload = { _id : 1, id : 1, label : 'A' };
    lunaris.pushToHandlers(lunaris._stores.testObject, 'get'   , Object.freeze(_payload));
    lunaris.pushToHandlers(lunaris._stores.testObject, 'insert', { _id : 2, id : 2, label : 'B' });
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.testObject.state)).eql({ _id : 2, id : 2, label : 'B' });

    vm.$destroy();
  });

  it('should update the state when update : store array -> one item', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload));
    lunaris.pushToHandlers(lunaris._stores.test, 'update', { _id : 1, id : 1, label : 'A-1' });
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test.state)).eql([
      { _id : 1, id : 1, label : 'A-1' }, { _id : 2, id : 2, label : 'B' }
    ]);

    vm.$destroy();
  });

  it('should update the state when update : store array -> multiple items', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload));
    lunaris.pushToHandlers(lunaris._stores.test, 'update', [{ _id : 1, id : 1, label : 'A-1' }, { _id : 2, id : 2, label : 'B-1' }]);
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test.state)).eql(
      [{ _id : 1, id : 1, label : 'A-1' }, { _id : 2, id : 2, label : 'B-1' }]
    );

    vm.$destroy();
  });

  it('should update the state when update : store object', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['testObject'],
    });

    var _payload = { _id : 1, id : 1, label : 'A' };
    lunaris.pushToHandlers(lunaris._stores.testObject, 'get'   , Object.freeze(_payload));
    lunaris.pushToHandlers(lunaris._stores.testObject, 'update', { _id : 1, id : 1, label : 'A-1' });
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.testObject.state)).eql({ _id : 1, id : 1, label : 'A-1' });

    vm.$destroy();
  });

  it('should update the state when update : item not in state', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    lunaris.pushToHandlers(lunaris._stores.test, 'update', { _id : 1, id : 1, label : 'A-1' });
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test.state)).eql([
      { _id : 1, id : 1, label : 'A-1' }
    ]);

    vm.$destroy();
  });

  it('should update the state when update : store array -> multiple items not in state', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    lunaris.pushToHandlers(lunaris._stores.test, 'update', [{ _id : 1, id : 1, label : 'A-1' }, { _id : 2, id : 2, label : 'B-1' }]);
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test.state)).eql(
      [{ _id : 1, id : 1, label : 'A-1' }, { _id : 2, id : 2, label : 'B-1' }]
    );

    vm.$destroy();
  });

  it('should update the state when update : store array -> multiple items with items not in state', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload));
    lunaris.pushToHandlers(lunaris._stores.test, 'update', [{ _id : 1, id : 1, label : 'A-1' }, { _id : 3, id : 3, label : 'C' }]);
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test.state)).eql([
      { _id : 1, id : 1, label : 'A-1' },
      { _id : 2, id : 2, label : 'B' },
      { _id : 3, id : 3, label : 'C' }
    ]);

    vm.$destroy();
  });

  it('should update the state when delete : store array', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload));
    lunaris.pushToHandlers(lunaris._stores.test, 'delete', { _id : 1, id : 1, label : 'A-1' });
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test.state)).eql([
      { _id : 2, id : 2, label : 'B' }
    ]);

    vm.$destroy();
  });

  it('should update the state when delete : store object', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['testObject'],
    });

    var _payload = { _id : 1, id : 1, label : 'A' };
    lunaris.pushToHandlers(lunaris._stores.testObject, 'get'   , Object.freeze(_payload));
    lunaris.pushToHandlers(lunaris._stores.testObject, 'delete', { _id : 1, id : 1, label : 'A-1' });
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.testObject.state)).eql({});

    vm.$destroy();
  });

  it('should update the state when reset : store array', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload));
    lunaris.pushToHandlers(lunaris._stores.test, 'reset');
    should(lunaris.utils.clone(lunaris._vue._vm.$data.$stores.test.state)).eql([]);

    vm.$destroy();
  });

  it('should update the state when reset : store object', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['testObject'],
    });

    var _payload = { _id : 1, id : 1, label : 'A' };
    lunaris.pushToHandlers(lunaris._stores.testObject, 'get', Object.freeze(_payload));
    lunaris.pushToHandlers(lunaris._stores.testObject, 'reset');
    should(lunaris._vue._vm.$data.$stores.testObject.state).eql({});

    vm.$destroy();
  });

  describe('rollback', () => {

    it('$rollback should be defined', () => {
      const vm = new Vue({
        el     : '#app',
        stores : ['testObject'],
      });

      should(vm.$rollback).be.ok();
      should(vm.$rollback).be.a.Function();
      vm.$destroy();
    });

    it('should throw an error if no value is given', () => {
      const vm = new Vue({
        name   : 'test',
        el     : '#app',
        stores : ['testObject'],
      });

      vm.$rollback();
      should(lastError.length).eql(2);
      should(lastError[0]).eql('[Lunaris error] Error in component "test": vm.$rollback');
      should(lastError[1]).eql(new Error('The value must be an object and have the properties "data" and "version" defined!'));
      vm.$destroy();
    });

    it('should not throw an error if the method is GET and no data are provided', () => {
      const vm = new Vue({
        el     : '#app',
        stores : ['test'],
      });

      lunaris.get('@test');
      vm.$rollback({
        storeName : 'test',
        data      : null,
        method    : 'GET',
        version   : 1
      });
      should(lastError.length).eql(0);
      vm.$destroy();
    });

    it('should rollback the inserted item', () => {
      const vm = new Vue({
        el     : '#app',
        stores : ['test'],
      });

      lunaris.insert('@test', [{ id : 1 }]);
      should(lunaris.utils.clone(vm.$test)).eql([
        { _rowId : 1, _id : 1, id : 1, _version : [1] }
      ]);
      vm.$rollback({
        storeName : 'test',
        data      : [
          { _rowId : 1, _id : 1, id : 1, _version : [1] }
        ],
        method  : 'POST',
        version : 1
      });
      should(lunaris.utils.clone(vm.$test)).eql([]);
      vm.$destroy();
    });

    it('should rollback the inserted item : store object', done => {
      const vm = new Vue({
        el     : '#app',
        stores : ['testObject'],
      });

      const hook = () => {
        should(lunaris.utils.clone(vm.$testObject)).eql({ _rowId : 1, _id : 1, id : 1, _version : [1] });
        vm.$rollback({
          storeName : 'testObject',
          data      : { _rowId : 1, _id : 1, id : 1, _version : [1] },
          method    : 'POST',
          version   : 1
        });
        should(lunaris.utils.clone(vm.$testObject)).eql({});
        vm.$destroy();

        lunaris.removeHook('insert@testObject', hook);
        done();
      };

      lunaris.hook('insert@testObject', hook);

      lunaris.insert('@testObject', { id : 1 });
    });

    it('should rollback the inserted items', () => {
      const vm = new Vue({
        el     : '#app',
        stores : ['test'],
      });

      lunaris.insert('@test', [{ id : 1 }, { id : 2 }]);
      should(lunaris.utils.clone(vm.$test)).eql([
        { _rowId : 1, _id : 1, id : 1, _version : [1] },
        { _rowId : 2, _id : 2, id : 2, _version : [1] }
      ]);
      vm.$rollback({
        storeName : 'test',
        data      : [
          { _rowId : 1, _id : 1, id : 1, _version : [1] },
          { _rowId : 2, _id : 2, id : 2, _version : [1] }
        ],
        method  : 'POST',
        version : 1
      });
      should(lunaris.utils.clone(vm.$test)).eql([]);
      vm.$destroy();
    });

    it('should rollback the updated item', () => {
      const vm = new Vue({
        el     : '#app',
        stores : ['test'],
      });

      lunaris.insert('@test', { id : 1 });
      lunaris.update('@test', { _id : 1, id : 1, label : 'A' });

      should(lunaris.utils.clone(vm.$test)).eql([
        { _rowId : 2, _id : 1, id : 1, label : 'A', _version : [2] }
      ]);
      vm.$rollback({
        storeName : 'test',
        data      : { _rowId : 2, _id : 1, id : 1, label : 'A', _version : [2] },
        method    : 'PUT',
        version   : 2
      });
      should(lunaris.utils.clone(vm.$test)).eql([
        { _rowId : 3, _id : 1, id : 1, _version : [3] }
      ]);
      vm.$destroy();
    });

    it('should rollback the updated item : store object', () => {
      const vm = new Vue({
        el     : '#app',
        stores : ['testObject'],
      });

      lunaris.insert('@testObject', { id : 1 });
      lunaris.update('@testObject', { _id : 1, id : 1, label : 'A' });

      should(lunaris.utils.clone(vm.$testObject)).eql({ _rowId : 2, _id : 1, id : 1, label : 'A', _version : [2] });
      vm.$rollback({
        storeName : 'testObject',
        data      : { _rowId : 2, _id : 1, id : 1, label : 'A', _version : [2] },
        method    : 'PUT',
        version   : 2
      });
      should(lunaris.utils.clone(vm.$testObject)).eql({ _rowId : 3, id : 1, _id : 1, _version : [3] });
      vm.$destroy();
    });

    it('should rollback the updated items', () => {
      const vm = new Vue({
        el     : '#app',
        stores : ['test'],
      });

      lunaris.insert('@test', [{ id : 1 }, { id : 2 }]);
      lunaris.update('@test', [
        { _id : 1, id : 1, label : 'A' },
        { _id : 2, id : 2, label : 'B' }
      ]);
      should(lunaris.utils.clone(vm.$test)).eql([
        { _rowId : 3, _id : 1, id : 1, label : 'A', _version : [2] },
        { _rowId : 4, _id : 2, id : 2, label : 'B', _version : [2] }
      ]);
      vm.$rollback({
        storeName : 'test',
        data      : [
          { _rowId : 3, _id : 1, id : 1, label : 'A', _version : [2] },
          { _rowId : 4, _id : 2, id : 2, label : 'B', _version : [2] }
        ],
        method  : 'PUT',
        version : 2
      });
      should(lunaris.utils.clone(vm.$test)).eql([
        { _rowId : 6, _id : 1, id : 1, _version : [3] },
        { _rowId : 5, _id : 2, id : 2, _version : [3] }
      ]);
      vm.$destroy();
    });

    it('should rollback the deleted item', () => {
      const vm = new Vue({
        el     : '#app',
        stores : ['test'],
      });

      lunaris.insert('@test', [{ id : 1 }]);
      lunaris.delete('@test', { _id : 1 });
      should(lunaris.utils.clone(vm.$test)).eql([]);
      vm.$rollback({
        storeName : 'test',
        data      : { _id : 1 },
        method    : 'DELETE',
        version   : 2
      });
      should(lunaris.utils.clone(vm.$test)).eql([{ _rowId : 2, _id : 1, id : 1, _version : [3] }]);
      vm.$destroy();
    });

    it('should rollback the inserted item : store object', () => {
      const vm = new Vue({
        el     : '#app',
        stores : ['testObject'],
      });

      lunaris.insert('@testObject', { id : 1 });
      lunaris.delete('@testObject', { _id : 1 });
      should(lunaris.utils.clone(vm.$testObject)).eql({});
      vm.$rollback({
        storeName : 'testObject',
        data      : { _id : 1 },
        method    : 'DELETE',
        version   : 2
      });
      should(lunaris.utils.clone(vm.$testObject)).eql({ _rowId : 2, _id : 1, id : 1, _version : [3] });
      vm.$destroy();
    });

  });
});
