const ezlogger = require('ezlogger')();
const express = require('express');
const bodyParser = require('body-parser');
const requireDir = require('./utils/require-dir');
const routeLoader = require('./utils/route-loader');

/**
 * Gluon main function
 * @function
 * @param [options.app] Express application container. if you make this empty then system create new one.
 * @returns {app|*}
 */
function Gluon (options) {
  (options != undefined || (options = {}));
  const app = options.app || express();

  console.log('Initializing...');

  if (options.generic != false) {
    require('./utils/generic-response')(app);
  }

  app.use(bodyParser.urlencoded({extended: false}));
  app.use(bodyParser.json());

  requireDir(options.dir || "", './models', () => {
    requireDir(options.dir || "", './routes', (files) => {
      routeLoader(files, app);

      if (options.completed) options.completed(app);
      console.log('Initialization completed!');
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