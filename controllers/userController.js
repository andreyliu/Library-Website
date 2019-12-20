const {body, sanitizeBody, validationResult} = require('express-validator');
const User = require('../models/user');
const BookInstance = require('../models/bookinstance');
const bcrypt = require('bcryptjs');

const passport = require('passport');
const querystring = require('querystring');

const usernameP = new RegExp(/^[a-zA-Z0-9_.]+$/);
const nameP = new RegExp(/^[a-zA-Z\-]+$/);

exports.user_register_get = function(req, res) {
    res.render('user/user_form', {
        title: 'Register',
    });
};

exports.user_register_post = [
    body('first_name').trim()
        .isLength({min: 1, max: 100})
        .withMessage('First name must be between 1 and 100 characters long')
        .matches(nameP)
        .withMessage('First name must only contain letters and hyphen'),
    body('last_name').trim()
        .isLength({min: 1, max: 100})
        .withMessage('Last name must be between 1 and 100 characters long')
        .matches(nameP)
        .withMessage('Last name must only contain letters and -'),
    body('username').trim()
        .isLength({min: 4, max: 40})
        .withMessage('Username must be between 4 and 40 characters long')
        .isAscii()
        .withMessage('Username contains Illegal Characters')
        .custom(function(value) {
            if (!usernameP.test(value)) {
                throw new Error('Username contains Illegal Characters');
            }
            return true;
        }),
    body('email', 'Invalid email').isEmail(),
    body('password2')
        .custom(function (value, { req }) {
            if (value !== req.body.password) {
                throw new Error('Passwords do not match');
            }
            return true;
        }),
    sanitizeBody('first_name').escape(),
    sanitizeBody('last_name').escape(),
    sanitizeBody('user_name').escape(),
    sanitizeBody('email').normalizeEmail(),
    function(req, res, next) {
        const errors = validationResult(req);
        let user = new User({
            username: req.body.username,
            first_name: req.body.first_name,
            last_name: req.body.last_name,
            email: req.body.email,
            password: '',
        });
        if (!errors.isEmpty()) {
            res.render('user/user_form', {
                title: 'Register',
                user: user,
                errors: errors.array(),
            })
        } else {
            User.find({$or: [{username: req.body.username}, {email: req.body.email}]})
                .exec(function (err, user_found) {
                if (err) return next(err);
                if (user_found.length) {
                    let context = { title: 'Register', user: user};
                    if (user_found[0].username === req.body.username) {
                        context.dup = 'username';
                    } else {
                        context.dup = 'email';
                    }

                    res.render('user/user_form', context);
                } else {
                    processPwAndSave(req.body.password, user, next, res);

                }
            });

        }

    }
];

exports.user_login_get = function(req, res) {
    res.render('user/user_login', {
        title: 'Login',
        info: req.query.info,
    });
};

exports.user_login_post = function(req, res, next) {
    passport.authenticate('local-signup', {},function(err, user, info) {
        if (!user) {
            res.render('user/user_login', { title: 'Login', err_message: info.message });
            return;
        }
        req.login(user, function(err) {
            if(err) return next(err);
            res.redirect('/');
        })
    })(req, res, next);
};

function processPwAndSave(passwd, user, next, res) {

    function saveUserWithHash(hash) {
        user.password = hash;
        user.save(function (err) {
            if (err) return next(err);
            res.redirect('/users/login');
        });
    }

    bcrypt.genSalt(10, function (err, salt) {
        if (err) console.log(err);
        bcrypt.hash(passwd, salt, function (err, hash) {
            if (err) console.log(err);
            saveUserWithHash(hash);
        });

    });
}

exports.user_logout_get = function(req, res) {
    req.logout();
    const query = querystring.stringify({
       'info': 'You have successfully logged out'
    });
    res.redirect('/users/login?' + query);
};

exports.my_borrowed = function(req, res, next) {
    if (!req.user) {
        res.redirect('/users/login');
    }
    BookInstance.find({borrower: req.user._id})
        .populate('book')
        .sort({due_back: 1})
        .then(function(bookinst_list) {
            res.render('bookinstance_list', {
                title: 'My borrowed',
                bookinstance_list: bookinst_list,
                user_view: true,
            });
        })
        .catch(err => next(err));
};