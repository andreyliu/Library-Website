const Genre = require('../models/genre');
const Book = require('../models/book');
const async = require('async');
const paginate = require('express-paginate');

const {body, sanitizeBody, validationResult} = require('express-validator');

const logtag = 'local-library:genre';
const genrelog = require('debug')(logtag);
const logging = require('../utils/logger');

// Display list of all Genre.
exports.genre_list = function(req, res, next) {
    async.parallel({
        list_genres: cb => Genre.find()
            .limit(req.query.limit)
            .skip(req.skip)
            .sort({name: 1})
            .exec(cb),
        count: cb => Genre.count(cb),
    },
        function(err, results) {
            if (err) return next(err);
            let itemCount = results.count;
            let pageCount = Math.ceil(itemCount / req.query.limit);
            return res.render('genre_list', {
                title: 'Genre List',
                genre_list: results.list_genres,
                pageCount: pageCount,
                itemCount: itemCount,
                pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
            })
        }
    );
};

// Display detail page for a specific Genre.
exports.genre_detail = function(req, res, next) {
    async.parallel({
        genre: (callback) => { Genre.findById(req.params.id).exec(callback); },
        genre_books: (callback) => { Book.find({ 'genre': req.params.id }).exec(callback);},
    }, (err, results) => {
        if (err) return next(err);
        if (results.genre == null) {
            let e = new Error('Genre not found');
            e.status = 404;
            return next(e);
        }
        res.render('genre_detail', {
            title: 'Genre Detail',
            genre: results.genre,
            genre_books: results.genre_books
        })
    });
};

// Display Genre create form on GET.
exports.genre_create_get = function(req, res) {
    res.render('genre_form', { title: 'Create Genre'});
};

// Handle Genre create on POST.
exports.genre_create_post = [
    body('name', 'Genre name required').trim().isLength({ min: 1 }),

    sanitizeBody('name').escape(),

    (req, res, next) => {
        const errors = validationResult(req);

        let genre = new Genre(
            { name: req.body.name }
        );

        if (!errors.isEmpty()) {
            res.render('genre_form', { title: 'Create Genre', genre: genre, errors: errors.array()});
        } else {
            Genre.findOne({ 'name': req.body.name })
                .exec( function(err, found_genre) {
                   if (err) { return next(err); }
                   if (found_genre) {
                       res.redirect(found_genre.url);
                   } else {
                       genre.save(function (err) {
                           if (err) { return next(err); }
                           logHelper(`create: ${logString(genre)}`)
                           res.redirect(genre.url);
                       });
                   }
                });
        }
    }
];

// Display Genre delete form on GET.
exports.genre_delete_get = function(req, res, next) {
    async.parallel({
        genre: function(callback) {
          Genre.findById(req.params.id).exec(callback)
        },
        genre_books: function(callback) {
            Book.find({genre: req.params.id}).exec(callback)
        }
    }, function(err, results) {
        if (err) return next(err);
        if (results.genre === null) {
            res.redirect('/catalog/genres');
        } else {
            res.render('genre_delete', {
                title: 'Delete Genre',
                genre: results.genre,
                genre_books: results.genre_books
            });
        }
    });
};

// Handle Genre delete on POST.
exports.genre_delete_post = function(req, res, next) {
    async.parallel({
        genre: function(callback) {
            Genre.findById(req.body.genreid).exec(callback);
        },
        genre_books: function(callback) {
            Book.find({'genre': req.body.genreid}).exec(callback);
        }},
        function(err, results) {
            if (err) {
                return next(err);
            }
            if (results.genre === null) {
                res.redirect('/catalog/genres');
            } else if (results.genre_books.length > 0) {
                res.render('genre_delete', {
                    title: 'Delete genre',
                    genre: results.genre,
                    genre_books: results.genre_books
                });
            } else {
                Genre.findByIdAndRemove(req.body.genreid,
                    function(error) {
                        if (error) return next(error);
                        logHelper(`delete: ${logString(results.genre)}`);
                        res.redirect('/catalog/genres');
                    }
                )
            }
        }
    )
};

// Display Genre update form on GET.
exports.genre_update_get = function(req, res, next) {
    Genre.findById(req.params.id).exec(
        function (err, genre) {
            if (err) return next(err);
            logHelper(`update attempt: ${logString(genre)}`);
            res.render('genre_form', {
                title: 'Update Genre',
                genre: genre,
            })
        }
    )
};

// Handle Genre update on POST.
exports.genre_update_post = [
    body('name').trim().isLength({min: 1, max: 100})
      .withMessage('Genre name must be between 1 and 100 in length'),
    sanitizeBody('name').escape(),
    function(req, res, next) {
        const errors = validationResult(req);
        const genre = new Genre({
            name: req.body.name,
            _id: req.params.id,
        });
        if (!errors.isEmpty()) {
            res.render('genre_form', {
                title: 'Update Genre',
                genre: genre,
                errors: errors,
            });
        } else {
            Genre.findByIdAndUpdate(req.params.id, genre, {useFindAndModify: false}, function(err, thegenre) {
                if (err) return next(err);
                logHelper(`update complete: ${logString(genre)}`);
                res.redirect(thegenre.url);
            });
        }
    }
];

function logString(genre) {
    return JSON.stringify(genre);
}

function logHelper(msg) {
    logging(genrelog, logtag, msg);
}