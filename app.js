require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const ejs = require('ejs');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');
const FacebookStrategy = require('passport-facebook').Strategy;

const app = express();

app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({extended: true}));

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(function(req,res,next){
    res.locals.currentUser = req.user;
    next();
  })


mongoose.connect("mongodb+srv://admin-goodelias:Dinamit2001@secretscluster.w7b6y.mongodb.net/userDB", {useNewUrlParser: true, useNewUrlParser: true, useUnifiedTopology: true, useFindAndModify: false});
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema ({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: Array
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(function(user, done) {
    done(null, user.id);
});
  
passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://polar-lake-52018.herokuapp.com/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id, username: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "https://polar-lake-52018.herokuapp.com/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id, username: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
    res.render("home");
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ["profile"] })
);

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
});

app.get('/auth/facebook',
  passport.authenticate('facebook')
);

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});

app.get("/login", function(req, res){
    res.render("login");
});

app.get("/register", function(req, res){
    res.render("register");
});

app.get("/secrets", function(req, res){
    User.find({}, function(err, foundUsers){
        if (err) {
            console.log(err);
        } else {
            if (foundUsers) {
                res.render("secrets", {usersWithSecrets: foundUsers, currentUser: res.locals.currentUser});
            }
        }
    });
});

app.get("/submit", function(req, res){
    if (req.isAuthenticated()){
        res.render("submit")
    } else {
        res.redirect("/login")
    }
});

app.post("/back", function(req, res){
    res.redirect("/secrets")
})

app.post("/submit", function(req, res){
   const submitedSecret = req.body.secret;

   User.findById(req.user.id, function(err, foundUser){
       if (err) {
           console.log(err);
       } else {
           if (foundUser) {
               User.updateOne({_id: req.user._id}, {$push: {secret: submitedSecret}}, function(err, result){
                   if (err) {
                       console.log(err);
                   } else {
                       res.redirect("/secrets")
                   }
               })
           }
       }
   });
});

app.post("/delete", function(req, res){
    if (req.user.username === '106354804168606991157') {
        User.updateOne({secret: req.body.secret}, {$pull: {secret: req.body.secret}}, function(err, foundSecret){
            if (err) {
                console.log(err);
            } else {
                if (foundSecret) {
                    res.redirect("/secrets");
                }
            }
        });
    } else {
        User.findByIdAndUpdate(req.user.id, {$pull: {secret: req.body.secret}}, function(err, foundSecret){
            if (err) {
                console.log(err);
            } else {
                if (foundSecret) {
                    res.redirect("/secrets");
                }
            }
        });
    }
});

app.get("/logout", function(req, res){
    req.logout();
    res.redirect("/")
});

app.post("/register", function(req, res){
    User.register({username: req.body.username}, req.body.password, function(err, user){
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect("/secrets")
            });
        }
    })
});

app.post("/login", function(req, res){
   const user = new User({
       username: req.body.username,
       password: req.body.password
   });

   req.login(user, function(err){
       if (err) {
           console.log(err);
       } else {
        passport.authenticate("local")(req, res, function(){
            res.redirect("/secrets")
        });
       }
   })
});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started successfully");
});
