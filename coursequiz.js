const mongoose = require('mongoose')

const coursequizSchema = new mongoose.Schema({
    coursename: {
        type: String,
        required: true
    },
    coursecode: {
        type: String,
        required: true
    },
    maxmarks: {
        type: Number,
        default: 0,
        required: true
    },
    minmarks: {
        type: Number,
        default: 0,
        required: true
    },
    quizques: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "quizques"
    }]
})

module.exports = new mongoose.model('coursequiz', coursequizSchema)