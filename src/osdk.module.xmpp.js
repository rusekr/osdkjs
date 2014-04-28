/*
 * oSDK XMPP module
 * with JSJaC library
 */

(function () {

  // Use strict mode

  "use strict";

  // Inner storage

  function Storage(params) {

    // Self

    var self = this;

    // Logged user
    this.client = oSDK.user(params.login + '@' + params.domain);
    // Contacts list (and links)
    this.contacts = [];
    this.linksToContactsByAccount = {};
    this.linksToContactsByLogin = {};
    // Requests list (and links)
    this.requests = [];
    this.linksToRequestsByAccount = {};
    this.linksToRequestsByLogin = {};
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

  // Inner XMPP module

  var xmpp;

  function XMPP(module) {

    window.jopa = module;

    // Self,  utils, JSJaC connection & inner storage

    var self = this, utils = module.utils, connection = null, storage = null;

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

    // Register config

    module.registerConfig(this.config());

    // Attachable events

    this.events = function() {
      return {
        'connected': ['xmpp.connected', 'core.connected'],
        'disconnected': ['xmpp.disconnected', 'core.disconnected'],
        'connectionFailed': ['xmpp.connectionFailed', 'core.connectionFailed']
      };
    };

    // Register events

    module.registerEvents(this.events());

    // Register methods

    this.registerMethods = module.registerMethods;

    // Inner commands

    this.commands = {
      iAmLogged: function(data) {
        if (storage.flags.iAmLoggedNow) {
          /* TODO */
        } else {
          xmpp.sendPresence({
            to: data.from,
            show: 'chat',
            data: utils.jsonEncode({
              command: 'thatICan',
              data: {
                iCan: {
                  chat: true,
                  audio: true,
                  video: true
                }
              }
            })
          });
          var contact = xmpp.getContactByAccount(data.from);
          contact.can.chat = data.iCan.chat;
          contact.can.audio = data.iCan.audio;
          contact.can.video = data.iCan.video;
          module.trigger('contactCapabilitiesChanged', {contact: contact});
        }
      },
      thatICan: function(data) {
        console.log(data);
      }
    };

    // XMPP handler's

    this.handlers = {
      fnIQ: function(iq) {
        module.info('XMPP HANDLER(iq)');
        if (connection.connected()) {
          connection.send(iq.errorReply(ERR_FEATURE_NOT_IMPLEMENTED));
          return true;
        }
        return false;
      },
      fnIQV: function(iq) {
        module.info('XMPP HANDLER(iq version)');
        if (connection.connected()) {
          connection.send(iq.reply([iq.buildNode('name', 'oSDK client'), iq.buildNode('version', JSJaC.Version), iq.buildNode('os', navigator.userAgent)]));
          return true;
        }
        return false;
      },
      fnIQT: function(iq) {
        module.info('XMPP HANDLER(iq time)');
        if (connection.connected()) {
          var now = new Date();
          connection.send(iq.reply([iq.buildNode('display', now.toLocaleString()), iq.buildNode('utc', now.jabberDate()), iq.buildNode('tz', now.toLocaleString().substring(now.toLocaleString().lastIndexOf(' ') + 1))]));
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
        var data = xmpp.getPresenceData(packet);
        if (!data) {
          /* TODO */
        } else {
          module.log('Presence data: ', data);
          if (data.from == data.to) {
            /* TODO */
          } else {
            console.log(data);
            if (data.status && utils.isObject(data.status) && data.status.command) {
              if (typeof xmpp.commands[data.status.command] == 'function') {
                data.status.data.command = data.status.command;
                data.status.data.from = data.from;
                data.status.data.to = data.to;
                xmpp.commands[data.status.command](data.status.data);
              }
            }
            var contact = xmpp.getContactByAccount(data.from);
            /*
            if (!data.type && contact.status == xmpp.OSDK_PRESENCE_TYPE_UNAVAILABLE) data.type = OSDK_PRESENCE_TYPE_AVAILABLE;
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
            */
          }
        }
      },
      fnOutcomingPresence: function(packet) {
        module.info('XMPP HANDLER(outcoming presence)');
        var data = xmpp.getPresenceData(packet);
        if (!data) {
          /* TODO */
        } else {
          module.log('Presence data: ', data);
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
        if (storage.flags.connect != 'connected') {
          storage.flags.connect = 'connected';
          storage.client.can.chat = true;
          if (module.config('settings.autoGetRosterOnConnect')) {
            xmpp.getRoster({
              onError: function() {
                /* TODO */
              },
              onSuccess: function(contacts, requests) {
                if (module.config('settings.autoSendInitPresenceOnConnect')) {
                  xmpp.iAmLogged({
                    onError: function() {
                      /* TODO */
                    },
                    onSuccess: function() {
                      module.trigger(['xmpp.connected', 'core.connected'], [].slice.call(arguments, 0));
                    }
                  });
                } else {
                  module.trigger(['xmpp.connected', 'core.connected'], [].slice.call(arguments, 0));
                }
              }
            });
          } else {
            if (module.config('settings.autoSendInitPresenceOnConnect')) {
              xmpp.iAmLogged({
                onError: function() {
                  /* TODO */
                },
                onSuccess: function() {
                  module.trigger(['xmpp.connected', 'core.connected'], [].slice.call(arguments, 0));
                }
              });
            } else {
              module.trigger(['xmpp.connected', 'core.connected'], [].slice.call(arguments, 0));
            }
          }
          return true;
        }
        return false;
      },
      fnOnDisconnect: function() {
        module.info('XMPP HANDLER(disconnect)');
        if (storage.flags.connect != 'disconnected') {
          storage.flags.connect = 'disconnected';
          storage.client.can.chat = false;
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
        storage.flags.status = status;
      }
    };

    // Private properties & methods (not for oSDK interface)

    // Generate server url

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

    // Generate roster id

    this.generateRosterId = function() {return 'roster_' + utils.md5(storage.client.account);};

    /*
     * Get contacts/requests by account
     * @generateLinkToItem - generate object key from account
     * @getContactByAccount - return contact by account from contacts list
     * @getRequestByAccount - return request by account from reqyests list
     */

    this.generateLinkToItem = function(account) {
      return '__' + utils.md5(account);
    };

    this.getContactByAccount = function(account) {
      var index = storage.linksToContactsByAccount[this.generateLinkToItem(account)];
      return (typeof storage.contacts[index] != 'undefined') ? storage.contacts[index] : false;
    };

    this.getRequestByAccount = function(account) {
      var index = storage.linksToRequestsByAccount[this.generateLinkToItem(account)];
      return (typeof storage.requests[index] != 'undefined') ? storage.requests[index] : false;
    };

    this.getContactByLogin = function(login) {
      var index = storage.linksToContactsByLogin[this.generateLinkToItem(login)];
      return (typeof storage.contacts[index] != 'undefined') ? storage.contacts[index] : false;
    };

    this.getRequestByLogin = function(login) {
      var index = storage.linksToRequestsByLogin[this.generateLinkToItem(login)];
      return (typeof storage.requests[index] != 'undefined') ? storage.requests[index] : false;
    };

    // Sort roster (by ascii codes)

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

    // Get presence data

    this.getPresenceData = function(packet) {
      var status = ((packet.getStatus()) ? packet.getStatus() : false);
      if (status !== false) {
        try {
          // {Object} in status
          status = JSON.parse(status);
        } catch(eIsNotObject) {
          // {String} in status
        }
      }
      try {
        return {
          from: (packet.getFromJID()._node + '@' + packet.getFromJID()._domain).toLowerCase(),
          to: (packet.getToJID()._node + '@' + packet.getToJID()._domain).toLowerCase(),
          type: packet.getType() || false,
          show: packet.getShow() || false,
          status: status,
          priority: packet.getPriority() || false
        };
      } catch (eConvertPresenceData) { return false; }
    };

    // Send presence

    this.sendPresence = function(params) {
      if (connection.connected()) {
        params = params || {};
        var presence = new JSJaCPresence();
        if (params.to) presence.setTo(params.to);
        if (params.type) presence.setType(params.type);
        if (params.show) presence.setShow(params.show);
        if (params.data) presence.setStatus(utils.jsonEncode(params.data));
        if (params.priority) presence.setPriority(params.priority);
        try {
          connection.send(presence);
          if (params.onSuccess) params.onSuccess();
        } catch(eSendPresence) {
          if (params.onError) params.onError();
        }
        return true;
      }
      return false;
    };

    this.iAmLogged = function(handlers) {
      if (connection.connected()) {
        storage.flags.iAmLoggedNow = true;
        var isHandlers = handlers || {};
        var handlerOnError = isHandlers.onError || function() {/* --- */};
        var handlerOnSuccess = isHandlers.onSuccess || function() {/* --- */};
        this.sendPresence({
          show: xmpp.OSDK_PRESENCE_SHOW_CHAT,
          data: {
            command: 'iAmLogged',
            data: {
              iCan: {
                chat: true,
                audio: true,
                video: true
              }
            }
          },
          onError: handlerOnError,
          onSuccess: handlerOnSuccess
        });
        return true;
      }
      return false;
    };

    this.thatICan = function(handlers) {
      if (connection.connected()) {
        var isHandlers = handlers || {};
        var handlerOnError = isHandlers.onError || function() {/* --- */};
        var handlerOnSuccess = isHandlers.onSuccess || function() {/* --- */};
      }
    };

    // Get roster

    this.getRoster = function(handlers) {
      if (connection.connected()) {
        var isHandlers = handlers || {};
        var handlerOnError = isHandlers.onError || function() {/* --- */};
        var handlerOnSuccess = isHandlers.onSuccess || function() {/* --- */};
        var iq = new JSJaCIQ();
        iq.setIQ(null, 'get', this.generateRosterId());
        iq.setQuery(NS_ROSTER);
        connection.sendIQ(iq, {
          error_handler: function(aiq) {
            /* TODO */
            handlerOnError();
          },
          result_handler: function(aiq, arg) {
            var nodes = aiq.getQuery();
            var client = storage.client;
            var i, len = nodes.childNodes.length;
            var logic = module.config('settings.subscriptionsMethod');
            storage.contacts = [];
            storage.requests = [];
            storage.linksToContactsByAccount = {};
            storage.linksToContactsByLogin = {};
            storage.linksToRequestsByAccount = {};
            storage.linksToRequestsByLogin = {};
            for (i = 0; i != len; i ++) {
              var jid = nodes.childNodes[i].getAttribute('jid');
              if (jid != client.account) {
                var user = oSDK.user(jid);
                var ask = nodes.childNodes[i].getAttribute('ask');
                var subscription = nodes.childNodes[i].getAttribute('subscription');
                // CLASSIC SUBSCRIPTION STYLE
                if (logic == xmpp.OSDK_XMPP_SUBSCRIPTIONS_METHOD_CLASSIC) {
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
                    storage.requests.push(user);
                    storage.linksToRequestsByAccount[xmpp.generateLinkToItem(user.account)] = storage.requests.length - 1;
                    storage.linksToRequestsByLogin[xmpp.generateLinkToItem(user.login)] = storage.requests.length - 1;
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
                      storage.contacts.push(user);
                      storage.linksToContactsByAccount[xmpp.generateLinkToItem(user.account)] = storage.contacts.length - 1;
                      storage.linksToContactsByLogin[xmpp.generateLinkToItem(user.login)] = storage.contacts.length - 1;
                    }
                  }
                }
                // BLIND SUBSCRIPTION STYLE
                /* TODO */
              }
            }
            if (storage.contacts.length) storage.contacts = xmpp.sortRosterResult(storage.contacts);
            if (storage.requests.length) storage.requests = xmpp.sortRosterResult(storage.requests);
            handlerOnSuccess(storage.contacts, storage.requests);
          }
        });
        return true;
      }
      return false;
    };

    this.getClient = function() { return storage.client; };
    this.getContacts = function() { return storage.contacts; };
    this.getRequests = function() { return storage.requests; };

    // Initiation

    module.on('auth.gotTempCreds', function() {
      // Check & define params
      var params = {
        debug: module.config('connection.debug'),
        timer: module.config('connection.timer'),
        server: ((utils.isString(module.config('connection.server'))) ? module.config('connection.server') : self.generateServerUrl(module.config('connection.server'))),
        login: arguments[0].data.username.split(':')[1].split('@')[0],
        password: arguments[0].data.password,
        domain: arguments[0].data.username.split(':')[1].split('@')[1],
        resource: module.config('connection.resource'),
        timestamp: arguments[0].data.username.split(':')[0]
      };
      // Create storage
      storage = new Storage(params);
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
      connection = new JSJaCWebSocketConnection({
        oDbg: debug,
        timerval: (params.timer) ? params.timer : 2000,
        httpbase: params.server
      });
      // Handler's
      connection.registerHandler('onConnect', xmpp.handlers.fnOnConnect);
      connection.registerHandler('onDisconnect', xmpp.handlers.fnOnDisconnect);
      connection.registerHandler('onError', xmpp.handlers.fnOnError);
      connection.registerHandler('onResume', xmpp.handlers.fnOnResume);
      connection.registerHandler('onStatusChanged', xmpp.handlers.fnOnStatusChanged);
      connection.registerHandler('iq', xmpp.handlers.fnIQ);
      connection.registerHandler('message_in', xmpp.handlers.fnIncomingMessage);
      connection.registerHandler('message_out', xmpp.handlers.fnOutcomingMessage);
      connection.registerHandler('presence_in', xmpp.handlers.fnIncomingPresence);
      connection.registerHandler('presence_out', xmpp.handlers.fnOutcomingPresence);
      connection.registerHandler('packet_in', xmpp.handlers.fnIncomingPacket);
      connection.registerHandler('packet_out', xmpp.handlers.fnOutcomingPacket);
      connection.registerIQGet('query', NS_VERSION, xmpp.handlers.fnIQV);
      connection.registerIQGet('query', NS_TIME, xmpp.handlers.fnIQV);
      // Connect and login
      connection.connect({
        domain: params.domain,
        resource: params.resource,
        username: params.login,
        password: params.password
      });
    });

  }

  if (oSDK && JSJaC) {

    // Inner exemplar of inner XMPP module

    xmpp = new XMPP(new oSDK.Module('xmpp'));

    // Register public methods

    xmpp.registerMethods({

      setState: function(state, handlers) {

      },

      sendDataTo: function(to, data, handlers) {

      },

      sendDataAll: function(data, handlers) {

      },

      getRoster: xmpp.getRoster,

      getClient: xmpp.getClient,
      getContacts: xmpp.getContacts,
      getRequests: xmpp.getRequests

    });

  }

})();