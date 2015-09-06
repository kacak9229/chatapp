// Important Libraries
var express = require('express');
var morgan = require('morgan');
var bodyParser = require('body-parser');
var mongoose = require('mongoose')
//var redis = require('redis').createClient;

var app = express();
var server = require('http').createServer(app);
//var adapter = require('socket.io-redis'); //adress of the redis
//var pub = redis(6379, 'localhost', { auth_pass : "xxxxx"});
//var sub = redis(6379, 'localhost', { detect_buffers : true, auth_pass : "xxxx"});
var io = require('socket.io')(server);
var redis = require('socket.io-redis');
var adapter = redis({ host : 'localhost', port : 6379});
io.adapter(/*adapter({ pubClient : pub, subClient : sub })*/adapter ); //using redis for socket io
/*adapter.pubClient.on('error',function(err){ //redis error handling
   console.error(err);
 });

 adapter.subClient.on('error',function(err){
   console.error(err);
 });
*/


var config = require('./config');
var socketioJwt   = require("socketio-jwt");
var User = require('./app/models/user');

// database configuration
mongoose.connect(config.database, function(err) {
  if (err) {
    console.log(err);
  } else {
    console.log("Connected to the database");
  }
});

// Middlewares
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('dev'));

app.use(express.static(__dirname + '/public'));

var api = require('./app/routes/api');
app.use(api);

app.get('*', function(req, res) {
  res.sendFile(__dirname + '/public/index.html');
});

//Socket.io stuff
io.use(socketioJwt.authorize({
  secret: config.secretKey,
  handshake: true
}));

io.on('connection', function(socket) {


  socket.on('authenticated', function(socket) {
    console.log('authenticated socket ' + socket.decoded_token.username);
    //check if user connected somewhere
    User.findOne({ username : 'socket.decoded_token.username'},function(err,foundUser){
      if(err) console.log(err);


      if(!foundUser) {
        socket.emit({  error : 'this username is no ones'});
      }

      //store the socket id in database.
      //var newUser = new User()
      foundUser.socketId = socket.id;
      foundUser.save(function(err,updateUser){
        if(err) console.error(err);

        console.log('new user joined chat',updatedUser);

        //broadcast new User
        socket.broadcast.emit('newChatter',{ userName : updateUser.username/*, socketId : socket.id*/});
      });

      /*user.socketId = socket.id;*/
      //grab the user listen
      User
        .find({ socketId : {'$ne' : null}})
        .populate('username')
        .exec(function (err, chatters) {
          socket.emit('chatterList', chatters);
        });


      //grab the messages this user received offline and send them to him?
      // OfflineEmail.find({ username : socket.decoded_token.username },function(err,offlineMessages){
      //   if(offlineMessages.length){
      //     socket.emit('offLineMessages', offlineMessages);
      //   }
      // });

      User.find({ username : socket.decoded_token.username },function(err, offlineMessages){
        if(offlineMessages.length){
          socket.emit('offLineMessages', offlineMessages);
        }
      })

    });
    // End of socket.on('authenticated')

    socket.on('disconnect',function(socket) { //unsert socketId from user, and check that one user got updated.
      console.log('received disconnect', socket.id);
      User.update({ socketId : socket.id},{ socketId : null},function(err,updatedThings){
        if(err) console.error(err);

        if(updatedThings.length === 1) console.log ('removed user from chat');
      });
    });

    socket.on('chatTo',function(data){
      console.log('receiven chatTo', data);
      //check if data.sebder!Username is online => that he has a socketId
      User.findOne({ username: data.destinationUsername, socketId : { '$ne' : null}}, function(err,user){
        if(err) {
          return console.error
        }

        if(user){
          io.to(user.socketId).emit('incomingChat',{ senderUsername :  socket.decoded_token.userName , message : data.message});
        }else{
          io.to(socket.id).emit('deliveryError',{ error : 'User ' + data.destinationUsername + ' is not online now'});
          //maybe store the message for later in the database?
        }
      });
    });


    //this socket is authenticated, we are good to handle more events from it.
    console.log('hello! ' + socket.decoded_token.username);
  });

  socket.on('new message', function(data) {
    console.log(socket.decoded_token.username, 'connected');
    console.log('hello! ' + socket.decoded_token.username);
    console.log(data);
    io.emit('new message', {
      message: data,
      username: socket.decoded_token.username
    });
  });

});

// Server is running
server.listen(config.port, function(err) {
  if (err) {
    console.log("Error");
  } else {
    console.log("Server is running on port" + config.port);
  }
});
