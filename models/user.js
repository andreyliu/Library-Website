const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    first_name: {type: String, required: [true, 'cannot be blank'], max: 100},
    last_name: {type: String, required: [true, 'cannot be blank'], max: 100},
    email: {unique: true, type: String, required: [true, 'cannot be blank'], max: 100},
    username: {index: true, unique: true, type: String, required: [true, 'cannot be blank'], max: 100},
    password: {type: String, required: [true, 'cannot be blank'], max: 100},
    role: {
        type: String,
        required: true,
        enum: ['admin', 'librarian', 'user'],
        default: 'user',
    },
});

UserSchema.virtual('name')
.get(function() {
   return `${this.last_name}, ${this.first_name}`;
});

module.exports = mongoose.model('User', UserSchema);