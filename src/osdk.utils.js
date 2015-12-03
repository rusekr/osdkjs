/**
 * oSDK utils module.
 */

(function (oSDK) {
  "use strict";

  // Implanting oSDK version string
  Object.defineProperties(oSDK, {
    version: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: '<%= buildversion %>'
    }
  });

  // Store objects

  var modules = {};
  var namespaces = {};
  var factory = {}; // Internal cross-module object for Module factory
  var methods = {};
  var events = {};
  var mainConfig = {};
  var earlyEvents = [];
  var earlyEventsTriggered = false;
  var earlyMainEvents = {
    DOMContentLoaded: false
//     mergedUserConfig: false,
  };
  Object.defineProperties(earlyMainEvents, {
    fired: {
      enumerable: false,
      get: function () {
        var all = 0;
        var fired = 0;
        for (var i in this) {
          if (i != 'fired' && this.hasOwnProperty(i)) {
            all++;
            if (this[i] !== false) {
              fired++;
            }
          }
        }
        if (fired === 0) {
          return 'none';
        } else if (fired < all) {
          return 'any';
        } else {
          return 'all';
        }
      }
    }
  });


  // Generic functions

  /*
   * Test var types
   * @isNumber
   * @isArray
   * @isObject
   * @isBoolean
   * @isString
   * @isNull
   * @isEmpty
   */
  var isNumber = function(value) {
    return (!isNaN(parseFloat(value)) && isFinite(value));
  };

  var isArray = function(value) {
    return Array.isArray(value);
  };

  var isObject = function(value) {
    function fnIsNull(value) {
      return ((value === undefined) || (value === null));
    }
    function fnIsEmpty(value) {
      return (fnIsNull(value) || ((typeof value.length !== 'undefined') && (value.length === 0)));
    }
    function fnIsArray(value) {
      return Array.isArray(value);
    }
    return (!fnIsEmpty(value) && !fnIsArray(value) && (typeof value == 'object'));
  };

  var isFunction = function (obj) {
    if ( obj === null || Object.prototype.toString.call(obj) !== '[object Function]' ) {
      return false;
    }
    return true;
  };

  var isBoolean = function (value) {
    return (typeof value == 'boolean');
  };

  var isString = function (value) {
    return (typeof value == 'string');
  };

  var isNull = function (value) {
    return ((value === undefined) || (value === null));
  };

  var isEmpty = function (value) {
    function fnIsNull(value) {
      return ((value === undefined) || (value === null));
    }
    return (fnIsNull(value) || ((typeof value.length !== 'undefined') && (value.length === 0)));
  };

  /*
   * Pad number with leading zeroes
   */
  var pad = function (num, size) {
    var s = num + "";
    while (s.length < size) {
      s = "0" + s;
    }
    return s;
  };

  /*
   * UUID generator
   */
  var uuid = function () {
    var s4 = function () {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    };

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
          s4() + '-' + s4() + s4() + s4();
  };

  /*
   * List constructor function. Works with any objects. Functions: find, remove, add
   */
  var list = function () {
    var store = [];

    this.add = function () {
      return store.push.apply(store, Array.prototype.slice.call(arguments, 0));
    };

    this.addUnique = function (object) {
      if (this.find(object)) {
        return false;
      } else {
        return this.add(object);
      }
    };

    this.each = function () {
      return store.forEach.apply(store, Array.prototype.slice.call(arguments, 0));
    };

    this.remove = function (obj) {
      var idx = store.indexOf(obj);
      if (idx !== -1) {
        store.splice(idx, 1);
        return true;
      }
      return null;
    };

    this.find = function (obj) {
      var idx = store.indexOf(obj);
      if (idx != -1) {
        return obj;
      }
      return null;
    };

    this.show = function () {
      return store;
    };

    this.toArray = function () {
      return store;
    };

    this.toString = function () {
      return store.toString();
    };

    this.fromArray = function (array) {
      store = array;
    };

    Object.defineProperties(this, {
      length: {
        enumerable: true,
        get: function () {
          return store.length;
        }
      }
    });

  };

  /*
   * Returns or updates value in object by specified path
   */
  var pathManage = function pathManage (obj, path, value) {
    var parts = path.split('.');
    var i, tmp;
    for(i = 0; i < parts.length; i++) {
        // if (Object.prototype.hasOwnProperty())
        tmp = obj[parts[i]];
        if (value !== undefined) {
          if (i === parts.length - 1) {
              tmp = obj[parts[i]] = value;
          }
          else if(tmp === undefined) {
              tmp = obj[parts[i]] = {};
          }
        }
        obj = tmp;

        if (tmp === undefined) {
          break;
        }
    }
    return obj;
  };

  /*
   * Safe hasOwnProperty property replacement
   */
  var ownProperty = function (obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };

  /*
   * Iterator for arrays and objects
   */
  var each = function (obj, fn, ignoreHasOwnProperty) {
    if (obj.length) {
      for (var i = 0, ol = obj.length, v = obj[0]; i < ol && fn(v, i) !== false; v = obj[++i]);
    } else {
      for (var p in obj) {
        if (!ignoreHasOwnProperty && !ownProperty(obj,p)) {
          continue;
        }
        if (fn(obj[p], p) === false) {
          break;
        }
      }
    }
  };

  /*
   * JQuery-like object extender
   * if first parameter is true - deep extend
   * if first parameter is string containing "deep" - deep extend
   * if first parameter is string containing "addonly" - function will not replace any existing input object properties
   */
  var extend = function () {

    var self = this;

    var args = Array.prototype.slice.call(arguments, 0);
    var inObj = args.shift();
    var deep = false;
    var addonly = false;

    // Checking for deep copy flag as first param
    if ( inObj === true ) {
      deep = inObj;
      inObj = args.shift();
    }
    if (isString(inObj)) {
      if (inObj.indexOf('deep') != -1) {
        deep = inObj;
      }
      if (inObj.indexOf('addonly') != -1) {
        addonly = true;
      }
      inObj = args.shift();
    }

    if (!isObject(inObj)) {
      return inObj;
    }

    args.forEach(function (obj) {

      if (!isObject(obj)) {
        // Continue
        return;
      }

      for (var key in obj) {

        // Translating only object's own properties
        if (!ownProperty(obj, key)) {
          continue;
        }

        if (isObject(obj[key])) {

          if (deep) {

            if (!isObject(inObj[key])) {
              // Just replacing all other with object in priority
              if (!inObj[key] || !addonly) {
                inObj[key] = {};
              }
            }
            // More recursion allowed
            if (isObject(inObj[key])) {
              extend(deep, inObj[key], obj[key]);
            }
          } else {
            // Just replacing
            if (!inObj[key] || !addonly) {
              inObj[key] = obj[key];
            }
          }
        } else {
          // Just copying anything else
          if (!inObj[key] || !addonly) {
            inObj[key] = obj[key];
          }
          continue;
        }
      }
    });
    return inObj;
  };

  /**
   * oSDK module object constructor.
   *
   * @alias Module
   * @private
   *
   * @param {String} name - Name of module to create.
   *
   */
  var Module = function oSDKModule(name) {
    var self = this;
    var debugInt = true; // Per-module debug default setting (TODO: parametrize by grunt).
    var nameInt = name;
    var clientModuleName = 'client'; // Client module name. (TODO: universalize trigger function and registerEvents interface for not to use 'special' modules).

    var eventSkel = function (initObject) {
      return extend({
        emittersObject: {},
        emitters: [],
        listeners: []
      }, initObject);
    };

    var listenerSkel = function (initObject) {
      return extend({
        id: null,
        handler: null,
        last: true,
        module: null,
        data: {} // Cumulative data to fire with.
      }, initObject);
    };

    var emitterSkel = function (initObject) {
      var defaultObj = {
        other: false,
        self: false,
        fired: [],
        clears: null,
        module: null,
        data: {}
      };
      defaultObj[clientModuleName] = false; // Dynamic property.
      return extend(defaultObj, initObject);
    };

    Object.defineProperties(self, {
      debug: {
        enumerable: true,
        get: function () {
          return debugInt;
        },
        set: function (flag)  {
          debugInt = !!flag;
          return debugInt;
        }
      },
      oSDKModule: {
        enumerable: true,
        get: function () {
          return true;
        }
      },
      name: {
        enumerable: true,
        get: function () {
          return nameInt;
        }
      },
      clientModuleName: {
        enumerable: true,
        get: function () {
          return clientModuleName;
        }
      }
    });

    /*
    * Console.log/warn/err/.. oSDK wrappers
    */
    var lf = function (method) {
      return function () {
        // Function respects global and module-specific debug
        if (!self.debug) {
          return;
        }
        var d = new Date();

        var arr = ['%coSDK %c' + d.toLocaleTimeString() + ':' + pad(d.getMilliseconds(), 3), ];
        arr = arr.concat(['color:#2792ff', 'color:#0052ff']);
        if (self.oSDKModule && self.name != 'utils') {
          arr[0] += (' %c' + self.name);
          arr.push('color:#1020ff');
        }
        arr[0] += '%c: ';
        arr.push('color:black');

        var args = Array.prototype.slice.call(arguments, 0);
        if (isString(args[0])) {
          arr[0] += args.shift();
        }

        console[method].apply(console, arr.concat(args));
      };
    };

    ["assert","clear","dir","error","group", "groupCollapsed", "groupEnd", "info","log","profile","profileEnd","time", "timeEnd", "trace", "warn"].forEach( function (method) {
      self.constructor.prototype[method] = lf(method);
      self[method] = self.constructor.prototype[method].bind(self);
    });

    /**
    * oSDK error object prototype
    *
    * @constructor Error
    *
    */
    self.constructor.prototype.Error = function Error (eobj) {
      // Defaults
      this.oSDKError = true; // Identificator because "instanceof oSDKError" is not working out of this scope
      /**
       * Alphanumeric code of error.
       *
       * @alias ecode
       * @memberof Error
       * @instance
       * @type string
       * @default 0
       */
      var ecode = 0;
      Object.defineProperties(this, {
        ecode: {
          enumerable: true,
          get: function () {
            return self.name+ecode;
          },
          set: function (value) {
            ecode = value;
          }
        }
      });
      /**
       * Module name error come from.
       *
       * @alias module
       * @memberof Error
       * @instance
       * @type string
       */
      this.module = self.name;
      /**
       * Error message.
       *
       * @alias message
       * @memberof Error
       * @instance
       * @type string
       */
      this.message = "Unspecified error";
      /**
       * HTML version of error message.
       *
       * @alias htmlMessage
       * @memberof Error
       * @instance
       * @type string
       */
      this.htmlMessage = null;
      /**
       * Custom error data. In case of failed module - failure specific data.
       *
       * @alias data
       * @memberof Error
       * @instance
       * @type object
       */
      this.data = {};
      /**
       * Returns cumulative error description.
       *
       * @alias toString
       * @memberof Error
       * @instance
       * @returns {string} Error string
       *
       */
      this.toString = function(){return 'oSDKError: module ' + this.module + ': code ' + this.ecode + ': ' + this.message;};

      // Updating properties
      var selfError = this;

      if (isString(eobj)) {
        this.message = eobj;
      } else if (isObject(eobj)) {
        each(eobj, function (prop, propname) {
          selfError[propname] = prop;
        });
      }

      // Html message => plain message if not defined
      if(this.htmlMessage === null) {
        this.htmlMessage = this.message;
      }
      self.log('Throwing error with data', this);
    };
    self.Error = self.constructor.prototype.Error.bind(self);

    // Binding factory.
    self.factory = factory;

    // WebSocket client constructor (for secure connections only for now).
    //self.constructor.prototype.WebsocketClient = function oSDKWebsocketClient () {
    self.constructor.prototype.WebsocketClient = function oSDKWebsocketClient () {

      var wssServerURL = null; // Server URI.
      var wss = null; // WebSocket object.
      var eventListeners = {}; // Callbacks object.

      // Runs events callbacks
      var fireCallbacks = function (context, eventType, eventData) {
        if (!eventListeners[eventType]) {
          self.warn('Callbacks to eventType', eventType, 'are undefined');
          return;
        }
        each(eventListeners[eventType], function (listener) {
          if (typeof listener == 'function') {
            listener.call(context, eventData);
          }
        });
      };

      this.isConnected = function () {
        return (wss !== null && wss.readyState == 1)?true:false;
      };

      this.connect = function (serverURL) {

        if(wss !== null && wss.readyState == 1) {
          self.warn("Already connected", wss.readyState);
          return;
        }

        if(wss !== null && wss.readyState == 2) {
          self.warn("Disconnecting in process", wss.readyState);
          return;
        }

        wssServerURL = serverURL;
        wss = new WebSocket(wssServerURL);

        wss.onopen = function(event) {
          self.log("Connection connected", event);
          fireCallbacks(self, 'connected', event);
        };

        wss.onclose = function(event) {
          self.log("Connection disconnected", event, wss);
          fireCallbacks(self, 'disconnected', event);
        };

        wss.onerror = function(event) {
          self.log("Connection error", event);
          wss.close();
          fireCallbacks(self, 'error', event);
        };

        wss.onmessage = function(event) {
          self.log("Message received", event);
          fireCallbacks(self, 'message', event);
        };
      };

      this.disconnect = function () {
        if(wss === null || wss.readyState == 2 || wss.readyState == 3) {
          return;
        }
        self.log("Closing connection with ", wssServerURL);
        // Waiting for data transfer completion.
        if(wss.bufferedAmount) {
          self.log("Data being sended found while closing connection. Waiting.. ", wssServerURL);
          setTimeout(function () {
            instance.disconnect();
          }, 500);
          return;
        }
        wss.close();
      };

      this.send = function (data) {
        if(wss === null || wss.readyState != 1) {
          return;
        }
        self.log("Sending message to ", wssServerURL, data);
        wss.send(data);
      };

      this.on = function (eventType, handler) {
        if (!eventListeners[eventType]) {
          eventListeners[eventType] = [];
        }
        eventListeners[eventType].push(handler);
        return 0;
      };

      this.off = function (id) {
        delete eventListeners[id];
      };

      this.Websocket = wss;
    };
    //self.WebsocketClient = self.constructor.prototype.WebsocketClient.bind(self);

      // JQuery like simple ajax wrapper
    self.constructor.prototype.ajax = function oSDKajax (config) {

      var self = this;

      self.log('sending ajax with config', config);
      var dConfig = {
        url: '',
        type: 'GET',
        data: {},
        dataType: null,
        success: function () {},
        error: function () {},
        async: true,
        headers: {},
        username: null,
        password: null
      };

      config = extend({}, dConfig, config);

      // encodeURIComponent

      // Request data forming
      // String data goes as is.
      if (config.dataType) {
        if (config.dataType == 'json') {
          config.data = JSON.stringify(config.data);
        }
      } else {
        if (typeof(config.data) != 'string') {
          // Data encoding for requests
          if (typeof(config.data) == 'object') {
            var tempData = [];
            each(config.data, function (d, i) {
              tempData.push(encodeURIComponent(i) + '=' + encodeURIComponent(d));
            });
            config.data = tempData.join('&');
          }
        }
      }
      // For 'get' in url, for other - in body
      if (config.type.toLowerCase() == 'get' && config.data && config.data !== null) {
        var delim = '?';
        if (config.url.match(/\?/)) {
          delim = '&';
        }
        config.url += delim+config.data;
        config.data = null;
      }

      var r = new XMLHttpRequest();

      var setHeaders = function () {
        // Headers stuff
        if (!config.headers['Content-Type']) {
          r.setRequestHeader("Content-Type","application/json; charset=UTF-8");
        }
        if (!config.headers.Accept) {
          r.setRequestHeader("Accept","*/*");
        }
        for (var h in config.headers) {
          r.setRequestHeader(h, config.headers[h]);
        }
      };

      r.open(config.type, config.url, config.async,config.username, config.password);

      setHeaders();

      // ReadyStateChange handlers
      r.onreadystatechange = function () {
        var responseText = '';
        if (r.readyState != 4) {
          return;
        }
        if (r.status != 200) {
          config.error.call(config.error, r);
          return;
        }

        try {
          responseText = JSON.parse(r.responseText);
        } catch (e) {
          // Whoops, not a json..
          self.log(e);
          responseText = r.responseText;
        }

        config.success.call(config.success, responseText, r);
      };

      r.send(config.data);
      return r;
    };
    self.ajax = self.constructor.prototype.ajax.bind(self);


    /**
    * Adds custom callback for specified event type.
    * Returns id of added listener for removing through {@link off}.
    *
    * @private
    * @instance
    *
    * @param {(string|string[])} eventTypes Name or array of names of events to listen.
    */
    self.constructor.prototype.on = function oSDKon (eventTypes, eventHandler) {

      var ids = [];
      eventTypes = [].concat(eventTypes);

      each(eventTypes, function (eventType) {

        var eventNameArr = eventType.split(':');
        var fireLast = (self.name == clientModuleName) ? true : false; // By default grouped event go to client listeners by last emitter fired and to other modules when each emitter fired.

        if ( eventNameArr.length > 1) {
          eventType = eventNameArr[0];
          if ( eventNameArr[1] == 'last' ) {
            fireLast = true;
          }
          if ( eventNameArr[1] == 'every' ) {
            fireLast = false;
          }
        }

        if (!events[eventType]) {
          // self.log('Creating event skel for', eventType, 'by listener.');
          events[eventType] = eventSkel();
        }
        var id  = uuid();
        var listener = listenerSkel({
          id: id,
          handler: eventHandler,
          module: self.name,
          last: fireLast
        });

        events[eventType].listeners.push(listener);
        ids.push(id);

        self.log('Added listener for event:', eventType, 'which will be firing', (!fireLast ? 'every' : 'last'), 'emitter fired.');
      });
      return (ids.length == 1)?ids[0]:ids;
    };
    self.on = self.constructor.prototype.on.bind(self);

    /*
    * Removes custom callbacks for events by id or by eventType
    * by event type or id generated through {@link on}
    *
    */
    self.constructor.prototype.off = function oSDKoff (eventTypeOrID) {

      if (events[eventTypeOrID]) {
        // Removing all listeners for eventType
        events[eventTypeOrID].listeners = [];
        self.log('Removed all listeners for event', eventTypeOrID);
      } else {
        // Searching and removing
        var foundById = false;
        var removeListener = function (id, i) {
          if (events[eventType].listeners[i].id == eventTypeOrID) {
            events[eventType].listeners.splice(i,1);
            foundById = true;
            return false;
          }
        };
        for (var eventType in events) {
          events[eventType].listeners.forEach(removeListener);
        }
        if (!foundById) {
          // Non fatal
          throw new self.Error('Can\'t remove event listener(s) - this event type or ID is not registered.');
        }
      }
    };
    self.off = self.constructor.prototype.off.bind(self);

    /**
     * @typedef triggerConfigObject
     * @type {object}
     * @instance
     *
     * @private
     *
     * @property {(string|string[])} type - Name or array of names for events to trigger.
     * @property {string} data - Data to pass to event.
     * @property {number} context - Context to trigger event within.
     * @property {Array.<*>} arguments - Pass this arguments to event as is, without normalization to standart object.
     */

    /**
     * Fires custom callbacks
     *
     * @alias Module.trigger
     * @instance
     *
     * @private
     *
     * @param {(string|string[]|triggerConfigObject)} name - Name or array of names or configuration object for event to trigger.
     * @param {object=} data - Data to pass to event.
     * @param {object=} context - Context to trigger event within.
     */
    self.constructor.prototype.trigger = function oSDKtrigger () {

      // Forming event object.
      var triggerEventObject = {
        type: [], // Event type(s) to trigger.
        data: {}, // Parameter(s) to pass with event(s).
        context: self, // Context in which trigger event(s).
        arguments: false // False or array of clean arguments to trigger event with (overrides data propery)
      };

      if (!isArray(arguments[0]) && !isString(arguments[0]) && !isObject(arguments[0])) {
        // Not enough arguments
        throw new self.Error('Insufficient or wrong arguments to trigger event.');
      } else if (isString(arguments[0]) || isArray(arguments[0])) {
        // If first argument is string or array then.
        // First argument is event type or array of event types.
        triggerEventObject.type = arguments[0];
        // Second argument is event data.
        triggerEventObject.data = isObject(arguments[1]) ? arguments[1] : { data: arguments[1] };
        // Third argument is context
        if (arguments[2]) {
          triggerEventObject.context = arguments[2];
        }
      } else {
        // First argument is object then assume that it is triggerEventObject compatible.
        extend(triggerEventObject, arguments[0]);
      }
      // Normalization of type to array
      triggerEventObject.type = [].concat(triggerEventObject.type);
      console.log('Formed event object', triggerEventObject);


      //START OF QUEUEING EARLY EVENTS WITH EXCEPTIONS
      var stashedEventsNames = []; // Cancelled event names.
      var exeptionTypes = ['transitEvent', 'mergedUserConfig', 'windowError']; // Transparent events that fire instantly even before DOMContentLoaded
      triggerEventObject.type.forEach(function (eventType) {
        if (exeptionTypes.indexOf(eventType) == -1) {
          if (earlyMainEvents.fired != 'all') {
            self.log('NOT Triggered early event name', eventType);

            if (typeof earlyMainEvents[eventType] == 'undefined') {
              // Not main events
              var storedEventObject = extend(true, {}, triggerEventObject);
              storedEventObject.type = eventType; // Only current event type if several.
              var storedEventModule = self;
              self.log('NOT Triggered storing event for module', storedEventModule, 'with event object', storedEventObject);
              earlyEvents.push([storedEventModule, storedEventObject]);
            } else {
              // Main events
              self.log('NOT Triggered early event is main', eventType);
              earlyMainEvents[eventType] = self;
            }

            stashedEventsNames.push(eventType);
          }
          if (!earlyEventsTriggered && earlyMainEvents.fired == 'all') {
            earlyEventsTriggered = true;
            self.log('Triggering main events for real');
            Object.keys(earlyMainEvents).forEach(function (name) {
              earlyMainEvents[name].trigger(name); // NOTICE: main events supported are only without params
            });
            self.log('All main events triggered, triggering stashed early events');
            earlyEvents.map(function (args) {
              var module = args.shift();
              module.trigger.apply(module, args);
            });
            earlyEvents = [];
          }
        }
      });
      if (stashedEventsNames.length) {
        stashedEventsNames.forEach(function (eventType) {
          triggerEventObject.type.splice(triggerEventObject.type.indexOf(eventType), 1);
        });

        if (triggerEventObject.type.length < 1) {
          // Nothing to fire now, all stashed.
          return;
        }
      }
      //END OF ...


      triggerEventObject.type.forEach(function (eventType) {
        if (!events[eventType]) {
          // Non fatal
          self.warn('Event', eventType, 'not registered by emitter or listener, therefore nothing to trigger!');
          return;
        }

        var eventEmitterObject = events[eventType].emittersObject[self.name];

        if(!eventEmitterObject) {
          throw new self.Error('Emitter for ' + eventType + ' event type is not registered.');
        }

        // Addition of system properties to data.
        if (!triggerEventObject.data.type) {
          triggerEventObject.data.type = eventType;
        }
        // Subtype for some events.
        if (!triggerEventObject.data.subType) {
          triggerEventObject.data.subType = false;
        }
        // First fired module gets priority.
        if (!triggerEventObject.data.module) {
          triggerEventObject.data.module = self.name;
        }

        // Regstered emitters may be zero (e.g. in case of oauth popup)

        // Fire every listener for event type
        events[eventType].listeners.forEach(function (listener, listenerIndex) {
          // Checking if we can fire by allowed module
          if (!listener.module) {
            throw new self.Error('Unknown listener!');
          }

          // Not firing to itself if not configured
          if (listener.module == self.name && !eventEmitterObject.self) {
            return;
          }

          // Not firing to client if not configured
          if (listener.module == clientModuleName && !eventEmitterObject[clientModuleName]) {
            return;
          }

          // Not firing to other modules if not configured
          if (listener.module != clientModuleName && listener.module != self.name && !eventEmitterObject.other) {
            return;
          }

          // If ours event clears some other events fired arrays.
          var clearsEvents = [].concat(eventEmitterObject.clears);
          if (clearsEvents.length) {
            each(clearsEvents, function cancelEvent (eventToClear) {
              if(!eventToClear || !events[eventToClear].emitters) {
                return;
              }
              each(events[eventToClear].emitters, function (emitter) {
                emitter.fired = [];
              });
            });
          }

          // Fired = true for ours emitter.
          eventEmitterObject.fired.push(listener.id);

          // Extending data object to listener
          // NOTICE: maybe somehow group data of bound events instead of use first fired module data
          // self.log('extending', listener.data, 'with', triggerEventObject.data);
          extend('addonly', listener.data, triggerEventObject.data);
          if (!listener.data.modules || !isArray(listener.data.modules)) {
            listener.data.modules = [];
          }
          if (listener.data.modules.indexOf(self.name) == -1) {
            listener.data.modules.push(self.name);
          }

          // If just firing with transparent arguments if developer used arguments in trigger config object or with own data object
          var fireArgs = [];
          var listenerData = listener.data;
          if(listenerData.arguments) {
            if (isArray(listenerData.arguments)) {
              fireArgs = listenerData.arguments;
            } else if (isObject(listenerData.arguments)) {
              fireArgs = Array.prototype.slice.call(listenerData.arguments, 0);
            } else {
              throw new self.Error('Unknown type of arguments to pass.');
            }
          } else {
            fireArgs.push(listenerData);
            // self.log('Pushed arguments for firing event', fireArgs);
          }

          // If we need to fire event by last emitter to client
          var notFiredModuleExists = false;
          var modulesFired = 0;
          var emittersLength = 0;

          //self.log('Checking event listener for last keyword', events[eventType].emittersObject[listener.module]);
          if (listener.last) {
            each(events[eventType].emitters, function (emitter) {
              emittersLength++;
              if (!emitter.fired.length) {
                notFiredModuleExists = true;
              }
              if (emitter.fired.length) {
                modulesFired++;
              }
            });

          }

          if(notFiredModuleExists) {
            self.log('%cPostponed %c' + eventType + ' %cfor listener', 'color:#9400D3', 'color:#CA9520', 'color:black', listener, 'with event data', listener.data);
            return;
          }

          // All modules fired already, begin again.
          if (modulesFired == emittersLength) {
            // Clear data and emitters fired arrays after firing to last listener.
            if (events[eventType].listeners.length - 1 == listenerIndex) {
              listener.data = {};

              // Cleaning self emitters
              each(events[eventType].emitters, function (emitter) {
                emitter.fired = [];
              });
            }

          }

          self.log('%cFiring %c' + eventType + ' %cfor listener', 'color:green', 'color:#CA9520', 'color:black', listener, 'with event data', listenerData, 'as arguments',fireArgs);

          listener.handler.apply(triggerEventObject.context, fireArgs);

        });
      });
    };
    self.trigger = self.constructor.prototype.trigger.bind(self);

    self.constructor.prototype.config = function (name, value) {

      // If we got parameter string <subPath> like 'app.key' - returning <moduleName>.<subPath> or <subPath> if first was not found or throwing error.
      // Setting parameters runtime only goes to prefixed with <moduleName> pathes.
      if (name && isString(name)) {

        var parameter;
        var pathByClientAndModule = [clientModuleName, nameInt].concat(name.split('.'));
        var pathByClient = [clientModuleName].concat(name.split('.'));
        var pathByModule = [nameInt].concat(name.split('.'));
        if (value !== undefined) {
          // Setting in prefixed config
          parameter = pathManage(mainConfig, pathByClientAndModule.join('.'), value);
        } else {
          // Getting in prefixed config
          parameter = pathManage(mainConfig, pathByClientAndModule.join('.'), value);
          // Getting in prefixed config
          if (parameter === undefined) {
            parameter = pathManage(mainConfig, pathByClient.join('.'), value);
          }
          // Getting in prefixed config
          if (parameter === undefined) {
            parameter = pathManage(mainConfig, pathByModule.join('.'), value);
          }
        }
        return parameter;
      } else {
        throw new self.warn('Module.config: no/incorrect parameter name:' + name);
      }
    };
    self.config = self.constructor.prototype.config.bind(self);

    /**
     * @typedef registerEventsObject
     * @type {object}
     * @instance
     *
     * @private
     *
     * @property {boolean} self - Fired only to listeners defined by module which registered that event.
     * @property {boolean} other - Fired to listeners defined by other modules.
     * @property {boolean} client - Fired to client listeners.
     * @property {(string|string[])} clears - Firing of current event clears "fired" attributes of emitters of events named as array or string in this parameter. Can be registered by any emitter event-wide.
     */

    /**
     * This method registers event emitters for current module.
     *
     * @alias registerEvents
     * @memberof Module
     * @instance
     * @private
     *
     * @param {registerEventsObject} registerEventsObject - Event registration object.
     */
    self.constructor.prototype.registerEvents = function oSDKregisterEvents (eventsObject) {

      // Registering event emitters
      for (var i in eventsObject) {
        // Each i must be an array
        if (!isObject(eventsObject[i])) { // Assuming event emitter registration object
          throw new self.Error('Register event ' + i + ' failed!');
        }

        if (events[i]) {
          self.log('Registering events for module: ' + self.name + '. Event "' + i + '" is exists. Adding emitter.');
        } else {
          self.log('Registering events for module: ' + self.name + '. Event "' + i + '" is new. Creating by emitter.');
          events[i] = eventSkel();

        }

        // Addition of module specific emitter
        var emitterObject = emitterSkel({ module: self.name });

        extend(emitterObject, eventsObject[i]);

        if (events[i].emittersObject[self.name]) {
          throw new self.Error('Register event emitter for ' + i + ' failed! Already registered!');
        }

        events[i].emittersObject[self.name] = emitterObject;
        events[i].emitters.push(emitterObject);
      }
    };
    self.registerEvents = self.constructor.prototype.registerEvents.bind(self);

    self.constructor.prototype.registerMethods = function oSDKregisterMethods (methodsObject) {
      for (var i in methodsObject) {
        if (methods[i]) {
          throw new self.Error('Registering module: ' + self.name + '. Method "' + i + '" is already taken by module ' + methods[i]);
        }
        methods[i] = self.name;
        oSDK[i] = methodsObject[i];
      }
    };
    self.registerMethods = self.constructor.prototype.registerMethods.bind(self);

    self.constructor.prototype.registerNamespaces = function oSDKregisterNamespaces (namespacesObject) {

      for (var i in namespacesObject) {
        if (!namespaces[i]) {
          namespaces[i] = {};
          oSDK[i] = {};
        } else {
          if(isObject(oSDK[i])) {
            self.log('Namespace to be registered "' + i + '" is already filled by module(s) ' + namespaces[i].toString() + '. Combining.');
          } else {
            throw new self.Error('Namespace to be registered "' + i + '" is already filled by module(s) ' + namespaces[i].toString() + ' and not an object. Can\'t combine.');
          }
        }
        namespaces[i][self.name] = []; // Array of property names by module

        if (isObject(namespacesObject[i])) {
          for (var j in namespacesObject[i]) {
            if ( ownProperty(namespacesObject[i], j) ) {
              if ( !oSDK[i][j] ) {
                oSDK[i][j] = namespacesObject[i][j];
                namespaces[i][self.name].push(j);
              } else {
                throw new self.Error('Registering module: ' + self.name + '. Namespace "' + i + '" is already has property ' + j);
              }
            }
          }
        } else {
          oSDK[i] = namespacesObject[i];
          namespaces[i][self.name].push(i);
        }
      }
    };
    self.registerNamespaces = self.constructor.prototype.registerNamespaces.bind(self);

    self.constructor.prototype.registerObjects = function oSDKregisterObjects (objectsObject) {

      var functionFactory = function () { return function () {}; };
      for (var i in objectsObject) {
        if (!factory[i]) {
          factory[i] = functionFactory();
        } else {
          self.log('Registering objects for module: ' + self.name + '. Object "' + i + '" is already filled by module(s) ' + factory[i].toString() + '. Combining.');
        }

        for (var j in objectsObject[i]) {
          if (ownProperty(objectsObject[i], j)) {
            if (!ownProperty(factory[i].prototype, j)) {
              factory[i].prototype[j] = objectsObject[i][j];
              if (objectsObject[i][j] instanceof Function) {
                factory[i].prototype[j].bind(factory[i]);
              }
            } else {
              throw new self.Error('Registering module: ' + self.name + '. Object "' + i + '" is already has prototype property ' + j);
            }
          }
        }
      }
    };
    self.registerObjects = self.constructor.prototype.registerObjects.bind(self);

    // Shows module dependencies by listening event type.
    self.constructor.prototype.requires = function oSDKModuleRequires () {

      // TODO: Find non self events listening on and its modules.

    };
    self.requires = self.constructor.prototype.requires.bind(self);

    self.constructor.prototype.registerConfig = function oSDKregisterConfig (configObject) {
      var prefixed = {};
      prefixed[self.name] = configObject;
      extend(true, mainConfig, prefixed);
    };
    self.registerConfig = self.constructor.prototype.registerConfig.bind(self);

    // Adding module to registered modules object
    modules[nameInt] = self;
  };

  var utils = new Module('utils');

  // Displaying current version
  utils.log('oSDK version', oSDK.version);

  // Module specific DEBUG.
  utils.debug = true;

  //Module.prototype.utils = utils;
  Object.defineProperties(Module.prototype, {
    utils: {
      enumerable: true,
      get: function () {
        return utils;
      }
    }
  });

  // Generic functions bindings
  utils.pathManage = pathManage;

  utils.ownProperty = ownProperty;

  utils.isNumber = isNumber;

  utils.isArray = isArray;

  utils.isObject = isObject;

  utils.isFunction = isFunction;

  utils.isBoolean = isBoolean;

  utils.isString = isString;

  utils.isNull = isNull;

  utils.isEmpty = isEmpty;

  utils.list = list;

  utils.pad = pad;

  utils.uuid = uuid;

  utils.each = each;

  utils.extend = extend;

  /**
   * Test to other data
   * @isValidLogin
   * @isValidID
   * @isValidName
   */
  utils.isValidLogin = function(login) {
    if (login && utils.isString(login)) {
      if (login.match(/^[-\w]+$/i)) return true;
    }
    return false;
  };

  utils.isValidID = function(id) {
    if (id && utils.isString(id)) {
      var re = /^[-\w\d\._]+@[-\w\d\._]+\.\w{2,}$/i;
      // TODO: there are many international TLDs , need to check just @ in ID name
      return re.test(id);
    }
    return false;
  };

  utils.isValidName = function(name) {
    if (name && utils.isString(name)) {
      var re = /^[a-zа-я]{1,}[-a-zа-я0-9_\s\.]*[a-zа-я]{1,}$/i;
      // TODO: this is temp name test
      return re.test(name);
    }
    return false;
  };

  /*
   * Work with json objects TODO: throw utils.Error on bad data
   * @jsonEncode
   * @jsonDecode
   */
  utils.jsonEncode = function(data) {
    try {
      return JSON.stringify(data);
    } catch(eJsonEncode) {
      return data;
    }
  };

  utils.jsonDecode = function(data) {
    try {
      return JSON.parse(data);
    } catch(eJsonDecode) {
      return data;
    }
  };

  // window.location.hash getting and setting
  utils.hash = (function () {
    var hashData = {};

    var dec = function (str) {
      return decodeURIComponent(str);
    };
    var enc = function (str) {
      return encodeURIComponent(str);
    };

    var parseHash = function () {
      var h = window.location.hash.replace(/^#/, '').split(/&(?!#38;)/); // Not split by &#38;
      var tmpData = {};
      h.forEach(function (data) {
        data = data.split('=');
        if (data[0] && data[1]) {
          tmpData[dec(data[0])] = dec(data[1]);
        }
      });
      hashData = tmpData;
    };
    var buildHash = function () {
      var tmpHash = [];
      for (var id in hashData) {
        if (hashData[id] !== null) {
          tmpHash.push(enc(id)+'='+enc(hashData[id]));
        }
      }
      return (tmpHash.length)?'#'+tmpHash.join('&'):'';
    };

    return {
      getItem: function (id) {
        parseHash();
        return (typeof hashData[id] != 'undefined')?hashData[id]:null;
      },
      setItem: function (id, value) {
        parseHash();
        hashData[id] = value;
        window.location.hash = buildHash();
      },
      removeItem: function (id) {
        parseHash();
        hashData[id] = null;
        window.location.hash = buildHash();
      }
    };
  })();

  // Get url parameter value from query string
  utils.getUrlParameter = function (name) {
    // Jshint tries to check even regexps and here goes my anger!
    var r  = new RegExp(".*(\\?|&)" + name + "=(.*?)(&|#|$).*");

    if (window.location.href.match(r))
    {
      return decodeURIComponent(window.location.href.replace(r, '$2'));
    }
    return false;
  };

  // Working with localStorage
  utils.storage = (function () {

    var storeName = mainConfig.localStorageName || 'oSDK';

    var get  = function () {
      return JSON.parse(localStorage.getItem(storeName));
    };

    var set = function (storeObject) {
      return localStorage.setItem(storeName, JSON.stringify(storeObject));
    };

    // Inserting empty object if absent
    var error = false;
    var store = localStorage.getItem(storeName);
    try {
      store = JSON.parse(store);
    } catch (e) {
      error = true;
    }
    if (!utils.isObject(store)) {
      error = true;
    }

    if (error) {
      localStorage.setItem(storeName, JSON.stringify({}));
    }

    return {
      getItem: function (name) {
        var storeObject = get();

        return storeObject[name];
      },
      setItem: function (name, val) {
        var storeObject = get();

        storeObject[name] = val;

        return set(storeObject);
      },
      removeItem: function (name) {
        var storeObject = get();

        delete storeObject[name];

        return set(storeObject);
      }
    };

  })();

  // Returns registered namespaces
  Object.defineProperties(utils, {
    // DOMContentLoaded flag
    DOMContentLoaded: {
      enumerable: true,
      get: function () {
        return earlyMainEvents.DOMContentLoaded;
      }
    },
    // Returns registered modules
    modules: {
      enumerable: true,
      get: function () {
        return modules;
      }
    },
    // Returns registered namespaces
    namespaces: {
      enumerable: true,
      get: function () {
        return namespaces;
      }
    },
    // Returns registered crossmodule-objects
    factory: {
      enumerable: true,
      get: function () {
        return factory;
      }
    },
    // Returns registered methods
    methods: {
      enumerable: true,
      get: function () {
        return methods;
      }
    },
    // Returns registered event emitters and listeners grouped by event name
    events: {
      enumerable: true,
      get: function () {
        return events;
      }
    },
    // Returns mainConfig
    currentConfig: {
      enumerable: true,
      get: function () {
        return mainConfig;
      }
    }
  });

  /**
   * MD5 Hasher
   */
  utils.sha1 = function (str) {
    var shaObj = new jsSHA("SHA-1", "TEXT"); // jshint ignore:line
    shaObj.update(str);
    return shaObj.getHash("HEX");
  };

  // Merge config as unprefixed.
  utils.mergeConfig = function (config) {
    extend(true, mainConfig, config);
    this.log('merged config', config, 'with main config', mainConfig);
  };

  // Merge config as prefixed.
  utils.mergeClientConfig = function (config) {
    var clientConfig = {};
    clientConfig[oSDK.utils.clientModuleName] = config;
    utils.mergeConfig(clientConfig);
  };

  utils.Module = Module;

  // Dedicated for osdk window.onbeforeunload event handler.
  window.addEventListener('beforeunload', function () {
    utils.info('windowBeforeUnload start');
    utils.trigger('windowBeforeUnload', { originalEvent: arguments });
    utils.info('windowBeforeUnload end');
  }, false);

  window.addEventListener('error', function () {
    utils.trigger('windowError', { arguments: arguments });
  }, false);

  // Dedicated for osdk DOMContentLoaded event.
  document.addEventListener("DOMContentLoaded", function () {
    utils.trigger('DOMContentLoaded', { arguments: arguments });
  }, false);

  // For creation of module objects.
  utils.registerNamespaces({
    utils: utils
  });

  // Own system listeners wrappers TODO: note this events in module developers guide.
  utils.registerEvents({
    'windowError': { self: true, other: true },
    'windowBeforeUnload': { self: true, other: true },
    'DOMContentLoaded': { self: true, other: true },
    'mergedUserConfig': { self: true, other: true },
    // Transit event for use in cross-oSDK communications like between popup and main window oSDKs. Needs subType in event data for identification of real event.
    'transitEvent': { other: true }
  });

})(oSDK);
