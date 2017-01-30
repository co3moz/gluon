/**
 * Module existence checker
 * @param {Array<String>} modules Which modules will be checked
 */
module.exports = function(modules) {
  var i = 0;
  try {
    for (; i < modules.length; i++) {
      require.resolve(modules[i]);
    }
  } catch (e) {
    console.error("Please install " + modules[i] + " to use these features");
    console.error(" $ npm install " + modules[i] + " --save");
    process.exit(1);
  }
};