const Author = require('../models/author');
const Book = require('../models/book');
const async = require('async');

const { body, validationResult, sanitizeBody } = require('express-validator');

exports.author_list = function(req, res, next) {
    Author.find()
        .sort({family_name: 1, first_name: 1})
        .exec(function (err, list_authors) {
            if (err) { return next(err); }
            res.render('author_list', {title: 'Author List', author_list: list_authors});
        });
};

exports.author_detail = function(req, res, next) {
    async.parallel({
        author: callback => Author.findById(req.params.id).exec(callback),
        author_books: callback => Book.find({ author: req.params.id }).exec(callback)
    }, (err, results) => {
        if (err) return next(err);
        if (results.author == null) {
            err = new Error('Author not found');
            err.status = 404;
            return next(err)
        }

        res.render('author_detail', {
            title: 'Author Detail',
            author: results.author,
            author_books: results.author_books
        })
    });
};

exports.author_create_get = function(req, res) {
    res.render('author_form', {title: 'Create Author'});
};

exports.author_create_post = [
    body('first_name').trim()
        // .isLength({ min: 1})
        // .withMessage('First name must be specified.')
        .isAlphanumeric()
        .withMessage('First name has non-alphanumeric characters.'),
    body('family_name').trim()
        .isLength({ min: 1 })
        .withMessage('Last name must be specified.')
        .isAlphanumeric()
        .withMessage('Last name has non-alphanumeric characters.'),

    body('date_of_birth', 'Invalid date of birth')
        .optional({ checkFalsy: true })
        .isISO8601(),
    body('date_of_death', 'Invalid date of death')
        .optional({ checkFalsy: true})
        .isISO8601(),
    sanitizeBody('first_name').escape(),
    sanitizeBody('family_name').escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            res.render('author_form', { title: 'Create Author',
                author: req.body,
                error: errors.array()});
        } else {
            var author = new Author(
                {
                    first_name: req.body.first_name,
                    family_name: req.body.family_name,
                    date_of_birth: req.body.date_of_birth,
                    date_of_death: req.body.date_of_death
                }
            );
            author.save(function (err) {
                if (err) { return next(err); }
                res.redirect(author.url);
            });
        }
    }

];

exports.author_delete_get = function(req, res, next) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.params.id).exec(callback)
        },
        author_books: function(callback) {
            Book.find({'author': req.params.id}).exec(callback)
        }
    }, function(err, results) {
        if (err) return next(err);
        if (results.author === null) {
            res.redirect('/catalog/authors');
        } else {
            res.render('author_delete', {
                title: 'Delete Author',
                author: results.author,
                author_books: results.author_books})
        }
    })
};

// Handle Author delete on POST.
exports.author_delete_post = function(req, res, next) {
    async.parallel({
        author: function(callback) {
            Author.findById(req.body.authorid).exec(callback)
        },
        author_books: function(callback) {
            Book.find({'author': req.body.authorid}).exec(callback)
        }
    }, function(err, results) {
        if (err) return next(err);

        if (results.author === null) {
            res.redirect('/catalog/authors');
        } else if (results.author_books.length > 0) {
            res.render('author_delete', {
                title: 'Delete Author',
                author: results.author,
                author_books: results.author_books
            });
        } else {
            Author.findByIdAndRemove(req.body.authorid, function (error) {
                if (error) return next(error);
                res.redirect('/catalog/authors')
            })
        }
    })
};

// Display Author update form on GET.
exports.author_update_get = function(req, res) {
    res.send('NOT IMPLEMENTED: Author update GET');
};

// Handle Author update on POST.
exports.author_update_post = function(req, res) {
    res.send('NOT IMPLEMENTED: Author update POST');
};