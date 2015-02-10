/*
 * oSDK Cobrowsing module.
 */
(function (oSDK) {
  "use strict";

  // Module namespace
  var module = new oSDK.utils.Module('cobrowsing');

  // Module specific DEBUG.
  module.debug = true;

  module.disconnectedByUser = null;

  module.defaultConfig = {
    cobrowsing: {
      server: {
        proto: 'wss',
        port: 8443,
        host: '192.168.2.161' // TODO: priority to host and other connection parameters from gotTempCreds event.
      }
    }
  };

  // Module WebSocket connection.
  module.connection = new module.WebsocketClient();

  module.addConnectionEventListeners = function (authData) {
    module.connection.on('connected', function (event) {
      module.connection.send(JSON.stringify({
        authorization: {
          username: authData.username,
          password: authData.password
      }}));
    });

    module.connection.on('disconnected', function (event) {
      module.log('Got disconnected', event);
      module.disconnect();
    });

    module.connection.on('error', function (event) {
      module.log('Got error', event);
      module.disconnectedByUser = false;
      module.trigger(['connectionFailed'], new module.Error({
        message: "Cobrowsing server connection error.",
        ecode: '0001',
        data: event
      }));
    });

    module.connection.on('message', function (event) {
      module.log('Got message', event);
      var data = JSON.parse(event.data);

      // First message need to be authorization related.
      if (data.authorization) {
        if (data.authorization.status == 'granted') {
          // Connection successfull.
          module.log('Connected to cobrowsing server.');
          module.trigger('connected');
        } else {
          // Connection failed. Server need to disconnect next.
          module.disconnectedByUser = false;
          module.trigger(['connectionFailed'], new module.Error({
            message: "Cobrowsing server wrong username or password.",
            ecode: '0002',
            data: event
          }));
        }
      }
    });
  };

  module.connect = function () {
    module.connection.connect(module.config('server.proto') + '://' + module.config('server.host') + (module.config('server.port') ? ':' + module.config('server.port') : ''));
  };

  module.initialize = function (data) {
    var authData = data;


    module.stompClient = Stomp.client(module.config('server.proto') + '://' + module.config('server.host') + (module.config('server.port') ? ':' + module.config('server.port') : ''));
    var connectCallback = function(event) {
      module.log(event);
    };
    var errorCallback = function(event) {
      module.log(event);
    };
    module.stompClient.connect(authData.username, authData.password, connectCallback, errorCallback);

//     module.addConnectionEventListeners(authData);
//
//     module.connect();

  };

  module.disconnect = function cobrowsingDisconnect() {
    if(module.connection && module.connection.connected) {
      module.connection.close();
    }
    module.trigger(['disconnected'], { initiator: 'system' });
  };

  module.checkCompatibility = function cobrowsingCheckCompatibility() {
    var err;
    if(!window.WebSocket) {
      err = new module.Error({
        ecode: '0004',
        message: 'Your browser do not support WebSocket.'
      });
      module.trigger('incompatible', err);
      throw err;
    }
  };

  // Connection now on gotTempCreds, not ondemand.
  module.on('gotTempCreds', function (event) {
    module.initialize(event.data);
  });

  module.on('DOMContentLoaded', function () {
    module.checkCompatibility();
  });

  // On auth disconnecting event
  module.on('disconnecting', function (data) {
    module.disconnectedByUser = (data.initiator == 'user')?true:false;
    module.disconnect();
  });

  // On other modules connectionFailed event
  module.on('connectionFailed', function (data) {
    module.disconnect();
  });

  module.registerConfig(module.defaultConfig);

  module.registerEvents({
    /*
     * Described in auth module
     */
    'disconnected': { other: true, client: true },

    /*
     * Described in auth module
     */
    'connected': { other: true, client: true },

    /*
     * Described in auth module
     */
    'connectionFailed': { other: true, client: true },

    /*
    * Described in auth module.
    */
    'incompatible': { other: true, client: true }
  });

})(oSDK);
