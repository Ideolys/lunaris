const testUtils      = require('./testUtils');
const url            = require('../src/store/store.url');
const exportsLunaris = require('../src/exports');
const stores         = {
  noFilter            : testUtils.initStore('noFilter'),
  'required.filter.A' : testUtils.initStore('required.filter.A'),
  'required.filter.B' : testUtils.initStore('required.filter.B'),
  required            : testUtils.initStore('required'),
  requiredMultiple    : testUtils.initStore('requiredMultiple'),
  error               : testUtils.initStore('error'),
  'optional.filter.A' : testUtils.initStore('optional.filter.A'),
  'optional.filter.B' : testUtils.initStore('optional.filter.B'),
  optional            : testUtils.initStore('optional'),
  optionalMultiple    : testUtils.initStore('optionalMultiple'),
  mix                 : testUtils.initStore('mix'),
  array               : testUtils.initStore('array'),
  where               : testUtils.initStore('where'),
  whereObject         : testUtils.initStore('whereObject')
};
const defaultStoresValue = JSON.parse(JSON.stringify(exportsLunaris._stores));
const store              = require('../src/store/store');

describe('store url', () => {
  before(() => {
    exportsLunaris._stores   = stores;
    stores.required.filters  = [{
      source          : '@required.filter.A',
      sourceAttribute : 'label',
      localAttribute  : 'label',
      isRequired      : true
    }];
    stores['required.filter.A'].isStoreObject = true;
    stores['required.filter.B'].isStoreObject = true;
    stores['optional.filter.A'].isStoreObject = true;
    stores.requiredMultiple.filters           = [
      {
        source          : '@required.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        isRequired      : true
      }, {
        source          : '@required.filter.B',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        isRequired      : true
      }
    ];
    stores.optional.filters = [
      {
        source          : '@optional.filter.A',
        sourceAttribute : 'label',
        localAttribute  : 'label'
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
        isRequired      : true
      }, {
        source          : '@required.filter.B',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        isRequired      : true
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
        localAttribute  : 'label'
      }
    ];
    stores.where.filters = [
      {
        source          : '@optional.filter.B',
        sourceAttribute : 'label',
        sourceWhere     : function (item) { return item.isChecked === true; },
        localAttribute  : 'label'
      }
    ];
    stores.whereObject.filters = [
      {
        source          : '@required.filter.B',
        sourceAttribute : 'label',
        sourceWhere     : function (item) { return item.isChecked === true; },
        localAttribute  : 'label',
        isRequired      : true
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

    it('should increment the pagination offset', () => {
      var _url = url.create(stores.noFilter, 'GET');
      should(_url.request).eql('/noFilter?limit=50&offset=0');
      should(_url.cache).eql({
        limit  : 50,
        offset : 0
      });

      _url = url.create(stores.noFilter, 'GET');
      should(_url.request).eql('/noFilter?limit=50&offset=50');
      should(_url.cache).eql({
        limit  : 50,
        offset : 50
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

    it('should throw an error if no source has been defined', () => {
      stores.error.filters = [{}];
      try {
        url.create(stores.error, 'GET');
      }
      catch (e) {
        should(e).eql(new Error('A filter must have a source defined as : filter.source = @<store>'));
      }
    });

    it('should throw an error if no sourceAttribute has been defined', () => {
      stores.error.filters = [{
        source : '@errorFilter'
      }];
      try {
        url.create(stores.error, 'GET');
      }
      catch (e) {
        should(e).eql(new Error('A filter must have a source attribute defined as : filter.sourceAttribute = <attribute>'));
      }
    });

    it('should throw an error if no localAttribute has been defined', () => {
      stores.error.filters = [{
        source          : '@errorFilter',
        sourceAttribute : 'label'
      }];
      try {
        url.create(stores.error, 'GET');
      }
      catch (e) {
        should(e).eql(new Error('A filter must have a local attribute defined as : filter.localAttribute = <attribute>'));
      }
    });

    it('should create the url for one required filter', () => {
      store.upsert('@required.filter.A', { label : 'cat' });
      var _url = url.create(stores.required, 'GET');
      should(_url.request).eql('/required/label/cat?limit=50&offset=0');
      should(_url.cache).eql({
        limit                      : 50,
        offset                     : 0,
        '@required.filter.A:label' : 'cat'
      });
    });

    it('should conserve the pagination in the cache', () => {
      store.upsert('@required.filter.A', { label : 'cat' });
      var _url = url.create(stores.required, 'GET');
      should(_url.request).eql('/required/label/cat?limit=50&offset=0');
      should(_url.cache).eql({
        limit                      : 50,
        offset                     : 0,
        '@required.filter.A:label' : 'cat'
      });
      _url = url.create(stores.required, 'GET');
      should(_url.request).eql('/required/label/cat?limit=50&offset=50');
      should(_url.cache).eql({
        limit                      : 50,
        offset                     : 50,
        '@required.filter.A:label' : 'cat'
      });
    });

    it('should create the url for required filters', () => {
      store.upsert('@required.filter.A', { label : 'cat' });
      store.upsert('@required.filter.B', { label : 'dog' });
      var _url = url.create(stores.requiredMultiple, 'GET');
      should(_url.request).eql('/requiredMultiple/label/cat/label/dog?limit=50&offset=0');
      should(_url.cache).eql({
        limit                      : 50,
        offset                     : 0,
        '@required.filter.A:label' : 'cat',
        '@required.filter.B:label' : 'dog'
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
        limit                      : 50,
        offset                     : 0,
        '@required.filter.B:label' : 'dog'
      });
      delete stores.requiredMultiple.filters[0].httpMethods;
    });

    it('should create the url with a where function for required filter', () => {
      store.upsert('@required.filter.B', { label : 'cat' , isChecked : true });
      var _url         = url.create(stores.whereObject, 'GET');
      var _expectedUrl = '/whereObject/label/cat?limit=50&offset=0';
      should(_url.request).eql(_expectedUrl);
      should(_url.cache).eql({
        limit                      : 50,
        offset                     : 0,
        '@required.filter.B:label' : 'cat'
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
        limit                      : 50,
        offset                     : 0,
        '@optional.filter.A:label' : 'cat'
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
        limit                      : 50,
        offset                     : 0,
        '@optional.filter.A:label' : 'cat'
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
        limit                      : 50,
        offset                     : 0,
        '@optional.filter.A:label' : 'cat'
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
        limit                      : 50,
        offset                     : 0,
        '@optional.filter.A:label' : 'cat'
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
        limit                      : 50,
        offset                     : 0,
        '@optional.filter.A:label' : 'cat'
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
        limit                      : 50,
        offset                     : 0,
        '@optional.filter.A:label' : 'cat'
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
        limit                      : 50,
        offset                     : 0,
        '@optional.filter.A:label' : 'cat'
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
        limit                      : 50,
        offset                     : 0,
        '@optional.filter.A:label' : 'cat'
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
        limit                      : 50,
        offset                     : 0,
        '@optional.filter.A:label' : 'cat'
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
        limit                      : 50,
        offset                     : 0,
        '@optional.filter.B:label' : ['dog', 'lion']
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

  it('should throw an error if operator is different from ILIKE', () => {
    try {
      stores.array.filters[0].operator = ['>'];
      store.upsert('@optional.filter.B', [{ label : 'cat' }, { label : 'dog' }]);
      url.create(stores.array, 'GET');
    }
    catch (e) {
      should(e).eql(new Error('Array filter must declare ILIKE operator or nothing!'));
    }
  });
});
