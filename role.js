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
     * @param {Number} ownerId Role added to who
     * @param {String} role Which role
     * @returns {Promise.<Instance>}
     */
    addRole: (ownerId, role) => {
      return Role.findOrCreate({
        where: {
          code: role,
          ownerId: ownerId
        },

        defaults: {
          code: role,
          ownerId: ownerId
        }
      }).catch((err) => logger.error(err));
    },


    /**
     * Adds a roles to owner
     * @memberOf Role
     * @param {Number} ownerId Role added to who
     * @param {Array<String>} roles Which roles
     * @returns {Promise.<Instance>}
     */
    addRoles: (ownerId, roles) => {
      roles.map((role) => Role.findOrCreate({
        where: {
          code: role,
          ownerId: ownerId
        },

        defaults: {
          code: role,
          ownerId: ownerId
        }
      }).spread((role, created) => role).catch((err) => res.database(err)));

      return Promise.all(roles);
    },


    /**
     * Removes a role from owner
     * @memberOf Role
     * @param {Number} ownerId Role added to who
     * @param {String} role Which role
     * @returns {Promise.<Number>}
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
     * Removes a role from owner
     * @memberOf Role
     * @param {Number} ownerId Role added to who
     * @param {Array<String>} roles Which roles
     * @returns {Promise.<Number>}
     */
    removeRoles: (ownerId, roles) => {
      return Role.destroy({
        where: {
          code: {
            $in: roles
          },
          ownerId: ownerId
        }
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
    },


    /**
     * Checks for roles
     * @memberof Role
     * @param {Number} ownerId Role added to who
     * @param {Array<String>} roles Which roles
     * @returns {Promise.<boolean>}
     */
    hasRoles: (ownerId, roles) => {
      return Role.count({
        where: {
          code: {
            $in: roles
          },
          ownerId: ownerId
        }
      }).then((data) => data == roles.length).catch((err) => res.database(err));
    }
  }
});

const Owner = global._gluon_auth_model;

Role.belongsTo(Owner, {foreignKey: 'ownerId'});
Owner.hasMany(Role, {foreignKey: 'ownerId'});

module.exports = Role;