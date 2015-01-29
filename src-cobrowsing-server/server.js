// Secure web socket server + https server; by sergey.krasnikov@teligent.ru

var webSocketServer = (function () {

  // Includes
  var events = require("events");
  var fs = require('fs');
  var https = require('https');
  var mysql = require('mysql');
  var path = require("path");
  var url = require('url');
  var util = require('util');
  var websocket = require('websocket').server;

  // Configuration
  var config = require("./server-config.js").config;

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


  // Events
  eventManager.on('userdb.connected', function (initData) {

    httpsServer = https.createServer(initData.httpsOptions, function(request, response) {
      console.log(new Date(), ' Received request from ', request.connection.remoteAddress, ' for ' + request.url, request.headers['user-agent']);

      var rheader = request.headers['authorization'] || '',
        atoken = rheader.split(/\s+/).pop() || '',
        aauth = new Buffer(atoken, 'base64').toString(),
        aaparts = aauth.split(':'),
        id = decodeURIComponent(aaparts[0]),
        username = id.split('@')[0],
        domain = id.split('@')[1],
        password = decodeURIComponent(aaparts[1]),
        userPassed = authUsers ? false : true;


      var passwordgenerated = expDate+':'crypto.createHmac('sha1', password).update(expDate':'+username).digest('base64');
      console.log(passwordgenerated);


      // Authorization by static array.
      if (Array.isArray(authUsers)) {
        console.log('got users', authUsers,' checking auth header', rheader,atoken,aauth, aaparts);

        authUsers.forEach(function (userObject) {
          if (userObject.id == id && userObject.password == password) {
            userPassed = true;
            return;
          }
        });
      } else if (authUsers == 'mysql') {
        // Authorization by mysql database
        var userQuery = mysqlConnection.query(config.basicAuthMysql.query, [username, domain, password], function(err, results) {
          if (err) {
            console.log('User query got error.', err);
            eventManager.emit('auth.rejected', "User query got error", response);
            return;
          } else if (!results.length) {
            eventManager.emit('auth.rejected', "Wrong id or password", response);
            return;
          } else {
            eventManager.emit('auth.granted', "Websocket only.", response);
          }
          console.log(results);
        });
        console.log(userQuery.sql);
        return;
      }

      if (!userPassed) {
        eventManager.emit('auth.rejected', "Wrong id or password", response);
      } else {
        eventManager.emit('auth.granted', "Websocket only.", response);
      }

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
      console.log('Got WS request', request);

      var connection = request.accept(null, request.origin);
      console.log((new Date()) + ' Connection accepted from ' + connection.remoteAddress, ' Origin:', request.origin);

      connection['data'] = { 'name': false };

      clients.push(connection);

      console.log('Number of connected clients: ', clients.length);


      // This is the most important callback for us, we'll handle
      // all messages from users here.
      connection.on('message', function(message) {
        var justGotName = false;
        var senderName = false; //имя(ид текущего клиента)
        var incomingData = false; //распарсенные пришедшие данные
        var systemCommand = false; //системная команда
        var clientNameError = false; //если имя клиента неправильное, тут будет ошибка
        if (message.type === 'utf8') {
          // process WebSocket message
          console.log((new Date()) + ' Received Message ' + message.utf8Data);

          incomingData = JSON.parse(message.utf8Data);

          //находится клиент, получаются дополнительные данные (или заполняется имя)
          clients.forEach(function (client, index) {
            //присвоение имени клиенту
            if (client == connection) {
              if (!client['data']['name'] && typeof incomingData['name'] != 'undefined') {
                senderName = incomingData['name'];
                clientNameError = clientNameInvalid(senderName);
                if (clientNameError) {
                  sendError(client, clientNameError, 'disconnect');
                  connection.close();
                  return;
                }

                client['data']['name'] = senderName;

                justGotName = true;

                //отправка клиенту общей истории
                client.send(JSON.stringify(history.getAll()), sendCallback);
              }
              else {
                senderName = client['data']['name'];
              }
              return false;
            }
          });

          //Обновление истории
          if (justGotName) {
            //обновление общей истории сообщением о подключении клиента
            console.log({'message': 'Connected '+ senderName});
            //отправка всем актуального клиентлиста
          }
          else {

            //валидация текстового сообщения от юзера
            if (incomingData['message']) {
              if (incomingData['message'].length > config.clientTextMessageMaxChars) {
                sendError(client, 'Message is longer then '+ config.clientTextMessageMaxChars + ' characters.', 'warning');
                return;
              }
            }

            if (incomingData['message'] && !incomingData['to']) {
              //системное сообщение TODO: пока не защищённое правами админа
              if (incomingData['message'].charAt(0) == '/') {
                systemCommand = true;

                //ду самсинг ниат
                switch(incomingData['message']) {
                  case '/deleteHistory':
                    history.clearAll();
                    connection.send(JSON.stringify([{'system': 'History cleared.'}]), sendCallback);
                  break;
                }
              }
              else {
                console.log({'senderName': senderName, 'message': incomingData['message']});
              }
            }
          }

          //рассылка сообщений
          if (!systemCommand) {
            clients.forEach(function (client, index) {
              var allowSend = false;
              var content = [];

              //разруливается приватность сообщения
              if (!incomingData['to']) {
                allowSend = true;
              }
              else {
                //сообщение конкретным юзерам
                [].concat(incomingData['to']).forEach(function (clientName, index) {
                  if (client['data']['name'] == clientName) {
                    allowSend = true;
                  }
                });
              }

              //разруливается содержание сообщения
              if (incomingData['message'] || justGotName) {
                //обычное сообщение
                if (!incomingData['to']) {
                  //публичное
                  content.push(history.getLast());
                }
                else {
                  //приватное
                  //TODO: добавить серверное время в сообщение
                  content.push({'message': incomingData['message'], 'senderName': senderName, 'private': true});
                }
              }
              ['sdp', 'candidate', 'terminate'].forEach(function (msgType) {
                if (incomingData[msgType]) {
                  var outMsg = { 'senderName': senderName };
                  outMsg[msgType] = incomingData[msgType];
                  content.push(outMsg);
                }
              });

              //отсылка того, что получилось
              if (allowSend && content) {
                client.send(JSON.stringify(content), sendCallback);
              }
            });
          }

        }
        //с бинарной датой пока ничего не делаем
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
        console.log((new Date()) + " Peer disconnected.");

        //ищем, кто отрубился
        clients.forEach(function (client, index) {
          var name = false;
          if (!client.connected) {

            //удаляем его из массива клиентов
            clients.splice(index, 1);

            name = client['data']?client['data']['name']:false;

            //если у отрубившегося было имя, надо всем рассказать что он отрубился
            if (name) {

              //обновление истории
              console.log({'message': 'Disconnected '+ name});
              console.log((new Date()) + " Disconnected", name);
              //сообщение что отрубился клиент для других клиентов, если у клиента есть наши данные (т.е. клиент был в чате, а не реджектился сразу из-за каких-нибудь проблем)
              clients.forEach(function (clientTo, clientToIndex) {
                if (clientTo.connected && clientTo['data']) {
                  clientTo.send(JSON.stringify([history.getLast()]), sendCallback);
                }
              });
            }
          }
        });

        console.log('Number of connected clients: ', clients.length);
      });
    });
  });

  eventManager.on('auth.granted', function (message, response) {
    console.log('Auth granted.');
    response.writeHead(200, {
      'Content-Length': message.length,
      'Content-Type': 'text/plain'
    });
    response.end(message);
  });

  eventManager.on('auth.rejected', function (message, response) {
    console.log('Auth rejected.');
    response.writeHead(401, {
      'Content-Length': message.length,
      'Content-Type': 'text/plain',
      'WWW-Authenticate': 'Basic realm="Rejected."'
    });
    response.end(message);
  });

  var originIsAllowed = function (originForCheck, requestHost) {
    console.log('Checking origin ', originForCheck, ' for allowance');
    var originFound = false;
    if (config.allowedOrigins[0] == '*') {
      originFound = true;
    } else if (config.allowedOrigins[0] == 'same' && 'https://' + requestHost == originForCheck) {
      originFound = true;
    } else {
      config.allowedOrigins.forEach(function (host) {
        console.log('checking origin', originForCheck, 'against host https://' + host + ':' + config.port );
        if ('https://' + host + ':' + config.port == originForCheck) {
          originFound = true;
          return false;
        }
      });
    }

    return originFound;
  };


  // Double same client in one session check
  var clientNameExists = function (name) {
    var nameFound = false;
    clients.forEach(function (client, index) {
      if (client['data']['name'] == name) {
        nameFound = true;
        return false;
      }
    });
    if (nameFound) {
      return true;
    }
    return false;
  };

  //тестирует имя клиента на валидность
  var clientNameInvalid = function (clientName) {
    if (clientNameExists(clientName)) {
      return 'This name has already taken.';
    }
    else if (!config.clientNamePattern.test(clientName)) {
      return 'Incorrect symbols in name.';
    }
    else if (clientName.length > config.clientNameMaxChars) {
      return 'Name must be not longer than ' + config.clientNameMaxChars + ' characters.';
    }
    return false;
  };

  //universal callback to our sendings
  var sendCallback = function (err) {
    if (err) console.error("send() error: " + err);
  };

  var sendError = function (clientObject, messageText, messageType) {
    clientObject.send(JSON.stringify([{
      'error': messageText,
      'type': messageType
    }]), sendCallback);
  };



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

      if (authUsers == 'mysql') {
        // Connecting to mysql.
        mysqlConnection = mysql.createConnection({
          host     : config.basicAuthMysql.host + (config.basicAuthMysql.port ? (':' + config.basicAuthMysql.port) : ''),
          user     : config.basicAuthMysql.user,
          password : config.basicAuthMysql.password
        });
        mysqlConnection.connect(function(err) {
          if (err) {
            throw err;
          }
          initData.authmysql = true;
          eventManager.emit('userdb.connected', initData);
          console.log('Connected to users database as id ' + mysqlConnection.threadId);

        });
      } else {
        initData.authstatic = true;
        eventManager.emit('userdb.connected', initData);
      }

    }
  };
})();

webSocketServer.initialize();
