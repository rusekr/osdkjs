/*
 * oSDK auth module
 */
(function (oSDK) {

  // Registering module in oSDK
  var moduleName = 'auth';

  var attachableNamespaces = {
    'auth': true,
    'clientInfo': true
  };

  var attachableMethods = {
    'connect': true,
    'disconnect': true
  };

  var attachableEvents = {
    'initialized': true,
    'loaded': true,
    'gotTempCreds': 'auth.gotTempCreds',
    'connected': true,
    'disconnected': ['auth.disconnected', 'disconnected'],
    'connectionFailed': true,
  };

  oSDK.utils.attach(moduleName, {
    namespaces: attachableNamespaces,
    methods: attachableMethods,
    events: attachableEvents
  });

  // Module namespace
  var auth = {};

  var clientInfo = {
    id: null,
    domain: null
  };

  // Connection to openSDP network
  auth.connect = function () {

    oSDK.log('Connecting');

    // Checking user token
    if(!auth.tokenCheck(true)) {
      // No token, waiting for second try after auth in popup or redirect
      return;
    }

    // Perform a ephemerals request
    // TODO: fix ajax
    oSDK.utils.oauth.ajax({

      url: oSDK.config.apiServerURL+oSDK.config.credsURI,
      type: 'get',
      headers: {'Authorization':'Bearer '+oSDK.config.appToken},
      data: {
        //service: 'sip' // FIXME: needed?
      },
      success: function(data) {
        data = JSON.parse(data);
        if(data.error) {
          oSDK.err("got error:", data);
          oSDK.trigger('connectionFailed', { 'error': data.error });
        } else {

          // Filling user client sturcture
          clientInfo.id = data.username.split(':')[1];
          clientInfo.domain = clientInfo.id.split('@')[1];

          oSDK.trigger('auth.gotTempCreds', { 'data': data });
          oSDK.trigger('connected');
        }
      },
      error: function(jqxhr, status, string) {
        oSDK.log("Got error:", 'Server error.', jqxhr, status, string);

        // Force new token autoobtaining if old token returns 401.
        if (jqxhr.status === 401) {
          auth.tokenCheck(true); //TODO: //alert with confirmed redirect?
        }

        // If all is ok with token - throw connectionFailed event.

        oSDK.trigger('connectionFailed', { 'error': 'Server error', 'code': 401 });
      }
    });

  };
  // Imperative disconnection from openSDP network
  auth.disconnect = function () {
    oSDK.trigger('auth.disconnected');
    oSDK.trigger('disconnected');
  };

  auth.tokenCheck = function (agressive) {

    oSDK.utils.oauth.configure({
      client_id: oSDK.config.appID,
      redirect_uri: window.location.href.replace(/\?.*$|#.*$/, ''),
      authorization_uri: oSDK.config.apiServerURL+oSDK.config.authURI,
      bearer: oSDK.config.appToken,
      popup: oSDK.config.oauthPopup
    });

    // If we need to connect after redirect (no errors returned from oauth server)
    if(window.location.hash.match(/access_token/) && !window.location.href.match(/(&|\?)error=/)) {
      oSDK.log('Checking for token in hash');

      oSDK.utils.oauth.checkUrl();
      oSDK.utils.oauth.clearUrl();

      if(oSDK.config.oauthPopup != 'popup' && oSDK.utils.storage.getItem('osdk.connectAfterRedirect')) {
        oSDK.log('got connectAfterRedirect. Cleaning. Logining.');
        oSDK.utils.storage.removeItem('osdk.connectAfterRedirect');
        // FIXME: instead of settimeout wait for user add event listener on connected (and connfailed) and then connect immediately (on never if no user events).
        setTimeout(function () {
          auth.connect();
        },1000);
      }

    } else {
      if(agressive) {
        oSDK.log('Ensuring tokens');

        if(oSDK.utils.oauth.getToken()) {
          return true;
        }

        if(oSDK.config.oauth != 'popup') {
          oSDK.utils.storage.setItem('osdk.connectAfterRedirect', true);
          oSDK.log('set oSDK.utils.storage.osdk.connectAfterRedirect', oSDK.utils.storage.getItem('osdk.connectAfterRedirect'));
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
    oSDK.log('Setting up main window with oauth config and connecting', data);
    oSDK.utils.oauth.configure(data);
    oSDK.utils.oauth.popup().close();
    oSDK.connect();
  });

  document.addEventListener("DOMContentLoaded", function () {
    oSDK.log('window.onload');
    auth.tokenCheck(false);
  });

  window.onbeforeunload = function (event) {
    oSDK.log('window.onload');
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
  oSDK.clientInfo = oSDK.auth.clientInfo;

})(oSDK);
