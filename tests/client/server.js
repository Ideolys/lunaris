const compression = require('compression');
const bodyParser  = require('body-parser');
const cors        = require('cors');
const express     = require('express');
const app         = express();
const httpProxy   = require('http-proxy');

const fs          = require('fs');
const path        = require('path');
const build       = require('../../lib/builder').build;
const constants   = require('./build.constants');

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


/**
 * Offline synchro API
 */
app.post('/offlineArraySync', (req, res) => {
  let isMultiple = true;
  let isError    = false;

  if (!Array.isArray(req.body)) {
    req.body = [req.body];
    isMultiple = false;
  }

  for (var i = 0; i < req.body.length; i++) {
    req.body[i].id = req.body[i]._id;

    if (req.body[i].isError) {
      isError = true;
    }
  }

  res.json({
    success : isError ? false : true,
    error   : null,
    message : null,
    data    : isMultiple ? req.body : req.body[0]
  });
});
app.put('/offlineArraySync/:id?', (req, res) => {
  let isMultiple = true;

  if (!Array.isArray(req.body)) {
    req.body = [req.body];
    isMultiple = false;
  }

  for (var i = 0; i < req.body.length; i++) {
    req.body[i].label = req.body[i].label + '-' + (i + 1);
  }

  res.json({
    success : true,
    error   : null,
    message : null,
    data    : isMultiple ? req.body : req.body[0]
  });
});
app.delete('/offlineArraySync/:id?', (req, res) => {
  let isMultiple = true;

  if (!Array.isArray(req.body)) {
    req.body = [req.body];
    isMultiple = false;
  }

  res.json({
    success : true,
    error   : null,
    message : null,
    data    : isMultiple ? req.body : req.body[0]
  });
});
app.post('/offlineObjectSync', (req, res) => {
  req.body.id = 1;

  res.json({
    success : true,
    error   : null,
    message : null,
    data    : req.body
  });
});
app.put('/offlineObjectSync/:id', (req, res) => {
  req.body.label = req.body.label + '-' + 1;

  res.json({
    success : true,
    error   : null,
    message : null,
    data    : req.body
  });
});
app.delete('/offlineObjectSync/:id', (req, res) => {
  res.json({
    success : true,
    error   : null,
    message : null,
    data    : req.body
  });
});
app.post('/offlineReferenceSync', (req, res) => {
  let isMultiple = true;

  if (!Array.isArray(req.body)) {
    req.body = [req.body];
    isMultiple = false;
  }

  for (var i = 0; i < req.body.length; i++) {
    req.body[i].id = req.body[i]._id;
  }

  res.json({
    success : true,
    error   : null,
    message : null,
    data    : isMultiple ? req.body : req.body[0]
  });
});

const uWS   = require('uWebSockets.js');
const port  = 4000;
const appWS = uWS.App().ws('/*', {
  /* Options */
  compression      : 0,
  maxPayloadLength : 16 * 1024 * 1024,
  idleTimeout      : 0,
  message          : (ws, message) => {
    let messageJSON = JSON.parse(Buffer.from(message));

    if (messageJSON.channel === 'invalidated') {
      // Simulate server invalidation
      ws.send(JSON.stringify({ channel : 'invalidated', data : messageJSON.data, success : true }));
    }

    if (messageJSON.channel === 'invalidations') {
      // Simulate server invalidation
      ws.send(JSON.stringify({
        channel : 'invalidations',
        data    : { 'GET /http' : Date.now(), 'GET /http/#' : Date.now() },
        success : true
      }));
    }
  }
}).listen(port, (token) => {
  if (token) {
    console.log('[WS] Listening to port ' + port);
  } else {
    console.log('[WS] Failed to listen to port ' + port);
  }
});

let server = app.listen(serverPort, () => {
  console.log('-- Server started on port ' + serverPort);

  constants.indexedDBNumber = 7;

  build({
    baseUrl             : '"http://localhost:' + serverPort + '"',
    clientFolder        : __dirname,
    storesFolder        : path.join(__dirname, 'stores'),
    isProduction        : false,
    constants           : constants,
    indexedDBNumber     : constants.indexedDBNumber,
    isOfflineStrategies : true
  }, (err, code) => {
    if (err) {
      console.log(err);
    }
    fs.writeFileSync(path.join(__dirname, 'testbuild.index.js'), code);
    karma.start();
  });
});

let proxy  = httpProxy.createProxyServer({
  target : {
    host : 'localhost',
    port : port
  }
});

server.on('upgrade', (req, socket, head) => {
  return proxy.ws(req, socket, head);
});
