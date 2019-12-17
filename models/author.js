const mongoose = require('mongoose');
const moment = require('moment');

const Schema = mongoose.Schema;

const AuthorSchema = new Schema(
    {
        first_name: {type: String, max: 100},
        family_name: {type: String, required: true, max: 100},
        date_of_birth: {type: Date},
        date_of_death: {type: Date},
    }
);

AuthorSchema.virtual('name').get(function () {
    let fullname = '';
    if (this.first_name && this.family_name) {
        fullname = this.family_name + ', ' + this.first_name;
    } else if (this.family_name) {
        fullname = this.family_name;
    }
    return fullname;
});

function formDisplayDate (date) {
    return date ? moment.utc(date).format('YYYY-MM-DD') : '';
}

function detailDate (date) {
    return date ? moment.utc(date).format('MMM Do, YYYY') : '';
}

AuthorSchema
.virtual('url')
.get(function () {
    return '/catalog/author/' + this.id;
});

AuthorSchema
    .virtual('date_of_birth_f')
    .get(function () {
        return formDisplayDate(this.date_of_birth);
    });


AuthorSchema
    .virtual('date_of_death_f')
    .get(function () {
        return formDisplayDate(this.date_of_death);
    });

AuthorSchema
    .virtual('lifespan')
    .get(function () {
        if (!this.date_of_birth && !this.date_of_death) return 'Unknown';
        let born = detailDate(this.date_of_birth);
        let dead = detailDate(this.date_of_death);
        if (!born && !dead) return 'Unknown';
        if (!born) born = 'Unknown';
        return born + ' - ' + dead;
    });

module.exports = mongoose.model('Author', AuthorSchema);
