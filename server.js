var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);

// var path    = require("path");
// app.get('/', function (req, res) {
  // res.sendFile(path.join(__dirname+'/index.html'));
// });

// serve the static content ====================================================

    console.log("APP SETTING = "+app.settings.env);
if (app.settings.env === 'development') {
  var webpackConfig = require('./webpack.config.js')
  var compiler = require('webpack')(webpackConfig)
  var devMiddleware = require('webpack-dev-middleware')(compiler, {
    publicPath: webpackConfig.output.publicPath,
  })
  var hotMiddleware = require('webpack-hot-middleware')(compiler)

  app.use(devMiddleware)
  app.use(hotMiddleware)
} else {
    app.use(express.static(__dirname + '/public'));
}


app.use('/client', express.static(__dirname + '/client'));
// app.use('/', express.static(__dirname));

// app.get('/desktop', function(req, res){
//   res.sendfile('desktop/index.html');
// });

io.on('connection', function(socket){
  console.log('a user connected ' + socket.id);
  socket.on('disconnect', function(){
    console.log('user disconnected ' + socket.id);
  });
  socket.on('message-from-device',function(data) {
    console.log('Received data from the device ' + socket.id + ', sending to Enact-tool');
    io.emit('message-from-server', data);
  })
});

// io.sockets.on('connection', function (socket) {
//     // socket.emit('message', { message: 'welcome to the chat' });
//     socket.on('send', function (data) {
//         io.sockets.emit('message', data);
//     });
// });

let port = 3000;
http.listen(port, function(){
  console.log('listening on *:'+port);
});