/*
 * oSDK XMPP module
 */

(function (oSDK, JSJaC) {

  /**
   * Strict mode
   * Activation
   */
  "use strict";

  // Module namespace
  var xmpp = {
    // Debuger
    dbg: null,
    // XMPP Connection
    con: null,
    // User, temp info to connect
    usr: {},
    // Current status
    status: 'not inited',
    // Offline message
    offlineMessages: []
  };

  // Inner storage (session)
  var storage = {
    // Current client
    client: null,
    // Contacts list
    contacts: []
  };

  // Roster ID counter
  var rosterId = 0;
  function getRosterId() {
    return 'roster_' + oSDK.utils.md5(xmpp.usr.login + '@' + xmpp.usr.domain);
    /*
    rosterId ++;
    return 'roster_' + rosterId;
    */
  }

  /**
   * Client/Contact
   */
  function Client(data) {
    var self = this;
    this.photo = false;
    this.group = data.group;
    this.login = data.login;
    this.domain = data.domain;
    this.account = data.login + '@' + data.domain;
    this.history = [];
    this.favorite = false;
    this.deletable = false;
  }

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
    'onConnect': ['xmpp.events.connect', 'core.connected'],
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

  function handleIQ(oIQ) {
    xmpp.con.send(oIQ.errorReply(ERR_FEATURE_NOT_IMPLEMENTED));
  }

  function handleMessage(oJSJaCPacket) {
    if (xmpp.status == 'connected') {
      oSDK.trigger('textMessage', {
        from: oJSJaCPacket.getFromJID().getNode(),
        message: oJSJaCPacket.getBody().htmlEnc()
      });
    } else {
      xmpp.offlineMessages.push({
        from: oJSJaCPacket.getFromJID().getNode(),
        message: oJSJaCPacket.getBody().htmlEnc()
      });
    }
  }

  function handlePresence(oJSJaCPacket) {
    if (!oJSJaCPacket.getType()) {
      oSDK.trigger('contactAvailable', {
        login: oJSJaCPacket.getFrom().split('@')[0]
      });
    } else {
      if (oJSJaCPacket.getType() == 'unavailable') {
        oSDK.trigger('contactUnavailable', {
          login: oJSJaCPacket.getFrom().split('@')[0]
        });
      }
    }
  }

  function handleError(e) {
  }

  function handleStatusChanged(status) {
  }

  function handleConnected() {
    xmpp.con.send(new JSJaCPresence());
    var i, l = null;
    if (xmpp.status == 'connection') {
      xmpp.status = 'get contacts';
      // Get contacts list
      oSDK.log('XMPP get contacts list');
      var roster = new JSJaCIQ();
      roster.setIQ(null, 'get', getRosterId());
      roster.setQuery(NS_ROSTER);
      xmpp.con.sendIQ(roster, {result_handler: function(aIq, arg) {
        var nodes = aIq.getQuery();
        var me = oSDK.getClient().login + '@' + oSDK.getClient().domain;
        i = l = nodes.childNodes.length;
        for (i = 0; i != l; i ++) {
          var jid = nodes.childNodes[i].getAttribute('jid');
          if (jid != me) {
            storage.contacts.push(new Client({login: jid.split('@')[0], domain: jid.split('@')[1], group: false}));
            var presence = new JSJaCPresence();
            presence.setTo(jid);
            presence.setType('');
            presence.setShow('');
            presence.setPriority(100);
            xmpp.con.send(presence);
          }
        }
        xmpp.status = 'connected';
        oSDK.log('xmpp triggering core.connected');
        oSDK.trigger('core.connected', [].slice.call(arguments, 0));
        if (xmpp.offlineMessages.length) {
          i = l = xmpp.offlineMessages.length;
          for (i = 0; i != l; i ++) {
            oSDK.trigger('textMessage', {
              from: xmpp.offlineMessages[i].from,
              message: xmpp.offlineMessages[i].message
            });
          }
        }
      }});
    }
  }

  function handleDisconnected() {
    /*TODO*/
  }

  function handleIqVersion(iq) {
    xmpp.con.send(iq.reply([iq.buildNode('name', 'jsjac simpleclient'), iq.buildNode('version', JSJaC.Version), iq.buildNode('os', navigator.userAgent)]));
    return true;
  }

  function handleIqTime(iq) {
    var now = new Date();
    xmpp.con.send(iq.reply([iq.buildNode('display', now.toLocaleString()), iq.buildNode('utc', now.jabberDate()), iq.buildNode('tz', now.toLocaleString().substring(now.toLocaleString().lastIndexOf(' ') + 1))]));
    return true;
  }

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
      /*timerval: data.timerval,*/
      httpbase: data.httpbase
    });
    xmpp.con.registerHandler('message', handleMessage);
    xmpp.con.registerHandler('presence', handlePresence);
    xmpp.con.registerHandler('iq', handleIQ);
    xmpp.con.registerHandler('onconnect', handleConnected);
    xmpp.con.registerHandler('onerror', handleError);
    xmpp.con.registerHandler('status_changed', handleStatusChanged);
    xmpp.con.registerHandler('ondisconnect', handleDisconnected);
    xmpp.con.registerIQGet('query', NS_VERSION, handleIqVersion);
    xmpp.con.registerIQGet('query', NS_TIME, handleIqTime);
    // Elemental handler's
    /*
    var attachEvent = function (e) {
      oSDK.trigger(typeof(attachableEvents[e.type])==='string' ? attachableEvents[e.type] : e.type, e);
    };
    */
    /*
    for(var i in attachableEvents) {
      xmpp.con.registerHandler(i, attachEvent);
    }
    */
    /*
    xmpp.con.registerHandler('onconnect', xmpp.events.connect);
    xmpp.con.registerHandler('ondisconnect', xmpp.events.disconnect);
    xmpp.con.registerHandler('onresume', xmpp.events.resume);
    xmpp.con.registerHandler('status_changed', xmpp.events.statusChanged);
    xmpp.con.registerHandler('onerror', xmpp.events.error);
    xmpp.con.registerHandler('message', xmpp.events.message.fn);
    xmpp.con.registerHandler('presence', xmpp.events.presence.fn);
    xmpp.con.registerHandler('iq', xmpp.events.iq.fn);
    xmpp.con.registerIQGet('query', NS_VERSION, xmpp.events.iq.version);
    xmpp.con.registerIQGet('query', NS_TIME, xmpp.events.iq.time);
    xmpp.con.registerHandler('message', xmpp.events.message.fn);
    xmpp.con.registerHandler('presence', xmpp.events.presence.fn);
    xmpp.con.registerHandler('iq', xmpp.events.iq.fn);
    xmpp.con.registerHandler('onconnect', xmpp.events.connect);
    xmpp.con.registerHandler('onerror', xmpp.events.error);
    xmpp.con.registerHandler('status_changed', xmpp.events.statusChanged);
    xmpp.con.registerHandler('ondisconnect', xmpp.events.disconnect);
    xmpp.con.registerIQGet('query', NS_VERSION, xmpp.events.iq.version);
    xmpp.con.registerIQGet('query', NS_TIME, xmpp.events.iq.time);
    xmpp.con.registerHandler('onconnect', xmpp.events.connect);
    xmpp.con.registerHandler('ondisconnect', xmpp.events.disconnect);
    xmpp.con.registerHandler('onresume', xmpp.events.resume);
    xmpp.con.registerHandler('onstatuschanged', xmpp.events.statusChanged);
    xmpp.con.registerHandler('onerror', xmpp.events.error);
    xmpp.con.registerHandler('packet_in', xmpp.events.packet.incoming);
    xmpp.con.registerHandler('packet_out', xmpp.events.packet.outcoming);
    xmpp.con.registerHandler('message', xmpp.events.message.fn);
    xmpp.con.registerHandler('message_in', xmpp.events.message.incoming);
    xmpp.con.registerHandler('message_out', xmpp.events.message.outcoming);
    xmpp.con.registerHandler('presence_in', xmpp.events.presence.incoming);
    xmpp.con.registerHandler('presence_in', xmpp.events.presence.outcoming);
    xmpp.con.registerIQGet('query', NS_VERSION, xmpp.events.iq.version);
    xmpp.con.registerIQGet('query', NS_TIME, xmpp.events.iq.time);
    xmpp.con.registerIQGet('query', NS_ROSTER, xmpp.events.iq.get);
    xmpp.con.registerIQSet('query', NS_ROSTER, xmpp.events.iq.set);
    xmpp.con.registerHandler('iq', xmpp.events.iq.fn);
    */
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
    // Current client
    storage.client = new Client({ login: data.login, domain: data.domain, group: false });
  };

  // Attaching internal events to internal oSDK events
  oSDK.on('core.gotTempCreds', function (e) {
    oSDK.log('XMPP got temp creds', arguments);
    xmpp.usr.domain = (arguments[0].data.username.split(':')[1]).split('@')[1];
    xmpp.usr.timestamp = arguments[0].data.username.split(':')[0];
    xmpp.usr.login = (arguments[0].data.username.split(':')[1]).split('@')[0];
    xmpp.usr.password = arguments[0].data.password;
    xmpp.init({
      debug: oSDK.config.xmpp.debug,
      timerval: oSDK.config.xmpp.timer,
      httpbase: ((oSDK.utils.isString(oSDK.config.xmpp.server)) ? oSDK.config.xmpp.server : getHttpBase(oSDK.config.xmpp.server)),
      login: xmpp.usr.login,
      password: xmpp.usr.password,
      domain: xmpp.usr.domain,
      resource: oSDK.config.xmpp.resource
    });
  });

  /**
   * oSDK methods
   */
  oSDK.getClient = function() {
    return storage.client;
  };

  oSDK.getContacts = function(callback) {
    if (callback) {
      oSDK.log('XMPP get contacts list');
      var roster = new JSJaCIQ();
      roster.setIQ(null, 'get', getRosterId());
      roster.setQuery(NS_ROSTER);
      xmpp.con.sendIQ(roster, {result_handler: function(aIq, arg) {
        var nodes = aIq.getQuery();
        var me = oSDK.getClient().login + '@' + oSDK.getClient().domain;
        var i, l = nodes.childNodes.length;
        storage.contacts = [];
        for (i = 0; i != l; i ++) {
          var jid = nodes.childNodes[i].getAttribute('jid');
          if (jid != me) {
            storage.contacts.push(new Client({login: jid.split('@')[0], domain: jid.split('@')[1], group: false}));
          }
        }
        callback(storage.contacts);
      }});
    } else {
      return storage.contacts;
    }
  };

  oSDK.addContact = function(account, callback) {
    var attribs = {jid: account};
    var iq = new JSJaCIQ();
    var itemNode = iq.buildNode('item', attribs);
    itemNode.appendChild(iq.buildNode('group', 'general'));
    iq.setType('set');
    iq.setQuery(NS_ROSTER).appendChild(itemNode);
    if (!callback) callback = function(){return true;};
    xmpp.con.send(iq, callback);
  };

  oSDK.removeContact = function(account, callback) {
    var iq = new JSJaCIQ();
    var itemNode = iq.buildNode('item', {
      jid: account,
      subscription: 'remove'
    });
    iq.setType('set');
    iq.setQuery(NS_ROSTER).appendChild(itemNode);
    if (!callback) callback = function(){return true;};
    xmpp.con.send(iq, callback);
  };

  oSDK.sendMessage = function(account, message, callback) {
    var msg = new JSJaCMessage();
    console.log('MESSAGE to: ' + oSDK.getContactByAccount(account).login);
    msg.setTo(new JSJaCJID(account));
    msg.setBody(message);
    xmpp.con.send(msg);
    if (callback) callback();
  };

  oSDK.addToHistory = function(to, history) {
    var i, l = storage.contacts.length;
    for (i = 0; i != l; i ++) {
      if (storage.contacts[i].login == to) {
        storage.contacts[i].history.push(history);
      }
    }
  };

  oSDK.getContactByAccount = function(account) {
    var i, l = storage.contacts.length;
    for (i = 0; i != l; i ++) {
      if (storage.contacts[i].account == account) {
        return storage.contacts[i];
      }
    }
    return false;
  };

  oSDK.getContactByLogin = function(login) {
    var i, l = storage.contacts.length;
    for (i = 0; i != l; i ++) {
      if (storage.contacts[i].login == login) {
        return storage.contacts[i];
      }
    }
    return false;
  };

  oSDK.setMyStatus = function(status) {
    var presence = new JSJaCPresence();
    presence.setStatus(status);
    presence.setType('');
    presence.setShow('');
    presence.setPriority(100);
    xmpp.con.send(presence);
  };

  oSDK.on('core.disconnected', function (e) {
    xmpp.con.disconnect();
  });

})(oSDK, JSJaC);
