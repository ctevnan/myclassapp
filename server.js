var express = require('express');
var expressHandlebars = require('express-handlebars');
var mysql = require('mysql');
var bodyParser = require('body-parser');
var session = require('express-session');

var Sequelize = require('sequelize');
var sequelize = new Sequelize('my_class', 'root');

var bcryptjs = require('bcryptjs');

var passport = require('passport');
var Strategy = require('passport-local').Strategy;


//config local strategy for passport
//the local strategy needs a verify function that
//gets the credentials given by the user (username,psswrd)

passport.use(new Strategy(
  function(username, password, cb) {
    db.users.findByUsername(username, function(err, user) {
      if (err) { return cb(err); }
      if (!user) { return cb(null, false); }
      if (user.password != password) { return cb(null, false); }
      return cb(null, user);
    });
  }));

//config passport authenticated session persistence
//passport must serialize users into and deserialize users out of
//the session. just supply user ID when serializing and query the 
//user record by ID from the db when deserializing

passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  db.users.findById(id, function (err, user) {
    if (err) { return cb(err); }
    cb(null, user);
  });
});

var User = sequelize.define('user', {
    email: {
            type: Sequelize.STRING,
            unique: true
    },
  password: Sequelize.STRING,
  firstname: Sequelize.STRING,
  lastname: Sequelize.STRING,  
});

var Student = sequelize.define('student', {
    firstname: Sequelize.STRING,
    lastname: Sequelize.STRING,
});
//students have 1 instructor and up to 2 TAs.

var Instructor = sequelize.define('instructor', {
    firstname: Sequelize.STRING,
    lastname: Sequelize.STRING,
});

Instructor.hasMany(Student);
//an instructor can be either a TA or a teacher

var PORT = process.env.NODE_ENV || 3000;

var app = express();

//config view engine to render EJS templates
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');

//using middleware for common functionality
//ie logging, parsing, sess handling

app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'minecraft', resave: false, saveUninitialized: false }));

//init passport and restore auth state if any from sess
app.use(passport.initialize());
app.use(passport.session());

//defining routes
app.get('/',
  function(req,res) {
    res.render('index', { user: req.user });
  });
app.get('/login',
  function(req,res) {
    res.render('login');
  });
app.post('/login',
  passport.authenticate('local', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });
app.get('/logout',
  function(req,res) {
    req.logout();
    res.redirect('/');
  });
app.get('/profile',
  require('connect-ensure-login').ensureLoggedIn(),
  function(req, res) {
    res.render('profile', { user: req.user });
  });
//app.listen(3000);   

app.use(session({
        secret: "this is a secret",
        cookie: {
                maxAge: 1000 * 60 * 60 * 24 *14
        },
        saveUninitialized: true,
        resave: false
}));

app.engine('handlebars', expressHandlebars({
        defaultLayout: 'main'
}));
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({
        extended: false
}));


app.get('/', function(req,res) {
        res.render('index', {
                msg: req.query.msg
        });
});

app.post('/register', function(req,res) {
        User.create(req.body).then(function(user) {
                req.session.authenticated = user;
                res.redirect('/secret');
        }).catch(function(err) {
                        res.redirect("/?msg=" + err.message);
        });
});

app.post('/login', function(req,res) {
        var email = req.body.email;
        var password = req.body.password;

        User.findOne({
               where: {
                email: email,
                password: password
              }
        }).then(function(user) {
               if(user){
                      req.session.authenticated = user;
                      res.redirect('/secret');
                } else {
                      res.redirect('/?msg=Invalid login');
                }
        }).catch(function(err) {
                throw err;
        });
});

app.get('/secret', function(req,res) {

      // if user is authenticated
      if(req.session.authenticated) {
              res.render("secret");
      } else {
              res.redirect("/?msg=you are not logged in");
      }
});

app.get('/students', function (req, res) {
  Students.put(req.body).then(function() {
    res.redirect('/students');
  });
});

app.post('/students', function(req, res) {
  Student.create(req.body).then(function() {
    res.redirect('/students');
  });
});

app.post('/:StudentId', function(req,res) {
    create({
    studentname: req.body.studentname,
    studentId: req.params.StudentId
  }).then(function() {
    res.redirect('/students');
  });
});

app.get('/instructors', function (req, res) {
  Instructors.put(req.body).then(function() {
    res.redirect('/instructors');
  });
});

app.post('/instructors', function(req, res) {
  Instructor.create(req.body).then(function() {
    res.redirect('/instructors');
  });
});

app.post('/:InstructorId', function(req,res) {
    create({
    instructorname: req.body.instructorname,
    instructorId: req.params.InstructorId
  }).then(function() {
    res.redirect('/instructors');
  });
});

sequelize.sync().then(function() {
        app.listen(PORT, function() {
                 console.log("Listening on port %s, PORT");
        })
});