const BookInstance = require('../models/bookinstance');
const Book = require('../models/book');
const { body, validationResult, sanitizeBody } = require('express-validator');
const async = require('async');

// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {
    BookInstance.find()
        .populate('book')
        .exec(function (err, list_bookinstances) {
           if (err) { return next(err); }
           list_bookinstances.sort( (a, b) => a.book.title.localeCompare(b.book.title, {sensitivity: 'base'}) );
           return res.render('bookinstance_list', {
               title: 'Book Instance List',
               bookinstance_list: list_bookinstances
           });
        });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {
    BookInstance.findById(req.params.id)
        .populate('book')
        .exec((err, bookinstance) => {
            if (err) return next(err);
            if (bookinstance == null) {
                err = new Error('Book copy not found');
                err.status = 404;
                return next(err);
            }
            res.render('bookinstance_detail', {
                title: 'Copy: ' + bookinstance.book.title,
                bookinstance: bookinstance
            })
        })
};

// Display BookInstance create form on GET.
exports.bookinstance_create_get = function(req, res, next) {
    Book.find({}, 'title')
        .exec((err, books) =>
        res.render('bookinstance_form', {title: 'Create BookInstance', book_list: books}));
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
    body('book', 'Book must be specified')
        .trim().isLength({min: 1}),
    body('imprint', 'Imprint must be specified')
        .trim().isLength({min: 1}),
    body('due_back', 'Invalid date')
        .optional({checkFalsy: true}).isISO8601(),
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('status').escape(),
    sanitizeBody('due_back').toDate(),

    (req, res, next) => {
        const errors = validationResult(req);
        let bookinst = new BookInstance({
            book: req.body.book,
            imprint: req.body.imprint,
            status: req.body.status,
            due_back: req.body.due_back
        });
        if (!errors.isEmpty()) {
            Books.find({}, 'title')
                .exec((err, books) => {
                    if (err) return next(err);
                    res.render('bookinstance_form', {
                        book_list: books,
                        selected_book: bookinst.book._id,
                        errors: errors.array(),
                        bookinstance: bookinst
                    });
                })
        } else {
            bookinst.save((err) => {
               if (err) return next(err);
               res.redirect(bookinst.url);
            });
        }
    }
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res) {
    res.send('NOT IMPLEMENTED: BookInstance delete GET');
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res) {
    res.send('NOT IMPLEMENTED: BookInstance delete POST');
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res) {
    res.send('NOT IMPLEMENTED: BookInstance update GET');
};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = function(req, res) {
    res.send('NOT IMPLEMENTED: BookInstance update POST');
};