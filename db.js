require('./utils/module-checker')(['sequelize', 'config']);
const logger = require('./logger');

const Sequelize = require('sequelize');
const config = require('config');

logger.log('Connecting to database...');
const db = new Sequelize(config.get('database.database'), config.get('database.user'), config.get('database.password'), {
  host: config.get('database.host'),
  dialect: config.get('database.dialect'),
  logging: logger.level() > 0 ? null : logger.debug.bind(logger)
});

module.exports = db;