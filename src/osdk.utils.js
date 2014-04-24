/**
 * oSDK utils module.
 */

(function (oSDK) {
  "use strict";

  var utils = {};
  var namespaces = {};
  var methods = {};
  var events = {};
  var mainConfig = {};
  var browserMethods = ["log","info","warn","error","assert","dir","clear","profile","profileEnd"];

  utils.debug = true;

  /*
   * Console.log/warn/err/.. oSDK wrappers
   * If it'll can't work in ie9 try http://stackoverflow.com/questions/5538972/console-log-apply-not-working-in-ie9
   */
  (function () {

    var lf = function (method) {
      return function () {
        // Function respects global and module-specific debug
        if (!utils.debug || !this.debug) {
          return;
        }
          console[method].apply(console, ['oSDK:'].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };

    browserMethods.forEach( function (method) {
      utils[method] = lf(method);
    });
  })();

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

  /**
   * Work with json objects
   * @jsonEncode
   * @jsonDecode
   */
  utils.jsonEncode = function(data) {
    try {
      return JSON.stringify(data);
    } catch(eJsonEncode) {
      return null;
    }
  };
  utils.jsonDecode = function(data) {
    try {
      return JSON.parse(data);
    } catch(eJsonDecode) {
      return null;
    }
  };

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

  // JQuery equivalent by interface function for deep merging of objects (recursion)
  utils.extend = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    //utils.error('running extend with arguments', args, arguments);
    var inObj = args.shift();
    args.forEach(function (obj) {
      // utils.log('extend preparing to merge', obj, 'in', inObj);
      for (var key in obj) {

        // Translating only object's own properties
        if (inObj[key] && !inObj.hasOwnProperty(key) || obj[key] && !obj.hasOwnProperty(key)) {
          continue;
        }

        // utils.log('extending ' + key + ' in ', inObj , ' with ' + obj[key]);

        if (utils.isObject(inObj[key]) && utils.isObject(obj[key])) {
          inObj[key] = utils.extend({}, inObj[key], obj[key]);
        } else /*if (utils.isString(obj[key]) || utils.isArray(obj[key]) || utils.isNumber(obj[key]) || utils.isBoolean(obj[key]))*/ {
          inObj[key] = obj[key];
        } /*else {
          utils.error('extend not merging key', key, obj, inObj);
        }*/
      }
    });
    return inObj;
  };

  // JQuery like simple ajax wrapper
  utils.ajax = function (config) {
    utils.log('sending ajax with config', config);
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
    if (typeof(config.data) != 'string') {
      // Data encoding for requests
      if (typeof(config.data) == 'object') {
        var tempData = [];
        utils.each(config.data, function (d, i) {
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

    // For firefox // FIXME: more universal chrome and firefox handlers
//     try {
//       setHeaders();
//     }
//     catch (e) {
//       utils.log('Chrome..not setRequestHeader, firefox set');
//       headersNotSet = true;
//     }

    r.open(config.type, config.url, config.async,config.username, config.password);

    // For chrome // FIXME more universal chrome and firefox handlers
//     if (headersNotSet) {
//       utils.log('Chrome..setRequestHeader');
      setHeaders();
//     }

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
        utils.log(e);
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

  // Modules/events registration stuff

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
  utils.attach = function (module, object) {

    // Module name or Core
    var moduleName = this.name?this.name().toUpperCase():module;

    // TODO: merge similar conditions
    var i, j;

    if (object.namespaces) {
      for (i in object.namespaces) {
        if (!namespaces[i]) {
          namespaces[i] = {};
          oSDK[i] = {};
        } else {
          utils.log('Registering namespaces for module: ' + moduleName + '. Namespace "' + i + '" is already filled by module(s) ' + namespaces[i].toString() + '. Combining.');
        }
        namespaces[i][moduleName] = [];
        for (j in object.namespaces[i]) {
          if (object.namespaces[i].hasOwnProperty(j)) {
            if (!oSDK[i][j]) {
              oSDK[i][j] = object.namespaces[i][j];
              namespaces[i][moduleName].push(j);
            } else {
              throw new Error('Registering module: ' + moduleName + '. Namespace "' + i + '" is already has property ' + j);
            }
          }
        }
      }
    }

    if (object.methods) {
      for (i in object.methods) {
        if (methods[i]) {
          throw new Error('Registering module: ' + moduleName + '. Method "' + i + '" is already taken by module ' + methods[i]);
        }
        methods[i] = moduleName;
        oSDK[i] = object.methods[i];
      }
    }

    var registerEvents = function (eventType) {
      utils.log('Registering events for module: ' + moduleName + '.', eventType, events[eventType]);

      if (events[eventType]) {
        utils.log('Registering events for module: ' + moduleName + '. Event "' + eventType + '" is already taken by module(s) ' + events[eventType].toString() + '. Combining.');
      } else {
        events[eventType] = utils.eventSkel();
      }

      events[eventType].emitters.push({ module: moduleName, fired: false /* Or data if fired */ });

      // utils.info('event registered', events);
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

  };

  /*
   * Adds custom callback for specified event type.
   * Returns id of added listener for removing through {@link utils.off}.
   * @param fireType may be 'last' (default, fires only when last emitter sent event), 'first' (fires only when first emitter sent event, fatal error case), 'every' (fires every time emitter emits)
   */
  utils.on = function (eventTypes, eventHandler, fireType) {

    // Module name or Client
    var moduleName = this.name?this.name().toUpperCase():'Client';

    var fireTypes = {
      'last': !0,
      'first': !0,
      'every': !0
    };

    var ids = [];
    eventTypes = [].concat(eventTypes);

    utils.each(eventTypes, function (eventType) {
      if (!events[eventType]) {
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
      ids.push(id);
    });
    return (ids.length == 1)?ids[0]:ids;
  };

  /*
   * Resets firecounters for eventName or globally for all registered event listeners
   */
  utils.resetTriggerCounters = function (eventName) {
    // utils.log('starting clearing triggers for', eventName);
    var eventNames = [];
    if (!utils.isNull(eventName)) {
      eventNames.concat(eventName);
    }
    utils.each(events, function (event, name) {
      if (eventNames.length && eventNames.indexOf(name) == -1) {
        return;
      }
      utils.each(event.listeners, function (listener) {
        listener.fireCounter = 0;
        listener.fireData = {};
        utils.log('cleared counter', listener, eventName);
      });
    });
  };

  /*
   * Removes custom callbacks for events by id or by eventType
   * by event type or id generated through {@link utils.on}
   *
   */
  utils.off = function (eventTypeOrID) {

    // Module name or Client
    var moduleName = this.name?this.name().toUpperCase():'Client';

    if (events[eventTypeOrID]) {
      // Removing all listeners for eventType
      events[eventTypeOrID].listeners = [];
      utils.log('Removed all listeners for event', eventTypeOrID);
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
        throw new Error('Can\'t remove event listener(s) - this event type or ID is not registered.');
      }
    }
  };

  // TODO: standartize and normalize data object, passed to events? Without breaking internal passing of events from jssip and friends
  // Fires custom callbacks
  utils.trigger = function (/*context, eventType, eventData*/) {

    // Module name or Core
    var moduleName = this.name?this.name().toUpperCase():'Core';

    //utils.log('trigger started with parameters', arguments);
    var context = null,
      eventTypes = null,
      eventData = null;

    if (utils.isEmpty(arguments[0]) || !utils.isArray(arguments[0]) && !utils.isString(arguments[0]) && utils.isEmpty(arguments[1])) {
      // Non fatal
      throw new Error('Insufficient arguments to trigger event.');
    } else if (utils.isString(arguments[0]) || utils.isArray(arguments[0])) {
      context = this;
      eventTypes = [].concat(arguments[0]);
      eventData = arguments[1] || {};
      //utils.log('trigger first arg is array or string, eventData is', eventData);
    } else {

      context = arguments[0];
      eventTypes = [].concat(arguments[1]);
      eventData = arguments[2] || {};
      //utils.log('trigger first arg is context object, eventData is', eventData);
    }

    eventTypes.forEach(function (eventType) {
      // Appending/rewriting of eventType in data with last event type

      // Normalizing eventData to object
      if (!utils.isObject(eventData)) {
        //utils.log('trigger event data is not object, wrapping', eventData);
        eventData = {
          data: eventData
        };
        //utils.log('trigger event data wrapped as', eventData);
      }
      eventData.type = eventType;
      //utils.log('final eventdata' , eventData);

      if (!events[eventType]) {
        // Non fatal
        throw new Error('Event' + eventType + 'not registered therefore can\'t trigger!');
      }

      // Regstered emitters may be zero (e.g. in case of oauth popup)

      // Fire every listener for event type
      var fireToListener = function (listener) {
        // Extending data
        listener.fireData = utils.extend({}, listener.fireData, eventData);
        //utils.log('extended data', listener.fireData, 'with', eventData);

        if (listener.fireType === 'last') {

          // utils.log('listener.fireData', listener.fireData);
          // Checking if we can fire
          if (++listener.fireCounter >= events[eventType].emitters.length) {
            utils.log(moduleName, 'Firing', listener.fireType, eventType, 'with event data', listener.fireData, 'for listener', listener, listener.fireCounter, events[eventType].emitters.length);
            // Firing with cumulative data
            listener.handler.call(context, listener.fireData);
            // Cleaning cumulative data
            listener.fireCounter = 0;
            listener.fireData = {};
          } else {
            utils.log(moduleName, 'NOT firing', listener.fireType, eventType, 'with event data', listener.fireData, 'for listener', listener, listener.fireCounter, events[eventType].emitters.length);
          }
        } else if (listener.fireType === 'first') {
          if (++listener.fireCounter === 1) {
            utils.log(moduleName, 'Firing', listener.fireType, eventType, 'with event data', listener.fireData, 'for listener', listener, listener.fireCounter, events[eventType].emitters.length);
            // Firing with current data
            listener.handler.call(context, listener.fireData);
            listener.fireData = {};
          }
          else {
            utils.log(moduleName, 'NOT firing', listener.fireType, eventType, 'with event data', listener.fireData, 'for listener', listener, listener.fireCounter, events[eventType].emitters.length);
            // Not firing
            listener.fireCounter--; // No to overflow
            listener.fireData = {};
          }
        } else if (listener.fireType === 'every') {
          utils.log(moduleName, 'Firing', listener.fireType, eventType, 'with event data', listener.fireData, 'for listener', listener, listener.fireCounter, events[eventType].emitters.length);
          // Just firing
          listener.handler.call(context, listener.fireData);
          listener.fireData = {};
        }
      };
      events[eventType].listeners.forEach(fireToListener);
    });
  };

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

  /*
   * oSDK module object factory
   */
  function Module(name) {
    var self = this;
    var nameInt = name;
    var debug = false; // Per-module debug

    self.name = function () {
      return nameInt;
    };

    self.on = utils.on;
    self.off = utils.off;
    self.trigger = utils.trigger;

    browserMethods.forEach( function (method) {
      self[method] = utils[method];
    });

    self.utils = utils;

    self.config = function () {
      // If we got parameter string like 'app.key' - returning this subpath.
      if (arguments[0] && utils.isString(arguments[0])) {
        var parameter = mainConfig[nameInt];
        var subParameter = arguments[0].split('.');
        for (var i = 0; i < subParameter.length; i++) {
          parameter = parameter[subParameter[i]];
        }
        return parameter;
      }
      return mainConfig[nameInt];
    };

    self.registerEvents = function (eventsObject) {
      utils.attach(name, { events: eventsObject });
    };

    self.registerMethods = function (methodsObject) {
      utils.attach(name, { methods: methodsObject });
    };

    self.registerNamespaces = function (namespacesObject) {
      utils.attach(name, { namespaces: namespacesObject });
    };

    self.registerConfig = function (configObject) {
      mainConfig[name] = utils.extend({}, mainConfig[name], configObject);
    };


  }

  Module.mergeConfig = function (config) {
    mainConfig = utils.extend({}, mainConfig, config);
  };

  // Some direct bindings to namespace
  oSDK.Module = Module;
})(oSDK);
