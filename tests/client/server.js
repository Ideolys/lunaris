const compression = require('compression');
const bodyParser  = require('body-parser');
const cors        = require('cors');
const express     = require('express');
const app         = express();

const fs          = require('fs');
const path        = require('path');
const build       = require('../../lib/builder').build;
const constants   = require('./build.constants');

let server     = express();
let serverPort = 3001;

var Server      = require('karma').Server;
const cfg       = require('karma').config;
var karmaConfig = cfg.parseConfig(path.resolve('karma.conf.js'));
var karma       = new Server(karmaConfig, function (exitCode) {
  console.log('Karma has exited with ' + exitCode);
  process.exit(exitCode);
});

app.use(cors());
app.use(compression());
app.use(bodyParser.json());
app.get('/http', (req, res) => {
  res.json({
    success : true,
    error   : null,
    message : null,
    data    : [
      { id : 1, label : 'A' },
      { id : 2, label : 'B' },
      { id : 3, label : 'C' }
    ]
  });
});
app.listen(serverPort, () => {
  console.log('-- Server started on port ' + serverPort);

  constants.indexedDBNumber = 2;

  build({
    baseUrl         : '"http://localhost:' + serverPort + '"',
    clientFolder    : __dirname,
    storesFolder    : path.join(__dirname, 'stores'),
    isProduction    : false,
    constants       : constants,
    indexedDBNumber : constants.indexedDBNumber
  }, (err, code) => {
    fs.writeFileSync(path.join(__dirname, 'testbuild.index.js'), code);
    karma.start();
  });
});