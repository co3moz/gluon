const express = require('express');
const os = require('os');
const path = require('path');
const ezFormat = require('ezformat');
const bodyParser = require('body-parser');
const requireDir = require('./utils/require-dir');
const routeLoader = require('./utils/route-loader');
const logger = require('./logger');

var defaults = {
  generic: true,
  log: true,
  publicSource: './public',
  dir: ''
};

try {
  const config = require('config');
  const gluonDefaults = config.get('gluon');
  Object.assign(defaults, gluonDefaults);
} catch (e) {
  // if there is no config installation than ignore
}

/**
 * Gluon main function
 * @function
 * @param {Object} [options] Gluon startup options
 * @param [options.app] Express application container. if you make this empty then system create new one.
 * @param {Boolean} [options.generic=true] Should gluon initialize generic extension.
 * @param {Boolean} [options.log=true] Should gluon initialize request logging mechanism.
 * @param {Function} [options.ready] Ready signal
 * @param {String} [options.dir=''] Location of project
 * @param {String|Array<String>} [options.publicSource='./public'] Location of project
 * @param {{ip: String, port: Number}|Number} [options.listen] Should i listen?
 * @returns {app|*}
 */
function Gluon (options) {
  (options != undefined || (options = {}));
  Object.keys(defaults).forEach((key) => {
    if (options[key] == undefined) options[key] = defaults[key];
  });

  const app = options.app || express();

  logger.debug('Initializing...');
  if (options.generic == true) {
    logger.debug('Request generic extension loading..');
    require('./utils/generic-response')(app);
  }


  logger.debug('Body parser loading..');
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());

  if (options.log == true) {
    logger.debug('Request logging mechanism generating..');
    app.use((req, res, next) => {
      res.on('finish', () => {
        var color = res.statusCode >= 500 ? '\x1B[31m' + res.statusCode + '\x1B[39m'
          : res.statusCode >= 400 ? '\x1B[33m' + res.statusCode + '\x1B[39m'
          : res.statusCode >= 300 ? '\x1B[36m' + res.statusCode + '\x1B[39m'
          : res.statusCode >= 200 ? '\x1B[32m' + res.statusCode + '\x1B[39m' : res.statusCode;
        logger.log('[{method}] {1} {headers.host}{url} from {ip}', req, color);

        if (logger.level() <= 0) {
          const keys = Object.keys(req.body);
          if (keys.length > 0) logger.debug('body information ({length}): {2.EOL}{1 j 4}', keys, req.body, os);
        }
      });
      next();
    });
  }

  if (options.publicSource) {
    if (typeof options.publicSource == "string") {
      const location = path.resolve(process.cwd(), options.dir, options.publicSource);
      app.use(express['static'](location));
      logger.debug('folder {0} has been set as public', location);
    } else if (options.publicSource == null) {
      logger.debug('there is no public folder');
    } else if (options.publicSource.constructor == Array) {
      options.publicSource.forEach((source)=> {
        const location = path.resolve(process.cwd(), options.dir, source);
        app.use(express['static'](location));
        logger.debug('folder {0} has been set as public', location);
      });
    }
  }


  logger.debug('Folder control unit loading..');
  requireDir(options.dir, './models', () => {
    requireDir(options.dir, './routes', (files) => {
      routeLoader(files, app);

      logger.debug('Gluon ready!');
      if (options.ready) options.ready(app, logger);

      if (options.listen != undefined) {
        if (typeof options.listen == 'object') {
          app.listen(process.env.port || options.listen.port, options.listen.ip);
          logger.log('Listener started on {2}:{0 def(1)}'.green, process.env.port, options.listen.port, options.listen.ip);
        } else if (typeof options.listen == 'number') {
          app.listen(process.env.port || options.listen);
          logger.log('Listener started on 0.0.0.0:{0 def(1)}'.green, process.env.port, options.listen);
        }
      }
    });
  });

  return app;
}

/**
 * Gluon router binded to express
 * @param {String} [location] Override location?
 * @returns {Router}
 */
Gluon.router = (location) => {
  var router = express.Router();
  router.location = location;
  return router;
};

module.exports = Gluon;