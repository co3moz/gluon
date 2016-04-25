const path = require('path');
const glob = require('glob');
const firstBy = require('thenby');

/**
 * Requires dir
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

  console.log('gluon: Searching js files in {0}', dir);
  glob(dir + '/**/*.js', function (err, files) {
    const mix = files.map(file => {
      return {
        name: file.substring(dir.length + 1, file.length - 3),
        slash: (file.match(/\//g) || []).length,
        data: require(file)
      }
    }).sort(firstBy(v => v.slash, -1)
      .thenBy(v => +(v.name.indexOf('index') == -1), -1)
      .thenBy((a, b) => a.name.localeCompare(b.name))
    );

    if (callback) callback(mix);
  });
};