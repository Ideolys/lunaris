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
app.post('/http', (req, res) => {
  req.body.post = true;
  res.json({
    success : true,
    error   : null,
    message : null,
    data    : req.body
  });
});
app.put('/http/:id', (req, res) => {
  req.body.put = true;
  res.json({
    success : true,
    error   : null,
    message : null,
    data    : req.body
  });
});
app.patch('/http', (req, res) => {
  res.json({
    success : true,
    error   : null,
    message : null,
    data    : null
  });
});
app.listen(serverPort, () => {
  console.log('-- Server started on port ' + serverPort);

  constants.indexedDBNumber = 3;

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


const uWS  = require('uWebSockets.js');
const port = 4000;

const appWS = uWS.App().ws('/*', {
  /* Options */
  compression      : 0,
  maxPayloadLength : 16 * 1024 * 1024,
  idleTimeout      : 0,
  message          : (ws, message) => {
    let messageJSON = JSON.parse(Buffer.from(message));

    if (messageJSON.type === 'INVALIDATE') {
      // Simulate server invalidation
      ws.send(JSON.stringify({ type : 'INVALIDATE', data : messageJSON.data, success : true }));
    }

    if (messageJSON.type === 'GET_CACHE_INVALIDATIONS') {
      // Simulate server invalidation
      ws.send(JSON.stringify({ type : 'GET_CACHE_INVALIDATIONS', data : { 'GET /http' : Date.now() }, success : true }));
    }
  }
}).listen(port, (token) => {
  if (token) {
    console.log('[WS] Listening to port ' + port);
  } else {
    console.log('[WS] Failed to listen to port ' + port);
  }
});
