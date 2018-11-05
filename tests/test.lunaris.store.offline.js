const storeTestUtils     = require('./testUtils');
const storeOffline       = require('../src/store/store.offline');
const cache              = require('../src/store/store.cache');
const collection         = require('../src/store/store.collection');

describe('offline filters', () => {

  beforeEach(() => {
    collection.resetVersionNumber();
  });

  it('should be defined', () => {
    should(storeOffline.filter).be.ok();
    should(storeOffline.filter).be.Function();
  });

  it('should return an object if the store is a store object', () => {
    var _store = storeTestUtils.initStore('store', {});
    var _cache = cache.getCache(_store);

    _store.data.add({
      id : 1
    });

    var _res = storeOffline.filter(_store, _store.data, _cache, { requiredOptions : {}, optionalOptions : {} });
    should(_res).eql({
      id       : 1,
      _id      : 1,
      _version : [1]
    });
  });

  it('should return an object if the store is a store object : no filter values', () => {
    var _store = storeTestUtils.initStore('store', {});
    var _cache = cache.getCache(_store);

    _store.data.add({
      id : 1
    });

    var _res = storeOffline.filter(_store, _store.data, _cache, { requiredOptions : {}, optionalOptions : {} });
    should(_res).eql({
      id       : 1,
      _id      : 1,
      _version : [1]
    });
  });

  it('should return an array', () => {
    var _store = storeTestUtils.initStore('store', []);
    var _cache = cache.getCache(_store);

    _store.data.add({
      id : 1
    });
    _store.data.add({
      id : 2
    });

    var _res = storeOffline.filter(_store, _store.data, _cache, { requiredOptions : {}, optionalOptions : {} });
    should(_res).eql([
      {
        id       : 1,
        _id      : 1,
        _version : [1]
      }, {
        id       : 2,
        _id      : 2,
        _version : [2]
      }
    ]);
  });

  it('should return an array : no filter values', () => {
    var _store = storeTestUtils.initStore('store', []);
    var _cache = cache.getCache(_store);

    _store.data.add({
      id : 1
    });
    _store.data.add({
      id : 2
    });

    var _res = storeOffline.filter(_store, _store.data, _cache);
    should(_res).eql([
      {
        id       : 1,
        _id      : 1,
        _version : [1]
      }, {
        id       : 2,
        _id      : 2,
        _version : [2]
      }
    ]);
  });

  it('should filter required filter', () => {
    var _map = [{
      id    : ['<<int>>'],
      label : ['string']
    }];
    var _store = storeTestUtils.initStore('store', _map, null, null, [
      {
        source          : '@source',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        isRequired      : true
      }
    ], { source : { isStoreObject : true }});

    var _data = [
      {
        id    : 1,
        label : 'A'
      }, {
        id    : 2,
        label : 'A'
      }, {
        id    : 3,
        label : 'B'
      }, {
        id    : 4,
        label : 'B'
      }, {
        id    : 5,
        label : 'C'
      }, {
        id    : 6,
        label : 'C'
      }
    ];

    for (var i = 0; i < _data.length; i++) {
      _store.data.add(_data[i]);
    }

    var _filterValues = {
      requiredOptions : {
        0 : ['label', 'B', 'ILIKE']
      },
      optionalOptions : {}
    };

    var _filteredValues = storeOffline.filter(_store, _store.data, cache.getCache(_store), _filterValues);
    should(_filteredValues).be.an.Array().and.have.lengthOf(2);
    should(_filteredValues).eql([
      {
        id       : 3,
        label    : 'B',
        _id      : 3,
        _version :  [3]
      }, {
        id       : 4,
        label    : 'B',
        _id      : 4,
        _version : [4]
      }
    ]);
  });

  it('should filter multiple required filters', () => {
    var _map = [{
      id       : ['<<int>>'],
      label    : ['string'],
      category : ['object', {
        id : ['int']
      }]
    }];
    var _store = storeTestUtils.initStore('store', _map, null, null, [
      {
        source          : '@source',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        isRequired      : true
      }, {
        source          : '@source',
        sourceAttribute : 'categoryId',
        localAttribute  : 'category.id',
        isRequired      : true
      }
    ], { source : { isStoreObject : true }});

    var _data = [
      {
        id       : 1,
        label    : 'A',
        category : { id : 1 }
      }, {
        id       : 2,
        label    : 'A',
        category : { id : 2 }
      }, {
        id       : 3,
        label    : 'B',
        category : { id : 3 }
      }, {
        id       : 4,
        label    : 'B',
        category : { id : 4 }
      }, {
        id       : 5,
        label    : 'C',
        category : { id : 5 }
      }, {
        id       : 6,
        label    : 'C',
        category : { id : 6 }
      }
    ];

    for (var i = 0; i < _data.length; i++) {
      _store.data.add(_data[i]);
    }

    var _filterValues = {
      requiredOptions : {
        0 : ['label'      , 'B', 'ILIKE'],
        1 : ['category.id', 3  , 'ILIKE']
      },
      optionalOptions : {}
    };

    var _filteredValues = storeOffline.filter(_store, _store.data, cache.getCache(_store), _filterValues);
    should(_filteredValues).be.an.Array().and.have.lengthOf(1);
    should(_filteredValues).eql([
      {
        id       : 3,
        label    : 'B',
        category : { id : 3 },
        _id      : 3,
        _version : [3]
      }
    ]);
  });

  it('should filter ILIKE filter', () => {
    var _map = [{
      id    : ['<<int>>'],
      label : ['string']
    }];
    var _store = storeTestUtils.initStore('store', _map, null, null, [
      {
        source          : '@source',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : 'ILIKE'
      }
    ]);

    var _data = [
      {
        id    : 1,
        label : 'patate chaude'
      }, {
        id    : 2,
        label : 'patate'
      }, {
        id    : 3,
        label : 'purée chaude'
      }, {
        id    : 4,
        label : 'purée'
      }, {
        id    : 5,
        label : 'pomme chaude'
      }, {
        id    : 6,
        label : 'pomme'
      }
    ];

    for (var i = 0; i < _data.length; i++) {
      _store.data.add(_data[i]);
    }

    var _filterValues = {
      requiredOptions : {},
      optionalOptions : {
        0 : ['label', 'pomme', 'ILIKE']
      }
    };

    var _filteredValues = storeOffline.filter(_store, _store.data, cache.getCache(_store), _filterValues);
    should(_filteredValues).be.an.Array().and.have.lengthOf(2);
    should(_filteredValues).eql([
      {
        id       : 5,
        label    : 'pomme chaude',
        _id      : 5,
        _version : [5]
      }, {
        id       : 6,
        label    : 'pomme',
        _id      : 6,
        _version : [6]
      }
    ]);

    _filterValues.optionalOptions[0][1] = 'pomme chaude';
    _filteredValues                     = storeOffline.filter(_store, _store.data, cache.getCache(_store), _filterValues);
    should(_filteredValues).be.an.Array().and.have.lengthOf(1);
    should(_filteredValues).eql([
      {
        id       : 5,
        label    : 'pomme chaude',
        _id      : 5,
        _version : [5]
      }
    ]);
  });

  it('should ILIKE filter does not use stopwords', () => {
    var _map = [{
      id    : ['<<int>>'],
      label : ['string']
    }];
    var _store = storeTestUtils.initStore('store', _map, null, null, [
      {
        source          : '@source',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : 'ILIKE'
      }
    ]);

    var _data = [
      {
        id    : 1,
        label : 'c\'est une patate chaude'
      }, {
        id    : 2,
        label : 'je suis une patate chaude'
      }
    ];

    for (var i = 0; i < _data.length; i++) {
      _store.data.add(_data[i]);
    }

    var _filterValues = {
      requiredOptions : {},
      optionalOptions : {
        0 : ['label', 'tu es une patate chaude', 'ILIKE']
      }
    };

    var _filteredValues = storeOffline.filter(_store, _store.data, cache.getCache(_store), _filterValues);
    should(_filteredValues).be.an.Array().and.have.lengthOf(2);
    should(_filteredValues).eql([
      {
        id       : 1,
        label    : 'c\'est une patate chaude',
        _id      : 1,
        _version : [1]
      }, {
        id       : 2,
        label    : 'je suis une patate chaude',
        _id      : 2,
        _version : [2]
      }
    ]);
  });

  it('should ILIKE filter remove accentuation', () => {
    var _map = [{
      id    : ['<<int>>'],
      label : ['string']
    }];
    var _store = storeTestUtils.initStore('store', _map, null, null, [
      {
        source          : '@source',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : 'ILIKE'
      }
    ]);

    var _data = [
      {
        id    : 1,
        label : 'purée chaude'
      }, {
        id    : 2,
        label : 'purée'
      }
    ];

    for (var i = 0; i < _data.length; i++) {
      _store.data.add(_data[i]);
    }

    var _filterValues = {
      requiredOptions : {},
      optionalOptions : {
        0 : ['label', 'purée', 'ILIKE']
      }
    };

    var _filteredValues = storeOffline.filter(_store, _store.data, cache.getCache(_store), _filterValues);
    should(_filteredValues).be.an.Array().and.have.lengthOf(2);
    should(_filteredValues).eql([
      {
        id       : 1,
        label    : 'purée chaude',
        _id      : 1,
        _version : [1]
      }, {
        id       : 2,
        label    : 'purée',
        _id      : 2,
        _version : [2]
      }
    ]);
  });

  it('should ILIKE filter search misspelling word', () => {
    var _map = [{
      id    : ['<<int>>'],
      label : ['string']
    }];
    var _store = storeTestUtils.initStore('store', _map, null, null, [
      {
        source          : '@source',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : 'ILIKE'
      }
    ]);

    var _data = [
      {
        id    : 1,
        label : 'patate chaude'
      }, {
        id    : 2,
        label : 'patate'
      }
    ];

    for (var i = 0; i < _data.length; i++) {
      _store.data.add(_data[i]);
    }

    var _filterValues = {
      requiredOptions : {},
      optionalOptions : {
        0 : ['label', 'pattate', 'ILIKE']
      }
    };

    var _filteredValues = storeOffline.filter(_store, _store.data, cache.getCache(_store), _filterValues);
    should(_filteredValues).be.an.Array().and.have.lengthOf(2);
    should(_filteredValues).eql([
      {
        id       : 1,
        label    : 'patate chaude',
        _id      : 1,
        _version : [1]
      }, {
        id       : 2,
        label    : 'patate',
        _id      : 2,
        _version : [2]
      }
    ]);
  });

  it('should filter multiple required and optional filters', () => {
    var _map = [{
      id       : ['<<int>>'],
      label    : ['string'],
      category : ['object', {
        id : ['int']
      }]
    }];
    var _store = storeTestUtils.initStore('store', _map, null, null, [
      {
        source          : '@source',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        isRequired      : true
      }, {
        source          : '@source',
        sourceAttribute : 'categoryId',
        localAttribute  : 'category.id',
        operator        : 'ILIKE'
      }
    ]);

    var _data = [
      {
        id       : 1,
        label    : 'A',
        category : { id : '1' }
      }, {
        id       : 2,
        label    : 'A',
        category : { id : '2' }
      }, {
        id       : 3,
        label    : 'B',
        category : { id : '3' }
      }, {
        id       : 4,
        label    : 'B',
        category : { id : '4' }
      }, {
        id       : 5,
        label    : 'C',
        category : { id : '5' }
      }, {
        id       : 6,
        label    : 'C',
        category : { id : '6' }
      }
    ];

    for (var i = 0; i < _data.length; i++) {
      _store.data.add(_data[i]);
    }

    var _filterValues = {
      requiredOptions : {
        0 : ['label'      , 'B', 'ILIKE']
      },
      optionalOptions : {
        1 : ['category.id', '4', 'ILIKE']
      }
    };

    var _filteredValues = storeOffline.filter(_store, _store.data, cache.getCache(_store), _filterValues);
    should(_filteredValues).be.an.Array().and.have.lengthOf(1);
    should(_filteredValues).eql([
      {
        id       : 4,
        label    : 'B',
        category : { id : '4' },
        _id      : 4,
        _version : [4]
      }
    ]);
  });

  it('should filter optional filter with filter store array', () => {
    var _map = [{
      id    : ['<<int>>'],
      label : ['string']
    }];
    var _store = storeTestUtils.initStore('store', _map, null, null, [
      {
        source          : '@source',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : 'ILIKE'
      }
    ]);

    var _data = [
      {
        id    : 1,
        label : 'A'
      }, {
        id    : 2,
        label : 'A'
      }, {
        id    : 3,
        label : 'B'
      }, {
        id    : 4,
        label : 'B'
      }, {
        id    : 5,
        label : 'C'
      }, {
        id    : 6,
        label : 'C'
      }
    ];

    for (var i = 0; i < _data.length; i++) {
      _store.data.add(_data[i]);
    }

    var _filterValues = {
      requiredOptions : {},
      optionalOptions : {
        0 : ['label', ['B', 'C'], 'ILIKE']
      }
    };

    var _filteredValues = storeOffline.filter(_store, _store.data, cache.getCache(_store), _filterValues);
    should(_filteredValues).be.an.Array().and.have.lengthOf(4);
    should(_filteredValues).eql([
      {
        id       : 3,
        label    : 'B',
        _id      : 3,
        _version : [3]
      }, {
        id       : 4,
        label    : 'B',
        _id      : 4,
        _version : [4]
      }, {
        id       : 5,
        label    : 'C',
        _id      : 5,
        _version : [5]
      }, {
        id       : 6,
        label    : 'C',
        _id      : 6,
        _version : [6]
      }
    ]);
  });

  it('should preload the cache if the data length > store pagination limit and nb items found === pagination limit', () => {
    var _map = [{
      id    : ['<<int>>'],
      label : ['string']
    }];
    var _store = storeTestUtils.initStore('store', _map, null, null, [
      {
        source          : '@source',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : 'ILIKE'
      }
    ]);
    _store.paginationLimit = 2;

    var _data = [
      {
        id    : 1,
        label : 'A'
      }, {
        id    : 2,
        label : 'A'
      }, {
        id    : 3,
        label : 'B'
      }, {
        id    : 4,
        label : 'B'
      }, {
        id    : 5,
        label : 'C'
      }, {
        id    : 6,
        label : 'C'
      }
    ];

    for (var i = 0; i < _data.length; i++) {
      _store.data.add(_data[i]);
    }

    var _filterValues = {
      requiredOptions : {},
      optionalOptions : {
        0 : ['label', ['B', 'C'], 'ILIKE']
      },
      cache : {
        limit  : 2,
        offset : 0,
        0      : ['B', 'C']
      }
    };

    var _cache          = cache.getCache(_store);
    var _filteredValues = storeOffline.filter(_store, _store.data, _cache, _filterValues);
    should(_filteredValues).be.an.Array().and.have.lengthOf(2);
    should(_filteredValues).eql([
      {
        id       : 3,
        label    : 'B',
        _id      : 3,
        _version : [3]
      }, {
        id       : 4,
        label    : 'B',
        _id      : 4,
        _version : [4]
      }
    ]);

    should(_cache._cache()).eql([
      [
        {
          0      : ['B', 'C'],
          limit  : 2,
          offset : 2
        },
        [5, 6]
      ]
    ]);
  });

  it('should preload the cache if the data length > store pagination limit and nb items found <= pagination limit', () => {
    var _map = [{
      id    : ['<<int>>'],
      label : ['string']
    }];
    var _store = storeTestUtils.initStore('store', _map, null, null, [
      {
        source          : '@source',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : 'ILIKE'
      }
    ]);
    _store.paginationLimit = 2;

    var _data = [
      {
        id    : 1,
        label : 'A'
      }, {
        id    : 2,
        label : 'A'
      }, {
        id    : 3,
        label : 'B'
      }, {
        id    : 4,
        label : 'B'
      }, {
        id    : 5,
        label : 'C'
      }
    ];

    for (var i = 0; i < _data.length; i++) {
      _store.data.add(_data[i]);
    }

    var _filterValues = {
      requiredOptions : {},
      optionalOptions : {
        0 : ['label', ['B', 'C'], 'ILIKE']
      },
      cache : {
        limit  : 2,
        offset : 0,
        0      : ['B', 'C']
      }
    };

    var _cache          = cache.getCache(_store);
    var _filteredValues = storeOffline.filter(_store, _store.data, _cache, _filterValues);
    should(_filteredValues).be.an.Array().and.have.lengthOf(2);
    should(_filteredValues).eql([
      {
        id       : 3,
        label    : 'B',
        _id      : 3,
        _version : [3]
      }, {
        id       : 4,
        label    : 'B',
        _id      : 4,
        _version : [4]
      }
    ]);

    should(_cache._cache()).eql([
      [
        {
          0      : ['B', 'C'],
          limit  : 2,
          offset : 2
        },
        [5]
      ]
    ]);
  });

  it('should not preload the cache if the data length <= store pagination limit', () => {
    var _map = [{
      id    : ['<<int>>'],
      label : ['string']
    }];
    var _store = storeTestUtils.initStore('store', _map, null, null, [
      {
        source          : '@source',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : 'ILIKE'
      }
    ]);
    _store.paginationLimit = 4;

    var _data = [
      {
        id    : 1,
        label : 'A'
      }, {
        id    : 2,
        label : 'A'
      }, {
        id    : 3,
        label : 'B'
      }, {
        id    : 4,
        label : 'B'
      }, {
        id    : 5,
        label : 'C'
      }, {
        id    : 6,
        label : 'C'
      }
    ];

    for (var i = 0; i < _data.length; i++) {
      _store.data.add(_data[i]);
    }

    var _filterValues = {
      requiredOptions : {},
      optionalOptions : {
        0 : ['label', ['B', 'C'], 'ILIKE']
      },
      cache : {
        limit  : 2,
        offset : 0,
        0      : ['B', 'C']
      }
    };

    var _cache          = cache.getCache(_store);
    var _filteredValues = storeOffline.filter(_store, _store.data, _cache, _filterValues);
    should(_filteredValues).be.an.Array().and.have.lengthOf(4);
    should(_filteredValues).eql([
      {
        id       : 3,
        label    : 'B',
        _id      : 3,
        _version : [3]
      }, {
        id       : 4,
        label    : 'B',
        _id      : 4,
        _version : [4]
      }, {
        id       : 5,
        label    : 'C',
        _id      : 5,
        _version : [5]
      }, {
        id       : 6,
        label    : 'C',
        _id      : 6,
        _version : [6]
      }
    ]);

    should(_cache._cache()).eql([]);
  });
});
