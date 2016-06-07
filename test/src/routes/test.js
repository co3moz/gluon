const gluon = require('../../../gluon');
const logger = require('../../../logger');
const router = gluon.router();

router.get('/', (req, res) => {
  req.auth.addRole("test").then((has) => {
    logger.log('has role test? {0}', has);
  });
  
  res.send(req.user);
});

module.exports = router;