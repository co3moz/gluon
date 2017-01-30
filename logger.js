var fs = require('fs');
var path = require('path');
var os = require('os');
var ezFormat = require('ezformat');

var defaults = {
  dir: './logs',
  level: 'DEBUG',
  fileFormat: 'log.{date}.txt',
  dateFormat: '{year}/{month p 2}/{day p 2}',
  fileDateFormat: '{year}.{month p 2}.{day p 2}',
  timeFormat: '{hour p 2}:{minute p 2}:{second p 2}',
  type: 'full',
  full: '{date} {time} {type} {file}:{line} {message}',
  exceptDate: '{time} {type} {file}:{line} {message}',
  simple: '{type} {message}',
  withFile: '{type} {file}:{info} {message}',
  request: '[{req.method}] {coloredStatus} {time} {req.headers.host}{req.url} from {req.ip}'
};

var color = {
  'bold': {start: '\x1B[1m', end: '\x1B[22m'},
  'black': {start: '\x1B[30m', end: '\x1B[39m'},
  'red': {start: '\x1B[31m', end: '\x1B[39m'},
  'green': {start: '\x1B[32m', end: '\x1B[39m'},
  'yellow': {start: '\x1B[33m', end: '\x1B[39m'},
  'blue': {start: '\x1B[34m', end: '\x1B[39m'},
  'magenta': {start: '\x1B[35m', end: '\x1B[39m'},
  'cyan': {start: '\x1B[36m', end: '\x1B[39m'},
  'white': {start: '\x1B[37m', end: '\x1B[39m'}
};
/**
 * @memberof String.prototype
 * @property {String} black
 * @property {String} red
 * @property {String} green
 * @property {String} yellow
 * @property {String} blue
 * @property {String} magenta
 * @property {String} cyan
 * @property {String} white
 */
Object.keys(color).forEach(function (c) {
  if (!String.prototype[c]) {
    Object.defineProperty(String.prototype, c, {
      get: function () {
        return color[c].start + this + color[c].end
      }
    });
  }
});

try {
  var config = require('config');
  var loggerDefaults = config.get('logger');
  Object.assign(defaults, loggerDefaults);
} catch (e) {
  // if there is no config installation than ignore
}

/**
 * Gluon logger manager
 * @class
 */
function Logger() {
  /**
   * Write a simple log
   * @param {String|Object} message Message of body
   * @param {...*} [params] format the message body
   */
  this.log = function (message, params) {
    if (this.level() > 1) return;
    if (arguments.length > 1) message = String.prototype.format.apply(message, Array.prototype.slice.call(arguments, 1));
    message = this._prepareMessage('LOG', message);
    console.log(message);
    this._logToFile(message);
  };

  /**
   * Write a warning log
   * @param {String|Object} message Message of body
   * @param {...*} [params] format the message body
   */
  this.warn = function (message, params) {
    if (this.level() > 2) return;
    if (arguments.length > 1) message = String.prototype.format.apply(message, Array.prototype.slice.call(arguments, 1));
    message = this._prepareMessage('WARNING', message);
    console.warn(message);
    this._logToFile(message);
  };

  /**
   * Write a debug log
   * @param {String|Object} message Message of body
   * @param {...*} [params] format the message body
   */
  this.debug = function (message, params) {
    if (this.level() > 0) return;
    if (arguments.length > 1) message = String.prototype.format.apply(message, Array.prototype.slice.call(arguments, 1));
    message = this._prepareMessage('DEBUG', message);
    console.log(message);
    this._logToFile(message);
  };


  /**
   * Write an error message
   * @param {String|Object} message Message of body
   * @param {...*} [params] format the message body
   */
  this.error = function (message, params) {
    if (this.level() > 3) return;
    if (arguments.length > 1) message = String.prototype.format.apply(message, Array.prototype.slice.call(arguments, 1));
    message = this._prepareMessage('ERROR', message);
    console.error(message);
    this._logToFile(message);
  };


  /**
   * Prepares message
   * @param type What kind of message will be prepared
   * @param message What is the message
   * @returns {String}
   * @private
   */
  this._prepareMessage = function (type, message) {
    var simple = {
      type: this.colorType(type),
      message: typeof message == 'string' ? message : os.EOL + "{0 j 4}".format(message)
    };
    switch (this.get('type')) {
      case 'simple':
        return this.get('simple').format(simple);
      case 'withFile':
        return this.get('withFile').format(Object.assign(simple, this._getActiveFunction()));
      default:
        var now = new Date();
        var date = this.get('dateFormat').format({
          year: now.getFullYear(),
          month: now.getMonth() + 1,
          day: now.getDate()
        });
        var time = this.get('timeFormat').format({
          hour: now.getHours(),
          minute: now.getMinutes(),
          second: now.getSeconds()
        });
        return (this.get(this.get('type')) || "").format(Object.assign(simple, {
          date: date,
          time: time
        }, this._getActiveFunction()));
    }
  };

  /**
   * Logs to file
   * @param message
   * @private
   */
  this._logToFile = function (message) {
    var now = new Date();
    var date = this.get('fileDateFormat').format({
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      day: now.getDate()
    });
    var location = path.resolve(process.cwd(), this.get('dir'), this.get('fileFormat').format({date: date}));
    fs.appendFile(location, (message + os.EOL).replace(/\x1B\[\d+m/g, ''));
  };


  /**
   * Detect recording level
   * @returns {number}
   */
  this.level = function () {
    switch (this.get('level')) {
      case 'DEBUG':
        return 0;
      case 'LOG':
        return 1;
      case 'WARN':
        return 2;
      case 'ERROR':
        return 3;
      default:
        return 0;
    }
  };

  /**
   * Colored type
   * @returns {String}
   */
  this.colorType = function (type) {
    switch (type) {
      case 'DEBUG':
        return type.yellow;
      case 'LOG':
        return type.magenta;
      case 'WARN':
        return type.cyan;
      case 'ERROR':
        return type.red;
      default:
        return type;
    }
  };


  /**
   * Changes a default setting
   * @param {String} setting
   * @param {*} value
   * @return {String}
   */
  this.set = function (setting, value) {
    return defaults[setting] = value
  };


  /**
   * Gets a default setting
   * @param {String} setting
   * @return {String}
   */
  this.get = function (setting) {
    return defaults[setting]
  };


  /**
   * Finds file name that executing
   * @param {Number} [at] Stack position
   * @returns {{file: String, line: String}}
   * @private
   */
  this._getActiveFunction = function (at) {
    var temp = {};
    var stackTraceLimit = Error.stackTraceLimit;
    var prepareStackTrace = Error.prepareStackTrace;
    Error.stackTraceLimit = Infinity;

    Error.prepareStackTrace = function (dummyObject, v8StackTrace) {
      return v8StackTrace
    };
    Error.captureStackTrace(temp);

    var stack = temp.stack[at || 3];
    Error.prepareStackTrace = prepareStackTrace;
    Error.stackTraceLimit = stackTraceLimit;

    var file = stack["getEvalOrigin"]().split(/\\|\//).pop().blue;
    var line = stack["getLineNumber"]().toString().magenta;
    return {file: file, line: line};
  };

  /**
   * Check's logging directory's existence, if not then creates
   */
  this.checkDirectory = function () {
    var location = (path.resolve(process.cwd(), this.get('dir')));
    var dirs = location.split(path.sep), root = "";

    while (dirs.length > 0) {
      var dir = dirs.shift();
      if (dir === "") root = path.sep;
      if (!fs.existsSync(root + dir)) fs.mkdirSync(root + dir);
      root += dir + path.sep;
    }
  };

  this.checkDirectory();
}

var logger = new Logger;


process.on('uncaughtException', function (err) {
  logger.error('{stack}', err);
  process.exit(1);
});

/**
 * Gluon's default logging mechanism
 * @type {Logger}
 */
exports = module.exports = logger;

