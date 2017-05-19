require('./utils/module-checker')(['js-md5']);

var md5 = require('js-md5');
var control = require("./control");
var db = require('./db');
var recursiveSearch = require('./utils/recursive-search');

/**
 * Generic model route generator
 * @param {Router} route
 * @param {*} model
 * @param {{model: *, name: string}[]} attributes
 */
module.exports = function (route, model, attributes) {
  route.get('/', function (req, res) {
    res.json({
      paths: [
        'GET /',
        'GET /all',
        'GET /count',
        'POST /all (core)',
        'POST /count (core)',
        'GET /:id',
        'POST /find',
        'DELETE /:id',
        'POST / (create new ' + model.name + ' model)',
        'PATCH /:id (update exiting ' + model.name + ' model)'
      ],
      attributes: Object.keys(model.attributes)
    });
  });


  route.get('/all', function (req, res) {
    var page = req.query.page || 0;
    var order = req.query.order || "";

    model.findAndCountAll({ offset: page * 20, limit: 20, order: order }).then(function (data) {
      if (data == null) return res.notFound('{name} table is empty'.format(model));

      res.header("totalRows", data.count);
      res.ok(data.rows);
    }).catch(function (err) {
      res.database(err)
    });
  });


  route.get('/count', function (req, res) {
    model.count().then(function (data) {
      if (data == null) return res.notFound('{name} table is empty'.format(model));

      res.ok(data);
    }).catch(function (err) {
      res.database(err)
    });
  });

  route.post('/all', function (req, res) {
    if (Object.keys(req.body).length == 0) return res.badRequest('{name} filter requires body'.format(model));

    recursiveSearch(req.body, db.models);

    var page = req.query.page || 0;
    var order = req.query.order || "";

    model.findAndCountAll(Object.assign(req.body, { offset: page * 20, limit: 20, order: order })).then(function (data) {
      if (data == null) return res.notFound('{name} filter returned nothing'.format(model));

      res.header("totalRows", data.count);
      res.ok(data.rows);
    }).catch(function (err) {
      res.database(err)
    });
  });


  route.post('/count', function (req, res) {
    if (Object.keys(req.body).length == 0) return res.badRequest('{name} filter requires body'.format(model));

    recursiveSearch(req.body, db.models);

    model.count(req.body).then(function (data) {
      if (data == null) return res.notFound('{name} filter returned nothing'.format(model));

      res.ok(data);
    }).catch(function (err) {
      res.database(err)
    });
  });


  route.get('/:id', function (req, res) {
    model.findById(req.params.id).then(function (data) {
      if (data == null) return res.notFound('{name} #{1.id} cannot be found'.format(model, req.params));

      res.ok(data);
    }).catch(function (err) {
      res.database(err)
    });
  });


  route.post('/find', function (req, res) {
    if (Object.keys(req.body).length == 0) return res.badRequest('{name} filter requires body'.format(model));

    recursiveSearch(req.body, db.models);

    model.find(req.body).then(function (data) {
      if (data == null) return res.notFound('{name} #{1.id} cannot be found'.format(model, req.params));

      res.ok(data);
    }).catch(function (err) {
      res.database(err)
    });
  });

  route.patch('/:id', function (req, res) {
    if (req.body.password) { // password is auto-hashing
      if (!/^[a-f0-9]{32}$/.test(req.body.password)) {
        req.body.password = md5(req.body.password);
      }
    }

    model.findById(req.body.id || req.params.id).then(function (data) {
      if (data == null) return res.notFound('{name} #{1.id} cannot be found'.format(model, req.params));

      data.update(req.body).then(function (data) {
        res.ok(data);
      }).catch(function (err) {
        res.database(err)
      });
    }).catch(function (err) {
      res.database(err)
    });
  });


  route.post('/', control(model, false), function (req, res) {
    if (req.body.password) { // password is auto-hashing
      if (!/^[a-f0-9]{32}$/.test(req.body.password)) {
        req.body.password = md5(req.body.password);
      }
    }

    if (model.attributes.userId && req.body.userId == undefined) {
      req.body.userId = req.user.id;
    }

    model.create(req.body).then(function (data) {
      res.ok(data);
    }).catch(function (err) {
      res.database(err)
    });
  });


  route.delete('/:id', function (req, res) {
    model.findById(req.body.id || req.params.id).then(function (data) {
      if (data == null) return res.notFound('{name} #{1.id} cannot be found'.format(model, req.params));

      data.destroy().then(function (data) {
        res.ok(data);
      });
    }).catch(function (err) {
      res.database(err)
    });
  });
};