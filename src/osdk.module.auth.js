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

  // Module namespace.
  var auth = new oSDK.utils.Module('auth');

  // Module specific DEBUG.
  auth.debug = true;

  // Status (disconnected, connecting, connected, disconnecting)
  auth.status = 'disconnected';

  auth.disconnectedByUser = false;

  var user = {
    id: null,
    login: null,
    domain: null
  };

  var defaultConfig = {
    auth: {
      apiServerURL: '{APIServerURI}', //TODO: replace this and following with sdk build parameter
      credsURI: '{ephemeralsPath}',
      authURI: '{authorizePath}'
    },
    appID: null,
    popup: false,
    connectionRecovery: false
  };

  // For not adding more than one event listener.
  var connectOnDOMContendLoadedTries = 0,
      connectOnGotListenerTries = 0,
      connectOnGotListenerTimeout = 5000,
      connectOnGotListenerThreshold = 500;

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
    var checkPopupInterval = false;

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
      // Checks hash for token, returns true if token found, return false otherwise, if error found throws it
      checkUrl: function () {

        // If we are in popup. TODO: more identify window opener.
        var isOSDKPopup = window.opener && window.opener.oSDK,
            error = '',
            errorDescription = '',
            emitError = function () {
            if(isOSDKPopup) {
              var popupError = new auth.Error({
                message: error,
                data: {
                  description: errorDescription
                }
              });
              popupError.subType = 'gotErrorFromPopup';
              window.opener.oSDK.utils.trigger('transitEvent', popupError);

            } else {
              // Removing potential connection trigger.
              if (auth.utils.storage.getItem('connectAfterRedirect')) {
                auth.utils.storage.removeItem('connectAfterRedirect');
              }

              // Clearing token right away.
              oauth.clearToken();
              // May be triggered after DOMContentLoaded
              auth.trigger('auth_oAuthError', new auth.Error({
                message: error + (errorDescription ? ': ' + errorDescription : ''),
                ecode: 'auth0010'
              }));
            }
        };

        // If we are in popup.
        if(isOSDKPopup) {
          document.body.innerHTML = '<div style="text-align: center;" >Closing popup.</div>';
        }

        // If we got error.
        error = auth.utils.getUrlParameter('error');
        if(error) {
          errorDescription = auth.utils.getUrlParameter('error_description');

          emitError();
        } else {
          // If we got token.
          var token = auth.utils.hash.getItem('access_token');
          if(token) {
            // Configuring us
            oauth.configure({
                access_token: token,
                expires_in: auth.utils.hash.getItem('expires_in')*1000,
                expires_start: new Date().getTime()
            });

            if(isOSDKPopup) {
              window.opener.oSDK.utils.trigger('transitEvent', {
                subType: 'gotTokenFromPopup',
                data: {
                  access_token: config.access_token,
                  expires_in: config.expires_in,
                  expires_start: config.expires_start
                }
              });
            }

            return true;
          } else {
            // No error and no token in storage and in URI case.
            // Normal acting.
          }
        }

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
          throw new auth.Error('Token not found or exhausted.');
        }
        return auth.ajax.call(auth, options);
      },
      isTokenAlive: function () {
        var nowTime = new Date().getTime();
        if (auth.utils.isNull(config.access_token)) {
          // auth.utils.log('User token not found');
          return false;
        } else if (config.expires_in + config.expires_start <= nowTime) {
          // auth.utils.log('User token has expired');
          return false;
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

          // Event for manual closing popup window on api manager page.
          var closeCallback = function () {
            var popupError = new auth.Error({
              message: 'Popup manually closed.',
              data: {
                description: 'User closed popup manually.'
              }
            });
            popupError.subType = 'gotManualCloseFromPopup';
            auth.utils.trigger('transitEvent', popupError);
          };
          // There is only way of monitoring popup close status.
          checkPopupInterval = window.setInterval(function() {
            if (authPopup === null || authPopup.closed) {
                closeCallback();
            }
          }, 1000);

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
      popup: function () {
        return authPopup;
      },
      // Clear waiting of manual popup closing (on api manager pages)
      clearPopupInterval: function () {
        if (!checkPopupInterval) {
          return;
        }
        window.clearInterval(checkPopupInterval);
      }
    };
  })();


  // Connection to openSDP network
  auth.connect = function () {
    auth.log('connect method invoked.');

    // Waiting for DOMContentLoaded before anything because ajax can't be sent gracefully before this event fires.
    if(!auth.utils.DOMContentLoaded) {
      auth.log('connect method delayed for DOMContentLoaded.');
      connectOnDOMContendLoadedTries++;
      return;
    }

    if(auth.status != 'disconnected') {
      auth.log('connect method aborted: denied by status != disconnected.');
      return;
    }
    auth.status = 'connecting';
    auth.trigger('connecting');

    // Checking user token
    auth.log('connect method before token check.');
    if(!auth.tokenCheck(true)) {
      // No token, waiting for second try after auth in popup or redirect.
      return;
    }
    auth.log('connect method resumed after token check.');

    // Perform a ephemerals request
    oauth.ajax({

      url: auth.config('apiServerURL')+auth.config('credsURI'),
      type: 'get',
      oauthType: 'bearer',
      data: {
        //service: 'sip' // Not needed now.
      },
      success: function(data) {
        var uris = {};
        if(data.error) {
          auth.trigger('auth_connectionError', new auth.Error({ 'message': data.error, 'ecode': 'auth0002' }));
        } else {

          // Filling User client sturcture
          user.id = data.id = data.username.split(':')[1];
          user.domain = data.domain = user.id.split('@')[1];
          user.login = data.login = user.id.split('@')[0];

          // Array of mixed uris to object of grouped by service
          if(auth.utils.isArray(data.uris)) {
            auth.utils.each(data.uris, function (uri) {
              var uriArray = uri.split(':');
              var serviceName = uriArray.shift().toLowerCase();
              if(!uris[serviceName]) {
                uris[serviceName] = [];
              }
              uris[serviceName].push(uriArray.join(':'));
            });
            data.uris = uris;
          }


          auth.trigger(['gotTempCreds'], { 'data': data });

          auth.status = 'connected';
          auth.trigger('connected', {
            user: user
          });
        }
      },
      error: function(jqxhr) {
        auth.log('ajax error args', arguments);
        if (jqxhr.status === 401) {
          // Force new token autoobtaining if old token returns 401.
          auth.tokenCheck(true);
        } else {
          // If other error - throw connectionFailed event.
          auth.trigger('auth_connectionError', new auth.Error({ 'message': 'Server error ' + jqxhr.status, 'ecode': 'auth0001' }));
        }
      }
    });

  };

  // Disconnect function for clearing system stuff.
  auth.disconnect = function (keepToken) {
    if(auth.status == 'disconnecting') {
      return false;
    }

    var disconnectInitiator = 'system';
    if (auth.disconnectedByUser) {
      disconnectInitiator = 'user';
      auth.disconnectedByUser = false;
    }

    auth.status = 'disconnecting';
    auth.trigger('disconnecting', { initiator: disconnectInitiator });

    if(keepToken !== true) {
      oauth.clearToken();
    }

    auth.status = 'disconnected';
    auth.trigger('disconnected', { initiator: disconnectInitiator });
  };

  // Disconnect function for client
  auth.disconnectManually = function (keepToken) {
    auth.disconnectedByUser = true;
    auth.disconnect(keepToken);
  };

  // Returns status of user access token to client.
  auth.isAuthorized = function () {
    return oauth.isTokenAlive();
  };

  // Checks if oSDK can invoke connect method (if connected(and connectionFailed?) event has any listeners)
  auth.connectOnGotListener = function () {
    auth.log('planting connectOnGotListener event.');
    var events  = auth.utils.events;
    if(events.connected && events.connected.listeners.length) {
      connectOnGotListenerTries = 0;
      auth.connect();
    } else {
      connectOnGotListenerTries++;
      if (connectOnGotListenerThreshold * connectOnGotListenerTries < connectOnGotListenerTimeout) {
        setTimeout(function () {
            auth.connectOnGotListener();
        }, connectOnGotListenerThreshold);
      }
    }
  };

  // Main function for in-hash token checking, auth popup generation and auth redirect handling
  auth.tokenCheck = function (agressive) {

    oauth.configure({
      client_id: auth.config('appID') || auth.utils.storage.getItem('appID'),
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

  auth.user = {};
  Object.defineProperties(auth.user, {
    id: {
      enumerable: true,
      get: function () {
        return user.id;
      }
    },
    domain: {
      enumerable: true,
      get: function () {
        return user.domain;
      }
    },
    login: {
      enumerable: true,
      get: function () {
        return user.login;
      }
    }
  });

  auth.on('transitEvent', function (event) {

    if (event.subType == 'gotTokenFromPopup') {
      oauth.clearPopupInterval();
      oauth.popup().addEventListener('unload', function () {
        auth.log('auth popup closed');
        oauth.configure(event.data);
        auth.connect();
      }, false);
      oauth.popup().close();
    } else if (event.subType == 'gotErrorFromPopup') {
      // Some error from popup.
      oauth.clearPopupInterval();
      oauth.popup().addEventListener('unload', function () {
        // Clearing token right away.
        oauth.clearToken();
        // Proxying ours Error object. May be triggered after DOMContentLoaded.
        auth.trigger('auth_oAuthError', event);
      });
      oauth.popup().close();
    } else if (event.subType == 'gotManualCloseFromPopup') {
      // User closed popup manually.
      oauth.clearPopupInterval();
      auth.trigger('auth_oAuthError', event);
    }
  });

  // Page windowBeforeUnload and connectionFailed event by other modules handling.
  auth.on(['windowBeforeUnload', 'connectionFailed'], function (event) {
    // Gracefully disconnecting keeping token.
    auth.disconnect(true);
  });

  // Page windowBeforeUnload, connectionFailed event by other modules and itself two types of internal errors listener.
  auth.on(['auth_oAuthError', 'auth_connectionError'], function (event) {
    auth.trigger('connectionFailed', event);
    // Gracefully disconnecting discarding token.
    auth.disconnect();
  });

  // Instant actions

  // mergedUserConfig action (grabbing token)
  auth.on('mergedUserConfig', function () {
    // Storing token in localStorage for future preinitialization.
    // NOTICE: may be we'll need to save all configuration to localStorage in future.
    auth.utils.storage.setItem('appID', auth.config('appID'));
    // Updating token info after merging user config.
    auth.tokenCheck(false);
  });

  auth.on('DOMContentLoaded', function () {
    auth.log('Got DOMContentLoaded, connectOnDOMContendLoadedTries:', connectOnDOMContendLoadedTries);

    if (connectOnDOMContendLoadedTries) {
      connectOnDOMContendLoadedTries = 0;
      auth.connect();
    }
  });

  // Registering methods in oSDK.

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
    'disconnect': auth.disconnectManually,
    /**
     * Returns status of client's authorization on server. Thus client may want to know if it can connect to oSDP network without invoking user login form through popup or redirect.
     *
     * @memberof ConnectionAPI
     * @method oSDK.isAuthorized
     * @returns {boolean} True or false.
     */
    'isAuthorized': auth.isAuthorized // TODO: May be use oSDK's status 'Connected' instead.
  });

  auth.registerObjects({
    /**
     * @class oSDK.User
     * @private
     */
    'User': auth.user
  });

  auth.registerEvents({

    'gotTempCreds': { other: true },

    /**
    * Dispatched when oSDK started connection process.
    * <p>
    * This event has no properties for now.
    *
    * @memberof ConnectionAPI
    * @event connecting
    *
    */
    'connecting': { other: true, client: true },

    /**
    * @memberof ConnectionAPI
    * @typedef ConnectionAPI~ConnectedEventObject
    * @type object
    * @property {object} user Object with logged in user identification parameters.
    * @property {string} user.id Current user's full ID.
    * @property {string} user.login Current user's login part of full ID.
    * @property {string} user.domain Current user's domain part of full ID.
    */

    /**
    * Dispatched when all built in oSDK modules successfully connected to openSDP network.
    * <p>
    *
    *
    * @memberof ConnectionAPI
    * @event connected
    * @param {ConnectionAPI~ConnectedEventObject} event The event object associated with this event.
    *
    */
    'connected': { other: true, client: 'last', clears: ['disconnected', 'connectionFailed'] },

    /**
    * Dispatched when oSDK started disconnection process.
    * <p>
    * This event has no properties for now.
    *
    * @memberof ConnectionAPI
    * @event disconnecting
    *
    */
    'disconnecting': { other: true, client: true },

    /**
    * Dispatched when all built in oSDK modules successfully disconnected from openSDP network.
    * <p>
    * This event has no properties for now.
    *
    * @memberof ConnectionAPI
    * @event disconnected
    *
    * @param {String} initiator - Initiator of disconnected event. Can be "system" or "user".
    *
    */
    'disconnected': { other: true, client: 'last', clears: 'connected' },

    /**
    * Dispatched when any of built in oSDK modules failed to connect to openSDP network.
    * <p>
    * Modules successed to connect in case of this error start gracefully disconnecting from openSDP network.
    *
    * @memberof ConnectionAPI
    * @event connectionFailed
    * @param {Error} event The event object associated with this event.
    *
    */
    'connectionFailed': { client: true, other: true, clears: 'connected' },

    /*
     * Inner events
     */

    /*
     * Dispatched when got error in adress string of WSO2 oauth server answer.
     */
    'auth_oAuthError': { self: true },

    /*
     * Dispatched when got some server error.
     */
    'auth_connectionError': { self: true }
  });

  auth.registerConfig(defaultConfig);

})(oSDK);
