const PORT = 3000;
const VERSION = "/api/v1"
var admin = require("firebase-admin");
var bodyParser = require('body-parser');

var admin = require("firebase-admin");

var serviceAccount = require("./key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://gentle-keyword-90702.firebaseio.com"
});

// Get a database reference to our blog
var db = admin.database();
var ref = db.ref("server/fitness");

// var uri = "mongodb://kay:disrupt17@mycluster0-shard-00-00-wpeiv.mongodb.net:27017,mycluster0-shard-00-01-wpeiv.mongodb.net:27017,mycluster0-shard-00-02-wpeiv.mongodb.net:27017/admin?ssl=true&replicaSet=Mycluster0-shard-0&authSource=admin";
// MongoClient.connect(uri, function(err, db) {
//       if (err) throw err
//   //db.close();
//     app.listen(PORT, function() {
//         console.log('listening on '+PORT)
//     });
// });

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
console.log(req.params.user_id);
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
            steps_required: (1000 * (response.level + 1)),
        }
    }
    usersRef.update({steps: req.body.steps, level: response.level});
    res.status(201);
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

var port = process.env.PORT || PORT
app.listen(port, function() {
    console.log('listening on ' + port)
});
