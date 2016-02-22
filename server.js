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
var db = require('./db');

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

app.get('/students', function(req,res) {
  Student.findall({
    include: [{
      model: Role
    }]
  }).then(function(students) {
    res.render('student', {
      students: students
    })
  });
});

app.post('/students', function(req, res) {
  Student.create(req.body).then(function() {
    res.redirect('/students');
  });
});

app.post('/roles/:StudentId', function(req,res) {
  Role.create({

  })
}
sequelize.sync().then(function() {
        app.listen(PORT, function() {
                 console.log("Listening on port %s, PORT");
        })
});