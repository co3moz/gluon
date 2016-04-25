const md5 = require('js-md5');
const control = require("./control");

/**
 * Generic model route generator
 * @param {Router} route
 * @param {Model|*} model
 */
module.exports = (route, model) => {
  route.get('/', (req, res) => {
    res.json({
      paths: [
        'GET /all',
        'GET /count',
        'POST /all (filter)',
        'POST /count (filter)',
        'GET /:id',
        'DELETE /:id',
        'POST / (create new ' + model.name + ' model)',
        'PATCH /:id (update exiting ' + model.name + ' model)'
      ],
      attributes: Object.keys(model.attributes)
    });
  });


  route.get('/all', (req, res) => {
    const page = req.query.page || 0;

    model.findAndCountAll({offset: page * 20, limit: 20}).then(data => {
      if (data == null) return res.notFound('{name} table is empty'.format(model));

      res.header("totalRows", data.count);
      res.ok(data.rows);
    }).catch(err => res.database(err));
  });


  route.get('/count', (req, res) => {
    model.count().then(data => {
      if (data == null) return res.notFound('{name} table is empty'.format(model));

      res.ok(data);
    }).catch(err => res.database(err));
  });

  route.post('/all', (req, res) => {
    if (Object.keys(req.body).length == 0) return res.badRequest('{name} filter requires body'.format(model));

    const page = req.query.page || 0;

    model.findAndCountAll({where: req.body, offset: page * 20, limit: 20}).then(data => {
      if (data == null) return res.notFound('{name} filter returned nothing'.format(model));

      res.header("totalRows", data.count);
      res.ok(data.rows);
    }).catch(err => res.database(err));
  });


  route.post('/count', (req, res) => {
    if (Object.keys(req.body).length == 0) return res.badRequest('{name} filter requires body'.format(model));

    model.count({where: req.body}).then(data => {
      if (data == null) return res.notFound('{name} filter returned nothing'.format(model));

      res.ok(data);
    }).catch(err => res.database(err));
  });


  route.get('/:id', (req, res) => {
    model.findById(req.params.id).then(data => {
      if (data == null)  return res.notFound('{name} #{1.id} cannot be found'.format(model, req.params));

      res.ok(data);
    }).catch(err => res.database(err));
  });


  route.patch('/:id', (req, res) => {
    if (req.body.password) { // password is auto-hashing
      if (!/^[a-f0-9]{32}$/.test(req.body.password)) {
        req.body.password = md5(req.body.password);
      }
    }

    model.findById(req.body.id || req.params.id).then(data => {
      if (data == null)  return res.notFound('{name} #{1.id} cannot be found'.format(model, req.params));

      data.update(req.body).then(data => {
        res.ok(data);
      }).catch(err => res.database(err));
    }).catch(err => res.database(err));
  });


  route.post('/', control(model, false), (req, res) => {
    if (req.body.password) { // password is auto-hashing
      if (!/^[a-f0-9]{32}$/.test(req.body.password)) {
        req.body.password = md5(req.body.password);
      }
    }

    if (model.attributes.userId) {
      req.body.userId = req.session.user.id;
    }

    model.create(req.body).then(data => {
      res.ok(data);
    }).catch(err => {
      res.database(err);
    });
  });


  route.delete('/:id', (req, res) => {
    model.findById(req.body.id || req.params.id).then(data => {
      if (data == null)  return res.notFound('{name} #{1.id} cannot be found'.format(model, req.params));

      data.destroy().then(data => {
        res.ok(data);
      });
    }).catch(err => res.database(err));
  });
};