require('./utils/module-checker')(['js-md5', 'sequelize']);

const Sequelize = require('sequelize');
const db = require('./db');
const md5 = require('js-md5');

const Token = db.define('Token', {
  code: {
    type: Sequelize.STRING,
    allowNull: false,
    comment: 'Token code'
  },

  expire: {
    type: Sequelize.DATE,
    allowNull: false,
    comment: 'Tokens expire date'
  }
}, {
  timestamps: false,
  freezeTableName: true,
  classMethods: {
    /**
     * @memberof Token
     * @returns {String}
     */
    generateCode: () => {
      return md5(new Date().toString());
    },

    /**
     * @memberof Token
     * @returns {Date}
     */
    defaultExpire: () => {
      return new Date(Date.now() + global._gluon_auth_expire * 1000);
    }
  },
  indexes: [{
    fields: ['code']
  }]
});

const User = global._gluon_auth_model;

Token.belongsTo(User, {foreignKey: "ownerId"});

module.exports = Token;