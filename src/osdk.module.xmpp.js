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
    this.client = oSDK.user.create(params.login + '@' + params.domain);
    this.client.status = 'ready';
    delete this.client.history;
    // Roster
    this.roster = [];
    // Contacts list (and links)
    this.contacts = [];
    this.linksToContactsByAccount = {};
    this.linksToContactsByLogin = {};
    // Requests list (and links)
    this.acceptedRequests = [];
    this.linksToAcceptedRequestsByAccount = {};
    this.linksToAcceptedRequestsByLogin = {};
    this.sendedRequests = [];
    this.linksToSendedRequestsByAccount = {};
    this.linksToSendedRequestsByLogin = {};
    // Rejected requests
    this.rejectedRequests = [];
    this.linksToRejectedRequestsByAccount = {};
    this.linksToRejectedRequestsByLogin = {};
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
      return { xmpp: {
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
      } };
    };

    // Register config

    module.registerConfig(this.config());

    // Attachable events

    this.events = function() {
      return {
        // Inner
        // 'xmpp.connected': {self: true},
        'connected': {other: true, client: true},
        // 'xmpp.disconnected': {self: true},
        'disconnected': {other: true, client: true},
        // 'xmpp.connectionFailed': {self: true},
        'connectionFailed': {other: true, client: true, cancels: 'connected'},
        // Client
        'newContactsList': {client: true},
        'newSubscriptionRequest': {client: true},
        'contactIsAvailable': {client: true},
        'contactIsUnavailable': {client: true},
        'authRequestRejected': {client: true},
        'contactCapabilitiesChanged': {client: true},
        'contactStatusChanged': {client: true}
      };
    };

    // Register events

    module.registerEvents(this.events());

    // Debendensis

    module.registerDeps(['gotTempCreds', 'disconnecting']);

    // Register methods

    this.registerMethods = module.registerMethods;

    // Extend {Object} User

    oSDK.user.extend({
      // Properties
      group: 'General',
      subscription: this.OSDK_SUBSCRIPTION_NONE,
      ask: false,
      status: 'unavailable',
      picture: false
    });

    // Inner commands

    this.commands = {
      iAmLogged: function(data) {
        xmpp.sendPresence({
          to: data.info.from,
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
        var contact = xmpp.getContactByAccount(data.info.from);
        contact.canChat = true;
        contact.canAudio = true;
        contact.canVideo = true;
        xmpp.thatICan(data.info.from);
      },
      thatICan: function(data) {
        var contact = xmpp.getContactByAccount(data.info.from);
        contact.canChat = true;
        contact.canAudio = true;
        contact.canVideo = true;
        module.trigger('contactCapabilitiesChanged', {contact: contact});
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
            // If is set system type of presence
            if (data.type) {
              switch(data.type) {
                // AVAILABLE
                case xmpp.OSDK_PRESENCE_TYPE_AVAILABLE :
                  /* TODO */
                  break;
                // UNAVAILABLE
                case xmpp.OSDK_PRESENCE_TYPE_UNAVAILABLE :
                  // If is set in contacts list
                  var unavailable_contact = xmpp.getContactByAccount(data.from);
                  if (unavailable_contact) {
                    unavailable_contact.status = 'unavailable';
                    unavailable_contact.canChat = false;
                    unavailable_contact.canAudio = false;
                    unavailable_contact.canVideo = false;
                    module.trigger('contactIsUnavailable', {contact: unavailable_contact});
                    return true;
                  }
                  break;
                // SUBSCRIBE
                case xmpp.OSDK_PRESENCE_TYPE_SUBSCRIBE :
                  if (!xmpp.getContactByAccount(data.from)) {
                    if (false) {

                    }
                    if (!xmpp.getAcceptedRequestByAccount(data.from)) {
                      storage.acceptedRequests.push(oSDK.user.create(data.from));
                      storage.linksToAcceptedRequestsByAccount[xmpp.generateLinkToItem(data.from)] = storage.acceptedRequests.length - 1;
                      storage.linksToAcceptedRequestsByLogin[xmpp.generateLinkToItem(data.from.split('@')[0])] = storage.acceptedRequests.length - 1;
                    }
                    module.trigger('newSubscriptionRequest', {account: data.from});
                    return true;
                  } else {
                    if (xmpp.getContactByAccount(data.from) && xmpp.getContactByAccount(data.from).subscription == xmpp.OSDK_SUBSCRIPTION_TO) {
                      xmpp.sendPresence({
                        to: data.from,
                        type: xmpp.OSDK_PRESENCE_TYPE_SUBSCRIBED
                      });
                      xmpp.getRoster();
                      setTimeout(function() { xmpp.thatICan(data.from); }, 1500);
                    }
                  }
                  break;
                // SUBSCRIBED
                case xmpp.OSDK_PRESENCE_TYPE_SUBSCRIBED :
                  var contact_f_contacts = xmpp.getContactByAccount(data.from);
                  var contact_f_requests = xmpp.getSendedRequestByAccount(data.from);
                  if (!contact_f_contacts) {
                    if (contact_f_requests && contact_f_requests.ask && contact_f_requests.ask == xmpp.OSDK_ROSTER_ASK_SUBSCRIBE) {
                      var account = contact_f_requests.account;
                      xmpp.getRoster({
                        onError: function() {
                          /* TODO */
                        },
                        onSuccess: function() {
                          module.trigger('authRequestAccepted', {contact: xmpp.getContactByAccount(account)});
                        }
                      });
                    } else {
                      xmpp.getRoster();
                    }
                  }
                  break;
                // UNSUBSCRIBE
                case xmpp.OSDK_PRESENCE_TYPE_UNSUBSCRIBE :
                  var contact_r_contacts = xmpp.getContactByAccount(data.from);
                  if (contact_r_contacts) {
                    xmpp.sendPresence({
                      to: data.from,
                      type: xmpp.OSDK_PRESENCE_TYPE_UNSUBSCRIBED
                    });
                    xmpp.sendPresence({
                      to: data.from,
                      type: xmpp.OSDK_PRESENCE_TYPE_UNSUBSCRIBE
                    });
                    xmpp.getRoster({
                      onError: function() {
                        /* TODO */
                      },
                      onSuccess: function() {
                        /* TODO */
                      }
                    });
                  } else {
                    xmpp.sendPresence({
                      to: data.from,
                      type: xmpp.OSDK_PRESENCE_TYPE_UNSUBSCRIBED
                    });
                    xmpp.deleteContact(data.from);
                    xmpp.getRoster({
                      onError: function() {
                        /* TODO */
                      },
                      onSuccess: function() {
                        /* TODO */
                      }
                    });
                  }
                  break;
                // UNSUBSCRIBED
                case xmpp.OSDK_PRESENCE_TYPE_UNSUBSCRIBED :
                  var contact_from_contacts = xmpp.getContactByAccount(data.from);
                  var contact_from_requests = xmpp.getSendedRequestByAccount(data.from);
                  if (!contact_from_contacts) {
                    if (contact_from_requests && contact_from_requests.ask && contact_from_requests.ask == xmpp.OSDK_ROSTER_ASK_SUBSCRIBE) {
                      xmpp.deleteContact(data.from, {
                        onError: function() {
                          /* TODO */
                        },
                        onSuccess: function() {
                          xmpp.getRoster({
                            onError: function() {
                              /* TODO */
                            },
                            onSuccess: function() {
                              module.trigger('authRequestRejected', {contact: contact_from_requests});
                            }
                          });
                        }
                      });
                    }
                  } else {
                    var a = contact_from_contacts.account;
                    xmpp.deleteContact(a);
                    xmpp.getRoster({
                      onError: function() {
                        /* TODO */
                      },
                      onSuccess: function() {
                        module.trigger('contactRemoved', {contact: oSDK.user.create(a)});
                      }
                    });
                  }
                  break;
              }
            }
            if (data.show && xmpp.getContactByAccount(data.from)) {
              switch(data.show) {
                case xmpp.OSDK_PRESENCE_SHOW_CHAT :
                  xmpp.getContactByAccount(data.from).status = 'ready';
                  break;
                case xmpp.OSDK_PRESENCE_SHOW_AWAY :
                  xmpp.getContactByAccount(data.from).status = 'away';
                  break;
                case xmpp.OSDK_PRESENCE_SHOW_DND :
                  xmpp.getContactByAccount(data.from).status = 'dnd';
                  xmpp.getContactByAccount(data.from).canAudio = false;
                  xmpp.getContactByAccount(data.from).canVideo = false;
                  break;
                case xmpp.OSDK_PRESENCE_SHOW_XA :
                  xmpp.getContactByAccount(data.from).status = 'unavailable';
                  break;
                default :
                  break;
              }
              module.trigger('contactStatusChanged', {contact: xmpp.getContactByAccount(data.from)});
              return true;
            }
            if (data.status && utils.isObject(data.status) && data.status.command) {
              if (typeof xmpp.commands[data.status.command] == 'function') {
                var params = {
                  info: {
                    command: data.status.command,
                    from: data.from,
                    to: data.to
                  },
                  data: data.status.data
                };
                delete params.data.command;
                delete params.data.from;
                delete params.data.to;
                xmpp.commands[data.status.command](params);
                return true;
              }
            }
            // var contact = xmpp.getContactByAccount(data.from);
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
          storage.client.canChat = true;
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
                      module.trigger('connected', [].slice.call(arguments, 0));
                    }
                  });
                } else {
                  module.trigger('connected', [].slice.call(arguments, 0));
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
                  module.trigger('connected', [].slice.call(arguments, 0));
                }
              });
            } else {
              module.trigger('connected', [].slice.call(arguments, 0));
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
          module.trigger('disconnected', [].slice.call(arguments, 0));
          return true;
        }
        return false;
      },
      fnOnError: function(error) {
        module.info('XMPP HANDLER(error)');
        module.trigger('connectionFailed', [].slice.call(arguments, 0));
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

    this.generateLinkToItem = function(data) {
      return '__' + utils.md5(data);
    };

    this.getContactByAccount = function(account) {
      var index = storage.linksToContactsByAccount[xmpp.generateLinkToItem(account)];
      return (typeof storage.contacts[index] != 'undefined') ? storage.contacts[index] : false;
    };

    this.getContactByLogin = function(login) {
      var index = storage.linksToContactsByLogin[xmpp.generateLinkToItem(login)];
      return (typeof storage.contacts[index] != 'undefined') ? storage.contacts[index] : false;
    };

    this.getAcceptedRequestByAccount = function(account) {
      var index = storage.linksToAcceptedRequestsByAccount[xmpp.generateLinkToItem(account)];
      return (typeof storage.acceptedRequests[index] != 'undefined') ? storage.acceptedRequests[index] : false;
    };

    this.getAcceptedRequestByLogin = function(login) {
      var index = storage.linksToAcceptedRequestsByLogin[xmpp.generateLinkToItem(login)];
      return (typeof storage.acceptedRequests[index] != 'undefined') ? storage.acceptedRequests[index] : false;
    };

    this.getSendedRequestByAccount = function(account) {
      var index = storage.linksToSendedRequestsByAccount[xmpp.generateLinkToItem(account)];
      return (typeof storage.sendedRequests[index] != 'undefined') ? storage.sendedRequests[index] : false;
    };

    this.getSendedRequestByLogin = function(login) {
      var index = storage.linksToSendedRequestsByLogin[xmpp.generateLinkToItem(login)];
      return (typeof storage.sendedRequests[index] != 'undefined') ? storage.sendedRequests[index] : false;
    };

    this.getRejectedRequestByAccount = function(account) {
      var index = storage.linksToRejectedRequestsByAccount[xmpp.generateLinkToItem(account)];
      return (typeof storage.rejectedRequests[index] != 'undefined') ? storage.rejectedRequests[index] : false;
    };

    this.getRejectedRequestByLogin = function(login) {
      var index = storage.linksToRejectedRequestsByLogin[xmpp.generateLinkToItem(login)];
      return (typeof storage.rejectedRequests[index] != 'undefined') ? storage.rejectedRequests[index] : false;
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
          return true;
        } catch(eSendPresence) {
          if (params.onError) params.onError();
          return false;
        }
      }
    };

    this.sendPresenceToAll = function(params) {
      var contacts = this.getContacts(), i;
      var data = params || {};
      for (i = 0; i != contacts.length; i ++) {
        data.to = contacts[i].account;
        if (!this.sendPresence(data)) {
          return false;
        }
      }
      return true;
    };

    this.iAmLogged = function(handlers) {
      if (connection.connected()) {
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

    this.thatICan = function(to, handlers) {
      if (connection.connected()) {
        var isHandlers = handlers || {};
        var handlerOnError = isHandlers.onError || function() {/* --- */};
        var handlerOnSuccess = isHandlers.onSuccess || function() {/* --- */};
        this.sendPresence({
          to: to,
          show: xmpp.OSDK_PRESENCE_SHOW_CHAT,
          data: {
            command: 'thatICan',
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
            console.warn(nodes);
            var client = storage.client;
            var i, len = nodes.childNodes.length;
            var logic = module.config('settings.subscriptionsMethod');

            storage.roster = [];

            storage.contacts = [];
            storage.linksToContactsByAccount = {};
            storage.linksToContactsByLogin = {};

            /* Accept on start from presence
            storage.acceptedRequests = [];
            storage.linksToAcceptedRequestsByAccount = {};
            storage.linksToAcceptedRequestsByLogin = {};
            */

            storage.sendedRequests = [];
            storage.linksToSendedRequestsByAccount = {};
            storage.linksToSendedRequestsByLogin = {};

            for (i = 0; i != len; i ++) {
              var jid = nodes.childNodes[i].getAttribute('jid').toLowerCase();
              if (jid != client.account) {
                var user = oSDK.user.create(jid);
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
                  } else {
                    user.ask = false;
                  }
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
                  } else {
                    if (!ask && subscription && subscription == xmpp.OSDK_SUBSCRIPTION_NONE) {
                      /* TODO */
                      user.subscription = xmpp.OSDK_SUBSCRIPTION_NONE;
                    } else {
                      user.subscription = xmpp.OSDK_SUBSCRIPTION_NONE;
                    }
                  }
                  if (jid == 'ruivio1@teligent.ru') user.picture = '00.jpg';
                  if (jid == 'ruivio2@teligent.ru') user.picture = '01.jpg';
                  if (jid == 'rusekr1@teligent.ru') user.picture = '02.jpg';
                  if (jid == 'rusekr2@teligent.ru') user.picture = '03.jpg';
                  storage.roster.push(user);
                }
                // BLIND SUBSCRIPTION STYLE
                if (logic == xmpp.OSDK_XMPP_SUBSCRIPTIONS_METHOD_BLIND) {
                  /* TODO */
                }
              }
            }
            if (storage.roster.length) storage.roster = xmpp.sortRosterResult(storage.roster);
            for (i = 0; i != storage.roster.length; i ++) {
              // CLASSIC SUBSCRIPTION STYLE
              if (logic == xmpp.OSDK_XMPP_SUBSCRIPTIONS_METHOD_CLASSIC) {
                var u = storage.roster[i];
                if (u.subscription == xmpp.OSDK_SUBSCRIPTION_TO || u.subscription == xmpp.OSDK_SUBSCRIPTION_BOTH) {
                  storage.contacts[storage.contacts.length] = u;
                  storage.linksToContactsByAccount[xmpp.generateLinkToItem(u.account)] = storage.contacts.length - 1;
                  storage.linksToContactsByLogin[xmpp.generateLinkToItem(u.login)] = storage.contacts.length - 1;
                } else {
                  if (u.ask && u.ask == xmpp.OSDK_ROSTER_ASK_SUBSCRIBE) {
                    storage.sendedRequests[storage.sendedRequests.length] = u;
                    storage.linksToSendedRequestsByAccount[xmpp.generateLinkToItem(u.account)] = storage.sendedRequests.length - 1;
                    storage.linksToSendedRequestsByLogin[xmpp.generateLinkToItem(u.login)] = storage.sendedRequests.length - 1;
                  } else {
                    if (!u.ask && u.subscription == xmpp.OSDK_SUBSCRIPTION_NONE) {
                      storage.rejectedRequests[storage.rejectedRequests.length] = u;
                      storage.linksToRejectedRequestsByAccount[xmpp.generateLinkToItem(u.account)] = storage.rejectedRequests.length - 1;
                      storage.linksToRejectedRequestsByLogin[xmpp.generateLinkToItem(u.login)] = storage.rejectedRequests.length - 1;
                    }
                  }
                }
              }
            }
            console.warn(storage);
            module.trigger('newContactsList', {contacts: storage.contacts});
            handlerOnSuccess(storage.contacts, storage.requests);
          }
        });
        return true;
      }
      return false;
    };

    // Add & Remove (|| delete) Contact

    this.addContact = function(jid, cb) {
      var contact;
      var callbacks = cb || {};
      callbacks.onSuccess = callbacks.onSuccess || function() {};
      callbacks.onError = callbacks.onError || function() {};
      if (oSDK.utils.isEmpty(jid)) {
        callbacks.onError({
          type: 'account is empty',
          data: jid
        });
      } else {
        if (!oSDK.utils.isString(jid)) {
          callbacks.onError({
            type: 'bad account',
            data: jid
          });
        } else {
          if (!oSDK.utils.isValidLogin(jid) && !oSDK.utils.isValidAccount(jid)) {
            callbacks.onError({
              type: 'invalid account',
              data: jid
            });
          } else {
            if (!connection.connected()) {
              /* TODO */
            } else {
              if (!oSDK.utils.isValidAccount(jid)) jid = jid + '@' + oSDK.client.domain();
              if (this.getContactByAccount(jid)) {
                callbacks.onError({
                  type: 'contact already exists',
                  data: jid
                });
              } else {
                if (jid == storage.client.account) {
                  callbacks.onError({
                    type: 'it\'s me',
                    data: jid
                  });
                } else {
                  if (xmpp.getSendedRequestByAccount(jid)) {
                    callbacks.onSuccess();
                    return true;
                  }
                  if (xmpp.getAcceptedRequestByAccount(jid)) {

                    return true;
                  }
                  xmpp.sendPresence({
                    to: jid,
                    type: xmpp.OSDK_PRESENCE_TYPE_SUBSCRIBE
                  });
                  xmpp.getRoster({
                    onError: callbacks.onError,
                    onSuccess: callbacks.onSuccess
                  });
                }
              }
            }
          }
        }
      }
    };

    this.removeContact = function(jid, cb) {
      var contact;
      var callbacks = cb || {};
      callbacks.onSuccess = callbacks.onSuccess || function() {};
      callbacks.onError = callbacks.onError || function() {};
      if (!connection.connected()) {
        callbacks.onError();
      } else {
        if (module.utils.isObject(jid)) {
          if (jid.account) {
            contact = this.getContactByAccount(jid.account);
          } else {
            callbacks.onError();
            return true;
          }
        } else {
          contact = this.getContactByAccount(jid);
        }
        if (!contact) {
          callbacks.onError();
        } else {
          if (contact.subscription != xmpp.OSDK_SUBSCRIPTION_TO && contact.subscription != xmpp.OSDK_SUBSCRIPTION_BOTH) {
            callbacks.onError();
          } else {
            /*
            var iq = new JSJaCIQ();
            var itemNode = iq.buildNode('item', {
              jid: contact.account,
              subscription: 'remove'
            });
            iq.setType('set');
            iq.setQuery(NS_ROSTER).appendChild(itemNode);
            connection.send(iq, callbacks.onSuccess);
            */
            xmpp.sendPresence({
              to: contact.account,
              type: xmpp.OSDK_PRESENCE_TYPE_UNSUBSCRIBE
            });
            callbacks.onSuccess();
          }
        }
      }
      return true;
    };

    this.deleteContact = function(jid, cb) {
      var callbacks = cb || {};
      callbacks.onSuccess = callbacks.onSuccess || function() {};
      callbacks.onError = callbacks.onError || function() {};
      if (!connection.connected()) {
        callbacks.onError();
      } else {
        if (module.utils.isObject(jid)) {
          jid = jid.account;
        }
        var iq = new JSJaCIQ();
        var itemNode = iq.buildNode('item', {
          jid: jid,
          subscription: 'remove'
        });
        iq.setType('set');
        iq.setQuery(NS_ROSTER).appendChild(itemNode);
        connection.send(iq, callbacks.onSuccess);
      }
    };

    this.deleteRejectedRequests = function(cb) {
      var callbacks = cb || {};
      callbacks.onSuccess = callbacks.onSuccess || function() {};
      callbacks.onError = callbacks.onError || function() {};
      $.each(storage.rejectedRequests, function(i, v) {
        xmpp.deleteContact(v);
      });
      xmpp.getRoster({
        onError: function() {
          /* TODO */
        },
        onSuccess: function() {
          callbacks.onSuccess();
        }
      });
    };

    this.acceptRequest = function(jid, cb) {
      var callbacks = cb || {};
      callbacks.onSuccess = callbacks.onSuccess || function() {};
      callbacks.onError = callbacks.onError || function() {};
      var request = xmpp.getAcceptedRequestByAccount(jid);
      if (!request) {
        callbacks.onError();
      } else {
        xmpp.sendPresence({
          to: request.account,
          type: xmpp.OSDK_PRESENCE_TYPE_SUBSCRIBED
        });
        var index = storage.linksToAcceptedRequestsByAccount[xmpp.generateLinkToItem(request.account)] || storage.linksToAcceptedRequestsByLogin[xmpp.generateLinkToItem(request.login)];
        var temp = [], i;
        storage.linksToAcceptedRequestsByAccount = {};
        storage.linksToAcceptedRequestsByLogin = {};
        for (i = 0; i != storage.acceptedRequests.length; i ++) {
          if (storage.acceptedRequests[i].account != request.account) {
            temp.push(storage.acceptedRequests[i]);
            storage.linksToAcceptedRequestsByAccount[xmpp.generateLinkToItem(storage.acceptedRequests[i].account)] = temp.length - 1;
            storage.linksToAcceptedRequestsByLogin[xmpp.generateLinkToItem(storage.acceptedRequests[i].login)] = temp.length - 1;
          }
        }
        storage.acceptedRequests = temp;
        xmpp.getRoster({
          onError: function() {
            /* TODO */
          },
          onSuccess: function() {
            xmpp.sendPresence({
              to: jid,
              type: xmpp.OSDK_PRESENCE_TYPE_SUBSCRIBE
            });
            callbacks.onSuccess();
          }
        });
      }
    };

    this.rejectRequest = function(jid, cb) {
      var callbacks = cb || {};
      callbacks.onSuccess = callbacks.onSuccess || function() {};
      callbacks.onError = callbacks.onError || function() {};
      var request = xmpp.getAcceptedRequestByAccount(jid);
      if (!request) {
        callbacks.onError();
      } else {
        xmpp.sendPresence({
          to: request.account,
          type: xmpp.OSDK_PRESENCE_TYPE_UNSUBSCRIBED
        });
        var index = storage.linksToAcceptedRequestsByAccount[xmpp.generateLinkToItem(request.account)] || storage.linksToAcceptedRequestsByLogin[xmpp.generateLinkToItem(request.login)];
        var temp = [], i;
        storage.linksToAcceptedRequestsByAccount = {};
        storage.linksToAcceptedRequestsByLogin = {};
        for (i = 0; i != storage.acceptedRequests.length; i ++) {
          if (storage.acceptedRequests[i].account != request.account) {
            temp.push(storage.acceptedRequests[i]);
            storage.linksToAcceptedRequestsByAccount[xmpp.generateLinkToItem(storage.acceptedRequests[i].account)] = temp.length - 1;
            storage.linksToAcceptedRequestsByLogin[xmpp.generateLinkToItem(storage.acceptedRequests[i].login)] = temp.length - 1;
          }
        }
        storage.acceptedRequests = temp;
        callbacks.onSuccess();
      }
    };

    this.encodeStatus = function(status) {
      var result = {
        real: false,
        unreal: false
      };
      if (utils.isString(status)) {
        switch(status) {
          case 'chat' :
            result.real = 'chat';
            break;
          case 'available' :
            result.real = 'chat';
            break;
          case 'away' :
            result.real = 'away';
            break;
          case 'absence' :
            result.real = 'away';
            break;
          case 'dnd' :
            result.real = 'dnd';
            break;
          case 'do not disturb' :
            result.real = 'dnd';
            break;
          case 'xa' :
            result.real = 'xa';
            break;
          case 'x-available' :
            result.real = 'xa';
            break;
          default :
            result.unreal = status;
            break;
        }
      }
      return result;
    };

    this.decodeStatus = function(status) {
      var result = {
        real: false,
        unreal: false
      };
      if (utils.isString(status)) {
        switch(status) {
          case 'chat' :
            result.real = 'available';
            break;
          case 'away' :
            result.real = 'away';
            break;
          case 'dnd' :
            result.real = 'do not disturb';
            break;
          case 'xa' :
            result.real = 'x-available';
            break;
          default :
            result.unreal = status;
            break;
        }
      }
      return result;
    };

    // Set status & capabilities, system or not

    this.setStatus = function() {
      var onError = function() {/*---*/};
      var onSuccess = function() {/*---*/};
      var params = {}, argument;
      switch(arguments.length) {
        case 1 :
          argument = arguments[0];
          if (utils.isString(argument)) {
            params.status = xmpp.encodeStatus(argument);
          } else {
            if (utils.isObject(argument)) {
              if (typeof argument.status != 'undefined' && utils.isString(argument.status)) params.status = xmpp.encodeStatus(argument.status);
              if (typeof argument.instantMessaging != 'undefined' && utils.isBoolean(argument.instantMessaging)) params.instantMessaging = argument.instantMessaging;
              if (typeof argument.audioCall != 'undefined' && utils.isBoolean(argument.audioCall)) params.audioCall = argument.audioCall;
              if (typeof argument.videoCall != 'undefined' && utils.isBoolean(argument.videoCall)) params.videoCall = argument.videoCall;
              if (typeof argument.fileTransfer != 'undefined' && utils.isBoolean(argument.fileTransfer)) params.fileTransfer = argument.fileTransfer;
              if (typeof argument.messaging != 'undefined' && utils.isBoolean(argument.messaging)) params.instantMessaging = argument.messaging;
              if (typeof argument.audio != 'undefined' && utils.isBoolean(argument.audio)) params.audioCall = argument.audio;
              if (typeof argument.video != 'undefined' && utils.isBoolean(argument.video)) params.videoCall = argument.video;
              if (typeof argument.transfer != 'undefined' && utils.isBoolean(argument.transfer)) params.fileTransfer = argument.transfer;
              if (typeof argument.onError == 'function') onError = argument.onError;
              if (typeof argument.onSuccess == 'function') onSuccess = argument.onSuccess;
            }
          }
          break;
        case 2 :
          if (utils.isString(arguments[0])) {
            params.status = xmpp.encodeStatus(arguments[0]);
          }
          if (utils.isObject(arguments[1])) {
            argument = arguments[1];
            if (typeof argument.instantMessaging != 'undefined' && utils.isBoolean(argument.instantMessaging)) params.instantMessaging = argument.instantMessaging;
            if (typeof argument.audioCall != 'undefined' && utils.isBoolean(argument.audioCall)) params.audioCall = argument.audioCall;
            if (typeof argument.videoCall != 'undefined' && utils.isBoolean(argument.videoCall)) params.videoCall = argument.videoCall;
            if (typeof argument.fileTransfer != 'undefined' && utils.isBoolean(argument.fileTransfer)) params.fileTransfer = argument.fileTransfer;
            if (typeof argument.messaging != 'undefined' && utils.isBoolean(argument.messaging)) params.instantMessaging = argument.messaging;
            if (typeof argument.audio != 'undefined' && utils.isBoolean(argument.audio)) params.audioCall = argument.audio;
            if (typeof argument.video != 'undefined' && utils.isBoolean(argument.video)) params.videoCall = argument.video;
            if (typeof argument.transfer != 'undefined' && utils.isBoolean(argument.transfer)) params.fileTransfer = argument.transfer;
            if (typeof argument.onError == 'function') onError = argument.onError;
            if (typeof argument.onSuccess == 'function') onSuccess = argument.onSuccess;
          }
          break;
      }
      if (!connection.connected()) {
        return false;
      } else {
        var presence = {data: {}}, data = false;
        if (typeof params.status != 'undefined') {
          if (params.status.real) {
            presence.show = params.status.real;
          }
          if (params.status.unreal) {
            presence.data.show = params.status.unreal;
            data = true;
          }
        }
        if (typeof params.instantMessaging != 'undefined') {
          data = true;
          if (params.instantMessaging) {
            presence.data.instantMessaging = 'on';
          } else {
            presence.data.instantMessaging = 'off';
          }
        }
        if (typeof params.audioCall != 'undefined') {
          data = true;
          if (params.audioCall) {
            presence.data.audioCall = 'on';
          } else {
            presence.data.audioCall = 'off';
          }
        }
        if (typeof params.videoCall != 'undefined') {
          data = true;
          if (params.videoCall) {
            presence.data.videoCall = 'on';
          } else {
            presence.data.videoCall = 'off';
          }
        }
        if (typeof params.fileTransfer != 'undefined') {
          data = true;
          if (params.fileTransfer) {
            presence.data.fileTransfer = 'on';
          } else {
            presence.data.fileTransfer = 'off';
          }
        }
        if (data) presence.data = {
          command: 'setMeStatus',
          data: presence.data
        };
        xmpp.sendPresenceToAll(presence);
      }
      return true;
    };

    this.setStatusAvailable = function() {
      return this.setStatus('available', {
        instantMessaging: true,
        audioCall: true,
        videoCall: true,
        fileTransfer: true
      });
    };

    this.setStatusAway = function() {
      return this.setStatus('away', {
        instantMessaging: true,
        audioCall: true,
        videoCall: true,
        fileTransfer: true
      });
    };

    this.setStatusDoNotDisturb = function() {
      return this.setStatus('do not disturb', {
        instantMessaging: true,
        audioCall: false,
        videoCall: false,
        fileTransfer: false
      });
    };

    this.setStatusXAvailable = function() {
      return this.setStatus('x-available', {
        instantMessaging: true,
        audioCall: false,
        videoCall: false,
        fileTransfer: false
      });
    };

    this.getClient = function() { return storage.client; };
    this.getContacts = function() { return storage.contacts; };
    this.getAcceptedRequests = function() { return storage.acceptedRequests; };
    this.getSendedRequests = function() { return storage.sendedRequests; };
    this.getRejectedRequests = function() { return storage.rejectedRequests; };

    // Initiation

    module.on('connectionFailed', function() {
      if (connection.connected()) {
        connection.disconnect();
      }
      module.trigger('connectionFailed', {data: 'Some other modules failed to connect'});
      return true;
    });

    module.on('gotTempCreds', function() {
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
      // connection.registerHandler('packet_in', xmpp.handlers.fnIncomingPacket);
      // connection.registerHandler('packet_out', xmpp.handlers.fnOutcomingPacket);
      connection.registerIQGet('query', NS_VERSION, xmpp.handlers.fnIQV);
      connection.registerIQGet('query', NS_TIME, xmpp.handlers.fnIQV);
      // Disconnect
      module.on('core.disconnected', function (data) {connection.disconnect();});
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

    xmpp = new XMPP(new oSDK.utils.Module('xmpp'));

    // Register public methods

    xmpp.registerMethods({

      // Return info about current logged user
      getClient: xmpp.getClient,
      // Return contact by account or login
      getContactByAccount: xmpp.getContactByAccount,
      getContactByLogin: xmpp.getContactByLogin,
      // Return contacts list for current logged user
      getContacts: xmpp.getContacts,
      getAcceptedRequest: xmpp.getAcceptedRequests,
      getSendedRequests: xmpp.getSendedRequests,
      // Add & Remove contact
      addContact: xmpp.addContact,
      removeContact: xmpp.removeContact,
      deleteContact: xmpp.deleteContact,
      // Accept & reject request
      acceptRequest: xmpp.acceptRequest,
      rejectRequest: xmpp.rejectRequest,
      // Rejected request
      getRejectedRequests: xmpp.getRejectedRequests,
      deleteRejectedRequests: xmpp.deleteRejectedRequests,
      // Work with status & capabilities
      setStatus: xmpp.setStatus,
      setStatusAvailable: xmpp.setStatusAvailable,
      setStatusAway: xmpp.setStatusAway,
      setStatusDoNotDisturb: xmpp.setStatusDoNotDisturb,
      setStatusXAvailable: xmpp.setStatusXAvailable,
      // To dolete
      superPresence: xmpp.superPresence

    });

  }

})();
