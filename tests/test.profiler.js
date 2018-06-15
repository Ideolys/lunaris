const profiler = require('../lib/_builder/profiler');

describe('Profiler', () => {

  it ('should return a correct object', () => {
    var _res = profiler('file-1', 'test');
    should(_res).be.an.Object();
    should(_res.code).eql('test');
    should(_res.imports).be.an.Object();
    should(_res.exports).be.an.Object();
  });

  describe('imports', () => {

    it('should extract the simple import', () => {
      var _code = `
        var _something = require('./test.js');
      `;
      var _res = profiler('file-1', _code);
      should(/_file_1_import_0/.test(_res.code)).eql(true);
      should(_res.imports['_file_1_import_0']).eql('./test.js');
    });

    it('should extract the simple imports', () => {
      var _code = `
        var something  require('./test.js');
        var something1 require('./test1.js');
        var something2 require('./test2.js');
      `;

      var _res = profiler('file-1', _code);
      should(/_file_1_import_0/.test(_res.code)).eql(true);
      should(/_file_1_import_1/.test(_res.code)).eql(true);
      should(/_file_1_import_2/.test(_res.code)).eql(true);
      should(_res.imports['_file_1_import_0']).eql('./test.js');
      should(_res.imports['_file_1_import_1']).eql('./test1.js');
      should(_res.imports['_file_1_import_2']).eql('./test2.js');
    });

  });

  describe('exports', () => {

    it('should extract a default export', () => {
      var _code = `
        exports.default = {
          test : 1
        };
      `;

      var _res = profiler('file-1', _code);
      should(/var _file_1_export_0/.test(_res.code)).eql(true);
      should(_res.exports['_file_1_export_0']).eql('exports.default');
    });

    it('should extract a value export : var', () => {
      var _code = `
        exports.test = 1;
      `;

      var _res = profiler('file-1', _code);
      should(/var _file_1_export_0/.test(_res.code)).eql(true);
      should(_res.exports['_file_1_export_0']).eql('exports.test');
    });

    it('should extract exports', () => {
      var _code = `
        exports.default = {
          test : 1
        };
        exports.test = 1;
      `;

      var _res = profiler('file-1', _code);
      should(/var _file_1_export_0/.test(_res.code)).eql(true);
      should(/var _file_1_export_1/.test(_res.code)).eql(true);
      should(_res.exports['_file_1_export_0']).eql('exports.default');
      should(_res.exports['_file_1_export_1']).eql('exports.test');
    });

  });

  it('should extract exports and imports', () => {
    var _code = `
      var something  require('./test.js');
      var something1 require('./test1.js');
      var something2 require('./test2.js');
      exports.default = {
        test : 1
      };
      exports.test = 1;
    `;

    var _res = profiler('file-1', _code);
    should(/var _file_1_export_0/.test(_res.code)).eql(true);
    should(/var _file_1_export_1/.test(_res.code)).eql(true);
    should(_res.exports['_file_1_export_0']).eql('exports.default');
    should(_res.exports['_file_1_export_1']).eql('exports.test');

    should(/_file_1_import_0/.test(_res.code)).eql(true);
    should(/_file_1_import_1/.test(_res.code)).eql(true);
    should(/_file_1_import_2/.test(_res.code)).eql(true);
    should(_res.imports['_file_1_import_0']).eql('./test.js');
    should(_res.imports['_file_1_import_1']).eql('./test1.js');
    should(_res.imports['_file_1_import_2']).eql('./test2.js');
  });

});

function _flattenStr (str) {
  return str.replace(/\n*/g, '').replace(/\s*/g, '');
}
