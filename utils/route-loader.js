const logger = require('../logger');

/**
 * Object to express app notation
 *
 * @param files {Object}
 * @param app {Object}
 */
module.exports = (files, app) => {
  files.forEach((file) => {
    if (file.data == null || file.data.name != 'router') return logger.error('Cannot load router {name}, make it by gluon.router', file);
    if (file.data.ignore == true) return logger.debug('Route {name} ignored', file);

    if (file.data.location) {
      logger.debug('Route {name} loaded to /{data.location}', file);
      app.use('/' + file.data.location, file.data);
    } else {
      file.name = file.name.replace(/@([^\\\/]+)/g, ":$1");
      if (file.name.endsWith('index') && !file.name.endsWith(':index')) {
        var location = file.name.split('/');
        location.pop();
        file.data.location = location.join('/');
        logger.debug('Route {name} loaded to /{data.location}', file);
        app.use('/' + location, file.data);
      } else {
        logger.debug('Route {name} loaded to /{name}', file);
        app.use('/' + file.name, file.data);
      }
    }
  });
};