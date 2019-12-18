const Book = require('../models/book');
const Author = require('../models/author');
const Genre = require('../models/genre');
const BookInstance = require('../models/bookinstance');

const async = require('async');
const { body, validationResult, sanitizeBody } = require('express-validator');
const logtag = 'local-library:book';
const booklog = require('debug')(logtag);
const logging = require('../utils/logger');

exports.index = function(req, res) {
    async.parallel({
        book_count: function(callback) {
            Book.countDocuments({}, callback);
        },
        book_instance_count: function(callback) {
            BookInstance.countDocuments({}, callback);
        },
        book_instance_available_count: function(callback) {
            BookInstance.countDocuments({stats: 'Available'}, callback);
        },
        author_count: function(callback) {
          Author.countDocuments({}, callback);
        },
        genre_count: function(callback) {
            Genre.countDocuments({}, callback);
        }
    }, function(err, results) {
        res.render('index', {title: 'Local Library Home', error: err, data: results});
    });
};

// Display list of all books.
exports.book_list = function(req, res, next) {
    Book.find({}, 'title author')
        .populate('author')
        .exec(function(err, list_books) {
           if (err) { return next(err); }
           res.render('book_list', {title: 'Book List', book_list: list_books});
        });
};

// Display detail page for a specific book.
exports.book_detail = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback);
        },
        book_instances: function(callback) {
            BookInstance.find({ 'book': req.params.id})
                .exec(callback);
        },
    }, function(err, results) {
        if (err) return next(err);
        if (results.book == null) {
            let e = new Error('Book not found');
            e.status = 404;
            return next(e);
        }
        res.render('book_detail', {
            title: results.book.title,
            book: results.book,
            book_instances: results.book_instances
        });

    });
};

// Display book create form on GET.
exports.book_create_get = function(req, res, next) {
    async.parallel({
        authors: (callback) => {
            Author.find(callback);
        },
        genres: (callback) => {
            Genre.find(callback);
        },
    }, (err, results) => {
            if (err) return next(err);
            res.render('book_form', { title: 'Create Book',
                authors: results.authors,
                genres: results.genres
            });
    });
};

// Handle book create on POST.
exports.book_create_post = [
    (req, res, next) => {
        if (!(req.body.genre instanceof Array)) {
            if (typeof req.body.genre === 'undefined') {
                req.body.genre = [];
            } else {
                req.body.genre = new Array(req.body.genre);
            }
        }
        next();
    },

    body('title', 'Title must not be empty.').trim().isLength({ min: 1 }),
    body('author', 'Author must not be empty. ').trim().isLength({ min: 1 }),
    body('summary', 'Summary must not be empty. ').trim().isLength({ min: 1}),
    body('isbn', 'ISBN must not be empty').trim().isLength({ min: 1 }),

    sanitizeBody('*').escape(),

    (req, res, next) => {
        const errors = validationResult(req);

        let book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: req.body.genre
        });

        if (!errors.isEmpty()) {
            async.parallel({
                authors: (callback) => {
                    Author.find(callback);
                },
                genres: (callback) => {
                    Genre.find(callback);
                },
            }, (err, results) => {
                if (err) { return next(err); }
                for (let i = 0; i < results.genres.length; i++) {
                    if (book.genre.indexOf(results.genres[i]._id) > -1) {
                        results.genres[i].checked = 'true';
                    }
                }
                res.render('book_form', {
                    title: 'Create Book',
                    authors: results.authors,
                    genres: results.genres,
                    book: book,
                    errors: errors.array() });
            });
        } else {
            book.save((err) => {
                if (err) return next(err);
                logHelper(`create: ${logString(book)}`);
                res.redirect(book.url);
            });
        }
    }
];

// Display book delete form on GET.
exports.book_delete_get = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback)
        },
        book_instances: function(callback) {
            BookInstance.find({'book': req.params.id}).exec(callback)
        }
    }, function(error, results) {
        if (error) return next(error);
        if (results.book === null) {
            res.redirect('/catalog/books');
        } else {
            res.render('book_delete', {
                title: 'Delete Book',
                book: results.book,
                book_instances: results.book_instances
            });
        }
    });

};

// Handle book delete on POST.
exports.book_delete_post = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.body.bookid)
                .populate('author')
                .populate('genre')
                .exec(callback)
        },
        book_instances: function(callback) {
            BookInstance.find({'book': req.body.bookid})
                .exec(callback)
        }
    }, function(err, results) {
        if (err) return next(err);
        if (results.book === null) {
            res.redirect('/catalog/books');
        } else if (results.book_instances.length > 0) {
            res.render('book_delete', {
                title: 'Delete book',
                book: results.book,
                book_instances: results.book_instances
            });
        } else {
            Book.findByIdAndRemove(req.body.bookid,
                function(error) {
                   if (error) return next(error);
                   logHelper('delete: ' + logString(results.book));
                   res.redirect('/catalog/books');
                });
        }
    });
};

// Display book update form on GET.
exports.book_update_get = function(req, res, next) {
    async.parallel({
        book: function(callback) {
            Book.findById(req.params.id)
                .populate('author')
                .populate('genre')
                .exec(callback)
        },
        authors: callback => Author.find(callback),
        genres: callback => Genre.find(callback)
    }, (err, results) => {
        if (err) return next(err);
        if (results.book === null) {
            let error = new Error('Book not found');
            error.status = 404;
            return next(error);
        }
        // TODO: change quadratic complexity
        for (let i = 0; i < results.genres.length; i++) {
            for (let j = 0; j < results.book.genre.length; j++) {
                if (results.genres[i]._id.toString() === results.book.genre[j]._id.toString()) {
                    results.genres[i].checked = 'true';
                }
            }
        }
        logHelper(`update attempt: ${logString(results.book)}`);
        res.render('book_form', {
            title: 'Update Book',
            authors: results.authors,
            genres: results.genres,
            book: results.book
        });
    });
};

// Handle book update on POST.
exports.book_update_post = [

    genreToArray,

    body('title', 'Title must not be empty').trim().isLength({min: 1}),
    body('author', 'Author must not be empty').trim().isLength({min: 1}),
    body('summary', 'Summary must not be empty').trim().isLength({min: 1}),
    body('isbn', 'ISBN must not be empty').trim().isLength({min: 1}),

    sanitizeBody('title').escape(),
    sanitizeBody('author').escape(),
    sanitizeBody('summary').escape(),
    sanitizeBody('isbn').escape(),
    sanitizeBody('genre.*').escape(),

    function(req, res, next) {
        const errors = validationResult(req);

        let book = new Book({
            title: req.body.title,
            author: req.body.author,
            summary: req.body.summary,
            isbn: req.body.isbn,
            genre: (typeof req.body.genre === 'undefined') ? [] : req.body.genre,
            _id:req.params.id
        });

        if (!errors.isEmpty()) {
            formOnError(res, next, book);
        } else {
            Book.findByIdAndUpdate(req.params.id, book, {useFindAndModify: false}, function(err, thebook) {
                if (err) return next(err);
                logHelper(`update complete: ${logString(book)}`);
                res.redirect(thebook.url);
            });
        }
    }
];

function genreToArray(req, res, next) {
    if (!(req.body.genre instanceof Array)) {
        if (typeof req.body.genre === 'undefined') {
            req.body.genre = [];
        } else {
            req.body.genre = new Array(req.body.genre);
        }
    }
    next();
}


function formOnError(res, next, book) {
    async.parallel({
            authors: cb => Authors.find(cb),
            genres: cb => Genre.find(cb),
        },
        (err, results) => {
            if (err) return next(err);
            for (let i = 0; i < results.genres.length; i++) {
                if (book.genre.indexOf(results.genre[i]._id > -1)) {
                    results.genres[i].checked = 'true';
                }
            }
            res.render('book_form', {
                title: 'Update Book',
                authors: results.authors,
                genres: results.genres,
                book: book,
                errors: err.array(),
            });
        }
    );
}

function logString(book) {
    return JSON.stringify(book, function (key, value) {
        if (key === 'summary') return undefined;
        return value;
    });
}

function logHelper(msg) {
    logging(booklog, logtag, msg);
}