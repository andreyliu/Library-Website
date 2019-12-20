require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const logger = require('morgan');

const indexRouter = require('./routes/index');
const usersRouter = require('./routes/users');
const catalogRouter = require('./routes/catalog');

const compression = require('compression');
const helmet = require('helmet');
const passport = require('passport');
require('./utils/passport')(passport);
// TODO
// const flash = require('connect-flash');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
// // TODO
// const passMessages = require('express-messages');

const paginate = require('express-paginate');


const app = express();
app.use(helmet());

const mongoose = require('mongoose');
const mongoDB = process.env.MONGODB_URI || '';
mongoose.connect(mongoDB, { useNewUrlParser: true, useUnifiedTopology: true });
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'MongoDB connection error:'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(compression()); // Compress all routes

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'logs')));
// app.use(express.static(path.join(__dirname, 'node_modules')));

// messages middleware
app.use(session({
  secret: 'diamond crust',
  resave: true,
  saveUninitialized: false,
  store: new MongoStore({ mongooseConnection: db }),
}));

// passport config
app.use(passport.initialize({}));
app.use(passport.session({}));

app.get('*', (req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// paginate
app.use(paginate.middleware(10, 50));

app.use('/', indexRouter);
app.use('/users', usersRouter);

app.use('/catalog', catalogRouter.modify, catalogRouter.router);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
