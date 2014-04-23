/*
 * oSDK XMPP module
 * with JSJaC inside
 */
(function (oSDK, JSJaC) {

  /**
   * Strict mode on
   */

  "use strict";

  /**
   * Constants
   */

  var OSDK_SUBSCRIPTION_NONE = 'none';
  var OSDK_SUBSCRIPTION_FROM = 'from';
  var OSDK_SUBSCRIPTION_TO = 'to';
  var OSDK_SUBSCRIPTION_BOTH = 'both';

  var OSDK_PRESENCE_TYPE_AVAILABLE = 'available';
  var OSDK_PRESENCE_TYPE_UNAVAILABLE = 'unavailable';
  var OSDK_PRESENCE_TYPE_SUBSCRIBE = 'subscribe';
  var OSDK_PRESENCE_TYPE_SUBSCRIBED = 'subscribed';
  var OSDK_PRESENCE_TYPE_UNSUBSCRIBE = 'unsubscribe';
  var OSDK_PRESENCE_TYPE_UNSUBSCRIBED = 'unsubscribed';
  var OSDK_PRESENCE_TYPE_PROBE = 'probe';
  var OSDK_PRESENCE_TYPE_ERROR = 'error';

  var OSDK_PRESENCE_SHOW_CHAT = 'chat';
  var OSDK_PRESENCE_SHOW_AWAY = 'away';
  var OSDK_PRESENCE_SHOW_DND = 'dnd';
  var OSDK_PRESENCE_SHOW_XA = 'xa';

  var OSDK_ROSTER_ASK_SUBSCRIBE = 'subscribe';
  var OSDK_ROSTER_ASK_UNSUBSCRIBE = 'unsubscribe';

  var OSDK_SUBSCRIPTIONS_METHOD_CLASSIC = 'classic';
  var OSDK_SUBSCRIPTIONS_METHOD_BLIND = 'blind';

  /**
   * JSJaC exemplar
   */

  var xmpp = null;

  /**
   * Inner storage
   */

  var storage = {
    // Logged user
    client: null,
    // Contacts list (and links)
    contacts: [],
    linksToContacts: {},
    // Requests list (and links)
    requests: [],
    linksToRequests: {},
    // State flag's
    flags: {
      // I am logged now
      iAmLoggedNow: false,
      // Status changed to
      status: false,
      // Connection status
      connect: false
    }
  };

  /**
   * Helper - generate server url
   */

  function generateServerUrl(param) {
    var result = '';
    if (!param.protocol) {
      result = location.protocol + '://';
    } else {
      result = param.protocol + '://';
    }
    if (!param.domain) {
      result += location.domain;
    } else {
      result += param.domain;
    }
    if (param.port) result += ':' + param.port;
    if (param.url) result += '/' + param.url;
    result += '/';
    return result;
  }

  /**
   * Helper - generate roster id
   */

  function generateRosterId() {return 'roster_' + oSDK.utils.md5(storage.client.account);}

  /**
   * Get contacts/requests by account
   * @generateLinkToItem - helper
   * @getContactByAccount - return contact by account from contacts list
   * @getRequestByAccount - return request by account from reqyests list
   */

  function generateLinkToItem(account) {
    return '__' + oSDK.utils.md5(account);
  }

  function getContactByAccount(account) {
    var index = storage.linksToContacts[generateLinkToItem(account)];
    return (typeof storage.contacts[index] != 'undefined') ? storage.contacts[index] : false;
  }

  function getRequestByAccount(account) {
    var index = storage.linksToRequests[generateLinkToItem(account)];
    return (typeof storage.requests[index] != 'undefined') ? storage.requests[index] : false;
  }

  /**
   * Inner commands
   */

  var commands = {
    iAmLogged: function(data) {
      if (storage.flags.iAmLoggedNow) {
        storage.flags.iAmLoggedNow = false;
      } else {
        oSDK.info('COMMAND I AM LOGGED: ', data);
        oSDK.sendPresence({to: data.account, show: 'chat', status: oSDK.utils.jsonEncode({cmd: 'thatICan', chat: true, audio: true, video: true})});
        var contact = getContactByAccount(data.account);
        contact.can.chat = data.chat;
        contact.can.audio = data.audio;
        contact.can.video = data.video;
        oSDK.trigger('contactCapabilitiesChanged', {contact: contact});
      }
    },
    thatICan: function(data) {
      oSDK.info('COMMAND THAT I CAN: ', data);
      var contact = getContactByAccount(data.account);
      contact.can.chat = data.chat;
      contact.can.audio = data.audio;
      contact.can.video = data.video;
      oSDK.trigger('contactCapabilitiesChanged', {contact: contact});
    }
  };

  /**
   * Handler's to XMPP connection
   */

  var handlers = {
    fnIQ: function(iq) {
      oSDK.info('XMPP HANDLER(iq)');
      xmpp.send(iq.errorReply(ERR_FEATURE_NOT_IMPLEMENTED));
      return true;
    },
    fnIQV: function(iq) {
      oSDK.info('XMPP HANDLER(iq version)');
      xmpp.send(iq.reply([iq.buildNode('name', 'oSDK client'), iq.buildNode('version', JSJaC.Version), iq.buildNode('os', navigator.userAgent)]));
      return true;
    },
    fnIQT: function(iq) {
      oSDK.info('XMPP HANDLER(iq time)');
      var now = new Date();
      xmpp.send(iq.reply([iq.buildNode('display', now.toLocaleString()), iq.buildNode('utc', now.jabberDate()), iq.buildNode('tz', now.toLocaleString().substring(now.toLocaleString().lastIndexOf(' ') + 1))]));
      return true;
    },
    fnIncomingMessage: function(packet) {
      oSDK.info('XMPP HANDLER(incoming message)');

    },
    fnOutcomingMessage: function(packet) {
      oSDK.info('XMPP HANDLER(outcoming message)');

    },
    fnIncomingPresence: function(packet) {
      oSDK.info('XMPP HANDLER(incoming presence)');
      var data = oSDK.getPresenceData(packet);
      if (!data) {
        /* TODO */
      } else {
        if (data.from) oSDK.log('FROM: ' + data.from);
        if (data.to) oSDK.log('TO: ' + data.to);
        if (data.type) oSDK.log('TYPE: ' + data.type);
        if (data.show) oSDK.log('SHOW: ' + data.show);
        if (data.status) oSDK.log('STATUS: ', data.status.account);
        if (data.priority) oSDK.log('PRIORITY: ' + data.priority);
        if (data.from == data.to) {
          /* TODO */
        } else {
          if (data.status && data.status.cmd) {
            if (typeof commands[data.status.cmd] == 'function') {
              data.status.account = data.from;
              commands[data.status.cmd](data.status);
            }
          }
          var contact = getContactByAccount(data.from);
          if (!data.type && contact.status == OSDK_PRESENCE_TYPE_UNAVAILABLE) data.type = OSDK_PRESENCE_TYPE_AVAILABLE;
          if (data.type == OSDK_PRESENCE_TYPE_UNAVAILABLE) {
            contact.status = OSDK_PRESENCE_TYPE_UNAVAILABLE;
            oSDK.trigger('contactStatusChanged', {contact: contact});
          } else {
            if (data.type == OSDK_PRESENCE_TYPE_AVAILABLE || (data.show && data.show == OSDK_PRESENCE_SHOW_CHAT)) {
              if (contact.status != OSDK_PRESENCE_TYPE_AVAILABLE) {
                contact.status = OSDK_PRESENCE_TYPE_AVAILABLE;
                oSDK.trigger('contactStatusChanged', {contact: contact});
              }
            } else {
              if (data.show) {
                switch(data.show) {
                  case OSDK_PRESENCE_SHOW_AWAY :
                    contact.status = OSDK_PRESENCE_SHOW_AWAY;
                    break;
                  case OSDK_PRESENCE_SHOW_DND :
                    contact.status = OSDK_PRESENCE_SHOW_DND;
                    break;
                  case OSDK_PRESENCE_SHOW_XA :
                    contact.status = OSDK_PRESENCE_SHOW_XA;
                    break;
                  default :
                    break;
                }
                oSDK.trigger('contactStatusChanged', {contact: contact});
              }
            }
          }
        }
      }
    },
    fnOutcomingPresence: function(packet) {
      oSDK.info('XMPP HANDLER(outcoming presence)');
      var data = oSDK.getPresenceData(packet);
      if (!data) {
        /* TODO */
      } else {
        if (data.from) oSDK.log('FROM: ' + data.from);
        if (data.to) oSDK.log('TO: ' + data.to);
        if (data.type) oSDK.log('TYPE: ' + data.type);
        if (data.show) oSDK.log('SHOW: ' + data.show);
        if (data.status) oSDK.log('STATUS: ' + data.status);
        if (data.priority) oSDK.log('PRIORITY: ' + data.priority);
        if (data.from == data.to) {
          /* TODO */
        } else {
          /* TODO */
        }
      }
    },
    fnIncomingPacket: function(packet) {
      oSDK.info('XMPP HANDLER(incoming packet)');

    },
    fnOutcomingPacket: function(packet) {
      oSDK.info('XMPP HANDLER(outcoming packet)');

    },
    fnOnConnect: function() {
      oSDK.info('XMPP HANDLER(connect)');
      if (storage.flags.connect != 'connected') {
        storage.flags.connect = 'connected';
        storage.client.can.chat = true;
        oSDK.trigger(['xmpp.connected', 'core.connected'], [].slice.call(arguments, 0));
        return true;
      }
      return false;
    },
    fnOnDisconnect: function() {
      oSDK.info('XMPP HANDLER(disconnect)');
      if (storage.flags.connect != 'disconnected') {
        storage.flags.connect = 'disconnected';
        storage.client.can.chat = false;
        oSDK.trigger(['xmpp.disconnected', 'core.disconnected'], [].slice.call(arguments, 0));
        return true;
      }
      return false;
    },
    fnOnError: function(error) {
      oSDK.info('XMPP HANDLER(error)');
      oSDK.trigger('core.connectionFailed', [].slice.call(arguments, 0));
      /* TODO */
    },
    fnOnResume: function() {
      oSDK.info('XMPP HANDLER(resume)');
      /* TODO */
    },
    fnOnStatusChanged: function(status) {
      oSDK.info('XMPP HANDLER(status changed)');
      storage.flags.status = status;
    }
  };

  /**
   * Init fn
   */

  function init(params) {
    // Create client
    storage.client = oSDK.user(params.login + '@' + params.domain);
    // JSJaC logger config
    var debug = false;
    if (params.debug || params.debug === 0) {
      if (oSDK.utils.isBoolean(params.debug)) {
        debug = new JSJaCConsoleLogger();
      } else {
        if (oSDK.utils.isNumber(params.debug)) debug = new JSJaCConsoleLogger(params.debug);
      }
    }
    // XMPP connection
    xmpp = new JSJaCWebSocketConnection({
      oDbg: debug,
      timerval: (params.timer) ? params.timer : 2000,
      httpbase: params.server
    });
    // Handler's
    xmpp.registerHandler('onConnect', handlers.fnOnConnect);
    xmpp.registerHandler('onDisconnect', handlers.fnOnDisconnect);
    xmpp.registerHandler('onError', handlers.fnOnError);
    xmpp.registerHandler('onResume', handlers.fnOnResume);
    xmpp.registerHandler('onStatusChanged', handlers.fnOnStatusChanged);
    xmpp.registerHandler('iq', handlers.fnIQ);
    xmpp.registerHandler('message_in', handlers.fnIncomingMessage);
    xmpp.registerHandler('message_out', handlers.fnOutcomingMessage);
    xmpp.registerHandler('presence_in', handlers.fnIncomingPresence);
    xmpp.registerHandler('presence_out', handlers.fnOutcomingPresence);
    xmpp.registerHandler('packet_in', handlers.fnIncomingPacket);
    xmpp.registerHandler('packet_out', handlers.fnOutcomingPacket);
    xmpp.registerIQGet('query', NS_VERSION, handlers.fnIQV);
    xmpp.registerIQGet('query', NS_TIME, handlers.fnIQV);
    // Connect and login
    xmpp.connect({
      domain: params.domain,
      resource: params.resource,
      username: params.login,
      password: params.password
    });
  }

  /**
   * Data to registering module in oSDK
   */

  var moduleName = 'xmpp';
  var attachableNamespaces = { 'xmpp': true };
  var attachableMethods = {  };

  var attachableEvents = {
    'onConnect': ['xmpp.connected', 'core.connected'],
    'onDisconnect': ['xmpp.disconnected', 'core.disconnected'],
    'onResume': 'xmpp.events.resume',
    'onStatusChanged': 'xmpp.events.statusChanged',
    'onError': 'xmpp.events.error'
  };

  /**
   * Registering module in oSDK
   */

  oSDK.utils.attach(moduleName, {
    namespaces: attachableNamespaces,
    methods: attachableMethods,
    events: attachableEvents
  });

  /**
   * Attaching internal events to internal oSDK events
   */

  oSDK.on('auth.gotTempCreds', function() {
    init({
      debug: oSDK.config.xmpp.connection.debug,
      timer: oSDK.config.xmpp.connection.timer,
      server: ((oSDK.utils.isString(oSDK.config.xmpp.connection.server)) ? oSDK.config.xmpp.connection.server : generateServerUrl(oSDK.config.xmpp.connection.server)),
      login: arguments[0].data.username.split(':')[1].split('@')[0],
      password: arguments[0].data.password,
      domain: arguments[0].data.username.split(':')[1].split('@')[1],
      resource: oSDK.config.xmpp.connection.resource,
      timestamp: arguments[0].data.username.split(':')[0]
    });
  });

  /**
   * oSDK interface to work with XMPP & JSJaC
   */

  /**
   * XMPP Roster & contacts
   * @getRoster - get roster from XMPP server and convert him to contacts list and requests list,handling callbacks
   * @getContacts - return contacts list
   * @getRequests - return requests list
   */

  function sortRosterResult(data) {
    return data.sort(function(a, b) {
      var i, len;
      if (a.login.length > b.login.length) {
        len = b.login.length;
      } else {
        len = a.login.length;
      }
      for (i = 0; i != len; i ++) {
        var ca = a.login.charCodeAt(i);
        var cb = b.login.charCodeAt(i);
        if (ca != cb) return ca - cb;
      }
      if (a.login.length > b.login.length) {
        return -1;
      } else {
        return 1;
      }
    });
  }

  oSDK.getRoster = function(handlers) {
    if (xmpp.connected()) {
      var isHandlers = handlers || {};
      var handlerOnError = isHandlers.onError || function() {/* --- */};
      var handlerOnSuccess = isHandlers.onSuccess || function() {/* --- */};
      var iq = new JSJaCIQ();
      iq.setIQ(null, 'get', generateRosterId());
      iq.setQuery(NS_ROSTER);
      xmpp.sendIQ(iq, {
        error_handler: function(aiq) {
          /* TODO */
          handlerOnError();
        },
        result_handler: function(aiq, arg) {
          var nodes = aiq.getQuery();
          var client = storage.client;
          var i, len = nodes.childNodes.length;
          storage.contacts = [];
          storage.requests = [];
          storage.linksToContacts = {};
          storage.linksToRequests = {};
          for (i = 0; i != len; i ++) {
            var jid = nodes.childNodes[i].getAttribute('jid');
            if (jid != client.account) {
              var user = oSDK.user(jid);
              var ask = nodes.childNodes[i].getAttribute('ask');
              var subscription = nodes.childNodes[i].getAttribute('subscription');
              if (ask) {
                switch(ask) {
                  case OSDK_ROSTER_ASK_SUBSCRIBE :
                    user.ask = OSDK_ROSTER_ASK_SUBSCRIBE;
                    break;
                  case OSDK_ROSTER_ASK_UNSUBSCRIBE :
                    user.ask = OSDK_ROSTER_ASK_UNSUBSCRIBE;
                    break;
                  default :
                    /* TODO */
                    break;
                }
                storage.requests.push(user);
                storage.linksToRequests[generateLinkToItem(user.account)] = storage.requests.length - 1;
              } else {
                if (subscription && subscription != OSDK_SUBSCRIPTION_NONE) {
                  switch (subscription) {
                    case OSDK_SUBSCRIPTION_NONE :
                      user.subscription = OSDK_SUBSCRIPTION_NONE;
                      break;
                    case OSDK_SUBSCRIPTION_FROM :
                      user.subscription = OSDK_SUBSCRIPTION_FROM;
                      break;
                    case OSDK_SUBSCRIPTION_TO :
                      user.subscription = OSDK_SUBSCRIPTION_TO;
                      break;
                    case OSDK_SUBSCRIPTION_BOTH :
                      user.subscription = OSDK_SUBSCRIPTION_BOTH;
                      break;
                    default :
                      /* TODO */
                      break;
                  }
                  storage.contacts.push(user);
                  storage.linksToContacts[generateLinkToItem(user.account)] = storage.contacts.length - 1;
                }
              }
            }
          }
          if (storage.contacts.length) storage.contacts = sortRosterResult(storage.contacts);
          if (storage.requests.length) storage.requests = sortRosterResult(storage.requests);
          handlerOnSuccess(storage.contacts, storage.requests);
        }
      });
    }
    return false;
  };

  oSDK.getContacts = function() {
    return storage.contacts;
  };

  oSDK.getRequests = function() {
    return storage.requests;
  };

  /**
   * Work with logged client
   */

  oSDK.getClient = function() {
    return storage.client;
  };

  /**
   * Work with XMPP presence system
   * @sendPresence
   * @getPresenceData
   */

  oSDK.iAmLogged = function(callback) {
    if (xmpp.connected()) {
      storage.flags.iAmLoggedNow = true;
      oSDK.sendPresence({show: 'chat', status: oSDK.utils.jsonEncode({cmd: 'iAmLogged', chat: true, audio: true, video: true}), callback: callback});
      return true;
    }
    return false;
  };

  oSDK.sendPresence = function(params) {
    if (xmpp.connected()) {
      params = params || {};
      var presence = new JSJaCPresence();
      if (params.to) presence.setTo(params.to);
      if (params.type) presence.setType(params.type);
      if (params.show) presence.setShow(params.show);
      if (params.status) presence.setStatus(params.status);
      if (params.priority) presence.setPriority(params.priority);
      // if (typeof params.callback != 'function') params.callback = function() {/* --- */};
      xmpp.send(presence/*, params.callback*/);
      if (params.callback) params.callback();
      return true;
    }
    return false;
  };

  oSDK.getPresenceData = function(packet) {
    try {
      return {
        from: (packet.getFromJID()._node + '@' + packet.getFromJID()._domain).toLowerCase(),
        to: (packet.getToJID()._node + '@' + packet.getToJID()._domain).toLowerCase(),
        type: packet.getType() || false,
        show: packet.getShow() || false,
        status: ((packet.getStatus()) ? oSDK.utils.jsonDecode(packet.getStatus()) : false),
        priority: packet.getPriority() || false
      };
    } catch (eConvertPresenceData) { return false; }
  };

})(oSDK, JSJaC);
