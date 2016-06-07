![](docs/logo.png)

Gluon
=============
We can call gluon a project boss. Simply manages routes, decides which route should go first, also manages models and database connection. With gluon, project development became so much easier.. 

installation
-----------------

add dependency `gluon` to  dependencies or type console

```bash
npm install gluon --save
```


basic usage
----------------

```javascript
const gluon = require('gluon');
const app = gluon();

app.listen(80);
```

use with external app
```javascript
const gluon = require('gluon');
const express = require('express');

const app = express();
gluon({ app });

app.listen(80);
```

using cwd + sub location. (Note if you make your project into src directory, you need this)
```javascript
const gluon = require('gluon');
const app = gluon({dir: 'src/'}); // app.js located as cwd/src/app.js

app.listen(80);
```
routing mechanism
--------------------

create a directory that called by `routes`

routes/home.js
```javascript
const gluon = require('gluon');
const router = gluon.router();

router.get('/', (req, res) => {
  res.send("ok");
});

module.exports = router;
```

app.js
```javascript
const gluon = require('gluon');
const app = gluon({dir: 'src/'}); // app.js located as cwd/src/app.js

// nothing required just works
app.listen(80);
```

try to connect `http://localhost:80/home`

sub-routing and index
------------------------


create a directory that called by `routes`

routes/home.js
```javascript
const gluon = require('gluon');
const router = gluon.router();

router.get('/', (req, res) => {
  res.send("ok");
});

module.exports = router;
```

routes/sub/index.js
```javascript
const gluon = require('gluon');
const router = gluon.router();

router.get('/', (req, res) => {
  res.send("sub");
});

module.exports = router;
```


routes/sub/home.js
```javascript
const gluon = require('gluon');
const router = gluon.router();

router.get('/', (req, res) => {
  res.send("sub-> home");
});

module.exports = router;
```

app.js
```javascript
const gluon = require('gluon');
const app = gluon({dir: 'src/'}); // app.js located as cwd/src/app.js

// nothing required just works
app.listen(80);
```

try to connect these

* `http://localhost:80/home` -> "ok"
* `http://localhost:80/sub` -> "sub"
* `http://localhost:80/sub/home` -> "sub-> home"

> **Note:** Gluon has order mechanism that always index is last in own group. 
> **Example:** 
> * Next most powered group ordered by alphabet `A/B/C` `A/B/C.js`
> * Next most powered group and index `A/B` `A/B/index.js`
> * index  `/` `index.js`

database and models
--------------------
Gluon uses sequelize to communicate with database. But first you must create `config` folder in your cwd. For example your cwd is `/root/myproject/`, and your project files in `/root/myproject/src` create config in `/root/myproject/config` and don't forget to add dir option to gluon's first parameter.

> **Note:** These modules requires `sequelize` and `config` please install before using it

you can create a json file that called by `default.json`

default.json
```json
{
  "database": {
    "dialect": "mysql",
    "host": "your host address",
    "user": "database user name",
    "database": "database name",
    "password": "database password"
  }
}
```

now create a folder in src folder that called by `models`

models/user.js
```javascript
const Sequelize = require('sequelize');
const db = require('gluon/db');

module.exports = db.define('User', {
  account: {
    type: Sequelize.STRING(32),
    allowNull: false,
    unique: true,
    validate: {
      isAlpha: true
    }
  },

  password: {
    type: Sequelize.STRING(32),
    allowNull: false,
    validate: {
      is: /^[a-f0-9]{32}$/
    }
  },

}, {
  freezeTableName: true,
  paranoid: true
});
```

everything is ready, start the project. gluon will connect db automaticly and load your models immediately. use your models in router

routes/user.js
```javascript
const gluon = require('gluon');
const router = gluon.router();
const user = require('../models/user');

router.get('/', (req, res) => {
    user.all().then((data) => res.json(data));
});

module.exports = router;
```


Other awesome features
----------------------

### Generic option (default: true)

if you set generic option, you get plenty of new response types.
```javascript
app.use((req, res) => {
    res.ok("ok :)");
});
```

* **ok** _Everything is OK_ 200 (text or json) 
* **notFound** _Can't find user or something_ 404 (info) `{error: true, info}`
* **badRequest** _You made wrong request_ 400 (requiredFields) `{error: true, requiredFields}`
* **validation** _Your request didn't passed the validation_ 400 (type, fields) `{error: true, type, fields}`
* **unauthorized** _You are trying to use service without authorization_ 401 (info) `{error: true, info}`
* **redirectRequest** _Redirects a request to another one, like use POST please_ (info) `{error: true, info}`
* **unknown** _Bad Error_ 500 (info) `{error: true, info}`
* **database** _Database error (if caused by validation then it automaticly calls)_ 500 (err) `{error: true, info: 'Database triggered an error. Please check your request. If there is no problem then contact with service provider.'}`
* **expiredToken** _Use when a token expires_ 408 (info) `{error: true, info}`

### Ready option and Before option
use when you need to wait all gluon initial job. Its very handy option

```javascript
const gluon = require('gluon');
const app = gluon({
    dir: 'src/',
    before: (app) => {
        app.use(require('compression')());
    },
    ready: (app) => {
        app.use((err, req, res, next) => {
            res.send("something wrong");
        });
    }
});

app.listen(80);
```

### Gluon request body controller

It helps you when you need control body. Lets check examples

> **Note:** Gluon request body controller requires **generic=true**

routes/user.js
```javascript
const gluon = require('gluon');
const control = require('gluon/control');
const router = gluon.router();
const user = require('../models/user');

// just give model
router.get('/', control(user), (req, res) => {
    user.all().then((data) => res.json(data));
});


// or give an array
router.get('/other', control(['account', 'password']), (req, res) => {
    
});

// if you don't want to control id
router.get('/', control(user, false), (req, res) => {
    user.all().then((data) => res.json(data));
});


module.exports = router;
```

If request cannot pass body controller, it send badRequest.

### Gluon generator

If you bored to create CRUD you can use gluon generator.

> **Note:** This generator requires `js-md5` please install before using it. With this you don't need to serialize `password` field. it does automaticly.
>
> **Warning:** Before generator you must definitely do authentication. 

supported routes
```
GET /
GET /all
GET /count
POST /all (filter)
POST /count (filter)
GET /:id
DELETE /:id
POST / (create new model)
PATCH /:id (update exiting model)
```

#### Example 

routes/user.js
```javascript
const gluon = require('gluon');
const generator = require('gluon/generator');
const router = gluon.router();
const user = require('../models/user');

generator(router, user);

module.exports = router;
```

### Gluon logger

Starting from 1.1.0 gluon no longer uses `ezlogger`, we suggest to use `gluon/logger`.

#### Options

These are default values of options, you can change them using by `logger.set( )` or you can install `config` module and create `logger` object (example 2)

```javascript
{
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
}
```

#### Create new logging type

```javascript
const logger = require('gluon/logger');
logger.set('myOwnLoggerType', '{time} {file}:{line} {type} {message}');
logger.set('type', 'myOwnLoggerType');
```

#### Example

app.js
```javascript
const gluon = require('gluon');
const logger = require('gluon/logger')
logger.set('type', 'full'); // logs everything.. default value: full
logger.set('dir', './logs/'); // cwd/logs

const app = gluon({log: true}); // log route actions too
app.listen(80);
logger.log('server started to listen at 80');
```

routes/home.js
```javascript
const gluon = require('gluon');
const logger = require('gluon/logger');
const router = gluon.router();


module.exports = router;
```

#### Example 2: with config

> **Note:** You must install config first. `npm install config --save`

app.js
```javascript
const gluon = require('gluon');
const logger = require('gluon/logger');

const app = gluon();
app.listen(80);
logger.log('server started to listen at 80');
```

routes/home.js
```javascript
const gluon = require('gluon');
const logger = require('gluon/logger');
const router = gluon.router();


module.exports = router;
```

config/default.json
```json
{
    "logger": {
        "level": "LOG",
        "type": "myOwn",
        "myOwn": "{type} {file}:{line} {message}"
    }
}
```


### Gluon defaults by config

config/default.json
```js
{
    "gluon": {
        "generic": "false", // don't use generic system
        "log": "false", // don't log requests
        "dir": "./src" // where is my app.js from cwd
    }
}
```

### Direct listen from code or config

> **Note:** if PORT is given by environment then this port is not will be evaluated

config/default.json
```javascript
{
    "gluon": {
        "listen": 80 
        // or
        "listen": {
            "ip": "1.2.3.4",
            "port": 80
        }
    }
}
```

or

```javascript
const gluon = require('gluon');
const app = gluon({
    listen: {
        ip: "127.0.0.1",
        port: 80
    }
});
```

### Create public folders

> **Note:** default public folder is `./public` (searching as `cwd/project dir/public`)

config/default.json
```javascript
{
    "gluon": {
        "publicSource": "./static"
        // or
        "publicSource": [
            "./public", // public has more priority than static one
            "./static"
        ]
    }
}
```

or

```javascript
const gluon = require('gluon');
const app = gluon({
    publicSource: './public',
});
```


### Ignore a route

You might want to ignore a route that shouldn't routed by gluon itself. Maybe you want to use this for other purposes.

routes/authentication.js
```javascript
const gluon = require('gluon');
const router = gluon.router(null, true);

router.use((req, res, next) => {
    if(authentication check..) return res.unauthorized('you must log in'); 
    next();
});

module.exports = router;
```

routes/logout.js
```javascript
const gluon = require('gluon');
const router = gluon.router();

router.use(require('./authentication'));
router.all('/', (req, res) => {
    logout..
});

module.exports = router;
```


### Authentication and role management
With gluon 1.3.0 token based authentication generator released. Generator uses sequelize to communicate database. Creates 2 tables, "Role" and "Token".
Before doing anything, make database connection correctly. Lets look properties

config/default.json
```javascript
{
    "gluon": {
        "auth": {
            "base": "token"
        }
    }
}
```

gluon/auth only works if you set base = "token"

config/default.json
```javascript
{
    "gluon": {
        "auth": {
            "base": "token",
            "model": "user", // which model is owner of token. Make sure your model is exist in your models folder.
            "disable": false, // default= false, if you just disable authentication for some purpose, set this to true
            "expire": 43200, // default=43200, how much seconds will be need for token to expire?
            "allow": [
                "/authentication/does/not/exist/in/this/path",
                "/login", // default you can't block /login
                "/register", // same here these are default.
                "/dashboard",
                "/blabla/:id", // you can do this too. but only format is ":xxxx" nothing more, simply makes ".*" regex
                "regexp:^/damn/you/know+/regexp" // you can use regexp with this "regexp:" prefix
            ],
            "routes": {
                "/admin": "admin", // simply /admin for only "admin" role owners
                "/see": "canSee",
                "/see/important": "important", // this route will require both "canSee" and "important" roles
                "/edit/:id": "canEdit"
            },
            "token": "./token", // If you don't know what are you doing, Don't change this. This setting simply changes the token model
            "role": "./role" // Same as here if you don't know bla bla.. Don't change it..
        }
    }
}
```

Thats enough for configurations. Simply routes make static blocks. If you want to dynamic blocks you must use `req.auth`

* `req.auth.login(model)`: creates token for model
* `req.auth.logout()`: removes token
* `req.auth.hasRole(role)`: checks for role
* `req.auth.addRole(role)`: adds role
* `req.auth.removeRole(role)`: removes role


routes/login.js
```javascript
const gluon = require('gluon');
const router = gluon.router();
const User = require('../models/user');

router.get('/', (req, res) => {
    // controls etc..
    // fetch model that defined in "gluon.auth.model"
    User.find({
        where: {}
    }).then((user) => {
        req.auth.login(user).then((token) => {
            res.ok(token.code);
        });
    });
});

module.exports = router;
```

routes/someServiceThatHasAuthentication.js
```javascript
// note this route isn't allowed directly. Directly allowing means closing authentication for that route.
const gluon = require('gluon');
const router = gluon.router();

router.get('/:id', (req, res) => {
    // lets say i need to check some dynamic role "canEditDoor5"
    req.auth.hasRole("canEditDoor" + req.params.id).then((has) => {
        // if user has canEditDoor5 then has will be true
    });

    // you can add these roles by using some database tools or direct `req.auth.addRole`
    req.auth.addRole("canEditDoor" + req.params.id).then((role) => {

    });

    // if you want to change some user's role then
    const Role = require('gluon/role'); // gather role model
    Role.addRole(id of user, "canEditDoor5").then((role) => {

    });

    // you ca
});

module.exports = router;
```