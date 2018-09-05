const template = require('../src/store/store.template');

describe('store templates', () => {

  describe('success template', () => {

    it('should replace $method : GET', () => {
      var _store = {
        nameTranslated  : 'test',
        successTemplate : '$method'
      };
      var _res = template.getSuccess('Default template', _store, 'GET');
      should(_res).eql('${loaded}');
    });

    it('should replace $method : POST', () => {
      var _store = {
        nameTranslated  : 'test',
        successTemplate : '$method'
      };
      var _res = template.getSuccess('Default template', _store, 'POST');
      should(_res).eql('${created}');
    });

    it('should replace $method : PUT', () => {
      var _store = {
        nameTranslated  : 'test',
        successTemplate : '$method'
      };
      var _res = template.getSuccess('Default template', _store, 'PUT');
      should(_res).eql('${edited}');
    });

    it('should replace $method : DELETE', () => {
      var _store = {
        nameTranslated  : 'test',
        successTemplate : '$method'
      };
      var _res = template.getSuccess('Default template', _store, 'DELETE');
      should(_res).eql('${deleted}');
    });

    it('should replace $storeName : default name', () => {
      var _store = {
        name            : 'test',
        successTemplate : '$storeName'
      };
      var _res = template.getSuccess('Default template', _store, 'GET');
      should(_res).eql('test');
    });

    it('should replace $storeName : translated name', () => {
      var _store = {
        name            : 'test',
        nameTranslated  : '${store.test}',
        successTemplate : '$storeName'
      };
      var _res = template.getSuccess('Default template', _store, 'GET');
      should(_res).eql('${store.test}');
    });

    it('should replace $pronounMale : no plural', () => {
      var _store = {
        name            : 'test',
        nameTranslated  : '${store.test}',
        successTemplate : '$pronounMale'
      };
      var _res = template.getSuccess('Default template', _store, 'GET');
      should(_res).eql('${the}');
    });

    it('should replace $pronounMale : plural', () => {
      var _store = {
        name            : 'test',
        nameTranslated  : '${store.test}',
        successTemplate : '$pronounMale'
      };
      var _res = template.getSuccess('Default template', _store, 'GET', true);
      should(_res).eql('${thePlural}');
    });

    it('should replace $pronounMale : no plural', () => {
      var _store = {
        name            : 'test',
        nameTranslated  : '${store.test}',
        successTemplate : '$pronounFemale'
      };
      var _res = template.getSuccess('Default template', _store, 'GET');
      should(_res).eql('${theFemale}');
    });

    it('should replace $pronounMale : plural', () => {
      var _store = {
        name            : 'test',
        nameTranslated  : '${store.test}',
        successTemplate : '$pronounFemale'
      };
      var _res = template.getSuccess('Default template', _store, 'GET', true);
      should(_res).eql('${thePlural}');
    });

    it('should replace multiple vars', () => {
      var _store = {
        name            : 'test',
        nameTranslated  : '${store.test}',
        successTemplate : '$pronounFemale $pronounMale $storeName $method'
      };
      var _res = template.getSuccess('Default template', _store, 'GET');
      should(_res).eql('${theFemale} ${the} ${store.test} ${loaded}');
    });
  });

  describe('error template', () => {
    it('should replace $method : GET', () => {
      var _store = {
        nameTranslated : 'test',
        errorTemplate  : '$method'
      };
      var _res = template.getError('Default template', _store, 'GET');
      should(_res).eql('${load}');
    });

    it('should replace $method : POST', () => {
      var _store = {
        nameTranslated : 'test',
        errorTemplate  : '$method'
      };
      var _res = template.getError('Default template', _store, 'POST');
      should(_res).eql('${create}');
    });

    it('should replace $method : PUT', () => {
      var _store = {
        nameTranslated : 'test',
        errorTemplate  : '$method'
      };
      var _res = template.getError('Default template', _store, 'PUT');
      should(_res).eql('${edit}');
    });

    it('should replace $method : DELETE', () => {
      var _store = {
        nameTranslated : 'test',
        errorTemplate  : '$method'
      };
      var _res = template.getError('Default template', _store, 'DELETE');
      should(_res).eql('${delete}');
    });

    it('should replace $storeName : default name', () => {
      var _store = {
        name          : 'test',
        errorTemplate : '$storeName'
      };
      var _res = template.getError('Default template', _store, 'GET');
      should(_res).eql('test');
    });

    it('should replace $storeName : translated name', () => {
      var _store = {
        name           : 'test',
        nameTranslated : '${store.test}',
        errorTemplate  : '$storeName'
      };
      var _res = template.getError('Default template', _store, 'GET');
      should(_res).eql('${store.test}');
    });

    it('should replace $pronounMale : no plural', () => {
      var _store = {
        name           : 'test',
        nameTranslated : '${store.test}',
        errorTemplate  : '$pronounMale'
      };
      var _res = template.getError('Default template', _store, 'GET');
      should(_res).eql('${the}');
    });

    it('should replace $pronounMale : plural', () => {
      var _store = {
        name           : 'test',
        nameTranslated : '${store.test}',
        errorTemplate  : '$pronounMale'
      };
      var _res = template.getError('Default template', _store, 'GET', true);
      should(_res).eql('${thePlural}');
    });

    it('should replace $pronounMale : no plural', () => {
      var _store = {
        name           : 'test',
        nameTranslated : '${store.test}',
        errorTemplate  : '$pronounFemale'
      };
      var _res = template.getError('Default template', _store, 'GET');
      should(_res).eql('${theFemale}');
    });

    it('should replace $pronounMale : plural', () => {
      var _store = {
        name           : 'test',
        nameTranslated : '${store.test}',
        errorTemplate  : '$pronounFemale'
      };
      var _res = template.getError('Default template', _store, 'GET', true);
      should(_res).eql('${thePlural}');
    });

    it('should replace multiple vars', () => {
      var _store = {
        name           : 'test',
        nameTranslated : '${store.test}',
        errorTemplate  : '$pronounFemale $pronounMale $storeName $method'
      };
      var _res = template.getError('Default template', _store, 'GET');
      should(_res).eql('${theFemale} ${the} ${store.test} ${load}');
    });
  });

});
