const BookInstance = require('../models/bookinstance');
const Book = require('../models/book');
const User = require('../models/user');
const { body, validationResult, sanitizeBody } = require('express-validator');
const async = require('async');
const paginate = require('express-paginate');

const logtag = 'local-library:bookinstance';
const inslog = require('debug')(logtag);
const logging = require('../utils/logger');
// Display list of all BookInstances.
exports.bookinstance_list = function(req, res, next) {
    async.parallel({
        list_bookinstances: cb => BookInstance.find()
            .populate('book')
            .limit(req.query.limit)
            .skip(req.skip)
            .exec(cb),
        count: cb => BookInstance.count(cb),
    },
    function (err, results) {
        if (err) { return next(err); }
        let itemCount = results.count;
        let pageCount = Math.ceil(itemCount / req.query.limit);
        return res.render('bookinstance_list', {
            title: 'Book Instance List',
            bookinstance_list: results.list_bookinstances,
            pageCount: pageCount,
            itemCount: itemCount,
            pages: paginate.getArrayPages(req)(3, pageCount, req.query.page),
        });
    });
};

// Display detail page for a specific BookInstance.
exports.bookinstance_detail = function(req, res, next) {
    BookInstance.findById(req.params.id)
        .populate('book')
        .populate('borrower')
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
        .exec((err, books) => {
            if (err) next(err);
            res.render('bookinstance_form', {
                title: 'Create BookInstance',
                book_list: books
            });
        })
};

// Handle BookInstance create on POST.
exports.bookinstance_create_post = [
    body('book', 'Book must be specified')
        .trim().isLength({min: 1}),
    body('imprint', 'Imprint must be non-empty and with length under 100')
        .trim().isLength({min: 1, max: 100}),
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
            Book.find({}, 'title')
                .exec((err, books) => {
                    if (err) return next(err);
                    res.render('bookinstance_form', {
                        book_list: books,
                        errors: errors.array(),
                        bookinstance: bookinst
                    });
                });
        } else {
            bookinst.save((err) => {
               if (err) return next(err);
               logHelper(`create: ${logString(bookinst)}`);
               res.redirect(bookinst.url);
            });
        }
    }
];

// Display BookInstance delete form on GET.
exports.bookinstance_delete_get = function(req, res, next) {
    BookInstance.findById(req.params.id)
        .populate('book')
        .exec(function(err, book_instance) {
        if (err) return next(err);
        res.render('bookinstance_delete', {
            title: 'Delete Copy',
            bookinstance: book_instance
        });
    })
};

// Handle BookInstance delete on POST.
exports.bookinstance_delete_post = function(req, res) {
    BookInstance.findByIdAndRemove(req.body.id, function (err) {
        if (err) return next(err);
        logHelper(`delete: ${req.body.id}`);
        res.redirect('/catalog/bookinstances');
    })
};

// Display BookInstance update form on GET.
exports.bookinstance_update_get = function(req, res, next) {
    async.parallel({
        bookinstance: cb => BookInstance.findById(req.params.id)
            .populate('book')
            .exec(cb),
        book_list: cb => Book.find({}, 'title').exec(cb),
        user_list: cb => User.find(cb),
    }, (err, results) => {
        if (err) return next(err);
        if (!results.bookinstance) {
            const error = new Error('Book copy not found');
            error.status = 404;
            return next(error);
        } else {
            let id = results.bookinstance.book._id.toString();
            for (let i = 0; i < results.book_list.length; i++) {
                if (results.book_list[i]._id.toString() === id) {
                    results.book_list[i].selected = 'true';
                    break;
                }
            }
            logHelper(`update attempt: ${results.bookinstance}`);
            res.render('bookinstance_form', {
                title: 'Update Copy',
                bookinstance: results.bookinstance,
                book_list: results.book_list,
                user_list: results.user_list,
            });
        }
    });

};

// Handle bookinstance update on POST.
exports.bookinstance_update_post = [
    body('book','Book must be specified').trim().isLength({min: 1}),
    body('imprint', 'Imprint must be non-empty and no more than 100 long')
        .trim().isLength({min: 1, max: 100}),
    body('due_back', 'Invalid due back date')
        .optional({checkFalsy: true}).isISO8601(),
    body('status').custom(function(data) {
        switch (data) {
            case 'Maintenance':
            case 'Loaned':
            case 'Available':
            case 'Reserved':
                break;
            default:
                throw new Error('Illegal status');
        }
        return true;
    }),
    sanitizeBody('book').escape(),
    sanitizeBody('imprint').escape(),
    sanitizeBody('due_back').toDate(),
    sanitizeBody('status').escape(),
    sanitizeBody('borrower').escape(),

    body('status').custom(async function(data, {req}) {
       if (data === 'Loaned') {
           let user = await User.findById(req.body.borrower);
           if (!user) {
               throw new Error('Cannot find user');
           }
       }
    }),

    function(req, res, next) {
        const errors = validationResult(req);
        let inst = new BookInstance(
            {
                book: req.body.book,
                imprint: req.body.imprint,
                due_back: req.body.due_back,
                status: req.body.status,
                _id: req.params.id,
                borrower: req.body.borrower,
            }
        );
        if (!errors.isEmpty()) {
            onUpdateError(res, next, inst, errors);
        } else {
            BookInstance.findByIdAndUpdate(req.params.id, inst, {useFindAndModify: false},
                function (err, thebook) {
                    if (err) return next(err);
                    logHelper(`update complete: ${logString(inst)}`)
                    res.redirect(thebook.url);
            });
        }
    }
];

function onUpdateError(res, next, inst, errors) {
    async.parallel({
        book_list: cb => Book.find({}, 'title').exec(cb),
        user_list: cb => User.find(cb),
    },
    function(err, results) {
        if (err) return next(err);
        res.render('bookinstance_form', {
            title: 'Update Copy',
            bookinstance: inst,
            book_list: results.book_list,
            user_list: results.user_list,
            errors: errors.array(),
        });

    });
}

function logString(inst) {
    return JSON.stringify(inst);
}

function logHelper(msg) {
    logging(inslog, logtag, msg);
}