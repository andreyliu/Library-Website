const Author = require('../models/author');
const Book = require('../models/book');
const async = require('async');

const { body, validationResult, sanitizeBody } = require('express-validator');

const authorNameP = new RegExp(/[a-zA-Z\-]*/);

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
        .custom(function (val) {
            if (!authorNameP.test(val)) {
                throw new Error('Illegal First Name');
            }
            return true;
    }),
    body('family_name').trim()
        .isLength({min: 1})
        .withMessage('Family name should not be empty')
        .custom(function (val) {
            if (!authorNameP.test(val)) {
                throw new Error('Illegal Family Name');
            }
            return true;
        }),
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
            console.log('some errors');
            console.log(errors.array());
            res.render('author_form', { title: 'Create Author',
                author: req.body,
                errors: errors.array()});
        } else {
            const author = new Author(
                {
                    first_name: req.body.first_name,
                    family_name: req.body.family_name,
                    date_of_birth: req.body.date_of_birth,
                    date_of_death: req.body.date_of_death
                }
            );
            author.save(function (err) {
                if (err) {
                    console.log('something\'s wrong');
                    return next(err);
                }
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
exports.author_update_get = function(req, res, next) {
    Author.findById(req.params.id).exec(function(err, author) {
       if (err) {
           return next(err);
       }
       return res.render('author_form', {
           title: 'Update author',
           author: author,
       });
    });
};

// Handle Author update on POST.
exports.author_update_post = [
    body('first_name', 'First name should be no more than 100 characters long')
        .trim().isLength({max: 100}),
    body('family_name', 'Family name cannot be blank').trim().isLength({min: 1}),
    body('date_of_birth', 'Invalid date of birth').optional({checkFalsy: true}).isISO8601(),
    body('date_of_death', 'Invalid date of death').optional({checkFalsy: true}).isISO8601(),

    sanitizeBody('first_name').escape(),
    sanitizeBody('family_name').escape(),
    sanitizeBody('date_of_birth').toDate(),
    sanitizeBody('date_of_death').toDate(),
    function (req, res, next) {
        const err = validationResult(req);
        const author = new Author({
            first_name: req.body.first_name,
            family_name: req.body.family_name,
            date_of_birth: req.body.date_of_birth,
            date_of_death: req.body.date_of_death,
            _id: req.params.id
        });
        if (!err.isEmpty()) {
            res.render('author_form', {
                title: 'Author update',
                author: author,
                errors: err.array()
            });
        } else {
            Author.findByIdAndUpdate(req.params.id, author, {}, function (error, theauthor) {
                if (error) return next(error);
                if (theauthor === null) {
                    const notFound = new Error('Author not found');
                    notFound.status = 404;
                    return next(notFound);
                }
                res.redirect(theauthor.url);
            })
        }
    }
];