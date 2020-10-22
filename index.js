const express = require('express')
const mongoose = require('mongoose')
const bodyparser = require('body-parser');
const bcrypt = require('bcryptjs')
const User = require('./user.js')
const Teacher = require('./teacher.js')
const coursequiz = require('./coursequiz.js')
const quizques = require('./quizques.js')
const quizans = require('./quizans.js')
    // const data = require('./data.js')
    // const data = require('./data.js');
const session = require('express-session')
const cookieParser = require('cookie-parser')
const flash = require('connect-flash');
const { response } = require('express');
// "./config/passport";

// const { Strategy } = require('passport-local')


const app = express();
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));

const passport = require('passport')
const localStrategy = require('passport-local').Strategy;

// using Bodyparser for getting form data
app.use(express.urlencoded({ extended: true }))
app.use(bodyparser.json({ limit: "50mb" }))

// using cookie-parser and session 
app.use(cookieParser('secret'));
app.use(session({
    secret: 'secret',
    maxAge: 3600000, //which is around 2 weeks
    resave: true,
    saveUninitialized: true,
}));

// Using passport for authentications 
app.use(passport.initialize());
app.use(passport.session());

// Using flash for flash messages 
app.use(flash());

// MIDDLEWARES
// Global variable
app.use(async(req, res, next) => {
    res.locals.success_message = req.flash('success_message');
    res.locals.error_message = req.flash('error_message');
    res.locals.error = req.flash('error');
    next();
});

// Check if user is authenticated and clear cache accordingly
const checkAuthenticated = function(req, res, next) {
    if (req.isAuthenticated()) {
        console.log('checkauthenticated success')
        res.set('Cache-Control', 'no-cache, private, no-store, must-revalidate, post-check=0, pre-check=0');
        return next();
    } else {
        console.log('checkauthenticated failed')
        res.redirect('/home');
    }
}

// mongoose connection
mongoose.connect('mongodb://localhost/navigus', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Database connected'));

// Initial Register route
app.get('/home', async(req, res) => {
    res.render('display')
})

app.get('/registerAdmin', async(req, res) => {
        res.render('registerAdmin')
    })
    // Register admin
app.post('/registerAdmin', async(req, res) => {
    var { email, roll, username, password, confirmpassword } = req.body;
    var err;

    // if any field is empty
    if (!email || !roll || !username || !password || !confirmpassword) {
        err = 'Please fill all details!'
        res.render('registerAdmin', { 'err': err });
    }

    // if password doesn't match
    if (password != confirmpassword) {
        err = 'Passwords Don\'t match!'
        res.render('registerAdmin', { 'err': err, 'email': email, 'roll': roll, 'username': username });
    }

    // if everything is fine then check for exiting email in db
    if (typeof err == 'undefined') {
        const check = await Teacher.exists({ roll: req.body.roll })
        if (check == false) {
            bcrypt.genSalt(10, async(err, salt) => {
                if (err) throw err;
                bcrypt.hash(password, salt, async(err, hash) => {
                    if (err) throw err;
                    password = hash;

                    // save new user
                    await Teacher.create({
                        email,
                        username,
                        roll,
                        password
                    })
                    req.flash('success_message', "Registered Successfully.. Login To Continue..");
                    res.redirect('/loginAdmin');
                });
            });
        } else {
            console.log('user exists')
            err = 'User with this roll number already exists!'
            res.render('registerAdmin', { 'err': err });
        }

    }
})


app.get('/registerUser', async(req, res) => {
    res.render('registerUser')
})

// Register user
app.post('/registerUser', async(req, res) => {
    var { email, username, roll, password, confirmpassword } = req.body;
    var err;

    // if any field is empty
    if (!email || !username || !roll || !password || !confirmpassword) {
        err = 'Please fill all details!'
        res.render('registerUser', { 'err': err });
    }

    // if password doesn't match
    if (password != confirmpassword) {
        err = 'Passwords Don\'t match!'
        res.render('registerUser', { 'err': err, 'email': email, 'roll': roll, 'username': username });
    }

    // if everything is fine then check for exiting email in db
    if (typeof err == 'undefined') {
        const check = await User.exists({ roll: req.body.roll })
        if (check == false) {
            bcrypt.genSalt(10, async(err, salt) => {
                if (err) throw err;
                bcrypt.hash(password, salt, async(err, hash) => {
                    if (err) throw err;
                    password = hash;

                    // save new user
                    await User.create({
                        email,
                        username,
                        roll,
                        password
                    })
                    req.flash('success_message', "Registered Successfully.. Login To Continue..");
                    res.redirect('/loginUser');
                });
            });
        } else {
            console.log('user exists')
            err = 'User with this roll number already exists!'
            res.render('registerUser', { 'err': err });
        }

    }
})




passport.serializeUser(function(Teacher, cb) {
    cb(null, Teacher.id);
});

passport.deserializeUser(function(id, cb) {
    Teacher.findById(id, function(err, Teacher) {
        cb(err, Teacher);
    });
});

passport.serializeUser(function(User, cb) {
    cb(null, User.id);
});

passport.deserializeUser(function(id, cb) {
    User.findById(id, function(err, User) {
        cb(err, User);
    });
});

passport.use('localTeacher', new localStrategy({ usernameField: 'roll' }, async(roll, password, done) => {

    Teacher.findOne({ roll: roll }, async(err, data) => {
        if (err) throw err;
        if (!data) {
            return done(null, false, { message: "User Doesn't Exists.." });
        }
        bcrypt.compare(password, data.password, async(err, match) => {
            if (err) {
                return done(null, false);
            }
            if (!match) {
                return done(null, false, { message: "Password Doesn't Match" });
            }
            if (match) {
                console.log('matchedAdmin')
                return done(null, data);
            }
        });
    });
}));

passport.use('localUser', new localStrategy({ usernameField: 'roll' }, async(roll, password, done) => {

    User.findOne({ roll: roll }, async(err, data) => {
        if (err) throw err;
        if (!data) {
            return done(null, false, { message: "User Doesn't Exists.." });
        }
        bcrypt.compare(password, data.password, async(err, match) => {
            if (err) {
                return done(null, false);
            }
            if (!match) {
                return done(null, false, { message: "Password Doesn't Match" });
            }
            if (match) {
                console.log('matchedUser')
                return done(null, data);
            }
        });
    });
}));





// Login admin
app.get('/loginAdmin', async(req, res) => {
    res.render('loginAdmin');
})

// Login user
app.get('/loginUser', async(req, res) => {
    res.render('loginUser');
})

// Login admin
app.post('/loginAdmin', (req, res, next) => {
    passport.authenticate('localTeacher', {
        failureRedirect: '/loginAdmin',
        successRedirect: '/indexAdmin',
        failureFlash: true,
    })(req, res, next);
});

// Login user
app.post('/loginUser', (req, res, next) => {
    passport.authenticate('localUser', {
        failureRedirect: '/loginUser',
        successRedirect: '/indexUser',
        failureFlash: true,
    })(req, res, next);
});

// Success route admin
app.get('/indexAdmin', checkAuthenticated, async(req, res) => {
    res.render('indexAdmin', { 'teacher': req.teacher });
});

// Success route user
app.get('/indexUser', checkAuthenticated, async(req, res) => {
    res.render('indexUser', { 'user': req.user });
});


app.get('/createCourse', checkAuthenticated, async(req, res) => {
    res.render('createCoursequiz', { 'teacher': req.teacher })
})

app.post('/createCourse', checkAuthenticated, async(req, res) => {
    const info = req.body;
    console.log(req.body)
    console.log(req.user)
    const newCourse = await new coursequiz({
        coursename: info.coursename,
        coursecode: info.coursecode,
        minmarks: info.minmarks
    });

    const newQuiz = await new quizques({
        question: info.ques1,
        opt1: info.ques1op1,
        opt2: info.ques1op2,
        opt3: info.ques1op3,
        opt4: info.ques1op4,
        ans: info.ans,
        marks: info.marks
    })


    newCourse.save(async(error, savedQuiz) => {
        if (error) {
            console.log(error);
            return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
        }

        if (savedQuiz) {
            Teacher.findById(req.user._id, async(error, foundTeacher) => {
                if (error) {
                    console.log(error);
                    return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
                }

                foundTeacher.coursequiz.push(savedQuiz);
                foundTeacher.save(async(error, savedQuiz) => {
                    if (error) {
                        console.log(error);
                        return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
                    }
                    req.flash('success_message', "Quiz Saved!");
                    res.redirect('/showCourse')
                });
            });
        }
    });
    console.log('puot' + newCourse._id)

    newQuiz.save(async(error, savedQues) => {
        if (error) {
            console.log(error);
            return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
        }

        if (savedQues) {
            coursequiz.findById(newCourse._id, async(error, foundCourse) => {
                if (error) {
                    console.log(error);
                    return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
                }

                foundCourse.quizques.push(savedQues);
                foundCourse.maxmarks = parseInt(foundCourse.maxmarks) + parseInt(info.marks);
                foundCourse.save(async(error, savedQues) => {
                    if (error) {
                        console.log(error);
                        return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
                    }
                    req.flash('success_message', "Quiz Saved!");
                    // res.redirect('/showCourse')
                });
            });
        }
    });
    // res.json(info);
    // res.redirect('/showCourse')
})

app.get('/createQuiz/:id', checkAuthenticated, async(req, res) => {
    res.render('createQuiz', { 'coursequiz': req.coursequiz, '_id': req.params.id })
})

app.post('/createQuiz/:id', checkAuthenticated, async(req, res) => {
    const info = req.body;
    // console.log(req.body)
    const _id = req.params.id
    const newQuiz = await new quizques({
        question: info.ques1,
        opt1: info.ques1op1,
        opt2: info.ques1op2,
        opt3: info.ques1op3,
        opt4: info.ques1op4,
        ans: info.ans,
        marks: info.marks
    })


    newQuiz.save(async(error, savedQues) => {
        if (error) {
            console.log(error);
            return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
        }

        if (savedQues) {
            coursequiz.findById(_id, async(error, foundCourse) => {
                if (error) {
                    console.log(error);
                    return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
                }

                foundCourse.quizques.push(savedQues);
                foundCourse.save(async(error, savedQues) => {
                    if (error) {
                        console.log(error);
                        return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
                    }
                    // coursequiz.findById(_id, async(error, foundCourse) => {
                    req.flash('success_message', "Quiz Saved!");
                    // res.redirect('/showCourse')
                });
                // foundCourse.maxmarks = foundCourse.maxmarks + info.marks;
                foundCourse.maxmarks = parseInt(foundCourse.maxmarks) + parseInt(info.marks);

                console.log('render' + foundCourse.quizques)
                res.redirect('/showCourse/' + _id)
                    // res.render('showQuiz', { 'coursename': foundCourse.coursename, 'coursecode': foundCourse.coursecode, 'quizques': foundCourse.quizques, '_id': foundCourse._id })
            });
        }
    });
    // res.json(info);
    // res.redirect('/showQuiz')

})

app.get('/showCourse', checkAuthenticated, async(req, res) => {
    Teacher.findById(req.user._id).populate("coursequiz").exec(async(error, foundTeacher) => {
        if (error) {
            console.log(error);
            return res.redirect('/404')
        }

        if (!foundTeacher) {
            console.log("url does not exist");
            return res.redirect('/404')
        }
        console.log(foundTeacher.coursequiz)
        res.render('showCourse', { 'teacher': foundTeacher.username, '_id': foundTeacher._id, 'coursequiz': foundTeacher.coursequiz })
    });
})

app.get('/showCourse/:id', checkAuthenticated, async(req, res) => {
    // console.log('user' + req.user)
    // console.log('course' + req.coursequiz)
    const _id = req.params.id
    console.log(_id)

    coursequiz.findById(_id).populate("quizques").exec(async(error, foundCoursequiz) => {
        if (error) {
            console.log(error);
            return res.redirect('/404')
        }

        if (!foundCoursequiz) {
            console.log("url does not exist");
            return res.redirect('/404')
        }
        // console.log(foundCoursequiz.quizques.question)
        console.log(foundCoursequiz.quizques.length)
        res.render('showQuiz', { 'coursename': foundCoursequiz.coursename, 'coursecode': foundCoursequiz.coursecode, 'minmarks': foundCoursequiz.minmarks, 'quizques': foundCoursequiz.quizques, '_id': foundCoursequiz._id })
    });
})


// app.get('/showQuiz', checkAuthenticated, async(req, res) => {

// })

app.get('/api', checkAuthenticated, async(req, res) => {
    user.findById(req.user._id).populate("data").exec(async(error, foundUser) => {
        if (error) {
            console.log(error);
            return res.redirect('/404')
        }

        if (!foundUser) {
            console.log("Api url does not exist");
            return res.redirect('/404')
        }
        // res.send( {'slots': foundUser.slots})
        // res.render('allslots', { 'user': foundUser.username, 'uid': foundUser._id, 'data': foundUser.data })
        res.send({ 'user': foundUser.username, 'uid': foundUser._id, 'data': foundUser.data })
    });

})

// app.post('/api', checkAuthenticated, async(req, res) => {
//     const info = req.body;

//     // const timestamp = Date.now();
//     // info.timestamp = timestamp;
//     // console.log(info);


//     const newData = await new data({
//         message: info.message
//     });

//     newData.save(async(error, savedData) => {
//         if (error) {
//             console.log(error);
//             return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
//         }

//         if (savedData) {
//             User.findById(req.user._id, async(error, foundUser) => {
//                 if (error) {
//                     console.log(error);
//                     return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
//                 }

//                 foundUser.data.push(savedData);
//                 foundUser.save(async(error, savedData) => {
//                     if (error) {
//                         console.log(error);
//                         return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
//                     }

//                     req.flash('success_message', "Data Saved!");

//                 });
//             });
//         }
//     });
//     res.json(info);
// })

// app.get('/display', async(req, res) => {
//         user.findById(req.user._id).populate("data").exec(async(error, foundUser) => {
//             if (error) {
//                 console.log(error);
//                 return res.redirect('/404')
//             }

//             if (!foundUser) {
//                 console.log("Api url does not exist");
//                 return res.redirect('/404')
//             }

//             res.render('display', { 'user': foundUser.username, 'uid': foundUser._id, 'data': foundUser.data })
//         });
//     })


// Logout route
app.get('/logout', async(req, res) => {
    req.logout();
    res.redirect('/home');
})


app.listen(8000, () => console.log('Listening to the port 8000'));