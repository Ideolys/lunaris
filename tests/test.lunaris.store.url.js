const offline            = require('../src/offline');
offline.isOnline         = true;
const exportsLunaris     = require('../src/exports');
exportsLunaris.constants = { TRUE : true };
const testUtils          = require('./testUtils');
const url                = require('../src/store/store.url');
const stores             = {
  noFilter                                 : testUtils.initStore('noFilter'),
  'required.filter.A'                      : testUtils.initStore('required.filter.A'),
  'required.filter.B'                      : testUtils.initStore('required.filter.B'),
  required                                 : testUtils.initStore('required'),
  requiredMultiple                         : testUtils.initStore('requiredMultiple'),
  'optional.filter.A'                      : testUtils.initStore('optional.filter.A'),
  'optional.filter.B'                      : testUtils.initStore('optional.filter.B'),
  optional                                 : testUtils.initStore('optional'),
  optionalMultiple                         : testUtils.initStore('optionalMultiple'),
  mix                                      : testUtils.initStore('mix'),
  array                                    : testUtils.initStore('array'),
  where                                    : testUtils.initStore('where'),
  whereObject                              : testUtils.initStore('whereObject'),
  offlineFalse                             : testUtils.initStore('offlineFalse'),
  attributeUrl                             : testUtils.initStore('attributeUrl'),
  arrayAttrStoreObject                     : testUtils.initStore('arrayAttrStoreObject'),
  arrayAttrStoreObjectSearchable           : testUtils.initStore('arrayAttrStoreObjectSearchable'),
  objAttrStoreObjectSearchable             : testUtils.initStore('objAttrStoreObjectSearchable'),
  objAttrStoreObjectSearchableOtherFilters : testUtils.initStore('objAttrStoreObjectSearchableOtherFilters'),
};
const defaultStoresValue = JSON.parse(JSON.stringify(exportsLunaris._stores));
const store              = require('../src/store/store');

function fixedEncodeURIComponent (str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function (c) {
    return '%' + c.charCodeAt(0).toString(16);
  });
}

describe('store url', () => {
  before(() => {
    exportsLunaris._stores   = stores;
    stores.required.filters  = [{
      source          : '@required.filter.A',
      sourceAttribute : 'label',
      localAttribute  : 'label',
      isRequired      : true,
      operator        : ['ILIKE']
    }];
    stores['required.filter.A'].isStoreObject = true;
    stores['required.filter.B'].isStoreObject = true;
    stores['optional.filter.A'].isStoreObject = true;
    stores.requiredMultiple.filters           = [
      {
        source          : '@required.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        isRequired      : true,
        operator        : ['ILIKE']
      }, {
        source          : '@required.filter.B',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        isRequired      : true,
        operator        : ['ILIKE']
      }
    ];
    stores.optional.filters = [
      {
        source          : '@optional.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : ['ILIKE']
      }
    ];
    stores.optionalMultiple.filters = [
      {
        source          : '@optional.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : ['=']
      }, {
        source          : '@optional.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : ['ILIKE']
      }
    ];

    stores.mix.filters = [
      {
        source          : '@required.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        isRequired      : true,
        operator        : ['ILIKE']
      }, {
        source          : '@required.filter.B',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        isRequired      : true,
        operator        : ['ILIKE']
      }, {
        source          : '@optional.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : ['=']
      }, {
        source          : '@optional.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : ['ILIKE']
      }
    ];
    stores.array.filters = [
      {
        source          : '@optional.filter.B',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : ['ILIKE']
      }
    ];
    stores.where.filters = [
      {
        source          : '@optional.filter.B',
        sourceAttribute : 'label',
        sourceWhere     : function (item) { return item.isChecked === true; },
        localAttribute  : 'label',
        operator        : ['ILIKE']
      }
    ];
    stores.whereObject.filters = [
      {
        source          : '@required.filter.B',
        sourceAttribute : 'label',
        sourceWhere     : function (item, constants) { return item.isChecked === constants.TRUE; },
        localAttribute  : 'label',
        isRequired      : true,
        operator        : ['ILIKE']
      }
    ];

    stores.offlineFalse.filters = [
      {
        source          : '@optional.filter.B',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : ['ILIKE'],
        isOffline       : false
      }
    ];

    stores.attributeUrl.filters = [
      {
        source          : '@optional.filter.B',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        attributeUrl    : 'LABEL',
        operator        : ['ILIKE'],
        isOffline       : false
      }
    ];

    stores.arrayAttrStoreObject.filters = [
      {
        source          : '@optional.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        attributeUrl    : 'LABEL',
        operator        : '='
      }
    ];

    stores.arrayAttrStoreObjectSearchable.filters = [
      {
        source          : '@optional.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        attributeUrl    : 'LABEL',
        isSearchable    : false
      }
    ];
    stores.objAttrStoreObjectSearchable.filters = [
      {
        source          : '@optional.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        attributeUrl    : 'LABEL',
        isSearchable    : false
      }
    ];
    stores.objAttrStoreObjectSearchableOtherFilters.filters = [
      {
        source          : '@optional.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        isSearchable    : false
      },
      {
        source          : '@required.filter.B',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : ['ILIKE']
      }
    ];
  });

  beforeEach(() => {
    var _storeKeys = Object.keys(stores);
    for (var i = 0; i < _storeKeys.length; i++) {
      store.clear('@' + _storeKeys[i]);
    }
  });

  after(() => {
    exportsLunaris._stores = defaultStoresValue;
  });

  describe('GET', () => {

    it('should return an object', () => {
      var _url = url.create(stores.noFilter, 'GET');
      should(_url).be.an.Object();
      should(_url.request).be.ok();
      should(_url.cache).be.ok();
    });

    it('should create the url for a store with no filter', () => {
      var _url = url.create(stores.noFilter, 'GET');
      should(_url.request).eql('/noFilter?limit=50&offset=0');
      should(_url.cache).eql({
        limit  : 50,
        offset : 0
      });
    });

    it('should not increment the pagination offset', () => {
      var _url = url.create(stores.noFilter, 'GET');
      should(_url.request).eql('/noFilter?limit=50&offset=0');
      should(_url.cache).eql({
        limit  : 50,
        offset : 0
      });

      _url = url.create(stores.noFilter, 'GET');
      should(_url.request).eql('/noFilter?limit=50&offset=0');
      should(_url.cache).eql({
        limit  : 50,
        offset : 0
      });
    });

    it('should create the url for a store with no filter and a primary key', () => {
      var _url = url.create(stores.noFilter, 'GET', 1);
      should(_url.request).eql('/noFilter/1?limit=50&offset=0');
      should(_url.cache).eql({
        limit  : 50,
        offset : 0
      });
    });

  });

  describe('required filters', () => {
    it('should return null if no required filter has a value', () => {
      var _url = url.create(stores.required, 'GET');
      should(_url).eql(null);
    });

    it('should return null if no required filters have a value', () => {
      var _url = url.create(stores.requiredMultiple, 'GET');
      should(_url).eql(null);
    });

    it('should create the url for one required filter', () => {
      store.upsert('@required.filter.A', { label : 'cat' });
      var _url = url.create(stores.required, 'GET');
      should(_url.request).eql('/required/label/cat?limit=50&offset=0');
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat'
      });
    });

    it('should create the url for one required filter and encode the value', () => {
      store.upsert('@required.filter.A', { label : 'cat\'s' });
      var _url = url.create(stores.required, 'GET');
      should(_url.request).eql('/required/label/cat%27s?limit=50&offset=0');
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat\'s'
      });
    });

    it('should conserve the pagination in the cache', () => {
      store.upsert('@required.filter.A', { label : 'cat' });
      var _url = url.create(stores.required, 'GET');
      should(_url.request).eql('/required/label/cat?limit=50&offset=0');
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat'
      });
    });

    it('should create the url for required filters', () => {
      store.upsert('@required.filter.A', { label : 'cat' });
      store.upsert('@required.filter.B', { label : 'dog' });
      var _url = url.create(stores.requiredMultiple, 'GET');
      should(_url.request).eql('/requiredMultiple/label/cat/label/dog?limit=50&offset=0');
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat',
        1      : 'dog'
      });
    });

    it('should not add the filter if it is not authorized', () => {
      stores.required.filters[0].httpMethods = ['POST'];
      store.upsert('@required.filter.A', { label : 'cat' });
      var _url = url.create(stores.required, 'GET');
      should(_url.request).eql('/required?limit=50&offset=0');
      should(_url.cache).eql({
        limit  : 50,
        offset : 0
      });
      delete stores.required.filters[0].httpMethods;
    });

    it('should add one filter if it is authorized', () => {
      stores.requiredMultiple.filters[0].httpMethods = ['POST'];
      store.upsert('@required.filter.A', { label : 'cat' });
      store.upsert('@required.filter.B', { label : 'dog' });
      var _url = url.create(stores.requiredMultiple, 'GET');
      should(_url.request).eql('/requiredMultiple/label/dog?limit=50&offset=0');
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        1      : 'dog'
      });
      delete stores.requiredMultiple.filters[0].httpMethods;
    });

    it('should create the url with a where function for required filter', () => {
      store.upsert('@required.filter.B', { label : 'cat' , isChecked : true });
      var _url         = url.create(stores.whereObject, 'GET');
      var _expectedUrl = '/whereObject/label/cat?limit=50&offset=0';
      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat'
      });
    });

    it('should return null if no value is return for the required filter with a where', () => {
      store.upsert('@required.filter.B', { label : 'cat' , isChecked : false });
      var _url = url.create(stores.whereObject, 'GET');
      should(_url).eql(null);
    });
  });

  describe('optional filters', () => {
    it('should create the url for one optional filter', () => {
      store.upsert('@optional.filter.A', { label : 'cat' });
      var _url = url.create(stores.optional, 'GET');
      var _expectedUrl = '/optional?limit=50&offset=0&search=label' +
        encodeURIComponent(':') +
        encodeURIComponent('cat')
      ;
      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat'
      });
    });

    it('should create the url for one optional filter and encode the value', () => {
      store.upsert('@optional.filter.A', { label : 'cat\'s' });
      var _url = url.create(stores.optional, 'GET');
      var _expectedUrl = '/optional?limit=50&offset=0&search=label' +
        fixedEncodeURIComponent(':') +
        fixedEncodeURIComponent('cat\'s')
      ;
      should(_url.request).eql(_expectedUrl);
      should(_url.request).eql('/optional?limit=50&offset=0&search=label%3Acat%27s');
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat\'s',
      });
    });

    it('should create the url for optional filters', () => {
      store.upsert('@optional.filter.A', { label : 'cat' });
      var _url = url.create(stores.optionalMultiple, 'GET');
      var _expectedUrl = '/optionalMultiple?limit=50&offset=0&search=label' +
        encodeURIComponent(':=') +
        encodeURIComponent('cat') +
        encodeURIComponent('+') +
        'label' +
        encodeURIComponent(':') +
        encodeURIComponent('cat')
      ;
      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat',
        1      : 'cat'
      });
    });

    it('should create the url for one optional filter : =', () => {
      stores.optional.filters[0].operator = ['='];
      store.upsert('@optional.filter.A', { label : 'cat' });
      var _url = url.create(stores.optional, 'GET');
      var _expectedUrl = '/optional?limit=50&offset=0&search=label' +
        encodeURIComponent(':=') +
        encodeURIComponent('cat')
      ;
      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat'
      });
    });

    it('should create the url for one optional filter : ILIKE', () => {
      stores.optional.filters[0].operator = ['ILIKE'];
      store.upsert('@optional.filter.A', { label : 'cat' });
      var _url = url.create(stores.optional, 'GET');
      var _expectedUrl = '/optional?limit=50&offset=0&search=label' +
        encodeURIComponent(':') +
        encodeURIComponent('cat')
      ;
      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat'
      });
    });

    it('should create the url for one optional filter : >', () => {
      stores.optional.filters[0].operator = ['>'];
      store.upsert('@optional.filter.A', { label : 'cat' });
      var _url = url.create(stores.optional, 'GET');
      var _expectedUrl = '/optional?limit=50&offset=0&search=label' +
        encodeURIComponent(':>') +
        encodeURIComponent('cat')
      ;
      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat'
      });
    });

    it('should create the url for one optional filter : >=', () => {
      stores.optional.filters[0].operator = ['>='];
      store.upsert('@optional.filter.A', { label : 'cat' });
      var _url = url.create(stores.optional, 'GET');
      var _expectedUrl = '/optional?limit=50&offset=0&search=label' +
        encodeURIComponent(':>=') +
        encodeURIComponent('cat')
      ;
      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat'
      });
    });

    it('should create the url for one optional filter : <', () => {
      stores.optional.filters[0].operator = ['<'];
      store.upsert('@optional.filter.A', { label : 'cat' });
      var _url = url.create(stores.optional, 'GET');
      var _expectedUrl = '/optional?limit=50&offset=0&search=label' +
        encodeURIComponent(':<') +
        encodeURIComponent('cat')
      ;
      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat'
      });
    });

    it('should create the url for one optional filter : <=', () => {
      stores.optional.filters[0].operator = ['<='];
      store.upsert('@optional.filter.A', { label : 'cat' });
      var _url = url.create(stores.optional, 'GET');
      var _expectedUrl = '/optional?limit=50&offset=0&search=label' +
        encodeURIComponent(':<=') +
        encodeURIComponent('cat')
      ;
      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat'
      });
    });

    it('should create the url for one optional filter : <>', () => {
      stores.optional.filters[0].operator = ['<>'];
      store.upsert('@optional.filter.A', { label : 'cat' });
      var _url = url.create(stores.optional, 'GET');
      var _expectedUrl = '/optional?limit=50&offset=0&search=label' +
        fixedEncodeURIComponent(':!=') +
        fixedEncodeURIComponent('cat')
      ;

      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : 'cat'
      });
    });

    it('should create the url for authorized optional filters', () => {
      stores.optionalMultiple.filters[0].httpMethods = ['POST'];
      store.upsert('@optional.filter.A', { label : 'cat' });
      var _url = url.create(stores.optionalMultiple, 'GET');
      var _expectedUrl = '/optionalMultiple?limit=50&offset=0&search=label' +
        encodeURIComponent(':') +
        encodeURIComponent('cat')
      ;
      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        1      : 'cat'
      });
    });

    it('should create the url with a where function for optional filter', () => {
      store.upsert('@optional.filter.B', [
        { label : 'cat' , isChecked : false },
        { label : 'dog' , isChecked : true },
        { label : 'lion', isChecked : true },
      ]);
      var _url         = url.create(stores.where, 'GET');
      var _expectedUrl = '/where?limit=50&offset=0&search=label' +
        encodeURIComponent(':') +
        encodeURIComponent('[dog,lion]')
      ;
      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit  : 50,
        offset : 0,
        0      : ['dog', 'lion']
      });
    });
  });

  it('should create url with required and optional filters', () => {
    store.upsert('@required.filter.A', { label : 'cat' });
    store.upsert('@required.filter.B', { label : 'dog' });
    store.upsert('@optional.filter.A', { label : 'cat' });
    var _url         = url.create(stores.mix, 'GET');
    var _expectedUrl = '/mix/label/cat/label/dog?limit=50&offset=0&search=label' +
      encodeURIComponent(':=') +
      encodeURIComponent('cat') +
      encodeURIComponent('+') +
      'label' +
      encodeURIComponent(':') +
      encodeURIComponent('cat')
    ;
    should(_url.request).eql(_expectedUrl);
  });

  it('should create url with array filter', () => {
    store.upsert('@optional.filter.B', [{ label : 'cat' }, { label : 'dog' }]);
    var _url         = url.create(stores.array, 'GET');
    var _expectedUrl = '/array?limit=50&offset=0&search=label' +
      encodeURIComponent(':') +
      encodeURIComponent('[cat,dog]')
    ;

    should(_url.request).eql(_expectedUrl);
  });

  it('should create the GET request', () => {
    var _url         = url.createForOffline(testUtils.initStore('store'), {
      constructedRequiredOptions : '/A/a',
      optionalOptions            : {
        0 : [null, 'label', ['B', 'C'], 'ILIKE']
      },
      cache : {
        limit  : 2,
        offset : 2
      }
    });
    var _expectedUrl = '/store/A/a?limit=2&offset=2&search=label' +
      encodeURIComponent(':') +
      encodeURIComponent('[B,C]')
    ;

    should(_url).eql(_expectedUrl);
  });

  it('should create the url but not include the optional filter when isOffline === false', () => {
    store.upsert('@optional.filter.B', { label : 'cat' });
    offline.isOnline = false;
    var _url         = url.create(stores.optional, 'GET');
    offline.isOnline = true;
    var _expectedUrl = '/optional?limit=50&offset=0';
    should(_url.request).eql(_expectedUrl);
    should(_url.cache).eql({
      limit  : 50,
      offset : 0
    });
  });

  it('should create the url by replacing localAttribute by attributeUrl', () => {
    store.upsert('@optional.filter.B', { label : 'cat' });
    var _url         = url.create(stores.attributeUrl, 'GET');
    var _expectedUrl = '/attributeUrl?limit=50&offset=0&search=LABEL' +
      encodeURIComponent(':') +
      encodeURIComponent('[cat]')
    ;

    should(_url.request).eql(_expectedUrl);
    should(_url.cache).eql({
      limit  : 50,
      offset : 0,
      0      : ['cat']
    });
  });

  it('should create the url with array attribute in store object', () => {
    store.upsert('@optional.filter.A', { label : ['cat', 'dog'] });
    var _url         = url.create(stores.arrayAttrStoreObject, 'GET');
    var _expectedUrl = '/arrayAttrStoreObject?limit=50&offset=0&search=LABEL' +
      encodeURIComponent(':') +
      encodeURIComponent('[cat,dog]')
    ;

    should(_url.request).eql(_expectedUrl);
    should(_url.cache).eql({
      limit  : 50,
      offset : 0,
      0      : ['cat', 'dog']
    });
  });

  it('should create the url with array attribute in store object not searchable', () => {
    store.upsert('@optional.filter.A', { label : ['cat', 'dog'] });
    var _url         = url.create(stores.arrayAttrStoreObjectSearchable, 'GET');
    var _expectedUrl = '/arrayAttrStoreObjectSearchable?limit=50&offset=0&LABEL=' +
      encodeURIComponent('[cat,dog]')
    ;

    should(_url.request).eql(_expectedUrl);
    should(_url.cache).eql({
      limit  : 50,
      offset : 0,
      0      : ['cat', 'dog']
    });
  });

  it('should create the url with attribute in store object not searchable and one is', () => {
    store.upsert('@optional.filter.A', { label : 'dog' });
    store.upsert('@required.filter.B', { label : 'cat' });
    var _url         = url.create(stores.objAttrStoreObjectSearchableOtherFilters, 'GET');
    var _expectedUrl = '/objAttrStoreObjectSearchableOtherFilters?limit=50&offset=0&label=' +
      encodeURIComponent('dog') +
      '&search=label' + encodeURIComponent(':') + encodeURIComponent('cat')
    ;

    should(_url.request).eql(_expectedUrl);
    should(_url.cache).eql({
      limit  : 50,
      offset : 0,
      0      : 'dog',
      1      : 'cat'
    });
  });

  it('should create url with array filter and <>', () => {
    stores.array.filters[0].operator = ['<>'];
    store.upsert('@optional.filter.B', [{ label : 'cat' }, { label : 'dog' }]);
    var _url         = url.create(stores.array, 'GET');
    var _expectedUrl = '/array?limit=50&offset=0&search=label' +
      encodeURIComponent(':') + fixedEncodeURIComponent('!') +
      encodeURIComponent('[cat,dog]')
    ;

    should(_url.request).eql(_expectedUrl);
  });

  it('should create url with array filter and =', () => {
    stores.array.filters[0].operator = ['='];
    store.upsert('@optional.filter.B', [{ label : 'cat' }, { label : 'dog' }]);
    var _url         = url.create(stores.array, 'GET');
    var _expectedUrl = '/array?limit=50&offset=0&search=label' +
      encodeURIComponent(':') +
      encodeURIComponent('[cat,dog]')
    ;

    should(_url.request).eql(_expectedUrl);
  });
});
