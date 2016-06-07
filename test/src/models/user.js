const Sequelize = require('sequelize');
const db = require('../../../db');

module.exports = db.define('User', {
  account: {
    type: Sequelize.STRING(64),
    allowNull: false
  },

  password: {
    type: Sequelize.STRING(64),
    allowNull: false
  }
}, {
  freezeTableName: true,
  paranoid: true
});