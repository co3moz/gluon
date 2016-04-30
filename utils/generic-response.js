var sequelizeErrors;

try {
  sequelizeErrors = require('sequelize/lib/errors');
} catch(e) {
  // generic doesn't require sequelize, but if you use res.database then you get error.
}

const logger = require('../logger');

module.exports = (app) => {
  app.use((req, res, next) => {
    res.ok = (json) => {
      res.json(json);
    };

    res.notFound = (info) => {
      res.status(404);
      res.json({
        error: true,
        info
      });
    };

    res.badRequest = (requiredFields) => {
      res.status(400);
      res.json({
        error: true,
        requiredFields
      });
    };

    res.validation = (type, fields) => {
      res.status(400);
      res.json({
        error: true,
        type,
        fields
      });
    };

    res.unauthorized = (info) => {
      res.status(401);
      res.json({
        error: true,
        info
      });
    };

    res.redirectRequest = (info) => {
      res.status(417);
      res.json({
        error: true,
        info
      });
    };

    res.unknown = (info) => {
      res.status(500);
      res.json({
        error: true,
        info
      });
    };

    res.database = (err) => {
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
      logger.log('Request returned a database error:\n{0:j:4}', err);
    };

    res.expiredToken = (info) => {
      res.status(408);
      res.json({
        error: true,
        info
      });
    };

    next();
  });
};