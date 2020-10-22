const mongoose = require('mongoose')

const quizquesSchema = new mongoose.Schema({
    question: {
        type: String,
        required: true
    },
    opt1: {
        type: String,
        required: true
    },
    opt2: {
        type: String,
        required: true
    },
    opt3: {
        type: String,
        required: true
    },
    opt4: {
        type: String,
        required: true
    },
    ans: {
        type: String,
        required: true
    },
    marks: {
        type: Number,
        default: 0,
        required: true
    }
    // quizans: [{
    //     type: mongoose.Schema.Types.ObjectId,
    //     ref: "quizans"
    // }]
})

module.exports = new mongoose.model('quizques', quizquesSchema)