require('./utils/module-checker')(['sequelize']);

const Sequelize = require('sequelize');
const db = require('./db');
const md5 = require('js-md5');
const logger = require('./logger');

const Role = db.define('Role', {
  code: {
    type: Sequelize.STRING(64),
    allowNull: false,
    comment: 'Role code'
  }
}, {
  timestamps: false,
  freezeTableName: true,
  classMethods: {
    /**
     * Adds a role to owner
     * @memberOf Role
     * @param ownerId Role added to who
     * @param role Which role
     * @returns {Promise.<Instance>}
     */
    addRole: (ownerId, role) => {
      return Role.create({
        code: role,
        ownerId: ownerId
      }).catch((err) => logger.error(err));
    },

    /**
     * Removes a role from owner
     * @memberOf Role
     * @param ownerId Role added to who
     * @param role Which role
     * @returns {Promise.<Integer>}
     */
    removeRole: (ownerId, role) => {
      return Role.destroy({
        where: {
          code: role,
          ownerId: ownerId
        },
        limit: 1
      }).catch((err) => logger.error(err));
    },

    /**
     * Checks for role
     * @memberOf Role
     * @param ownerId Role added to who
     * @param role Which role
     * @returns {Promise.<boolean>}
     */
    hasRole: (ownerId, role) => {
      return Role.count({
        where: {
          code: role,
          ownerId: ownerId
        },
        limit: 1
      }).then((data) => data == 1).catch((err) => logger.error(err));
    }
  }
});

const User = global._gluon_auth_model;

User.hasMany(Role, {as: 'roles', foreignKey: 'ownerId'});

module.exports = Role;