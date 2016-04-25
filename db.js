const Sequelize = require("sequelize");
const config = require('config');

console.log('Connecting to database...');
const db = new Sequelize(config.get('database.database'), config.get('database.user'), config.get('database.password'), {
  host: config.get('database.host'),
  dialect: config.get('database.dialect')
});

module.exports = db;