describe('Store plugin', () => {

  it('store define state in vue data', () => {
    should(lunaris._vue._vm).be.ok();
    should(lunaris._vue._vm.$data.$stores).be.ok();
    should(lunaris._vue._vm.$data.$stores.test).be.ok();
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.test)).eql({
      silent : true, state : [], isStoreObject : false
    });
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
      'inserted', 'updated', 'deleted', 'errorHttp', 'get', 'reset', 'insert', 'update', 'delete'
    ]);

    should(lunaris._stores.test.hooks.inserted).have.lengthOf(1);
    should(lunaris._stores.test.hooks.inserted[0].name).eql('successHttp');

    should(lunaris._stores.test.hooks.updated).have.lengthOf(1);
    should(lunaris._stores.test.hooks.updated[0].name).eql('successHttp');

    should(lunaris._stores.test.hooks.deleted).have.lengthOf(1);
    should(lunaris._stores.test.hooks.deleted[0].name).eql('successHttp');

    should(lunaris._stores.test.hooks.errorHttp).have.lengthOf(1);
    should(lunaris._stores.test.hooks.errorHttp[0].name).eql('errorHttp');

    should(lunaris._stores.test.hooks.get).have.lengthOf(1);
    should(lunaris._stores.test.hooks.get[0].name).eql('get');

    should(lunaris._stores.test.hooks.reset).have.lengthOf(1);
    should(lunaris._stores.test.hooks.reset[0].name).eql('reset');

    should(lunaris._stores.test.hooks.insert).have.lengthOf(1);
    should(lunaris._stores.test.hooks.insert[0].name).eql('insert');

    should(lunaris._stores.test.hooks.update).have.lengthOf(1);
    should(lunaris._stores.test.hooks.update[0].name).eql('update');

    should(lunaris._stores.test.hooks.delete).have.lengthOf(1);
    should(lunaris._stores.test.hooks.delete[0].name).eql('deleteItem');
    vm.$destroy();
  });

  it('success and error hooks must be not destroyed when component is', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });
    vm.$destroy();
    var _hooks = Object.keys(lunaris._stores.test.hooks);

    should(_hooks).eql([
      'inserted', 'updated', 'deleted', 'errorHttp', 'get', 'reset', 'insert', 'update', 'delete'
    ]);

    should(lunaris._stores.test.hooks.inserted).have.lengthOf(1);
    should(lunaris._stores.test.hooks.inserted[0].name).eql('successHttp');

    should(lunaris._stores.test.hooks.updated).have.lengthOf(1);
    should(lunaris._stores.test.hooks.updated[0].name).eql('successHttp');

    should(lunaris._stores.test.hooks.deleted).have.lengthOf(1);
    should(lunaris._stores.test.hooks.deleted[0].name).eql('successHttp');

    should(lunaris._stores.test.hooks.errorHttp).have.lengthOf(1);
    should(lunaris._stores.test.hooks.errorHttp[0].name).eql('errorHttp');
  });

  it('other hooks must be not destroyed when component is', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });
    vm.$destroy();
    var _hooks = Object.keys(lunaris._stores.test.hooks);

    should(_hooks).eql([
      'inserted', 'updated', 'deleted', 'errorHttp', 'get', 'reset', 'insert', 'update', 'delete'
    ]);

    should(lunaris._stores.test.hooks.get).have.lengthOf(0);
    should(lunaris._stores.test.hooks.reset).have.lengthOf(0);
    should(lunaris._stores.test.hooks.insert).have.lengthOf(0);
    should(lunaris._stores.test.hooks.update).have.lengthOf(0);
    should(lunaris._stores.test.hooks.delete).have.lengthOf(0);
    vm.$destroy();
  });

  it('should update the state when get : store array', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ id : 1, label : 'A' }, { id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get', Object.freeze(_payload), true);
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.test.state)).eql(_payload);

    vm.$destroy();
  });

  it('should reset the state if another component require the same store', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ id : 1, label : 'A' }, { id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get', Object.freeze(_payload), true);

    const vm2 = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    should(lunaris.clone(lunaris._vue._vm.$data.$stores.test.state)).eql([]);
    vm.$destroy();
    vm2.$destroy();
  });

  it('should update the state when get : store object', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['testObject'],
    });

    var _payload = { id : 1, label : 'A' };
    lunaris.pushToHandlers(lunaris._stores.testObject, 'get', Object.freeze(_payload));
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.testObject.state)).eql(_payload);

    vm.$destroy();
  });

  it('should update the state when insert : store array -> one item', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload), true);
    lunaris.pushToHandlers(lunaris._stores.test, 'insert', { _id : 3, id : 3, label : 'C' });
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.test.state)).eql(_payload.concat({ _id : 3, id : 3, label : 'C' }));

    vm.$destroy();
  });

  it('should update the state when insert : store array -> multiple items', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload), true);
    lunaris.pushToHandlers(lunaris._stores.test, 'insert', [{ _id : 3, id : 3, label : 'C' }, { _id : 4, id : 4, label : 'D' }], true);
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.test.state)).eql(_payload.concat([
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
    lunaris.pushToHandlers(lunaris._stores.testObject, 'get'   , Object.freeze(_payload), true);
    lunaris.pushToHandlers(lunaris._stores.testObject, 'insert', { _id : 2, id : 2, label : 'B' });
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.testObject.state)).eql({ _id : 2, id : 2, label : 'B' });

    vm.$destroy();
  });

  it('should update the state when update : store array -> one item', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload), true);
    lunaris.pushToHandlers(lunaris._stores.test, 'update', { _id : 1, id : 1, label : 'A-1' });
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.test.state)).eql([
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
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload), true);
    lunaris.pushToHandlers(lunaris._stores.test, 'update', [{ _id : 1, id : 1, label : 'A-1' }, { _id : 2, id : 2, label : 'B-1' }], true);
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.test.state)).eql(
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
    lunaris.pushToHandlers(lunaris._stores.testObject, 'get'   , Object.freeze(_payload), true);
    lunaris.pushToHandlers(lunaris._stores.testObject, 'update', { _id : 1, id : 1, label : 'A-1' });
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.testObject.state)).eql({ _id : 1, id : 1, label : 'A-1' });

    vm.$destroy();
  });

  it('should update the state when update : item not in state', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    lunaris.pushToHandlers(lunaris._stores.test, 'update', { _id : 1, id : 1, label : 'A-1' });
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.test.state)).eql([
      { _id : 1, id : 1, label : 'A-1' }
    ]);

    vm.$destroy();
  });

  it('should update the state when update : store array -> multiple items not in state', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    lunaris.pushToHandlers(lunaris._stores.test, 'update', [{ _id : 1, id : 1, label : 'A-1' }, { _id : 2, id : 2, label : 'B-1' }], true);
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.test.state)).eql(
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
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload), true);
    lunaris.pushToHandlers(lunaris._stores.test, 'update', [{ _id : 1, id : 1, label : 'A-1' }, { _id : 3, id : 3, label : 'C' }], true);
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.test.state)).eql([
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
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload), true);
    lunaris.pushToHandlers(lunaris._stores.test, 'delete', { _id : 1, id : 1, label : 'A-1' });
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.test.state)).eql([
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
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.testObject.state)).eql(null);

    vm.$destroy();
  });

  it('should update the state when reset : store array', () => {
    const vm = new Vue({
      el     : '#app',
      stores : ['test'],
    });

    var _payload = [{ _id : 1, id : 1, label : 'A' }, { _id : 2, id : 2, label : 'B' }];
    lunaris.pushToHandlers(lunaris._stores.test, 'get'   , Object.freeze(_payload), true);
    lunaris.pushToHandlers(lunaris._stores.test, 'reset');
    should(lunaris.clone(lunaris._vue._vm.$data.$stores.test.state)).eql([]);

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
    should(lunaris._vue._vm.$data.$stores.testObject.state).eql(null);

    vm.$destroy();
  });

});
