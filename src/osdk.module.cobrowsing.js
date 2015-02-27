/*
 * oSDK Cobrowsing module.
 * TODO: close timers (request timeouts)
 */
(function (oSDK) {
  "use strict";

    /**
   * CobrowsingAPI allows web-application to form and exchange information needed for cobrowsing capabilities.
   *
   * @namespace CobrowsingAPI
   */

  // Module namespace
  var module = new oSDK.utils.Module('cobrowsing');

  // Module specific DEBUG.
  module.debug = true;

  module.disconnectInitiator = null;
  module.status = 'disconnected';

  module.defaultConfig = {
    cobrowsing: {
      server: {
        proto: 'wss'
        //port: 8443,
        //host: '192.168.2.161' // TODO: priority to host and other connection parameters from gotTempCreds event.
      }
    }
  };

  module.auth = null;

    // Stomp library wrapper.
  var stompClient = function (URI) {
    var client = Stomp.client(URI);

    // Custom methods.
    client.sendToUser = function (userID, data) {
      return client.send('/user/' + userID, {}, JSON.stringify(data));
    };

    client.sendInSession = function (sessionID, data) {
      return client.send('/cobrowsing/' + sessionID, {}, JSON.stringify(data));
    };

    return client;
  };

  module.sessions = {};

  module.sessions.createIncoming = function (data) {
    var session = new CobrowsingSession(data);
    module.trigger('cobrowsingSession', session);
  };

  module.sessions.createOutgoing = function (data) {
    var session = new CobrowsingSession();

    session.initSubscription();

    session.inviteUser(data.userID);

    module.trigger('cobrowsingSession', session);
  };

  module.sessions.inviteAccepted = function (data) {
    var session = module.sessions[data.sessionID];
    if (session.inviteTimers[data.senderID]) {
      clearTimeout(session.inviteTimers[data.senderID]);
      session.inviteTimers[data.senderID] = null;
    }
    session.trigger('accepted', data);
  };

  module.sessions.inviteRejected = function (data) {
    var session = module.sessions[data.sessionID];
    session.trigger('rejected', data);
  };

  module.sessions.userAdded = function (data) {
    var session = module.sessions[data.sessionID];
    session.participants.add(data.senderID);
    session.trigger('userAdded', data);
  };

  module.sessions.userRemoved = function (data) {
    var session = module.sessions[data.sessionID];
    session.participants.remove(data.senderID);
    session.trigger('userRemoved', data);
  };

  var CobrowsingSession = function oSDKCobrowsingSession (configObject) {
    var self = this;

    var utils = module.utils;
    var stompClient = module.stompClient;
    var warn = module.warn;
    var auth = module.auth;
    var trigger = module.trigger;

    var sendForm = function (configObject) {

      if (!configObject) {
        configObject = {};
      }

      var request = {
        senderID:self.myID,
        sessionID: self.id
      };

      return utils.extend(request, configObject);
    };

    configObject = configObject || {};


    self.myID = auth.id;
    self.id = configObject.sessionID || utils.uuid();
    self.initiatorID = configObject.initiatorID || self.myID;
    self.inviterID = configObject.senderID || self.initiatorID;
    self.participants = new utils.list();
    self.incoming = ((self.myID != self.initiatorID) ? true : false);
    self.inviteTimers = {};
    self.defaultTimeout = 30000;

    if (configObject.participants) {
      self.participants.fromArray(configObject.participants);
    }

    self.eventHandlers = [];

    self.initSubscription = function () {
      self.stompSubscription = stompClient.subscribe("/cobrowsing/" + self.id, function cobrowsingSubscriptionMessage (event) {
        if (event.body) {
          event.body = JSON.parse(event.body);
          // Fire message callback
          if (self.eventHandlers && self.eventHandlers.message) {
            utils.each(self.eventHandlers.message, function (listener) {
              if (listener instanceof Function) {
                listener.call(listener, event.body);
              }
            });
          }
        }
      });
      self.trigger('subscribed');

      self.participants.add(self.myID);
      self.participants.each(function (userID) {
        self.sendToUser(userID, { cobrowsingUserAdded: true });
      });

      // Starting to send cobrowsing information in session
      // Mouse coordinates
      document.addEventListener('mousemove', function(e) {
        e = e || window.event;

        if (e.pageX === null && e.clientX !== null ) {
          var html = document.documentElement;
          var body = document.body;

          e.pageX = e.clientX + (html.scrollLeft || body && body.scrollLeft || 0);
          e.pageX -= html.clientLeft || 0;

          e.pageY = e.clientY + (html.scrollTop || body && body.scrollTop || 0);
          e.pageY -= html.clientTop || 0;
        }

        self.sendInSession({
          mouseMove: {
            x: e.pageX,
            y: e.pageY
          }
        });

      }, false);
    };

    self.sendInSession = function (data) {
      stompClient.sendInSession(self.id, sendForm(data));
    };

    self.sendToUser = function (userID, data) {
      stompClient.sendToUser(userID, sendForm(data));
    };

    self.inviteUser = function (userID) {

      if (self.participants.find(userID)) {
        warn(userID + 'is already cobrowsed with.');
        return;
      }

      if (self.inviteTimers[userID]) {
        warn('Inviting of' + userID + 'in progress.');
        return;
      }

      self.sendToUser(userID, {
        cobrowsingRequest: true,
        initiatorID: self.initiatorID,
        participants: self.participants.toArray()
      });

      self.inviteTimers[userID] = setTimeout(function () {
        self.trigger('rejected', {
          userID: userID,
          reason: 'timeout'

        });
      }, self.defaultTimeout);
    };

    self.end = function () {
      self.participants.each(function (userID) {
        if (userID != self.myID) {
          self.sendToUser(userID, {
            removedUser: self.myID
          });
        }
      });

      self.stompSubscription.unsubscribe();
      trigger('sessionEnded', { sessionID: self.id });
    };

    // on: message (send), ended (end), accepted (accept), rejected (reject), error, addedUser, removedUser
    self.on = function (eventType, callback) {
      if (!self.eventHandlers[eventType]) {
        self.eventHandlers[eventType] = [];
      }
      self.eventHandlers[eventType].push(callback);
      return callback;
    };

    self.trigger = function (eventType, data) {
      if(self.eventHandlers && self.eventHandlers[eventType]) {
        utils.each(self.eventHandlers[eventType], function (callback) {
          if(utils.isFunction(callback)) {
            callback.call(this, data);
          }
        });
      }
    };

    if (self.incoming) {
      // incoming session only.
      self.accept = function () {
        // Clearing timeout
        if (self.inviteTimers[self.myID]) {
          clearTimeout(self.inviteTimers[self.myID]);
          self.inviteTimers[self.myID] = false;
        }

        self.initSubscription();

        self.sendToUser(self.inviterID, { cobrowsingAccepted: true });

        delete self.reject;
      };

      self.reject = function () {

        if (self.inviteTimers[self.myID]) {
          clearTimeout(self.inviteTimers[self.myID]);
          delete self.inviteTimers[self.myID];
        }

        self.sendToUser(self.inviterID, { cobrowsingRejected: true });

        trigger('sessionEnded', { sessionID: self.id });
      };

      // Autoreject by timeout.
      self.inviteTimers[self.myID] = setTimeout(function () {
        self.reject();
        delete self.inviteTimers[self.myID];
      }, self.defaultTimeout);

    }

    // Initialization logic
    trigger('sessionCreated', {
      sessionID: self.id,
      session: self
    });
  };

  module.initialize = function (data) {

    if (module.status != 'disconnected') {
      return;
    }

    // Local user attributes cache
    module.auth = data;

    // Forming STOMP URI
    module.auth.stompURI = module.config('server.proto') + '://';
    module.auth.stompURI += (module.auth.uris.stomp && Array.isArray(module.auth.uris.stomp) && module.auth.uris.stomp.length) ? module.auth.uris.stomp[0].split(';')[0] : ((module.config('server.host') + (module.config('server.port') ? ':' + module.config('server.port') : '')));

    // module.log('stomp uri', module.auth.stompURI, 'proto', module.config('server.proto'));

    // module.auth.stompURI = 'wss://192.168.2.161:8443'; // TODO: connect to fair server

    // Creating STOMP client
    module.stompClient = stompClient(module.auth.stompURI);

    // Connecting to STOMP server
    module.stompClient.connect(module.auth.username, module.auth.password, function connectCallback (event) {
      module.status = 'connected';
      module.trigger('connected');

      module.log('stomp connect event callback', event);

      module.userSubscription = module.stompClient.subscribe("/user/" + module.auth.id, function userSubscriptionMessage (event) {
        module.log('user subscribed event', event);

        var data = null;
        try {
          data = JSON.parse(event.body);
        } catch (e) {
          module.warn('Incorrect message in STOMP event', event);
        }

        if (data) {
          if (data.cobrowsingRequest) {

            module.sessions.createIncoming(data);

          } else if (data.cobrowsingAccepted) {

            module.sessions.inviteAccepted(data);

          } else if (data.cobrowsingRejected) {

            module.sessions.inviteRejected(data);

          } else if (data.cobrowsingUserAdded) {

            module.sessions.userAdded(data);

          } else if (data.cobrowsingUserRemoved) {

            module.sessions.userRemoved(data);

          }
        }

      });

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
    var finishDisconnect = function () {
      var initiatorObject = module.disconnectInitiator !== null ? { initiator: module.disconnectInitiator } : {};
      module.status = 'disconnected';
      module.trigger('disconnected', initiatorObject);
      module.disconnectInitiator = null;
    };

    if (module.status == 'disconnected') {

      finishDisconnect();

    } else {

      Object.keys(module.sessions, function (id) {
        module.sessions[id].end();
      });

      module.userSubscription.unsubscribe();

      module.stompClient.disconnect(function stompDisconnect () {
        finishDisconnect();
      });
    }
  };

  module.checkCompatibility = function cobrowsingCheckCompatibility() {
    var err;
    if (!window.WebSocket) {
      err = new module.Error({
        ecode: '0004',
        message: 'Your browser do not support WebSocket.'
      });
      module.trigger('incompatible', err);
      throw err;
    }
  };

  module.cobrowsingRequest = function oSDKCobrowsingRequestSession (userID) {

    var session = module.sessions.createOutgoing({
      userID: userID
    });

    return session;
  };

  module.on('sessionCreated', function (event) {
    module.sessions[event.sessionID] = event.session;
  });

  module.on('sessionEnded', function (event) {
    delete module.sessions[event.sessionID];
  });

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
    module.disconnectInitiator = 'system';
    module.disconnect();
  });

  module.registerConfig(module.defaultConfig);

  module.registerEvents({

    /*
     * Signal to add session.
     */
    'sessionCreated': { self: true },

    /*
     * Signal to delete session.
     */
    'sessionEnded': { self: true },

    /**
    * Dispatched when cobrowsing module got cobrowsing session request.
    *
    * @private
    * @memberof CobrowsingAPI
    * @event cobrowsingSession
    * @param {object} event - The event object associated with this event.
    * @param {string} event.userID - User requesting cobrowsing session.
    * @param {string} event.sessionID - Cobrowsing session ID.
    *
    */
    'cobrowsingSession': { client: true },

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

  module.registerMethods({
    cobrowsing: module.cobrowsingRequest,
  });

})(oSDK);
