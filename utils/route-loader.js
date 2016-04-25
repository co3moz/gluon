/**
 * Object to express app notation
 *
 * @param files {Object}
 * @param app {Object}
 */
module.exports = (files, app) => {
  files.forEach((file) => {
    if (file.data == null || file.data.name != 'router') {
      return console.error('gluon: cannot load router {name}, make it by gluon.router', file);
    }

    if (file.data.location) {
      console.log('gluon: route {name} loaded to /{data.location}', file);
      app.use('/' + file.data.location, file.data);
    } else {
      if (file.name.indexOf('index') != -1) {
        var location = file.name.split('/');
        location.pop();
        file.data.location = location.join('/');
        console.log('gluon: route {name} loaded to /{data.location}', file);
        app.use('/' + location, file.data);
      } else {
        console.log('gluon: route {name} loaded to /{name}', file);
        app.use('/' + file.name, file.data);
      }
    }
  });
};