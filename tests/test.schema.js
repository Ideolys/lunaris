const schema     = require('../lib/_builder/store/schema');
const aggregates = require('../src/store/store.aggregate');
const getJoinFns = require('../lib/_builder/store/joins');

describe('Schema', () => {

  describe('analyzeDescriptor(obj)', () => {

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

    it('should analyze a descriptor and return a flat description of the object and accept that an array has no descriptions', () => {
      var _expectedTreeDescriptor = {
        compilation : {
          main0 : {
            arrChild   : [],
            arrParents : [],
            objParent  : '',
            name       : '',
            uniqueName : 'main0',
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
          uniqueName : 'main0',
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
          uniqueName : 'main0',
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
          uniqueName : 'main0',
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
          uniqueName : 'main0',
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
          uniqueName : 'obj1',
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
        obj : []
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
        'menu.element' : 'labelMenu'
      });
      _computed = schema.analyzeDescriptor({
        id   : ['<idMenu>'],
        menu : ['object', {
          element : ['<labelMenu>'],
          id      : ['<<idMenu>>']
        }]
      });
      should(_computed.meta.jsonToSQL).eql({
        id             : 'idMenu',
        'menu.element' : 'labelMenu',
        'menu.id'      : 'idMenu'
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
        id             : 'idMenu',
        'menu.element' : 'labelMenu'
      });
      _computed = schema.analyzeDescriptor({
        id   : ['<idMenu>'],
        menu : ['array', {
          id      : ['<<idMenu>>'],
          element : ['<labelMenu>']
        }]
      });
      should(_computed.meta.jsonToSQL).eql({
        id             : 'idMenu',
        'menu.id'      : 'idMenu',
        'menu.element' : 'labelMenu'
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
        id             : 'idMenu',
        'menu.element' : 'labelMenu',
        'menu.dish.id' : 'idDish'
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
        id             : 'idMenu',
        'menu.element' : 'labelMenu',
        'menu.dish.id' : 'idDish',
        'menu.meal.id' : 'idMeal'
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
          dishes : [],
          meals  : []
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
          dishes : [],
          info   : {
            subinfo : {
              meals  : [],
              diners : []
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
            id                                               : 'idContinent',
            continent                                        : 'continentName',
            'countries.id'                                   : 'idCountry',
            'countries.name'                                 : 'countryName',
            'countries.cities.id'                            : 'idCity',
            'countries.cities.name'                          : 'cityName',
            'countries.cities.info.temperature'              : 'temperature',
            'countries.cities.info.language'                 : 'language',
            'countries.cities.info.goodies.id'               : 'idGoodies',
            'countries.cities.info.goodies.name'             : 'goodiesName',
            'countries.cities.info.goodies.info.temperature' : 'goodieTemperature',
            'countries.cities.info.goodies.info.language'    : 'goodieLanguage'
          },
          sortMandatory      : ['idCountry', 'idCity', 'idGoodies'],
          primaryKey         : ['id'],
          externalAggregates : {},
          aggregates         : {},
          aggregatesSort     : [],
          joins              : {},
          references         : {},
          computedFns        : {}
        },
        getPrimaryKey : function getPrimaryKey (item) { var _pk = null;
          if (!item['id']) {
            return null;
          }
          _pk += item['id'] + '-';

          _pk = _pk.slice(0, _pk.length - 1);
          return _pk;
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
            uniqueName : 'main0',
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
            uniqueName : 'countries1',
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
            uniqueName : 'cities2',
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
            uniqueName : 'info3',
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
            uniqueName : 'goodies4',
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
            uniqueName : 'info5',
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
        virtualCompilation : {},
        defaultValue       : {
          id        : null,
          continent : null,
          countries : []
        },
        computedsFn  : null,
        referencesFn : { get : null, update : null }
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
            id                           : 'idContinent',
            continent                    : 'continentName',
            'countries.id'               : 'idCountry',
            'countries.name'             : 'countryName',
            'countries.info.temperature' : 'goodieTemperature',
            'countries.info.language'    : 'goodieLanguage'
          },
          sortMandatory      : ['idContinent', 'idCountry', 'goodieLanguage'],
          primaryKey         : ['id'],
          externalAggregates : {},
          aggregates         : {},
          aggregatesSort     : [],
          joins              : {},
          references         : {},
          computedFns        : {}
        },
        getPrimaryKey : function getPrimaryKey (item) { var _pk = null;
          if (!item['id']) {
            return null;
          }
          _pk += item['id'] + '-';

          _pk = _pk.slice(0, _pk.length - 1);
          return _pk;
        },
        onValidate  : {},
        onTransform : {},
        compilation : {
          main0 : {
            arrChild   : ['countries1'],
            arrParents : [],
            objParent  : '',
            name       : '',
            uniqueName : 'main0',
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
            uniqueName : 'countries1',
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
            uniqueName : 'info2',
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
        virtualCompilation : {},
        defaultValue       : {
          id        : null,
          continent : null,
          countries : []
        },
        computedsFn  : null,
        referencesFn : { get : null, update : null }
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
      should(JSON.stringify(_computed)).eql(JSON.stringify(_expectedTreeDescriptor));
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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
            uniqueName : 'main0',
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

  describe('joins', () => {

    it('should find a join and define join functions', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        elements : ['@elements']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.joins).eql({
        elements : 'elements'
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _joinValues = { elements : _expectedValues };
      var _obj        = { id : 1 };
      _joinFns.set(_obj, _joinValues);
      should(_obj.elements).be.an.Array().and.eql(_expectedValues);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 });
      should(_obj.elements).be.an.Array().and.eql(_expectedValues);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 });
      should(_obj.elements).be.an.Array().and.eql(_expectedValues);

      _joinFns.elements.delete(_obj, null);
      should(_obj.elements).be.an.Array().and.have.lengthOf(0);
    });

    it('should find a join and define join functions for a store object', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        elements : ['@elements']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.joins).eql({
        elements : 'elements'
      });

      var _joinFns = getJoinFns({ elements : { isStoreObject : true } }, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = { _id : 1, id : 1, cost : 1 };
      var _joinValues     = { elements : _expectedValues };
      var _obj            = { id : 1 };
      _joinFns.set(_obj, _joinValues, aggregates.aggregates);
      should(_obj.elements).be.an.Object().and.eql(_expectedValues);

      _expectedValues.cost = 2;
      _joinFns.elements.insert(_obj, _expectedValues, aggregates.aggregates);
      should(_obj.elements).be.an.Object().and.eql(_expectedValues);

      _joinFns.elements.delete(_obj, aggregates.aggregates);
      should(_obj.elements).be.eql(null);
    });

    it('should find multiple joins and define join functions', () => {
      var _objectDescriptor = {
        id           : ['<<id>>'],
        elementsJoin : ['@elements'],
        elements2    : ['@elements2']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.joins).eql({
        elements  : 'elementsJoin',
        elements2 : 'elements2'
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _expectedValues2 = [
        { _id : 1, id : 1, price : 1 },
        { _id : 2, id : 2, price : 2 }
      ];
      var _joinValues = { elements : _expectedValues, elements2 : _expectedValues2 };
      var _obj        = { id : 1 };
      _joinFns.set(_obj, _joinValues);
      should(_obj.elementsJoin).be.an.Array().and.eql(_expectedValues);
      should(_obj.elements2).be.an.Array().and.eql(_expectedValues2);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _expectedValues2.push({ _id : 3, id : 3, price : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 });
      _joinFns.elements2.insert(_obj, { _id : 3, id : 3, price : 3 });
      should(_obj.elementsJoin).be.an.Array().and.eql(_expectedValues);
      should(_obj.elements2).be.an.Array().and.eql(_expectedValues2);

      _expectedValues.splice(1, 1);
      _expectedValues2.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 });
      _joinFns.elements2.delete(_obj, { _id : 2 });
      should(_obj.elementsJoin).be.an.Array().and.eql(_expectedValues);
      should(_obj.elements2).be.an.Array().and.eql(_expectedValues2);
    });

    it('should find joins in sub object and define join functions', () => {
      var _objectDescriptor = {
        id     : ['<<id>>'],
        object : ['object', {
          elements : ['@elements']
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.joins).eql({
        elements : 'object.elements',
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _joinValues = { elements : _expectedValues };
      var _obj        = { id : 1, object : {} };
      _joinFns.set(_obj, _joinValues);
      should(_obj.object.elements).be.an.Array().and.eql(_expectedValues);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 });
      should(_obj.object.elements).be.an.Array().and.eql(_expectedValues);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 });
      should(_obj.object.elements).be.an.Array().and.eql(_expectedValues);
    });

    it('should find joins in sub array and define join functions', () => {
      var _objectDescriptor = {
        id      : ['<<id>>'],
        objects : ['array', {
          id       : ['<<id>>'],
          elements : ['@elements']
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.joins).eql({
        elements : 'objects.elements',
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _joinValues = { elements : _expectedValues };
      var _obj        = { id : 1, objects : [{ id : 1}, { id : 2 }]};
      _joinFns.set(_obj, _joinValues);
      should(_obj.objects[0].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[1].elements).be.an.Array().and.eql(_expectedValues);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 });
      should(_obj.objects[0].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[1].elements).be.an.Array().and.eql(_expectedValues);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 });
      should(_obj.objects[0].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[1].elements).be.an.Array().and.eql(_expectedValues);
    });

    it('should find a join and set a custom property if a shortcut has been used and define join functions', () => {
      var _objectDescriptor = {
        id    : ['<<id>>'],
        total : ['sumAgg', '@elements.cost']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);

      should(_schema.meta.joins).eql({
        elements : 'join_elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'total', 'join_elements.cost']
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _joinValues = { elements : JSON.parse(JSON.stringify(_expectedValues))};
      var _obj        = { id : 1 };
      _joinFns.set(_obj, _joinValues, aggregates.aggregates);
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(3);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 }, aggregates.aggregates);
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(6);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 }, aggregates.aggregates);
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(4);
    });

    it('should find multiple joins and set a custom property if a shortcut has been used and define join functions', () => {
      var _objectDescriptor = {
        id     : ['<<id>>'],
        total  : ['sumAgg', '@elements.cost'],
        total2 : ['sumAgg', '@elements2.price']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.joins).eql({
        elements  : 'join_elements',
        elements2 : 'join_elements2'
      });
      should(_schema.meta.externalAggregates).eql({
        elements  : ['sumAgg', 'total', 'join_elements.cost'],
        elements2 : ['sumAgg', 'total2', 'join_elements2.price']
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _expectedValues2 = [
        { _id : 1, id : 1, price : 1 },
        { _id : 2, id : 2, price : 4 }
      ];
      var _joinValues = { elements : JSON.parse(JSON.stringify(_expectedValues)), elements2 : JSON.parse(JSON.stringify(_expectedValues2)) };
      var _obj        = { id : 1 };
      _joinFns.set(_obj, _joinValues, aggregates.aggregates);
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.join_elements2).be.an.Array().and.eql(_expectedValues2);
      should(_obj.total).be.a.Number().and.eql(3);
      should(_obj.total2).be.a.Number().and.eql(5);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _expectedValues2.push({ _id : 3, id : 3, price : 2 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 }, aggregates.aggregates);
      _joinFns.elements2.insert(_obj, { _id : 3, id : 3, price : 2 }, aggregates.aggregates);
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.join_elements2).be.an.Array().and.eql(_expectedValues2);
      should(_obj.total).be.a.Number().and.eql(6);
      should(_obj.total2).be.a.Number().and.eql(7);

      _expectedValues.splice(1, 1);
      _expectedValues2.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 }, aggregates.aggregates);
      _joinFns.elements2.delete(_obj, { _id : 2 }, aggregates.aggregates);
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.join_elements2).be.an.Array().and.eql(_expectedValues2);
      should(_obj.total).be.a.Number().and.eql(4);
      should(_obj.total2).be.a.Number().and.eql(3);
    });

    it('should find joins in sub object and set a custom property if a shortcut has been used and define join functions', () => {
      var _objectDescriptor = {
        id     : ['<<id>>'],
        object : ['object', {
          total : ['sumAgg', '@elements.cost']
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.joins).eql({
        elements : 'object.join_elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'object.total', 'object.join_elements.cost'],
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _joinValues = { elements : JSON.parse(JSON.stringify(_expectedValues)) };
      var _obj        = { id : 1, object : {} };
      _joinFns.set(_obj, _joinValues, aggregates.aggregates);
      should(_obj.object.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.object.total).be.a.Number().and.eql(3);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 }, aggregates.aggregates);
      should(_obj.object.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.object.total).be.a.Number().and.eql(6);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 }, aggregates.aggregates);
      should(_obj.object.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.object.total).be.a.Number().and.eql(4);
    });

    it('should find joins in sub array and set a custom property if a shortcut has been used and define join functions', () => {
      var _objectDescriptor = {
        id      : ['<<id>>'],
        objects : ['array', {
          id    : ['<<id>>'],
          total : ['sumAgg', '@elements.price']
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.joins).eql({
        elements : 'objects.join_elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'objects.total', 'objects.join_elements.price'],
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, price : 1 },
        { _id : 2, id : 2, price : 2 }
      ];
      var _joinValues = { elements : JSON.parse(JSON.stringify(_expectedValues)) };
      var _obj        = { id : 1, objects : [{ id : 1}, { id : 2 }]};
      _joinFns.set(_obj, _joinValues, aggregates.aggregates);
      should(_obj.objects[0].join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[1].join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[0].total).be.a.Number().and.eql(3);
      should(_obj.objects[1].total).be.a.Number().and.eql(3);

      _expectedValues.push({ _id : 3, id : 3, price : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, price : 3 }, aggregates.aggregates);
      should(_obj.objects[0].join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[1].join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[0].total).be.a.Number().and.eql(6);
      should(_obj.objects[1].total).be.a.Number().and.eql(6);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 }, aggregates.aggregates);
      should(_obj.objects[0].join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[1].join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[0].total).be.a.Number().and.eql(4);
      should(_obj.objects[1].total).be.a.Number().and.eql(4);
    });

    it('should find joins in sub array and define join functions', () => {
      var _objectDescriptor = {
        id      : ['<<id>>'],
        objects : ['array', {
          id       : ['<<id>>'],
          total    : ['sumAgg', 'elements.price'],
          elements : ['array', '@elements']
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.joins).eql({
        elements : 'objects.elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'objects.total', 'objects.elements.price'],
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, price : 1 },
        { _id : 2, id : 2, price : 2 }
      ];
      var _joinValues = { elements : JSON.parse(JSON.stringify(_expectedValues)) };
      var _obj        = { id : 1, objects : [{ id : 1}, { id : 2 }]};
      _joinFns.set(_obj, _joinValues, aggregates.aggregates);
      should(_obj.objects[0].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[1].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[0].total).be.a.Number().and.eql(3);
      should(_obj.objects[1].total).be.a.Number().and.eql(3);

      _expectedValues.push({ _id : 3, id : 3, price : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, price : 3 }, aggregates.aggregates);
      should(_obj.objects[0].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[1].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[0].total).be.a.Number().and.eql(6);
      should(_obj.objects[1].total).be.a.Number().and.eql(6);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 }, aggregates.aggregates);
      should(_obj.objects[0].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[1].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[0].total).be.a.Number().and.eql(4);
      should(_obj.objects[1].total).be.a.Number().and.eql(4);
    });

    it('should find joins in sub array and define join functions (different order between aggregate and join)', () => {
      var _objectDescriptor = {
        id      : ['<<id>>'],
        objects : ['array', {
          id       : ['<<id>>'],
          elements : ['array', '@elements'],
          total    : ['sumAgg', 'elements.price']
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.joins).eql({
        elements : 'objects.elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'objects.total', 'objects.elements.price'],
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, price : 1 },
        { _id : 2, id : 2, price : 2 }
      ];
      var _joinValues = { elements : JSON.parse(JSON.stringify(_expectedValues)) };
      var _obj        = { id : 1, objects : [{ id : 1}, { id : 2 }]};
      _joinFns.set(_obj, _joinValues, aggregates.aggregates);
      should(_obj.objects[0].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[1].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[0].total).be.a.Number().and.eql(3);
      should(_obj.objects[1].total).be.a.Number().and.eql(3);

      _expectedValues.push({ _id : 3, id : 3, price : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, price : 3 }, aggregates.aggregates);
      should(_obj.objects[0].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[1].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[0].total).be.a.Number().and.eql(6);
      should(_obj.objects[1].total).be.a.Number().and.eql(6);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 }, aggregates.aggregates);
      should(_obj.objects[0].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[1].elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.objects[0].total).be.a.Number().and.eql(4);
      should(_obj.objects[1].total).be.a.Number().and.eql(4);
    });
  });

  describe('aggregate', () => {
    it('should set a value even there is no elements to aggregate : insert (root level)', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        total    : ['sumAgg', 'elements.cost'],
        elements : ['@elements']
      };
      var _schema  = schema.analyzeDescriptor(_objectDescriptor);

      should(_schema.meta.joins).eql({
        elements : 'elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'total', 'elements.cost'],
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _obj = {
        id       : 1,
        elements : []
      };
      var _elements = [];
      _joinFns.set(_obj, { elements : _elements }, aggregates.aggregates);
      should(_obj.total).be.Number();
      should(_obj.total).eql(0);
    });

    it('should not crash if the attribute does not exist : attribute key', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        total    : ['sumAgg', 'elements.cost'],
        elements : ['@elements']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);

      should(_schema.meta.joins).eql({
        elements : 'elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'total', 'elements.cost'],
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _obj = {
        id       : 1,
        elements : []
      };

      _joinFns.set(_obj, { elements : null }, aggregates.aggregates);
      should(_obj.total).be.Number();
      should(_obj.total).eql(0);
    });

    it('should update aggregate values : insert (imbricated aggregate with object between two)', () => {
      var _objectDescriptor = {
        id       : ['<<int>>'],
        elements : ['array', {
          id    : ['<<int>>'],
          total : ['sumAgg', 'costs.parts.cost'],
          costs : ['array', {
            id    : ['<<int>>'],
            parts : ['@parts']
          }]
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);

      should(_schema.meta.joins).eql({
        parts : 'elements.costs.parts'
      });
      should(_schema.meta.externalAggregates).eql({
        parts : ['sumAgg', 'elements.total', 'elements.costs.parts.cost'],
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _obj = {
        id       : 1,
        elements : [
          {
            id    : '1-1',
            costs : [
              {
                id    : '1-1-1',
                parts : []
              },
              {
                id    : '1-1-2',
                parts : []
              }
            ]
          },
          {
            id    : '1-2',
            costs : [
              {
                id    : '1-2-1',
                parts : []
              },
              {
                id    : '1-2-2',
                parts : []
              }
            ]
          }
        ]
      };
      var _parts = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 5 },
        { _id : 3, id : 3, cost : 4 },
      ];

      _joinFns.set(_obj, { parts : _parts }, aggregates.aggregates);
      should(_obj.elements[0]['total']).be.Number().and.eql(20);
      should(_obj.elements[1]['total']).be.Number().and.eql(20);
      _joinFns.parts.insert(_obj, { id : 4, cost : 2 }, aggregates.aggregates);
      should(_obj.elements[0]['total']).be.Number().and.eql(24);
      should(_obj.elements[1]['total']).be.Number().and.eql(24);
      _joinFns.parts.delete(_obj, { id : 3, _id : 3, cost : 4 }, aggregates.aggregates);
      should(_obj.elements[0]['total']).be.Number().and.eql(16);
      should(_obj.elements[1]['total']).be.Number().and.eql(16);
    });

    it('should update aggregate values : insert (imbricated aggregate with object between two)', () => {
      var _objectDescriptor = {
        id       : ['<<int>>'],
        elements : ['object', {
          id    : ['<<int>>'],
          total : ['sumAgg', 'costs.parts.cost'],
          costs : ['object', {
            id    : ['<<int>>'],
            parts : ['@parts']
          }]
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);

      should(_schema.meta.joins).eql({
        parts : 'elements.costs.parts'
      });
      should(_schema.meta.externalAggregates).eql({
        parts : ['sumAgg', 'elements.total', 'elements.costs.parts.cost'],
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _obj = {
        id       : 1,
        elements : {
          id    : '1-1',
          costs : {
            id    : '1-1-1',
            parts : []
          }
        }
      };
      var _parts = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 5 },
        { _id : 3, id : 3, cost : 4 },
      ];

      _joinFns.set(_obj, { parts : _parts }, aggregates.aggregates);
      should(_obj.elements['total']).be.Number().and.eql(10);
      _joinFns.parts.insert(_obj, { id : 4, cost : 2 }, aggregates.aggregates);
      should(_obj.elements['total']).be.Number().and.eql(12);
      _joinFns.parts.delete(_obj, { id : 3, _id : 3, cost : 4 }, aggregates.aggregates);
      should(_obj.elements['total']).be.Number().and.eql(8);
    });
  });

  describe('reference', () => {

    it ('should set reference in meta descriptor', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        elements : ['string']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.references).be.an.Object();
    });

    it ('should throw an error if no store has been set : undefined', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        elements : ['ref']
      };

      try {
        schema.analyzeDescriptor(_objectDescriptor);
      }
      catch (e) {
        should(e.message).eql('Lunaris.map: for attribute "elements", the "ref" has no store');
      }
    });

    it ('should throw an error if no store has been set : empty string', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        elements : ['ref', '']
      };

      try {
        schema.analyzeDescriptor(_objectDescriptor);
      }
      catch (e) {
        should(e.message).eql('Lunaris.map: for attribute "elements", the "ref" has no store');
      }
    });

    it ('should throw an error if no store has been set : no @', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        elements : ['ref', 'elements']
      };

      try {
        schema.analyzeDescriptor(_objectDescriptor);
      }
      catch (e) {
        should(e.message).eql('Lunaris.map: for attribute "elements", the "ref" has no store');
      }
    });

    it ('should throw an error if the store is try to reference itself', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        elements : ['ref', '@elements']
      };

      try {
        schema.analyzeDescriptor(_objectDescriptor, 'elements');
      }
      catch (e) {
        should(e.message).eql('Lunaris.map: for attribute "elements", the "ref" cannot be the current store');
      }
    });

    it ('should find a reference', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        elements : ['array', 'ref', '@elements']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.references).be.an.Object().and.eql({
        elements : 'elements'
      });
    });

    it('should set a complete path : sub array', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        elements : ['array', {
          id   : ['<<int>>'],
          type : ['object', 'ref', '@type']
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.references).be.an.Object().and.eql({
        'elements.type' : 'type'
      });
    });

    it('should set a complete path : sub object', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        elements : ['array', {
          id   : ['<<int>>'],
          type : ['object', 'ref', '@type']
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.references).be.an.Object().and.eql({
        'elements.type' : 'type'
      });
    });

    it('should find multiple references of a store', () => {
      var _objectDescriptor = {
        id          : ['<<id>>'],
        elements    : ['ref', '@elements'],
        elementsBis : ['ref', '@elements']
      };

      let _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.references).eql({
        elements    : 'elements',
        elementsBis : 'elements'
      });
    });

    it('should define the function', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        elements : ['array', {
          id   : ['<<int>>'],
          type : ['object', 'ref', '@type']
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.referencesFn).be.an.Object();
      should(_schema.referencesFn.get).be.an.Object();
      should(_schema.referencesFn.update).be.an.Object();
      should(_schema.referencesFn.get['elements.type']).be.a.Function();
      should(_schema.referencesFn.update['elements.type']).be.a.Function();
    });

    it('should define the function for each referenced stores', () => {
      var _objectDescriptor = {
        id       : ['<<id>>'],
        elements : ['array', {
          id   : ['<<int>>'],
          type : ['object', 'ref', '@type']
        }],
        task : ['object', 'ref', '@task']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.referencesFn).be.an.Object();
      should(_schema.referencesFn.get).be.an.Object();
      should(_schema.referencesFn.update).be.an.Object();
      should(_schema.referencesFn.get['elements.type']).be.a.Function();
      should(_schema.referencesFn.update['elements.type']).be.a.Function();
      should(_schema.referencesFn.get.task).be.a.Function();
      should(_schema.referencesFn.update.task).be.a.Function();
    });

    describe('get', () => {

      it('should get the object\'s ids if attribute\'s type is an array', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['array', {
            id : ['<<int>>', 'ref', '@elements']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.id' : 'elements'
        });

        var _baseObject = {
          id       : 1,
          elements : [{
            id : 2
          }]
        };

        should(
          _schema.referencesFn.get['elements.id'](_baseObject)
        ).be.an.Array();
      });

      it('should get the object\'s id if attribute\'s type is an object', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['array', {
            id : ['<<int>>', 'ref', '@elements']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.id' : 'elements'
        });

        var _baseObject = {
          id       : 1,
          elements : [{
            id : 2
          }]
        };

        should(
          _schema.referencesFn.get['elements.id'](_baseObject)
        ).eql([2]);
      });

      it('should get the object\'s ids : root array', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['array', {
            id : ['<<int>>', 'ref', '@elements']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.id' : 'elements'
        });

        var _baseObject = {
          id       : 1,
          elements : [
            { id : 2 }, { id : 3 }, { _id : 1 }, { id : 5 }, { id : null }
          ]
        };

        should(
          _schema.referencesFn.get['elements.id'](_baseObject)
        ).eql([2, 3, 5]);
      });

      it ('should not get the object\'s ids if array is empty', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['array', {
            id : ['<<int>>', 'ref', '@elements']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.id' : 'elements'
        });

        var _baseObject = {
          id       : 1,
          elements : []
        };

        should(
          _schema.referencesFn.get['elements.id'](_baseObject)
        ).eql([]);
      });

      it('should not get the object\'s id if object is null', () => {
        var _objectDescriptor = {
          id      : ['<<id>>'],
          element : ['object', {
            id : ['int', 'ref', '@elements']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'element.id' : 'elements'
        });

        var _baseObject = {
          id      : 1,
          element : null
        };

        should(
          _schema.referencesFn.get['element.id'](_baseObject)
        ).eql([]);
      });

      it('should not get the object\'s id if object is undefined', () => {
        var _objectDescriptor = {
          id      : ['<<id>>'],
          element : ['object', {
            id : ['int', 'ref', '@elements']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'element.id' : 'elements'
        });

        var _baseObject = {
          id : 1
        };

        should(
          _schema.referencesFn.get['element.id'](_baseObject)
        ).eql([]);
      });

      it('should get the ids : object and array', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['array', {
            id : ['<<int>>', 'ref', '@elements']
          }],
          task : ['object', {
            id : ['int', 'ref', '@tasks']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);

        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.id' : 'elements',
          'task.id'     : 'tasks',
        });


        var _baseObject = {
          id       : 1,
          elements : [
            { id : 2 },
            { id : 3 },
          ],
          task : {
            id : 1
          }
        };

        should(_schema.referencesFn.get['elements.id'](_baseObject)).eql([2, 3]);
        should(_schema.referencesFn.get['task.id'](_baseObject)).eql([1]);
      });

      it('should get the ids : sub object in array', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          elements : ['array', {
            id   : ['<<int>>'],
            type : ['object', {
              id : ['int', 'ref', '@tasks']
            }]
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.type.id' : 'tasks'
        });

        var _baseObject = {
          id       : 1,
          elements : [
            { id : 1, type : { id : 1 }},
            { id : 3, type : { id : 2 }},
            { id : 2, type : { id : 3 }},
          ]
        };

        should(_schema.referencesFn.get['elements.type.id'](_baseObject)).eql([1, 2, 3]);
      });

      it ('should get the id : sub object in object', () => {
        var _objectDescriptor = {
          id      : ['<<int>>'],
          element : ['object', {
            id   : ['<<int>>'],
            type : ['object', {
              id : ['<int>', 'ref', '@types']
            }]
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'element.type.id' : 'types'
        });

        var _baseObject = {
          id      : 1,
          element : { id : 3, type : { id : 2 }},
        };

        should(_schema.referencesFn.get['element.type.id'](_baseObject)).eql([2]);
      });

      it ('should get the ids : sub array in object', () => {
        var _objectDescriptor = {
          id      : ['<<int>>'],
          element : ['object', {
            id    : ['<<int>>'],
            types : ['array', {
              id : ['<<int>>', 'ref', '@types']
            }]
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'element.types.id' : 'types'
        });

        var _baseObject = {
          id      : 1,
          element : {
            id    : 3,
            types : [
              { id : 1 },
              { id : 2 },
              { id : 4 }
            ]
          },
        };

        should(_schema.referencesFn.get['element.types.id'](_baseObject)).eql([1, 2, 4]);
      });

      it ('should get the ids : sub array in array', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          elements : ['array', {
            id    : ['<<int>>'],
            types : ['array', {
              id : ['<<int>>', 'ref', '@types']
            }]
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.types.id' : 'types'
        });

        var _baseObject = {
          id       : 1,
          elements : [
            {
              id    : 3,
              types : [
                { id : 1 },
                { id : 2 },
                { id : 4 }
              ]
            },
            {
              id    : 4,
              types : [
                { id : 3 },
                { id : 4 }
              ]
            }
          ]
        };

        should(_schema.referencesFn.get['elements.types.id'](_baseObject)).eql([1, 2, 4, 3]);
      });
    });

    describe('update', () => {

      it('should replace the key', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['array', {
            id : ['<<int>>', 'ref', '@elements']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.id' : 'elements'
        });

        var _baseObject = {
          id       : 1,
          elements : [{
            id    : 2,
            label : 'A'
          }]
        };

        _schema.referencesFn.update['elements.id'](2, 4, _baseObject);

        should(_baseObject).eql({
          id       : 1,
          elements : [{
            id    : 4,
            label : 'A'
          }]
        });
      });

      it('should replace the object : root object', () => {
        var _objectDescriptor = {
          id      : ['<<id>>'],
          element : ['object', {
            id : ['int', 'ref', '@elements']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'element.id' : 'elements'
        });

        var _baseObject = {
          id      : 1,
          element : {
            id    : 2,
            label : 'A'
          }
        };

        _schema.referencesFn.update['element.id'](2, 4, _baseObject);

        should(_baseObject).eql({
          id      : 1,
          element : {
            id    : 4,
            label : 'A'
          }
        });
      });

      it('should not replace the object if the ids mismatch', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['array', {
            id : ['<<int>>', 'ref', '@elements']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.id' : 'elements'
        });

        var _baseObject = {
          id       : 1,
          elements : [{
            id : 2
          }]
        };

        _schema.referencesFn.update['elements.id'](1, 4, _baseObject);

        should(_baseObject).eql({
          id       : 1,
          elements : [{
            id : 2
          }]
        });
      });

      it('should not replace the key if the id = null', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['array', {
            id : ['<<int>>', 'ref', '@elements']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.id' : 'elements'
        });

        var _baseObject = {
          id       : 1,
          elements : [{
            id : null
          }]
        };

        _schema.referencesFn.update['elements.id'](null, null, _baseObject);

        should(_baseObject).eql({
          id       : 1,
          elements : [{
            id : null
          }]
        });
      });

      it('should not replace the key if undefined', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['array', {
            id : ['<<int>>', 'ref', '@elements']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.id' : 'elements'
        });

        var _baseObject = {
          id       : 1,
          elements : [{
            label : 'A'
          }]
        };

        _schema.referencesFn.update['elements.id'](undefined, undefined, _baseObject);

        should(_baseObject).eql({
          id       : 1,
          elements : [{
            label : 'A'
          }]
        });
      });

      it('should replace the keys : object and array', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          elements : ['array', {
            id : ['<<int>>', 'ref', '@types']
          }],
          task : ['object', {
            id : ['int', 'ref', '@task']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);

        var _baseObject = {
          id       : 1,
          elements : [
            { id : '_2' },
            { id : '_3' },
          ],
          task : {
            id : '_1'
          }
        };

        _schema.referencesFn.update['elements.id']('_2', 2, _baseObject);
        _schema.referencesFn.update['task.id']('_1', 1, _baseObject);

        should(_baseObject).eql({
          id       : 1,
          elements : [
            {
              id : 2
            },
            {
              id : '_3',
            }
          ],
          task : {
            id : 1
          }
        });
      });

      it('should replace the key : sub object in array', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          elements : ['array', {
            id   : ['<<int>>'],
            type : ['object', {
              id : ['int', 'ref', '@types']
            }]
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.type.id' : 'types'
        });

        var _baseObject = {
          id       : 1,
          elements : [
            { id : 1, type : { id : 1 }},
            { id : 3, type : { id : 2 }},
            { id : 2, type : { id : 3 }},
          ]
        };

        _schema.referencesFn.update['elements.type.id'](2, 4, _baseObject);

        should(_baseObject).eql({
          id       : 1,
          elements : [
            { id : 1, type : { id : 1 }},
            { id : 3, type : { id : 4 }},
            { id : 2, type : { id : 3 }},
          ]
        });
      });

      it ('should replace the key : sub object in object', () => {
        var _objectDescriptor = {
          id      : ['<<int>>'],
          element : ['object', {
            id   : ['<<int>>'],
            type : ['object', {
              id : ['int', 'ref', '@types']
            }]
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'element.type.id' : 'types'
        });

        var _baseObject = {
          id      : 1,
          element : { id : 3, type : { id : '_2' }},
        };

        _schema.referencesFn.update['element.type.id']('_2', 2, _baseObject);

        should(_baseObject).eql({
          id      : 1,
          element : { id : 3, type : { id : 2 }}
        });
      });

      it ('should replace the key : sub array in object', () => {
        var _objectDescriptor = {
          id      : ['<<int>>'],
          element : ['object', {
            id    : ['<<int>>'],
            types : ['array', {
              id : ['<<int>>', 'ref', '@types']
            }]
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'element.types.id' : 'types'
        });

        var _baseObject = {
          id      : 1,
          element : {
            id    : 3,
            types : [
              { id : 1    },
              { id : 2    },
              { id : '_4' }
            ]
          },
        };

        _schema.referencesFn.update['element.types.id']('_4', 4, _baseObject);

        should(_baseObject).eql({
          id      : 1,
          element : {
            id    : 3,
            types : [
              { id : 1 },
              { id : 2 },
              { id : 4 }
            ]
          },
        });
      });

      it ('should replace the keys : sub array in array', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          elements : ['array', {
            id    : ['<<int>>'],
            types : ['array', {
              id : ['<<int>>', 'ref', '@types']
            }]
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.references).be.an.Object().and.eql({
          'elements.types.id' : 'types'
        });

        var _baseObject = {
          id       : 1,
          elements : [
            {
              id    : 3,
              types : [
                { id : 1    },
                { id : 2    },
                { id : '_4' }
              ]
            },
            {
              id    : 4,
              types : [
                { id : 3    },
                { id : '_4' }
              ]
            }
          ]
        };

        _schema.referencesFn.update['elements.types.id']('_4', 4, _baseObject);

        should(_baseObject).eql({
          id       : 1,
          elements : [
            {
              id    : 3,
              types : [
                { id : 1 },
                { id : 2 },
                { id : 4 }
              ]
            },
            {
              id    : 4,
              types : [
                { id : 3 },
                { id : 4 }
              ]
            }
          ]
        });
      });
    });

  });

  describe('getPrimaryKey', () => {

    it('should retunr null if no primaryKey has been defined', () => {
      var _objectDescriptor = {
        id : ['id'],
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.getPrimaryKey({ id : 1})).eql(null);
    });

    it('should return the id', () => {
      var _objectDescriptor = {
        id    : ['<<int>>'],
        label : ['string'],
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.getPrimaryKey({ id : 1, label : 'A'})).eql(1);
    });

    it('should return the id whe id = 0', () => {
      var _objectDescriptor = {
        id    : ['<<int>>'],
        label : ['string'],
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.getPrimaryKey({ id : 0, label : 'A'})).eql(0);
    });

    it('should return null if no value has been find', () => {
      var _objectDescriptor = {
        id    : ['<<int>>'],
        label : ['string'],
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.getPrimaryKey({ id : null, label : 'A'})).eql(null);
    });

    it('should return the a composite id key', () => {
      var _objectDescriptor = {
        id    : ['<<int>>'],
        label : ['string'],
        type  : ['<<int>>']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.getPrimaryKey({ id : 1, label : 'A', type : 'B'})).eql('1-B');
    });

  });

  describe('setPrimaryKey', () => {

    it('should return null if no primaryKey has been defined', () => {
      var _objectDescriptor = {
        id : ['id'],
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.setPrimaryKey({ id : 1})).eql(null);
    });

    it('should set the id', () => {
      var _objectDescriptor = {
        id    : ['<<int>>'],
        label : ['string'],
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.setPrimaryKey({ id : null, label : 'A'}, 1)).eql('_1');
    });

    it('should set the values for composite key if null', () => {
      var _objectDescriptor = {
        id    : ['<<int>>'],
        label : ['string'],
        type  : ['<<int>>']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.setPrimaryKey({ id : null, label : 'A', type : 'B'}, 1)).eql('_1');
    });

  });

  describe('aggregates', () => {

    describe('set', () => {
      it('should throw an error if no attribute is defined after the aggregate', () => {
        try {
          var _objectDescriptor = {
            id       : ['<<id>>'],
            total    : ['sumAgg'],
            elements : ['array', {
              id   : ['<<id>>'],
              cost : ['number']
            }]
          };
          schema.analyzeDescriptor(_objectDescriptor);
        }
        catch (e) {
          should(e).eql(new Error('Lunaris.map: aggregate must have a valid object attribute!'));
        }
      });

      it('should set the aggregate sumAgg', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          total    : ['sumAgg', 'elements.cost'],
          elements : ['array', {
            id   : ['<<id>>'],
            cost : ['number']
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.aggregates).eql({
          total : ['sumAgg', 'elements.cost']
        });
        should(_schema.meta.aggregatesSort).eql(['total']);
      });

      it('should set multiple aggregate sumAgg', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.aggregates).eql({
          total            : ['sumAgg', 'elements.total'],
          'elements.total' : ['sumAgg', 'elements.parts.cost']
        });
        should(_schema.meta.aggregatesSort).eql(['elements.total', 'total']);
      });

      it('should set multiple aggregate sumAgg at same level', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          total2   : ['sumAgg', 'elements2.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }],
          elements2 : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }]
        };
        var _schema = schema.analyzeDescriptor(_objectDescriptor);
        should(_schema.meta.aggregates).eql({
          total             : ['sumAgg', 'elements.total'],
          total2            : ['sumAgg', 'elements2.total'],
          'elements.total'  : ['sumAgg', 'elements.parts.cost'],
          'elements2.total' : ['sumAgg', 'elements2.parts.cost'],
        });
        should(_schema.meta.aggregatesSort).eql(['elements2.total', 'elements.total', 'total2', 'total']);
      });
    });

    describe('insert', () => {
      it('should set a value even there is no elements to aggregate : insert (root level)', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          total    : ['sumAgg', 'elements.cost'],
          elements : ['array', {
            id   : ['<<id>>'],
            cost : ['number']
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id       : 1,
          elements : []
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.Number();
        should(_obj.total).eql(0);
      });

      it('should not crash if the attribute does not exist : attribute key', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          total    : ['sumAgg', 'elements.cost'],
          elements : ['array', {
            id   : ['<<id>>'],
            cost : ['number']
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id       : 1,
          elements : [{
            id : 2
          }]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.Number();
        should(_obj.total).eql(0);
      });

      it('should not crash if the attribute does not exist : array to aggregate', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          total    : ['sumAgg', 'elements.cost'],
          elements : ['array', {
            id   : ['<<id>>'],
            cost : ['number']
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id : 1
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.Number();
        should(_obj.total).eql(0);
      });

      it('should update the aggregate value : insert (root level)', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          total    : ['sumAgg', 'elements.cost'],
          elements : ['array', {
            id   : ['<<id>>'],
            cost : ['number']
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id       : 1,
          elements : [
            { id : 2, cost : 2 },
            { id : 3, cost : 4 },
            { id : 3, cost : 1 }
          ]
        };

        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.ok();
        should(_obj.total).be.Number();
        should(_obj.total).eql(7);
      });

      it('should update aggregate values : insert (imbricated aggregate)', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id       : 1,
          elements : [
            {
              id    : '1-1',
              parts : [
                { id : 2, cost : 3 },
                { id : 3, cost : 4 },
              ]
            },
            {
              id    : '1-2',
              parts : [
                { id : 4, cost : 4 },
                { id : 5, cost : 3 },
                { id : 6, cost : 6 }
              ]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.ok();
        should(_obj.total).be.Number();
        should(_obj.total).eql(20);
        should(_obj.elements[0]['total']).be.ok();
        should(_obj.elements[0]['total']).be.Number();
        should(_obj.elements[0]['total']).eql(7);
        should(_obj.elements[1]['total']).be.ok();
        should(_obj.elements[1]['total']).be.Number();
        should(_obj.elements[1]['total']).eql(13);
      });

      it('should set a value event there is no elements to aggregate : insert (imbricated aggregate)', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id       : 1,
          elements : [
            {
              id    : '1-1',
              parts : []
            },
            {
              id    : '1-2',
              parts : []
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.Number();
        should(_obj.total).eql(0);
        should(_obj.elements[0]['total']).be.Number();
        should(_obj.elements[0]['total']).eql(0);
        should(_obj.elements[1]['total']).be.Number();
        should(_obj.elements[1]['total']).eql(0);
      });

      it('should update aggregate values : insert (imbricated aggregate with object between two)', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'costs.parts.cost'],
            costs : ['array', {
              id    : ['<<int>>'],
              parts : ['array', {
                id   : ['<<int>>'],
                cost : ['number']
              }]
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id       : 1,
          elements : [
            {
              id    : '1-1',
              costs : [
                {
                  id    : '1-1-1',
                  parts : [
                    { id : 2, cost : 3 },
                    { id : 3, cost : 4 },
                  ]
                },
                {
                  id    : '1-1-2',
                  parts : [
                    { id : 3, cost : 1 },
                  ]
                }
              ]
            },
            {
              id    : '1-2',
              costs : [
                {
                  id    : '1-2-1',
                  parts : [
                    { id : 2, cost : 6 },
                    { id : 3, cost : 1 },
                  ]
                },
                {
                  id    : '1-2-2',
                  parts : [
                    { id : 3, cost : 1 },
                    { id : 3, cost : 5 },
                    { id : 3, cost : 4 },
                  ]
                }
              ]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.ok();
        should(_obj.total).be.Number();
        should(_obj.total).eql(25);
        should(_obj.elements[0]['total']).be.ok();
        should(_obj.elements[0]['total']).be.Number();
        should(_obj.elements[0]['total']).eql(8);
        should(_obj.elements[1]['total']).be.ok();
        should(_obj.elements[1]['total']).be.Number();
        should(_obj.elements[1]['total']).eql(17);
      });

      it('should update aggregate values : insert (deep imbrication)', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'costs.parts.cost'],
            costs : ['array', {
              id    : ['<<int>>'],
              total : ['sumAgg', 'parts.cost'],
              parts : ['array', {
                id   : ['<<int>>'],
                cost : ['number']
              }]
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id       : 1,
          elements : [
            {
              id    : '1-1',
              costs : [
                {
                  id    : '1-1-1',
                  parts : [
                    { id : 2, cost : 3 },
                    { id : 3, cost : 4 },
                  ]
                },
                {
                  id    : '1-1-2',
                  parts : [
                    { id : 3, cost : 1 },
                  ]
                }
              ]
            },
            {
              id    : '1-2',
              costs : [
                {
                  id    : '1-2-1',
                  parts : [
                    { id : 2, cost : 6 },
                    { id : 3, cost : 1 },
                  ]
                },
                {
                  id    : '1-2-2',
                  parts : [
                    { id : 3, cost : 1 },
                    { id : 3, cost : 5 },
                    { id : 3, cost : 4 },
                  ]
                }
              ]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.ok();
        should(_obj.total).be.Number();
        should(_obj.total).eql(25);
        should(_obj.elements[0]['total']).be.ok();
        should(_obj.elements[0]['total']).be.Number();
        should(_obj.elements[0]['total']).eql(8);
        should(_obj.elements[1]['total']).be.ok();
        should(_obj.elements[1]['total']).be.Number();
        should(_obj.elements[1]['total']).eql(17);
        should(_obj.elements[0]['costs'][0]['total']).be.ok();
        should(_obj.elements[0]['costs'][0]['total']).be.Number();
        should(_obj.elements[0]['costs'][0]['total']).eql(7);
        should(_obj.elements[0]['costs'][1]['total']).be.ok();
        should(_obj.elements[0]['costs'][1]['total']).be.Number();
        should(_obj.elements[0]['costs'][1]['total']).eql(1);
        should(_obj.elements[1]['costs'][0]['total']).be.ok();
        should(_obj.elements[1]['costs'][0]['total']).be.Number();
        should(_obj.elements[1]['costs'][0]['total']).eql(7);
        should(_obj.elements[1]['costs'][1]['total']).be.ok();
        should(_obj.elements[1]['costs'][1]['total']).be.Number();
        should(_obj.elements[1]['costs'][1]['total']).eql(10);
      });

      it('should aggregate everywhere : insert', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          total2   : ['sumAgg', 'elements2.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }],
          elements2 : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;
        var _obj         = {
          id       : 1,
          elements : [
            {
              id    : '1-1-1',
              parts : [
                { id : 2, cost : 3 },
                { id : 3, cost : 4 },
              ]
            },
            {
              id    : '1-2-1',
              parts : [
                { id : 2, cost : 6 },
                { id : 3, cost : 1 },
              ]
            }
          ],
          elements2 : [
            {
              id    : '1-1-2',
              parts : [
                { id : 3, cost : 1 },
                { id : 4, cost : 4 },
              ]
            },
            {
              id    : '1-2-1',
              parts : [
                { id : 2, cost : 3 },
                { id : 3, cost : 1 },
                { id : 3, cost : 2 },
                { id : 3, cost : 2 },
                { id : 3, cost : 6 },
                { id : 3, cost : 2 },
              ]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.ok();
        should(_obj.total).be.Number();
        should(_obj.total).eql(14);
        should(_obj.elements[0]['total']).be.ok();
        should(_obj.elements[0]['total']).be.Number();
        should(_obj.elements[0]['total']).eql(7);
        should(_obj.elements[1]['total']).be.ok();
        should(_obj.elements[1]['total']).be.Number();
        should(_obj.elements[1]['total']).eql(7);
        should(_obj.elements2[0]['total']).be.ok();
        should(_obj.elements2[0]['total']).be.Number();
        should(_obj.elements2[0]['total']).eql(5);
        should(_obj.elements2[1]['total']).be.ok();
        should(_obj.elements2[1]['total']).be.Number();
        should(_obj.elements2[1]['total']).eql(16);
      });
    });

    describe('upsert', () => {
      it('should update the aggregate value : update (root level) by adding element', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          total    : ['sumAgg', 'elements.cost'],
          elements : ['array', {
            id   : ['<<id>>'],
            cost : ['number']
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id       : 1,
          elements : [
            { id : 2, cost : 2 },
            { id : 3, cost : 4 },
            { id : 3, cost : 1 }
          ]
        };

        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(7);

        _obj.elements.push({ id : 1, cost : 3 });
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(10);
      });

      it('should update aggregate values : update (imbricated aggregate) by adding element', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;
        var _obj = {
          id       : 1,
          elements : [
            {
              id    : '1-1',
              parts : [
                { id : 2, cost : 3 },
                { id : 3, cost : 4 },
              ]
            },
            {
              id    : '1-2',
              parts : [
                { id : 4, cost : 4 },
                { id : 5, cost : 3 },
                { id : 6, cost : 6 }
              ]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(20);
        should(_obj.elements[0]['total']).eql(7);

        _obj.elements[0].parts.push({ id : 1, cost : 3 });
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.elements[0].total).eql(10);
        should(_obj.total).eql(23);
      });

      it('should update aggregate values : update (imbricated aggregate) by delete element', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;
        var _obj = {
          id       : 1,
          elements : [
            {
              id    : '1-1',
              parts : [
                { id : 2, cost : 3 },
                { id : 3, cost : 4 },
              ]
            },
            {
              id    : '1-2',
              parts : [
                { id : 4, cost : 4 },
                { id : 5, cost : 3 },
                { id : 6, cost : 6 }
              ]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(20);
        should(_obj.elements[0]['total']).eql(7);

        _obj.elements[0].parts.splice(0, 1);
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.elements[0].total).eql(4);
        should(_obj.total).eql(17);
      });

      it('should update aggregate values : update (imbricated aggregate) by update element', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;
        var _obj = {
          id       : 1,
          elements : [
            {
              id    : '1-1',
              parts : [
                { id : 2, cost : 3 },
                { id : 3, cost : 4 },
              ]
            },
            {
              id    : '1-2',
              parts : [
                { id : 4, cost : 4 },
                { id : 5, cost : 3 },
                { id : 6, cost : 6 }
              ]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(20);
        should(_obj.elements[0]['total']).eql(7);

        _obj.elements[0].parts[1].cost = 5;
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.elements[0].total).eql(8);
        should(_obj.total).eql(21);
      });

      it('should set a value event there is no elements to aggregate : insert (imbricated aggregate)', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id       : 1,
          elements : [
            {
              id    : '1-1',
              parts : [{ id : 1, cost : 1 }]
            },
            {
              id    : '1-2',
              parts : [{ id : 1, cost : 1 }]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.Number();
        should(_obj.total).eql(2);
        should(_obj.elements[0]['total']).eql(1);
        should(_obj.elements[1]['total']).eql(1);

        _obj.elements[0].parts = [];
        _obj.elements[1].parts = [];
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.Number();
        should(_obj.total).eql(0);
        should(_obj.elements[0]['total']).eql(0);
        should(_obj.elements[1]['total']).eql(0);
      });

      it('should update aggregate values : insert (imbricated aggregate with object between two)', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'costs.parts.cost'],
            costs : ['array', {
              id    : ['<<int>>'],
              parts : ['array', {
                id   : ['<<int>>'],
                cost : ['number']
              }]
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id       : 1,
          elements : [
            {
              id    : '1-1',
              costs : [
                {
                  id    : '1-1-1',
                  parts : [
                    { id : 2, cost : 3 },
                    { id : 3, cost : 4 },
                  ]
                },
                {
                  id    : '1-1-2',
                  parts : [
                    { id : 3, cost : 1 },
                  ]
                }
              ]
            },
            {
              id    : '1-2',
              costs : [
                {
                  id    : '1-2-1',
                  parts : [
                    { id : 2, cost : 6 },
                    { id : 3, cost : 1 },
                  ]
                },
                {
                  id    : '1-2-2',
                  parts : [
                    { id : 3, cost : 1 },
                    { id : 3, cost : 5 },
                    { id : 3, cost : 4 },
                  ]
                }
              ]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(25);
        should(_obj.elements[0]['total']).eql(8);
        should(_obj.elements[1]['total']).eql(17);

        _obj.elements[0].costs.push({ id : '1-1-3', parts : [{ id : 4, cost : 2 }] });
        _obj.elements[0].costs[1].parts.push({ id : 4, cost : 3 });

        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(30);
        should(_obj.elements[0]['total']).eql(13);
        should(_obj.elements[1]['total']).eql(17);
      });

      it('should update aggregate values : insert (deep imbrication)', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'costs.parts.cost'],
            costs : ['array', {
              id    : ['<<int>>'],
              total : ['sumAgg', 'parts.cost'],
              parts : ['array', {
                id   : ['<<int>>'],
                cost : ['number']
              }]
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id       : 1,
          elements : [
            {
              id    : '1-1',
              costs : [
                {
                  id    : '1-1-1',
                  parts : [
                    { id : 2, cost : 3 },
                    { id : 3, cost : 4 },
                  ]
                },
                {
                  id    : '1-1-2',
                  parts : [
                    { id : 3, cost : 1 },
                  ]
                }
              ]
            },
            {
              id    : '1-2',
              costs : [
                {
                  id    : '1-2-1',
                  parts : [
                    { id : 2, cost : 6 },
                    { id : 3, cost : 1 },
                  ]
                },
                {
                  id    : '1-2-2',
                  parts : [
                    { id : 3, cost : 1 },
                    { id : 3, cost : 5 },
                    { id : 3, cost : 4 },
                  ]
                }
              ]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(25);
        should(_obj.elements[0]['total']).eql(8);
        should(_obj.elements[1]['total']).eql(17);
        should(_obj.elements[0]['costs'][0]['total']).eql(7);
        should(_obj.elements[0]['costs'][1]['total']).eql(1);
        should(_obj.elements[1]['costs'][0]['total']).eql(7);
        should(_obj.elements[1]['costs'][1]['total']).eql(10);

        _obj.elements[0].costs.push({ id : '1-1-3', parts : [{ id : 4, cost : 2 }] });
        _obj.elements[0].costs[1].parts.push({ id : 4, cost : 3 });

        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(30);
        should(_obj.elements[0]['total']).eql(13);
        should(_obj.elements[1]['total']).eql(17);
        should(_obj.elements[0]['costs'][0]['total']).eql(7);
        should(_obj.elements[0]['costs'][1]['total']).eql(4);
        should(_obj.elements[0]['costs'][2]['total']).eql(2);
      });

      it('should aggregate everywhere : update', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          total2   : ['sumAgg', 'elements2.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }],
          elements2 : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;
        var _obj         = {
          id       : 1,
          elements : [
            {
              id    : '1-1-1',
              parts : [
                { id : 2, cost : 3 },
                { id : 3, cost : 4 },
              ]
            },
            {
              id    : '1-2-1',
              parts : [
                { id : 2, cost : 6 },
                { id : 3, cost : 1 },
              ]
            }
          ],
          elements2 : [
            {
              id    : '1-1-2',
              parts : [
                { id : 3, cost : 1 },
                { id : 4, cost : 4 },
              ]
            },
            {
              id    : '1-2-1',
              parts : [
                { id : 2, cost : 3 },
                { id : 3, cost : 1 },
                { id : 3, cost : 2 },
                { id : 3, cost : 2 },
                { id : 3, cost : 6 },
                { id : 3, cost : 2 },
              ]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.ok();
        should(_obj.total).be.Number();
        should(_obj.total).eql(14);
        should(_obj.total2).be.ok();
        should(_obj.total2).be.Number();
        should(_obj.total2).eql(21);
        should(_obj.elements[0]['total']).be.ok();
        should(_obj.elements[0]['total']).be.Number();
        should(_obj.elements[0]['total']).eql(7);
        should(_obj.elements[1]['total']).be.ok();
        should(_obj.elements[1]['total']).be.Number();
        should(_obj.elements[1]['total']).eql(7);
        should(_obj.elements2[0]['total']).be.ok();
        should(_obj.elements2[0]['total']).be.Number();
        should(_obj.elements2[0]['total']).eql(5);
        should(_obj.elements2[1]['total']).be.ok();
        should(_obj.elements2[1]['total']).be.Number();
        should(_obj.elements2[1]['total']).eql(16);

        _obj.elements[1].parts.push({ id : 2, cost : 3 });
        _obj.elements[0].parts.splice(0, 1);

        _obj.elements2[0].parts = [];
        _obj.elements2[1].parts[2].cost = 10;


        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).be.Number();
        should(_obj.total).eql(14);
        should(_obj.total2).be.Number();
        should(_obj.total2).eql(24);
        should(_obj.elements[0]['total']).be.Number();
        should(_obj.elements[0]['total']).eql(4);
        should(_obj.elements[1]['total']).be.Number();
        should(_obj.elements[1]['total']).eql(10);

        should(_obj.elements2[0]['total']).be.Number();
        should(_obj.elements2[0]['total']).eql(0);
        should(_obj.elements2[1]['total']).be.Number();
        should(_obj.elements2[1]['total']).eql(24);
      });
    });

    describe('delete', () => {
      it('should update the aggregate value : update (root level) by delete element', () => {
        var _objectDescriptor = {
          id       : ['<<id>>'],
          total    : ['sumAgg', 'elements.cost'],
          elements : ['array', {
            id   : ['<<id>>'],
            cost : ['number']
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;

        var _obj = {
          id       : 1,
          elements : [
            { id : 2, cost : 2 },
            { id : 3, cost : 4 },
            { id : 3, cost : 1 }
          ]
        };

        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(7);

        _obj.elements.push({ id : 1, cost : 3 });
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(10);

        _obj.elements.splice(1, 1);
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(6);
      });

      it('should update aggregate values : update (imbricated aggregate) by delete element', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;
        var _obj = {
          id       : 1,
          elements : [
            {
              id    : '1-1',
              parts : [
                { id : 2, cost : 3 },
                { id : 3, cost : 4 },
              ]
            },
            {
              id    : '1-2',
              parts : [
                { id : 4, cost : 4 },
                { id : 5, cost : 3 },
                { id : 6, cost : 6 }
              ]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(20);
        should(_obj.elements[0]['total']).eql(7);

        _obj.elements[0].parts.push({ id : 1, cost : 3 });
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.elements[0].total).eql(10);
        should(_obj.total).eql(23);

        _obj.elements[0].parts.splice(0, 1);
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.elements[0].total).eql(7);
        should(_obj.total).eql(20);
      });

      it('should update aggregate values : update (imbricated aggregate) by delete element', () => {
        var _objectDescriptor = {
          id       : ['<<int>>'],
          total    : ['sumAgg', 'elements.total'],
          elements : ['array', {
            id    : ['<<int>>'],
            total : ['sumAgg', 'parts.cost'],
            parts : ['array', {
              id   : ['<<int>>'],
              cost : ['number']
            }]
          }]
        };
        var _schema      = schema.analyzeDescriptor(_objectDescriptor);
        var _aggregateFn = _schema.aggregateFn;
        var _obj = {
          id       : 1,
          elements : [
            {
              id    : '1-1',
              parts : [
                { id : 2, cost : 3 },
                { id : 3, cost : 4 },
              ]
            },
            {
              id    : '1-2',
              parts : [
                { id : 4, cost : 4 },
                { id : 5, cost : 3 },
                { id : 6, cost : 6 }
              ]
            }
          ]
        };
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.total).eql(20);
        should(_obj.elements[0]['total']).eql(7);

        _obj.elements[0].parts.splice(0, 1);
        _aggregateFn(_obj, aggregates.aggregates);
        should(_obj.elements[0].total).eql(4);
        should(_obj.total).eql(17);
      });
    });
  });

  describe('transformer functions', () => {

    it('should find computed property', () => {
      var _fn = function (obj) {
        return obj.label.toUpperCase();
      };

      var _objectDescriptor = {
        id               : ['<<id>>'],
        label            : ['string'],
        labelCapitalized : [_fn]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.computedFns).eql({
        labelCapitalized : _fn
      });

      var _obj = {
        id    : 1,
        label : 'abc'
      };

      var _res = _schema.computedsFn(_obj);
      should(_res).eql({
        id               : 1,
        label            : 'abc',
        labelCapitalized : 'ABC'
      });
    });

    it('should not crash', () => {
      var _fn = function (obj) {
        return obj.labelCrash.toUpperCase();
      };

      var _objectDescriptor = {
        id               : ['<<id>>'],
        label            : ['string'],
        labelCapitalized : [_fn]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor, 'test');
      should(_schema.meta.computedFns).eql({
        labelCapitalized : _fn
      });

      var _obj = {
        id    : 1,
        label : 'abc'
      };

      var _lastError;
      var _res = _schema.computedsFn(_obj, {}, { warn : function (message) {
        _lastError = message;
      }});
      should(_res).eql({
        id               : 1,
        label            : 'abc',
        labelCapitalized : null
      });
      should(_lastError).eql('Error in @test when calling transformer function!');
    });

    it('should find computed properties', () => {
      var _fn = function (obj) {
        return obj.label.toUpperCase();
      };
      var _fn2 = function (obj) {
        return obj.label2.toUpperCase();
      };

      var _objectDescriptor = {
        id                : ['<<id>>'],
        label             : ['string'],
        labelCapitalized  : [_fn],
        label2            : ['string'],
        label2Capitalized : [_fn2]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.computedFns).eql({
        labelCapitalized  : _fn,
        label2Capitalized : _fn2
      });

      var _obj = {
        id     : 1,
        label  : 'abc',
        label2 : 'def'
      };

      var _res = _schema.computedsFn(_obj);
      should(_res).eql({
        id                : 1,
        label             : 'abc',
        labelCapitalized  : 'ABC',
        label2            : 'def',
        label2Capitalized : 'DEF'
      });
    });

    it('should find computed property in sub object', () => {
      var _fn = function (price) {
        return price.value * 1.20;
      };

      var _objectDescriptor = {
        id    : ['<<id>>'],
        price : ['object', {
          value : ['number'],
          ttc   : [_fn]
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.computedFns).eql({
        'price.ttc' : _fn
      });

      var _obj = {
        id    : 1,
        price : {
          value : 10
        }
      };

      var _res = _schema.computedsFn(_obj);
      should(_res).eql({
        id    : 1,
        price : {
          value : 10,
          ttc   : 12
        }
      });
    });

    it('should find computed property in object and init constants', () => {
      var _fn = function (price, obj, constants) {
        return price.value * constants.tva;
      };

      var _objectDescriptor = {
        id    : ['<<id>>'],
        price : ['object', {
          value : ['number'],
          ttc   : [_fn]
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.computedFns).eql({
        'price.ttc' : _fn
      });

      var _obj = {
        id    : 1,
        price : {
          value : 10
        }
      };

      var _res = _schema.computedsFn(_obj, { tva : 1.2 });
      should(_res).eql({
        id    : 1,
        price : {
          value : 10,
          ttc   : 12
        }
      });
    });

    it('should find computed property in object and use root object', () => {
      var _fn = function (price, obj) {
        return price.value * obj.x;
      };

      var _objectDescriptor = {
        id    : ['<<id>>'],
        x     : ['number'],
        price : ['object', {
          value : ['number'],
          ttc   : [_fn]
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.computedFns).eql({
        'price.ttc' : _fn
      });

      var _obj = {
        id    : 1,
        x     : 1.2,
        price : {
          value : 10
        }
      };

      var _res = _schema.computedsFn(_obj);
      should(_res).eql({
        id    : 1,
        x     : 1.2,
        price : {
          value : 10,
          ttc   : 12
        }
      });
    });

    it('should find computed property in array', () => {
      var _fn = function (price) {
        return price.value * 1.20;
      };

      var _objectDescriptor = {
        id     : ['<<id>>'],
        prices : ['array', {
          id    : ['<<int>>'],
          value : ['number'],
          ttc   : [_fn]
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.computedFns).eql({
        'prices.ttc' : _fn
      });

      var _obj = {
        id     : 1,
        prices : [
          {
            id    : 1,
            value : 10
          }, {
            id    : 2,
            value : 20
          }
        ]
      };

      var _res = _schema.computedsFn(_obj);
      should(_res).eql({
        id     : 1,
        prices : [
          {
            id    : 1,
            value : 10,
            ttc   : 12
          }, {
            id    : 2,
            value : 20,
            ttc   : 24
          }
        ]
      });
    });

    it('should find computed property in array and use root object', () => {
      var _fn = function (price, obj) {
        return price.value * obj.x;
      };

      var _objectDescriptor = {
        id     : ['<<id>>'],
        x      : ['number'],
        prices : ['array', {
          id    : ['<<int>>'],
          value : ['number'],
          ttc   : [_fn]
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.computedFns).eql({
        'prices.ttc' : _fn
      });

      var _obj = {
        id     : 1,
        x      : 1.2,
        prices : [
          {
            id    : 1,
            value : 10
          }, {
            id    : 2,
            value : 20
          }
        ]
      };

      var _res = _schema.computedsFn(_obj);
      should(_res).eql({
        id     : 1,
        x      : 1.2,
        prices : [
          {
            id    : 1,
            value : 10,
            ttc   : 12
          }, {
            id    : 2,
            value : 20,
            ttc   : 24
          }
        ]
      });
    });

    it('should find computed property in array', () => {
      var _fn = function (price, obj, constants) {
        return price.value * constants.tva;
      };

      var _objectDescriptor = {
        id     : ['<<id>>'],
        prices : ['array', {
          id    : ['<<int>>'],
          value : ['number'],
          ttc   : [_fn]
        }]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);
      should(_schema.meta.computedFns).eql({
        'prices.ttc' : _fn
      });

      var _obj = {
        id     : 1,
        prices : [
          {
            id    : 1,
            value : 10
          }, {
            id    : 2,
            value : 20
          }
        ]
      };

      var _res = _schema.computedsFn(_obj, { tva : 1.2 });
      should(_res).eql({
        id     : 1,
        prices : [
          {
            id    : 1,
            value : 10,
            ttc   : 12
          }, {
            id    : 2,
            value : 20,
            ttc   : 24
          }
        ]
      });
    });

    it('should set the aggregate sumAgg and find the computed property', () => {
      var _fn = function (element) {
        return element.cost;
      };

      var _objectDescriptor = {
        id       : ['<<id>>'],
        total    : ['sumAgg', 'elements', _fn],
        elements : ['array', {
          id   : ['<<id>>'],
          cost : ['number']
        }]
      };

      var _schema      = schema.analyzeDescriptor(_objectDescriptor);
      var _aggregateFn = _schema.aggregateFn;

      should(_schema.meta.aggregates).eql({
        total : ['sumAgg', 'elements', _fn]
      });
      should(_schema.meta.aggregatesSort).eql(['total']);

      var _obj = {
        id       : 1,
        elements : [
          {
            id   : 1,
            cost : 5
          }, {
            id   : 2,
            cost : 2
          }
        ]
      };

      _aggregateFn(_obj, aggregates.aggregates);
      should(_obj.total).be.Number();
      should(_obj.total).eql(7);
    });

    it('should set the aggregate sumAgg and find the computed property and define the constants', () => {
      var _fn = function (element, obj, constants) {
        return element.cost * constants.tva;
      };

      var _objectDescriptor = {
        id       : ['<<id>>'],
        total    : ['sumAgg', 'elements', _fn],
        elements : ['array', {
          id   : ['<<id>>'],
          cost : ['number']
        }]
      };

      var _schema      = schema.analyzeDescriptor(_objectDescriptor);
      var _aggregateFn = _schema.aggregateFn;

      should(_schema.meta.aggregates).eql({
        total : ['sumAgg', 'elements', _fn]
      });
      should(_schema.meta.aggregatesSort).eql(['total']);

      var _obj = {
        id       : 1,
        elements : [
          {
            id   : 1,
            cost : 5
          }, {
            id   : 2,
            cost : 2
          }
        ]
      };

      _aggregateFn(_obj, aggregates.aggregates, { tva : 1.5 });
      should(_obj.total).be.Number();
      should(_obj.total).eql(10.5);
    });

    it('should find a join and set a custom property if a shortcut has been used and define join functions and find transformer function', () => {
      var _fn = function (element) {
        return element.cost;
      };

      var _objectDescriptor = {
        id    : ['<<id>>'],
        total : ['sumAgg', '@elements', _fn]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);

      should(_schema.meta.joins).eql({
        elements : 'join_elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'total', 'join_elements', _fn]
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _joinValues = { elements : JSON.parse(JSON.stringify(_expectedValues))};
      var _obj        = { id : 1 };
      _joinFns.set(_obj, _joinValues, aggregates.aggregates);
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(3);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 }, aggregates.aggregates);
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(6);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 }, aggregates.aggregates);
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(4);
    });

    it('should find a join and set a custom property if a shortcut has been used and define join functions and find transformer function with root object', () => {
      var _fn = function (element, obj) {
        return element.cost * obj.x;
      };

      var _objectDescriptor = {
        id    : ['<<id>>'],
        x     : ['int'],
        total : ['sumAgg', '@elements', _fn]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);

      should(_schema.meta.joins).eql({
        elements : 'join_elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'total', 'join_elements', _fn]
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _joinValues = { elements : JSON.parse(JSON.stringify(_expectedValues))};
      var _obj        = { id : 1, x : 2 };
      _joinFns.set(_obj, _joinValues, aggregates.aggregates);
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(6);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 }, aggregates.aggregates);
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(12);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 }, aggregates.aggregates);
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(8);
    });

    it('should find a join and set a custom property if a shortcut has been used and define join functions and find transformer function and init constants', () => {
      var _fn = function (element, obj, constants) {
        return element.cost * constants.tva;
      };

      var _objectDescriptor = {
        id    : ['<<id>>'],
        total : ['sumAgg', '@elements', _fn]
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);

      should(_schema.meta.joins).eql({
        elements : 'join_elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'total', 'join_elements', _fn]
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _joinValues = { elements : JSON.parse(JSON.stringify(_expectedValues))};
      var _obj        = { id : 1 };
      _joinFns.set(_obj, _joinValues, aggregates.aggregates, { tva : 1.5 });
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(4.5);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 }, aggregates.aggregates, { tva : 1.5 });
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(9);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 }, aggregates.aggregates, { tva : 1.5 });
      should(_obj.join_elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(6);
    });

    it('should find a join nd define join functions and find transformer function', () => {
      var _fn = function (element) {
        return element.cost;
      };

      var _objectDescriptor = {
        id       : ['<<id>>'],
        total    : ['sumAgg', 'elements', _fn],
        elements : ['@elements']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);

      should(_schema.meta.joins).eql({
        elements : 'elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'total', 'elements', _fn]
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _joinValues = { elements : JSON.parse(JSON.stringify(_expectedValues))};
      var _obj        = { id : 1 };
      _joinFns.set(_obj, _joinValues, aggregates.aggregates);
      should(_obj.elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(3);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 }, aggregates.aggregates);
      should(_obj.elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(6);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 }, aggregates.aggregates);
      should(_obj.elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(4);
    });

    it('should find a join nd define join functions and find transformer function with root object', () => {
      var _fn = function (element, obj) {
        return element.cost * obj.x;
      };

      var _objectDescriptor = {
        id       : ['<<id>>'],
        x        : ['int'],
        total    : ['sumAgg', 'elements', _fn],
        elements : ['@elements']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);

      should(_schema.meta.joins).eql({
        elements : 'elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'total', 'elements', _fn]
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _joinValues = { elements : JSON.parse(JSON.stringify(_expectedValues))};
      var _obj        = { id : 1, x : 2 };
      _joinFns.set(_obj, _joinValues, aggregates.aggregates);
      should(_obj.elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(6);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 }, aggregates.aggregates);
      should(_obj.elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(12);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 }, aggregates.aggregates);
      should(_obj.elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(8);
    });

    it('should find a join, define join functions, find transformer function and init constants', () => {
      var _fn = function (element, obj, constants) {
        return element.cost * constants.tva;
      };

      var _objectDescriptor = {
        id       : ['<<id>>'],
        total    : ['sumAgg', 'elements', _fn],
        elements : ['@elements']
      };
      var _schema = schema.analyzeDescriptor(_objectDescriptor);

      should(_schema.meta.joins).eql({
        elements : 'elements'
      });
      should(_schema.meta.externalAggregates).eql({
        elements : ['sumAgg', 'total', 'elements', _fn]
      });

      var _joinFns = getJoinFns({}, _schema.compilation, _schema.virtualCompilation, _schema.meta.joins, _schema.meta.externalAggregates);

      var _expectedValues = [
        { _id : 1, id : 1, cost : 1 },
        { _id : 2, id : 2, cost : 2 }
      ];
      var _joinValues = { elements : JSON.parse(JSON.stringify(_expectedValues))};
      var _obj        = { id : 1 };
      _joinFns.set(_obj, _joinValues, aggregates.aggregates, { tva : 1.5 });
      should(_obj.elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(4.5);

      _expectedValues.push({ _id : 3, id : 3, cost : 3 });
      _joinFns.elements.insert(_obj, { _id : 3, id : 3, cost : 3 }, aggregates.aggregates, { tva : 1.5 });
      should(_obj.elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(9);

      _expectedValues.splice(1, 1);
      _joinFns.elements.delete(_obj, { _id : 2 }, aggregates.aggregates, { tva : 1.5 });
      should(_obj.elements).be.an.Array().and.eql(_expectedValues);
      should(_obj.total).be.a.Number().and.eql(6);
    });

  });

  describe('filters', () => {
    it('should throw an error if no source has been defined', () => {
      var _errorMap = [{
        id : ['<<int>>']
      }];

      var _schema = schema.analyzeDescriptor(_errorMap);
      try {
        schema.getFilterFns([], {}, _schema.compilation, [{}]);
      }
      catch (e) {
        should(e).eql(new Error('in store.filters[0]: A filter must have a source defined as : filter.source = @<store>'));
      }
    });

    it('should throw an error if no sourceAttribute has been defined', () => {
      var _errorMap = [{
        id : ['<<int>>']
      }];

      var _schema = schema.analyzeDescriptor(_errorMap);
      try {
        schema.getFilterFns([], {}, _schema.compilation, [{
          source : '@errorFilter'
        }]);
      }
      catch (e) {
        should(e).eql(new Error('in store.filters[0]: A filter must have a source attribute defined as : filter.sourceAttribute = <attribute>'));
      }
    });

    it('should throw an error if no localAttribute has been defined', () => {
      var _errorMap = [{
        id : ['<<int>>']
      }];

      var _schema = schema.analyzeDescriptor(_errorMap);
      try {
        schema.getFilterFns([], {}, _schema.compilation, [{
          source          : '@errorFilter',
          sourceAttribute : 'label'
        }]);
      }
      catch (e) {
        should(e).eql(new Error('in store.filters[0]: A filter must have a local attribute defined as : filter.localAttribute = <attribute>'));
      }
    });

    it('should throw an error if localAttribute is not in the map', () => {
      var _errorMap = [{
        id : ['<<int>>']
      }];

      var _schema = schema.analyzeDescriptor(_errorMap);
      try {
        schema.getFilterFns([], {}, _schema.compilation, [{
          source          : '@errorFilter',
          sourceAttribute : 'label',
          localAttribute  : 'site',
          operator        : '='
        }]);
      }
      catch (e) {
        should(e).eql(new Error('in store.filters[0]: A filter must have a local attribute defined in the map!'));
      }
    });

    it('should throw an error if ILIKE operator is defined for not a string attribute ', () => {
      var _errorMap = [{
        id : ['<<int>>']
      }];

      var _schema = schema.analyzeDescriptor(_errorMap);
      try {
        schema.getFilterFns([], {}, _schema.compilation, [{
          source          : '@errorFilter',
          sourceAttribute : 'label',
          localAttribute  : 'id',
          operator        : 'ILIKE'
        }]);
      }
      catch (e) {
        should(e).eql(new Error('in store.filters[0]: ILIKE operator is only available for type string'));
      }
    });

    it('should throw an error if operator does not exist ', () => {
      var _errorMap = [{
        id : ['<<int>>']
      }];

      var _schema = schema.analyzeDescriptor(_errorMap);
      try {
        schema.getFilterFns([], {}, _schema.compilation, [{
          source          : '@errorFilter',
          sourceAttribute : 'label',
          localAttribute  : 'id',
          operator        : '==='
        }]);
      }
      catch (e) {
        should(e).eql(new Error('in store.filters[0]: A filter must be one of the following [=,ILIKE,>,<,>=,<=,<>]'));
      }
    });

    it('should not throw an error if isOflfine === false', () => {
      var _errorMap = [{
        id : ['<<int>>']
      }];

      var _schema = schema.analyzeDescriptor(_errorMap);
      var _error  = null;
      try {
        schema.getFilterFns([], {}, _schema.compilation, [{
          source          : '@errorFilter',
          sourceAttribute : 'label',
          localAttribute  : 'id',
          operator        : '=',
          isOffline       : false
        }]);
      }
      catch (e) {
        _error = e;
      }
      should(_error).eql(null);
    });

    it('should define a function for ILIKE operator', done => {
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      var _schema = schema.analyzeDescriptor(_map);
      var _fns    = schema.getFilterFns([], {}, _schema.compilation, [{
        source          : '@errorFilter',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : 'ILIKE'
      }]);

      function _ilike (filterValue, objValue) {
        should(filterValue).eql('A');
        should(objValue).eql('B');
        done();
      }

      should(_fns).be.an.Object();
      should(_fns['0']).not.eql(undefined);
      _fns['0'].call(null, 'A', { id : 1, label : 'B' }, _ilike);
    });

    it('should return a boolean : root level attribute', () => {
      var _map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];
      var _schema = schema.analyzeDescriptor(_map);
      var _fns    = schema.getFilterFns([], {}, _schema.compilation, [{
        source          : '@errorFilter',
        sourceAttribute : 'label',
        localAttribute  : 'label',
        operator        : '='
      }]);

      should(_fns).be.an.Object();
      should(_fns['0']).be.a.Function();

      should(_fns['0'].call(null, 1, { id : 1, label : 'A' })).be.a.Boolean();
    });

    it('should return a boolean : attribute in object', () => {
      var _map = [{
        id  : ['<<int>>'],
        sub : ['object', {
          label : ['string']
        }]
      }];
      var _schema = schema.analyzeDescriptor(_map);
      var _fns    = schema.getFilterFns([], {}, _schema.compilation, [{
        source          : '@errorFilter',
        sourceAttribute : 'label',
        localAttribute  : 'sub.label',
        operator        : '='
      }]);

      should(_fns).be.an.Object();
      should(_fns['0']).be.a.Function();

      should(_fns['0'].call(null, 'A', { id : 1, sub : { label : 'A' }})).be.a.Boolean();
    });

    it('should return a Boolean : attribute in sub array', () => {
      var _map = [{
        id  : ['<<int>>'],
        sub : ['array', {
          id    : ['<<int>>'],
          label : ['string']
        }]
      }];
      var _schema = schema.analyzeDescriptor(_map);
      var _fns    = schema.getFilterFns([], {}, _schema.compilation, [{
        source          : '@errorFilter',
        sourceAttribute : 'label',
        localAttribute  : 'sub.label',
        operator        : '='
      }]);

      should(_fns).be.an.Object();
      should(_fns['0']).be.a.Function();

      should(_fns['0'].call(null, 1, { id : 1, sub : [{ id : 2, label : 'A' }]})).be.a.Boolean();
    });

    it('should execute the function : attribute in sub array in sub object', () => {
      var _map = [{
        id  : ['<<int>>'],
        sub : ['array', {
          id  : ['<<int>>'],
          sub : ['object', {
            label : ['string']
          }]
        }]
      }];
      var _schema = schema.analyzeDescriptor(_map);
      var _fns    = schema.getFilterFns([], {}, _schema.compilation, [{
        source          : '@errorFilter',
        sourceAttribute : 'label',
        localAttribute  : 'sub.sub.label',
        operator        : '='
      }]);

      should(_fns).be.an.Object();
      should(_fns['0']).be.a.Function();

      should(_fns['0'].call(null, 'B', { id : 1, sub : [{ id : 2, sub : { label : 'A' }}]})).be.a.Boolean();
    });

    describe('store object', () => {

      it('should return true : >', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['string']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : true } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '>'
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, 'A', { id : 1, label : 'AB' })).eql(true);
      });

      it('should return false : >', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['string']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : true } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '>'
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, 'AB', { id : 1, label : 'A' })).eql(false);
      });

      it('should return true : >=', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : true } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '>='
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, 1, { id : 1, label : 1 })).eql(true);
      });

      it('should return false : >=', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : true } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '>='
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, 2, { id : 1, label : 1 })).eql(false);
      });

      it('should return true : <', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : true } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '<'
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, 2, { id : 1, label : 1 })).eql(true);
      });

      it('should return false : <', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : true } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '<'
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, 1, { id : 1, label : 2 })).eql(false);
      });

      it('should return true : <=', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : true } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '<='
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, 1, { id : 1, label : 1 })).eql(true);
      });

      it('should return false : <=', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], {}, _schema.compilation, [{
          source          : '@errorFilter',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '<='
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, 1, { id : 1, label : 2 })).eql(false);
      });

      it('should return true : =', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : true } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '='
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, 1, { id : 1, label : 1 })).eql(true);
      });

      it('should return false : =', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : true } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '='
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, 1, { id : 1, label : 2 })).eql(false);
      });

      it('should return true : <>', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : true } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '<>'
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, 1, { id : 1, label : 2 })).eql(true);
      });

      it('should return false : <>', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : true } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '<>'
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, 2, { id : 1, label : 2 })).eql(false);
      });
    });

    describe('store array', () => {

      it('should return true : >', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['string']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : false } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '>'
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, ['A', 'B'], { id : 1, label : 'AB' })).eql(true);
      });

      it('should return false : >', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['string']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : false } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '>'
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, ['AB', 'BC'], { id : 1, label : 'A' })).eql(false);
      });

      it('should return true : >=', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : false } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '>='
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, [1, 2], { id : 1, label : 1 })).eql(true);
      });

      it('should return false : >=', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : false } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '>='
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, [2, 3], { id : 1, label : 1 })).eql(false);
      });

      it('should return true : <', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : false } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '<'
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, [2, 4], { id : 1, label : 1 })).eql(true);
      });

      it('should return false : <', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : false } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '<'
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, [1], { id : 1, label : 2 })).eql(false);
      });

      it('should return true : <=', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : false } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '<='
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, [1], { id : 1, label : 1 })).eql(true);
      });

      it('should return false : <=', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], {}, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '<='
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, [1], { id : 1, label : 2 })).eql(false);
      });

      it('should return true : =', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : false } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '='
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, [1], { id : 1, label : 1 })).eql(true);
      });

      it('should return false : =', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : false } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '='
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, [1], { id : 1, label : 2 })).eql(false);
      });

      it('should return true : <>', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : false } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '<>'
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, [1], { id : 1, label : 2 })).eql(true);
      });

      it('should return false : <>', () => {
        var _map = [{
          id    : ['<<int>>'],
          label : ['int']
        }];
        var _schema = schema.analyzeDescriptor(_map);
        var _fns    = schema.getFilterFns([], { source : { isStoreObject : false } }, _schema.compilation, [{
          source          : '@source',
          sourceAttribute : 'label',
          localAttribute  : 'label',
          operator        : '<>'
        }]);

        should(_fns).be.an.Object();
        should(_fns['0']).be.a.Function();

        should(_fns['0'].call(null, [1], { id : 1, label : 1 })).eql(false);
      });
    });
  });

  describe('clone', () => {

    it('should generate clone function for a simple map : object map', () => {
      let map = {
        id    : ['<<int>>'],
        label : ['string']
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = {
        id    : 1,
        label : 'a'
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql({
        id    : 1,
        label : 'a'
      });

      baseObj.label = 'b';
      should(clonedObj.label).not.eql(baseObj.label);

      should(mapDescriptor.clone({
        id    : false,
        label : null
      })).eql({
        id    : false,
        label : null
      });

      should(mapDescriptor.clone({
        id    : 1,
        label : undefined
      })).eql({
        id    : 1,
        label : undefined
      });
    });

    it('should generate clone function for a simple map : array map', () => {
      let map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = [{
        id    : 1,
        label : 'a'
      }];
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql([{
        id    : 1,
        label : 'a'
      }]);

      baseObj[0].label = 'b';
      should(clonedObj[0].label).not.eql(baseObj[0].label);

      should(mapDescriptor.clone([{
        id    : false,
        label : null
      }])).eql([{
        id    : false,
        label : null
      }]);

      should(mapDescriptor.clone([{
        id    : 1,
        label : undefined
      }])).eql([{
        id    : 1,
        label : undefined
      }]);
    });

    it('should generate clone function for a simple map with mutiple items : array map', () => {
      let map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = [
        { id : 1, label : 'a' },
        { id : 2, label : 'b' },
        { id : 3, label : 'c' },
      ];
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql([
        { id : 1, label : 'a' },
        { id : 2, label : 'b' },
        { id : 3, label : 'c' },
      ]);

      should(mapDescriptor.clone([
        { id : 1, label : undefined },
        { id : 2, label : false     },
        { id : 3, label : 0         },
      ])).eql([
        { id : 1, label : undefined },
        { id : 2, label : false     },
        { id : 3, label : 0         },
      ]);
    });

    it('should generate clone function for a simple map & clone for one element : array map', () => {
      let map = [{
        id    : ['<<int>>'],
        label : ['string']
      }];

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = {
        id    : 1,
        label : 'a'
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql({
        id    : 1,
        label : 'a'
      });

      baseObj.label = 'b';
      should(clonedObj.label).not.eql(baseObj.label);
    });

    it('should generate clone function for a map with sub object : array map', () => {
      let map = [{
        id       : ['<<int>>'],
        label    : ['string'],
        category : ['object', {
          id    : ['int'],
          label : ['string']
        }]
      }];

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = [{
        id       : 1,
        label    : 'a',
        category : {
          id    : 2,
          label : 'categ-2'
        }
      }];
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql([{
        id       : 1,
        label    : 'a',
        category : {
          id    : 2,
          label : 'categ-2'
        }
      }]);

      baseObj[0].category.id = 1;
      should(clonedObj[0].category.id).not.eql(baseObj[0].category.id);


      should(mapDescriptor.clone([
        { id : 1, label : 'a', category : { id : 1, label : 'b' } },
        { id : 2, label : 'b', category : null                    },
        { id : 3, label : 'c', category : {}                      },
        { id : 3, label : 'd', category : undefined               },
      ])).eql([
        { id : 1, label : 'a', category : { id : 1, label : 'b' } },
        { id : 2, label : 'b', category : null                    },
        { id : 3, label : 'c', category : {}                      },
        { id : 3, label : 'd', category : undefined               },
      ]);
    });

    it('should generate clone function for a map with 2 sub objects : array map', () => {
      let map = [{
        id       : ['<<int>>'],
        category : ['object', {
          id : ['int'],
        }],
        category2 : ['object', {
          id : ['int'],
        }]
      }];

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      should(mapDescriptor.clone([
        { id : 1, category : { id : 1}, category2 : { id : 2 } },
        { id : 1, category : { id : 1}, category2 : null       },
        { id : 1, category : null     , category2 : { id : 2 } },
        { id : 1, category : { id : 1}, category2 : undefined  },
        { id : 1, category : undefined, category2 : { id : 2 } },
      ])).eql([
        { id : 1, category : { id : 1}, category2 : { id : 2 } },
        { id : 1, category : { id : 1}, category2 : null       },
        { id : 1, category : null     , category2 : { id : 2 } },
        { id : 1, category : { id : 1}, category2 : undefined  },
        { id : 1, category : undefined, category2 : { id : 2 } },
      ]);
    });

    it('should generate clone function for a map with 2 sub array : array map', () => {
      let map = [{
        id       : ['<<int>>'],
        category : ['array', {
          id : ['<<int>>'],
        }],
        category2 : ['array', {
          id : ['<<int>>'],
        }]
      }];

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      should(mapDescriptor.clone([
        { id : 1, category : { id : 1}, category2 : { id : 2 } }
      ]));
    });

    it('should generate clone function for a map with sub array : array map', () => {
      let map = [{
        id       : ['<<int>>'],
        label    : ['string'],
        category : ['array', {
          id    : ['<<int>>'],
          label : ['string']
        }]
      }];

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      should(mapDescriptor.clone).be.a.Function();

      let baseObj = [{
        id       : 1,
        label    : 'a',
        category : [
          { id : 2, label : 'categ-2' }, { id : 1, label : 'categ-1' }
        ]
      }];
      let clonedObj = mapDescriptor.clone(baseObj);

      should(baseObj).eql([{
        id       : 1,
        label    : 'a',
        category : [
          { id : 2, label : 'categ-2' }, { id : 1, label : 'categ-1' }
        ]
      }]);

      baseObj[0].category[0].id = 3;

      should(clonedObj[0].category[0].id).not.eql(baseObj[0].category[0].id);

      should(mapDescriptor.clone([
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' }]                          },
        { id : 2, label : 'b', category : null                                               },
        { id : 3, label : 'c', category : []                                                 },
        { id : 3, label : 'd', category : undefined                                          },
        { id : 3, label : 'd', category : [{ id : 1, label : 'b' }, { id : 2, label : 'c' }] },
      ])).eql([
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' }]                          },
        { id : 2, label : 'b', category : null                                               },
        { id : 3, label : 'c', category : []                                                 },
        { id : 3, label : 'd', category : undefined                                          },
        { id : 3, label : 'd', category : [{ id : 1, label : 'b' }, { id : 2, label : 'c' }] },
      ]);
    });

    it('should generate clone function for a map with sub object in sub object : array map', () => {
      let map = [{
        id       : ['<<int>>'],
        label    : ['string'],
        category : ['object', {
          id    : ['int'],
          label : ['string'],
          sub   : ['object', {
            id : ['int']
          }]
        }]
      }];

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = [{
        id       : 1,
        label    : 'a',
        category : {
          id    : 2,
          label : 'categ-2',
          sub   : {
            id : 1
          }
        }
      }];
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql([{
        id       : 1,
        label    : 'a',
        category : {
          id    : 2,
          label : 'categ-2',
          sub   : { id : 1 }
        }
      }]);

      baseObj[0].category.sub.id = 2;
      should(clonedObj[0].category.sub.id).not.eql(baseObj[0].category.sub.id);

      should(mapDescriptor.clone([
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : { id : 1 }} },
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : null}       },
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : {}}         },
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : undefined}  },
        { id : 2, label : 'b', category : null                                      },
        { id : 3, label : 'c', category : {}                                        },
        { id : 3, label : 'd', category : undefined                                 },
      ])).eql([
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : { id : 1 }} },
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : null}       },
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : {}}         },
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : undefined}  },
        { id : 2, label : 'b', category : null                                      },
        { id : 3, label : 'c', category : {}                                        },
        { id : 3, label : 'd', category : undefined                                 },
      ]);
    });

    it('should generate clone function for a map with sub object in sub array : array map', () => {
      let map = [{
        id       : ['<<int>>'],
        label    : ['string'],
        category : ['array', {
          id    : ['<<int>>'],
          label : ['string'],
          sub   : ['object', {
            id : ['int']
          }]
        }]
      }];

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      should(mapDescriptor.clone).be.a.Function();

      let baseObj = [{
        id       : 1,
        label    : 'a',
        category : [
          { id : 2, label : 'categ-2', sub : { id : 1 } }, { id : 1, label : 'categ-1', sub : { id : 2 } }
        ]
      }];
      let clonedObj = mapDescriptor.clone(baseObj);

      should(baseObj).eql([{
        id       : 1,
        label    : 'a',
        category : [
          { id : 2, label : 'categ-2', sub : { id : 1 } }, { id : 1, label : 'categ-1', sub : { id : 2 } }
        ]
      }]);

      baseObj[0].category[0].sub.id = 3;

      should(clonedObj[0].category[0].sub.id).not.eql(baseObj[0].category[0].sub.id);

      should(mapDescriptor.clone([
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}, { id : 1, label : 'b' , sub : null      }]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}, { id : 1, label : 'b' , sub : undefined }]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}, { id : 1, label : 'b' , sub : { id : 2 }}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : null}      ]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : {}}        ]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : undefined} ]},
        { id : 2, label : 'b', category : null                                      },
        { id : 3, label : 'c', category : []                                        },
        { id : 3, label : 'd', category : undefined                                 },
      ])).eql([
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}, { id : 1, label : 'b' , sub : null      }]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}, { id : 1, label : 'b' , sub : undefined }]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}, { id : 1, label : 'b' , sub : { id : 2 }}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : null}      ]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : {}}        ]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : undefined} ]},
        { id : 2, label : 'b', category : null                                      },
        { id : 3, label : 'c', category : []                                        },
        { id : 3, label : 'd', category : undefined                                 },
      ]);
    });

    it('should generate clone function for a map with sub array in sub array : array map', () => {
      let map = [{
        id       : ['<<int>>'],
        label    : ['string'],
        category : ['array', {
          id    : ['<<int>>'],
          label : ['string'],
          sub   : ['array', {
            id : ['<<int>>']
          }]
        }]
      }];

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      should(mapDescriptor.clone).be.a.Function();

      let baseObj = [{
        id       : 1,
        label    : 'a',
        category : [
          { id : 2, label : 'categ-2', sub : [{ id : 1 }] }, { id : 1, label : 'categ-1', sub : [{ id : 2 }] }
        ]
      }];
      let clonedObj = mapDescriptor.clone(baseObj);

      should(baseObj).eql([{
        id       : 1,
        label    : 'a',
        category : [
          { id : 2, label : 'categ-2', sub : [{ id : 1 }] }, { id : 1, label : 'categ-1', sub : [{ id : 2 }] }
        ]
      }]);

      baseObj[0].category[0].sub[0].id = 3;

      should(clonedObj[0].category[0].sub[0].id).not.eql(baseObj[0].category[0].sub[0].id);

      should(mapDescriptor.clone([
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : null      }]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : undefined }]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : [{ id : 2 }]}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : [{ id : 2 }, { id : 3 }, { id : 4 }]}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : null}      ]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : []}        ]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : undefined} ]},
        { id : 2, label : 'b', category : null                                      },
        { id : 3, label : 'c', category : []                                        },
        { id : 3, label : 'd', category : undefined                                 }
      ])).eql([
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : null      }]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : undefined }]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : [{ id : 2 }]}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : [{ id : 2 }, { id : 3 }, { id : 4 }]}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : null}      ]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : []}        ]},
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : undefined} ]},
        { id : 2, label : 'b', category : null                                      },
        { id : 3, label : 'c', category : []                                        },
        { id : 3, label : 'd', category : undefined                                 }
      ]);
    });

    it('should generate clone function for a map with sub object : object map', () => {
      let map = {
        id       : ['<<int>>'],
        label    : ['string'],
        category : ['object', {
          id    : ['int'],
          label : ['string']
        }]
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = {
        id       : 1,
        label    : 'a',
        category : {
          id    : 2,
          label : 'categ-2'
        }
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql({
        id       : 1,
        label    : 'a',
        category : {
          id    : 2,
          label : 'categ-2'
        }
      });

      baseObj.category.id = 1;
      should(clonedObj.category.id).not.eql(baseObj.category.id);

      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : { id : 1, label : 'b' } }
      )).eql(
        { id : 1, label : 'a', category : { id : 1, label : 'b' } }
      );
      should(mapDescriptor.clone(
        { id : 2, label : 'b', category : null }
      )).eql(
        { id : 2, label : 'b', category : null }
      );
      should(mapDescriptor.clone(
        { id : 3, label : 'c', category : {} }
      )).eql(
        { id : 3, label : 'c', category : {} }
      );
      should(mapDescriptor.clone(
        { id : 3, label : 'd', category : undefined }
      )).eql(
        { id : 3, label : 'd', category : undefined }
      );
      should(mapDescriptor.clone(
        { id : 3, label : 'd', category : { id : 1, label : 'b' } }
      )).eql(
        { id : 3, label : 'd', category : { id : 1, label : 'b' } }
      );
    });

    it('should generate clone function for a map with sub array : object map', () => {
      let map = {
        id       : ['<<int>>'],
        label    : ['string'],
        category : ['array', {
          id    : ['<<int>>'],
          label : ['string']
        }]
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      should(mapDescriptor.clone).be.a.Function();

      let baseObj = {
        id       : 1,
        label    : 'a',
        category : [
          { id : 2, label : 'categ-2' }, { id : 1, label : 'categ-1' }
        ]
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(baseObj).eql({
        id       : 1,
        label    : 'a',
        category : [
          { id : 2, label : 'categ-2' }, { id : 1, label : 'categ-1' }
        ]
      });

      baseObj.category[0].id = 3;

      should(clonedObj.category[0].id).not.eql(baseObj.category[0].id);

      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' }] }
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' }] }
      );
      should(mapDescriptor.clone(
        { id : 2, label : 'b', category : null }
      )).eql(
        { id : 2, label : 'b', category : null }
      );
      should(mapDescriptor.clone(
        { id : 3, label : 'c', category : [] }
      )).eql(
        { id : 3, label : 'c', category : [] }
      );
      should(mapDescriptor.clone(
        { id : 3, label : 'd', category : undefined }
      )).eql(
        { id : 3, label : 'd', category : undefined }
      );
    });

    it('should generate clone function for a map with sub object in sub object : object map', () => {
      let map = {
        id       : ['<<int>>'],
        label    : ['string'],
        category : ['object', {
          id    : ['int'],
          label : ['string'],
          sub   : ['object', {
            id : ['int']
          }]
        }]
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = {
        id       : 1,
        label    : 'a',
        category : {
          id    : 2,
          label : 'categ-2',
          sub   : {
            id : 1
          }
        }
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql({
        id       : 1,
        label    : 'a',
        category : {
          id    : 2,
          label : 'categ-2',
          sub   : { id : 1 }
        }
      });

      baseObj.category.sub.id = 2;
      should(clonedObj.category.sub.id).not.eql(baseObj.category.sub.id);

      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : { id : 1 }} }
      )).eql(
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : { id : 1 }} }
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : null}       }
      )).eql(
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : null}       }
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : {}}         }
      )).eql(
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : {}}         }
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : undefined}  }
      )).eql(
        { id : 1, label : 'a', category : { id : 1, label : 'b' , sub : undefined}  }
      );
      should(mapDescriptor.clone(
        { id : 2, label : 'b', category : null                                      }
      )).eql(
        { id : 2, label : 'b', category : null                                      }
      );
      should(mapDescriptor.clone(
        { id : 3, label : 'c', category : {}                                        }
      )).eql(
        { id : 3, label : 'c', category : {}                                        }
      );
      should(mapDescriptor.clone(
        { id : 3, label : 'd', category : undefined                                 }
      )).eql(
        { id : 3, label : 'd', category : undefined                                 }
      );
    });

    it('should generate clone function for a map with sub object in sub array : object map', () => {
      let map = {
        id       : ['<<int>>'],
        label    : ['string'],
        category : ['array', {
          id    : ['<<int>>'],
          label : ['string'],
          sub   : ['object', {
            id : ['int']
          }]
        }]
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      should(mapDescriptor.clone).be.a.Function();

      let baseObj = {
        id       : 1,
        label    : 'a',
        category : [
          { id : 2, label : 'categ-2', sub : { id : 1 } }, { id : 1, label : 'categ-1', sub : { id : 2 } }
        ]
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(clonedObj).eql({
        id       : 1,
        label    : 'a',
        category : [
          { id : 2, label : 'categ-2', sub : { id : 1 } }, { id : 1, label : 'categ-1', sub : { id : 2 } }
        ]
      });

      baseObj.category[0].sub.id = 3;

      should(clonedObj.category[0].sub.id).not.eql(baseObj.category[0].sub.id);

      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}, { id : 1, label : 'b' , sub : null      }]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}, { id : 1, label : 'b' , sub : null      }]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}, { id : 1, label : 'b' , sub : undefined }]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}, { id : 1, label : 'b' , sub : undefined }]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}, { id : 1, label : 'b' , sub : { id : 2 }}]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}, { id : 1, label : 'b' , sub : { id : 2 }}]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : { id : 1 }}]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : null}      ]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : null}      ]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : {}}        ]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : {}}        ]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : undefined} ]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : undefined} ]}
      );
      should(mapDescriptor.clone(
        { id : 2, label : 'b', category : null                                      }
      )).eql(
        { id : 2, label : 'b', category : null                                      }
      );
      should(mapDescriptor.clone(
        { id : 3, label : 'c', category : []                                        }
      )).eql(
        { id : 3, label : 'c', category : []                                        }
      );
      should(mapDescriptor.clone(
        { id : 3, label : 'd', category : undefined                                 }
      )).eql(
        { id : 3, label : 'd', category : undefined                                 }
      );
    });

    it('should generate clone function for a map with sub array in sub array : object map', () => {
      let map = {
        id       : ['<<int>>'],
        label    : ['string'],
        category : ['array', {
          id    : ['<<int>>'],
          label : ['string'],
          sub   : ['array', {
            id : ['<<int>>']
          }]
        }]
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      should(mapDescriptor.clone).be.a.Function();

      let baseObj = {
        id       : 1,
        label    : 'a',
        category : [
          { id : 2, label : 'categ-2', sub : [{ id : 1 }] }, { id : 1, label : 'categ-1', sub : [{ id : 2 }] }
        ]
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(clonedObj).eql({
        id       : 1,
        label    : 'a',
        category : [
          { id : 2, label : 'categ-2', sub : [{ id : 1 }] }, { id : 1, label : 'categ-1', sub : [{ id : 2 }] }
        ]
      });

      baseObj.category[0].sub[0].id = 3;

      should(clonedObj.category[0].sub[0].id).not.eql(baseObj.category[0].sub[0].id);

      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : null      }]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : null      }]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : undefined }]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : undefined }]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : [{ id : 2 }]}]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : [{ id : 2 }]}]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : [{ id : 2 }, { id : 3 }, { id : 4 }]}]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}, { id : 1, label : 'b' , sub : [{ id : 2 }, { id : 3 }, { id : 4 }]}]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : [{ id : 1 }]}]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : null}      ]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : null}      ]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : []}        ]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : []}        ]}
      );
      should(mapDescriptor.clone(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : undefined} ]}
      )).eql(
        { id : 1, label : 'a', category : [{ id : 1, label : 'b' , sub : undefined} ]}
      );
      should(mapDescriptor.clone(
        { id : 2, label : 'b', category : null                                      }
      )).eql(
        { id : 2, label : 'b', category : null                                      }
      );
      should(mapDescriptor.clone(
        { id : 3, label : 'c', category : []                                        }
      )).eql(
        { id : 3, label : 'c', category : []                                        }
      );
      should(mapDescriptor.clone(
        { id : 3, label : 'd', category : undefined                                 }
      )).eql(
        { id : 3, label : 'd', category : undefined                                 }
      );
    });

    it('should not clone a function', () => {
      let map = {
        id    : ['<<int>>'],
        label : ['string']
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = {
        id    : 1,
        label : function () {}
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql({
        id    : 1,
        label : undefined
      });
    });

    it('should not clone a non primitive object', () => {
      function Obj () {
        this.label = 'A';
      }

      let map = {
        id  : ['<<int>>'],
        obj : ['string']
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = {
        id  : 1,
        obj : new Obj()
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql({
        id  : 1,
        obj : '[object Object]'
      });
    });

    it('should use toString of non primitive object if it exists', () => {
      let Obj = function Obj () {
        this.label = 'A';

        this.toString = function () {
          return this.label;
        };
      };

      let map = {
        id  : ['<<int>>'],
        obj : ['string']
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = {
        id  : 1,
        obj : new Obj()
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql({
        id  : 1,
        obj : 'A'
      });
    });

    it('should clone a date', () => {
      let map = {
        id   : ['<<int>>'],
        date : ['string']
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = {
        id   : 1,
        date : Date(2013,2,1,1,10)
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql({
        id   : 1,
        date : JSON.parse(JSON.stringify(baseObj.date))
      });
    });

    it('should clone _id', () => {
      let map = {
        id : ['<<int>>']
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = {
        id  : 1,
        _id : 1
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql({
        id  : 1,
        _id : 1
      });
    });

    it('should clone _version', () => {
      let map = {
        id : ['<<int>>']
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = {
        id       : 1,
        _version : [1, 2]
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql({
        id       : 1,
        _version : [1, 2]
      });
    });

    it('should clone _rowId', () => {
      let map = {
        id : ['<<int>>']
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = {
        id     : 1,
        _rowId : 2
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql({
        id     : 1,
        _rowId : 2
      });
    });

    it('should not clone a field not in the map (differnet than _id, _version or _rowId)', () => {
      let map = {
        id : ['<<int>>']
      };

      let mapDescriptor = schema.analyzeDescriptor(map, 'test');

      let baseObj = {
        id    : 1,
        label : 2
      };
      let clonedObj = mapDescriptor.clone(baseObj);

      should(mapDescriptor.clone).be.a.Function();
      should(clonedObj).eql({
        id : 1
      });
    });
  });
});
