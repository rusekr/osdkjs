// Secure web socket server + https server; by sergey.krasnikov@teligent.ru

var webSocketServer = (function () {

  // Includes
  var crypto = require('crypto');
  var events = require('events');
  var fs = require('fs');
  var https = require('https');
  var path = require('path');
  var url = require('url');
  var util = require('util');
  var websocket = require('websocket').server;

  // Configuration
  var config = require('./server-config.js').config;

  // Variables
  var eventManager = new events.EventEmitter();
  var httpsServer = null;
  var wsServer = null;
  var mysqlConnection = null;
  var clients = [];
  var rooms = [];
  var authUsers = false;
  try {
    authUsers = [].concat(JSON.parse(fs.readFileSync(config.basicAuthFile)));
  } catch (e) {
    if (config.basicAuthMysql && config.basicAuthMysql.host) {
      authUsers = 'mysql';
    } else {
      authUsers = [].concat(config.basicAuth);
    }
  }
  config.clientNamePattern = new RegExp('^[' + config.clientNamePattern + ']+$', 'i');
  config.allowedOrigins = [].concat(config.allowedOrigins); // Our valid config.allowedOrigins for clients and which we are listen
  config.listenerIPs = [].concat(config.listenerIPs);

  return {
    initialize: function () {

      var initData = {};

      //checking cert files
      initData.httpsOptions = {};
      if (fs.existsSync(config.cert.key)) {
        initData.httpsOptions['key'] = fs.readFileSync(config.cert.key);
        initData.httpsOptions['cert'] = fs.readFileSync(config.cert.cert);
        if (config.cert['ca']) {
          initData.httpsOptions['ca'] = [];
          [].concat(config.cert['ca']).forEach(function (ca, idx) {
            initData.httpsOptions['ca'].push(fs.readFileSync(ca));
          });
        }
      }
      else if (fs.existsSync(config.cert.pfx)) {
        initData.httpsOptions['pfx'] = fs.readFileSync(config.cert.pfx);
      }
      else {
        throw new Error('No certificate files found. Exiting.');
      }

      httpsServer = https.createServer(initData.httpsOptions, function (request, response) {

        var message = 'Websocket only.';
        response.writeHead(200, {
          'Content-Length': message.length,
          'Content-Type': 'text/plain'
        });
        response.end(message);
      });

      // HTTPS server port binding
      config.listenerIPs.forEach(function (serverIP) {
        httpsServer.listen(config.port, (serverIP != '*'?serverIP:null), function() {
          console.log((new Date()) + "Https server is listening on ip:", serverIP, 'and port:', config.port);
        });
        if (serverIP == '*') {
          return false;
        }
      });

      // Websocket server creation over http server
      wsServer = new websocket({
        httpServer: httpsServer,
        // You should not use autoAcceptConnections for production
        // applications, as it defeats all standard cross-origin protection
        // facilities built into the protocol and the browser.  You should
        // *always* verify the connection's origin and decide whether or not
        // to accept it.
        autoAcceptConnections: false
      });

      //web socket connection request from client handling
      wsServer.on('request', function(request) {
        console.log((new Date()), 'Got connection request');

        var connection = request.accept(null, request.origin);

        console.log((new Date()), 'Connection accepted from ' + connection.remoteAddress, ' Origin:', request.origin);

        clients.push(connection);

        console.log((new Date()), 'Number of connected clients: ', clients.length);


        // This is the most important callback for us, we'll handle
        // all messages from users here.
        connection.on('message', function(message) {
          console.log((new Date()), 'Got message', message);

          if (message.type === 'utf8') {

            try {
              message = JSON.parse(message.utf8Data);
            } catch (error) {
              message = {};
              console.warn('Incoming message format undefined.');
              // Disconnecting client;
              connection.send(JSON.stringify({
                authorization: {
                  status: 'rejected',
                  message: 'Incoming message format undefined.'
                }
              }));
              connection.close();
            }

            // Authorizing users by first message.
            if (message.authorization) {
              var nowDate = (new Date()).getTime();
              var expDate = message.authorization.username.split(':')[0];
              var username = message.authorization.username;
              var password = crypto.createHmac('sha1', config.secret).update(username).digest('base64');

              if(password != message.authorization.password || parseInt(expDate)*1000 < nowDate) {
                console.log('Username or password incorrect.');
                // Disconnecting client;
                connection.send(JSON.stringify({
                  authorization: {
                    status: 'rejected',
                    message: 'Wrong username or password.'
                  }
                }));
                connection.close();
              } else {
                connection.send(JSON.stringify({
                  authorization: {
                    status: 'granted'
                  }
                }));
              }

            } else if (message.createRoom) {

            }




          }

          //           var justGotName = false;
//           var senderName = false;
//           var incomingData = false;
//           var systemCommand = false;
//           var clientNameError = false;
//           if (message.type === 'utf8') {
//             // process WebSocket message
//             console.log((new Date()) + ' Received Message ' + message.utf8Data);
//
//             incomingData = JSON.parse(message.utf8Data);
//
//
//             if (justGotName) {
//
//               console.log({'message': 'Connected '+ senderName});
//
//             }
//             else {
//
//
//               if (incomingData['message']) {
//                 if (incomingData['message'].length > config.clientTextMessageMaxChars) {
//                   sendError(client, 'Message is longer then '+ config.clientTextMessageMaxChars + ' characters.', 'warning');
//                   return;
//                 }
//               }
//
//               if (incomingData['message'] && !incomingData['to']) {
//
//                 if (incomingData['message'].charAt(0) == '/') {
//                   systemCommand = true;
//
//
//                   switch(incomingData['message']) {
//                     case '/deleteHistory':
//                       history.clearAll();
//                       connection.send(JSON.stringify([{'system': 'History cleared.'}]), sendCallback);
//                     break;
//                   }
//                 }
//                 else {
//                   console.log({'senderName': senderName, 'message': incomingData['message']});
//                 }
//               }
//             }
//
//
//             if (!systemCommand) {
//               clients.forEach(function (client, index) {
//                 var allowSend = false;
//                 var content = [];
//

//                 if (!incomingData['to']) {
//                   allowSend = true;
//                 }
//                 else {
//
//                   [].concat(incomingData['to']).forEach(function (clientName, index) {
//                     if (client['data']['name'] == clientName) {
//                       allowSend = true;
//                     }
//                   });
//                 }
//
//
//                 if (incomingData['message'] || justGotName) {
//
//                   if (!incomingData['to']) {
//
//                     content.push(history.getLast());
//                   }
//                   else {
//
//                     content.push({'message': incomingData['message'], 'senderName': senderName, 'private': true});
//                   }
//                 }
//                 ['sdp', 'candidate', 'terminate'].forEach(function (msgType) {
//                   if (incomingData[msgType]) {
//                     var outMsg = { 'senderName': senderName };
//                     outMsg[msgType] = incomingData[msgType];
//                     content.push(outMsg);
//                   }
//                 });
//
//                 if (allowSend && content) {
//                   client.send(JSON.stringify(content), sendCallback);
//                 }
//               });
//             }
//
//           }
  //           else if (message.type === 'binary') {
  //             console.log('Received Binary Message of ' + message.binaryData.length + ' bytes');
  //
  //             clients.forEach(function (client) {
  //               if (client != connection) {
  //                 client.sendBytes(message.binaryData, sendCallback);
  //               }
  //             });
  //           }
        });

        connection.on('close', function(status) {
          // close user connection
          console.log((new Date()), "Peer disconnected.");

          clients.forEach(function (client, index) {
            var name = false;
            if (!client.connected) {

              clients.splice(index, 1);

            }
          });

          console.log('Number of connected clients: ', clients.length);
        });
      });









    }



  };
})();

webSocketServer.initialize();
