var express = require('express');
var os = require('os');
var path = require('path');
var ezFormat = require('ezformat');
var bodyParser = require('body-parser');
var requireDir = require('./utils/require-dir');
var routeLoader = require('./utils/route-loader');
var logger = require('./logger');

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
  var config = require('config');
  var gluonDefaults = config.get('gluon');
  Object.assign(defaults, gluonDefaults);
} catch (e) {
  // if there is no config installation than ignore
  logger.debug('config package doesn\'t exists.');
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
function Gluon(options) {
  (options != undefined || (options = {}));
  Object.keys(defaults).forEach(function (key) {
    if (options[key] == undefined) options[key] = defaults[key];
  });

  var app = options.app || express();

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
    app.use(function (req, res, next) {
      var now = new Date;
      res.on('finish', function () {
        var status = res.statusCode + '';
        var coloredStatus = res.statusCode >= 500 ? status.red : res.statusCode >= 400 ? status.red
          : res.statusCode >= 300 ? status.yellow : res.statusCode >= 200 ? status.green : status;
        var time = new Date - now;
        time = time < 100 ? ((time >>> 0) + 'ms').green
          : time < 500 ? ((time >>> 0) + 'ms').yellow
          : time < 1000 ? ((time >>> 0) + 'ms').red
          : time < 60000 ? ('{0:fixed:2}s'.format(time / 1000)).red
          : time < 3600000 ? ('{0:fixed:2}m'.format(time / 60000)).red
          : ('{0:fixed:2}h'.format(time / 3600000)).red;

        logger.log(logger.get('request'), {req: req, coloredStatus: coloredStatus, time: time});

        if (logger.level() <= 0) {
          var keys = Object.keys(req.body);
          if (keys.length > 0) logger.debug('body information ({length}): {2.EOL}{1 j 4}', keys, req.body, os);
        }
      });
      next();
    });
  }


  if (options.publicSource) {
    if (typeof options.publicSource == 'string') {
      var location = path.resolve(process.cwd(), options.dir, options.publicSource);
      app.use(express['static'](location));
      logger.debug('Folder {0} has been set as public', location);
    } else if (options.publicSource == null) {
      logger.debug('There is no public folder');
    } else if (options.publicSource.constructor == Array) {
      options.publicSource.forEach(function (source) {
        var location = path.resolve(process.cwd(), options.dir, source);
        app.use(express['static'](location));
        logger.debug('Folder {0} has been set as public', location);
      });
    }
  }

  if (options.auth && options.auth.base == "token") {
    options.auth = Object.assign(authDefaults, options.auth);
    if (options.auth.disable == false || options.auth.disable == undefined || options.auth.disable == "false") {
      var authLocation = path.resolve(process.cwd(), options.dir, options.models, options.auth.model);
      try {
        global._gluon_auth_model = require(authLocation);
        global._gluon_auth_expire = options.auth.expire;
      } catch (e) {
        logger.error('Auth model is not exist in {0}', authLocation);
      }

      if (global._gluon_auth_model) {
        var Token = require(options.auth.token);
        var Role = require(options.auth.role);

        //noinspection JSUnresolvedVariable
        var allow = options.auth.allow ? options.auth.allow.map(function (route) {
          return new RegExp(route.indexOf("regexp:") == 0 ? route.substring(7) : "^" + route.replace(/:[^\\/]+/g, '.*'));
        }) : [];

        var routes = Object.keys(options.auth.routes || {}).map(function (route) {
          return {
            match: new RegExp(route.indexOf("regexp:") == 0 ? route.substring(7) : "^" + route.replace(/:[^\\/]+/g, '.*')),
            role: options.auth.routes[route]
          };
        });

        app.use(function (req, res, next) {
          //noinspection JSValidateJSDoc
          /**
           * Authentication protocol for gluon
           */
          req.auth = {
            /**
             * Creates a token for model
             * @param {Model} model
             * @returns {Promise.<TResult>}
             */
            login: function (model) {
              return Token.create({
                code: Token.generateCode(),
                expire: Token.defaultExpire(),
                ownerId: model.id
              }).then(function (data) {
                return data;
              }).catch(function (err) {
                res.database(err)
              });
            },


            /**
             * Removes token from owner
             * @returns {Promise.<TResult>}
             */
            logout: function () {
              return Token.destroy({
                where: {
                  code: req.get('token')
                }
              }).then(function (data) {
                return data;
              }).catch(function (err) {
                res.database(err)
              });
            },


            /**
             * Adds a role to owner
             *
             * @param {String} role Which role
             * @returns {Promise.<Instance>}
             */
            addRole: function (role) {
              return Role.findOrCreate({
                where: {
                  code: role,
                  ownerId: req[options.auth.model].id
                },

                defaults: {
                  code: role,
                  ownerId: req[options.auth.model].id
                }
              }).spread(function (role, created) {
                return role
              }).catch(function (err) {
                res.database(err)
              });
            },


            /**
             * Adds a roles to owner
             *
             * @param {Array<String>} roles Which roles
             * @returns {Promise.<Instance>}
             */
            addRoles: function (roles) {
              roles.map(function (role) {
                return Role.findOrCreate({
                  where: {
                    code: role,
                    ownerId: req[options.auth.model].id
                  },

                  defaults: {
                    code: role,
                    ownerId: req[options.auth.model].id
                  }
                }).spread(function (role, created) {
                  return role
                }).catch(function (err) {
                  res.database(err)
                });
              });

              return Promise.all(roles);
            },


            /**
             * Removes a role from owner
             *
             * @param {String} role Which role
             * @returns {Promise.<Number>}
             */
            removeRole: function (role) {
              return Role.destroy({
                where: {
                  code: role,
                  ownerId: req[options.auth.model].id
                },
                limit: 1
              }).catch(function (err) {
                res.database(err)
              });
            },

            /**
             * Removes a role from owner
             *
             * @param {Array<String>} roles Which roles
             * @returns {Promise.<Number>}
             */
            removeRoles: function (roles) {
              return Role.destroy({
                where: {
                  code: {
                    $in: roles
                  },
                  ownerId: req[options.auth.model].id
                }
              }).catch(function (err) {
                res.database(err)
              });
            },


            /**
             * Checks for role
             *
             * @param {String} role Which role
             * @returns {Promise.<Boolean>}
             */
            hasRole: function (role) {
              return Role.count({
                where: {
                  code: role,
                  ownerId: req[options.auth.model].id
                },
                limit: 1
              }).then(function (data) {
                return data == 1
              }).catch(function (err) {
                res.database(err)
              });
            },

            /**
             * Checks for roles
             *
             * @param {Array<String>} roles Which roles
             * @returns {Promise.<Boolean>}
             */
            hasRoles: function (roles) {
              return Role.count({
                where: {
                  code: {
                    $in: roles
                  },
                  ownerId: req[options.auth.model].id
                }
              }).then(function (data) {
                return data == roles.length
              }).catch(function (err) {
                res.database(err)
              });
            }
          };

          if (req.originalUrl == '/login' || req.originalUrl == '/register' || req.originalUrl == '/') {
            logger.debug('Authentication: request passed by default allowed routes');
            return next();
          }

          var allowResult = allow.some(function (r) {
            return r.test(req.originalUrl);
          });

          if (allowResult) {
            logger.debug('Authentication: request passed by allow');
            return next();
          }

          var requiredRoles = [];
          routes.forEach(function (r) {
            if (r.match.test(req.originalUrl)) {
              requiredRoles.push(r.role);
            }
          });

          var userToken = req.get('token');
          if (userToken == undefined) return res.unauthorized('You entered an area that requires authorization. Please send token in headers');
          if (!/^[a-f0-9]{32}$/.test(userToken)) return res.unauthorized('Invalid token code');

          Token.find({
            include: [_gluon_auth_model],
            where: {code: userToken}
          }).then(function (token) {
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
              }).then(function (count) {
                if (count != requiredRoles.length) return res.unauthorized('You do not have right roles to use this service');
                next();
              });
            }
          }).catch(function (err) {
            res.database(err)
          });
        });
      }
    } else {
      logger.log('Authentication: authentication and role management disabled!');
    }
  }
  else if (options.auth && options.auth.base == "token-redis") {
    options.auth = Object.assign(authDefaults, options.auth);
    if (options.auth.disable == false || options.auth.disable == undefined || options.auth.disable == "false") {
      var authLocation = path.resolve(process.cwd(), options.dir, options.models, options.auth.model);
      try {
        global._gluon_auth_model = require(authLocation);
        global._gluon_auth_expire = options.auth.expire;
      } catch (e) {
        logger.error('Auth model is not exist in {0}', authLocation);
      }

      if (global._gluon_auth_model) {
        var allow = options.auth.allow ? options.auth.allow.map(function (route, i) {
          return new RegExp(route.indexOf("regexp:") == 0 ? route.substring(7) : "^" + route.replace(/:[^\\/]+/g, '.*'));
        }) : [];

        var routes = Object.keys(options.auth.routes || {}).map(function (route, i) {
          return {
            match: new RegExp(route.indexOf("regexp:") == 0 ? route.substring(7) : "^" + route.replace(/:[^\\/]+/g, '.*')),
            role: options.auth.routes[route]
          };
        });

        var md5 = require('js-md5');
        var redisClient = require('./redis');

        app.use(function (req, res, next) {
          //noinspection JSValidateJSDoc
          req.auth = {
            /**
             * Creates a token for model
             * @param {Model} model
             * @returns {Promise.<TResult>}
             */
            login: function (model) {
              var tokenCode = 'token-' + md5(new Date().toString()) + md5(model.id + Math.random().toString());
              var redisExpire = (global._gluon_auth_expire) >>> 0; //redis using seconds not milliseconds
              return redisClient.setAsync(tokenCode, JSON.stringify(model.toJSON())).then(function () {
                return redisClient.expireAsync(tokenCode, redisExpire);
              }).then(function () {
                return {code: tokenCode, expire: new Date(Date.now() + redisExpire * 1000)};
              });
            },

            update: function (model) {
              var tokenCode = req.get('token');
              var redisExpire = (global._gluon_auth_expire) >>> 0; //redis using seconds not milliseconds
              return redisClient.setAsync(tokenCode, JSON.stringify(model.toJSON())).then(function () {
                return redisClient.expireAsync(tokenCode, redisExpire);
              }).then(function () {
                return {code: tokenCode, expire: new Date(Date.now() + redisExpire * 1000)};
              });
            },


            /**
             * Removes token from owner
             * @returns {Promise.<TResult>}
             */
            logout: function () {
              return redisClient.delAsync(req.get('token'));
            }
          };

          if (req.originalUrl == '/login' || req.originalUrl == '/register' || req.originalUrl == '/') {
            logger.debug('Authentication: request passed by default allowed routes');
            return next();
          }

          var allowResult = allow.some(function (r) {
            return r.test(req.originalUrl);
          });

          if (allowResult) {
            logger.debug('Authentication: request passed by allow');
            return next();
          }

          var userToken = req.get('token');
          if (userToken == undefined) return res.unauthorized('You entered an area that requires authorization. Please send token in headers');
          if (!/^token-[a-f0-9]{64}$/.test(userToken)) return res.unauthorized('Invalid token code');

          redisClient.getAsync(userToken).then(function (model) {
            if (model == null) return res.unauthorized('Invalid token code');
            var redisExpire = (global._gluon_auth_expire) >>> 0; //redis using seconds not milliseconds
            redisClient.expireAsync(userToken, redisExpire);

            req[options.auth.model] = JSON.parse(model);
            next();
          }).catch(function (err) {
            res.database(err)
          });
        });
      }
    } else {
      logger.log('Authentication: authentication and role management disabled!');
    }
  } else {
    logger.debug('Authentication: System ignored. Cause: {0}', options.auth ? 'authentication base invalid, only token supported' : 'no auth configuration');
  }


  logger.debug('Folder control unit loading..');
  requireDir(options.dir, options.models, function () {
    requireDir(options.dir, options.routes, function (files) {
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
Gluon.router = function (location, ignore, mergeParams) {
  if (mergeParams == undefined) mergeParams = true;

  var router = express.Router({mergeParams: mergeParams});
  router.location = location;
  router.ignore = ignore;
  return router;
};

module.exports = Gluon;