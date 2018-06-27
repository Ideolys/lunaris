module.exports = {
  build     : require('./lib/builder').build,
  translate : require('./lib/generateLang'),
  getRoutes : require('./lib/getRoutes')
};
