var admin = require("firebase-admin");
var bodyParser = require('body-parser');
var admin = require("firebase-admin");
var https = require('https');
var serviceAccount = require("./key.json");

const PORT = 3000;
const VERSION = "/api/v1"
const NEXMO_API_KEY = "b5f8b746"
const NEXMO_API_SECRET = "f9abd12a"

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://gentle-keyword-90702.firebaseio.com"
});

// Get a database reference to our blog
var db = admin.database();
var ref = db.ref("server/fitness");

var express = require('express')
 
var app = express()
app.use(bodyParser.urlencoded({ extended: false }))
// parse application/json
app.use(bodyParser.json())
app.use(express.static('assets'))

// Get user
app.get('/', function(req, res) {
    res.send("It works!")
})

// Get user
app.get(VERSION+'/users/:user_id', function(req, res) {
    var usersRef = ref.child("users/"+req.params.user_id);
    usersRef.on("value", function(snapshot) {
        console.log(snapshot.val());
        res.send(snapshot.val());
    }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
    });

})

// Update steps
app.post(VERSION+'/users/:user_id/steps', (req, res) => {
    var usersRef = ref.child("users/"+req.params.user_id);
    console.log("REQ BODY:", req.body);
    var response = {}
    // Set next level
    if(req.body.steps < 1000){
        response.level = 1
        response.next_level = { 
            level: 2, 
            steps_required: 2000 
        }
    }else{
        response.level = Math.floor(req.body.steps / 1000) + 1;
        response.next_level = {
            level: response.level + 1,
            steps_required: 1000 * response.level,
        }
    }
    usersRef.update({steps: req.body.steps, level: response.level});
   // res.status(201);
    res.send(response);
})

app.post(VERSION+'/users/create', (req, res) => {
    var usersRef = ref.child("users/"+req.body.user_id);
    usersRef.set(req.body);
    res.send({success: true, status: "added user"});

});

// get matches
app.get(VERSION+'/users/:user_id/matches', function(req, res) {
    var response = {
        current_level : [],
        next_level : []
    };
    var usersRef = ref.child("users/"+req.params.user_id);
    usersRef.on("value", function(snapshot) {

        var currLevel = snapshot.val().level;

        var matchesRef = ref.child("users");

        matchesRef.on("value",function(matchesSnapshot){
            matchesSnapshot.forEach(function(matchSnapshot){
                if(matchSnapshot.key != req.params.user_id){
                    if(matchSnapshot.val().level <= currLevel){
                        response.current_level.push(matchSnapshot.val())
                    }else{
                        response.next_level.push(matchSnapshot.val())
                    }
                }
            });
            res.send(response);
        });

        //   res.send({success:true, user: snapshot.val()})
    }, function (errorObject) {
        console.log("The read failed: " + errorObject.code);
    });

})

app.post(VERSION+'/users/:user_id/like', function(req, res) {
  var likesRef = ref.child("likes");
  var likerId = req.params.user_id;
  var likedUserId = req.body.liked_user_id;
  // var requestParams = { likerId: likerId, likedUserId: likedUserId };
  // likesRef.push(requestParams);

  // initiate like algoright
  matchLikes(likerId, likedUserId);

  res.status(201);
  res.send({});
});

var matchLikes = function(likerId, likedUserId) {
  var likerRef = ref.child("users/" + likerId);
  var likedUserRef = ref.child("users/" + likedUserId);

  likerRef.on("value", function(likerSnapshot) {
    likedUserRef.on("value", function(likedUserSnapshot) {
      notifyUsers(likerSnapshot.val(), likedUserSnapshot.val());
    }, function(errObj) {
      console.log("read failed: " + errObj.code);
    });
  }, function (errorObject) {
    console.log("The read failed: " + errorObject.code);
  });
};

var notifyUsers = function(liker, likedUser) {
  var likerMessageText = "Hey " +
    liker.first_name +
    ", you matched with " +
    likedUser.first_name +
    ". Here's their phone number: " +
    likedUser.phone_number + ". Hope you make a real connection! Yalayuu!";
  notify(liker, likerMessageText);

  var likedUserMessageText = "Hey " +
    likedUser.first_name +
    ", you matched with " +
    liker.first_name +
    ". Here's their phone number: " +
    liker.phone_number + ". Hope you make a real connection! Yalayuu!";
  notify(likedUser, likedUserMessageText);
};

var notify = function(user, text) {
  var data = JSON.stringify({
     api_key: NEXMO_API_KEY,
     api_secret: NEXMO_API_SECRET,
     to: user.phone_number,
     from: "12402240054",
     text: text
  });
  var options = {
     host: 'rest.nexmo.com',
     path: '/sms/json',
     port: 443,
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Content-Length': Buffer.byteLength(data)
     }
  };
  var req = https.request(options);

  req.write(data);
  req.end();

  var responseData = '';
  req.on('response', function(res){
    res.on('data', function(chunk){
      responseData += chunk;
    });

    res.on('end', function(){
      console.log(JSON.parse(responseData));
    });
  });
};

var port = process.env.PORT || PORT
app.listen(port, function() {
    console.log('listening on ' + port)
});
