/**
 * Request body controller
 * @param {Object|Array<String>} need
 * @param {Boolean} [id] isIdRequired (default = true)
 * @example
 * var m = require('.');
 * m(['name', 'surname'])
 *
 * @example
 * var m = require('gluon/control');
 * var address = require('../models/address');
 * m(address)
 */
module.exports = function (need, id) {
  (id != undefined || (id = true));

  if (need.constructor != Array) {
    need = Object.keys(need.attributes).filter(
      function (x) {
        return (id || x != 'id') && (x != 'createdAt') && (x != 'updatedAt') && (x != 'userId') && (need.attributes[x].references != undefined || need.attributes[x].allowNull == false);
      }
    )
  }

  return function (req, res, next) {
    var result = need.every(function (o) {
      return req.body.hasOwnProperty(o);
    });

    if (result == false) {
      res.badRequest(need);
    } else {
      next();
    }
  }
};