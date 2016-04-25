![](docs/logo.png)

Gluon
=============
We can call gluon a project boss. Simply manages routes, decides which route should go first, also manages models and database connection. With gluon project development will become so much easier.. 

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

everything is ready, start the project. gluon will connect db automaticly and load your models immediately. 

use your models in router
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

### Completed option
use when you need to wait all gluon initial job. Its very important option
```javascript
const gluon = require('gluon');
const app = gluon({
    dir: 'src/',
    completed: (app) => {
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

> **Note:** This generator requires `js-md5` please install before using it
> **Warning:** Before generator you must definitely do authentication.

routes/user.js
```javascript
const gluon = require('gluon');
const generator = require('gluon/generator');
const router = gluon.router();
const user = require('../models/user');

generator(router, user);

module.exports = router;
```

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