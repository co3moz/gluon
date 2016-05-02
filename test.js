const gluon = require('.');
const app = gluon({
  listen: 80,
  ready: (app, logger) => {
    app.use('/', (req, res) => res.send("ok"));
  }
});