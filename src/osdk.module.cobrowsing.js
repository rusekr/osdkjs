/*
 * oSDK Cobrowsing module.
 * TODO: form fields changed transit
 *
 * NOTICE: jquery events must not return false. native events must not stop propagation.
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
      excludeCSSClass: 'ocobrowsing', // TODO: document
//      enableClicks: false, // NOTICE: ocobrowsing UI option
      server: {
        proto: 'wss'
        //port: 8443,
        //host: '192.168.2.161'
      }
    }
  };

  module.auth = null;


  module.eventEmulator = (function() {

    var
      rkeyEvent = /^key/,
      rmouseEvent = /^(?:mouse|contextmenu)|click/,
      keyCode = {
        BACKSPACE: 8,
        COMMA: 188,
        DELETE: 46,
        DOWN: 40,
        END: 35,
        ENTER: 13,
        ESCAPE: 27,
        HOME: 36,
        LEFT: 37,
        NUMPAD_ADD: 107,
        NUMPAD_DECIMAL: 110,
        NUMPAD_DIVIDE: 111,
        NUMPAD_ENTER: 108,
        NUMPAD_MULTIPLY: 106,
        NUMPAD_SUBTRACT: 109,
        PAGE_DOWN: 34,
        PAGE_UP: 33,
        PERIOD: 190,
        RIGHT: 39,
        SPACE: 32,
        TAB: 9,
        UP: 38
      },
      buttonCode = {
        LEFT: 0,
        MIDDLE: 1,
        RIGHT: 2
      };


    var instance = {};

    instance.simulateEvent = function( elem, type, options ) {
      var event = this.createEvent( type, options );
      this.dispatchEvent( elem, type, event );
    };

    instance.createEvent = function( type, options ) {
      if ( rkeyEvent.test( type ) ) {
        return this.keyEvent( type, options );
      }

      if ( rmouseEvent.test( type ) ) {
        return this.mouseEvent( type, options );
      }
    };

    instance.mouseEvent = function( type, options ) {
      var event, eventDoc, doc, body;
      options = module.utils.extend({
        bubbles: true,
        cancelable: (type !== "mousemove"),
        view: window,
        detail: 0,
        screenX: 0,
        screenY: 0,
        clientX: 1,
        clientY: 1,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        button: 0,
        relatedTarget: undefined
      }, options );

      if ( document.createEvent ) {
        event = document.createEvent( "MouseEvents" );
        event.initMouseEvent( type, options.bubbles, options.cancelable,
          options.view, options.detail,
          options.screenX, options.screenY, options.clientX, options.clientY,
          options.ctrlKey, options.altKey, options.shiftKey, options.metaKey,
          options.button, options.relatedTarget || document.body.parentNode );

        // IE 9+ creates events with pageX and pageY set to 0.
        // Trying to modify the properties throws an error,
        // so we define getters to return the correct values.
        if ( event.pageX === 0 && event.pageY === 0 && Object.defineProperty ) {
          eventDoc = event.relatedTarget.ownerDocument || document;
          doc = eventDoc.documentElement;
          body = eventDoc.body;

          Object.defineProperty( event, "pageX", {
            get: function() {
              return options.clientX +
                ( doc && doc.scrollLeft || body && body.scrollLeft || 0 ) -
                ( doc && doc.clientLeft || body && body.clientLeft || 0 );
            }
          });
          Object.defineProperty( event, "pageY", {
            get: function() {
              return options.clientY +
                ( doc && doc.scrollTop || body && body.scrollTop || 0 ) -
                ( doc && doc.clientTop || body && body.clientTop || 0 );
            }
          });
        }
      } else if ( document.createEventObject ) {
        event = document.createEventObject();
        module.utils.extend( event, options );
        // standards event.button uses constants defined here: http://msdn.microsoft.com/en-us/library/ie/ff974877(v=vs.85).aspx
        // old IE event.button uses constants defined here: http://msdn.microsoft.com/en-us/library/ie/ms533544(v=vs.85).aspx
        // so we actually need to map the standard back to oldIE
        event.button = {
          0: 1,
          1: 4,
          2: 2
        }[ event.button ] || ( event.button === -1 ? 0 : event.button );
      }

      return event;
    };

    instance.keyEvent = function( type, options ) {
      var event;
      options = module.utils.extend({
        bubbles: true,
        cancelable: true,
        view: window,
        ctrlKey: false,
        altKey: false,
        shiftKey: false,
        metaKey: false,
        keyCode: 0,
        charCode: undefined
      }, options );

      if ( document.createEvent ) {
        try {
          event = document.createEvent( "KeyEvents" );
          event.initKeyEvent( type, options.bubbles, options.cancelable, options.view,
            options.ctrlKey, options.altKey, options.shiftKey, options.metaKey,
            options.keyCode, options.charCode );
        // initKeyEvent throws an exception in WebKit
        // see: http://stackoverflow.com/questions/6406784/initkeyevent-keypress-only-works-in-firefox-need-a-cross-browser-solution
        // and also https://bugs.webkit.org/show_bug.cgi?id=13368
        // fall back to a generic event until we decide to implement initKeyboardEvent
        } catch( err ) {
          event = document.createEvent( "Events" );
          event.initEvent( type, options.bubbles, options.cancelable );
          module.utils.extend( event, {
            view: options.view,
            ctrlKey: options.ctrlKey,
            altKey: options.altKey,
            shiftKey: options.shiftKey,
            metaKey: options.metaKey,
            keyCode: options.keyCode,
            charCode: options.charCode
          });
        }
      } else if ( document.createEventObject ) {
        event = document.createEventObject();
        module.utils.extend( event, options );
      }

      if ( !!/msie [\w.]+/.exec( navigator.userAgent.toLowerCase() ) || (({}).toString.call( window.opera ) === "[object Opera]") ) {
        event.keyCode = (options.charCode > 0) ? options.charCode : options.keyCode;
        event.charCode = undefined;
      }

      return event;
    };

    instance.dispatchEvent = function( elem, type, event ) {
      if ( elem.dispatchEvent ) {
        elem.dispatchEvent( event );
      } else if ( elem.fireEvent ) {
        elem.fireEvent( "on" + type, event );
      }
    };

    return instance;

  })();

  // Grabs and signals events
  module.eventAccumulator = (function () {

    var subscriptions = {};

    var transmitEvent = function (data) {
      Object.keys(subscriptions).forEach(function (ID) {
        if(module.utils.isFunction(subscriptions[ID])) {
          subscriptions[ID].call(this, data);
        }
      });
    };

    var getElementCSSPath = function elementLocation(el) {
      if (el === null) {
        module.warn('Got null element');
      }
      if (el instanceof $) {
        // a jQuery element
        el = el[0];
      }
      if (el[0] && el.attr && el[0].nodeType == 1) {
        // Or a jQuery element not made by us
        el = el[0];
      }
      if (el.id) {
        return "#" + el.id;
      }
      if (el.tagName == "BODY") {
        return "body";
      }
      if (el.tagName == "HEAD") {
        return "head";
      }
      if (el === document) {
        return "document";
      }
      var parent = el.parentNode;
      if ((! parent) || parent == el) {
        console.warn("elementLocation(", el, ") has null parent");
        throw new module.Error("No locatable parent found");
      }
      var controlUI = false;
      var parentLocation = elementLocation(parent);
      if (!parentLocation) {
        controlUI = true;
      }
      var children = parent.childNodes;
      var _len = children.length;
      var index = 0;
      for (var i=0; i<_len; i++) {
        if (children[i].nodeType == document.ELEMENT_NODE && module.config('excludeCSSClass') && children[i].className.indexOf(module.config('excludeCSSClass')) != -1) { // need to check several classes?
          // Don't count our UI and it`s children
          controlUI = true;
          module.log('our UI detected in', children[i]);
          break;
        }
        if (children[i] == el) {
          break;
        }
        if (children[i].nodeType == document.ELEMENT_NODE) {
          // Don't count text or comments
          index++;
        }
      }
      return (controlUI ? false : parentLocation + ">:nth-child(" + (index + 1) + ")");
    };

    var grabMouse = function(e) {
      e = e || window.event;
      var target = e.target || e.srcElement;
      var targetPath = getElementCSSPath(target);
      if (!e.osdkcobrowsinginternal && targetPath) {
        if (e.pageX === null && e.clientX !== null ) {
          var html = document.documentElement;
          var body = document.body;

          e.pageX = e.clientX + (html.scrollLeft || body && body.scrollLeft || 0);
          e.pageX -= html.clientLeft || 0;

          e.pageY = e.clientY + (html.scrollTop || body && body.scrollTop || 0);
          e.pageY -= html.clientTop || 0;
        }
        // Chrome (40-41) gets incorrect offset(XY) properties for some spans
        var eventObject = {
          type: e.type,
          target: targetPath,
          options: {
            offsetX: (e.pageX - target.getBoundingClientRect().left) || (e.offsetX===undefined?e.layerX:e.offsetX),
            offsetY: (e.pageY - target.getBoundingClientRect().top) || (e.offsetY===undefined?e.layerY:e.offsetY),
          }
        };
        // module.log('emitting captured event for listeners', e);
        transmitEvent(eventObject);
      }
    };

    var startGrabbing = function () {
      document.body.addEventListener('mousemove', grabMouse, true);

      document.body.addEventListener('click', grabMouse, true);
      document.body.addEventListener('mousedown', grabMouse, true);
      document.body.addEventListener('mouseup', grabMouse, true);
    };

    var stopGrabbing = function () {
      document.body.removeEventListener('mousemove', grabMouse, true);

      document.body.removeEventListener('click', grabMouse, true);
      document.body.removeEventListener('mousedown', grabMouse, true);
      document.body.removeEventListener('mouseup', grabMouse, true);
    };

    return {
      // Start grabbing
      init: function () {
        startGrabbing();
      },
      // Stop grabbing
      shutdown: function () {
        stopGrabbing();
      },
      // Add subscription
      on: function (handlerFunction) {
        var subscriptionID = module.utils.uuid();
        subscriptions[subscriptionID] = handlerFunction;
        return subscriptionID;
      },
      // Remove subscription
      off: function (subscriptionID) {
        delete subscriptions[subscriptionID];
      }

    };
  })();

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

    client.logLevel = 1;

    client.debug = function () {
      if(module.debug && client.logLevel) {
        module.log.apply(this, Array.prototype.slice.call(arguments, 0));
      }
    };

    return client;
  };

  var SessionsManager = function () {
    this.store = {};
  };

  SessionsManager.prototype.createIncoming = function (data) {
    var session = new CobrowsingSession(data);
    module.trigger('cobrowsingSession', session);
  };

  SessionsManager.prototype.createOutgoing = function (data) {
    var session = new CobrowsingSession();

    session.initSubscription();

    session.inviteUser(data.userID);

    module.trigger('cobrowsingSession', session);
  };

  SessionsManager.prototype.inviteAccepted = function (data) {
    var session = this.store[data.sessionID];
    if (session.inviteTimers[data.senderID]) {
      clearTimeout(session.inviteTimers[data.senderID]);
      session.inviteTimers[data.senderID] = null;
    }
    session.trigger('accepted', data);
  };

  SessionsManager.prototype.inviteRejected = function (data) {
    var session = this.store[data.sessionID];
    session.trigger('rejected', data);
    if(session.participants.length == 1) {
      session.end();
    }
  };

  SessionsManager.prototype.userAdded = function (data) {
    var session = this.store[data.sessionID];
    session.participants[data.senderID] = true;
    session.trigger('userAdded', data);
  };

  SessionsManager.prototype.userRemoved = function (data) {
    var session = this.store[data.sessionID];
    delete session.participants[data.senderID];
    session.trigger('userRemoved', data);
    if(session.participants.length == 1) {
      session.end();
    }
  };

  module.sessions = new SessionsManager();

  var CobrowsingSession = function oSDKCobrowsingSession (configObject) {
    var self = this;

    var utils = module.utils;
    var stompClient = module.stompClient;
    var warn = module.warn;
    var auth = module.auth;

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
    self.participants = {};
    self.incoming = ((self.myID != self.initiatorID) ? true : false);
    self.inviteTimers = {};
    self.defaultTimeout = 30000;
    self.stompSubscription = null;
    self.eventSubscription = null;
    self.status = 'not initialized';

    if (configObject.participants) {
      self.participants = configObject.participants;
    }

    self.eventHandlers = [];

    Object.defineProperties(self.participants, {
      length: {
        enumerable: false, // !
        get: function () {
          var length = 0;
          Object.keys(this).forEach(function (name) {
            length++;
          });
          return length;
        }
      }
    });

    self.initSubscription = function () {
      self.stompSubscription = stompClient.subscribe("/cobrowsing/" + self.id, function cobrowsingSubscriptionMessage (event) {
        if (event.body) {
          event.body = JSON.parse(event.body);

          // Session message not for self
          if (event.body.senderID == self.myID) {
            return;
          }
          // Fire message callback
          if (self.eventHandlers && self.eventHandlers.message) {

            var eventTypes = null;

            // Target string to object.
            if (event.body.target) {
              event.body.target = document.querySelector(event.body.target);
            }

            // Mouse coordinates normalize to target related
            if (/mousemove/.test(event.body.type) && event.body.target) {
              event.body.options.x = (event.body.options.offsetX + event.body.target.getBoundingClientRect().left) + 'px';
              event.body.options.y = (event.body.options.offsetY + event.body.target.getBoundingClientRect().top) + 'px';
            }

            eventTypes = [event.body.type];

            // Fire!
            eventTypes.forEach(function (eventType) {
              utils.each(self.eventHandlers.message, function (listener) {
                if (listener instanceof Function) {
                  event.body.type = eventType;
                  listener.call(listener, event.body);
                }
              });
            });
          }
        }
      });
      self.status = 'subscribed';
      self.trigger('subscribed');

      Object.keys(self.participants).forEach(function (userID) {
        if (userID == self.myID) {
          return;
        }
        self.sendToUser(userID, {
          cobrowsingUserAdded: true
        });
      });
      self.participants[self.myID] = true;

      // Starting to send cobrowsing information in session
      self.eventSubscription = module.eventAccumulator.on(function (event) {
        if (self.participants.length < 2) {
          return;
        }
        self.sendInSession(event);
      });
    };

    self.killSubscription = function () {
      module.eventAccumulator.off(self.eventSubscription);
      self.stompSubscription.unsubscribe();
    };

    self.sendInSession = function (data) {
      stompClient.sendInSession(self.id, sendForm(data));
    };

    self.sendToUser = function (userID, data) {
      stompClient.sendToUser(userID, sendForm(data));
    };

    self.inviteUser = function (userID) {

      if (self.participants[userID]) {
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
        participants: self.participants
      });

      self.inviteTimers[userID] = setTimeout(function () {
        self.trigger('rejected', {
          userID: userID,
          reason: 'timeout'
        });
        if(self.participants.length == 1) {
          self.end();
        }

      }, self.defaultTimeout);
    };

    self.end = function () {
      if (self.status == 'subscribed') {
        Object.keys(self.participants).forEach(function (userID) {
          if (userID != self.myID) {
            self.sendToUser(userID, {
              cobrowsingUserRemoved: true
            });
          }
        });
        self.killSubscription();
      }
      self.status = 'ended';
      self.trigger('ended', {});

      module.trigger('sessionEnded', { sessionID: self.id });
    };

    // usability method
    self.fireEvent = function (eventType, target, options) {
      var event = module.eventEmulator.createEvent(eventType, options);
      // event.osdkcobrowsinginternal = true;
      Object.defineProperty( event, 'osdkcobrowsinginternal', {
        get: function() {
          return true;
        }
      });
      module.eventEmulator.dispatchEvent(target, eventType, event);
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
          delete self.inviteTimers[self.myID];
        }

        self.initSubscription();

        self.sendToUser(self.inviterID, { cobrowsingAccepted: true });

        delete self.reject;
      };

      self.reject = function (reason) {

        reason = utils.isString(reason)?reason:'';

        if (self.inviteTimers[self.myID]) {
          clearTimeout(self.inviteTimers[self.myID]);
          delete self.inviteTimers[self.myID];
        }

        self.sendToUser(self.inviterID, {
          cobrowsingRejected: true,
          reason: reason
        });

        self.end();
      };

      // Autoreject by timeout.
      self.inviteTimers[self.myID] = setTimeout(function () {
        self.reject();
        delete self.inviteTimers[self.myID];
      }, self.defaultTimeout);

    }

    self.status = 'created';
    // Initialization logic
    module.trigger('sessionCreated', {
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

      module.userSubscription = module.stompClient.subscribe("/user/" + module.auth.id, function userSubscriptionMessage (event) {
        module.log('user subscription event', event);

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

    module.eventAccumulator.init();

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

      module.eventAccumulator.shutdown();

      Object.keys(module.sessions.store).forEach(function (id) {
        console.info('killing cobrowsing session by id', id, module.sessions[id]);
        if (module.sessions.store[id] && module.sessions.store[id].status != 'ended') {
          module.sessions.store[id].end();
        }
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
    module.sessions.store[event.sessionID] = event.session;
  });

  module.on('sessionEnded', function (event) {
    delete module.sessions.store[event.sessionID];
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
    /**
     * This method used to start cobrowsing session.
     *
     * @memberof CobrowsingAPI
     * @method oSDK.cobrowsing
     * @param {string} userID ID of opponent.
     * @returns {object} [CobrowsingSession] CobrowsingSession object.
     */
    cobrowsing: module.cobrowsingRequest,
    /**
     * This method used to configure defaults for new cobrowsing sessions.
     *
     * @memberof CobrowsingAPI
     * @method oSDK.cobrowsing
     * @param {string} userID ID of opponent.
     * @returns {object} [CobrowsingSession] CobrowsingSession object.
     */
    cobrowsingOptions: module.setOptions,

  });

})(oSDK);
