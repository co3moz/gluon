const gluon = require('../..');
const app = gluon({
  before: (app, logger) => {
    logger.log('before')
  },
  ready: (app, logger) => {
    logger.log('ready');
    const db = require('../../db');
    db.sync({force: true});
  }
});