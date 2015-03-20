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
      enumerable: true,
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
    return (!fnIsEmpty(value) && (typeof value == 'object'));
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
   */
  var extend = function () {

    var self = this;

    var args = Array.prototype.slice.call(arguments, 0);
    var inObj = args.shift();
    var deep = false;

    // Checking for deep copy flag as first param
    if ( inObj === true ) {
      deep = inObj;
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
          if (!isObject(inObj[key])) {
            // Just replacing all other with object in priority
            inObj[key] = {};
          }
          if (deep) {
            // More recursion allowed
            extend(true, inObj[key], obj[key]);
          } else {
            // Just replacing
            inObj[key] = obj[key];
          }
        } else {
          // Just copying anything else
          inObj[key] = obj[key];
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
    var debugInt = false; // Per-module debug default setting (TODO: parametrize by grunt).
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

      // TODO: this if else if must be in external addon for generic trigger function
      // Transit event must fire without waiting
      if (['transitEvent', 'mergedUserConfig'].indexOf(arguments[0]) == -1) {
        if (earlyMainEvents.fired != 'all') {
          self.log('NOT Triggered early event name', arguments[0]);
          // Not main events
          if (typeof earlyMainEvents[arguments[0]] == 'undefined') {
            earlyEvents.push([self].concat(Array.prototype.slice.call(arguments, 0)));
            self.log('NOT Triggered early event name pushed to', earlyEvents);
            return;
          } else {
            self.log('NOT Triggered early event is main', arguments[0]);
            earlyMainEvents[arguments[0]] = self;
          }
        }
        if (!earlyEventsTriggered && earlyMainEvents.fired == 'all') {
          earlyEventsTriggered = true;
          self.log('All main events triggered, triggering stashed events');
//           earlyMainEvents.mergedUserConfig.trigger('mergedUserConfig');
          earlyMainEvents.DOMContentLoaded.trigger('DOMContentLoaded');
          earlyEvents.map(function (args) {
            var module = args.shift();
            var name = args.shift();
            module.trigger.apply(module, [name].concat(args));
          });
        }
      }

      var configObject = {
        type: [], // Event type(s) to trigger.
        data: {}, // Parameter(s) to pass with event(s).
        context: self, // Context in which trigger event(s).
        arguments: false
      };

      if (!isArray(arguments[0]) && !isString(arguments[0]) && !isObject(arguments[0])) {
        // Not enough arguments
        throw new self.Error('Insufficient or wrong arguments to trigger event.');
      } else if (isString(arguments[0]) || isArray(arguments[0])) {
        // If first argument is string or array then.
        // First argument is event type or array of event types.
        configObject.type = [].concat(arguments[0]);
        // Second argument is event data.
        configObject.data = isObject(arguments[1])?arguments[1]:{};
        // Third argument is context
        if (arguments[2]) {
          configObject.context = arguments[2];
        }
      } else {
        // First argument is object then assume that it is configObject compatible.
        extend(configObject, arguments[0]);
      }
      // TODO: group data of bound events
      configObject.type.forEach(function (eventType) {
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
        if(!configObject.data.type) {
          configObject.data.type = eventType;
        }
        // Subtype for some events.
        if(!configObject.data.subType) {
          configObject.data.subType = false;
        }
        // First fired module gets priority.
        if(!configObject.data.module) {
          configObject.data.module = self.name;
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
          extend(listener.data, configObject.data);

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
            if (events[eventType].listeners.lenght - 1 == listenerIndex) {
              listener.data = {};

              // Cleaning self emitters
              each(events[eventType].emitters, function (emitter) {
                emitter.fired = [];
              });
            }


          }

          // If just firing with transparent arguments if developer used arguments in trigger config object or with own data object
          var fireArgs = [];
          if(listener.data.arguments) {
            if (isArray(listener.data.arguments)) {
              fireArgs = listener.data.arguments;
            } else if (isObject(listener.data.arguments)) {
              fireArgs = Array.prototype.slice.call(listener.data.arguments, 0);
            } else {
              throw new self.Error('Unknown type of arguments to pass.');
            }
          } else {
            fireArgs.push(listener.data);
          }

          self.log('%cFiring %c' + eventType + ' %cfor listener', 'color:green', 'color:#CA9520', 'color:black', listener, 'with event data', listener.data, 'as arguments',fireArgs);

          listener.handler.apply(configObject.context, fireArgs);

        });
      });
    };
    self.trigger = self.constructor.prototype.trigger.bind(self);

    self.constructor.prototype.config = function (name, value) {

      // If we got parameter string <subPath> like 'app.key' - returning <moduleName>.<subPath> or <subPath> if first was not found or throwing error.
      // Setting parameters runtime only goes to prefixed with <moduleName> pathes.
      if (name && isString(name)) {
        // Setting in prefixed config
        if (value !== undefined) {
          var path = [nameInt].concat(name.split('.'));
          return pathManage(mainConfig, path.join('.'), value);
        }

        var parameter = mainConfig[nameInt];
        var subParameter = name.split('.');
        var i = 0;
        // Getting in prefixed config
        if (isObject(parameter)) {
          for (i=0; i < subParameter.length; i++) {
            //self.log('config searching', parameter, subParameter[i]);
            if (!ownProperty(parameter, subParameter[i])) {
              parameter = undefined;
              break;
            }
            parameter = parameter[subParameter[i]];
          }
        }
        // Getting in unprefixed config
        if (parameter === undefined) {
          parameter = mainConfig;
          subParameter = name.split('.');
          for (i = 0; i < subParameter.length; i++) {
            // self.log('config searching', parameter, subParameter[i]);
            if (!ownProperty(parameter, subParameter[i])) {
              throw new self.Error('Module.config: can\'t find config parameter:' + name);
            }
            parameter = parameter[subParameter[i]];
          }
        }
        return parameter;
      } else {
        throw new self.Error('Module.config: can\'t find config parameter:' + name);
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
      extend(true, mainConfig, configObject);
    };
    self.registerConfig = self.constructor.prototype.registerConfig.bind(self);

    // Adding module to registered modules object
    modules[nameInt] = self;
  };

  var utils = new Module('utils');

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
      var re = /^[a-z_]{1,}[-a-z0-9_]*$/i;
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
    if (!localStorage.getItem(storeName)) {
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
  utils.md5 = function(string) {
    function rotateLeft(lValue, iShiftBits) { return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits)); }
            function addUnsigned(lX,lY) {
              var lX4,lY4,lX8,lY8,lResult;
              lX8 = (lX & 0x80000000);
              lY8 = (lY & 0x80000000);
              lX4 = (lX & 0x40000000);
              lY4 = (lY & 0x40000000);
              lResult = (lX & 0x3FFFFFFF)+(lY & 0x3FFFFFFF);
              if (lX4 & lY4) { return (lResult ^ 0x80000000 ^ lX8 ^ lY8); }
              if (lX4 | lY4) {
                if (lResult & 0x40000000) {
                  return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                } else {
                  return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
                }
              } else {
                return (lResult ^ lX8 ^ lY8);
              }
            }
            function f(x,y,z) { return (x & y) | ((~x) & z); }
            function g(x,y,z) { return (x & z) | (y & (~z)); }
            function h(x,y,z) { return (x ^ y ^ z); }
            function i(x,y,z) { return (y ^ (x | (~z))); }
            function ff(a,b,c,d,x,s,ac) {
              a = addUnsigned(a, addUnsigned(addUnsigned(f(b, c, d), x), ac));
              return addUnsigned(rotateLeft(a, s), b);
            }
            function gg(a,b,c,d,x,s,ac) {
              a = addUnsigned(a, addUnsigned(addUnsigned(g(b, c, d), x), ac));
              return addUnsigned(rotateLeft(a, s), b);
            }
            function hh(a,b,c,d,x,s,ac) {
              a = addUnsigned(a, addUnsigned(addUnsigned(h(b, c, d), x), ac));
              return addUnsigned(rotateLeft(a, s), b);
            }
            function ii(a,b,c,d,x,s,ac) {
              a = addUnsigned(a, addUnsigned(addUnsigned(i(b, c, d), x), ac));
              return addUnsigned(rotateLeft(a, s), b);
            }
            function convertToWordArray(string) {
              var lWordCount;
              var lMessageLength = string.length;
              var lNumberOfWords_temp1=lMessageLength + 8;
              var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1 % 64))/64;
              var lNumberOfWords = (lNumberOfWords_temp2+1)*16;
              var lWordArray=[lNumberOfWords-1];
              var lBytePosition = 0;
              var lByteCount = 0;
              while ( lByteCount < lMessageLength ) {
                lWordCount = (lByteCount-(lByteCount % 4))/4;
                lBytePosition = (lByteCount % 4)*8;
                lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount)<<lBytePosition));
                lByteCount++;
              }
              lWordCount = (lByteCount-(lByteCount % 4))/4;
              lBytePosition = (lByteCount % 4)*8;
              lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80<<lBytePosition);
              lWordArray[lNumberOfWords-2] = lMessageLength<<3;
              lWordArray[lNumberOfWords-1] = lMessageLength>>>29;
              return lWordArray;
            }
            function wordToHex(lValue) {
              var WordToHexValue="",WordToHexValue_temp="",lByte,lCount;
              for (lCount = 0;lCount<=3;lCount++) {
                lByte = (lValue>>>(lCount*8)) & 255;
                WordToHexValue_temp = "0" + lByte.toString(16);
                WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);
              }
              return WordToHexValue;
            }
            function utf8Encode(string) {
              string = string.replace(/\r\n/g,"\n");
              var utftext = "";
              for (var n = 0; n < string.length; n++) {
                var c = string.charCodeAt(n);
                if (c < 128) {
                  utftext += String.fromCharCode(c);
                } else if ((c > 127) && (c < 2048)) {
                  utftext += String.fromCharCode((c >> 6) | 192);
                  utftext += String.fromCharCode((c & 63) | 128);
                } else {
                  utftext += String.fromCharCode((c >> 12) | 224);
                  utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                  utftext += String.fromCharCode((c & 63) | 128);
                }
              }
              return utftext;
            }
            var x=[];
            var k,AA,BB,CC,DD,a,b,c,d;
            var S11=7, S12=12, S13=17, S14=22;
            var S21=5, S22=9 , S23=14, S24=20;
            var S31=4, S32=11, S33=16, S34=23;
            var S41=6, S42=10, S43=15, S44=21;
            string = utf8Encode(string);
            x = convertToWordArray(string);
            a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
            for (k=0;k<x.length;k+=16) {
              AA=a; BB=b; CC=c; DD=d;
              a=ff(a,b,c,d,x[k+0], S11,0xD76AA478);
              d=ff(d,a,b,c,x[k+1], S12,0xE8C7B756);
              c=ff(c,d,a,b,x[k+2], S13,0x242070DB);
              b=ff(b,c,d,a,x[k+3], S14,0xC1BDCEEE);
              a=ff(a,b,c,d,x[k+4], S11,0xF57C0FAF);
              d=ff(d,a,b,c,x[k+5], S12,0x4787C62A);
              c=ff(c,d,a,b,x[k+6], S13,0xA8304613);
              b=ff(b,c,d,a,x[k+7], S14,0xFD469501);
              a=ff(a,b,c,d,x[k+8], S11,0x698098D8);
              d=ff(d,a,b,c,x[k+9], S12,0x8B44F7AF);
              c=ff(c,d,a,b,x[k+10],S13,0xFFFF5BB1);
              b=ff(b,c,d,a,x[k+11],S14,0x895CD7BE);
              a=ff(a,b,c,d,x[k+12],S11,0x6B901122);
              d=ff(d,a,b,c,x[k+13],S12,0xFD987193);
              c=ff(c,d,a,b,x[k+14],S13,0xA679438E);
              b=ff(b,c,d,a,x[k+15],S14,0x49B40821);
              a=gg(a,b,c,d,x[k+1], S21,0xF61E2562);
              d=gg(d,a,b,c,x[k+6], S22,0xC040B340);
              c=gg(c,d,a,b,x[k+11],S23,0x265E5A51);
              b=gg(b,c,d,a,x[k+0], S24,0xE9B6C7AA);
              a=gg(a,b,c,d,x[k+5], S21,0xD62F105D);
              d=gg(d,a,b,c,x[k+10],S22,0x2441453);
              c=gg(c,d,a,b,x[k+15],S23,0xD8A1E681);
              b=gg(b,c,d,a,x[k+4], S24,0xE7D3FBC8);
              a=gg(a,b,c,d,x[k+9], S21,0x21E1CDE6);
              d=gg(d,a,b,c,x[k+14],S22,0xC33707D6);
              c=gg(c,d,a,b,x[k+3], S23,0xF4D50D87);
              b=gg(b,c,d,a,x[k+8], S24,0x455A14ED);
              a=gg(a,b,c,d,x[k+13],S21,0xA9E3E905);
              d=gg(d,a,b,c,x[k+2], S22,0xFCEFA3F8);
              c=gg(c,d,a,b,x[k+7], S23,0x676F02D9);
              b=gg(b,c,d,a,x[k+12],S24,0x8D2A4C8A);
              a=hh(a,b,c,d,x[k+5], S31,0xFFFA3942);
              d=hh(d,a,b,c,x[k+8], S32,0x8771F681);
              c=hh(c,d,a,b,x[k+11],S33,0x6D9D6122);
              b=hh(b,c,d,a,x[k+14],S34,0xFDE5380C);
              a=hh(a,b,c,d,x[k+1], S31,0xA4BEEA44);
              d=hh(d,a,b,c,x[k+4], S32,0x4BDECFA9);
              c=hh(c,d,a,b,x[k+7], S33,0xF6BB4B60);
              b=hh(b,c,d,a,x[k+10],S34,0xBEBFBC70);
              a=hh(a,b,c,d,x[k+13],S31,0x289B7EC6);
              d=hh(d,a,b,c,x[k+0], S32,0xEAA127FA);
              c=hh(c,d,a,b,x[k+3], S33,0xD4EF3085);
              b=hh(b,c,d,a,x[k+6], S34,0x4881D05);
              a=hh(a,b,c,d,x[k+9], S31,0xD9D4D039);
              d=hh(d,a,b,c,x[k+12],S32,0xE6DB99E5);
              c=hh(c,d,a,b,x[k+15],S33,0x1FA27CF8);
              b=hh(b,c,d,a,x[k+2], S34,0xC4AC5665);
              a=ii(a,b,c,d,x[k+0], S41,0xF4292244);
              d=ii(d,a,b,c,x[k+7], S42,0x432AFF97);
              c=ii(c,d,a,b,x[k+14],S43,0xAB9423A7);
              b=ii(b,c,d,a,x[k+5], S44,0xFC93A039);
              a=ii(a,b,c,d,x[k+12],S41,0x655B59C3);
              d=ii(d,a,b,c,x[k+3], S42,0x8F0CCC92);
              c=ii(c,d,a,b,x[k+10],S43,0xFFEFF47D);
              b=ii(b,c,d,a,x[k+1], S44,0x85845DD1);
              a=ii(a,b,c,d,x[k+8], S41,0x6FA87E4F);
              d=ii(d,a,b,c,x[k+15],S42,0xFE2CE6E0);
              c=ii(c,d,a,b,x[k+6], S43,0xA3014314);
              b=ii(b,c,d,a,x[k+13],S44,0x4E0811A1);
              a=ii(a,b,c,d,x[k+4], S41,0xF7537E82);
              d=ii(d,a,b,c,x[k+11],S42,0xBD3AF235);
              c=ii(c,d,a,b,x[k+2], S43,0x2AD7D2BB);
              b=ii(b,c,d,a,x[k+9], S44,0xEB86D391);
              a=addUnsigned(a,AA);
              b=addUnsigned(b,BB);
              c=addUnsigned(c,CC);
              d=addUnsigned(d,DD);
            }
    var temp = wordToHex(a)+wordToHex(b)+wordToHex(c)+wordToHex(d);
    return temp.toLowerCase();
  };

  utils.mergeConfig = function (config) {
    extend(true, mainConfig, config);
    this.log('merged config', config, 'with main config', mainConfig);
  };

  utils.Module = Module;

  // Dedicated for osdk window.onbeforeunload event handler.
  window.addEventListener('beforeunload', function () {
    utils.info('windowBeforeUnload start');
    utils.trigger('windowBeforeUnload', { arguments: arguments });
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
