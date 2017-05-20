require('./utils/module-checker')(['js-md5', 'sequelize']);

var Sequelize = require('sequelize');
var db = require('./db');
var md5 = require('js-md5');

var Token = db.define('token', {
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
    generateCode: function() {
      return md5(new Date().toString());
    },

    /**
     * @memberof Token
     * @returns {Date}
     */
    defaultExpire: function () {
      return new Date(Date.now() + global._gluon_auth_expire * 1000);
    }
  },
  indexes: [{
    fields: ['code']
  }]
});

var User = global._gluon_auth_model;

Token.belongsTo(User, {foreignKey: "ownerId"});

module.exports = Token;