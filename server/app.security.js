const md5 = require('md5');
const isProd = process.env.NODE_ENV && process.env.NODE_ENV === 'prod';

/**
 * used to initailize session
 */
exports.sessionAttributes = (secret) => ({
  secret: secret,
  // A session life is 3h
  duration: 3 * 60 * 60 * 1000,
  // We don't authorize a session resave
  resave: false,
  saveUninitialized: true,
  // Secured cookies are only set in production
  cookie: {
    secure: isProd,
    maxAge: 60 * 60 * 1000,
    sameSite: true
  },
  // User by default is empty
  user: {}
});

exports.corsPolicy = () => {
  return (req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
  }
};

/**
 * used with helmet.contentSecurityPolicy
 */
exports.securityPolicy = () => ({
  directives: {
    defaultSrc: ["'self'", "https://*.firebaseio.com"],
    // We have to authorize inline CSS used to improve firstload
    styleSrc: ["'unsafe-inline'", "'self'"],
    // We have to authorize data:... for SVG images
    imgSrc: ["'self'", 'data:', 'https:'],
    // We have to authorize inline script used to load our JS app
    scriptSrc: ["'self'", "'unsafe-inline'", 'https://www.google-analytics.com/analytics.js',
      "https://storage.googleapis.com/workbox-cdn/*",
      "https://storage.googleapis.com/workbox-cdn/releases/3.6.2/workbox-core.prod.js",
      "https://*.gstatic.com",
      //"https://www.gstatic.com/firebasejs/4.0.0/firebase-database.js",
      "https://*.firebaseio.com"],
    objectSrc: ["'self'"],
    connectSrc: ["'self'", "wss://*.firebaseio.com", "https://*.firebaseio.com"]
  }
});

exports.rewrite = () => {
  return (req, res, next) => {
    if(isProd){
      const httpInForwardedProto = req.headers && req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] === 'http';
      const httpInReferer = req.headers && req.headers.referer && req.headers.referer.indexOf('http://') >=0;
      const hostWwwInHeader = req.headers && req.headers.host && req.headers.host.indexOf('www') >=0;
      const isHtmlPage = req.url.indexOf(".html") >= 0;

      if((isHtmlPage || req.url === '/')  && (httpInForwardedProto || httpInReferer)){
        console.log('User is not in HTTP, he is redirected');
        res.redirect('https://solidarite-wassadou.fr' + req.url);
      }
      //Redirection on domain without www don't work. So this feature is disabled
      else if((isHtmlPage || req.url === '/')  && hostWwwInHeader){
        console.log('User is not on www, he is redirected');
        res.status(301).redirect('https:/solidarite-wassadou.fr/index.html');
      }
      else{
        next();
      }
    }
    else{
      next();
    }
  };
};

exports.notFoundHandler = () =>{
  return (req, res) => res.redirect(`/404.html`);
};