/**
 * oSDK utils module.
 */

(function (oSDK) {

  var utils = {};

  utils.debug = true;

  /**
   * Test var types
   * @isNumber
   * @isArray
   * @isObject
   * @isBoolean
   * @isString
   * @isNull
   * @isEmpty
   */
  utils.isNumber = function(value) {
    return (!isNaN(parseFloat(value)) && isFinite(value));
  };
  utils.isArray = function(value) {
    function fnIsNull(value) {
      return ((value === undefined) || (value === null));
    }
    return (!fnIsNull(value) && (Object.prototype.toString.call(value) === '[object Array]'));
  };
  utils.isObject = function(value) {
    function fnIsNull(value) {
      return ((value === undefined) || (value === null));
    }
    function fnIsEmpty(value) {
      return (fnIsNull(value) || ((typeof value.length !== 'undefined') && (value.length === 0)));
    }
    return (!fnIsEmpty(value) && (typeof value == 'object'));
  };
  utils.isBoolean = function(value) {
    return (typeof value == 'boolean');
  };
  utils.isString = function(value) {
    return (typeof value == 'string');
  };
  utils.isNull = function(value) {
    return ((value === undefined) || (value === null));
  };
  utils.isEmpty = function(value) {
    function fnIsNull(value) {
      return ((value === undefined) || (value === null));
    }
    return (fnIsNull(value) || ((typeof value.length !== 'undefined') && (value.length === 0)));
  };

  /*
   * Log/warn/err functions
   */
  (function () {

    var lf = function () {
      if(!utils.debug) {
        return;
      }

      console.log('oSDK:', Array.prototype.slice.call(arguments, 0));
    };
    for(var cli in {'log': !0, 'warn': !0, 'err': !0}) {

      utils[cli] = lf;
    }
  })();

  // UUID generator
  utils.uuid = function () {

    var s4 = function () {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    };

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
          s4() + '-' + s4() + s4() + s4();
  };

  // Each for arrays and objects
  utils.each = function (obj, fn) {
    if (obj.length) {
      for (var i = 0, ol = obj.length, v = obj[0]; i < ol && fn(v, i) !== false; v = obj[++i]);
    } else {
      for (var p in obj) {
        if (fn(obj[p], p) === false)
          break;
      }
    }
  };

  // JQuery simplified equivalent by interface function for only plain merging of objects
  utils.extend = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var inObj = args.shift();
    args.forEach(function (obj) {
      for(var key in obj) {
        inObj[key] = obj[key];
      }
    });
    return inObj;
  };

  // JQuery like simple ajax wrapper
  utils.ajax = function (config) {

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

    config = utils.extend({}, dConfig, config);

    // encodeURIComponent

    // Request data forming
    // String data goes as is.
    if(typeof(config.data) != 'string') {
      // Data encoding for requests
      if(typeof(config.data) == 'object') {
        var tempData = [];
        utils.each(config.data, function (d, i) {
          tempData.push(encodeURIComponent(i) + '=' + encodeURIComponent(d));
        });
        config.data = tempData.join('&');
      }
    }
    // For 'get' in url, for other - in body
    if(config.type.toLowerCase() == 'get') {
      var delim = '?';
      if(config.url.match(/\?/)) {
        delim = '&';
      }
      config.url += delim+config.data;
      config.data = null;
    }

    var r = new XMLHttpRequest();

    var headersNotSet = false;
    var setHeaders = function () {
      // Headers stuff
      if(!config.headers['Content-Type']) {
        r.setRequestHeader("Content-Type","application/json; charset=UTF-8");
      }
      if(!config.headers.Accept) {
        r.setRequestHeader("Accept","*/*");
      }
      for(var h in config.headers) {
        r.setRequestHeader(h, config.headers[h]);
      }
    };

    // For firefox // FIXME: more universal chrome and firefox handlers
    try {
      setHeaders();
    }
    catch (e) {
      oSDK.log('Chrome..not setRequestHeader, firefox set');
      headersNotSet = true;
    }

    r.open(config.type, config.url, config.async,config.username, config.password);

    // For chrome // FIXME more universal chrome and firefox handlers
    if(headersNotSet) {
      oSDK.log('Chrome..setRequestHeader');
      setHeaders();
    }

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
        oSDK.log(e);
      }

      config.success.call(config.success, r.responseText, r);
    };

    r.send(config.data);
    return r;
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
        if(data[0] && data[1]) {
          tmpData[dec(data[0])] = dec(data[1]);
        }
      });
      hashData = tmpData;
    };
    var buildHash = function () {
      var tmpHash = [];
      for(var id in hashData) {
        if(hashData[id] !== null) {
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
    if(window.location.href.match(/(\?|&)error=(.*?)(&|$)/))
    {
      return decodeURIComponent(window.location.href.replace(/.*(\?|&)error=(.*?)(&|$).*/, '$2'));
    }
    return null;
  };

  // Working with localStorage
  utils.storage = {
    getItem: function (name) {
      return JSON.parse(localStorage.getItem(name));
    },
    setItem: function (name, val) {
      return localStorage.setItem(name, JSON.stringify(val));
    },
    removeItem: function (name) {
      return localStorage.removeItem(name);
    }
  };

  // Oauth handling object
  utils.oauth = (function () {

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

        config.access_token = utils.storage.getItem('osdk.access_token') || null;
        config.expires_start = utils.storage.getItem('osdk.expires_start') || null;
        config.expires_in = utils.storage.getItem('osdk.expires_in') || null;

        config = oSDK.utils.extend({}, config, cfgObject);

        utils.storage.setItem('osdk.access_token', config.access_token);
        utils.storage.setItem('osdk.expires_start', config.expires_start);
        utils.storage.setItem('osdk.expires_in', config.expires_in);

        oSDK.log('oauth config', config);
      },
      // Checks hash for token
      checkUrl: function () {
        //TODO: test check for server error-strings in not hash but !url! in query parameters.
        var error = utils.getUrlParameter('error');
        if(error) {
          var error_description = utils.getUrlParameter('error_description');
          console.log(error, error_description);
          alert(error + ':' + error_description);
        }

        var token = utils.hash.getItem('access_token');
        if(token) {
          // Configuring us
          utils.oauth.configure({
              access_token: token,
              expires_in: utils.hash.getItem('expires_in')*1000,
              expires_start: new Date().getTime()
          });

          // We are in popup detection FIXME: ff not closing
          if(window.opener) {
            window.opener.oSDK.trigger('oauth.gotTokenFromPopup', {
              access_token: config.access_token,
              expires_in: config.expires_in,
              expires_start: config.expires_start
            });
          }
        }

        // TODO: No error and no token case?
      },
      // Clears url from token stuff
      clearUrl: function () {
        utils.hash.removeItem('access_token');
        utils.hash.removeItem('expires_in');
      },
      // Wrapper for ordinary ajax
      ajax: function (options) {
        // Bearer to authorization
        if(config.bearer) {
          options.headers.Authorization = 'Bearer ' + config.bearer;
        }
        // Access token to query string
        if(utils.oauth.isTokenAlive()) {
          var delim = '?';
          if(options.url.match(/\?/)) {
            delim = '&';
          }
          options.url += delim + 'access_token=' + config.access_token;
        }
        return utils.ajax.call(this, options);
      },
      isTokenAlive: function () {
        var nowTime = new Date().getTime();
        if(!config.access_token) {
          oSDK.log('User token not found');
          return false;
        } else if (config.expires_in + config.expires_start <= nowTime) {
          oSDK.log('User token has expired');
        }
        oSDK.log('User token is alive', config);
        return true;

      },
      // Go to auth page if token expired or not exists (or forcibly if force == true)
      getToken: function (force) {
        if(!force && utils.oauth.isTokenAlive()) {
          return true;
        }

        var authUrl = config.authorization_uri + '?redirect_uri=' + encodeURIComponent(config.redirect_uri) + '&client_id=' + encodeURIComponent(config.client_id) + '&response_type=token';
        if(config.popup) {
          // Create popup
          var params = "menubar=no,location=yes,resizable=yes,scrollbars=yes,status=no,width=800,height=600";
          authPopup = window.open(authUrl, "oSDP Auth", params);
          if(authPopup === null) {
            // TODO: autochange type of request to redirect?
            alert('Error. Authorization popup blocked by browser.');
          }
        } else {
          // Redirect current page
          window.location = authUrl;
        }
        return false;
      },
      // Returns authorization popup object
      popup: function () { return authPopup; }
    };
  })();

  // Config parser/extender
  utils.mergeConfig = function (config) {
    // TODO: parse config

    // Merge config additions
    oSDK.config = oSDK.utils.extend({}, oSDK.config, config);
  };


  // Modules/events registration stuff

  var namespaces = {};
  var methods = {};
  var events = {};

  utils.eventSkel = function () {
    return {
          emitters: [],
          listeners: []
    };
  };

  // Returns attached namespaces
  utils.namespaces = function () {
    return namespaces;
  };

  // Returns attached methods
  utils.methods = function () {
    return methods;
  };

  // Returns attached event emitters and listeners grouped by event name
  utils.events = function () {
    return events;
  };

  // FOR MODULE. Needed to register namespace, method or event in oSDK by its module.
  // attachableEvents - map internal events to same named oSDK events, aliases or array of aliases
  utils.attach = function (moduleName, object) {
    // TODO: merge similar conditions
    var i;
    if (object.namespaces) {
      for (i in object.namespaces) {
        if (typeof(object.namespaces[i]) === 'string' && namespaces[object.namespaces[i]] ^ namespaces[i]) {
          throw new oSDK.error('Registering module: ' + moduleName + '. Namespace "' + i + '" is already taken by module ' + namespaces[i]);
        }
        if (typeof(object.namespaces[i]) === 'string') {
          namespaces[object.namespaces[i]] = moduleName;
        } else {
          namespaces[i] = moduleName;
        }
      }
    }

    if (object.methods) {
      for (i in object.methods) {
        if (typeof(object.methods[i]) === 'string' && methods[object.methods[i]] ^ methods[i]) {
          throw new oSDK.error('Registering module: ' + moduleName + '. Method "' + i + '" is already taken by module ' + methods[i]);
        }
        if (typeof(object.methods[i]) === 'string') {
          methods[object.methods[i]] = moduleName;
        } else {
          methods[i] = moduleName;
        }
      }
    }

    var registerEvents = function (eventType) {
      oSDK.log('Registering events for module: ' + moduleName + '.', eventType, events[eventType]);

      if (events[eventType]) {
        oSDK.log('Registering events for module: ' + moduleName + '. Event "' + eventType + '" is already taken by module(s) ' + events[eventType].toString() + '. Combining.');
      } else {
        events[eventType] = utils.eventSkel();
      }

      events[eventType].emitters.push({ module: moduleName, fired: false /* Or data if fired */ });
    };

    // NOTICE: Each event may be boolean, string or array of strings. If boolean - event registered in oSDK by it's eventType. If string - by it's alias named in this string. Array of strings works like string but registers event as each alias. If same event registered by several modules - fires only last triggered event with combined by module eventType data.
    if (object.events) {
      for (i in object.events) {
        // Each i must be an array
        if (typeof(object.events[i]) === 'string') { // Assuming event alias
          i = [object.events[i]];
        } else if (object.events[i] instanceof Array){ // Assuming array of event aliases
          i = [].concat(object.events[i]);
        } else {
          i = [i]; // Assuming boolean
        }
        i.map(registerEvents);
      }
    }
        // Attaching external events to registered in oSDK events
//     var attachEvent = function (e) {
//       oSDK.trigger(typeof(attachableEvents[e.type])==='string'?attachableEvents[e.type]:e.type, e);
//     };
//     for(var i in attachableEvents) {
//       sip.JsSIPUA.on(i, attachEvent );
//     }
//     if(object.eventsInterface) {
//       for (i in object.eventsInterface) {
//
//       }
//     };

  };

  // Attach triggers for registered events through initialized module object
  utils.attachTriggers = function (attachableEvents, triggerFunction, context) {

      utils.each(attachableEvents, function (ev, i) {
        var outer = [];
        if (typeof(ev) === 'string') { // Assuming event alias
          outer.push(ev);
        } else if (ev instanceof Array){ // Assuming array of event aliases
          outer = outer.concat(ev);
        } else {
          outer.push(i); // Assuming boolean
        }

        utils.each(outer, function (outerEvent) {
          triggerFunction.call(context || this, i, function (e) {
            utils.fireEvent(outerEvent, e);
          });
        });


      });
  };

  /*
   * Adds custom callback for specified event type.
   * Returns id of added listener for removing through {@link oSDK.utils.removeEventListener}.
   * @param fireType may be 'last' (default, fires only when last emitter sent event), 'first' (fires only when first emitter sent event, fatal error case), 'every' (fires every time emitter emits)
   */
  utils.addEventListener = function (eventType, eventHandler, fireType) {
    oSDK.log('Trying to add event listener for', eventType);

    var fireTypes = {
      'last': !0,
      'first': !0,
      'every': !0
    };

    if(!events[eventType]) {
      events[eventType] = utils.eventSkel();
    }
    var id  = utils.uuid();
    fireType = fireTypes[fireType]?fireType:'last';
    var listener = {
      id: id,
      handler: eventHandler,
      fireType: fireType,
      fireCounter: 0,
      fireData: {}
    };
    events[eventType].listeners.push(listener);
    return id;
  };

  /*
   * Removes custom callbacks for events by id or by eventType
   * by event type or id generated through {@link oSDK.utils.addEventListener}
   *
   */
  utils.removeEventListener = function (eventTypeOrID) {

    if(events[eventTypeOrID]) {
      // Removing all listeners for eventType
      events[eventTypeOrID].listeners = [];
      oSDK.log('Removed all listeners for event', eventTypeOrID);
    } else {
      // Searching and removing
      var foundById = false;
      var removeListener = function (id, i) {
        if(events[eventType].listeners[i].id == eventTypeOrID) {
          events[eventType].listeners.splice(i,1);
          foundById = true;
          return false;
        }
      };
      for (var eventType in events) {
        events[eventType].listeners.forEach(removeListener);
      }
      if(!foundById) {
        throw new oSDK.error('Can\'t remove event listener(s) - this event type or ID is not registered.');
      }
    }
  };

  // TODO: standartize and normalize data object, passed to events? Without breaking internal passing of events from jssip and friends
  // Fires custom callbacks
  utils.fireEvent = function (/*context, eventType, eventData*/) {
    var event;

    if(typeof(arguments[0]) == 'undefined' || typeof(arguments[0]) == 'object' && typeof(arguments[1]) == 'undefined') {
      throw new oSDK.error('oSDK: Insufficient arguments.');
    } else if(typeof(arguments[0]) == 'string') {
      context = this;
      eventType = arguments[0];
      eventData = arguments[1] || {};
    } else {
      context = arguments[0];
      eventType = arguments[1];
      eventData = arguments[2] || {};
    }

    oSDK.log('fireEvent plain data is', eventData, 'for event', eventType);
    // Normalizing eventData to object
    if(!utils.isObject(eventData)) {
      eventData = {
        data: eventData
      };
    }
    // Appending of eventType to data
    eventData.type = eventType;

    if(!events[eventType]) {
      throw new oSDK.error('Event', eventType, 'not registered therefore can\'t trigger!');
    }

    // Regstered emitters may be zero (e.g. in case of oauth popup)

    // Fire every listener for event type
    var fireToListener = function (listener) {
      oSDK.log('Checking if can fire', eventType, 'with event data', eventData, listener.fireData, 'for listener', listener);
      if (listener.fireType === 'last') {
        // Extending data
        if(eventData) {
          listener.fireData = oSDK.utils.extend({}, listener.fireData, eventData);
        }
        oSDK.log('listener.fireData', listener.fireData);
        // Checking if we can fire
        if (++listener.fireCounter >= events[eventType].emitters.length) {
          oSDK.log('Firing', eventType, 'with event data', listener.fireData, 'for listener', listener, listener.fireCounter, events[eventType].emitters.length);
          // Firing with cumulative data
          listener.handler.call(context, listener.fireData);
          // Cleaning cumulative data
          listener.fireCounter = 0;
          listener.fireData = {};
        } else {
          oSDK.log('NOT firing', eventType, 'with event data', listener.fireData, 'for listener', listener, listener.fireCounter, events[eventType].emitters.length);
        }
      } else if (listener.fireType === 'first') {
        if (++listener.fireCounter === 1) {
          // Firing with current data
          listener.handler.call(context, eventData);
        }
        else {
          listener.fireCounter--; // No to overflow
        }
      } else if (listener.fireType === 'every') {
        // Just firing
        listener.handler.call(context, eventData);
      }
    };
    events[eventType].listeners.forEach(fireToListener);

  };

  oSDK.utils = utils;

  // Some direct bindings to namespace
  oSDK.on = oSDK.utils.addEventListener;
  oSDK.off = oSDK.utils.removeEventListener;
  oSDK.trigger = oSDK.utils.fireEvent;
  oSDK.log = oSDK.utils.log;
  oSDK.warn = oSDK.utils.warn;
  oSDK.err = oSDK.utils.err;
})(oSDK);
