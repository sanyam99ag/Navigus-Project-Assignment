const express = require('express')
const mongoose = require('mongoose')
const bodyparser = require('body-parser');
const bcrypt = require('bcryptjs')
const User = require('./user.js')
const Teacher = require('./teacher.js')
const coursequiz = require('./coursequiz.js')
const quizques = require('./quizques.js')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const flash = require('connect-flash');
const { response } = require('express');
// const { Strategy } = require('passport-local')


const app = express();

PORT = process.env.PORT || 8080;

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
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/navigusAssignment', {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => console.log('Database connected'));

// Dummy home route
app.get('/home', async(req, res) => {
    res.render('display')
})
app.get('/', async(req, res) => {
    res.render('display')
})

// ADMIN REGISTER
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
                    req.flash('success_message', "Teacher Registered Successfully.. Login To Continue..");
                    res.redirect('/loginAdmin');
                });
            });
        } else {
            console.log('user exists')
            err = 'Teacher with this roll number already exists!'
            res.render('registerAdmin', { 'err': err });
        }

    }
})

// USER REGISTER
app.get('/registerUser', async(req, res) => {
    res.render('registerUser')
})

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
                    req.flash('success_message', "Student Registered Successfully.. Login To Continue..");
                    res.redirect('/loginUser');
                });
            });
        } else {
            // console.log('user exists')
            err = 'User with this roll number already exists!'
            res.render('registerUser', { 'err': err });
        }

    }
})

// SERIALIZER DESERIALIZER SESSION CONSTRUCTOR

function SessionConstructor(userId, userGroup, details) {

    this.userId = userId;

    this.userGroup = userGroup;

    this.details = details;

}

passport.serializeUser(function(userObject, done) {

    // userObject could be a Model1 or a Model2... or Model3, Model4, etc.

    let userGroup = "User";

    let userPrototype = Object.getPrototypeOf(userObject);

    if (userPrototype === User.prototype) {

        userGroup = "User";

    } else if (userPrototype === Teacher.prototype) {

        userGroup = "Teacher";

    }

    let sessionConstructor = new SessionConstructor(userObject.id, userGroup, '');

    done(null, sessionConstructor);

});

passport.deserializeUser(function(sessionConstructor, done) {

    if (sessionConstructor.userGroup == 'User') {

        User.findOne({

            _id: sessionConstructor.userId

        }, '-localStrategy.password', function(err, user) { // When using string syntax, prefixing a path with - will flag that path as excluded.

            done(err, user);

        });

    } else if (sessionConstructor.userGroup == 'Teacher') {

        Teacher.findOne({

            _id: sessionConstructor.userId

        }, '-localStrategy.password', function(err, user) { // When using string syntax, prefixing a path with - will flag that path as excluded.

            done(err, user);

        });

    }

});


// // PASSPORT AUTHENTICATION STRATEGY AND SERIALIZER/DESERIALIZER FOR TEACHER
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

// ADMIN LOGIN
app.get('/loginAdmin', async(req, res) => {
    res.render('loginAdmin');
})

app.post('/loginAdmin', (req, res, next) => {
    passport.authenticate('localTeacher', {
        failureRedirect: '/loginAdmin',
        successRedirect: '/indexAdmin',
        failureFlash: true,
    })(req, res, next);
});

// PASSPORT AUTHENTICATION STRATEGY AND SERIALIZER/DESERIALIZER FOR USER


passport.use(new localStrategy({ usernameField: 'roll' }, async(roll, password, done) => {

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








// USER LOGIN
app.get('/loginUser', async(req, res) => {
    res.render('loginUser');
})

app.post('/loginUser', (req, res, next) => {
    passport.authenticate('local', {
        failureRedirect: '/loginUser',
        successRedirect: '/indexUser',
        failureFlash: true,
    })(req, res, next);
});


// ADMIN DASHBOARD
app.get('/indexAdmin', checkAuthenticated, async(req, res) => {
    res.render('indexAdmin', { 'teacher': req.user });
});

// USER DASHBOARD
app.get('/indexUser', checkAuthenticated, async(req, res) => {
    res.render('indexUser', { 'user': req.user });
});


// CREATE COURSE
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

    // const newQuiz = await new quizques({
    //     question: info.ques1,
    //     opt1: info.ques1op1,
    //     opt2: info.ques1op2,
    //     opt3: info.ques1op3,
    //     opt4: info.ques1op4,
    //     ans: info.ans,
    //     marks: info.marks
    // })


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
                    req.flash('success_message', "Course is Created you can now add questions!");
                    res.redirect('/showCourse')
                });
            });
        }
    });
    // console.log('puot' + newCourse._id)

    // newQuiz.save(async(error, savedQues) => {
    //     if (error) {
    //         console.log(error);
    //         return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
    //     }

    //     if (savedQues) {
    //         coursequiz.findById(newCourse._id, async(error, foundCourse) => {
    //             if (error) {
    //                 console.log(error);
    //                 return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
    //             }

    //             foundCourse.quizques.push(savedQues);
    //             foundCourse.maxmarks = parseInt(foundCourse.maxmarks) + parseInt(info.marks);
    //             foundCourse.save(async(error, savedQues) => {
    //                 if (error) {
    //                     console.log(error);
    //                     return res.status(404).json({ success: false, msg: "Something went wrong. Please try again" });
    //                 }
    //                 req.flash('success_message', "Quiz Saved!");
    //                 // res.redirect('/showCourse')
    //             });
    //         });
    //     }
    // });
    // res.json(info);
    // res.redirect('/showCourse')
})


// CREATE QUIZ ACC TO COURSE ID
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
                    req.flash('success_message', "Question Saved!");
                    // res.redirect('/showCourse')
                });
                // foundCourse.maxmarks = foundCourse.maxmarks + info.marks;
                foundCourse.maxmarks = parseInt(foundCourse.maxmarks) + parseInt(info.marks);

                // console.log('render' + foundCourse.quizques)
                res.redirect('/showCourse/' + _id)
            });
        }
    });
    // res.json(info);
    // res.redirect('/showQuiz')
})

// DISPLAY COURSE
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
        // console.log(foundTeacher.coursequiz)
        res.render('showCourse', { 'teacher': foundTeacher.username, '_id': foundTeacher._id, 'coursequiz': foundTeacher.coursequiz })
    });
})

// DISPLAY QUIZ QUESTIONS OF COURSE ID
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

// DISPLAY COURSE TO USER
app.get('/quizCourse', checkAuthenticated, async(req, res) => {
    coursequiz.find().populate("coursequiz").exec(async(error, foundCourse) => {
        if (error) {
            console.log(error);
            return res.redirect('/404')
        }

        if (!foundCourse) {
            console.log("url does not exist");
            return res.redirect('/404')
        }
        res.render('showQuizcourse', { 'coursequiz': foundCourse })
    });
});

// ALLOW USER TO TAKE QUIZ
app.get('/quizCourse/:id', checkAuthenticated, async(req, res) => {

    const _id = req.params.id

    coursequiz.findById(_id).populate("quizques").exec(async(error, foundCoursequiz) => {
        if (error) {
            console.log(error);
            return res.redirect('/404')
        }

        if (!foundCoursequiz) {
            console.log("url does not exist");
            return res.redirect('/404')
        }

        res.render('takeQuiz', { 'coursename': foundCoursequiz.coursename, 'coursecode': foundCoursequiz.coursecode, 'minmarks': foundCoursequiz.minmarks, 'quizques': foundCoursequiz.quizques, '_id': foundCoursequiz._id })
    });
})

// LOGOUT ROUTE
app.get('/logout', async(req, res) => {
    req.logout();
    res.redirect('/home');
})


app.listen(PORT, () => console.log(`Listening to the port ${PORT}`));