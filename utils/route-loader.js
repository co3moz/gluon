const logger = require('../logger');

/**
 * Object to express app notation
 *
 * @param files {Object}
 * @param app {Object}
 */
module.exports = (files, app) => {
  files.forEach((file) => {
    if (file.data == null || file.data.name != 'router') return logger.error('cannot load router {name}, make it by gluon.router', file);
    if (file.data.ignore == true) return logger.debug('route {name} ignored', file);

    if (file.data.location) {
      logger.debug('route {name} loaded to /{data.location}', file);
      app.use('/' + file.data.location, file.data);
    } else {
      if (file.name.indexOf('index') != -1) {
        var location = file.name.split('/');
        location.pop();
        file.data.location = location.join('/');
        logger.log('route {name} loaded to /{data.location}', file);
        app.use('/' + location, file.data);
      } else {
        logger.log('route {name} loaded to /{name}', file);
        app.use('/' + file.name, file.data);
      }
    }
  });
};