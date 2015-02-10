/*
 * oSDK Cobrowsing module.
 */
(function (oSDK) {
  "use strict";

  // Module namespace
  var module = new oSDK.utils.Module('cobrowsing');

  // Module specific DEBUG.
  module.debug = true;

  module.disconnectInitiator = null;

  module.defaultConfig = {
    cobrowsing: {
      server: {
        proto: 'wss',
        port: 8443,
        host: '192.168.2.161' // TODO: priority to host and other connection parameters from gotTempCreds event.
      }
    }
  };

  module.initialize = function (data) {

    module.stompClient = Stomp.client(module.config('server.proto') + '://' + module.config('server.host') + (module.config('server.port') ? ':' + module.config('server.port') : ''));

    module.stompClient.connect(data.username, data.password, function connectCallback (event) {
      module.trigger('connected');

      module.log('connectCallback', event);

      module.selfSubscribe = module.stompClient.subscribe("/queue/" + data.id, function selfSubscribeMessage (event) {
        module.log('selfSubscribe', event);
      });

      module.stompClient.send('/queue/' + data.id, {}, 'ttttest');

    }, function errorCallback (event) {
      module.trigger(['connectionFailed'], new module.Error({
        message: "Cobrowsing server connection error.",
        ecode: '0001',
        data: event
      }));
      module.disconnectInitiator = 'system';
      module.disconnect();
    });

  };

  module.disconnect = function cobrowsingDisconnect() {
    var initiatorObject = module.disconnectInitiator !== null ? { initiator: module.disconnectInitiator } : {};
    module.stompClient.disconnect(function stompDisconnect () {
      module.trigger('disconnected', initiatorObject);
      module.disconnectInitiator = null;
    });
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
    module.disconnectInitiator = data.initiator;
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
