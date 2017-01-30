var path = require('path');
var glob = require('glob');
var firstBy = require('thenby');
var logger = require('../logger');

/**
 * Module existance checker
 * @param {...*} args Location of directory (can use multiple location at ones like, './a', './sub' => './a/sub'
 * @param {Function} [callback] Callback function that called when all required files loaded.
 */
module.exports = function () {
  var args = Array.prototype.slice.call(arguments);
  var callback = args.pop();
  if (callback == null || callback.constructor != Function) {
    if (callback != null) {
      args.push(callback);
      callback = null;
    }
  }
  args.unshift(process.cwd());
  var dir = path.resolve.apply(path, args);

  logger.debug('Looking js files in {0} directory', dir);
  glob(dir + '/**/*.js', function (err, files) {
    var mix = files.map(function(file) {
      return {
        name: file.substring(dir.length + 1, file.length - 3),
        slash: (file.match(/\//g) || []).length,
        data: require(file)
      }
    }).sort(firstBy(function(v) { return v.slash } , -1)
      .thenBy(function(v) { return +(v.name.indexOf('index') == -1)}, -1)
      .thenBy(function(a, b) { return  a.name.localeCompare(b.name)})
    );

    if (callback) callback(mix);
  });
};