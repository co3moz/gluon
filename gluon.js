const express = require('express');
const ezFormat = require('ezformat');
const bodyParser = require('body-parser');
const requireDir = require('./utils/require-dir');
const routeLoader = require('./utils/route-loader');
const logger = require('./logger');

var defaults = {
  generic: true,
  log: true
};

try {
  const config = require('config');
  const gluonDefaults = config.get('gluon');
  Object.assign(defaults, gluonDefaults);
} catch(e) {
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
 * @returns {app|*}
 */
function Gluon (options) {
  (options != undefined || (options = {}));
  Object.keys(defaults).forEach((key) => {
    if(options[key] == undefined) options[key] = defaults[key];
  });

  const app = options.app || express();

  logger.debug('Initializing...');
  if(options.log == true) {
    logger.debug('Request logging mechanism generating..');
    app.use((req, res, next) => {
      logger.log("[{method}] {headers.host}{url} from {ip}", req);
      next();
    });
  }


  if (options.generic == true) {
    logger.debug('Request generic extension loading..');
    require('./utils/generic-response')(app);
  }


  logger.debug('Body parser loading..');
  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());


  logger.debug('Folder control unit loading..');
  requireDir(options.dir || "", './models', () => {
    requireDir(options.dir || "", './routes', (files) => {
      routeLoader(files, app);

      logger.debug('Gluon ready!');
      if (options.ready) options.ready(app);
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