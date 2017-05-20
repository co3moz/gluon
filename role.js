require('./utils/module-checker')(['sequelize']);

var Sequelize = require('sequelize');
var db = require('./db');
var md5 = require('js-md5');
var logger = require('./logger');

var Role = db.define('role', {
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
    addRole: function(ownerId, role)  {
      return Role.findOrCreate({
        where: {
          code: role,
          ownerId: ownerId
        },

        defaults: {
          code: role,
          ownerId: ownerId
        }
      }).catch(function(err) {logger.error(err)});
    },


    /**
     * Adds a roles to owner
     * @memberOf Role
     * @param {Number} ownerId Role added to who
     * @param {Array<String>} roles Which roles
     * @returns {Promise.<Instance>}
     */
    addRoles: function(ownerId, roles)  {
      roles.map(function(role) { return Role.findOrCreate({
        where: {
          code: role,
          ownerId: ownerId
        },

        defaults: {
          code: role,
          ownerId: ownerId
        }
      }).spread(function(role, created) { return role}).catch(function(err) { res.database(err)})});

      return Promise.all(roles);
    },


    /**
     * Removes a role from owner
     * @memberOf Role
     * @param {Number} ownerId Role added to who
     * @param {String} role Which role
     * @returns {Promise.<Number>}
     */
    removeRole: function(ownerId, role)  {
      return Role.destroy({
        where: {
          code: role,
          ownerId: ownerId
        },
        limit: 1
      }).catch(function(err) { res.database(err)});
    },


    /**
     * Removes a role from owner
     * @memberOf Role
     * @param {Number} ownerId Role added to who
     * @param {Array<String>} roles Which roles
     * @returns {Promise.<Number>}
     */
    removeRoles: function(ownerId, roles)  {
      return Role.destroy({
        where: {
          code: {
            $in: roles
          },
          ownerId: ownerId
        }
      }).catch(function(err) { res.database(err)});
    },


    /**
     * Checks for role
     * @memberOf Role
     * @param ownerId Role added to who
     * @param role Which role
     * @returns {Promise.<boolean>}
     */
    hasRole: function(ownerId, role) {
      return Role.count({
        where: {
          code: role,
          ownerId: ownerId
        },
        limit: 1
      }).then(function(data) { return data == 1}).catch(function(err) { res.database(err)});
    },


    /**
     * Checks for roles
     * @memberof Role
     * @param {Number} ownerId Role added to who
     * @param {Array<String>} roles Which roles
     * @returns {Promise.<boolean>}
     */
    hasRoles: function(ownerId, roles)  {
      return Role.count({
        where: {
          code: {
            $in: roles
          },
          ownerId: ownerId
        }
      }).then(function(data)  {return data == roles.length} ).catch(function(err) { res.database(err)});
    }
  }
});

var Owner = global._gluon_auth_model;

Role.belongsTo(Owner, {foreignKey: 'ownerId'});
Owner.hasMany(Role, {foreignKey: 'ownerId'});

module.exports = Role;