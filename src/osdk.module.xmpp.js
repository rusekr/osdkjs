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
    status: {
      connection: null,
      message: null,
      presence: null
    },
    // Offline message
    offlineMessages: [],
    // Who ask flag
    iAsking: false,
    // Notice
    notice: [],
    //Already subscribe
    subscribe: [],
    wait: null,
    temp: null
  };

  // Inner storage (session)
  var storage = {
    // Current client
    client: null,
    // Contacts list
    contacts: []
  };

  /**
   * Get roster id
   */
  function getRosterId() {return 'roster_' + oSDK.utils.md5(xmpp.usr.login + '@' + xmpp.usr.domain);}

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
   * Client/Contact
   */
  function Client(jid, group) {
    var self = this;
    var JabberID = jid.toLowerCase();
    oSDK.log('XMPP: create new client - ' + JabberID);
    this.photo = false;
    this.group = (group) ? group : 'ungrouped';
    this.login = JabberID.split('@')[0];
    this.domain = (typeof JabberID.split('@')[1] != 'undefined') ? JabberID.split('@')[1] : oSDK.clientInfo.domain();
    this.account = this.login + '@' + this.domain;
    this.status = 'unavailable';
    this.history = [];
    this.favorite = false;
    this.deletable = false;
  }

  // Registering module in oSDK
  var moduleName = 'xmpp';
  var attachableNamespaces = { 'xmpp': true };
  var attachableMethods = { 'send': true };

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
   * XMPP Events handlers
   */

  function handleIQ(oIQ) {
    xmpp.con.send(oIQ.errorReply(ERR_FEATURE_NOT_IMPLEMENTED));
  }

  function handleMessage(oJSJaCPacket) {
    console.log('MEEESSAGE');
    if (xmpp.con.connected()) {
      oSDK.trigger('core.textMessage', {
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

  function handlePresenceIn(oJSJaCPacket) {
    var login = oJSJaCPacket.getFromJID()._node;
    var domain = oJSJaCPacket.getFromJID()._domain;
    var account = (login + '@' + domain).toLowerCase();
    console.warn('TRY TO GET PRESENCE');
    console.warn(account, oJSJaCPacket.getType(), oJSJaCPacket.getShow(), oJSJaCPacket.getPriority());
    if (account != oSDK.getClient().account) {
      if (oJSJaCPacket.getType() == 'error') {
        oSDK.changeStatus(account, 'error');
        oSDK.trigger('core.contactError', oSDK.getContactByAccount(account));
      } else {
        if (oJSJaCPacket.getType() == 'unsubscribe') {
          oSDK.removeContact(account);
          oSDK.getRoster(function() {
            oSDK.trigger('core.newContactsList', {});
          });
        }
        if (oJSJaCPacket.getType() == 'unsubscribed') {
          if (oSDK.waitSubscription(account)) {
            var presence;
            presence = new JSJaCPresence();
            presence.setTo(account);
            presence.setType('unsubscribed');
            xmpp.con.send(presence);
            oSDK.removeContact(account);
            oSDK.getRoster(function() {
              oSDK.trigger('core.newContactsList', {});
            });
          }
        }
        if (oJSJaCPacket.getType() == 'subscribe' || oJSJaCPacket.getType() == 'subscribed') {
          if(oJSJaCPacket.getType() == 'subscribed' && xmpp.wait == account) {
            xmpp.iAsking = false;
            xmpp.wait = null;
            oSDK.getRoster(function() {
              oSDK.trigger('core.newContactsList', {});
              oSDK.trigger('core.contactAvailable', oSDK.getContactByAccount(account));
              var presencekk;
              presencekk = new JSJaCPresence();
              presencekk.setShow('chat');
              xmpp.con.send(presencekk);
            });
          }
          if(oJSJaCPacket.getType() == 'subscribe' && oSDK.waitSubscription(account)) {
            xmpp.iAsking = false;
            var presencek;
            presencek = new JSJaCPresence();
            presencek.setTo(account);
            presencek.setType('subscribed');
            xmpp.con.send(presencek);
            setTimeout(function() {
              oSDK.getRoster(function() {
                oSDK.trigger('core.newContactsList', {});
                oSDK.trigger('core.contactAvailable', oSDK.getContactByAccount(account));
                presencek = new JSJaCPresence();
                presencek.setShow('chat');
                xmpp.con.send(presencek);
              });
            }, 500);
          }
          if(oJSJaCPacket.getType() == 'subscribe' && !oSDK.waitSubscription(account)) {
            if (!xmpp.iAsking) {
              xmpp.notice.push({
                type: 'xmpp.auth.request',
                data: account
              });
              oSDK.trigger('core.xmppNewNotice', {
                type: 'xmpp.auth.request',
                data: account
              });
            }
          }
        } else {
          if (oJSJaCPacket.getType() == 'unavailable') {
            oSDK.changeStatus(account, 'unavailable');
            oSDK.trigger('core.contactUnavailable', oSDK.getContactByAccount(account));
          } else {
            if (!oJSJaCPacket.getType() && oJSJaCPacket.getShow() == 'chat') {
              if(oSDK.getContactByAccount(account).status == 'unavailable') {
                console.warn('SEND ABOUT ME');
                oSDK.changeStatus(account, 'available');
                oSDK.trigger('core.contactAvailable', oSDK.getContactByAccount(account));
                var presencec = new JSJaCPresence();
                //presence.setTo(account);
                presencec.setShow('chat');
                xmpp.con.send(presencec);
              }
            }
          }
        }
      }
    }
    return true;
  }

  function handlePresenceOut(oJSJaCPacket) {
  }

  function handlePacketIn(oJSJaCPacket) {
  }

  function handlePacketOut(oJSJaCPacket) {
  }

  function handleConnected() {
    if (xmpp.status.connection == 'connection' && xmpp.con.connected()) {
      xmpp.status.connection = 'connected';
      oSDK.trigger('core.connected', [].slice.call(arguments, 0));
      return true;
    }
    return false;
  }

  function handleDisconnected() {
    if (!xmpp.con.connected()) {
      xmpp.status.connection = 'disconnected';
      oDSK.trigger('core.xmppDisconnected', {});
      return true;
    }
    return false;
  }

  function handleStatusChanged(status) {

  }

  function handleError(e) {

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
   * XMPP initiation
   *
   * @param data {Object}
   * @data.debug info
   * [dbg=false|true|number] disabled|enabled JSJaC inner console
   * if dbg is number: 0 - warn, 1 - error, 2 - info, 4 - debug, default - log, 3|true - all
   */
  xmpp.init = function(data) {
    // Start initiation
    xmpp.status.connection = 'initiation';
    // Current client
    storage.client = new Client(data.login + '@' + data.domain);
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
    // Handlers
    xmpp.con.registerHandler('iq', handleIQ);
    xmpp.con.registerHandler('message', handleMessage);
    xmpp.con.registerHandler('presence_in', handlePresenceIn);
    xmpp.con.registerHandler('presence_out', handlePresenceOut);
    xmpp.con.registerHandler('packet_in', handlePacketIn);
    xmpp.con.registerHandler('packet_out', handlePacketOut);
    xmpp.con.registerHandler('onConnect', handleConnected);
    xmpp.con.registerHandler('onDisconnect', handleDisconnected);
    xmpp.con.registerHandler('onError', handleError);
    xmpp.con.registerHandler('onStatusChanged', handleStatusChanged);
    xmpp.con.registerIQGet('query', NS_VERSION, handleIqVersion);
    xmpp.con.registerIQGet('query', NS_TIME, handleIqTime);
    // Connection
    xmpp.status.connection = 'connection';
    xmpp.con.connect({
      domain: data.domain,
      resource: data.resource,
      username: data.login,
      password: data.password,
      pass: data.password
    });
    xmpp.temp = setTimeout(function() {
      oSDK.trigger('core.connectionFailed', {});
    }, 5000);
  };

  // Attaching internal events to internal oSDK events
  oSDK.on('auth.gotTempCreds', function (e) {
    xmpp.status.connection = 'got temp creds';
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
   * oSDK XMPP methods
   */

  /**
   * Work with client
   * @getClient - return current connected client
   */
  oSDK.getClient = function() {
    if (xmpp.con.connected()) {
      return storage.client;
    }
    return false;
  };

  /**
   * Subscribe to JabberID(s)
   * @param data may be {String} (JID) or {Array} (contacts list)
   */
  oSDK.subscribeTo = function(data) {
    if (xmpp.con.connected()) {
      if (data && oSDK.utils.isString(data)) {
        var presence = new JSJaCPresence();
        presence.setTo(data);
        presence.setShow('chat');
        xmpp.con.send(presence);
      } else {
        var i, len;
        if (!data) {
          len = storage.contacts.length;
          for (i = 0; i != len; i ++) {
            oSDK.subscribeTo(storage.contacts[i].account);
          }
        } else {
          len = data.length;
          for (i = 0; i != len; i ++) {
            oSDK.subscribeTo(data[i].account);
          }
        }
      }
      return true;
    }
    return false;
  };

  /**
   * Subscribe to all who save in contacts list
   */
  oSDK.subscribeToAll = function() {
    if (xmpp.con.connected()) {
      var i, len = storage.contacts.length;
      for (i = 0; i != len; i ++) {
        oSDK.subscribeTo(storage.contacts[i].account);
      }
      return true;
    }
    return false;
  };

  /**
   * Cinfirm subscribe
   */
  oSDK.confirmSubscribe = function(account) {
    var presence = new JSJaCPresence();
    presence.setTo(account);
    presence.setType('subscribed');
    xmpp.con.send(presence);
  };

  /**
   * Send presence about me to all
   * @param to {String} (JID) - if not exists, to send all
   */
  oSDK.sendPresence = function() {
    if (xmpp.con.connected()) {
      var presence = new JSJaCPresence();
      presence.setShow('chat');
      xmpp.con.send(presence);
      return true;
    }
    return false;
  };

  /**
   * Clear roster
   */
  oSDK.clearRoster = function(callback) {
    if (xmpp.con.connected()) {
      var roster = new JSJaCIQ();
      roster.setIQ(null, 'get', getRosterId());
      roster.setQuery(NS_ROSTER);
      xmpp.con.sendIQ(roster, {result_handler: function(aIq, arg) {
        var nodes = aIq.getQuery();
        var client = oSDK.getClient().account;
        var i, len = nodes.childNodes.length;
        storage.contacts = [];
        for (i = 0; i != len; i ++) {
          var jid = nodes.childNodes[i].getAttribute('jid');
          if (jid != client) {
            oSDK.removeContact(jid);
          }
        }
        storage.contacts = [];
        oSDK.getRoster(function() {
          if (callback && typeof callback == 'function') callback(storage.contacts);
        });
        return true;
      }});
    }
    return false;
  };

  /**
   * Work with roster (contacts list)
   * @getRoster - get roster from server and convert to inner contacts list, sort contacts list and save in inner storage
   * @getContacts - get contacts list from inner storage
   * @param callback {Function} - be call after get roster/contacts
   * @sortContactsList - sorting contacts list by logins (sort by ascii codes)
   * @param data {Array} - list of Client's class exemplars (if @param data is not set: deta = storage.contacts)
   */
  oSDK.getRoster = function(callback) {
    if (xmpp.con.connected()) {
      var roster = new JSJaCIQ();
      roster.setIQ(null, 'get', getRosterId());
      roster.setQuery(NS_ROSTER);
      xmpp.con.sendIQ(roster, {result_handler: function(aIq, arg) {
        var nodes = aIq.getQuery();
        var client = oSDK.getClient().account;
        var i, len = nodes.childNodes.length;
        storage.contacts = [];
        xmpp.subscribe = [];
        for (i = 0; i != len; i ++) {
          var jid = nodes.childNodes[i].getAttribute('jid');
          if (jid != client) {
            var ask = nodes.childNodes[i].getAttribute('ask');
            var sub = nodes.childNodes[i].getAttribute('subscription');
            if (!ask || ask != 'subscribe') {
              if (sub && sub == 'both') {
                storage.contacts.push(new Client(jid, 'General'));
              }
            }
            if (ask && ask == 'subscribe') {
              xmpp.subscribe.push(new Client(jid, 'General'));
            }
          }
        }
        console.log(nodes);
        console.log(xmpp.subscribe);
        storage.contacts = oSDK.sortContactsList();
        if (callback && typeof callback == 'function') callback(storage.contacts);
        return true;
      }});
    }
    return false;
  };

  oSDK.alreadySubscribeSend = function(login) {
    var i, len = xmpp.subscribe.length;
    for(i = 0; i != len; i ++) {
      if (login == xmpp.subscribe[i].login) return true;
    }
    return false;
  };

  oSDK.getContactsList = function(callback) {
    if (callback && typeof callback == 'function') callback(storage.contacts);
    return storage.contacts;
  };

  oSDK.sortContactsList = function(data) {
    if (!data) data = storage.contacts;
    return data.sort(function(a, b) {
      var len;
      if (a.login.length > b.login.length) {
        len = b.login.length;
      } else {
        len = a.login.length;
      }
      var cx;
      for (cx = 0; cx != len; cx ++) {
        var ca = a.login.charCodeAt(cx);
        var cb = b.login.charCodeAt(cx);
        if (ca != cb) return ca - cb;
      }
      if (a.login.length > b.login.length) {
        return -1;
      } else {
        return 1;
      }
    });
  };

  oSDK.sendAuthRequest = function(login, callback) {
    if (xmpp.con.connected()) {
      xmpp.iAsking = login;
      var presence = new JSJaCPresence();
      presence.setTo(login + '@' + oSDK.clientInfo.domain());
      presence.setType('subscribe');
      if (typeof callback != 'function') callback = function() {};
      xmpp.con.send(presence, callback);
      xmpp.subscribe.push(new Client(login + '@' + oSDK.clientInfo.domain(), 'General'));
    }
  };

  oSDK.addContact = function(login, callback) {
    xmpp.iAsking = true;
    var presence = new JSJaCPresence();
    presence.setTo(login + '@' + oSDK.clientInfo.domain());
    presence.setType('subscribe');
    xmpp.con.send(presence);
    /*
    var attribs = {jid: login + '@' + oSDK.clientInfo.domain(), name: 'SomeName SomeFamily'};
    console.warn(attribs);
    var iq = new JSJaCIQ();
    var itemNode = iq.buildNode('item', attribs);
    itemNode.appendChild(iq.buildNode('group', 'general'));
    iq.setType('set');
    iq.setQuery(NS_ROSTER).appendChild(itemNode);
    console.warn(iq);
    if (!callback) callback = function(){return true;};
    xmpp.con.send(iq, callback);
    */
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

  oSDK.loginExists = function(login) {
    var i, l = storage.contacts.length;
    for (i = 0; i != l; i ++) {
      if (storage.contacts[i].login == login) {
        return true;
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

  oSDK.changeStatus = function(to, status) {
    var i, len = storage.contacts.length;
    for (i = 0; i != len; i ++) {
      if (storage.contacts[i].account == to) {
        storage.contacts[i].status = status;
        break;
      }
    }
    return true;
  };

  oSDK.xmppTemp = function() {
    var presence;
    presence = new JSJaCPresence();
    presence.setTo('tester1@carbon.super');
    presence.setType('unsubscribed');
    xmpp.con.send(presence);
    presence = new JSJaCPresence();
    presence.setTo('tester1@carbon.super');
    presence.setType('unsubscribed');
    xmpp.con.send(presence);
    oSDK.removeContact('tester1@carbon.super');
    oSDK.removeContact('tester2@carbon.super');
    oSDK.clearRoster(function() {
      oSDK.on('core.newContactsList', {});
    });
  };

  oSDK.acceptAuthSubscribe = function(account) {
    xmpp.wait = account;
    var presence;
    presence = new JSJaCPresence();
    presence.setTo(account);
    presence.setType('subscribed');
    xmpp.con.send(presence);
    oSDK.removeNotice(account);
    setTimeout(function() {
      presence = new JSJaCPresence();
      presence.setTo(account);
      presence.setType('subscribe');
      xmpp.con.send(presence);
    }, 1000);
  };

  oSDK.rejectAuthSubscribe = function(account) {
    var presence;
    presence = new JSJaCPresence();
    presence.setTo(account);
    presence.setType('unsubscribed');
    xmpp.con.send(presence);
    oSDK.removeContact(account);
    oSDK.removeNotice(account);
    oSDK.getRoster(function() {
      oSDK.trigger('core.newContactsList', {});
    });
  };

  oSDK.getNotice = function() {
    return xmpp.notice;
  };

  oSDK.removeNotice = function(account) {
    var i, len = xmpp.notice.length, result = [];
    for (i = 0; i != len; i ++) {
      if (account != xmpp.notice[i].data) result.push(xmpp.notice[i]);
    }
    xmpp.notice = result;
    oSDK.trigger('core.xmppNewNotice', {
      type: 'xmpp.auth.request',
      data: account
    });
    return true;
  };

  oSDK.waitSubscription = function(account) {
    var i, len = xmpp.subscribe.length;
    for (i = 0; i != len; i ++) {
      if (xmpp.subscribe[i].account == account) return true;
    }
    return false;
  };

  oSDK.createClient = function(jid) {
    return new Client(jid, 'General');
  };

  oSDK.on('core.xmppNewNotice', function(data) {
    oSDK.trigger('xmppNewNotice', data);
  }, 'every');

  oSDK.on('core.newContactsList', function(data) {
    oSDK.trigger('newContactsList', data);
  }, 'every');

  oSDK.on('core.askToSubscribe', function(data) {
    oSDK.trigger('askToSubscribe', data);
  }, 'every');

  oSDK.on('core.requestToAddContact', function (data) {
    oSDK.trigger('requestToAddContact', data);
  }, 'every');

  oSDK.on('core.contactError', function (data) {
    oSDK.trigger('contactError', data);
  }, 'every');

  oSDK.on('core.contactAvailable', function (data) {
    oSDK.trigger('contactAvailable', data);
  }, 'every');

  oSDK.on('core.contactUnavailable', function (data) {
    oSDK.trigger('contactUnavailable', data);
  }, 'every');

  oSDK.on('core.textMessage', function (data) {
    // Here after core.error must be data object
    oSDK.trigger('textMessage', data);
  }, 'every');

  oSDK.on('core.disconnected', function (e) {
    xmpp.con.disconnect();
  });

  oSDK.on('core.xmppDisconnected', function (e) {
    oSDK.trigger('xmppDisconnected', {});
  });

})(oSDK, JSJaC);
