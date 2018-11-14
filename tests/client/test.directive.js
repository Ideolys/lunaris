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
    lunaris.clear('@directiveRadio');
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

  it('should throw an error if the there is no lunaris-id', () => {
    const vm = new Vue({
      template : `
        <div>
          <input v-lunaris="'label'">
        </div>
      `,
      stores : ['directive']
    }).$mount();
    should(lastError.length).eql(2);
    should(lastError[0]).eql('[Lunaris warn] v-lunaris');
    should(lastError[1]).eql(new Error('The directive must have "lunaris-id" defined!'));
    vm.$destroy();
  });

  it('should throw an error if the there is no lunaris-store', () => {
    const vm = new Vue({
      template : `
        <div>
          <input v-lunaris="'label'" :lunaris-id="1">
        </div>
      `,
      stores : ['directive']
    }).$mount();
    should(lastError.length).eql(2);
    should(lastError[0]).eql('[Lunaris warn] v-lunaris');
    should(lastError[1]).eql(new Error('The directive must have "lunaris-store" defined!'));
    vm.$destroy();
  });

  it('should throw an error and call the error function if the validation failed', () => {
    var _fnHasBeenCalled = false;
    const vm = new Vue({
      template : `
        <div>
          <input id="input" v-lunaris="'id'" lunaris-store="@directive" :lunaris-id="$directive.id" v-on:error="onError">
        </div>
      `,
      stores  : ['directive'],
      methods : {
        onError : function () {
          _fnHasBeenCalled = true;
        }
      },
      created : function () {
        lunaris.insert('@directive', { _rowId : 1, id : 1, label : 'Cat', children : [], type : { id : 1, label : 'A' } });
      }
    }).$mount();

    var _input   = vm.$el.children.input;
    _input.value = 'Dog';

    _input.dispatchEvent(new Event('change', { bubbles : true }));
    should(_fnHasBeenCalled).eql(true);

    should(lastError.length).eql(2);
    should(lastError[0]).eql('[Lunaris warn] v-lunaris');
    should(lastError[1]).eql([{ value: 'Dog', field: 'id', error: 'must be an integer', index : null }]);

    vm.$destroy();
  });

  it('should update an attribute value at root level', () => {
    const vm = new Vue({
      template : `
        <div>
          <input id="input" v-lunaris="'label'" lunaris-store="@directive" :lunaris-id="$directive.id">
        </div>
      `,
      stores  : ['directive'],
      created : function () {
        lunaris.insert('@directive', { _rowId : 1, id : 1, label : 'Cat', children : [], type : { id : 1, label : 'A' } });
      }
    }).$mount();

    var _input   = vm.$el.children.input;
    _input.value = 'Dog';

    should(lunaris.getOne('@directive', 1)).eql({
      id       : 1,
      label    : 'Cat',
      children : [],
      type     : { id : 1, label : 'A' },
      _rowId   : 1,
      _id      : 1,
      _version : [1]
    });
    _input.dispatchEvent(new Event('change', { bubbles : true }));
    should(lunaris.getOne('@directive', 1)).eql({
      id       : 1,
      label    : 'Dog',
      children : [],
      type     : { id : 1, label : 'A' },
      _rowId   : 2,
      _id      : 1,
      _version : [2]
    });

    vm.$destroy();
  });

  it('should update an attribute value at sub level', () => {
    const vm = new Vue({
      template : `
        <div>
          <input id="input" v-lunaris="'type.label'" lunaris-store="@directive" :lunaris-id="$directive.id">
        </div>
      `,
      stores  : ['directive'],
      created : function () {
        lunaris.insert('@directive', { _rowId : 1, id : 1, label : 'Cat', children : [], type : { id : 1, label : 'A' } });
      }
    }).$mount();

    var _input   = vm.$el.children.input;
    _input.value = 'Castle';

    should(lunaris.getOne('@directive', 1)).eql({
      id       : 1,
      label    : 'Cat',
      children : [],
      type     : { id : 1, label : 'A' },
      _rowId   : 1,
      _id      : 1,
      _version : [1]
    });
    _input.dispatchEvent(new Event('change', { bubbles : true }));
    should(lunaris.getOne('@directive', 1)).eql({
      id       : 1,
      label    : 'Cat',
      children : [],
      type     : { id : 1, label : 'Castle' },
      _rowId   : 2,
      _id      : 1,
      _version : [2]
    });

    vm.$destroy();
  });

  it('should update an attribute value in sub object in object in array', () => {
    const vm = new Vue({
      template : `
        <div>
          <input id="input"
            v-lunaris="'children[1].type.label'"
            lunaris-store="@directive"
            :lunaris-id="$directive._id"
          >
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
      _rowId   : 1,
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
      _rowId   : 2,
      _id      : 1,
      _version : [2]
    });

    vm.$destroy();
  });

  it('should update an attribute value : checkbox', () => {
    const vm = new Vue({
      template : `
        <div>
          <input id="input" type="checkbox" v-lunaris="'isChecked'" lunaris-store="@directiveCheckbox" :lunaris-id="$directiveCheckbox.id">
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
      _rowId    : 1,
      _id       : 1,
      _version  : [1]
    });
    _input.dispatchEvent(new Event('change', { bubbles : true }));
    should(lunaris.getOne('@directiveCheckbox', 1)).eql({
      id        : 1,
      isChecked : true,
      _rowId    : 2,
      _id       : 1,
      _version  : [2]
    });
    vm.$destroy();
  });

  it('should update an attribute value : radio', () => {
    const vm = new Vue({
      template : `
        <div>
          <input
            v-for="obj in $directiveRadio" :key="obj._id"
            :id="'input' + obj._id"
            type="radio"
            v-lunaris="'isChecked'"
            lunaris-store="@directiveRadio"
            :lunaris-id="obj._id"
          >
        </div>
      `,
      stores  : ['directiveRadio'],
      created : function () {
        lunaris.insert('@directiveRadio', [
          { id : 1, isChecked : true  },
          { id : 2, isChecked : false }
        ]);
      }
    }).$mount();

    var _input     = vm.$el.children.input2;
    _input.checked = true;

    should(lunaris.getOne('@directiveRadio', 1)).eql({
      id        : 1,
      isChecked : true,
      _rowId    : 1,
      _id       : 1,
      _version  : [1]
    });
    should(lunaris.getOne('@directiveRadio', 2)).eql({
      id        : 2,
      isChecked : false,
      _rowId    : 2,
      _id       : 2,
      _version  : [1]
    });
    _input.dispatchEvent(new Event('change', { bubbles : true }));
    should(lunaris.getOne('@directiveRadio', 1)).eql({
      id        : 1,
      isChecked : false,
      _rowId    : 3,
      _id       : 1,
      _version  : [2]
    });
    should(lunaris.getOne('@directiveRadio', 2)).eql({
      id        : 2,
      isChecked : true,
      _rowId    : 4,
      _id       : 2,
      _version  : [3]
    });

    vm.$destroy();
  });
});
