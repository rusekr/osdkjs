/*
 * oSDK XMPP module
 * with JSJaC library
 */

(function (oSDK) {

  // Use strict mode

  "use strict";

  // Inner XMPP module

  function XMPP(module) {

    // Self

    var self = this;

    // Utils

    var utils = module.utils;

    // Constants

    this.OSDK_XMPP_SUBSCRIPTIONS_METHOD_CLASSIC = 'classic';
    this.OSDK_XMPP_SUBSCRIPTIONS_METHOD_BLIND = 'blind';

    this.OSDK_SUBSCRIPTION_NONE = 'none';
    this.OSDK_SUBSCRIPTION_FROM = 'from';
    this.OSDK_SUBSCRIPTION_TO = 'to';
    this.OSDK_SUBSCRIPTION_BOTH = 'both';

    this.OSDK_PRESENCE_TYPE_AVAILABLE = 'available';
    this.OSDK_PRESENCE_TYPE_UNAVAILABLE = 'unavailable';
    this.OSDK_PRESENCE_TYPE_SUBSCRIBE = 'subscribe';
    this.OSDK_PRESENCE_TYPE_SUBSCRIBED = 'subscribed';
    this.OSDK_PRESENCE_TYPE_UNSUBSCRIBE = 'unsubscribe';
    this.OSDK_PRESENCE_TYPE_UNSUBSCRIBED = 'unsubscribed';
    this.OSDK_PRESENCE_TYPE_PROBE = 'probe';
    this.OSDK_PRESENCE_TYPE_ERROR = 'error';

    this.OSDK_PRESENCE_SHOW_CHAT = 'chat';
    this.OSDK_PRESENCE_SHOW_AWAY = 'away';
    this.OSDK_PRESENCE_SHOW_DND = 'dnd';
    this.OSDK_PRESENCE_SHOW_XA = 'xa';

    this.OSDK_ROSTER_ASK_SUBSCRIBE = 'subscribe';
    this.OSDK_ROSTER_ASK_UNSUBSCRIBE = 'unsubscribe';

    // Default config

    this.config = function() {
      return {
        // Settings
        settings: {
          subscriptionsMethod: self.OSDK_XMPP_SUBSCRIPTIONS_METHOD_CLASSIC,
          autoGetRosterOnConnect: true,
          autoSendInitPresenceOnConnect: true
        },
        // Connection
        connection: {
          // Inner JSJaC debuger
          debug: false,
          // Timer
          timer: 2000,
          // Resource name
          resource: 'oClient-' + utils.uuid().replace('-', ''),
          /*
          * Server params
          * Mey be {String} or {Object}
          */
          server: {
            protocol: 'wss',
            domain: 'osdp-teligent-dev-xmpp.virt.teligent.ru',
            port: 5280,
            url: 'http-bind'
          }
        }
      };
    };

    // Attachable events

    this.events = function() {
      return {
        'connected': ['xmpp.connected', 'core.connected'],
        'disconnected': ['xmpp.disconnected', 'core.disconnected'],
        'connectionFailed': ['xmpp.connectionFailed', 'core.connectionFailed']
      };
    };

    // Storage

    function Storage() {
      // Logged user
      this.client = null;
      // Contacts list (and links)
      this.contacts = [];
      this.linksToContacts = {};
      // Requests list (and links)
      this.requests = [];
      this.linksToRequests = {};
      // State flag's
      this.flags = {
        // I am logged now
        iAmLoggedNow: false,
        // Status changed to
        status: false,
        // Connection status
        connect: false
      };
    }

    this.storage = null;

    // Connection

    this.connection = null;

    // Handlers

    this.handlers = {
      fnIQ: function(iq) {
        module.info('XMPP HANDLER(iq)');
        if (self.connection.connected()) {
          self.connection.send(iq.errorReply(ERR_FEATURE_NOT_IMPLEMENTED));
          return true;
        }
        return false;
      },
      fnIQV: function(iq) {
        module.info('XMPP HANDLER(iq version)');
        if (self.connection.connected()) {
          self.connection.send(iq.reply([iq.buildNode('name', 'oSDK client'), iq.buildNode('version', JSJaC.Version), iq.buildNode('os', navigator.userAgent)]));
          return true;
        }
        return false;
      },
      fnIQT: function(iq) {
        module.info('XMPP HANDLER(iq time)');
        if (self.connection.connected()) {
          var now = new Date();
          self.connection.send(iq.reply([iq.buildNode('display', now.toLocaleString()), iq.buildNode('utc', now.jabberDate()), iq.buildNode('tz', now.toLocaleString().substring(now.toLocaleString().lastIndexOf(' ') + 1))]));
          return true;
        }
        return false;
      },
      fnIncomingMessage: function(packet) {
        module.info('XMPP HANDLER(incoming message)');

      },
      fnOutcomingMessage: function(packet) {
        module.info('XMPP HANDLER(outcoming message)');

      },
      fnIncomingPresence: function(packet) {
        module.info('XMPP HANDLER(incoming presence)');
        var data = getPresenceData(packet);
        if (!data) {
          /* TODO */
        } else {
          printPresenceDate(date);
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
        module.info('XMPP HANDLER(outcoming presence)');
        var data = getPresenceData(packet);
        if (!data) {
          /* TODO */
        } else {
          printPresenceDate(data);
          if (data.from == data.to) {
            /* TODO */
          } else {
            /* TODO */
          }
        }
      },
      fnIncomingPacket: function(packet) {
        module.info('XMPP HANDLER(incoming packet)');

      },
      fnOutcomingPacket: function(packet) {
        module.info('XMPP HANDLER(outcoming packet)');

      },
      fnOnConnect: function() {
        module.info('XMPP HANDLER(connect)');
        if (self.storage.flags.connect != 'connected') {
          self.storage.flags.connect = 'connected';
          self.storage.client.can.chat = true;
          if (module.config('settings.autoGetRosterOnConnect')) {
            self.getRoster({onSuccess: function() {
              if (module.config('settings.autoSendInitPresenceOnConnect')) {

              }
              module.trigger(['xmpp.connected', 'core.connected'], [].slice.call(arguments, 0));
            }});
          }
          if (module.config('settings.autoSendInitPresenceOnConnect') && !module.config('settings.autoGetRosterOnConnect')) {

          }
          if (!module.config('settings.autoGetRosterOnConnect') && !module.config('settings.autoSendInitPresenceOnConnect')) {
            module.trigger(['xmpp.connected', 'core.connected'], [].slice.call(arguments, 0));
          }
          return true;
        }
        return false;
      },
      fnOnDisconnect: function() {
        module.info('XMPP HANDLER(disconnect)');
        if (self.storage.flags.connect != 'disconnected') {
          self.storage.flags.connect = 'disconnected';
          self.storage.client.can.chat = false;
          module.trigger(['xmpp.disconnected', 'core.disconnected'], [].slice.call(arguments, 0));
          return true;
        }
        return false;
      },
      fnOnError: function(error) {
        module.info('XMPP HANDLER(error)');
        module.trigger(['xmpp.connectionFailed', 'core.connectionFailed'], [].slice.call(arguments, 0));
        /* TODO */
      },
      fnOnResume: function() {
        module.info('XMPP HANDLER(resume)');
        /* TODO */
      },
      fnOnStatusChanged: function(status) {
        module.info('XMPP HANDLER(status changed)');
        self.storage.flags.status = status;
      }
    };

    // Register config

    module.registerConfig(this.config());

    // Register events

    module.registerEvents(this.events());

    // Register methods

    this.registerMethods = module.registerMethods;

    // Private properties & methods

    // Helper - generate server url

    this.generateServerUrl = function(params) {
      var result = '';
      if (!params.protocol) {
        result = location.protocol + '://';
      } else {
        result = params.protocol + '://';
      }
      if (!params.domain) {
        result += location.domain;
      } else {
        result += params.domain;
      }
      if (params.port) result += ':' + params.port;
      if (params.url) result += '/' + params.url;
      result += '/';
      return result;
    };

    // Helper - generate roster id

    this.generateRosterId = function() {return 'roster_' + utils.md5(this.storage.client.account);};

    /*
     * Get contacts/requests by account
     * @generateLinkToItem - helper
     * @getContactByAccount - return contact by account from contacts list
     * @getRequestByAccount - return request by account from reqyests list
     */

    this.generateLinkToItem = function(account) {
      return '__' + utils.md5(account);
    };

    this.getContactByAccount = function(account) {
      var index = this.storage.linksToContacts[this.generateLinkToItem(account)];
      return (typeof this.storage.contacts[index] != 'undefined') ? this.storage.contacts[index] : false;
    };

    this.getRequestByAccount = function(account) {
      var index = this.storage.linksToRequests[this.generateLinkToItem(account)];
      return (typeof this.storage.requests[index] != 'undefined') ? this.storage.requests[index] : false;
    };

    // Helper - sort roster

    this.sortRosterResult = function(data) {
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
    };

    // Initiation

    this.initiation = function(params) {
      // Storage
      this.storage = new Storage();
      // Create client
      this.storage.client = oSDK.user(params.login + '@' + params.domain);
      // JSJaC logger config
      var debug = false;
      if (params.debug || params.debug === 0) {
        if (utils.isBoolean(params.debug)) {
          debug = new JSJaCConsoleLogger();
        } else {
          if (utils.isNumber(params.debug)) debug = new JSJaCConsoleLogger(params.debug);
        }
      }
      // XMPP connection
      this.connection = new JSJaCWebSocketConnection({
        oDbg: debug,
        timerval: (params.timer) ? params.timer : 2000,
        httpbase: params.server
      });
      // Handler's
      this.connection.registerHandler('onConnect', this.handlers.fnOnConnect);
      this.connection.registerHandler('onDisconnect', this.handlers.fnOnDisconnect);
      this.connection.registerHandler('onError', this.handlers.fnOnError);
      this.connection.registerHandler('onResume', this.handlers.fnOnResume);
      this.connection.registerHandler('onStatusChanged', this.handlers.fnOnStatusChanged);
      this.connection.registerHandler('iq', this.handlers.fnIQ);
      this.connection.registerHandler('message_in', this.handlers.fnIncomingMessage);
      this.connection.registerHandler('message_out', this.handlers.fnOutcomingMessage);
      this.connection.registerHandler('presence_in', this.handlers.fnIncomingPresence);
      this.connection.registerHandler('presence_out', this.handlers.fnOutcomingPresence);
      this.connection.registerHandler('packet_in', this.handlers.fnIncomingPacket);
      this.connection.registerHandler('packet_out', this.handlers.fnOutcomingPacket);
      this.connection.registerIQGet('query', NS_VERSION, this.handlers.fnIQV);
      this.connection.registerIQGet('query', NS_TIME, this.handlers.fnIQV);
      // Connect and login
      this.connection.connect({
        domain: params.domain,
        resource: params.resource,
        username: params.login,
        password: params.password
      });
    };

    // Start

    module.on('auth.gotTempCreds', function() {
      self.initiation({
        debug: module.config('connection.debug'),
        timer: module.config('connection.timer'),
        server: ((utils.isString(module.config('connection.server'))) ? module.config('connection.server') : self.generateServerUrl(module.config('connection.server'))),
        login: arguments[0].data.username.split(':')[1].split('@')[0],
        password: arguments[0].data.password,
        domain: arguments[0].data.username.split(':')[1].split('@')[1],
        resource: module.config('connection.resource'),
        timestamp: arguments[0].data.username.split(':')[0]
      });
    });

  }

  // Public properties & methods

  XMPP.prototype.sendDataTo = function(to, data) {

  };

  XMPP.prototype.sendDataToAll = function(data) {

  };

  XMPP.prototype.getRoster = function(handlers) {
    if (xmpp.connection.connected()) {
      var isHandlers = handlers || {};
      var handlerOnError = isHandlers.onError || function() {/* --- */};
      var handlerOnSuccess = isHandlers.onSuccess || function() {/* --- */};
      var iq = new JSJaCIQ();
      iq.setIQ(null, 'get', xmpp.generateRosterId());
      iq.setQuery(NS_ROSTER);
      xmpp.connection.sendIQ(iq, {
        error_handler: function(aiq) {
          /* TODO */
          handlerOnError();
        },
        result_handler: function(aiq, arg) {
          var nodes = aiq.getQuery();
          var client = xmpp.storage.client;
          var i, len = nodes.childNodes.length;
          xmpp.storage.contacts = [];
          xmpp.storage.requests = [];
          xmpp.storage.linksToContacts = {};
          xmpp.storage.linksToRequests = {};
          for (i = 0; i != len; i ++) {
            var jid = nodes.childNodes[i].getAttribute('jid');
            if (jid != client.account) {
              var user = oSDK.user(jid);
              var ask = nodes.childNodes[i].getAttribute('ask');
              var subscription = nodes.childNodes[i].getAttribute('subscription');
              if (ask) {
                switch(ask) {
                  case xmpp.OSDK_ROSTER_ASK_SUBSCRIBE :
                    user.ask = xmpp.OSDK_ROSTER_ASK_SUBSCRIBE;
                    break;
                  case xmpp.OSDK_ROSTER_ASK_UNSUBSCRIBE :
                    user.ask = xmpp.OSDK_ROSTER_ASK_UNSUBSCRIBE;
                    break;
                  default :
                    /* TODO */
                    break;
                }
                xmpp.storage.requests.push(user);
                xmpp.storage.linksToRequests[xmpp.generateLinkToItem(user.account)] = xmpp.storage.requests.length - 1;
              } else {
                if (subscription && subscription != xmpp.OSDK_SUBSCRIPTION_NONE) {
                  switch (subscription) {
                    case xmpp.OSDK_SUBSCRIPTION_NONE :
                      user.subscription = xmpp.OSDK_SUBSCRIPTION_NONE;
                      break;
                    case xmpp.OSDK_SUBSCRIPTION_FROM :
                      user.subscription = xmpp.OSDK_SUBSCRIPTION_FROM;
                      break;
                    case xmpp.OSDK_SUBSCRIPTION_TO :
                      user.subscription = xmpp.OSDK_SUBSCRIPTION_TO;
                      break;
                    case xmpp.OSDK_SUBSCRIPTION_BOTH :
                      user.subscription = xmpp.OSDK_SUBSCRIPTION_BOTH;
                      break;
                    default :
                      /* TODO */
                      break;
                  }
                  xmpp.storage.contacts.push(user);
                  xmpp.storage.linksToContacts[xmpp.generateLinkToItem(user.account)] = xmpp.storage.contacts.length - 1;
                }
              }
            }
          }
          if (xmpp.storage.contacts.length) xmpp.storage.contacts = xmpp.sortRosterResult(xmpp.storage.contacts);
          if (xmpp.storage.requests.length) xmpp.storage.requests = xmpp.sortRosterResult(xmpp.storage.requests);
          handlerOnSuccess(xmpp.storage.contacts, xmpp.storage.requests);
        }
      });
    }
    return false;
  };

  XMPP.prototype.getClient = function() {
    return xmpp.storage.client;
  };

  XMPP.prototype.getContacts = function() {
    return xmpp.storage.contacts;
  };

  XMPP.prototype.getRequests = function() {
    return xmpp.storage.requests;
  };

  // oSDK XMPP Module

  var xmpp = new XMPP(new oSDK.Module('xmpp'));

  xmpp.registerMethods({

    sendDataTo: xmpp.sendDataTo,
    sendDataToAll: xmpp.sendDataToAll,

    getRoster: xmpp.getRoster,

    getClient: xmpp.getClient,
    getContacts: xmpp.getContacts,
    getRequests: xmpp.getRequests

  });

})(oSDK);