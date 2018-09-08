// Setup basic express server
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 3000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static('public'));

// Chatroom

var playerData = {};
var nextPlayerID = 1;

io.on('connection', function (socket) {

  socket.avatarID = nextPlayerID++;
  // socket.color = '#'+Math.floor(Math.random()*16777215).toString(16);
  socket.emit('connection-success', socket.avatarID);

  //   when the user disconnects.. perform this
  socket.on('disconnect', function () {
    socket.emit('consolelog', "player leaving " + socket.avatarID);
    if (socket.avatarID === undefined) {
      return;
    }
    delete playerData[socket.avatarID];
    socket.broadcast.emit('player-left', socket.avatarID);

  });

  socket.on('player-joining', function (data) {
    playerData[socket.avatarID] = data;
    //broadcast new player info to existing players
    socket.broadcast.emit('player-joined', socket.avatarID, playerData[socket.avatarID]);
    //get all previous existing players positions to this new player
    socket.emit('join-successful', playerData);
  });

  socket.on('reload', function () {
    playerData = {};
    socket.emit('reload-broadcasted');
    socket.broadcast.emit('reload-broadcasted');
  });

  socket.on('headset-rotating', function (data) {
    newData = Object.assign(playerData[socket.avatarID], data);
    playerData[socket.avatarID] = newData;
    socket.broadcast.emit('headset-rotated', socket.avatarID, newData);
  });


});