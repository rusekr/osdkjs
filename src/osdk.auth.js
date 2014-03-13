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
    'disconnected': true, 
    'connectionFailed': true
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
    auth.loginCheck(true);

    // Perform a ephemerals request
    oSDK.oajax({
      
      url: oSDK.config.apiServerURL+oSDK.config.credsURI,
      type: 'get',
      headers: {'Authorization':'Bearer '+oSDK.config.appToken},
      jso_provider: "opensdp",
      jso_allowia: true,
      jso_scopes: [oSDK.config.testScope],
      data: {
        service: 'sip' // FIXME: needed?
      },
      success: function(data) {
        if(data.error) {
          oSDK.err("got error:", data);
          oSDK.trigger('connectionFailed', { 'error': data.error });
        } else {
          
          // Filling user client sturcture
          clientInfo.id = data.username.split(':')[1];
          clientInfo.domain = clientInfo.id.split('@')[1];
          
          oSDK.trigger('auth.gotTempCreds', { 'data': data });

        }
      },
      error: function(jqxhr, status, string) {
        oSDK.log("Got error:", 'Server error.', jqxhr, status, string);
        
        // Force new token autoobtaining if old token returns 401.
        if (jqxhr.status === 401) {
          auth.loginCheck(true);
        }

        // If all is ok with token - throw connectionFailed event.
        
        oSDK.trigger('connectionFailed', { 'error': 'Server error' });
      }
    });

  };
  // Imperative disconnection from openSDP network
  auth.disconnect = function () {
    //TODO: Upgrade direct use to augmenting handler for disconnect by sip module.
    oSDK.sip.stop();
  };

  auth.loginCheck = function (agressive) {
    
    // If we need to connect after redirect (no errors returned from oauth server)
    if(window.location.hash.match(/access_token/) && !window.location.hash.match(/error/)) {

      oSDK.log('jso checking for token in hash');
      //TODO: make one from two
      jso_configure({
        "opensdp": {
          client_id: oSDK.config.appID,
          redirect_uri: window.location.href.replace(/\?.*$|#.*$/, ''),
          authorization: oSDK.config.apiServerURL+oSDK.config.authURI,
          presenttoken: 'qs', // User token goes to querystring
          default_lifetime: 3600
        }
      });
      
      jso_checkfortoken('opensdp');
      
      if(localStorage.getItem('osdk.connectAfterRedirect')) {
        oSDK.log('got connectAfterRedirect. Cleaning. Logining.');
        localStorage.removeItem('osdk.connectAfterRedirect');
        auth.connect();

      }

    } else {
      if(agressive) {

        oSDK.log('Jso ensuring tokens');
        localStorage.setItem('osdk.connectAfterRedirect', true);

        jso_configure({
          "opensdp": {
            client_id: oSDK.config.appID,
            redirect_uri: window.location.href.replace(/\?.*$|#.*$/, ''),
            authorization: oSDK.config.apiServerURL+oSDK.config.authURI,
            presenttoken: 'qs', // User token goes to querystring
            default_lifetime: 3600
          }
        });
        
        jso_ensureTokens({
          "opensdp": [oSDK.config.testScope],
          // "facebook": ["read_stream"],
          // "instagram": ["basic", "likes"]
        });
      
        oSDK.log('set localStorage.osdk.connectAfterRedirect', localStorage.getItem('osdk.connectAfterRedirect'));
    
      }
    }

  };
  
  
  auth.clientInfo = {
    id: function () {
      return clientInfo.id;
    },
    domain: function () {
      return clientInfo.domain;
    }
  };

  oSDK.jq(function () {
    oSDK.log('window.onload');
    //FIXME: without timeout fires earlier than in-app osdk initializator, for example we can try to find appID in own config now and every 0.5s for 5 attempts then assume we got client config and start autologin
    setTimeout(function () {
      auth.loginCheck(false); 
    },1000);
  });
  
  oSDK.jq(window).on('beforeunload', function (event) {
    oSDK.log('window.onload');
    // TODO: handle gracefully auth redirection page unload.
    // trying to quit gracefully  
//       if(rtcSession && rtcSession.terminate) {
//         rtcSession.terminate();
//       }
    
//       instance.stop();

  });
  
  // Direct bindings to namespace
  //TODO: make this bindings automatic by registering module function
  oSDK.auth = auth;
  oSDK.connect = oSDK.auth.connect;
  oSDK.disconnect = oSDK.auth.disconnect;
  oSDK.clientInfo = oSDK.auth.clientInfo;

})(oSDK);
