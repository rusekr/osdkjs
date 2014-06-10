/**
 * oSDK utils module.
 */

(function (oSDK) {
  "use strict";

  // Store objects

  var modules = {};
  var namespaces = {};
  var factory = {}; // Internal cross-module object for Module factory
  var methods = {};
  var events = {};
  var dependencies = {};
  var mainConfig = {};

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

  var isBoolean = function(value) {
    return (typeof value == 'boolean');
  };

  var isString = function(value) {
    return (typeof value == 'string');
  };

  var isNull = function(value) {
    return ((value === undefined) || (value === null));
  };

  var isEmpty = function(value) {
    function fnIsNull(value) {
      return ((value === undefined) || (value === null));
    }
    return (fnIsNull(value) || ((typeof value.length !== 'undefined') && (value.length === 0)));
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
   * Safe hasOwnProperty property replacement
   */
  var ownProperty = function (obj, prop) {
    return Object.prototype.hasOwnProperty.call(obj, prop);
  };

  /*
   * Iterator for arrays and objects
   */
  var each = function (obj, fn) {
    if (obj.length) {
      for (var i = 0, ol = obj.length, v = obj[0]; i < ol && fn(v, i) !== false; v = obj[++i]);
    } else {
      for (var p in obj) {
        if (!ownProperty(obj,p)) {
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
            inObj[key] = extend(true, {}, inObj[key], obj[key]);
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

  /*
   * oSDK module object prototype
   */
  var Module = function oSDKModule(name) {
    var self = this;
    var debugInt = true; // Per-module debug
    var nameInt = name;

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
        module: null
      }, initObject);
    };

    var emitterSkel = function (initObject) {
      return extend({
//        bind: null,
        client: false,
        other: false,
        self: false,
        fired: false,
        cancels: null,
        module: null,
        data: {}
      }, initObject);
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
        if (!this.debug) {
          return;
        }

        var arr = ['oSDK:'];
        if (this.oSDKModule && this.name != 'utils') {
          arr.push(this.name);
        }
        console[method].apply(console, arr.concat(Array.prototype.slice.call(arguments, 0)));
      };
    };

    ["log","info","warn","error","assert","dir","clear","profile","profileEnd"].forEach( function (method) {
      self.constructor.prototype[method] = lf(method);
      self[method] = self.constructor.prototype[method].bind(self);
    });

    /**
    * oSDK error object prototype
    *
    * @class oSDK.Error
    *
    */
    self.constructor.prototype.Error = function oSDKError (eobj) {
      // Defaults
      this.oSDKError = true; // Identificator because "instanceof oSDKError" is not working out of this scope
      this.ecode = 0;
      this.module = self.name;
      this.message = "Unknown error detected";
      this.htmlMessage = null;
      this.data = {};
      this.toString = function(){return 'oSDKError: module ' + this.module + ': code ' + this.ecode + ': ' + this.message;};

      // Updating properties
      var selfError = this;

      if (isString(eobj)) {
        this.message = eobj;
      } else {
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

    self.factory = factory;

      // JQuery like simple ajax wrapper
    self.constructor.prototype.ajax = function oSDKajax (config) {

      var self = this;

      self.log('sending ajax with config', config);
      var dConfig = {
        url: '',
        type: 'GET',
        data: {},
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
      // For 'get' in url, for other - in body
      if (config.type.toLowerCase() == 'get') {
        var delim = '?';
        if (config.url.match(/\?/)) {
          delim = '&';
        }
        config.url += delim+config.data;
        config.data = null;
      }

      var r = new XMLHttpRequest();

      var headersNotSet = false;
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
        if (r.readyState != 4) {
          return;
        }
        if (r.status != 200) {
          config.error.call(config.error, r);
          return;
        }

        try {
          r.responseText = JSON.parse(r.responseText);
        } catch (e) {
          // Whoops, not a json..
          self.log(e);
        }

        config.success.call(config.success, r.responseText, r);
      };

      r.send(config.data);
      return r;
    };
    self.ajax = self.constructor.prototype.ajax.bind(self);

    /**
    * Adds custom callback for specified event type.
    * Returns id of added listener for removing through {@link off}.
    * @param fireType may be 'last' (fires only when last emitter sent event), 'every' (default, fires every time emitter emits)
    */
    self.constructor.prototype.on = function oSDKon (eventTypes, eventHandler) {

      var ids = [];
      eventTypes = [].concat(eventTypes);

      each(eventTypes, function (eventType) {
        if (!events[eventType]) {
          events[eventType] = eventSkel();
        }
        var id  = uuid();
        var listener = listenerSkel();

        listener.id = id;
        listener.handler = eventHandler;
        listener.module = self.name;

        events[eventType].listeners.push(listener);
        ids.push(id);
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
     * Fires custom callbacks
     * @alias self.trigger
     * @param string||array event type.
     * @param object event data. Augmented with "type" and "module" properties if not defined already.
     * Transparent proxying of arguments through events can be accomplished with property "arguments" in data object. Other properties are ignored in this case.
     */
    self.constructor.prototype.trigger = function oSDKtrigger () {

      var configObject = {
        type: [], // Event type(s) to trigger
        data: {}, // Parameter(s) to pass with event(s)
        context: self // Context in which trigger event(s)
      };

      if (!isArray(arguments[0]) && !isString(arguments[0]) && !isObject(arguments[0])) {
        // Not enough arguments
        throw new self.Error('Insufficient or wrong arguments to trigger event.');
      } else if (isString(arguments[0]) || isArray(arguments[0])) {
        // First argument is string or array
        configObject.type = [].concat(arguments[0]);
        configObject.data = isObject(arguments[1])?arguments[1]:{};

      } else {
        // First argument is object
        extend(configObject, arguments[0]);
      }
      // TODO: group data of bound events
      configObject.type.forEach(function (eventType) {
        if (!events[eventType]) {
          // Non fatal
          self.warn('Event', eventType, 'not registered by emitter or listener, therefore nothing to trigger!');
          return;
        }

        if(!events[eventType].emittersObject[self.name]) {
          throw new self.Error('Emitter for ' + eventType + ' event type is not registered.');
        }

        // Normalizing configObject.data to object
        if (!isObject(configObject.data)) {
          configObject.data = {
            data: configObject.data
          };
        }
        // Addition of system properties to data
        if(!configObject.data.type) {
          configObject.data.type = eventType;
        }
        if(!configObject.data.module) {
          configObject.data.module = self.name;
        }

        // Regstered emitters may be zero (e.g. in case of oauth popup)

        // Fire every listener for event type
        var fireToListener = function (listener) {
          // Checking if we can fire by allowed module
          if (!listener.module) {
            throw new self.Error('Unknown listener!');
          }

          // Not firing to itself if not configured
          if (listener.module == self.name && !events[eventType].emittersObject[self.name].self) {
            return;
          }

          // Not firing to client if not configured
          if (listener.module == 'client' && !events[eventType].emittersObject[self.name].client) {
            return;
          }

          // Not firing to other modules if not configured
          if (listener.module != 'client' && listener.module != self.name && !events[eventType].emittersObject[self.name].other) {
            return;
          }

          // If ours event cancels some other
          var cancelsEvents = events[eventType].emittersObject[self.name].cancels;
          if(events[eventType].emittersObject[self.name].cancels) {
            cancelsEvents.concat(events[eventType].emittersObject[self.name].cancels);

            each(cancelsEvents, function cancelEvent (eventToCancel) {
              self.info(eventType, 'cancelling events', cancelsEvents);
              eventToCancel.fired = false;
            });
          }

          // Fired = true for ours emitter // TODO: if emitters > 1, emitters for client exist, exist other modules emitters which are not fired
          events[eventType].emittersObject[self.name].fired = true;

          // If we need to fire event by last emitter to client
          var notFiredModuleExists = false;
          if(listener.module == 'client' && events[eventType].emittersObject[self.name].client == 'last') {
            each(events[eventType].emitters, function (emitter) {
              if(emitter.fired === false) {
                notFiredModuleExists = true;
                return false;
              }
            });
          }

          if(notFiredModuleExists) {
            self.log('NOT Firing', eventType, 'with event data', configObject.data, 'for client listener', listener);
            return;
          }

          // Just firing with transparent arguments or with own data object
          var fireArgs = [];
          if(configObject.data.arguments) {
            if (isArray(configObject.data.arguments)) {
              fireArgs = configObject.data.arguments;
            } else if (isObject(configObject.data.arguments)) {
              fireArgs = Array.prototype.slice.call(configObject.data.arguments, 0);
            } else {
              throw new self.Error('Unknown type of arguments to pass.');
            }
          } else {
            fireArgs.push(configObject.data);
          }

          self.log('Firing', eventType, 'with event data', configObject.data, 'as arguments',fireArgs , 'for listener', listener);

          listener.handler.apply(configObject.context, fireArgs);

          // Cleaning self emitters
          each(events[eventType].emitters, function (emitter) {
            emitter.fired = false;
          });


        };
        events[eventType].listeners.forEach(fireToListener);
      });
    };
    self.trigger = self.constructor.prototype.trigger.bind(self);

    self.constructor.prototype.config = function () {

      // If we got parameter string like 'app.key' - returning <moduleName>.<this subpath> or <this subpath> if first was not found or throwing error.
      if (arguments[0] && isString(arguments[0])) {
        var parameter = mainConfig[nameInt];
        var subParameter = arguments[0].split('.');
        var i = 0;
        for (; i < subParameter.length; i++) {
          if (!ownProperty(parameter, subParameter[i])) {
            parameter = undefined;
            break;
          }
          parameter = parameter[subParameter[i]];
        }
        if (parameter === undefined) {
          parameter = mainConfig;
          subParameter = arguments[0].split('.');
          for (i = 0; i < subParameter.length; i++) {
            if (!ownProperty(parameter, subParameter[i])) {
              throw new self.Error('Module.config: can\'t find config parameter:' + arguments[0]);
            }
            parameter = parameter[subParameter[i]];
          }
        }
        return parameter;
      } else {
        throw new self.Error('Module.config: can\'t find config parameter:' + arguments[0]);
      }
    };
    self.config = self.constructor.prototype.config.bind(self);

    /**
     * Method registerEvents.
     * @alias <moduleName>.registerEvents.
     * @param eventsObject Object.
     * Configurated by eventsObject.
     * Keys: events names.
     * Every event configured by it's own configObject.
     * configObject keys:
     * self - fired only to listeners defined by module which registered that event.
     * other - fired to listeners defined by other modules.
     * client - fired to client listeners.
     * cancels - firing of this event cancels other named event and its bound by "bind" directive relatives.
     */
    self.constructor.prototype.registerEvents = function oSDKregisterEvents (eventsObject) {

      // Registering event emitters
      for (var i in eventsObject) {
        // Each i must be an array
        if (!isObject(eventsObject[i])) { // Assuming event emitter registration object
          throw new self.Error('Register event ' + i + ' failed!');
        }

        self.log('Registering events for module: ' + self.name + '.', i, events[i]);

        if (events[i]) {
          self.log('Registering events for module: ' + self.name + '. Event "' + i + '" is already taken by module(s) ' + events[i].toString() + '. Combining.');
        } else {
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

    // Registers other modules event(s) name(s) needed for this module to work (TODO: make automatic on time of event listener and emitters registration)
//     self.constructor.prototype.registerDeps = function oSDKregisterDeps (eventsList) {
//
//       eventsList  = [].concat(eventsList);
//       dependencies[self.name] = eventsList;
//
//     };
//     self.registerDeps = self.constructor.prototype.registerDeps.bind(self);

    self.constructor.prototype.registerConfig = function oSDKregisterConfig (configObject) {
      mainConfig = extend(true, {}, mainConfig, configObject);
    };
    self.registerConfig = self.constructor.prototype.registerConfig.bind(self);

    // Adding module to registered modules object
    modules[nameInt] = self;
  };

  var utils = new Module('utils');

  Object.defineProperties(Module.prototype, {
    utils: {
      get: function () {
        return utils;
      }
    }
  });

  // Generic functions bindings

  utils.ownProperty = ownProperty;

  utils.isNumber = isNumber;

  utils.isArray = isArray;

  utils.isObject = isObject;

  utils.isFunction = isFunction;

  utils.isBoolean = isBoolean;

  utils.isString = isString;

  utils.isNull = isNull;

  utils.isEmpty = isEmpty;

  utils.uuid = uuid;

  utils.each = each;

  utils.extend = extend;

  /**
   * Test to other data
   * @isValidLogin
   * @isValidAccount
   */
  utils.isValidLogin = function(login) {
    if (login && utils.isString(login)) {
      if (login.match(/^[-fa-z0-9_]+$/i)) return true;
    }
    return false;
  };

  utils.isValidAccount = function(account) {
    if (account && utils.isString(account)) {
      if (account.match(/^[-a-z0-9_]+@[a-z0-9_]+\.[a-z]{2,3}$/i)) return true;
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
      return decodeURIComponent(str); // str.replace('&#61;', '=').replace('&#38;', '&');
    };
    var enc = function (str) {
      return encodeURIComponent(str); // str.replace('=', '&#61;').replace('&', '&#38;');
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
    if (window.location.href.match(/(\?|&)error=(.*?)(&|$)/))
    {
      return decodeURIComponent(window.location.href.replace(/.*(\?|&)error=(.*?)(&|$).*/, '$2'));
    }
    return null;
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
    // Returns registered event dependencies grouped by dependent module name
    deps: {
      enumerable: true,
      get: function () {
        return dependencies;
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
    mainConfig = extend(true, {}, mainConfig, config);
  };

  utils.Module = Module;

  // Dedicated for osdk window.onbeforeunload event handler TODO: to test if it completes for example kill all sip sessions before closing browser
  window.addEventListener('beforeunload', function () {
    utils.info('Beforeunload start');
    utils.trigger('beforeunload', { arguments: arguments });
    utils.info('Beforeunload end');
  }, false);

  window.addEventListener('error', function () {
    utils.trigger('windowerror', { arguments: arguments });
  }, false);

  // Dedicated for osdk DOMContentLoaded event
  document.addEventListener("DOMContentLoaded", function () {
    utils.trigger('DOMContentLoaded', { arguments: arguments });
  }, false);

  // For creation of module objects
  utils.registerNamespaces({
    utils: utils
  });

  // Own system listeners wrappers TODO: note this events in module developers guide
  utils.registerEvents({
    'windowerror': { self: true, other: true },
    'beforeunload': { self: true, other: true },
    'DOMContentLoaded': { self: true, other: true }
  });

})(oSDK);
