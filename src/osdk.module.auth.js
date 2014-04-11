/*
 * oSDK auth module
 */
(function (oSDK) {
  "use strict";

  // Registering module in oSDK
  var moduleName = 'auth';

  var attachableNamespaces = {
    'auth': true,
    'clientInfo': true,
  };

  var attachableMethods = {
    'connect': true,
    'disconnect': true,
    'isAuthorized': true // Is user token alive?
  };

  var attachableEvents = {
    'initialized': true,
    'loaded': true,
    'gotTempCreds': ['auth.gotTempCreds', 'core.gotTempCreds'],
    'connected': ['auth.connected', 'core.connected'],
    'disconnected': ['auth.disconnected', 'core.disconnected'],
    'connectionFailed': ['auth.connectionFailed', 'core.connectionFailed']
  };

  oSDK.utils.attach(moduleName, {
    namespaces: attachableNamespaces,
    methods: attachableMethods,
    events: attachableEvents
  });

  // Module namespace
  var auth = {};

  // Status (disconnected, connecting, connected, disconnecting)
  auth.status = 'disconnected';

  var clientInfo = {
    id: null,
    domain: null
  };

  // Connection to openSDP network
  auth.connect = function () {
    if(auth.status == 'connected' || auth.status == 'connecting') {
      return;
    }
    auth.status = 'connecting';

    // Checking user token
    if(!auth.tokenCheck(true)) {
      // No token, waiting for second try after auth in popup or redirect
      return;
    }

    // Perform a ephemerals request
    // TODO: fix ajax
    oSDK.utils.oauth.ajax({

      url: oSDK.config.apiServerURL+oSDK.config.credsURI,
      type: 'post',
      oauthType: 'both',
      data: {
        //service: 'sip' // FIXME: needed?
      },
      success: function(data) {
        data = JSON.parse(data);
        if(data.error) {
          oSDK.trigger(['core.connectionFailed'], new oSDK.error({ 'message': data.error, 'ecode': 'auth0002' }));
        } else {

          // Filling user client sturcture
          clientInfo.id = data.username.split(':')[1];
          clientInfo.domain = clientInfo.id.split('@')[1];

          //oSDK.log('auth triggering core.gotTempCreds');
          oSDK.trigger(['auth.gotTempCreds', 'core.gotTempCreds'], { 'data': data });
          //oSDK.log('auth triggering core.connected');
          oSDK.trigger(['auth.connected', 'core.connected']);
        }
      },
      error: function(jqxhr, status, string) {
        // Force new token autoobtaining if old token returns 401.
        if (jqxhr.status === 401) {
          auth.tokenCheck(true);
        }

        // If all is ok with token - throw connectionFailed event.
        oSDK.trigger(['auth.connectionFailed', 'core.connectionFailed'], new oSDK.error({ 'message': 'Server error ' + jqxhr.status, 'ecode': 'auth0001' }));
      }
    });

  };

  // Imperative disconnection from openSDP network (optionally with clearing token
  auth.disconnect = function (clearToken) {
    if(auth.status == 'disconnected' || auth.status == 'disconnecting') {
      return false;
    }
    if(clearToken) {
      oSDK.utils.oauth.clearToken();
    }
    oSDK.trigger(['auth.disconnected', 'core.disconnected']);
  };

  // Returns status of user access token to client.
  auth.isAuthorized = function () {
    return oSDK.utils.oauth.isTokenAlive();
  };

  // Checks if oSDK can invoke connect method (if connected(and connectionFailed?) event has any listeners)
  auth.connectOnGotListener = function () {
    var events  = oSDK.utils.events();
    if(events.connected && events.connected.listeners.length) {
      auth.connect();
    } else {
      setTimeout(function () {
          auth.connectOnGotListener();
      },500);
    }
  };

  // Main function for in-hash token checking, auth popup generation and auth redirect handling
  auth.tokenCheck = function (agressive) {

    oSDK.utils.oauth.configure({
      client_id: oSDK.config.appID,
      redirect_uri: window.location.href.replace(/\?.*$|#.*$/, ''),
      authorization_uri: oSDK.config.apiServerURL+oSDK.config.authURI,
      bearer: oSDK.config.appToken,
      popup: oSDK.config.oauthPopup
    });

    // If we need to connect after redirect (no errors returned from oauth server)
    if(oSDK.utils.oauth.checkUrl()) {
      oSDK.utils.oauth.clearUrl();

      if(oSDK.config.oauthPopup != 'popup' && oSDK.utils.storage.getItem('osdk.connectAfterRedirect')) {
        //oSDK.log('got connectAfterRedirect. Cleaning. Logining.');
        oSDK.utils.storage.removeItem('osdk.connectAfterRedirect');
        // Wait for user app event handlers to autoconnect
        auth.connectOnGotListener();
      }

    } else {
      if(agressive) {
        oSDK.log('Ensuring tokens.');

        if(oSDK.utils.oauth.getToken()) {
          return true;
        }

        if(oSDK.config.oauth != 'popup') {
          oSDK.utils.storage.setItem('osdk.connectAfterRedirect', true);
          //oSDK.log('set oSDK.utils.storage.osdk.connectAfterRedirect', oSDK.utils.storage.getItem('osdk.connectAfterRedirect'));
        }

      }
    }
    return false;
  };

  auth.clientInfo = {
    id: function () {
      return clientInfo.id;
    },
    domain: function () {
      return clientInfo.domain;
    }
  };

  oSDK.on('oauth.gotTokenFromPopup', function (data) {
    //oSDK.log('Setting up main window with oauth config and connecting', data);
    oSDK.utils.oauth.configure(data);
    oSDK.utils.oauth.popup().close();
    oSDK.connect();
  });

  // Proxying main events for internal handling priorities and syncronious firing.
  // Connected event
  oSDK.on('core.connected', function (data) {
    oSDK.utils.resetTriggerCounters('core.disconnected');
    auth.status = 'connected';
    oSDK.trigger('connected', data);
  });
  // Disconnected event
  oSDK.on('core.disconnected', function (data) {
    auth.status = 'disconnected';
    oSDK.trigger('disconnected', data);
  });
  // Proxy for every connectionFailed message
  oSDK.on('core.connectionFailed', function (data) {
    oSDK.utils.resetTriggerCounters('core.connected');
    auth.disconnect();
    oSDK.trigger('connectionFailed', data);
  }, 'every');


  // Instant actions

  // Getting token from storage instantly
  oSDK.utils.oauth.configure();

  // Delayed actions
  document.addEventListener("DOMContentLoaded", function () {
    auth.tokenCheck(false);
    //oSDK.log('window.onload');
  });

  window.onbeforeunload = function (event) {
    //oSDK.log('window.onbeforeunload');
    // TODO: handle gracefully auth redirection page unload.
    // trying to quit gracefully
//       if(rtcSession && rtcSession.terminate) {
//         rtcSession.terminate();
//       }

//       instance.stop();

  };

  // Direct bindings to namespace
  //TODO: make this bindings automatic by registering module function
  oSDK.auth = auth;
  oSDK.connect = oSDK.auth.connect;
  oSDK.disconnect = oSDK.auth.disconnect;
  oSDK.isAuthorized = oSDK.auth.isAuthorized;
  oSDK.logout = oSDK.auth.logout;
  oSDK.clientInfo = oSDK.auth.clientInfo;

})(oSDK);
