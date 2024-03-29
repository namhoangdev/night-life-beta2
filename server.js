var express = require("express");
var bodyParser = require("body-parser");
var app = express(app);
var passport = require('passport');
var Strategy = require('passport-twitter').Strategy;
var port = process.env.PORT || 8080;

// var MongoClient = require("mongodb").MongoClient;
var Yelp = require('yelp');
var mongoose = require("mongoose");
var location = require("./models/locations");


var yelp = new Yelp({
  consumer_key: '59teSMnBe8QuIdBFVwpGPQ',
    consumer_secret: 'Qbrfn7PNwfp-f8ln5lnkv9CjHKU',
    token: 'YOG6h9UmK36LdRyeX1yLJmMRL96lpH3f',
    token_secret: 'frBcW6_Pko7yQ7uqbQlnNGszNSo',
});
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost/myDatabase');
mongoose.Promise = global.Promise;
// poll.remove({}, function(){}); 
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true })); 
passport.use(new Strategy({
  consumerKey: "NBjIJS0yrGBiyiL2kkfDioeIz",
  consumerSecret: "15G6kEy31ipkWqWLXIyUYmyqTNkqY0PHk2yMlbgaGrwoDevdJ4",
  callbackURL: 'https://life-night-namhoang.herokuapp.com/login/twitter/return'
},
                          function(token, tokenSecret, profile, cb) {
  // In this example, the user's Twitter profile is supplied as the user
  // record.  In a production-quality application, the Twitter profile should
  // be associated with a user record in the application's database, which
  // allows for account linking and authentication with other identity
  // providers.
  return cb(null, profile);
}));
passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});
// app.use(require('morgan')('combined'));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'keyboard cat', resave: true, saveUninitialized: true }));

// Initialize Passport and restore authentication state, if any, from the
// session.
app.use(passport.initialize());
app.use(passport.session());
app.get('/',function(req,res){
  // // console.log(req.user);
  res.render('home', { user: req.user });
});

app.get('/home',function(req,res){
    res.render('home',{user :req.user});
})

app.get('/login',passport.authenticate('twitter'));
app.get('/login/twitter/return', 
        passport.authenticate('twitter', { failureRedirect: '/login' }),
        function(req, res) {
  res.redirect('/');

});

app.get('/logout',function(req, res) {
    req.logout();
    res.redirect('/');
})
app.get('/getBar',function(req,res){
  var user ;
  if(req.user) user = req.user;
  else user = "";
  var loc = req.query.loc;
  
  yelp.search({ term: 'bar', location: loc })
  .then(function (data) {
    
    var lat = data.region.center.latitude;
    
    location.find({
      locationId : lat
    },function(err,data2){
      
      if(err) console.log(err);
      else {
        if(data2.length==0){
          var newLocation2 = newLocation(data);
          
            res.json({"location":newLocation2,"user":user});
            
        } else {
          
          res.json({"location":data2,"user":user});
        }
        }
      
      }
    
    );
    
    
    // console.log(data.region);
    // res.json(data);
  })
  .catch(function (err) {
    console.error("err:"+err);
    res.json("error");
  });
})

var newLocation = function addLocation(data){
  var listBar = [];
  

  var bars = data.businesses;
  for (var i=0;i<bars.length;i++){
    var bar ={
      id : bars[i].id,
      img : bars[i].image_url ,
      title : bars[i].name ,
      description : bars[i].snippet_text ,
      listUser : []
    }
    listBar.push(bar);
    
  }
  var newLocation  = new location({
    locationId : data.region.center.latitude,
    listBar : listBar 
  });
  newLocation.save(err=>{
		  
	if(err){
		    
  	console.log("Add failed");
	}
  });
  return newLocation;
 
}


app.get('/going',function(req,res){
  if(!req.user){
    res.redirect('/login');
  } else {
   
    // find the bar that user click going
    var userId = req.user.id;
    var id = req.query.id;
    
   var idBar = id.split("?")[0];
   
   var locId = req.query.id.split("=")[1].split("?")[0];
   var check = id.split("=")[2];
   console.log(check);
   location.findOne({
     locationId : locId
   }, function(err,data){
     if(err) console.log(err);
     else {
       
       for(var i=0;i<data.listBar.length;i++){
        
         if(data.listBar[i].id==idBar){
           
           var tmp = {
             userId : userId
           }
           if(check=="false") {
             console.log("Go to push");
             data.listBar[i].listUser.push(tmp);
           } else {
             
             for(var j=0;j<data.listBar[i].listUser.length;j++) {
               if(data.listBar[i].listUser[j].userId == userId) {
                 data.listBar[i].listUser.splice(j,1);
                 break;
               }
             }
             
           }
          console.log(data.listBar[i].listUser);
           break;
         }
       }
       
       
      data.save (function(err){
        if(err) console.log("save err"+err);
      });
     }
   })
   res.redirect(req.get('referer'));
  
   
  }
})

app.listen(port,function(err){
    if(err) console.error(err);
    console.log("Server start with port: " + port);
})