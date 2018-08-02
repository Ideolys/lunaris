const fs    = require('fs');
const path  = require('path');
const build = require('../../lib/builder').build;

build({
  clientFolder : __dirname,
  storesFolder : path.join(__dirname, 'stores'),
  isProduction : false
}, (err, code) => {
  fs.writeFileSync(path.join(__dirname, 'testbuild.index.js'), code);
  process.exit();
});
