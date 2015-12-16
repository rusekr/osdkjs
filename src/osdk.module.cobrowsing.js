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
    excludeCSSClasses: null, //'ocobrowsing', // TODO: document

    mouseMoveTimeout: 25,
    broker: {
      proto: 'wss',
      port: null, // 8443,
      host: null // '192.168.2.161'
    }
  };

  var authCache = null;

  // Makes CSS path out of DOM elemet object.
  var getElementCSSPath = function elementLocation(el) {

    if (el === null) {
      module.warn('Got null element');
    }

    function findCSSHelper (excludeClassName) {
      if (!tmpEl || typeof tmpEl.className == 'undefined') {
        // module.warn('No element or className property, skipping', tmpEl);
        return true;
      }
      if (tmpEl.className.split(' ').indexOf(excludeClassName) != -1) {
        foundOur = true;
        return false;
      }
      return true;
    }

    var tmpEl = null;
    var exludeClassArray = [].concat(module.config('excludeCSSClasses'));
    var foundOur = false;

    tmpEl = el;
    exludeClassArray.forEach(findCSSHelper);

    // Element itself has excluded class(es).
    if (foundOur) {
      return false;
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

      if (children[i].nodeType == document.ELEMENT_NODE && module.config('excludeCSSClasses')) {

        tmpEl = children[i];
        exludeClassArray.forEach(findCSSHelper);

        if (foundOur) {
          // Don't count our UI and it`s children
          controlUI = true;
          // module.log('our UI detected in', children[i]);
          break;
        }

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

  // Emulates DOM events
  module.eventEmulator = (function() {

    var
      rkeyEvent = /^key/,
      rmouseEvent = /^(?:mouse|contextmenu)|click/,
      rwheelEvent = /^wheel/,
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
      },
      deltaModeCode = {
        DOM_DELTA_PIXEL: 0,
        DOM_DELTA_LINE: 1,
        DOM_DELTA_PAGE: 2
      };


    var instance = {};

    var generateModifirsList = function (options) {
      if (!options.modifiersList) {
        options.modifiersList = [];
        ['altKey', 'ctrlKey', 'shiftKey', 'metaKey'].forEach(function (key) {
          if (options[key]) {
            options.modifiersList.push(key);
          }
        });
        options.modifiersList = options.modifiersList.join(' ');
      }
      return options;
    };

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

      if ( rwheelEvent.test( type ) ) {
        return this.wheelEvent( type, options );
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

    instance.wheelEvent = function( type, options ) {
      var event, eventDoc, doc, body;
      options = module.utils.extend({
        bubbles: true,
        cancelable: true,
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
        relatedTarget: undefined,
        modifiersList: '',
        deltaX: 0,
        deltaY: 0,
        deltaZ: 0,
        deltaMode: 0
      }, options );

      if ( document.createEvent ) {
        event = document.createEvent( "WheelEvent" );

//         NOTICE: initWheelEvent not working for now
//         options = generateModifirsList(options);
//         event.initWheelEvent( type, options.bubbles, options.cancelable,
//           options.view, options.detail,
//           options.screenX, options.screenY, options.clientX, options.clientY,
//           options.button, options.relatedTarget || document.body.parentNode,
//           options.modifiersList,
//           options.deltaX, options.deltaY, options.deltaZ, options.deltaMode);

        event.initMouseEvent( type, options.bubbles, options.cancelable,
          options.view, options.detail,
          options.screenX, options.screenY, options.clientX, options.clientY,
          options.ctrlKey, options.altKey, options.shiftKey, options.metaKey,
          options.button, options.relatedTarget || document.body.parentNode );

        Object.defineProperty( event, "deltaX", {
          get: function() {
            return options.deltaX;
          }
        });
        Object.defineProperty( event, "deltaY", {
          get: function() {
            return options.deltaY;
          }
        });
        Object.defineProperty( event, "deltaZ", {
          get: function() {
            return options.deltaZ;
          }
        });
        Object.defineProperty( event, "deltaMode", {
          get: function() {
            return options.deltaMode;
          }
        });
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
          try {
            event = document.createEvent( "KeyboardEvents" );
            options = generateModifirsList(options);
            event.initKeyboardEvent( type, options.bubbles, options.cancelable, options.view,
              options.keyIdentifier, options.location, options.modifiersList, options.repeat, options.locale );

            // Workaround for webkit
            var getterCode = {get: function() {return options.charCode;}};
            var getterChar = {get: function() {return String.fromCharCode(options.charCode);}};
            Object.defineProperties(event, {
                charCode: getterCode,
                which: getterChar,
                keyCode: getterCode, // Not fully correct
                key: getterChar,     // Not fully correct
                char: getterChar
            });
          } catch ( errNext ) {
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
      if (!elem) {
        module.warn('Cant`t dispatch event', event, 'of type', type, 'on target', elem);
        return;
      }
      if ( elem.dispatchEvent ) {
        elem.dispatchEvent( event );
      } else if ( elem.fireEvent ) {
        elem.fireEvent( "on" + type, event );
      }
    };

    return instance;

  })();

  // Grabs DOM events and signals to sessions
  module.eventAccumulator = (function () {

    var subscriptions = {};

    var transmitEvent = function (data) {
      if (0/*data.type != 'mousemove'*/) {
        module.log('transmitting event', data);
      }
      Object.keys(subscriptions).forEach(function (ID) {
        if(module.utils.isFunction(subscriptions[ID])) {
          subscriptions[ID].call(this, data);
        }
      });
    };

    // mouse* and wheel events
    var grabLastTime = 0;
    var grabMouse = function(e) {
      e = e || window.event;

      if (e.type == 'mousemove' && module.config('mouseMoveTimeout')) {
        var now = Date.now();
        if (now - module.config('mouseMoveTimeout') < grabLastTime) {
          return;
        }
        grabLastTime = now;
      }

      var target = e.target || e.srcElement;
      var targetPath = getElementCSSPath(target);
      // module.info('targetPath', targetPath);
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
          targetPath: targetPath,
          options: {
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            offsetX: (target.getBoundingClientRect ? (e.pageX - target.getBoundingClientRect().left) : false ) || (e.offsetX===undefined?e.layerX:e.offsetX),
            offsetY: (target.getBoundingClientRect ? (e.pageY - target.getBoundingClientRect().top) : false ) || (e.offsetY===undefined?e.layerY:e.offsetY),
            detail: e.detail || e.deltaX || e.deltaY || e.deltaZ || 0, // NOTICE: Hack for wheel
            deltaX: e.deltaX || 0,
            deltaY: e.deltaY || 0,
            deltaZ: e.deltaZ || 0,
            deltaMode: e.deltaMode || 0
          }
        };
        // module.log('emitting captured event for listeners', e);
        transmitEvent(eventObject);
      }
    };

    var grabKeyboard = function(e) {
      var target = e.target || e.srcElement;
      var targetPath = getElementCSSPath(target);
      if (!e.osdkcobrowsinginternal && targetPath) {
        var eventObject = {
          type: e.type,
          targetPath: targetPath,
          options: {
            ctrlKey: e.ctrlKey,
            altKey: e.altKey,
            shiftKey: e.shiftKey,
            metaKey: e.metaKey,
            detail: e.detail,
            which: e.which,
            keyCode: e.keyCode,
            charCode: e.charCode,
            keyIdentifier: e.keyIdentifier,
            location: e.location,
            repeat: e.repeat
          }
        };
        transmitEvent(eventObject);
      }
    };

    var grabFocus = function(e) {
      var target = e.target || e.srcElement;
      var targetPath = getElementCSSPath(target);
      if (!e.osdkcobrowsinginternal && targetPath) {
        var eventObject = {
          type: e.type,
          targetPath: targetPath,
          options: {
            detail: e.detail
          }
        };
        transmitEvent(eventObject);
      }
    };

    var grabChange = function(e) {
      var target = e.target || e.srcElement;
      var targetPath = getElementCSSPath(target);
      if (!e.osdkcobrowsinginternal && targetPath) {
        var eventObject = {
          type: 'change', // Rewriting keyup when needed
          targetPath: targetPath,
          options: {
            detail: e.detail,
            value: target.value ? target.value : ''
          }
        };
        transmitEvent(eventObject);
      }
    };

    var startGrabbing = function () {
      document.body.addEventListener('mousemove', grabMouse, true); // NOTICE: not working if too little content on page that body and even document height less than height of browser window.

      document.body.addEventListener('wheel', grabMouse, true);// FIXME: Grabbed but synthetic variant of eventEmulator do not respected by at least native scrollable textareas

      document.body.addEventListener('click', grabMouse, true);
      document.body.addEventListener('mousedown', grabMouse, true);
      document.body.addEventListener('mouseup', grabMouse, true);

      document.body.addEventListener('mouseover', grabMouse, true); // FIXME: Grabbed but synthetic variant of eventEmulator do not respected by browser
      document.body.addEventListener('mouseout', grabMouse, true); // FIXME: Grabbed but synthetic variant of eventEmulator do not respected by browser

      document.body.addEventListener('focus', grabFocus, true); // FIXME: Grabbed but synthetic variant of eventEmulator do not respected by browser

      document.body.addEventListener('change', grabChange, true);
      document.body.addEventListener('keyup', grabChange, true); // Emulate maybe change

      document.body.addEventListener('keydown', grabKeyboard, true);
      document.body.addEventListener('keyup', grabKeyboard, true);
      document.body.addEventListener('keypress', grabKeyboard, true);
    };

    var stopGrabbing = function () {
      document.body.removeEventListener('mousemove', grabMouse, true);

      document.body.removeEventListener('wheel', grabMouse, true);

      document.body.removeEventListener('click', grabMouse, true);
      document.body.removeEventListener('mousedown', grabMouse, true);
      document.body.removeEventListener('mouseup', grabMouse, true);

      document.body.removeEventListener('mouseover', grabMouse, true);
      document.body.removeEventListener('mouseout', grabMouse, true);

      document.body.removeEventListener('focus', grabFocus, true);

      document.body.removeEventListener('change', grabChange, true);
      document.body.removeEventListener('keyup', grabChange, true); // Emulate "maybe" change

      document.body.removeEventListener('keydown', grabKeyboard, true);
      document.body.removeEventListener('keyup', grabKeyboard, true);
      document.body.removeEventListener('keypress', grabKeyboard, true);
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


  module.domDataGrabber = (function () {

    function isCheckable(el) {
      var type = (el.type || "text").toLowerCase();
      if (el.tagName == "INPUT" && ["radio", "checkbox"].indexOf(type) != -1) {
        return true;
      }
      return false;
    }

    function collectForms () {
      var elements = Array.prototype.slice.call(document.querySelectorAll('input, select, textarea'));

      var formsData = [];

      elements.forEach(function (element) {
        var formData = {
          targetPath: getElementCSSPath(element),
          type: element.type.toLowerCase(),
          value: (element.type.toLowerCase() == 'textarea' ? element.innerHTML : element.value),
          checked: element.checked
        };
        // Collect only non-excluded forms.
        if (formData.targetPath) {
          formsData.push(formData);
        }
      });

      return formsData;
    }

    return {
      // Start grabbing
      grabForms: function () {
        return collectForms();
      }

    };
  })();

    // Stomp library wrapper.
  var stompClient = function (URI) {
    var client = Stomp.client(URI);

    // Custom methods.
    client.sendToUser = function (userID, data) {
      userID = authCache.autoDomainHelper(userID);
      return client.send('/user/' + userID, {}, JSON.stringify(data));
    };

    client.sendInSession = function (sessionID, data) {
      return client.send('/cobrowsing/' + sessionID, {}, JSON.stringify(data));
    };

    client.logLevel = 0; // NOTICE: STOMP client library debug

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

    module.trigger('cobrowsingSession', session);

    session.initSubscription();

    session.inviteUser(data.userID);

  };

  SessionsManager.prototype.inviteAccepted = function (data) {
    var session = this.store[data.sessionID];
    if (session) {
      if (session.inviteTimers[data.senderID]) {
        clearTimeout(session.inviteTimers[data.senderID]);
        session.inviteTimers[data.senderID] = null;
      }
      session.trigger('accepted', data);
    }
  };

  SessionsManager.prototype.inviteRejected = function (data) {
    var session = this.store[data.sessionID];
    if (session) {
      session.trigger('rejected', data);
      if(session.participants.length == 1) {
        session.end();
      }
    }
  };

  SessionsManager.prototype.userAdded = function (data) {
    var session = this.store[data.sessionID];
    if (session) {
      session.participants[data.senderID] = true;
      session.trigger('userAdded', data);
    }
  };

  SessionsManager.prototype.userRemoved = function (data) {
    var session = this.store[data.sessionID];
    if (session) {
      delete session.participants[data.senderID];
      session.trigger('userRemoved', data);
      if(session.participants.length <= 1) {
        session.end();
      }
    }
  };

  module.sessions = new SessionsManager();

/**
  * Cobrowsing session object. Emitted as first parameter of {@link CobrowsingAPI.html#cobrowsingSession cobrowsingSession} event. With this object you can control associated cobrowsing channel. Each channel is represented with separate <code>CobrowsingSession</code> object.
  *
  * @constructor CobrowsingSession
  */
  var CobrowsingSession = function oSDKCobrowsingSession (configObject) {
    var self = this;

    var utils = module.utils;
    var stompClient = module.stompClient;
    var warn = module.warn;
    var auth = authCache;

    var messageSkel = function (configObject) {

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

    /**
    * My ID.
    *
    * @alias myID
    * @memberof CobrowsingSession
    * @instance
    * @type string
    */
    self.myID = auth.id;

    /**
    * Current session ID.
    *
    * @alias id
    * @memberof CobrowsingSession
    * @instance
    * @type string
    */
    self.id = configObject.sessionID || utils.uuid();

    /**
    * ID of user initiated this session.
    *
    * @alias initiatorID
    * @memberof CobrowsingSession
    * @instance
    * @type string
    */
    self.initiatorID = configObject.initiatorID || self.myID;

    /**
    * ID of user invited current user to this session (may be any session user, not always session initiator).
    *
    * @alias inviterID
    * @memberof CobrowsingSession
    * @instance
    * @type string
    */
    self.inviterID = configObject.senderID || self.initiatorID;

    /**
    * Current session participants as object. Each key - ID of participant. It can be iterated with Object.keys(participants).forEach() method.
    *
    * @alias participants
    * @memberof CobrowsingSession
    * @instance
    * @type object
    * @property {number} length - Number of participants
    */
    self.participants = {};

    /**
    * This flag determines whether this session is incoming or requested by current user.
    *
    * @alias incoming
    * @memberof CobrowsingSession
    * @instance
    * @type boolean
    */
    self.incoming = ((self.myID != self.initiatorID) ? true : false);
    self.inviteTimers = {};
    self.defaultTimeout = 30000; // TODO: make configurable through cobrowsingOptions
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
            if (event.body.targetPath) {
              event.body.target = document.querySelector(event.body.targetPath);
            }

            // Mouse coordinates normalize to target related
            if (event.body.options.offsetX && event.body.target) {
              event.body.options.x = (event.body.options.offsetX + event.body.target.getBoundingClientRect().left);
              event.body.options.y = (event.body.options.offsetY + event.body.target.getBoundingClientRect().top);
            }

            if (event.body.type == 'form-sync') {
              if (event.body.elements && module.utils.isArray(event.body.elements)) {
                event.body.elements.forEach(function (target, index) {
                  event.body.elements[index].target = document.querySelector(event.body.elements[index].targetPath);
                });
              }
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

      // Starting to send cobrowsing information in session TODO: make capturing and sending own events switchable off.
      self.eventSubscription = module.eventAccumulator.on(function (event) {
        if (self.participants.length < 2) {
          return;
        }
        self.sendInSession(event);
      });
    };

    /**
    * Collect and send html forms data to other users of this session.
    *
    * @alias sendForms
    * @memberof CobrowsingSession
    * @instance
    */
    self.sendForms = function () {
      var formData = module.domDataGrabber.grabForms();
      self.sendInSession({
        type: 'form-sync',
        elements: formData
      });
    };

    self.killSubscription = function () {
      module.eventAccumulator.off(self.eventSubscription);
      self.stompSubscription.unsubscribe();
    };

    /**
    * Send custom message to other users in this session.
    *
    * @alias sendInSession
    * @memberof CobrowsingSession
    * @instance
    * @param {object} data - Data to send.
    */
    self.sendInSession = function (data) {
      stompClient.sendInSession(self.id, messageSkel(data));
    };

    self.sendToUser = function (userID, data) {
      stompClient.sendToUser(auth.autoDomainHelper(userID), messageSkel(data));
    };

    /**
    * Invite user to this session.
    *
    * @alias inviteUser
    * @memberof CobrowsingSession
    * @instance
    * @param {string} userID - ID of user to invite.
    */
    self.inviteUser = function (userID) {

      userID = auth.autoDomainHelper(userID);

      if (self.participants[userID]) {
        warn(userID + ' is already cobrowsed with.');
        return;
      }

      if (self.inviteTimers[userID]) {
        warn('Inviting of ' + userID + ' in progress.');
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

    /**
    * Disconnect from this session. Other users of this session will get 'userRemoved' event.
    *
    * @alias end
    * @memberof CobrowsingSession
    * @instance
    */
    self.end = function () {
      if (self.status == 'subscribed') {
        // Send to participants
        Object.keys(self.participants).forEach(function (userID) {
          if (userID != self.myID) {
            self.sendToUser(userID, {
              cobrowsingUserRemoved: true
            });
          }
        });
        self.killSubscription();
      }

      // Clearing inviteTimers and sending self removal to invited users.
      Object.keys(self.inviteTimers).forEach(function (userID) {
        clearTimeout(self.inviteTimers[userID]);
        delete self.inviteTimers[userID];
        if (userID != self.myID) {
          self.sendToUser(userID, {
            cobrowsingUserRemoved: true
          });
        }
      });

      self.status = 'ended';
      self.trigger('ended');

      module.trigger('sessionEnded', { sessionID: self.id });
    };

    /**
    * Method to conveniently fire incoming DOM events to self page html elements. Can be easily used with data provided by `message` session event.
    *
    * @alias fireEvent
    * @memberof CobrowsingSession
    * @instance
    * @param {string} eventType - Type of event to fire.
    * @param {DOMNodeObject} node - Target element to fire event on.
    * @param {object} options - Event options.
    */
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

    /**
    * Dispatched for current user when subscription to event-broadcasting server is initiated.
    *
    * @memberof CobrowsingSession
    * @event CobrowsingSession#subscribed
    */

    /**
    * Dispatched for inviter if invited user accepted this session.
    *
    * @memberof CobrowsingSession
    * @event CobrowsingSession#accepted
    * @param {object} data - Data object for this event.
    * @param {string} data.senderID - ID of user accepted session.
    */

    /**
    * Dispatched for inviter if invited user rejected this session.
    *
    * @memberof CobrowsingSession
    * @event CobrowsingSession#rejected
    * @param {object} data - Data object for this event.
    * @param {string} data.senderID - ID of user rejected session.
    *
    */

    /**
    * Dispatched when session ended for current user.
    *
    * @memberof CobrowsingSession
    * @event CobrowsingSession#ended
    *
    */

    /**
    * Dispatched when user added to current session.
    *
    * @memberof CobrowsingSession
    * @event CobrowsingSession#userAdded
    * @param {object} data - Data object for this event.
    * @param {string} data.senderID - ID of user added to session.
    *
    */

    /**
    * Dispatched when user removed from current session.
    *
    * @memberof CobrowsingSession
    * @event CobrowsingSession#userRemoved
    * @param {object} data - Data object for this event.
    * @param {string} data.senderID - ID of user removed from session.
    *
    */

    /**
    * Dispatched when message with cobrowsing data arrived from other user. Main event for handling shared cobrowsing data.
    *
    * @memberof CobrowsingSession
    * @event CobrowsingSession#message
    * @param {object} data - Data object for this event. See sample application for extended information.
    * @param {string} data.senderID - ID of user sent this data.
    * @param {string} data.type - event name or other type of cobrowsing information.
    * @param {DOMNodeObject} data.target - DOM node to fire event on or related to other type of cobrowsing information html object.
    * @param {object} data.options - Object with options for event or other type of cobrowsing information.
    * @param {array} data.elements - Array of targets and it`s states for global forms syncronization (generated by sendForms session method).
    *
    */

    /**
    * Set handlers for this session events.
    *
    * @alias on
    * @memberof CobrowsingSession
    * @instance
    * @param {string} eventName - Name of one of the session events.
    * @param {function} callback - Function-handler for that event.
    */
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

      /**
      * Accept this incoming session and add self to it.
      *
      * @alias accept
      * @memberof CobrowsingSession
      * @instance
      */
      self.accept = function () {
        // Clearing timeout
        if (self.inviteTimers[self.myID]) {
          clearTimeout(self.inviteTimers[self.myID]);
          delete self.inviteTimers[self.myID];
        }

        // If inviter was lone session user and removed self from it before accepted by current user no need to even subscribe
        if (self.participants.length) {
          self.initSubscription();
        }
        // Inviter can end session before current user accepts it.
        if (self.participants[self.inviterID]) {
          self.sendToUser(self.inviterID, { cobrowsingAccepted: true });
        }
        delete self.reject;

      };

      /**
      * Reject this incoming session.
      *
      * @alias reject
      * @memberof CobrowsingSession
      * @instance
      */
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
    authCache = data;

    // Forming STOMP URI
    authCache.stompURI = module.config('broker.proto') + '://';
    authCache.stompURI +=
      module.config('broker.host') ? ((module.config('broker.host') + (module.config('broker.port') ? ':' + module.config('broker.port') : ''))) : ((authCache.services.stomp && Array.isArray(authCache.services.stomp) && authCache.services.stomp.length && module.utils.isString(authCache.services.stomp[0].uri)) ? authCache.services.stomp[0].uri.split(';')[0] : '');

    // Creating STOMP client
    module.stompClient = stompClient(authCache.stompURI);

    // Connecting to STOMP broker
    module.stompClient.connect(authCache.username, authCache.password, function connectCallback (event) {
      module.status = 'connected';
      module.trigger('connected');

      module.userSubscription = module.stompClient.subscribe("/user/" + authCache.id, function userSubscriptionMessage (event) {
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

          } else if (data.textMessage) {

            module.trigger('cobrowsingTextMessage', {
              senderID: data.senderID,
              message: data.message
            });

          }
        }

      });

    }, function errorCallback (event) {
      module.trigger(['connectionFailed'], new module.Error({
        message: "Cobrowsing STOMP broker connection error.",
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
      userID: authCache.autoDomainHelper(userID)
    });

    return session;
  };

  module.sendTextMessage = function oSDKCobrowsingSendTextMessage (userID, message) {
    userID = authCache.autoDomainHelper(userID);
    module.stompClient.sendToUser(userID, {
      senderID: authCache.id,
      textMessage: true,
      message: message
    });
  };

  module.setOptions = function oSDKCobrowsingSetOptions (path, value) {
    return module.config(path, value);
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
    * Dispatched when cobrowsing module created cobrowsing session from current or other user`s request.
    *
    * @memberof CobrowsingAPI
    * @event cobrowsingSession
    * @param {CobrowsingSession} cobrowsingSession - New cobrowsing session.
    *
    */
    'cobrowsingSession': { client: true },

    /**
    * Dispatched when cobrowsing module got incoming text message.
    *
    * @memberof CobrowsingAPI
    * @event cobrowsingTextMessage
    * @param {CobrowsingTextMessage} cobrowsingTextMessage - Text message object.
    * @param {string} cobrowsingTextMessage.senderID - ID of user sent message.
    * @param {string} cobrowsingTextMessage.message - Text message string.
    *
    */
    'cobrowsingTextMessage': { client: true },

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
     * This method used to request cobrowsing session with given user. Session will be returned with {@link cobrowsingSession CobrowsingSession} event.
     *
     * @memberof CobrowsingAPI
     * @method oSDK.cobrowsing
     * @param {string} userID - ID of opponent.
     * @returns {CobrowsingSession} cobrowsingSession - CobrowsingSession object.
     */
    cobrowsing: module.cobrowsingRequest,

    /**
     * This method used to send text message to given user.
     *
     * @memberof CobrowsingAPI
     * @method oSDK.cobrowsingTextMessage
     * @param {string} userID - ID of user to send message.
     * @param {string} textMessage - Text message to send.
     */
    cobrowsingTextMessage: module.sendTextMessage,

    /**
     * This method used to configure defaults for new cobrowsing sessions and some common cobrowsing options.
     * Parameters can be:<br>
     * 'excludeCSSClasses' - exclude html elements marked with this classes and it`s children from capturing and transmitting assoceated events. Can be string or array of strings.
     *
     * @memberof CobrowsingAPI
     * @method oSDK.cobrowsingOptions
     * @param {string} parameterName - Name of parameter.
     * @param {*} [parameterValue] - Parameter value.
     * @returns {*} actualValue - Actual parameter value.
     */
    cobrowsingOptions: module.setOptions
  });

})(oSDK);
