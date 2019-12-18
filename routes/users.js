const express = require('express');
const router = express.Router();

const user_controller = require('../controllers/userController');

/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('respond with a resource');
});

router.get('/cool', function(req, res, next) {
  res.send('You\'re so cool');
});

router.get('/register', user_controller.user_register_get);
router.post('/register', user_controller.user_register_post);
router.get('/login', user_controller.user_login_get);
router.post('/login', user_controller.user_login_post);
module.exports = router;
