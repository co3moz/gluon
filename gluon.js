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
  dir: '',
  auth: null
};

var authDefaults = {
  disable: false,
  expire: 43200,
  model: "user",
  token: './token',
  role: './role'
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
 * @param {String} [options.auth=null] Authentication controller
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

  if (options.auth && options.auth.base == "token") {
    options.auth = Object.assign(authDefaults, options.auth);
    if (options.auth.disable == false || options.auth.disable == undefined || options.auth.disable == "false") {
      const authLocation = path.resolve(process.cwd(), options.dir, options.models, options.auth.model);
      try {
        global._gluon_auth_model = require(authLocation);
        global._gluon_auth_expire = options.auth.expire;
      } catch (e) {
        logger.error('Auth model is not exist in {0}', authLocation);
      }

      if (global._gluon_auth_model) {
        const Token = require(options.auth.token);
        const Role = require(options.auth.role);

        const allow = options.auth.allow ? options.auth.allow.map((route, i) => {
          return new RegExp(route.indexOf("regexp:") == 0 ? route.substring(7) : "^" + route.replace(/:[^\\/]+/g, '.*'));
        }) : [];

        const routes = Object.keys(options.auth.routes || {}).map((route, i) => {
          return {
            match: new RegExp(route.indexOf("regexp:") == 0 ? route.substring(7) : "^" + route.replace(/:[^\\/]+/g, '.*')),
            role: options.auth.routes[route]
          };
        });

        app.use((req, res, next) => {
          /**
           * Authentication protocol for gluon
           */
          req.auth = {
            /**
             * Creates a token for model
             * @param {Model} model
             * @returns {Promise.<TResult>}
             */
            login: (model) => {
              return Token.create({
                code: Token.generateCode(),
                expire: Token.defaultExpire(),
                ownerId: model.id
              }).then((data) => data).catch((err) => res.database(err));
            },


            /**
             * Removes token from owner
             * @returns {Promise.<TResult>}
             */
            logout: () => {
              return Token.destroy({
                where: {
                  code: req.get('token')
                }
              }).then((data) => data).catch((err) => res.database(err));
            },


            /**
             * Adds a role to owner
             *
             * @param {String} role Which role
             * @returns {Promise.<Instance>}
             */
            addRole: (role) => {
              return Role.findOrCreate({
                where: {
                  code: role,
                  ownerId: req[options.auth.model].id
                },

                defaults: {
                  code: role,
                  ownerId: req[options.auth.model].id
                }
              }).spread((role, created) => role).catch((err) => res.database(err));
            },


            /**
             * Adds a roles to owner
             *
             * @param {Array<String>} roles Which roles
             * @returns {Promise.<Instance>}
             */
            addRoles: (roles) => {
              roles.map((role) => Role.findOrCreate({
                where: {
                  code: role,
                  ownerId: req[options.auth.model].id
                },

                defaults: {
                  code: role,
                  ownerId: req[options.auth.model].id
                }
              }).spread((role, created) => role).catch((err) => res.database(err)));

              return Promise.all(roles);
            },


            /**
             * Removes a role from owner
             *
             * @param {String} role Which role
             * @returns {Promise.<Number>}
             */
            removeRole: (role) => {
              return Role.destroy({
                where: {
                  code: role,
                  ownerId: req[options.auth.model].id
                },
                limit: 1
              }).catch((err) => res.database(err));
            },

            /**
             * Removes a role from owner
             *
             * @param {Array<String>} roles Which roles
             * @returns {Promise.<Number>}
             */
            removeRoles: (roles) => {
              return Role.destroy({
                where: {
                  code: {
                    $in: roles
                  },
                  ownerId: req[options.auth.model].id
                }
              }).catch((err) => res.database(err));
            },


            /**
             * Checks for role
             *
             * @param {String} role Which role
             * @returns {Promise.<Boolean>}
             */
            hasRole: (role) => {
              return Role.count({
                where: {
                  code: role,
                  ownerId: req[options.auth.model].id
                },
                limit: 1
              }).then((data) => data == 1).catch((err) => res.database(err));
            },

            /**
             * Checks for roles
             *
             * @param {Array<String>} roles Which roles
             * @returns {Promise.<Boolean>}
             */
            hasRoles: (roles) => {
              return Role.count({
                where: {
                  code: {
                    $in: roles
                  },
                  ownerId: req[options.auth.model].id
                }
              }).then((data) => data == roles.length).catch((err) => res.database(err));
            }
          };

          if (req.originalUrl == '/login' || req.originalUrl == '/register' || req.originalUrl == '/') {
            logger.debug('Authentication: request passed by default allowed routes');
            return next();
          }

          const allowResult = allow.some((r) => {
            return r.test(req.originalUrl);
          });

          if (allowResult) {
            logger.debug('Authentication: request passed by allow');
            return next();
          }

          const requiredRoles = [];
          routes.forEach((r) => {
            if (r.match.test(req.originalUrl)) {
              requiredRoles.push(r.role);
            }
          });

          const userToken = req.get('token');
          if (userToken == undefined) return res.unauthorized('You entered an area that requires authorization. Please send token in headers');
          if (!/^[a-f0-9]{32}$/.test(userToken)) return res.unauthorized('Invalid token code');

          Token.find({
            include: [_gluon_auth_model],
            where: {code: userToken}
          }).then((token) => {
            if (token == null || token.expire < new Date) return res.expiredToken('probably your token has been removed, please take new one');
            token.expire = Token.defaultExpire();
            token.save();

            req[options.auth.model] = token[_gluon_auth_model.name];
            if (requiredRoles.length == 0) {
              next();
            } else {
              Role.count({
                where: {
                  ownerId: req[options.auth.model].id,
                  code: {
                    $in: requiredRoles
                  }
                }
              }).then((count)=> {
                if (count != requiredRoles.length) return res.unauthorized('You do not have right roles to use this service');
                next();
              });
            }
          }).catch((err) => res.database(err))
        });
      }
    } else {
      logger.log('Authentication: authentication and role management disabled!');
    }
  } else {
    logger.debug('Authentication: System ignored. Cause: {0}', options.auth ? 'authentication base invalid, only token supported' : 'no auth configuration');
  }

  if (options.publicSource) {
    if (typeof options.publicSource == 'string') {
      const location = path.resolve(process.cwd(), options.dir, options.publicSource);
      app.use(express['static'](location));
      logger.debug('Folder {0} has been set as public', location);
    } else if (options.publicSource == null) {
      logger.debug('There is no public folder');
    } else if (options.publicSource.constructor == Array) {
      options.publicSource.forEach((source) => {
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
 * @param {Boolean} [mergeParams=true] Should i merge params
 * @returns {Router}
 */
Gluon.router = (location, ignore, mergeParams) => {
  if (mergeParams == undefined) mergeParams = true;

  var router = express.Router({mergeParams});
  router.location = location;
  router.ignore = ignore;
  return router;
};

module.exports = Gluon;