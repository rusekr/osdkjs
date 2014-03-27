/*
 * oSDK XMPP module
 */

(function (oSDK, JSJaC) {
  
  // Module namespace
  var xmpp = {
    // Debuger
    dbg: null,
    // Connection
    con: null,
    // Information about current client
    usr: {},
    // Current status
    status: 'not inited'
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
  
  /**
   * XMPP Events
   */
  xmpp.events = {
    connect: function() {
      oSDK.log('XMPP handler - connect');
      if (xmpp.status == 'connection') {
        oSDK.trigger('connected', [].slice.call(arguments, 0));
      }
      // Change XMPP status
      xmpp.status = 'connected';
    },
    disconnect: function() {
      oSDK.log('XMPP handler - disconnect');
      // Change XMPP status
      xmpp.status = 'disconnected';
    },
    resume: function(e) {
      oSDK.log('XMPP handler - resume', e);
    },
    statusChanged: function(e) {
      oSDK.log('XMPP handler - status changed', e);
    },
    error: function(e) {
      oSDK.log('XMPP handler - error', e);
    },
    packet: {
      incoming: function(e) {
        oSDK.log('XMPP handler - incoming packet', e);
      },
      outcoming: function(e) {
        oSDK.log('XMPP handler - outcoming packet', e);
      }
    },
    message: {
      incoming: function(e) {
        oSDK.log('XMPP handler - incoming message', e);
      },
      outcoming: function(e) {
        oSDK.log('XMPP handler - outcoming message', e);
      }
    },
    presence: {
      incoming: function(e) {
        oSDK.log('XMPP handler - incoming presence', e);
      },
      outcoming: function(e) {
        oSDK.log('XMPP handler - outcoming presence', e);
      }
    },
    iq: {
      fn: function(e) {
        oSDK.log('XMPP handler - iq', e);
      },
      get: function(e) {
        oSDK.log('XMPP handler - iq get', e);
      },
      set: function(e) {
        oSDK.log('XMPP handler - iq set', e);
      },
      version: function(e) {
        oSDK.log('XMPP handler - iq version', e);
      },
      time: function(e) {
        oSDK.log('XMPP handler - iq time', e);
      }
    }
  };
  
  oSDK.utils.attach(moduleName, {
    namespaces: attachableNamespaces,
    methods: attachableMethods,
    events: attachableEvents
  });
  
  /**
   * Get HttpBase from config to XMPP connection:
   * @protocol {String}
   * @domain {String}
   * @port {String}
   * @url {String}
   */
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
    result += '/';
    return result;
  }
  
  /**
   * User to Client/Contact
   */
  function User(data) {
    
  }
  
  /**
   * XMPP fn
   * 
   * Connect
   * Disconnect
   */
  xmpp.fn = {
    connect: function(data) {
      if (!xmpp.con.connected()) {
        oSDK.log('XMPP connect with', data);
        xmpp.status = 'connection';
        xmpp.con.connect(data);
      }
    },
    disconnect: function() {
      if (xmpp.con.connected()) {
        oSDK.log('XMPP disconnect');
        xmpp.status = 'disconnection';
        xmpp.con.disconnect();
      }
    },
    getClient: function() {
      
    },
    getContacts: function(callback) {
      
    },
    addContact: function(callback) {
      
    },
    removeContact: function(callback) {
      
    }
  };
  
  /**
   * XMPP initiation
   * 
   * @param {Number} [dbg=false|true|number] disabled|enabled JSJaC inner console
   * if dbg is number: 0 - warn, 1 - error, 2 - info, 4 - debug, default - log, 3|true - all
   */
  xmpp.init = function(data) {
    oSDK.log('XMPP init', data);
    // JSJaC logger config
    if (data.debug || data.debug === 0) {
      if (oSDK.utils.isBoolean(data.debug)) {
        xmpp.dbg = new JSJaCConsoleLogger();
      } else {
        if (oSDK.utils.isNumber(data.debug)) xmpp.dbg = new JSJaCConsoleLogger(data.debug);
      }
    }
    // Connection
    xmpp.con = new JSJaCWebSocketConnection({
      oDbg: ((xmpp.dbg) ? xmpp.dbg : false),
      timerval: data.timerval,
      httpbase: data.httpbase
    });
    // Elemental handler's
    var attachEvent = function (e) {
      oSDK.trigger(typeof(attachableEvents[e.type])==='string' ? attachableEvents[e.type] : e.type, e);
    };
    /*
    for(var i in attachableEvents) {
      xmpp.con.registerHandler(i, attachEvent);
    }
    */
    xmpp.con.registerHandler('onConnect', xmpp.events.connect);
    xmpp.con.registerHandler('onDisconnect', xmpp.events.disconnect);
    xmpp.con.registerHandler('onResume', xmpp.events.resume);
    xmpp.con.registerHandler('onStatusChanged', xmpp.events.statusChanged);
    xmpp.con.registerHandler('onError', xmpp.events.error);
    xmpp.con.registerHandler('packet_in', xmpp.events.packet.incoming);
    xmpp.con.registerHandler('packet_out', xmpp.events.packet.outcoming);
    xmpp.con.registerHandler('message_in', xmpp.events.message.incoming);
    xmpp.con.registerHandler('message_out', xmpp.events.message.outcoming);
    xmpp.con.registerHandler('presence_in', xmpp.events.presence.incoming);
    xmpp.con.registerHandler('presence_in', xmpp.events.presence.outcoming);
    xmpp.con.registerIQGet('query', NS_VERSION, xmpp.events.iq.version);
    xmpp.con.registerIQGet('query', NS_TIME, xmpp.events.iq.time);
    xmpp.con.registerIQGet('query', NS_ROSTER, xmpp.events.iq.get);
    xmpp.con.registerIQSet('query', NS_ROSTER, xmpp.events.iq.set);
    xmpp.con.registerHandler('iq', xmpp.events.iq.fn);
    // Change XMPP status
    xmpp.status = 'inited';
    // Authorization
    xmpp.fn.connect({
      domain: data.domain,
      resource: data.resource,
      username: data.login,
      password: data.password,
      pass: data.password
    });
  };
  
  // Attaching internal events to internal oSDK events
  oSDK.on('auth.gotTempCreds', function (e) {
    oSDK.log('XMPP got temp creds', arguments);
    xmpp.usr.domain = (arguments[0].data.username.split(':')[1]).split('@')[1];
    xmpp.usr.stamp = arguments[0].data.username.split(':')[0];
    xmpp.usr.lgn = (arguments[0].data.username.split(':')[1]).split('@')[0];
    xmpp.usr.pwd = arguments[0].data.password;
    xmpp.init({
      debug: oSDK.config.xmpp.debug,
      timerval: oSDK.config.xmpp.timer,
      httpbase: ((oSDK.utils.isString(oSDK.config.xmpp.server)) ? oSDK.config.xmpp.server : getHttpBase(oSDK.config.xmpp.server)),
      login: xmpp.usr.lgn,
      password: xmpp.usr.pwd,
      domain: xmpp.usr.domain,
      resource: oSDK.config.xmpp.resource
    });
  });

})(oSDK, JSJaC);