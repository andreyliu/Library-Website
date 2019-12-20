const mongoose = require('mongoose');
const moment = require('moment');

const Schema = mongoose.Schema;
const dateFormat = 'MM/DD/YYYY';

const BookInstanceSchema = new Schema(
    {
        book: {type: Schema.Types.ObjectId, ref: 'Book', required: true},
        imprint: {type: String, required: true},
        status: {
            type: String, required: true,
            enum: ['Available', 'Maintenance', 'Loaned', 'Reserved'],
            default: 'Maintenance'
        },
        due_back: {type: Date, default: Date.now()},
        borrower: {type: Schema.Types.ObjectId, ref: 'User'},
    }
);

BookInstanceSchema
.virtual('url')
.get(function () {
    return '/catalog/bookinstance/' + this._id;
});

BookInstanceSchema
.virtual('due_back_formatted')
.get(function () {
    return moment.utc(this.due_back).format(dateFormat);
});

BookInstanceSchema
    .virtual('due_back_form')
    .get(function () {
        return moment.utc(this.due_back).format('YYYY-MM-DD');
    });

BookInstanceSchema
    .virtual('overdue')
    .get(function() {
       return this.due_back < new Date();
    });

module.exports = mongoose.model('BookInstance', BookInstanceSchema);