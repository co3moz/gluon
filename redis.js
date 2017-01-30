require('./utils/module-checker')(['redis', 'config', 'bluebird']);
var logger = require('./logger');

var redis = require('redis');
var config = require('config');
var bluebird = require('bluebird');

bluebird.promisifyAll(redis.RedisClient.prototype);

var redisConfiguration = config.get('redis');

logger.log('Connecting to redis...');

var configuration = {
  retry_strategy: function (options) {
    return 3000;
  }
};

function treeStringFunctionParser (obj) {
  Object.keys(obj).forEach(function (key) {
    if (obj[key].constructor == Object) {
      treeStringFunctionParser(obj[key]);
    } else if (obj[key].constructor == String) {
      if (obj[key].indexOf('_function') == 0) {
        obj[key] = eval("(" + obj[key].substring(1) + ")");
      }
    }
  });
}

Object.keys(redisConfiguration).forEach(function (key) {
  configuration[key] = redisConfiguration[key];
});

treeStringFunctionParser(configuration);

module.exports = redis.createClient(configuration);
