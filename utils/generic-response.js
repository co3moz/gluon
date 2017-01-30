var sequelizeErrors;

try {
  sequelizeErrors = require('sequelize/lib/errors');
} catch (e) {
  // generic doesn't require sequelize, but if you use res.database then you get error.
}

var logger = require('../logger');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.ok = function (json) {
      res.json(json);
    };

    res.notFound = function (info) {
      res.status(404);
      res.json({
        error: true,
        info: info
      });
    };

    res.badRequest = function (requiredFields) {
      res.status(400);
      res.json({
        error: true,
        requiredFields: requiredFields
      });
    };

    res.validation = function (type, fields) {
      res.status(400);
      res.json({
        error: true,
        type: type,
        fields: fields
      });
    };

    res.unauthorized = function (info) {
      res.status(401);
      res.json({
        error: true,
        info: info
      });
    };

    res.redirectRequest = function (info) {
      res.status(417);
      res.json({
        error: true,
        info: info
      });
    };

    res.unknown = function (info) {
      res.status(500);
      res.json({
        error: true,
        info: info
      });
    };

    res.database = function (err) {
      if (err instanceof sequelizeErrors.UniqueConstraintError) {
        return res.validation(err.name, err.errors);
      } else if (err instanceof sequelizeErrors.ValidationError) {
        return res.validation(err.name, err.errors)
      }

      res.status(500);
      res.json({
        error: true,
        info: 'Database triggered an error. Please check your request. If there is no problem then contact with service provider.'
      });
      logger.error('Request returned a database error:\n{stack}', err);
    };

    res.expiredToken = function (info) {
      res.status(408);
      res.json({
        error: true,
        info: info
      });
    };

    next();
  });
};