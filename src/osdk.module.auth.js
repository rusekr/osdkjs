/*
 * oSDK auth module
 */
(function (oSDK) {
  "use strict";

  /**
   * ConnectionAPI allows web-application to connect to openSDP network, disconnect from it gracefully, handle various connection errors and access information about authorization of user in this web-application.
   *
   * @namespace ConnectionAPI
   */

  // Module namespace
  var auth = new oSDK.utils.Module('auth');

  // Status (disconnected, connecting, connected, disconnecting)
  auth.status = 'disconnected';

  var client = {
    id: null,
    domain: null
  };

  var defaultConfig = {
    auth: {
      apiServerURL: 'https://osdp-teligent-dev-apigw.virt.teligent.ru:8243', //TODO: replace this and following with sdk build parameter
      credsURI: '/osdp/sm/common/1.0.1/user/ephemerals',
      authURI: '/authorize/'
    },
    appID: null,
    popup: false
  };

  // For not adding more than one event listener.
  var DOMReadyEventListenerAdded = false;

  // Oauth handling object
  var oauth = (function () {

    var config = {
      popup: true, // When 'false' goes redirect, to string - goes popup options
      client_id: null,
      redirect_uri: null,
      authorization_uri: null,
      bearer: null,
      access_token: null,
      expires_start: null, // Time when got a token
      expires_in: null // Time To Live for token from server
    };

    var authPopup = null;

    return {
      // Configure oauth object
      configure: function (cfgObject) {
        auth.log('oauth configure with config', cfgObject);
        cfgObject = auth.utils.isObject(cfgObject)?cfgObject:{};

        config.access_token = auth.utils.storage.getItem('access_token') || null;
        config.expires_start = auth.utils.storage.getItem('expires_start') || null;
        config.expires_in = auth.utils.storage.getItem('expires_in') || null;

        config = auth.utils.extend(true, {}, config, cfgObject);

        auth.utils.storage.setItem('access_token', config.access_token);
        auth.utils.storage.setItem('expires_start', config.expires_start);
        auth.utils.storage.setItem('expires_in', config.expires_in);

      },
      // Checks hash for token, returns true if token found, return false otherwise, if error throws it
      checkUrl: function () {
        var error = auth.utils.getUrlParameter('error');
        if(error) {
          var error_description = auth.utils.getUrlParameter('error_description');
          // Removing potential connection trigger.
          if (auth.utils.storage.getItem('connectAfterRedirect')) {
            auth.utils.storage.getItem('connectAfterRedirect');
          }
          auth.trigger(['connectionFailed'], { 'message': error + ': ' + error_description, 'ecode': 'auth0010' });
          auth.disconnect();
        }

        var token = auth.utils.hash.getItem('access_token');
        if(token) {
          // Configuring us
          oauth.configure({
              access_token: token,
              expires_in: auth.utils.hash.getItem('expires_in')*1000,
              expires_start: new Date().getTime()
          });

          if(window.opener && window.opener.oSDK) {
            window.opener.oSDK.auth.trigger('gotTokenFromPopup', {
              access_token: config.access_token,
              expires_in: config.expires_in,
              expires_start: config.expires_start
            });
          }

          return true;
        }

        // TODO: No error and no token case?
        return false;
      },
      // Clears url from token stuff
      clearUrl: function () {
        auth.utils.hash.removeItem('access_token');
        auth.utils.hash.removeItem('expires_in');
      },
      // Wrapper for ordinary ajax
      ajax: function (options) {
        // Access token to query string
        if(oauth.isTokenAlive()) {
          // Bearer, query string or both authorization
          if(!options.oauthType) {
            options.oauthType = 'bearer';
          }
          if(options.oauthType == 'bearer' || options.oauthType == 'both') {
            options.headers = options.headers || {};
            options.headers.Authorization = 'Bearer ' + config.access_token;
          }
          if(options.oauthType == 'qs' || options.oauthType == 'both') {
            var delim = '?';
            if(options.url.match(/\?/)) {
              delim = '&';
            }
            options.url += delim + 'access_token=' + config.access_token;
          }
        } else {
          throw new auth.Error('Token not found or exosted');
        }
        return auth.ajax.call(auth, options);
      },
      isTokenAlive: function () {
        var nowTime = new Date().getTime();
        if (!config.access_token) {
          // auth.utils.log('User token not found');
          return false;
        } else if (config.expires_in + config.expires_start <= nowTime) {
          // auth.utils.log('User token has expired');
        } else {
          // auth.utils.log('User token is alive', config);
          return true;
        }

      },
      // Go to auth page if token expired or not exists (or forcibly if force == true)
      getToken: function (force) {
        if(!force && oauth.isTokenAlive()) {
          return true;
        }

        var authUrl = config.authorization_uri + '?redirect_uri=' + encodeURIComponent(config.redirect_uri) + '&client_id=' + encodeURIComponent(config.client_id) + '&response_type=token';
        if(config.popup) {
          auth.log('oAuth doing popup');
          // Create popup
          var params = "menubar=no,location=yes,resizable=yes,scrollbars=yes,status=no,width=800,height=600";
          authPopup = window.open(authUrl, "oSDP Auth", params);
          if(authPopup === null) {
            // TODO: autochange type of request to redirect?
            alert('Error. Authorization popup blocked by browser.');
          }
        } else {
          auth.log('oAuth doing redirect');
          // Redirect current page
          window.location = authUrl;
        }
        return false;
      },
      clearToken: function () {
        oauth.configure({
          access_token: null,
          expires_in: null,
          expires_start: null
        });
      },
      // Returns authorization popup object
      popup: function () { return authPopup; }
    };
  })();


  // Connection to openSDP network
  auth.connect = function () {

    // Waiting for DOMContentLoaded before anything because ajax can't be sent gracefully before this event fires.
    if(!DOMReadyEventListenerAdded && !auth.utils.DOMContentLoaded) {
      DOMReadyEventListenerAdded = true;
      auth.on('DOMContentLoaded', function () {
        auth.connect();
      });
      return;
    }

    if(auth.status == 'connected' || auth.status == 'connecting') {
      return;
    }
    auth.status = 'connecting';

    // Checking user token
    if(!auth.tokenCheck(true)) {
      // No token, waiting for second try after auth in popup or redirect
      auth.status = 'disconnected';
      return;
    }

    auth.trigger('connecting');

    // Perform a ephemerals request
    // TODO: fix ajax
    oauth.ajax({

      url: auth.config('apiServerURL')+auth.config('credsURI'),
      type: 'get',
      oauthType: 'both',
      data: {
        //service: 'sip' // FIXME: needed?
      },
      success: function(data) {
        data = JSON.parse(data);
        if(data.error) {
          auth.trigger(['connectionFailed'], { 'message': data.error, 'ecode': 'auth0002' });
          auth.disconnect();
        } else {

          // Filling user client sturcture
          client.id = data.id = data.username.split(':')[1];
          client.domain = data.domain = client.id.split('@')[1];

          // Array of mixed uris to object of grouped by service
          if(auth.utils.isArray(data.uris)) {
            var uris = {};
            auth.utils.each(data.uris, function (uri) {
              var serviceName = uri.split(':')[0].toLowerCase();
              if(!uris[serviceName]) {
                uris[serviceName] = [];
              }
              uris[serviceName].push(uri.split(':')[1]);
            });
            data.uris = uris;
          }


          auth.trigger(['gotTempCreds'], { 'data': data });

          auth.status = 'connected';
          auth.trigger('connected', {});
        }
      },
      error: function(jqxhr, status, string) {
        // Force new token autoobtaining if old token returns 401.
        if (jqxhr.status === 401) {
          auth.tokenCheck(true);
        }

        auth.status = 'disconnected';
        // If all is ok with token - throw connectionFailed event.
        auth.trigger('connectionFailed', { 'message': 'Server error ' + jqxhr.status, 'ecode': 'auth0001' });
        auth.disconnect();
      }
    });

  };

  // Imperative disconnection from openSDP network (optionally with clearing token
  auth.disconnect = function (keepToken) {
    if(auth.status == 'disconnected' || auth.status == 'disconnecting') {
      return false;
    }
    auth.trigger('disconnecting');

    if(keepToken !== true) {
      oauth.clearToken();
    }

    auth.status = 'disconnected';
    auth.trigger('disconnected');
  };

  // Returns status of user access token to client.
  auth.isAuthorized = function () {
    return oauth.isTokenAlive();
  };

  // Checks if oSDK can invoke connect method (if connected(and connectionFailed?) event has any listeners)
  auth.connectOnGotListener = function () {
    var events  = auth.utils.events;
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

    oauth.configure({
      client_id: auth.config('appID'),
      redirect_uri: window.location.href.replace(/\?.*$|#.*$/, ''),
      authorization_uri: auth.config('apiServerURL')+auth.config('authURI'),
      popup: auth.config('popup')
    });

    // If we need to connect after redirect (no errors returned from oauth server)
    if(oauth.checkUrl()) {
      oauth.clearUrl();

      if(!auth.config('popup') && auth.utils.storage.getItem('connectAfterRedirect')) {
        auth.utils.storage.removeItem('connectAfterRedirect');
        // Wait for user app event handlers to autoconnect
        auth.connectOnGotListener();
      }

    } else {
      if(agressive) {
        auth.log('Ensuring tokens.');

        if(oauth.getToken()) {
          return true;
        }

        if(!auth.config('popup')) {
          auth.utils.storage.setItem('connectAfterRedirect', true);
        }

      }
    }
    return false;
  };

  auth.client = {
    id: function () {
      return client.id;
    },
    domain: function () {
      return client.domain;
    }
  };

  auth.on('gotTokenFromPopup', function (data) {
    oauth.configure(data);
    oauth.popup().close();
    auth.connect();
  });

  // connectionFailed event by other plugin
  auth.on('connectionFailed', function (data) {
    auth.disconnect();
  });

  // Instant actions

  // mergedUserConfig action
   auth.on("mergedUserConfig", function () {
    auth.tokenCheck(false);
   });

  // Before browser page closed action
  auth.on('beforeunload', function (event) {
    // TODO: handle gracefully auth redirection page unload.

    // TODO: before closing the popup send event to main window about auth failure.
    // trying to quit gracefully
//       if(rtcSession && rtcSession.terminate) {
//         rtcSession.terminate();
//       }

//       instance.stop();

  });

  auth.registerMethods({
    /**
     * Initiates oSDK connection to all internal services.
     *
     * @memberof ConnectionAPI
     * @method
     * @alias oSDK.connect
     */
    'connect': auth.connect,
    /**
     * Initiates closing of oSDK connections to all internal services.
     *
     * @memberof ConnectionAPI
     * @method
     * @alias oSDK.disconnect
     * @param {boolean} [keepToken=false] Keep authorization info while disconnecting. If true, token will be kept upon disconnect and you can reconnect afterwards without redirection to authorization page.
     */
    'disconnect': auth.disconnect,
    /**
     * Returns status of client's authorization on server. Thus client may want to know if it can connect to oSDP network without invoking user login form through popup or redirect.
     *
     * @memberof ConnectionAPI
     * @method oSDK.isAuthorized
     * @returns {boolean} True or false.
     */
    'isAuthorized': auth.isAuthorized // TODO: May be use oSDK's status 'Connected' instead.
  });

  auth.registerNamespaces({
    'auth': auth, // Needed for main window-popup message passing

    'client': auth.client
  });

  auth.registerObjects({
    /**
     * @class oSDK.User
     * @private
     */
    'User': auth.client
  });

  auth.registerEvents({

    'gotTokenFromPopup': { self: true },

    'gotTempCreds': { other: true },

    'connecting': { other: true },

    /**
    * Dispatched when all built in oSDK modules successfully connected to openSDP network.
    * <p>
    * This event has no properties for now.
    *
    * @memberof ConnectionAPI
    * @event connected
    *
    */
    'connected': { other: true, client: 'last' },

    'disconnecting': { other: true },

    /**
    * Dispatched when all built in oSDK modules successfully disconnected from openSDP network.
    * <p>
    * This event has no properties for now.
    *
    * @memberof ConnectionAPI
    * @event disconnected
    *
    */
    'disconnected': { other: true, client: 'last' },

    /**
     * @memberof ConnectionAPI
     * @typedef ConnectionAPI~ConnectionFailedEventObject
     * @type object
     * @property {object} data Failed module specific data.
     */

    /**
    * Dispatched when any of built in oSDK modules failed to connect to openSDP network.
    * <p>
    * Modules successed to connect in case of this error start gracefully disconnecting from openSDP network.
    *
    * @memberof ConnectionAPI
    * @event connectionFailed
    * @param {ConnectionAPI~ConnectionFailedEventObject} event The event object associated with this event.
    *
    */
    'connectionFailed': { client: true, other: true, cancels: 'connected' }
  });

  auth.registerConfig(defaultConfig);

})(oSDK);
