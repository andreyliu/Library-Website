const LocalStrategy = require('passport-local').Strategy;
const User = require('../models/user');
const bcrypt = require('bcryptjs');

module.exports = function (passport) {
    passport.use('local-signup', new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password',
        // passReqToCallBack: true,

    },
        function(username, password, done) {
            User.findOne({ username: username }, function (err, user) {
                if (err) return done(err);
                if (!user) {
                    return done(null, false, { message: 'Username does not exist' });
                }
                bcrypt.compare(password, user.password, function(err, isMatch) {
                    if (err) throw err;
                    if (!isMatch) {
                        return done(null, false, { message: 'Incorrect password' });
                    }
                    return done(null, user);
                });
            });
        }
    ));

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done) {
        User.findById(id, function(err, user) {
            done(err, user);
        });
    });
};
