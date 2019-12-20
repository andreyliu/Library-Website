const express = require('express');
const router = express.Router();
const modifyRouter = express.Router();

// Require controller modules.
const book_controller = require('../controllers/bookController');
const author_controller = require('../controllers/authorController');
const genre_controller = require('../controllers/genreController');
const book_instance_controller = require('../controllers/bookinstanceController');

const require_login = function (req, res, next) {
    if (!req.isAuthenticated()) {
        res.redirect('/users/login');
    } else {
        next();
    }
};

const require_privilege = function(priv) {
    return function(req, res, next) {
        if (priv.indexOf(req.user.role) < 0) {
            const err = new Error();
            err.status = 403;
            return next(err);
        }
        next();
    };
};

modifyRouter.use('/book/', require_login, require_privilege("admin", "librarian"));
modifyRouter.use('/author/', require_login, require_privilege("admin", "librarian"));
modifyRouter.use('/genre/', require_login, require_privilege("admin", "librarian"));
modifyRouter.use('/bookinstance/', require_login, require_privilege("admin", "librarian"));

// GET catalog home page.
router.get('/', book_controller.index);

// GET request for one Book.
router.get('/book/:id', book_controller.book_detail);

// GET request for list of all Book items.
router.get('/books', book_controller.book_list);

// GET request for one Author.
router.get('/author/:id', author_controller.author_detail);

// GET request for list of all Authors.
router.get('/authors', author_controller.author_list);

// GET request for one Genre.
router.get('/genre/:id', genre_controller.genre_detail);

// GET request for list of all Genre.
router.get('/genres', genre_controller.genre_list);

// GET request for one BookInstance.
router.get('/bookinstance/:id', book_instance_controller.bookinstance_detail);

// GET request for list of all BookInstance.
router.get('/bookinstances', book_instance_controller.bookinstance_list);

/// BOOK ROUTES ///

// GET request for creating a Book. NOTE This must come before routes that display Book (uses id).
modifyRouter.get('/book/create', book_controller.book_create_get);

// POST request for creating Book.
modifyRouter.post('/book/create', book_controller.book_create_post);

// GET request to delete Book.
modifyRouter.get('/book/:id/delete', book_controller.book_delete_get);

// POST request to delete Book.
modifyRouter.post('/book/:id/delete', book_controller.book_delete_post);

// GET request to update Book.
modifyRouter.get('/book/:id/update', book_controller.book_update_get);

// POST request to update Book.
modifyRouter.post('/book/:id/update', book_controller.book_update_post);

/// AUTHOR ROUTES ///

// GET request for creating Author. NOTE This must come before route for id (i.e. display author).
modifyRouter.get('/author/create', author_controller.author_create_get);

// POST request for creating Author.
modifyRouter.post('/author/create', author_controller.author_create_post);

// GET request to delete Author.
modifyRouter.get('/author/:id/delete', author_controller.author_delete_get);

// POST request to delete Author.
modifyRouter.post('/author/:id/delete', author_controller.author_delete_post);

// GET request to update Author.
modifyRouter.get('/author/:id/update', author_controller.author_update_get);

// POST request to update Author.
modifyRouter.post('/author/:id/update', author_controller.author_update_post);

/// GENRE ROUTES ///

// GET request for creating a Genre. NOTE This must come before route that displays Genre (uses id).
modifyRouter.get('/genre/create', genre_controller.genre_create_get);

//POST request for creating Genre.
modifyRouter.post('/genre/create', genre_controller.genre_create_post);

// GET request to delete Genre.
modifyRouter.get('/genre/:id/delete', genre_controller.genre_delete_get);

// POST request to delete Genre.
modifyRouter.post('/genre/:id/delete', genre_controller.genre_delete_post);

// GET request to update Genre.
modifyRouter.get('/genre/:id/update', genre_controller.genre_update_get);

// POST request to update Genre.
modifyRouter.post('/genre/:id/update', genre_controller.genre_update_post);

/// BOOKINSTANCE ROUTES ///

// GET request for creating a BookInstance. NOTE This must come before route that displays BookInstance (uses id).
modifyRouter.get('/bookinstance/create', book_instance_controller.bookinstance_create_get);

// POST request for creating BookInstance.
modifyRouter.post('/bookinstance/create', book_instance_controller.bookinstance_create_post);

// GET request to delete BookInstance.
modifyRouter.get('/bookinstance/:id/delete', book_instance_controller.bookinstance_delete_get);

// POST request to delete BookInstance.
modifyRouter.post('/bookinstance/:id/delete', book_instance_controller.bookinstance_delete_post);

// GET request to update BookInstance.
modifyRouter.get('/bookinstance/:id/update', book_instance_controller.bookinstance_update_get);

// POST request to update BookInstance.
modifyRouter.post('/bookinstance/:id/update', book_instance_controller.bookinstance_update_post);


module.exports = {
    router: router,
    modify: modifyRouter,
};
