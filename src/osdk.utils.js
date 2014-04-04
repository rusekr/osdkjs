/**
 * oSDK utils module.
 */

(function (oSDK) {
  "use strict";

  var utils = {};

  utils.debug = true;

  /*
   * Console.log/warn/err/.. oSDK wrappers
   * If it'll can't work in ie9 try http://stackoverflow.com/questions/5538972/console-log-apply-not-working-in-ie9
   */
  (function () {
    var methods = ["log","info","warn","error","assert","dir","clear","profile","profileEnd"];

    var lf = function (method) {
      return function () {
        if(!utils.debug) {
          return;
        }
          console[method].apply(console, ['oSDK:'].concat(Array.prototype.slice.call(arguments, 0)));
      };
    };

    methods.forEach( function (method) {
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
        cfgObject = oSDK.utils.isObject(cfgObject)?cfgObject:{};

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
        } else {
          oSDK.log('User token is alive', config);
          return true;
        }

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
      clearToken: function () {
        utils.oauth.configure({
          access_token: null,
          expires_in: null,
          expires_start: null
        });
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
            oSDK.log('triggering', outerEvent);
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
        // Non fatal
        throw new oSDK.error('Can\'t remove event listener(s) - this event type or ID is not registered.');
      }
    }
  };

  // TODO: standartize and normalize data object, passed to events? Without breaking internal passing of events from jssip and friends
  // Fires custom callbacks
  utils.fireEvent = function (/*context, eventType, eventData*/) {
    oSDK.log('fireEvent parameters', arguments);
    var context = null,
      eventTypes = null,
      eventData = null;

    if(utils.isEmpty(arguments[0]) || !utils.isArray(arguments[0]) && !utils.isString(arguments[0]) && utils.isEmpty(arguments[1])) {
      // Non fatal
      throw new oSDK.error('oSDK: Insufficient arguments.');
    } else if(utils.isString(arguments[0]) || utils.isArray(arguments[0])) {
      context = this;
      eventTypes = [].concat(arguments[0]);
      eventData = arguments[1] || {};
      oSDK.log('fireEvent first arg is array or string, eventData is', eventData);
    } else {

      context = arguments[0];
      eventTypes = [].concat(arguments[1]);
      eventData = arguments[2] || {};
      oSDK.log('fireEvent first arg is context object, eventData is', eventData);
    }

    eventTypes.forEach(function (eventType) {
      // Appending/rewriting of eventType in data with last event type

      // Normalizing eventData to object
      if(!utils.isObject(eventData) || utils.isArray(eventData)) {
        eventData = {
          data: eventData
        };
      }
      eventData.type = eventType;
      oSDK.log('final eventdata' , eventData);

      if(!events[eventType]) {
        // Non fatal
        throw new oSDK.error('Event' + eventType + 'not registered therefore can\'t trigger!');
      }

      // Regstered emitters may be zero (e.g. in case of oauth popup)

      // Fire every listener for event type
      var fireToListener = function (listener) {
        // Extending data
        listener.fireData = oSDK.utils.extend({}, listener.fireData, eventData);
        oSDK.log('extended data', listener.fireData, 'with', eventData);

        if (listener.fireType === 'last') {

          // oSDK.log('listener.fireData', listener.fireData);
          // Checking if we can fire
          if (++listener.fireCounter >= events[eventType].emitters.length) {
            oSDK.log('Firing', listener.fireType, eventType, 'with event data', listener.fireData, 'for listener', listener, listener.fireCounter, events[eventType].emitters.length);
            // Firing with cumulative data
            listener.handler.call(context, listener.fireData);
            // Cleaning cumulative data
            listener.fireCounter = 0;
            listener.fireData = {};
          } else {
            oSDK.log('NOT firing', listener.fireType, eventType, 'with event data', listener.fireData, 'for listener', listener, listener.fireCounter, events[eventType].emitters.length);
          }
        } else if (listener.fireType === 'first') {
          if (++listener.fireCounter === 1) {
            oSDK.log('Firing', listener.fireType, eventType, 'with event data', listener.fireData, 'for listener', listener, listener.fireCounter, events[eventType].emitters.length);
            // Firing with current data
            listener.handler.call(context, listener.fireData);
            listener.fireData = {};
          }
          else {
            oSDK.log('NOT firing', listener.fireType, eventType, 'with event data', listener.fireData, 'for listener', listener, listener.fireCounter, events[eventType].emitters.length);
            // Not firing
            listener.fireCounter--; // No to overflow
            listener.fireData = {};
          }
        } else if (listener.fireType === 'every') {
          oSDK.log('Firing', listener.fireType, eventType, 'with event data', listener.fireData, 'for listener', listener, listener.fireCounter, events[eventType].emitters.length);
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
                } else if((c > 127) && (c < 2048)) {
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

  oSDK.utils = utils;

  // Some direct bindings to namespace
  oSDK.on = oSDK.utils.addEventListener;
  oSDK.off = oSDK.utils.removeEventListener;
  oSDK.trigger = oSDK.utils.fireEvent;
  oSDK.log = oSDK.utils.log;
  oSDK.warn = oSDK.utils.warn;
  oSDK.err = oSDK.utils.err;
})(oSDK);
