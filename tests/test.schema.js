var schema = require('../lib/_builder/store/schema');

describe('Schema', () => {

  describe('analyzeDescriptor(obj)', () => {

    it('should analyze a descriptor and return a flat description of the object and accept that an array has no descriptions', () => {
      var _expectedTreeDescriptor = {
        compilation : {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              id : ['array']
            },
            objTrans : {},
            level    : 0,
            keys     : []
          }
        }
      };

      var _expectedDefaultValue = {
        id : []
      };

      var _objectDescriptor = {
        id : ['array']
      };
      var _computed = schema.analyzeDescriptor(_objectDescriptor);
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
      should(_computed.defaultValue).eql(_expectedDefaultValue);
    });

    it('should analyze a descriptor and return a flat description of the array (array of object)', () => {
      var _expectedCompilationDescriptor = {
        main0 : {
          arrChild   : [],
          arrParents : [],
          objParent  : '',
          name       : '',
          type       : 'array',
          obj        : {
            id : ['array']
          },
          objTrans : {
            id : 'idMenu'
          },
          level : 0,
          keys  : ['idMenu']
        }
      };

      var _expectedDefaultValue = {
        id : []
      };

      // array of object
      var _objectDescriptor = [{
        id : ['array', '<<idMenu>>']
      }];

      var _computed = schema.analyzeDescriptor(_objectDescriptor);
      should(_computed.compilation).eql(_expectedCompilationDescriptor);
      should(_computed.defaultValue).eql(_expectedDefaultValue);
    });

    it('should analyze a descriptor and return a flat description of the object and accept that an object has no descriptions', () => {
      var _expectedCompilationDescriptor = {
        main0 : {
          arrChild   : [],
          arrParents : [],
          objParent  : '',
          name       : '',
          type       : 'object',
          obj        : {
            id : ['object']
          },
          objTrans : {},
          level    : 0,
          keys     : []
        }
      };

      var _expectedDefaultValue = {
        id : null
      };

      var _objectDescriptor = {
        id : ['object']
      };
      var _computed = schema.analyzeDescriptor(_objectDescriptor);
      should(_computed.compilation).eql(_expectedCompilationDescriptor);
      should(_computed.defaultValue).eql(_expectedDefaultValue);
    });

    it('should analyze a descriptor and return a flat description of the object and accept multtiple paramaters in the array descriptions', () => {
      var _expectedCompilationDescriptor = {
        main0 : {
          arrChild   : [],
          arrParents : [],
          objParent  : '',
          name       : '',
          type       : 'object',
          obj        : {
            id : ['array', 'min', 1, 'max', 5]
          },
          objTrans : {},
          level    : 0,
          keys     : []
        }
      };

      var _expectedDefaultValue = {
        id : []
      };

      var _objectDescriptor = {
        id : ['array', 'min', 1, 'max', 5]
      };
      var _computed = schema.analyzeDescriptor(_objectDescriptor);
      should(_computed.compilation).eql(_expectedCompilationDescriptor);
      should(_computed.defaultValue).eql(_expectedDefaultValue);
    });


    it('should analyze a descriptor and return a flat description of the object and accept multtiple paramaters in the array descriptions', () => {
      var _expectedCompilationDescriptor = {
        main0 : {
          arrChild   : ['obj1'],
          arrParents : [],
          objParent  : '',
          name       : '',
          type       : 'object',
          obj        : {
            obj : ['array', 'min', 1, 'max', 5]
          },
          objTrans : {
            obj : []
          },
          level : 0,
          keys  : []
        },
        obj1 : {
          arrChild   : [],
          arrParents : [],
          objParent  : 'main0',
          name       : 'obj',
          type       : 'array',
          obj        : {
            test : ['int']
          },
          objTrans : {
            test : 'idTest'
          },
          level : 1,
          keys  : ['idTest']
        }
      };

      var _expectedDefaultValue = {
        obj : [{
          test : null
        }]
      };

      var _objectDescriptor = {
        obj : ['array', 'min', 1, 'max', 5, {
          test : ['int', '<<idTest>>']
        }]
      };
      var _computed = schema.analyzeDescriptor(_objectDescriptor);
      should(_computed.compilation).eql(_expectedCompilationDescriptor);
      should(_computed.defaultValue).eql(_expectedDefaultValue);
    });

    it('should not alter the original descriptor', () => {
      var _expectedDescriptor = {
        obj : ['array', 'min', 1, 'max', 5, {
          test : ['int', '<<idTest>>']
        }]
      };
      var _objectDescriptor = {
        obj : ['array', 'min', 1, 'max', 5, {
          test : ['int', '<<idTest>>']
        }]
      };

      schema.analyzeDescriptor(_objectDescriptor);
      should(_objectDescriptor).eql(_expectedDescriptor);
    });

    it('should analyze a descriptor and return a flat description of the object and accept transform functions', () => {
      var _expectedTreeDescriptor = {
        onTransform : {
          main0_obj : function () {
            return 1;
          }
        },
        compilation : {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              obj : ['array', 'min', 1, 'max', 5]
            },
            objTrans : {
              obj : {
                type : 'function'
              }
            },
            level : 0,
            keys  : []
          }
        }
      };

      var _expectedDefaultValue = {
        obj : []
      };

      var _objectDescriptor = {
        obj : ['array', 'min', 1, 'max', 5, 'onTransform', function () {
          return 1;
        }]
      };
      var _computed = schema.analyzeDescriptor(_objectDescriptor);
      should(_computed.onTransform.toString()).eql(_expectedTreeDescriptor.onTransform.toString());
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
      should(_computed.defaultValue).eql(_expectedDefaultValue);
    });

    it('should analyze a descriptor and return a flat description of the object and consider transform functions instead of column names if both are defined', () => {
      var _expectedTreeDescriptor = {
        onTransform : {
          main0_obj : function () {
            return 1;
          }
        },
        compilation : {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              obj : ['array', 'min', 1, 'max', 5]
            },
            objTrans : {
              obj : {
                type : 'function'
              }
            },
            level : 0,
            keys  : []
          }
        }
      };

      var _expectedDefaultValue = {
        obj : []
      };

      var _objectDescriptor = {
        obj : ['array', 'min', 1, 'max', 5, '<idMenu>', 'onTransform', function () {
          return 1;
        }]
      };
      var _computed = schema.analyzeDescriptor(_objectDescriptor);
      should(_computed.onTransform.toString()).eql(_expectedTreeDescriptor.onTransform.toString());
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
      should(_computed.defaultValue).eql(_expectedDefaultValue);
    });

    it('should analyze a descriptor and return a flat description of the object and accept integer values on Transform', () => {
      var _expectedTreeDescriptor = {
        compilation : {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              obj : ['array', 'min', 1, 'max', 5]
            },
            objTrans : {
              obj : {
                type  : 'int',
                value : 33
              }
            },
            level : 0,
            keys  : []
          }
        }
      };
      var _objectDescriptor = {
        obj : ['array', 'min', 1, 'max', 5, 'onTransform', 33]
      };
      var _computed = schema.analyzeDescriptor(_objectDescriptor);
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
    });

    it('should analyze a descriptor and return a flat description of the object and accept integer values on Transform', () => {
      var _expectedTreeDescriptor = {
        compilation : {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              obj : ['array', 'min', 1, 'max', 5]
            },
            objTrans : {
              obj : {
                type  : 'string',
                value : '33string'
              }
            },
            level : 0,
            keys  : []
          }
        }
      };
      var _objectDescriptor = {
        obj : ['array', 'min', 1, 'max', 5, 'onTransform', '33string']
      };
      var _computed = schema.analyzeDescriptor(_objectDescriptor);
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
    });

    it('should analyze a descriptor and return a flat description of the object and parse sql column names in simple chevron (remove any unused spaces)', () => {
      var _expectedTreeDescriptor = {
        compilation : {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              obj : ['array', 'min', 1, 'max', 5]
            },
            objTrans : {
              obj : 'idMenu'
            },
            level : 0,
            keys  : []
          }
        }
      };
      var _computed = schema.analyzeDescriptor({
        obj : ['array', 'min', 1, 'max', 5, '<idMenu>']
      });
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
      _computed = schema.analyzeDescriptor({
        obj : ['array', 'min', 1, 'max', 5, '<   idMenu>']
      });
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
      _computed = schema.analyzeDescriptor({
        obj : ['array', 'min', 1, 'max', 5, '<  idMenu   >']
      });
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
      _computed = schema.analyzeDescriptor({
        obj : ['array', 'min', 1, 'max', 5, '   < idMenu   >  ']
      });
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
    });


    it('should analyze a descriptor and return a flat description of the object and parse sql column names in double chevron (remove any unused spaces)', () => {
      var _expectedTreeDescriptor = {
        compilation : {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object', // TODO, strange?
            obj        : {
              obj : ['array', 'min', 1, 'max', 5]
            },
            objTrans : {
              obj : 'idMenu'
            },
            level : 0,
            keys  : []
          }
        }
      };
      var _computed = schema.analyzeDescriptor({
        obj : ['array', 'min', 1, 'max', 5, '<<idMenu>>']
      });
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
      _computed = schema.analyzeDescriptor({
        obj : ['array', 'min', 1, 'max', 5, '<<   idMenu>>']
      });
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
      _computed = schema.analyzeDescriptor({
        obj : ['array', 'min', 1, 'max', 5, '<<  idMenu   >>']
      });
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
      _computed = schema.analyzeDescriptor({
        obj : ['array', 'min', 1, 'max', 5, '   << idMenu   >>  ']
      });
      should(_computed.compilation).eql(_expectedTreeDescriptor.compilation);
    });

    it('should throw an error if the validate or transform function is not passed or nor correct', () => {
      try {
        schema.analyzeDescriptor({
          obj : ['array', () => {
            return 1;
          }]
        });
      }
      catch (e) {
        should(e).be.an.Error();
      }
    });

    it('should throw an error if the descriptor does not contain arrays', () => {
      try {
        schema.analyzeDescriptor({
          obj : '<<idMenu>>'
        });
      }
      catch (e) {
        should(e).be.an.Error();
      }
    });

    it('should throw an error there is an array without primary keys (double chevron) ', () => {
      var _objectDescriptor = {
        id        : ['int', '<<idContinent>>'],
        continent : ['string', '<continentName>'],
        countries : ['array', {
          id   : ['int', '<<idCountry>>'],
          name : ['string', '<countryName>']
        }]
      };
      try {
        schema.analyzeDescriptor(_objectDescriptor);
      }
      catch (e) {
        should(e).not.be.an.Error();
      }
      try {
        _objectDescriptor['countries'][1]['id'] = '<idCountry>'; // no primary key  (simple chevron)
        schema.analyzeDescriptor(_objectDescriptor);
      }
      catch (e) {
        should(e).be.an.Error();
      }
    });

    it('should compute a sql map between attributes and sql name', () => {
      var _computed = schema.analyzeDescriptor([{
        id : ['array', '<<idMenu>>']
      }]);
      should(_computed.meta.jsonToSQL).eql({
        id : 'idMenu'
      });
      _computed = schema.analyzeDescriptor([{
        id : ['<<idMenu>>']
      }]);
      should(_computed.meta.jsonToSQL).eql({
        id : 'idMenu'
      });
      _computed = schema.analyzeDescriptor({
        id : ['<idMenu>']
      });
      should(_computed.meta.jsonToSQL).eql({
        id : 'idMenu'
      });
      _computed = schema.analyzeDescriptor({
        id    : ['<idMenu>'],
        label : ['<labelMenu>']
      });
      should(_computed.meta.jsonToSQL).eql({
        id    : 'idMenu',
        label : 'labelMenu'
      });
    });

    it('should compute a sql map even with objects', () => {
      var _computed = schema.analyzeDescriptor({
        id   : ['<idMenu>'],
        menu : ['object', {
          element : ['<labelMenu>']
        }]
      });
      should(_computed.meta.jsonToSQL).eql({
        id              : 'idMenu',
        'menu[element]' : 'labelMenu'
      });
      _computed = schema.analyzeDescriptor({
        id   : ['<idMenu>'],
        menu : ['object', {
          element : ['<labelMenu>'],
          id      : ['<<idMenu>>']
        }]
      });
      should(_computed.meta.jsonToSQL).eql({
        id              : 'idMenu',
        'menu[element]' : 'labelMenu',
        'menu[id]'      : 'idMenu'
      });
    });

    it('should compute a sql map even with arrays', () => {
      var _computed = schema.analyzeDescriptor({
        id   : ['<idMenu>'],
        menu : ['array', {
          element : ['<<labelMenu>>']
        }]
      });
      should(_computed.meta.jsonToSQL).eql({
        id                : 'idMenu',
        'menu[][element]' : 'labelMenu'
      });
      _computed = schema.analyzeDescriptor({
        id   : ['<idMenu>'],
        menu : ['array', {
          id      : ['<<idMenu>>'],
          element : ['<labelMenu>']
        }]
      });
      should(_computed.meta.jsonToSQL).eql({
        id                : 'idMenu',
        'menu[][id]'      : 'idMenu',
        'menu[][element]' : 'labelMenu'
      });
    });

    it('should compute a sql map even with nested objects', () => {
      var _computed = schema.analyzeDescriptor({
        id   : ['<idMenu>'],
        menu : ['array', {
          element : ['<<labelMenu>>'],
          dish    : ['object', {
            id : ['<idDish>']
          }]
        }]
      });
      should(_computed.meta.jsonToSQL).eql({
        id                 : 'idMenu',
        'menu[][element]'  : 'labelMenu',
        'menu[][dish][id]' : 'idDish'
      });
    });

    it('should compute a sql map even with multiple arrays', () => {
      var _computed = schema.analyzeDescriptor({
        id   : ['<idMenu>'],
        menu : ['array', {
          element : ['<<labelMenu>>'],
          dish    : ['array', {
            id : ['<<idDish>>']
          }],
          meal : ['array', {
            id : ['<<idMeal>>']
          }]
        }]
      });
      should(_computed.meta.jsonToSQL).eql({
        id                   : 'idMenu',
        'menu[][element]'    : 'labelMenu',
        'menu[][dish][][id]' : 'idDish',
        'menu[][meal][][id]' : 'idMeal'
      });
    });

    it('should compute the sort level of all column names for sorting columns', () => {
      var _computed = schema.analyzeDescriptor([{
        id : ['<<idMenu>>']
      }]);
      should(_computed.meta.sortGroup).eql({
        idMenu : 0
      });
      _computed = schema.analyzeDescriptor([{
        id    : ['<<idMenu>>'],
        label : ['<labelMenu>']
      }]);
      should(_computed.meta.sortGroup, {
        idMenu    : 0,
        labelMenu : 0
      });
      _computed = schema.analyzeDescriptor([{
        id    : ['<<idMenu>>'],
        label : ['<labelMenu>'],
        dish  : ['object', {
          id    : ['<<idDish>>'],
          label : ['<labelDish>']
        }]
      }]);
      should(_computed.meta.sortGroup, {
        idMenu    : 0,
        labelMenu : 0,
        idDish    : 0,
        labelDish : 0
      });
    });

    it('should compute the sort level even with nested arrays', () => {
      var _computed = schema.analyzeDescriptor([{
        id     : ['<<idMenu>>'],
        dishes : ['array', {
          id : ['<<idDish>>']
        }]
      }]);
      should(_computed.meta.sortGroup, {
        idMenu : 0,
        idDish : 1
      });
      _computed = schema.analyzeDescriptor([{
        id     : ['<<idMenu>>'],
        label  : ['<labelMenu>'],
        dishes : ['array', {
          id    : ['<<idDish>>'],
          label : ['<labelDish>']
        }]
      }]);
      should(_computed.meta.sortGroup, {
        idMenu    : 0,
        labelMenu : 0,
        idDish    : 1,
        labelDish : 1
      });
      _computed = schema.analyzeDescriptor([{
        id     : ['<<idMenu>>'],
        label  : ['<labelMenu>'],
        dishes : ['array', {
          id    : ['<<idDish>>'],
          label : ['<labelDish>'],
          obj   : ['object', {
            id : ['<idObj>']
          }]
        }]
      }]);
      should(_computed.meta.sortGroup, {
        idMenu    : 0,
        labelMenu : 0,
        idDish    : 1,
        labelDish : 1,
        idObj     : 1
      });
    });

    it('should compute the sort level even with adjacent arrays', () => {
      var _computed = schema.analyzeDescriptor([{
        id     : ['<<idMenu>>'],
        label  : ['<labelMenu>'],
        dishes : ['array', {
          id    : ['<<idDish>>'],
          label : ['<labelDish>']
        }],
        meals : ['array', {
          id    : ['<<idMeal>>'],
          label : ['<labelMeal>']
        }]
      }]);
      should(_computed.meta.sortGroup, {
        idMenu    : 0,
        labelMenu : 0,
        idDish    : 1,
        labelDish : 1,
        idMeal    : 2,
        labelMeal : 2
      });
      _computed = schema.analyzeDescriptor([{
        id    : ['<<idMenu>>'],
        label : ['<labelMenu>'],
        obj   : ['object', {
          dishes : ['array', {
            id    : ['<<idDish>>'],
            label : ['<labelDish>']
          }],
          meals : ['array', {
            id    : ['<<idMeal>>'],
            label : ['<labelMeal>']
          }]
        }]
      }]);
      should(_computed.meta.sortGroup, {
        idMenu    : 0,
        labelMenu : 0,
        idDish    : 1,
        labelDish : 1,
        idMeal    : 2,
        labelMeal : 2
      });
    });

    it('should compute the level of each array in the tree', () => {
      var _computed = schema.analyzeDescriptor([{
        id    : ['<<idMenu>>'],
        label : ['<labelMenu>'],
        obj   : ['object', {
          dishes : ['array', {
            id    : ['<<idDish>>'],
            label : ['<labelDish>']
          }],
          meals : ['array', {
            id    : ['<<idMeal>>'],
            label : ['<labelMeal>']
          }]
        }]
      }]);

      var _expectedDefaultValue = {
        id    : null,
        label : null,
        obj   : {
          dishes : [{
            id    : null,
            label : null
          }],
          meals : [{
            id    : null,
            label : null
          }]
        }
      };

      should(_computed.compilation.main0.level).eql(0);
      should(_computed.compilation.obj1.level).eql(0);
      should(_computed.compilation.dishes2.level).eql(1);
      should(_computed.compilation.meals3.level).eql(1);

      should(_computed.defaultValue).eql(_expectedDefaultValue);
    });

    it('should compute the level even in complexe cases', () => {
      var _computed = schema.analyzeDescriptor([{
        id    : ['<<idMenu>>'],
        label : ['<labelMenu>'],
        obj   : ['object', {
          dishes : ['array', {
            id      : ['<<idDish>>'],
            label   : ['<labelDish>'],
            subDish : ['object', {
              id      : ['<idsubDish>'],
              lunches : ['array', {
                id         : ['<<idLunch>>'],
                breakfasts : ['array', {
                  id : ['<<idBreakfasts>>'],
                }]
              }],
              cars : ['array', {
                id : ['<<idCar>>'],
              }]
            }]
          }],
          info : ['object', {
            subinfo : ['object', {
              meals : ['array', {
                id    : ['<<idMeal>>'],
                label : ['<labelMeal>']
              }],
              diners : ['array', {
                id : ['<<idDiner>>'],
              }]
            }]
          }]
        }]
      }]);

      var _expectedDefaultValue = {
        id    : null,
        label : null,
        obj   : {
          dishes : [{
            id      : null,
            label   : null,
            subDish : {
              id      : null,
              lunches : [{
                id         : null,
                breakfasts : [{
                  id : null
                }]
              }],
              cars : [{
                id : null
              }]
            }
          }],
          info : {
            subinfo : {
              meals : [{
                id    : null,
                label : null
              }],
              diners : [{
                id : null
              }]
            }
          }
        }
      };

      // not very good because javascript does not guarantee object attribute order
      should(_computed.compilation.main0.level).eql(0);
      should(_computed.compilation.obj1.level).eql(0);
      should(_computed.compilation.dishes2.level).eql(1);
      should(_computed.compilation.subDish3.level).eql(1);
      should(_computed.compilation.lunches4.level).eql(2);
      should(_computed.compilation.breakfasts5.level).eql(3);
      should(_computed.compilation.cars6.level).eql(2);
      should(_computed.compilation.info7.level).eql(0);
      should(_computed.compilation.subinfo8.level).eql(0);
      should(_computed.compilation.meals9.level).eql(1);
      should(_computed.compilation.diners10.level).eql(1);

      should(_computed.defaultValue).eql(_expectedDefaultValue);
    });

    it('should compute the columns which must be sorted for buidling json', () => {
      var _computed = schema.analyzeDescriptor([{
        id     : ['<<idMenu>>'],
        dishes : ['array', {
          id : ['<<idDish>>']
        }]
      }]);
      should(_computed.meta.sortMandatory).eql(['idMenu', 'idDish']);
      _computed = schema.analyzeDescriptor([{
        id     : ['<<idMenu>>'],
        label  : ['<labelMenu>'],
        dishes : ['array', {
          id    : ['<<idDish>>'],
          label : ['<labelDish>']
        }]
      }]);
      should(_computed.meta.sortMandatory).eql(['idMenu', 'idDish']);
      _computed = schema.analyzeDescriptor([{
        id     : ['<<idMenu>>'],
        label  : ['<labelMenu>'],
        dishes : ['array', {
          id    : ['<<idDish>>'],
          label : ['<labelDish>'],
          obj   : ['object', {
            id : ['<idObj>']
          }]
        }]
      }]);
      should(_computed.meta.sortMandatory).eql(['idMenu', 'idDish']);
    });

    it('should compute the columns which must be sorted for buidling json', () => {
      var _computed = schema.analyzeDescriptor([{
        id     : ['<<idMenu>>'],
        label  : ['<labelMenu>'],
        dishes : ['array', {
          id    : ['<<idDish>>'],
          label : ['<labelDish>']
        }],
        meals : ['array', {
          id    : ['<<idMeal>>'],
          label : ['<labelMeal>']
        }]
      }]);
      should(_computed.meta.sortMandatory).eql(['idMenu', 'idDish', 'idMeal']);
    });

    it('should analyze a descriptor and return a flat description of the object with transform information', function (done) {
      var _expectedTreeDescriptor = {
        meta : {
          sortGroup : {
            idContinent       : 0,
            continentName     : 0,
            idCountry         : 1,
            countryName       : 1,
            idCity            : 2,
            cityName          : 2,
            temperature       : 2,
            language          : 2,
            idGoodies         : 3,
            goodiesName       : 3,
            goodieTemperature : 3,
            goodieLanguage    : 3
          },
          jsonToSQL : {
            id                                                          : 'idContinent',
            continent                                                   : 'continentName',
            'countries[][id]'                                           : 'idCountry',
            'countries[][name]'                                         : 'countryName',
            'countries[][cities][][id]'                                 : 'idCity',
            'countries[][cities][][name]'                               : 'cityName',
            'countries[][cities][][info][temperature]'                  : 'temperature',
            'countries[][cities][][info][language]'                     : 'language',
            'countries[][cities][][info][goodies][][id]'                : 'idGoodies',
            'countries[][cities][][info][goodies][][name]'              : 'goodiesName',
            'countries[][cities][][info][goodies][][info][temperature]' : 'goodieTemperature',
            'countries[][cities][][info][goodies][][info][language]'    : 'goodieLanguage'
          },
          sortMandatory : ['idCountry', 'idCity', 'idGoodies']
        },
        onValidate : {
          cities2_name : function () {
            return 'test';
          }
        },
        onTransform : {},
        compilation : {
          main0 : {
            arrChild   : ['countries1', 'cities2', 'goodies4'],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              id        : ['int'],
              continent : ['string'],
              countries : ['array']
            },
            objTrans : {
              id        : 'idContinent',
              continent : 'continentName',
              countries : []
            },
            level : 0,
            keys  : []
          },
          countries1 : {
            arrChild   : ['cities2', 'goodies4'],
            arrParents : [],
            objParent  : 'main0',
            name       : 'countries',
            type       : 'array',
            obj        : {
              id     : ['int'],
              name   : ['string'],
              cities : ['array']
            },
            objTrans : {
              id     : 'idCountry',
              name   : 'countryName',
              cities : []
            },
            level : 1,
            keys  : ['idCountry']
          },
          cities2 : {
            arrChild   : ['goodies4'],
            arrParents : ['countries1'],
            objParent  : 'countries1',
            name       : 'cities',
            type       : 'array',
            obj        : {
              id   : ['int'],
              name : ['string', 'onValidate', function () {
                return 'test';
              }],
              info : ['object']
            },
            objTrans : {
              id   : 'idCity',
              name : 'cityName',
              info : {
                type : 'object'
              }
            },
            level : 2,
            keys  : ['idCity']
          },
          info3 : {
            arrChild   : ['goodies4'],
            arrParents : ['countries1', 'cities2'],
            objParent  : 'cities2',
            name       : 'info',
            type       : 'object',
            obj        : {
              temperature : ['string'],
              language    : ['string'],
              goodies     : ['array']
            },
            objTrans : {
              temperature : 'temperature',
              language    : 'language',
              goodies     : []
            },
            level : 2,
            keys  : []
          },
          goodies4 : {
            arrChild   : [],
            arrParents : ['countries1', 'cities2'],
            objParent  : 'info3',
            name       : 'goodies',
            type       : 'array',
            obj        : {
              id   : ['int'],
              name : ['string'],
              info : ['object']
            },
            objTrans : {
              id   : 'idGoodies',
              name : 'goodiesName',
              info : {
                type : 'object'
              }
            },
            level : 3,
            keys  : ['idGoodies']
          },
          info5 : {
            arrChild   : [],
            arrParents : ['countries1', 'cities2', 'goodies4'],
            objParent  : 'goodies4',
            name       : 'info',
            type       : 'object',
            obj        : {
              temperature : ['string'],
              language    : ['string']
            },
            objTrans : {
              temperature : 'goodieTemperature',
              language    : 'goodieLanguage'
            },
            level : 3,
            keys  : []
          }
        },
        defaultValue : {
          id        : null,
          continent : null,
          countries : [{
            id     : null,
            name   : null,
            cities : [{
              id   : null,
              name : null,
              info : {
                temperature : '10',
                language    : 'fr',
                goodies     : [{
                  id   : null,
                  name : null,
                  info : {
                    temperature : '0',
                    language    : 'en'
                  }
                }]
              }
            }]
          }]
        }
      };

      var _objectDescriptor = {
        id        : ['int', '<<idContinent>>'],
        continent : ['string', '<continentName>'],
        countries : ['array', {
          id     : ['int', '<<idCountry>>'],
          name   : ['string', '<countryName>'],
          cities : ['array', {
            id   : ['int', '<<idCity>>'],
            name : ['string', '<cityName>', 'onValidate', function () {
              return 'test';
            }],
            info : ['object', {
              temperature : ['string', '10', '<temperature>'],
              language    : ['string', 'fr', '<language>'],
              goodies     : ['array', {
                id   : ['int', '<<idGoodies>>'],
                name : ['string', '<goodiesName>'],
                info : ['object', {
                  temperature : ['string', '0', '<goodieTemperature>'],
                  language    : ['string', 'en', '<goodieLanguage>']
                }]
              }]
            }]
          }]
        }]
      };
      var _computed = schema.analyzeDescriptor(_objectDescriptor);
      should(_computed.defaultValue).eql(_expectedTreeDescriptor.defaultValue);
      should(JSON.stringify(_computed)).eql(JSON.stringify(_expectedTreeDescriptor));
      done();
    });

    it('should add the primary key "goodieLanguage" in the key list of the surrounding array "countries" ', function (done) {
      var _expectedTreeDescriptor = {
        meta : {
          sortGroup : {
            idContinent       : 0,
            continentName     : 0,
            idCountry         : 1,
            countryName       : 1,
            goodieTemperature : 1,
            goodieLanguage    : 1
          },
          jsonToSQL : {
            id                               : 'idContinent',
            continent                        : 'continentName',
            'countries[][id]'                : 'idCountry',
            'countries[][name]'              : 'countryName',
            'countries[][info][temperature]' : 'goodieTemperature',
            'countries[][info][language]'    : 'goodieLanguage'
          },
          sortMandatory : ['idContinent', 'idCountry', 'goodieLanguage']
        },
        onValidate  : {},
        onTransform : {},
        compilation : {
          main0 : {
            arrChild   : ['countries1'],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'array',
            obj        : {
              id        : ['int'],
              continent : ['string'],
              countries : ['array']
            },
            objTrans : {
              id        : 'idContinent',
              continent : 'continentName',
              countries : []
            },
            level : 0,
            keys  : ['idContinent'],
          },
          countries1 : {
            arrChild   : [],
            arrParents : ['main0'],
            objParent  : 'main0',
            name       : 'countries',
            type       : 'array',
            obj        : {
              id   : ['int'],
              name : ['string'],
              info : ['object']
            },
            objTrans : {
              id   : 'idCountry',
              name : 'countryName',
              info : {
                type : 'object'
              }
            },
            level : 1,
            keys  : ['idCountry', 'goodieLanguage'],
          },
          info2 : {
            arrChild   : [],
            arrParents : ['main0', 'countries1'],
            objParent  : 'countries1',
            name       : 'info',
            type       : 'object',
            obj        : {
              temperature : ['string'],
              language    : ['string']
            },
            objTrans : {
              temperature : 'goodieTemperature',
              language    : 'goodieLanguage'
            },
            level : 1,
            keys  : [],
          }
        },
        defaultValue : {
          id        : null,
          continent : null,
          countries : [{
            id   : null,
            name : null,
            info : {
              temperature : null,
              language    : null,
            }
          }]
        }
      };

      var _objectDescriptor = [{
        id        : ['int', '<<idContinent>>'],
        continent : ['string', '<continentName>'],
        countries : ['array', {
          id   : ['int', '<<idCountry>>'],
          name : ['string', '<countryName>'],
          info : ['object', {
            temperature : ['string', '<goodieTemperature>'],
            language    : ['string', '<<goodieLanguage>>']
          }]
        }]
      }];
      var _computed = schema.analyzeDescriptor(_objectDescriptor);
      should(_computed).eql(_expectedTreeDescriptor);
      done();
    });

    describe('default values', () => {
      it('should find the default value : type', () => {
        var _expectedCompilationDescriptor = {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              id : ['int']
            },
            objTrans : {},
            level    : 0,
            keys     : []
          }
        };

        var _expectedDefaultValue = {
          id : 4
        };

        var _objectDescriptor = {
          id : ['int', 4]
        };
        var _computed = schema.analyzeDescriptor(_objectDescriptor);
        should(_computed.compilation).eql(_expectedCompilationDescriptor);
        should(_computed.defaultValue).eql(_expectedDefaultValue);
      });

      it('should find the default value : before onValidate', () => {
        var _expectedCompilationDescriptor = {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              id : ['int', 'onValidate', () => {}]
            },
            objTrans : {},
            level    : 0,
            keys     : []
          }
        };

        var _expectedDefaultValue = {
          id : 4
        };

        var _objectDescriptor = {
          id : ['int', 4, 'onValidate', () => {}]
        };
        var _computed = schema.analyzeDescriptor(_objectDescriptor);
        should(_computed.compilation).eql(_expectedCompilationDescriptor);
        should(_computed.defaultValue).eql(_expectedDefaultValue);
      });

      it('should find the default value : after onValidate', () => {
        var _expectedCompilationDescriptor = {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              id : ['int', 'onValidate', () => {}]
            },
            objTrans : {},
            level    : 0,
            keys     : []
          }
        };

        var _expectedDefaultValue = {
          id : 4
        };

        var _objectDescriptor = {
          id : ['int', 'onValidate', () => {}, 4]
        };
        var _computed = schema.analyzeDescriptor(_objectDescriptor);
        should(_computed.compilation).eql(_expectedCompilationDescriptor);
        should(_computed.defaultValue).eql(_expectedDefaultValue);
      });

      it('should find the default value : before onTransform', () => {
        var _expectedCompilationDescriptor = {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              id : ['string']
            },
            objTrans : {
              id : {
                type : 'function'
              }
            },
            level : 0,
            keys  : []
          }
        };

        var _expectedDefaultValue = {
          id : 'cat'
        };

        var _objectDescriptor = {
          id : ['string', 'cat', 'onTransform', function () { return 1 + 2; }]
        };
        var _computed = schema.analyzeDescriptor(_objectDescriptor);
        should(_computed.compilation).eql(_expectedCompilationDescriptor);
        should(_computed.defaultValue).eql(_expectedDefaultValue);
      });

      it('should find the default value : after onTransform', () => {
        var _expectedCompilationDescriptor = {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              id : ['string']
            },
            objTrans : {
              id : {
                type : 'function'
              }
            },
            level : 0,
            keys  : []
          }
        };

        var _expectedDefaultValue = {
          id : 'cat'
        };

        var _objectDescriptor = {
          id : ['string', 'onTransform', function () { return 1 + 2; }, 'cat']
        };
        var _computed = schema.analyzeDescriptor(_objectDescriptor);
        should(_computed.compilation).eql(_expectedCompilationDescriptor);
        should(_computed.defaultValue).eql(_expectedDefaultValue);
      });


      it('should find the default value : after min / max', () => {
        var _expectedCompilationDescriptor = {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              id : ['array', 'min', 1, 'max', 5]
            },
            objTrans : {},
            level    : 0,
            keys     : []
          }
        };

        var _expectedDefaultValue = {
          id : 2
        };

        var _objectDescriptor = {
          id : ['array', 'min', 1, 'max', 5, 2]
        };
        var _computed = schema.analyzeDescriptor(_objectDescriptor);
        should(_computed.compilation).eql(_expectedCompilationDescriptor);
        should(_computed.defaultValue).eql(_expectedDefaultValue);
      });

      it('should find the default value : before min / max', () => {
        var _expectedCompilationDescriptor = {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              id : ['array', 'min', 1, 'max', 5]
            },
            objTrans : {},
            level    : 0,
            keys     : []
          }
        };

        var _expectedDefaultValue = {
          id : 4
        };

        var _objectDescriptor = {
          id : ['array', 4, 'min', 1, 'max', 5]
        };
        var _computed = schema.analyzeDescriptor(_objectDescriptor);
        should(_computed.compilation).eql(_expectedCompilationDescriptor);
        should(_computed.defaultValue).eql(_expectedDefaultValue);
      });

      it('should find the default value : toNumber', () => {
        var _expectedCompilationDescriptor = {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              id : ['array', 'toNumber', 'min', 1, 'max', 5]
            },
            objTrans : {},
            level    : 0,
            keys     : []
          }
        };

        var _expectedDefaultValue = {
          id : 4
        };

        var _objectDescriptor = {
          id : ['array', 'toNumber', 4, 'min', 1, 'max', 5]
        };
        var _computed = schema.analyzeDescriptor(_objectDescriptor);
        should(_computed.compilation).eql(_expectedCompilationDescriptor);
        should(_computed.defaultValue).eql(_expectedDefaultValue);
      });

      it('should find the default value : toInt', () => {
        var _expectedCompilationDescriptor = {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              id : ['array', 'toInt', 'min', 1, 'max', 5]
            },
            objTrans : {},
            level    : 0,
            keys     : []
          }
        };

        var _expectedDefaultValue = {
          id : 4
        };

        var _objectDescriptor = {
          id : ['array', 'toInt', 4, 'min', 1, 'max', 5]
        };
        var _computed = schema.analyzeDescriptor(_objectDescriptor);
        should(_computed.compilation).eql(_expectedCompilationDescriptor);
        should(_computed.defaultValue).eql(_expectedDefaultValue);
      });

      it('should find the default value : toBoolean', () => {
        var _expectedCompilationDescriptor = {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            type       : 'object',
            obj        : {
              id : ['array', 'toBoolean', 'min', 1, 'max', 5]
            },
            objTrans : {},
            level    : 0,
            keys     : []
          }
        };
        var _expectedDefaultValue = {
          id : 4
        };

        var _objectDescriptor = {
          id : ['array', 'toBoolean', 4, 'min', 1, 'max', 5]
        };
        var _computed = schema.analyzeDescriptor(_objectDescriptor);
        should(_computed.compilation).eql(_expectedCompilationDescriptor);
        should(_computed.defaultValue).eql(_expectedDefaultValue);
      });
    });

  });

  it('should throw an error if a property is a string and not an array', () => {

    var _objectDescriptor = {
      id : '<id>',
    };

    try {
      schema.analyzeDescriptor(_objectDescriptor);
    }
    catch (e) {
      should(e.message).eql('Lunaris.store.map: id is not an array. All properties key names should be defined as arrays (e.g. ["<id>"], ["object", {}], ["array", {}])');
    }
  });

});
