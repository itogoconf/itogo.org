const express = require('express');
const http = require('http');
const compression = require('compression');
const helmet = require('helmet');
const cachePolicy = require('./server/app.webcache');
const security = require('./server/app.security');
const session = require('express-session');

const WEBSITE = {
  static: 'build/dist',
  port: process.env.PORT || 8083,
  secret: process.env.SPW_SESSION_SECRET || 'SMHQs7cLAC3x',
  http2: process.env.DEVMIND_HTTP2,
};

const app = express()
  .enable('trust proxy')
  .use(security.rewrite())
  .use(session(security.sessionAttributes(WEBSITE.secret)))
  .use(compression())
  .use(express.urlencoded({extended: false}))
  .use(helmet())
  //.use(helmet.contentSecurityPolicy(security.securityPolicy()))
  .use(security.corsPolicy())
  .use(express.static(WEBSITE.static, {setHeaders: cachePolicy.setCustomCacheControl}))
  .all('*', security.notFoundHandler());

app.set('port', WEBSITE.port);

http.Server(app)
    .listen(WEBSITE.port)
    .on('error', onError)
    .on('listening', () => {
      console.debug('Listening on ' + WEBSITE.port);
      console.debug(`Environnement ${process.env.NODE_ENV}`);
    });

function onError(error) {
  console.error(error);
  if (error.syscall !== 'listen') {
    throw error;
  }
  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EADDRINUSE':
      console.error('Port is already in use : ' + WEBSITE.port);
      process.exit(1);
      break;
    default:
      throw error;
  }
}

