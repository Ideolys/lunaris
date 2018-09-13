var lastError = [];
var lastTip   = [];
console.error = function () {
  lastError = [arguments[0], arguments[1]];
};
console.warn = function () {
  lastTip = [arguments[0], arguments[1]];
};

describe('directive v-lunaris', () => {

  afterEach(() => {
    lastError = [];
    lastTip   = [];
    lunaris.clear('@directive');
    lunaris.clear('@directiveCheckbox');
    lunaris._resetVersionNumber();
  });

  it('should throw an error if the there is no value', () => {
    const vm = new Vue({
      template : `
        <div>
          <input v-lunaris>
        </div>
      `,
      stores : ['directive']
    }).$mount();
    should(lastError.length).eql(2);
    should(lastError[0]).eql('[Lunaris warn] v-lunaris');
    should(lastError[1]).eql(new Error('The directive must have a value!'));
    vm.$destroy();
  });

  it('should throw an error if the there is no store', () => {
    const vm = new Vue({
      template : `
        <div>
          <input v-lunaris="'id'">
        </div>
      `,
      stores : ['directive']
    }).$mount();
    should(lastError.length).eql(2);
    should(lastError[0]).eql('[Lunaris warn] v-lunaris');
    should(lastError[1]).eql(new Error('The directive must reference a store!'));
    should(lastTip.length).eql(2);
    should(lastTip[0]).eql('[Lunaris tip] v-lunaris');
    should(lastTip[1]).eql('You must declare the directive as: v-lunaris="\'@<store>.attribute\'"');
    vm.$destroy();
  });

  it('should throw an error if the there is no lunaris-id', () => {
    const vm = new Vue({
      template : `
        <div>
          <input v-lunaris="'@directive.label'">
        </div>
      `,
      stores : ['directive']
    }).$mount();
    should(lastError.length).eql(2);
    should(lastError[0]).eql('[Lunaris warn] v-lunaris');
    should(lastError[1]).eql(new Error('The directive must have "lunaris-id" defined!'));
    vm.$destroy();
  });

  it('should throw an error and call the error function if the validation failed', () => {
    var _fnHasBeenCalled = false;
    const vm = new Vue({
      template : `
        <div>
          <input id="input" v-lunaris="'@directive.id'" :lunaris-id="$directive.id" v-on:error="onError">
        </div>
      `,
      stores  : ['directive'],
      methods : {
        onError : function () {
          _fnHasBeenCalled = true;
        }
      },
      created : function () {
        lunaris.insert('@directive', { id : 1, label : 'Cat', children : [], type : { id : 1, label : 'A' } });
      }
    }).$mount();

    var _input   = vm.$el.children.input;
    _input.value = 'Dog';

    _input.dispatchEvent(new Event('change', { bubbles : true }));
    should(_fnHasBeenCalled).eql(true);

    should(lastError.length).eql(2);
    should(lastError[0]).eql('[Lunaris warn] v-lunaris');
    should(lastError[1]).eql([{ value: 'Dog', field: 'id', error: 'must be an integer' }]);

    vm.$destroy();
  });

  it('should update an attribute value at root level', () => {
    const vm = new Vue({
      template : `
        <div>
          <input id="input" v-lunaris="'@directive.label'" :lunaris-id="$directive.id">
        </div>
      `,
      stores  : ['directive'],
      created : function () {
        lunaris.insert('@directive', { id : 1, label : 'Cat', children : [], type : { id : 1, label : 'A' } });
      }
    }).$mount();

    var _input   = vm.$el.children.input;
    _input.value = 'Dog';

    should(lunaris.getOne('@directive', 1)).eql({
      id       : 1,
      label    : 'Cat',
      children : [],
      type     : { id : 1, label : 'A' },
      _id      : 1,
      _version : [1]
    });
    _input.dispatchEvent(new Event('change', { bubbles : true }));
    should(lunaris.getOne('@directive', 1)).eql({
      id       : 1,
      label    : 'Dog',
      children : [],
      type     : { id : 1, label : 'A' },
      _id      : 1,
      _version : [2]
    });

    vm.$destroy();
  });

  it('should update an attribute value at sub level', () => {
    const vm = new Vue({
      template : `
        <div>
          <input id="input" v-lunaris="'@directive.type.label'" :lunaris-id="$directive.id">
        </div>
      `,
      stores  : ['directive'],
      created : function () {
        lunaris.insert('@directive', { id : 1, label : 'Cat', children : [], type : { id : 1, label : 'A' } });
      }
    }).$mount();

    var _input   = vm.$el.children.input;
    _input.value = 'Castle';

    should(lunaris.getOne('@directive', 1)).eql({
      id       : 1,
      label    : 'Cat',
      children : [],
      type     : { id : 1, label : 'A' },
      _id      : 1,
      _version : [1]
    });
    _input.dispatchEvent(new Event('change', { bubbles : true }));
    should(lunaris.getOne('@directive', 1)).eql({
      id       : 1,
      label    : 'Cat',
      children : [],
      type     : { id : 1, label : 'Castle' },
      _id      : 1,
      _version : [2]
    });

    vm.$destroy();
  });

  it('should update an attribute value in sub object in object in array', () => {
    const vm = new Vue({
      template : `
        <div>
          <input id="input" v-lunaris="'@directive.children[1].type.label'" :lunaris-id="$directive.id">
        </div>
      `,
      stores  : ['directive'],
      created : function () {
        lunaris.insert('@directive', {
          id       : 1,
          label    : 'Cat',
          children : [
            { id : 2, label : 'A-1', type : { id : 1, label : 'B-1' }},
            { id : 3, label : 'A-2', type : { id : 1, label : 'B-1' }},
          ],
          type : { id : 1, label : 'A' }
        });
      }
    }).$mount();

    var _input   = vm.$el.children.input;
    _input.value = 'B-2';

    should(lunaris.getOne('@directive', 1)).eql({
      id       : 1,
      label    : 'Cat',
      children : [
        { id : 2, label : 'A-1', type : { id : 1, label : 'B-1' }},
        { id : 3, label : 'A-2', type : { id : 1, label : 'B-1' }},
      ],
      type     : { id : 1, label : 'A' },
      _id      : 1,
      _version : [1]
    });
    _input.dispatchEvent(new Event('change', { bubbles : true }));
    should(lunaris.getOne('@directive', 1)).eql({
      id       : 1,
      label    : 'Cat',
      children : [
        { id : 2, label : 'A-1', type : { id : 1, label : 'B-1' }},
        { id : 3, label : 'A-2', type : { id : 1, label : 'B-2' }},
      ],
      type     : { id : 1, label : 'A' },
      _id      : 1,
      _version : [2]
    });

    vm.$destroy();
  });

  it('should update an attribute value : checkbox', () => {
    const vm = new Vue({
      template : `
        <div>
          <input id="input" type="checkbox" v-lunaris="'@directiveCheckbox.isChecked'" :lunaris-id="$directiveCheckbox.id">
        </div>
      `,
      stores  : ['directiveCheckbox'],
      created : function () {
        lunaris.insert('@directiveCheckbox', { id : 1, isChecked : false });
      }
    }).$mount();

    var _input     = vm.$el.children.input;
    _input.checked = true;

    should(lunaris.getOne('@directiveCheckbox', 1)).eql({
      id        : 1,
      isChecked : false,
      _id       : 1,
      _version  : [1]
    });
    _input.dispatchEvent(new Event('change', { bubbles : true }));
    should(lunaris.getOne('@directiveCheckbox', 1)).eql({
      id        : 1,
      isChecked : true,
      _id       : 1,
      _version  : [2]
    });

    vm.$destroy();
  });
});
