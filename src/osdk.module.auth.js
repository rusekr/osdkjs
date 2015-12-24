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
  var module = new oSDK.utils.Module('auth');

  // Module specific DEBUG.
  module.debug = true;

  module.disconnectInitiator = 'system';

  // Internal user object
  var user = {
    login: null,
    domain: null,
    password: null
  };
  Object.defineProperties(user, {
    id: {
      enumerable: true,
      get: function () {
        return user.login + '@' + user.domain;
      }
    }
  });

  // External user object
  module.user = {};
  Object.defineProperties(module.user, {
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

  var defaultConfig = {
    nonEphemeral: false, // TODO: to document
    username: null, // nonEphemeral related
    password: null, // nonEphemeral related
    appID: null,
    popup: false,
    connectionRecovery: false,
    callbackURI: false,
    autoDomain: true, // Auto add domain if user not specified

    apiServerURL: '{APIServerURI}',
    credsURI: '{ephemeralsPath}',
    authURI: '{authorizePath}',
    expiresInOverride: '{expiresInOverride}' // Seconds to keep token server oauth2 response override.
  };

  // For not adding more than one event listener.
  var connectOnDOMContendLoadedTries = 0,
      connectOnGotListenerTries = 0,
      connectOnGotListenerTimeout = 5000,
      connectOnGotListenerThreshold = 500;

  // For tracking connected and disconnected group events
  var connectedModules = {};
  var disconnectedModules = {};

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
        module.log('oauth configure with config', cfgObject);
        cfgObject = module.utils.isObject(cfgObject)?cfgObject:{};

        config.access_token = module.utils.storage.getItem('access_token') || null;
        config.expires_start = module.utils.storage.getItem('expires_start') || null;
        config.expires_in = module.utils.storage.getItem('expires_in') || null;

        config = module.utils.extend(true, {}, config, cfgObject);

        module.utils.storage.setItem('access_token', config.access_token);
        module.utils.storage.setItem('expires_start', config.expires_start);
        module.utils.storage.setItem('expires_in', config.expires_in);

      },
      // Checks hash for token, returns true if token found, return false otherwise, if error found throws it
      checkUrl: function () {

        // If we are in popup. NOTICE: more identify window opener?
        var isOSDKPopup = window.opener && window.opener.oSDK,
            error = '',
            errorDescription = '',
            emitError = function () {
            if(isOSDKPopup) {
              var popupError = new module.Error({
                message: error,
                data: {
                  description: errorDescription
                }
              });
              popupError.subType = 'gotErrorFromPopup';
              window.opener.oSDK.utils.trigger('transitEvent', popupError);

            } else {
              // Removing potential connection trigger.
              if (module.utils.storage.getItem('connectAfterRedirect')) {
                module.utils.storage.removeItem('connectAfterRedirect');
              }

              // Clearing token right away.
              oauth.clearToken();
              // May be triggered after DOMContentLoaded
              module.trigger('auth_oAuthError', new module.Error({
                message: error + (errorDescription ? ': ' + errorDescription : ''),
                ecode: '0010'
              }));
            }
        };

        // If we are in popup.
        if(isOSDKPopup) {
          document.body.innerHTML = '<div style="text-align: center;" >Closing popup.</div>';
        }

        // If we got error.
        error = module.utils.getUrlParameter('error');
        if(error) {
          errorDescription = module.utils.getUrlParameter('error_description');

          emitError();
        } else {
          // If we got token.
          var token = module.utils.hash.getItem('access_token');
          if(token) {
            // Configuring us
            var tokenData = {
                access_token: token,
                expires_in: parseInt(module.config('expiresInOverride'))?parseInt(module.config('expiresInOverride'))*1000:module.utils.hash.getItem('expires_in')*1000,
                expires_start: new Date().getTime()
            };
            oauth.configure(tokenData);

            if(isOSDKPopup) {
              window.opener.oSDK.utils.trigger('transitEvent', {
                subType: 'gotTokenFromPopup',
                data: tokenData
              });
            } else {
              // Got token from redirect NOTICE: not needed because of on mergedUserConfig triggering
              // module.trigger('gotToken', tokenData);
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
        module.utils.hash.removeItem('access_token');
        module.utils.hash.removeItem('expires_in');
      },
      // Wrapper for ordinary ajax
      ajax: function (options) {
        // Access token to query string
        if(oauth.isTokenAlive()) {
          // Bearer, query string or both authorization
          if(!options.oauthType) {
            // Default type => bearer.
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
          throw new module.Error('Token not found or exhausted.');
        }
        return module.ajax.call(module, options);
      },
      isTokenAlive: function () {
        var nowTime = new Date().getTime();
        if (module.utils.isNull(config.access_token)) {
          // module.utils.log('User token not found');
          return false;
        } else if (config.expires_in + config.expires_start <= nowTime) {
          // module.utils.log('User token has expired');
          return false;
        } else {
          // module.utils.log('User token is alive', config);
          return {
            access_token: config.access_token,
            expires_in: config.expires_in,
            expires_start: config.expires_start
          };
        }

      },
      // Go to auth page if token expired or not exists (or forcibly if force == true)
      getToken: function (force) {
        if(!force && oauth.isTokenAlive()) {
          return true;
        }

        var authUrl = config.authorization_uri + '?redirect_uri=' + encodeURIComponent(config.redirect_uri) + '&client_id=' + encodeURIComponent(config.client_id) + '&response_type=token';
        if(config.popup) {
          module.log('oAuth doing popup');
          // Create popup
          var params = "menubar=no,location=yes,resizable=yes,scrollbars=yes,status=no,width=800,height=600";
          authPopup = window.open(authUrl, "oSDP Auth", params);
          if(authPopup === null) {
            // NOTICE: autochange type of request to redirect?
            alert('Error. Authorization popup blocked by browser.');
          }

          // Event for manual closing popup window on api manager page.
          var closeCallback = function () {
            var popupError = new module.Error({
              message: 'Popup manually closed.',
              data: {
                description: 'User closed popup manually.'
              }
            });
            popupError.subType = 'gotManualCloseFromPopup';
            module.utils.trigger('transitEvent', popupError);
          };
          // There is only way of monitoring popup close status.
          checkPopupInterval = window.setInterval(function() {
            if (authPopup === null || authPopup.closed) {
                closeCallback();
            }
          }, 1000);

        } else {
          module.log('oAuth doing redirect');
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

  // Status get/set function (states: disconnected, connecting, connected, disconnecting, waitingForPopup)
  module.status = (function () {
    var status = false;
    return function authStatus (newStatus) {
      if (!newStatus) {
        newStatus = status;
      } else {
        status = newStatus;
        module.log('Setting status', status);
        if (status == 'connected') {
          connectedModules = {};
        } else if (status == 'disconnected') {
          disconnectedModules = {};
        }
      }
      return status;
    };
  })();


  // Connection to openSDP network
  module.connect = function () {
    module.log('connect method invoked.');

    // Waiting for DOMContentLoaded before anything because ajax can't be sent gracefully before this event fires.
    if(!module.utils.DOMContentLoaded) {
      module.log('connect method delayed for DOMContentLoaded.');
      connectOnDOMContendLoadedTries++;
      return;
    }

    if(module.status() != 'disconnected') {
      module.log('connect method aborted: denied by status != disconnected.');
      return;
    }
    module.status('connecting');
    module.trigger('connecting');

    // Checking user token
    module.log('connect method before token check.');
    if (!module.config('nonEphemeral') && !module.tokenCheck(true)) {
      // No token, waiting for second try after auth in popup or redirect.
      // For popup doing personal status for second try after popup close.
      if (module.config('popup')) {
        module.status('waitingForPopup');
      } else {
        module.status('disconnected');
      }
      return;
    }
    module.log('connect method resumed after token check.');

    // Auto addition of domain to username helper
    function autoDomainHelper (username) {
      if (module.config('autoDomain') && username.indexOf('@') == -1 && user.domain) {
        username += '@' + user.domain;
      }
      return username;
    }

    // Perform a ephemerals request
    if (!module.config('nonEphemeral')) {
      oauth.ajax({

        url: module.config('apiServerURL')+module.config('credsURI'),
        type: 'get',
        data: {
          //service: 'sip' // Not needed now.
        },
        success: function(data) {
          var services = {};
          if(data.error) {
            module.trigger('auth_connectionError', new module.Error({ 'message': data.error, 'ecode': 'auth0002' }));
          } else {

            // Filling User client sturcture
            data.id = data.username.split(':').length > 1 ? data.username.split(':')[1] : data.username;
            user.domain = data.domain = data.id.split('@')[1];
            user.login = data.login = data.id.split('@')[0];
            user.username = data.username;

            // TODO: use provided ttl to delete token on specified time.

            // Array of mixed uris to object of grouped by service
            if(module.utils.isArray(data.uris)) {
              module.utils.each(data.uris, function (uri) {
                var serviceName = false;
                var serviceObj = {};
                if (module.utils.isString(uri)) {
                  // ephemerals 1.0.2
                  var uriArray = uri.split(':');
                  serviceName = uriArray.shift().toLowerCase();
                  if(!services[serviceName]) {
                    services[serviceName] = [];
                  }
                  serviceObj.uri = uriArray.join(':');
                  services[serviceName].push(serviceObj);
                } else if (module.utils.isObject(uri)){
                  // ephemerals 1.0.3
                  serviceName = uri.type.toLowerCase();
                  if(!services[serviceName]) {
                    services[serviceName] = [];
                  }
                  Object.keys(uri).forEach(function (key) {
                    switch (key) {
                      case 'url':
                        serviceObj.uri = uri.url;
                      break;
                      case 'authusername':
                        serviceObj.authname = uri.authusername;
                      break;
                      default:
                        serviceObj[key] = uri[key];
                    }
                  });
                  services[serviceName].push(serviceObj);
                }
              });
              delete data.uris;
              data.services = services;
            }

            data.autoDomainHelper = autoDomainHelper;

            module.trigger(['gotTempCreds'], { 'data': data });

            if (module.getEmitters('connected').length == 1) {
              module.trigger('connected', {
                user: user
              });
            }
          }
        },
        error: function(jqxhr) {
          module.log('ajax error args', arguments);
          if (jqxhr.status === 401) {
            // Force new token autoobtaining if old token returns 401.
            module.tokenCheck(true);
          } else {
            // If other error - throw connectionFailed event.
            module.trigger('auth_connectionError', new module.Error({ 'message': 'Server error ' + jqxhr.status, 'ecode': 'auth0001' }));
          }
        }
      });
    } else {
      var login = module.config('username').split('@')[0];
      var domain = module.config('username').split('@')[1];
      user.domain = domain;
      user.login = login;
      user.password = module.config('password');

      module.trigger(['gotTempCreds'], { 'data': {
        domain: user.domain,
        id: user.id,
        login: user.login,
        password: user.password || '',
        username: user.id,
        autoDomainHelper: autoDomainHelper
      } });

      // If auth is only module to handle connected and disconnected =D
      if (module.getEmitters('connected').length == 1) {
        module.trigger('connected', {
          user: user
        });
      }
    }
  };

  // Disconnect function for clearing system stuff.
  module.disconnect = function (keepToken) {
    if(module.status() == 'disconnecting' || module.status() == 'disconnected') {
      return false;
    }
    module.log('Invoked disconnect with keepToken and initiator', keepToken, module.disconnectInitiator);

    module.status('disconnecting');
    module.trigger('disconnecting', { initiator: module.disconnectInitiator });

    if(keepToken !== true) {
      oauth.clearToken();
    }

    // If auth is only module to handle connected and disconnected =D
    if (module.getEmitters('disconnected').length == 1) {
      module.trigger('disconnected', { initiator: module.disconnectInitiator });
    }
  };

  // Disconnect function for client
  module.disconnectManually = function (keepToken) {
    module.disconnectInitiator = 'user';
    module.disconnect(keepToken);
  };

  // Returns status of user access token to client.
  module.isAuthorized = function () {
    return oauth.isTokenAlive();
  };

  // Checks if oSDK can invoke connect method (if connected(and connectionFailed?) event has any listeners)
  module.connectOnGotListener = function () {
    module.log('planting connectOnGotListener event.');
    var events  = module.utils.events;
    if(events.connected && events.connected.listeners.length) {
      connectOnGotListenerTries = 0;
      module.log('connectOnGotListener trigger connect()');
      module.connect();
    } else {
      connectOnGotListenerTries++;
      if (connectOnGotListenerThreshold * connectOnGotListenerTries < connectOnGotListenerTimeout) {
        setTimeout(function () {
            module.connectOnGotListener();
        }, connectOnGotListenerThreshold);
      }
    }
  };

  // Main function for in-hash token checking, auth popup generation and auth redirect handling
  module.tokenCheck = function (agressive) {

    oauth.configure({
      client_id: module.config('appID') || module.utils.storage.getItem('appID'),
      redirect_uri: module.config('callbackURI') || window.location.href.replace(/\?.*$|#.*$/, ''),
      authorization_uri: module.config('apiServerURL')+module.config('authURI'),
      popup: module.config('popup')
    });

    // If we need to connect after redirect (no errors returned from oauth server)
    if(oauth.checkUrl()) {
      oauth.clearUrl();

      if(!module.config('popup') && module.utils.storage.getItem('connectAfterRedirect')) {
        module.utils.storage.removeItem('connectAfterRedirect');
        // Wait for user app event handlers to autoconnect
        module.connectOnGotListener();
      }

    } else {
      if(agressive) {
        module.log('Ensuring tokens.');

        if(oauth.getToken()) {
          return true;
        }

        if(!module.config('popup')) {
          module.utils.storage.setItem('connectAfterRedirect', true);
        }

      }
    }
    return false;
  };

  module.isConnected = function () {
    return (module.status() == 'connected') ? true : false;
  };

  module.on('transitEvent', function (event) {

    if (event.subType == 'gotTokenFromPopup') {
      oauth.clearPopupInterval();
      oauth.popup().addEventListener('unload', function () {
        module.log('auth popup closed');
        oauth.configure(event.data);

        // Got token from popup
        module.trigger('gotToken', {data: oauth});

        if(module.status() == 'waitingForPopup') {
          module.status('disconnected');
        }
        module.log('gotTokenFromPopup trigger connect()');
        module.connect();
      }, false);
      oauth.popup().close();
    } else if (event.subType == 'gotErrorFromPopup') {
      // Some error from popup.
      oauth.clearPopupInterval();
      oauth.popup().addEventListener('unload', function () {
        // Clearing token right away.
        oauth.clearToken();

        if(module.status() == 'waitingForPopup') {
          module.status('disconnected');
        }

        // Proxying ours Error object. May be triggered after DOMContentLoaded.
        module.trigger('auth_oAuthError', event);
      });
      oauth.popup().close();
    } else if (event.subType == 'gotManualCloseFromPopup') {
      // User closed popup manually.
      oauth.clearPopupInterval();

      if(module.status() == 'waitingForPopup') {
        module.status('disconnected');
      }

      module.trigger('auth_oAuthError', event);
    }
  });

  module.on(['windowBeforeUnload'], function (event) {
    module.disconnectInitiator = 'user';
    module.disconnect(true);
  });

  // Page windowBeforeUnload, connectionFailed event by other modules and itself two types of internal errors listener.
  module.on(['auth_oAuthError', 'auth_connectionError'], function (event) {
    module.disconnectInitiator = 'system';
    module.trigger('connectionFailed', event);
    // Gracefully disconnecting discarding token.
    module.disconnect();
  });

  // Instant actions

  // mergedUserConfig action (grabbing token)
  module.on('mergedUserConfig', function () {
    module.info('got mergedUserConfig event');
    // Storing app consumer key in localStorage for future preinitialization.
    // NOTICE: may be we'll need to save all configuration to localStorage in future.
    module.utils.storage.setItem('appID', module.config('appID'));
    // Updating token info after merging user config.
    module.tokenCheck(false);

    var tokenData = oauth.isTokenAlive();
    module.log('tokenData', tokenData);
    if (tokenData !== false) {
      module.trigger('gotToken', {data: oauth});
    }
  });

  module.on('DOMContentLoaded', function () {
    module.log('Got DOMContentLoaded, connectOnDOMContendLoadedTries:', connectOnDOMContendLoadedTries);

    module.status('disconnected');

    if (connectOnDOMContendLoadedTries) {
      connectOnDOMContendLoadedTries = 0;
      module.log('DOMContentLoaded connectOnDOMContendLoadedTries trigger connect()');
      module.connect();
    }
  });

  // Setting status "connected" when last module throw "connected".
  module.on('other:connected', function (data) {
    if (module.status() == 'connected') {
      module.log('Already connected');
      return;
    }
    connectedModules[data.module] = true;
    module.log('connectedModules ', connectedModules, ' from ', module.getEmitters(data.type));
    var collectionDone = true;
    module.getEmitters(data.type).forEach(function (emitter) {
      if (connectedModules[emitter.module] || emitter.module == module.name) {
        return;
      } else {
        collectionDone = false;
      }
    });
    if (collectionDone) {
      module.status('connected');
      module.trigger('connected', {
          user: user
      });
    }
  });

  // Setting status "disconnected" when last module throw "disconnected".
  module.on('other:disconnected', function (data) {
    if (module.status() == 'disconnected') {
      module.log('Already disconnected');
      return;
    }
    disconnectedModules[data.module] = true;
    module.log('disconnectedModules ', disconnectedModules, ' from ', module.getEmitters(data.type));
    var collectionDone = true;
    module.getEmitters(data.type).forEach(function (emitter) {
      if (disconnectedModules[emitter.module] || emitter.module == module.name) {
        return;
      } else {
        collectionDone = false;
      }
    });
    if (collectionDone) {
      module.status('disconnected');
      module.trigger('disconnected', { initiator: module.disconnectInitiator });
    }
  });

  // Page windowBeforeUnload and connectionFailed event by other modules handling.
  module.on(['other:connectionFailed'], function (event) {
    module.disconnectInitiator = 'system';
    // One connectionFailed at time.
    if (module.status() != 'disconnecting' && module.status() != 'disconnected') {
      module.trigger('connectionFailed', event);
      // Gracefully disconnecting keeping token.
      module.disconnect(true);
    }
  });

  // Registering methods in oSDK.

  module.registerMethods({
    /**
     * Initiates oSDK connection to all internal services.
     *
     * @memberof ConnectionAPI
     * @method
     * @alias oSDK.connect
     */
    'connect': module.connect,
    /**
     * Initiates closing of oSDK connections to all internal services.
     *
     * @memberof ConnectionAPI
     * @method
     * @alias oSDK.disconnect
     * @param {boolean} [keepToken=false] Keep authorization info while disconnecting. If true, token will be kept upon disconnect and you can reconnect afterwards without redirection to authorization page.
     */
    'disconnect': module.disconnectManually,
    /**
     * Returns status of client's authorization on server. Thus client may want to know if it can connect to oSDP network without invoking user login form through popup or redirect.
     *
     * @memberof ConnectionAPI
     * @method oSDK.isAuthorized
     * @returns {boolean} True or false.
     */
    'isAuthorized': module.isAuthorized,
    /**
     * Returns status of client's connection to server.
     *
     * @memberof ConnectionAPI
     * @method oSDK.isConnected
     * @returns {boolean} True or false.
     */
    'isConnected': module.isConnected
  });

  module.registerObjects({
    /**
     * @class oSDK.User
     * @private
     */
    'User': module.user
  });

  module.registerEvents({

    /* Token for other modules */
    'gotToken': { other: true },

    /* Temporary authorization parameters for other modules */
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
    'connected': { self: true, client: true },

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
    'disconnected': { self: true, client: true },

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
    'connectionFailed': { client: true },

    /**
    * Dispatched if module finds some incompatibilities with current browser.
    *
    * @memberof CoreAPI
    * @event incompatible
    * @param {Error} event The event object associated with this event.
    *
    */
    'incompatible': { client: true },

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

  module.registerConfig(defaultConfig);

})(oSDK);
