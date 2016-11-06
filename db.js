require('./utils/module-checker')(['sequelize', 'config']);
const logger = require('./logger');

const Sequelize = require('sequelize');
const config = require('config');

logger.log('Connecting to database...');

function treeStringFunctionParser (obj) {
  Object.keys(obj).forEach(function (key) {
    if (obj[key].constructor == Object) {
      treeStringFunctionParser(obj[key]);
    } else if (obj[key].constructor == String) {
      if (obj[key].indexOf('_function') == 0) {
        obj[key] = eval("(" + obj[key].substring(1) + ")");
      }
    }
  });

  return obj;
}

const db = new Sequelize(config.get('database.database'), config.get('database.user'), config.get('database.password'), Object.assign({
  logging: logger.level() > 0 ? null : logger.debug.bind(logger)
}, treeStringFunctionParser(config.get('database'))));

module.exports = db;
