/*
 * oSDK SIP module
 */

(function (oSDK, JsSIP) {
  
  // Module namespace
  var xmpp = {
    dbg: null,
    con: null
  };
  
  // Registering module in oSDK
  var moduleName = 'xmpp';

  var attachableNamespaces = {
    'xmpp': true
  };

  var attachableMethods = {
  //     'start': 'connect',
  //     'stop': 'disconnect',
    'send': true
  };
  
  var attachableEvents = {
    'onConnect': 'xmpp.events.connect',
    'onDisconnect': 'xmpp.events.disconnect',
    'onResume': 'xmpp.events.resume',
    'onStatusChanged': 'xmpp.events.statusChanged',
    'onError': 'xmpp.events.error',
    'packet_in': 'xmpp.events.packet.incoming',
    'packet_out': 'xmpp.events.packet.outcoming',
    'message_in': 'xmpp..events.message.incoming',
    'message_out': 'xmpp..events.message.outcoming',
    'presence_in': 'xmpp.events.presence.incoming',
    'presence_out': 'xmpp.events.presence.outcoming',
    'iq_in': 'xmpp.events.iq.incoming',
    'iq_out': 'xmpp.events.iq.outcoming'
  };
  
  xmpp.events = {
    connect: function(e) {
      console.warn('xmpp connect');
    },
    disconnect: function(e) {
      console.warn('xmpp disconnect');
    },
    resume: function(e) {
      console.warn('xmpp resume');
    },
    statusChanged: function(e) {
      console.warn('xmpp status changed');
    },
    error: function(e) {
      console.warn('xmpp error');
    },
    packet: {
      incoming: function(e) {
        console.warn('xmpp incoming packet');
      },
      outcoming: function(e) {
        console.warn('xmpp outcoming packet');
      }
    },
    message: {
      incoming: function(e) {
        console.warn('xmpp incoming message');
      },
      outcoming: function(e) {
        console.warn('xmpp outcoming message');
      }
    },
    presence: {
      incoming: function(e) {
        console.warn('xmpp incoming presence');
      },
      outcoming: function(e) {
        console.warn('xmpp outcoming presence');
      }
    },
    iq: {
      incoming: function(e) {
        console.warn('xmpp incoming iq');
      },
      outcoming: function(e) {
        console.warn('xmpp outcoming iq');
      }
    }
  };
  
  oSDK.utils.attach(moduleName, {
    namespaces: attachableNamespaces,
    methods: attachableMethods,
    events: attachableEvents
  });
  
  function getHttpBase(data) {
    var result = '';
    if (!data.protocol) {
      result = location.protocol + '://';
    } else {
      result = data.protocol + '://';
    }
    if (!data.domain) {
      result += location.domain;
    } else {
      result += data.domain;
    }
    if (data.port) result += ':' + data.port;
    if (data.url) result += '/' + data.url;
  }
  
  /**
   * XMPP initiation
   * 
   * @param {Number} [dbg=false|true|number] disabled|enabled JSJaC inner console
   * if dbg is number: 0 - warn, 1 - error, 2 - info, 4 - debug, default - log, 3|true - all
   */
  xmpp.init = function(data) {
    // JSJaC logger config
    if (data.debug || data.debug === 0) {
      if (oSDK.isBoolean(data.debug)) {
        xmpp.dbg = new JSJaCConsoleLogger();
      } else {
        if (oSDK.isNumber(data.debug)) xmpp.dbg = new JSJaCConsoleLogger(data.debug);
      }
    }
    console.log({
      oDbg: ((xmpp.dbg) ? xmpp.dbg : false),
      timerval: data.timerval,
      httpbase: data.httpbase
    });
    // Connection
    xmpp.con = new JSJaCWebSocketConnection({
      oDbg: ((xmpp.dbg) ? xmpp.dbg : false),
      timerval: data.timerval,
      httpbase: data.httpbase
    });
    // Handler's
    var attachEvent = function (e) {
      oSDK.trigger(typeof(attachableEvents[e.type])==='string'?attachableEvents[e.type]:e.type, e);
    };
    for(var i in attachableEvents) {
      xmpp.con.registerHandler(i, attachEvent);
    }
  };
  
  
  // Attaching internal events to internal oSDK events
  oSDK.on('auth.gotTempCreds', function (e) {
    oSDK.log('XMPP got temp creds', arguments);
    xmpp.init({
      debug: oSDK.config.xmpp.debug,
      timerval: oSDK.config.xmpp.timer,
      httpbase: ((oSDK.utils.isString(server)) ? server : getHttpBase(server))
    });
  });





  xmpp.JSJaC = JSJaC;

  // Direct bindings to namespace
  //TODO: make this bindings automatic by registering module function
  oSDK.xmpp = xmpp;

})(oSDK, JsSIP);
