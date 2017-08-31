var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var ip = require("ip");
const fs = require('fs');

// console.dir ( "CHACKINGASF => "+ ip.address() );

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
    app.use(express.static(__dirname + '/dist'));
}

// app.use('/client', express.static(__dirname + '/client'));
// app.use('/', express.static(__dirname));

// app.get('/desktop', function(req, res){
//   res.sendfile('desktop/index.html');
// });

io.on('connection', function(socket){
  console.log('a user connected ' + socket.id);
  socket.on('disconnect', function(){
    console.log('user disconnected ' + socket.id);
  });
  socket.on('message-save-file', function(data) {
    // const content = JSON.stringify(data);

    let fileContent = JSON.stringify(data.content)
    let filePath = `./savedProjects/${data.fileName}.json`
    let backupFilePath = `./savedProjects/backups/${(new Date()).getTime()-${data.fileName}}.json`

    for (let path of [filePath,backupFilePath]) {
      fs.writeFile(path, fileContent, 'utf8', function (err) {
          if (err) {
              return console.log(err);
          }
          console.log(`File ${path} was saved!`);
      });
    }
  })
  socket.on('message-from-device',function(data) {
    // console.log('Received data from the device ' + socket.id + ', sending to Enact-tool');

    // sending to all clients except sender
    socket.broadcast.emit('message-from-device',data);
  })
  socket.on('message-from-desktop',function(data) {
    // THIS SHOULD SEND THE VisualStateCanvasHTML as the message of the data
    // console.log("Received something from desktop")
    socket.broadcast.emit('message-from-server',data);
  })
});

// const execFile = require('child_process').execFile;

// function launchHeadlessChrome(url, callback) {
//   // Assuming MacOSx.
//   const CHROME = '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome';
//   execFile(CHROME, ['--headless', '--disable-gpu', '--remote-debugging-port=9222', url], callback);
// }

// launchHeadlessChrome(`http://${ip.address()}:3000/mobile.html`, (err, stdout, stderr) => {
//   console.log("launchHeadlessChrome >>>>")
//   console.log(stdout)
// });

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