const fs        = require('fs');
const path      = require('path');
const build     = require('../../lib/builder').build;
const constants = require('./build.constants');

build({
  clientFolder    : __dirname,
  storesFolder    : path.join(__dirname, 'stores'),
  isProduction    : false,
  constants       : constants,
  indexedDBNumber : 2
}, (err, code) => {
  fs.writeFileSync(path.join(__dirname, 'testbuild.index.js'), code);
  process.exit();
});
