const mongoose = require('mongoose');
const moment = require('moment');

const Schema = mongoose.Schema;
const dateFormat = 'MMM Do, YYYY';

const AuthorSchema = new Schema(
    {
        first_name: {type: String, required: true, max: 100},
        family_name: {type: String, required: true, max: 100},
        date_of_birth: {type: Date},
        date_of_death: {type: Date},
    }
);

AuthorSchema.virtual('name').get(function () {
    var fullname = '';
    if (this.first_name && this.family_name) {
        fullname = this.family_name + ', ' + this.first_name;
    }
    return fullname
});

AuthorSchema.virtual('lifespan').get(function() {
    return (this.date_of_death.getYear() - this.date_of_birth.getYear()).toString();
});

AuthorSchema
.virtual('url')
.get(function () {
    return '/catalog/author/' + this.id;
});

AuthorSchema
    .virtual('time')
    .get(function () {
        if (!this.date_of_birth && !this.date_of_death) return 'Unknown';
        let born = this.date_of_birth ? moment(this.date_of_birth).format(dateFormat) : '';
        let dead = this.date_of_death ? moment(this.date_of_death).format(dateFormat) : '';
        return born + ' - ' + dead;
    });

module.exports = mongoose.model('Author', AuthorSchema);
