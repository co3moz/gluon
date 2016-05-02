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
  models: './models',
  routes: './routes',
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
 * @param {Function(app|*, Logger)} [options.ready] Ready signal
 * @param {Function(app|*, Logger)} [options.before] Before anything loaded
 * @param {String} [options.dir=''] Location of project
 * @param {String} [options.models='./models'] Location of models folder
 * @param {String} [options.routes='./routes'] Location of routes folder
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

  if (options.before) options.before(app, logger);

  logger.debug('Body parser loading..');
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());

  if (options.log == true) {
    logger.debug('Request logging mechanism generating..');
    app.use((req, res, next) => {
      const now = new Date;
      res.on('finish', () => {
        const status = res.statusCode + '';
        const coloredStatus = res.statusCode >= 500 ? status.red : res.statusCode >= 400 ? status.red
          : res.statusCode >= 300 ? status.yellow : res.statusCode >= 200 ? status.green : status;
        var time = new Date - now;
        time = time < 100 ? ((time >>> 0) + 'ms').green
          : time < 500 ? ((time >>> 0) + 'ms').yellow
          : time < 1000 ? ((time >>> 0) + 'ms').red
          : time < 60000 ? ('{0:fixed:2}s'.format(time / 1000)).red
          : time < 3600000 ? ('{0:fixed:2}m'.format(time / 60000)).red
          : ('{0:fixed:2}h'.format(time / 3600000)).red;

        logger.log(logger.get('request'), {req, coloredStatus, time});

        if (logger.level() <= 0) {
          const keys = Object.keys(req.body);
          if (keys.length > 0) logger.debug('body information ({length}): {2.EOL}{1 j 4}', keys, req.body, os);
        }
      });
      next();
    });
  }

  if (options.publicSource) {
    if (typeof options.publicSource == 'string') {
      const location = path.resolve(process.cwd(), options.dir, options.publicSource);
      app.use(express['static'](location));
      logger.debug('Folder {0} has been set as public', location);
    } else if (options.publicSource == null) {
      logger.debug('There is no public folder');
    } else if (options.publicSource.constructor == Array) {
      options.publicSource.forEach((source)=> {
        const location = path.resolve(process.cwd(), options.dir, source);
        app.use(express['static'](location));
        logger.debug('Folder {0} has been set as public', location);
      });
    }
  }


  logger.debug('Folder control unit loading..');
  requireDir(options.dir, options.models, () => {
    requireDir(options.dir, options.routes, (files) => {
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
 * Gluon router
 * @param {String} [location] Override location?
 * @param {Boolean} [ignore=false] Ignore me when routes binding
 * @returns {Router}
 */
Gluon.router = (location, ignore) => {
  var router = express.Router();
  router.location = location;
  router.ignore = ignore;
  return router;
};

module.exports = Gluon;