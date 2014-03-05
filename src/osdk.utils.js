/**
 * oSDK utils module.
 */

(function (oSDK) {

  var utils = {};

  utils.debug = true;

  /*
   * Log/warn/err functions
   */
  (function () {
    for(var cli in {'log': !0, 'warn': !0, 'err': !0}) {
  
      utils[cli] = function () {
        
        if(!utils.debug) {
          return;
        }

        console.log('oSDK:', Array.prototype.slice.call(arguments, 0));
      };
    }
  })();

  // UUID generator
  utils.uuid = function () {

    function s4() {
      return Math.floor((1 + Math.random()) * 0x10000)
        .toString(16)
        .substring(1);
    };

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
          s4() + '-' + s4() + s4() + s4();
  };

  // Config parser/extender
  utils.mergeConfig = function (config) {
    // TODO: parse config
    
    // Merge config additions
    oSDK.config = $.extend(true, {}, oSDK.config, config);
  };

  // Object for custom callbacks to events
  var eventListeners = {};

  // TODO: standartize and normalize data object, passed to events? Without breaking internal passing of events from jssip and friends
  // Fires custom callbacks
  utils.fireCallback = function (/*context, eventType, eventData*/) {
    var listener;
    
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

    // Addition of eventType to data
    eventData.type = eventType;
    
    oSDK.log('About to fire event', eventType, 'for available listeners');
    // FIXME: this does not handle event handler priorities AND does not firing :internal event handlers in prioriy to external
    for(listener in eventListeners) {
//      oSDK.log('Searching for', eventType, 'in', listener);
      if(
        (
          listener == eventType ||
          eventListeners[listener].name.split(':')[0] == eventType
        ) && typeof eventListeners[listener].handler == 'function'
      ) {
//         try {
          oSDK.log('Firing callback to listener', eventListeners[listener].name, context, eventType, eventData);
          eventListeners[listener].handler.call(context, eventData);
//         } catch (e) {
//           oSDK.log("Can't fire handler for event type", eventListeners[listener], e);
//         }
      }
    }
  };

  /*
   * Adds custom callback for specified event type.
   * Event type can be suffixed e.g. "onNewRTCSession:group1".
   * Returns id of added listener for removing through {@link oSDK.utils.removeEventListener}
   */
  utils.addEventListener = function (eventName, eventHandler) {
    oSDK.log('Trying to add event listener for', eventName);
    var id  = utils.uuid();
    var newEvent = {
      name: eventName,
      handler: eventHandler
    };
    eventListeners[id] = newEvent;
    return id;
  };
  
  /*
   * Removes custom callbacks for events
   * by event type or id generated through {@link oSDK.utils.addEventListener}
   * 
   */
  utils.removeEventListener = function (eventType) {
    var listener;
    for(listener in eventListeners) {
      if(eventType === listener || eventType === eventListeners[listener].name) {
        delete eventListeners[listener];
      }
    }
  };
  
  // Modules registration stuff
  
  var namespaces = {};
  var methods = {};
  var events = {};
  
  // Returns attached namespaces
  utils.namespaces = function () {
    return namespaces;
  }
  
  // Returns attached methods
  utils.methods = function () {
    return methods;
  }
  
  // Returns attached events
  utils.events = function () {
    return events;
  }
  
  // Returns attached events
  utils.eventListeners = function () {
    return eventListeners;
  }
  
  // Needed to register namespace, method or event in oSDK by its module.
  utils.attach = function (moduleName, object) {
    // TODO: merge similar conditions 
    var i;
    if(object.namespaces) {
      for (i in object.namespaces) {
        if(typeof(object.namespaces[i]) === 'string' && namespaces[object.namespaces[i]] ^ namespaces[i]) {
          throw new oSDK.error('oSDK: Registering module: '+ moduleName +'. Namespace "'+ i +'" is already taken by module '+ namespaces[i]);
        }
        if(typeof(object.namespaces[i]) === 'string') {
          namespaces[object.namespaces[i]] = moduleName;
        } else {
          namespaces[i] = moduleName;
        }
      }
    }

    if(object.methods) {
      for (i in object.methods) {
        if(typeof(object.methods[i]) === 'string' && methods[object.methods[i]] ^ methods[i]) {
          throw new oSDK.error('oSDK: Registering module: '+ moduleName +'. Method "'+ i +'" is already taken by module '+ methods[i]);
        }
        if(typeof(object.methods[i]) === 'string') {
          methods[object.methods[i]] = moduleName;
        } else {
          methods[i] = moduleName;
        }
      }
    }

    if(object.events) {
      for (i in object.events) {
        if(typeof(object.events[i]) === 'string' && events[object.events[i]] ^ events[i]) {
          throw new oSDK.error('oSDK: Registering module: '+ moduleName +'. Event "'+ i +'" is already taken by module '+ events[i]);
        }
        if(typeof(object.events[i]) === 'string') {
          events[object.events[i]] = moduleName;
        } else {
          events[i] = moduleName;
        }
      }
    }
  };

  oSDK.utils = utils;

  // Some direct bindings to namespace
  oSDK.on = oSDK.utils.addEventListener;
  oSDK.off = oSDK.utils.removeEventListener;
  oSDK.trigger = oSDK.utils.fireCallback;
  oSDK.log = oSDK.utils.log;
  oSDK.warn = oSDK.utils.warn;
  oSDK.err = oSDK.utils.err;
  
})(oSDK);