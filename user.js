const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    roll: {
        type: Number,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    is_Teacher: {
        type: Boolean,
        default: false
    },
    data: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "data"
    }]
})

module.exports = new mongoose.model('user', userSchema)