const gluon = require('.');
const app = gluon({
  listen: 80,
  before: (app, logger) => {
    logger.log('before')
  },
  ready: (app, logger) => {
    logger.log('ready');
  }
});