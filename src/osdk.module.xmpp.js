/*
 * oSDK XMPP module
 * with JSJaC library
 */

(function () {

  // Use strict mode

  "use strict";

  // Exemplar of oSDK XMPP module

  var module;

  // Some list
  // Maybe: xmpp roster, list of contacts, incoming requests, outcoming requests, accepted requests, rejected requests

  function ListOfContacts() {

    var self = this;

    var list = [], link = {}, len = 0;

    function generateLink(data) {
      if (module.utils.isString(data)) {
        return '__' + module.utils.md5(data);
      } else {
        if (module.utils.isObject(data) && data.account) {
          return '__' + module.utils.md5(data.account);
        }
      }
      return false;
    }

    this.len = function() {
      return len;
    };

    this.put = function(elm) {
      list.push(elm); len = list.length;
      var index = generateLink(elm.account);
      link[index] = len - 1;
      return self;
    };

    this.get = function(num) {
      if (typeof num == 'undefined') {
        return list;
      } else {
        var account = false;
        if (module.utils.isNumber(num) && typeof list[num] != 'undefined') {
          return list[num];
        } else {
          if (module.utils.isString(num)) {
            account = num;
          } else {
            if (module.utils.isObject(num) && num.account) {
              account = num.account;
            }
          }
          if (account) {
            var index = generateLink(account);
            if (typeof link[index] != 'undefined' && list[link[index]] != 'undefined') {
              return list[link[index]];
            }
          }
        }
      }
      return false;
    };

    this.rem = function(dat) {
      var jid = false;
      if (module.utils.isObject(dat) && dat.account) {
        jid = dat.account;
      } else {
        if (module.utils.isString(dat)) {
          jid = dat;
        }
      }
      if (!jid) return false;
      var i, len = list.length, tempList = [], tempLink = {}, index;
      for (i = 0; i != len; i ++) {
        if (list[i].account != jid) {
          index = generateLink(list[i].account);
          tempList.push(list[i]);
          tempLink[index] = tempList.length - 1;
        }
      }
      list = tempList;
      link = tempLink;
      len = list.length;
      return self;
    };

    this.clear = function() {
      list = [];
      link = {};
      len = 0;
      return self;
    };

    this.sort = function() {
      list = list.sort(function(a, b) {
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
      return self;
    };

    this.update = function(data) {
      var i,t, il = list.length, tl = data.length;
      for (i = 0; i != il; i ++) {
        for (t = 0; t != tl; t ++) {
          if (list[i].account == data[t].account) {
            list[i].type = data[t].type;
            list[i].status = data[t].status;
            list[i].capabilities.setTechParams(data[t].capabilities.getTechParams());
            list[i].capabilities.setUserParams(data[t].capabilities.getUserParams());
          }
        }
      }
    };

  }

  // Inner storage

  function Storage(params) {

    // Self

    var self = this;

    // Logged user

    this.client = oSDK.user.create(params.login + '@' + params.domain, {
      history: false
    });

    this.client.type = 'online';
    this.client.status = 'available';

    module.log('Create new authorized client', this.client);

    // Roster

    this.roster = new ListOfContacts();

    // Contacts

    this.contacts = new ListOfContacts();

    // Requests

    this.requests = {
      accepted: new ListOfContacts(),
      rejected: new ListOfContacts(),
      incoming: new ListOfContacts(),
      outcoming: new ListOfContacts(),
      wasAccepted: new ListOfContacts(),
      wasRejected: new ListOfContacts()
    };

    // Flags of some statuses

    this.logged = false;
    this.status = null;

    this.message = {
      from: null,
      to: null,
      succemss: null
    };

  }

  // Inner XMPP module

  var xmpp;

  function XMPP() {

    // Self, utils, JSJaC connection & inner storage

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
        'connected': {other: true, client: 'last'},
        // 'xmpp.disconnected': {self: true},
        'disconnected': {other: true, client: 'last'},
        // 'xmpp.connectionFailed': {self: true},
        'connectionFailed': {other: true, client: true, cancels: 'connected'},
        // Client
        'gotNewRoster': {client: true},

        'contactIsAvailable': {client: true},
        'contactIsUnavailable': {client: true},
        'contactStatusChanged': {client: true},
        'contactCapabilitiesChanged': {client: true},

        'incomingRequest': {client: true},

        /**
         * Dispatched when XMPP module accepted new message
         *
         * @event oSDK#'incomingMessage'
         * @param {oSDK~TextMessage} event
         */
        'incomingMessage': {client: true},
        'outcomingMessage': {client: true},

        'requestWasAccepted': {client: true},
        'requestWasRejected': {client: true}

      };
    };

    // Register events

    module.registerEvents(this.events());

    // Register methods

    this.registerMethods = module.registerMethods;

    // Extend {Object} User

    oSDK.user.extend({
      // Properties
      group: 'General',
      status: this.OSDK_PRESENCE_TYPE_UNAVAILABLE,
      subscription: this.OSDK_SUBSCRIPTION_NONE,
      ask: false,
      picture: false
    });

    // Inner commands

    this.commands = {
      thatICan: function(p) {
        if (p.data.status) {
          storage.contacts.get(p.info.from).status = p.data.status;
          module.trigger('contactStatusChanged', {contact: storage.contacts.get(p.info.from)});
        }
        if (p.data.tech || p.data.user) {
          if (p.data.tech) {
            storage.contacts.get(p.info.from).capabilities.setTechParams(p.data.tech);
          }
          if (p.data.user) {
            storage.contacts.get(p.info.from).capabilities.setUserParams(p.data.user);
          }
          module.trigger('contactCapabilitiesChanged', {contact: storage.contacts.get(p.info.from)});
        }
      },
      sendMeWhatYouCan: function(p) {
        self.thatICan(p.info.from);
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
        var user = oSDK.user.create(packet.getFromJID().getNode() + '@' + packet.getFromJID().getDomain());
        user.history.push({
          type: 'message',
          to: packet.getToJID().getNode() + '@' + packet.getToJID().getDomain(),
          from: packet.getFromJID().getNode() + '@' + packet.getFromJID().getDomain(),
          message: packet.getBody().htmlEnc()
        });
        module.trigger('incomingMessage', {
          to: packet.getToJID().getNode() + '@' + packet.getToJID().getDomain(),
          from: packet.getFromJID().getNode() + '@' + packet.getFromJID().getDomain(),
          message: packet.getBody().htmlEnc()
        });
      },
      fnOutcomingMessage: function(packet) {
        module.info('XMPP HANDLER(outcoming message)');
        var user = oSDK.user.create(storage.message.to);
        user.history.push({
          type: 'message',
          to: storage.message.to,
          from: storage.message.from,
          message: packet.getBody().htmlEnc()
        });
        if (storage.message.success) {
          storage.message.success({
            to: storage.message.to,
            from: storage.message.from,
            message: packet.getBody().htmlEnc()
          });
        }
        module.trigger('outcomingMessage', {
          to: storage.message.to,
          from: storage.message.from,
          message: packet.getBody().htmlEnc()
        });
        storage.message = {
          success: null,
          from: null,
          to: null
        };
      },
      fnIncomingPresence: function(packet) {
        var data = self.getPresenceData(packet), user, contact, request;
        module.info('XMPP HANDLER(incoming presence)');
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
                  module.log(storage.contacts.get(data.from).account + '# type changed to online');
                  storage.contacts.get(data.from).type = 'online';
                  storage.contacts.get(data.from).status = 'available';
                  module.trigger('contactIsAvailable', {contact: storage.contacts.get(data.from)});
                  // module.trigger('contactStatusChanged', {contact: storage.contacts.get(data.from)});
                  if (!data.show && !data.status && !data.priority) {
                    self.thatICan(data.from);
                  }
                  break;
                // UNAVAILABLE
                case xmpp.OSDK_PRESENCE_TYPE_UNAVAILABLE :
                  module.log(storage.contacts.get(data.from).account + '# type changed to offline');
                  contact = storage.contacts.get(data.from);
                  if (contact) {
                    storage.contacts.get(data.from).type = 'offline';
                    storage.contacts.get(data.from).status = 'unavailable';
                    storage.contacts.get(data.from).capabilities.setTechParams({
                      instantMessaging: false,
                      audioCall: false,
                      videoCall: false,
                      fileTransfer: false
                    });
                    storage.contacts.get(data.from).capabilities.setUserParams({
                      instantMessaging: false,
                      audioCall: false,
                      videoCall: false,
                      fileTransfer: false
                    });
                    module.trigger('contactIsUnavailable', {contact: storage.contacts.get(data.from)});
                  }
                  // module.trigger('contactStatusChanged', {contact: storage.contacts.get(data.from)});
                  break;
                // SUBSCRIBE
                case self.OSDK_PRESENCE_TYPE_SUBSCRIBE :
                  user = oSDK.user.create(data.from); user.ask = self.OSDK_PRESENCE_TYPE_SUBSCRIBE;
                  request = storage.requests.wasAccepted.get(data.from);
                  if (request) {
                    switch(request.ask) {
                      case self.OSDK_PRESENCE_TYPE_SUBSCRIBE :
                        self.sendPresence({
                          to: data.from,
                          type: self.OSDK_PRESENCE_TYPE_SUBSCRIBED
                        });
                        self.getRoster({
                          "onSuccess": function(params) {
                            self.thatICan(data.from);
                          }
                        });

                        return true;
                    }
                  }
                  contact = storage.contacts.get(data.from);
                  if (contact) {
                    switch(contact.subscription) {
                      case self.OSDK_SUBSCRIPTION_TO :
                        self.sendPresence({
                          to: data.from,
                          type: self.OSDK_PRESENCE_TYPE_SUBSCRIBED
                        });
                        self.getRoster({
                          "onSuccess": function(params) {
                            self.thatICan(data.from);
                          }
                        });
                        return true;
                    }
                  }
                  storage.requests.incoming.put(user);
                  module.trigger('incomingRequest', {contact: user});
                  break;
                // SUBSCRIBED
                case self.OSDK_PRESENCE_TYPE_SUBSCRIBED :
                  user = storage.requests.outcoming.get(data.from);
                  if (user) {
                    if (user.ask) {
                      switch(user.ask) {
                        case self.OSDK_PRESENCE_TYPE_SUBSCRIBE :
                          storage.requests.wasAccepted.put(user);
                          storage.requests.outcoming.rem(user);
                          self.getRoster({
                            "onSuccess": function(params) {
                              module.trigger('requestWasAccepted', {contact: user});
                            }
                          });
                          break;
                        case self.OSDK_PRESENCE_TYPE_UNSUBSCRIBE :
                          /* TODO */
                          break;
                      }
                    }
                  }
                  break;
                // UNSUBSCRIBE
                case xmpp.OSDK_PRESENCE_TYPE_UNSUBSCRIBE :
                  self.sendPresence({
                    to: data.from,
                    type: xmpp.OSDK_PRESENCE_TYPE_UNSUBSCRIBED
                  });
                  self.deleteContact(data.from, {
                    "onSuccess": function(params) {
                      self.getRoster();
                    }
                  });
                  break;
                // UNSUBSCRIBED
                case self.OSDK_PRESENCE_TYPE_UNSUBSCRIBED :
                  user = storage.requests.outcoming.get(data.from);
                  if (user) {
                    if (user.ask) {
                      switch(user.ask) {
                        case self.OSDK_PRESENCE_TYPE_SUBSCRIBE :
                          storage.requests.wasRejected.put(user);
                          storage.requests.outcoming.rem(data.from);
                          self.deleteContact(data.from, {
                            "onSuccess": function(params) {
                              self.getRoster({
                                "onSuccess": function(params) {
                                  module.trigger('requestWasRejected', {contact: user});
                                }
                              });
                            }
                          });
                          break;
                        case self.OSDK_PRESENCE_TYPE_UNSUBSCRIBE :
                          /*
                          this.deleteContact(data.from);
                          this.getRoster();
                          */
                          break;
                      }
                    } else {
                      /* TODO */
                    }
                  }
                  break;
              }
            }
            if (data.show) {
              if (data.status && utils.isObject(data.status) && data.status.command && data.status.command == 'thatICan') {
                /* TODO */
              } else {
                var show = self.decodeStatus(data.show).real;
                storage.contacts.get(data.from).status = show;
                module.trigger('contactStatusChanged', {contact: storage.contacts.get(data.from)});
              }
            }
            if (data.status && utils.isObject(data.status) && data.status.command) {
              if (typeof self.commands[data.status.command] == 'function') {
                var params = {
                  info: {
                    command: data.status.command,
                    from: data.from,
                    to: data.to
                  },
                  data: data.status[data.status.command]
                };
                self.commands[data.status.command](params);
                return true;
              }
            }
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
        storage.client.status = 'available';
        storage.client.capabilities.setTechParams({instantMessaging: true});
        storage.client.capabilities.setUserParams({
          instantMessaging: true,
          audioCall: true,
          videoCall: true,
          fileTransfer: true
        });
        self.getRoster({
          onError: function(data) {
            /* TODO */
          },
          onSuccess: function(data) {
            self.iAmLogged({
              onError: function(data) {
                /* TODO */
              },
              onSuccess: function(data) {
                storage.logged = true;
                module.trigger('connected', [].slice.call(arguments, 0));
              }
            });
          }
        });
        return true;
      },
      fnOnDisconnect: function() {
        module.info('XMPP HANDLER(disconnect)');
        module.trigger('disconnected', [].slice.call(arguments, 0));
        return true;
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
        module.info('XMPP HANDLER(status changed): ', status);
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

    // Get handlers

    this.getHandlers = function(params) {
      params = params || {};
      var empty = function() {/*---*/};
      var handlers = ((utils.isObject(params)) ? params : {});
      handlers.onError = ((typeof params.onError == 'function') ? params.onError : empty);
      handlers.onSuccess = ((typeof params.onSuccess == 'function') ? params.onSuccess : empty);
      handlers.onComplete = ((typeof params.onComplete == 'function') ? params.onComplete : empty);
      return handlers;
    };

    // Get presence data

    this.getPresenceData = function(packet) {
      var status = ((packet.getStatus()) ? packet.getStatus() : false);
      if (status !== false) {
        try {
          // {Object} in status
          status = module.utils.jsonDecode(status);
        } catch(eIsNotObject) {
          // {String} in status
        }
      }
      try {
        return {
          from: (packet.getFromJID()._node + '@' + packet.getFromJID()._domain).toLowerCase(),
          to: (packet.getToJID()._node + '@' + packet.getToJID()._domain).toLowerCase(),
          type: packet.getType() || 'available',
          show: packet.getShow() || false,
          status: status,
          priority: packet.getPriority() || false
        };
      } catch (eConvertPresenceData) { return false; }
    };

    // Send presence

    this.sendPresence = function(params) {

      var handlers = self.getHandlers(params);

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

          handlers.onSuccess();

          handlers.onComplete();

          return true;

        } catch(eSendPresence) {

          handlers.onError();

          return false;

        }

      } else {

        handlers.onError();

        return false;

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

    this.iAmLogged = function(params) {

      var handlers = self.getHandlers(params);

      if (connection.connected()) {

        this.sendPresence({
          onError: handlers.onError
        });

        handlers.onSuccess();

        handlers.onComplete();

        return true;

      } else {

        handlers.onError();

        return false;

      }
    };

    this.sendMeWhatYouCanToAll = function(params) {

      var i, len = storage.contacts.len(), con = storage.contacts.get();

      for (i = 0; i != len; i ++) {

        self.sendMeWhatYouCan(con[i].account, params);

      }

    };

    this.sendMeWhatYouCan = function(to, params) {
      if (!to) {
        self.sendMeWhatYouCanToAll(params);
        return false;
      }
      var handlers = self.getHandlers(params);
      var contact = storage.contacts.get(to);
      if (connection.connected() && contact && (contact.subscription == self.OSDK_SUBSCRIPTION_TO || contact.subscription == self.OSDK_SUBSCRIPTION_BOTH)) {
        this.sendPresence({
          to: to,
          data: {
            command: 'sendMeWhatYouCan'
          },
          onError: handlers.onError
        });
        handlers.onSuccess();
        handlers.onComplete();
      } else {
        handlers.onError();
        return false;
      }
    };

    this.thatICanToAll = function(params) {

      var i, len = storage.contacts.len(), con = storage.contacts.get();

      for (i = 0; i != len; i ++) {

        self.thatICan(con[i].account, params);

      }

    };

    this.thatICan = function(to, params) {

      var handlers = self.getHandlers(params);

      var contact = storage.contacts.get(to);

      if (connection.connected() && contact && (contact.subscription == self.OSDK_SUBSCRIPTION_FROM || contact.subscription == self.OSDK_SUBSCRIPTION_BOTH)) {

        var thatICan = {};
        thatICan.tech = storage.client.capabilities.getTechParams();
        thatICan.user = storage.client.capabilities.getUserParams();
        thatICan.status = storage.client.status;

        this.sendPresence({
          to: to,
          show: self.encodeStatus(storage.client.status).real,
          data: {
            command: 'thatICan',
            thatICan: thatICan
          },
          onError: handlers.onError
        });

        handlers.onSuccess();

        handlers.onComplete();

      } else {

        handlers.onError();

        return false;

      }
    };

    // Get roster

    this.getRoster = function(params) {

      // Get handlers from params
      var handlers = self.getHandlers(params);

      if (connection.connected()) {

        var iq = new JSJaCIQ();
        iq.setIQ(null, 'get', self.generateRosterId());
        iq.setQuery(NS_ROSTER);

        var old = false;

        connection.sendIQ(iq, {

          error_handler: function(aiq) {

            handlers.onError();

          },

          result_handler: function(aiq, arg) {

            var nodes = aiq.getQuery();

            module.log('Roster nodes: ', nodes);

            var i, len = nodes.childNodes.length;

            if (storage.logged) {

              old = storage.roster.get();

              storage.roster.clear();
              storage.contacts.clear();
              storage.requests.outcoming.clear();

            }

            for (i = 0; i != len; i ++) {

              var jid = nodes.childNodes[i].getAttribute('jid').toLowerCase();

              if (jid != storage.client.account) {

                var user = oSDK.user.create(jid);

                var ask = nodes.childNodes[i].getAttribute('ask');
                var subscription = nodes.childNodes[i].getAttribute('subscription');

                if (ask) {
                  switch(ask) {
                    case self.OSDK_ROSTER_ASK_SUBSCRIBE :
                      user.ask = self.OSDK_ROSTER_ASK_SUBSCRIBE;
                      break;
                    case self.OSDK_ROSTER_ASK_UNSUBSCRIBE :
                      user.ask = self.OSDK_ROSTER_ASK_UNSUBSCRIBE;
                      break;
                    default :
                      user.ask = false;
                      break;
                  }
                } else {
                  user.ask = false;
                }

                if (subscription) {
                  switch (subscription) {
                    case self.OSDK_SUBSCRIPTION_NONE :
                      user.subscription = self.OSDK_SUBSCRIPTION_NONE;
                      break;
                    case self.OSDK_SUBSCRIPTION_FROM :
                      user.subscription = self.OSDK_SUBSCRIPTION_FROM;
                      break;
                    case self.OSDK_SUBSCRIPTION_TO :
                      user.subscription = self.OSDK_SUBSCRIPTION_TO;
                      break;
                    case self.OSDK_SUBSCRIPTION_BOTH :
                      user.subscription = self.OSDK_SUBSCRIPTION_BOTH;
                      break;
                    default :
                      user.subscription = false;
                      break;
                  }
                } else {
                  user.subscription = false;
                }

                user.type = 'offline';
                user.status = 'unavailable';

                storage.roster.put(user);

              }

            }

            i = 0;
            len = storage.roster.len();

            if (len) {

              storage.roster.sort();

              if (old) storage.roster.update(old);

              var addToContacts = null;

              var roster = storage.roster.get();

              module.log('Roster: ', roster);

              for (i = 0; i != len; i ++) {

                addToContacts = true;

                if (roster[i].ask) {
                  if (roster[i].ask == self.OSDK_ROSTER_ASK_UNSUBSCRIBE) addToContacts = false;
                  storage.requests.outcoming.put(roster[i]);
                }

                if (addToContacts) storage.contacts.put(roster[i]);

              }

              module.log('Contacts: ', storage.contacts.get());
              module.log('Outcoming requests: ', storage.requests.outcoming.get());

            }

            var data = {
              contacts: storage.contacts.get(),
              acceptedRequests: storage.requests.accepted.get(),
              rejectedRequests: storage.requests.rejected.get(),
              incomingRequests: storage.requests.incoming.get(),
              outcomingRequests: storage.requests.outcoming.get()
            };

            module.trigger('gotNewRoster', {"data": data});

            handlers.onSuccess({"data": data});

            if (storage.logged) {

              self.sendMeWhatYouCan();

            }

          }

        });

        handlers.onComplete();

        return true;

      } else {

        handlers.onError();

        return false;

      }

    };

    // Add & Remove (|| delete) Contact

    this.addContact = function(jid, params) {

      var handlers = self.getHandlers(params), error = false, contact, request;

      if (!connection.connected()) error = '01';
      if (module.utils.isEmpty(jid)) error = '02';
      if (!module.utils.isString(jid)) error = '03';
      if (!module.utils.isValidLogin(jid) && !module.utils.isValidAccount(jid)) error = '04';
      if (!module.utils.isValidAccount(jid)) jid = jid + '@' + oSDK.client.domain();
      if (jid == storage.client.account) error = '05';
      request = storage.requests.incoming.get(jid);
      if (request) {
        switch(request.ask) {
          case self.OSDK_ROSTER_ASK_SUBSCRIBE :
            self.sendPresence({
              to: jid,
              type: xmpp.OSDK_PRESENCE_TYPE_SUBSCRIBED
            });
            storage.requests.accepted.put(request);
            storage.requests.incoming.rem(request);
            self.sendPresence({
              to: jid,
              type: self.OSDK_PRESENCE_TYPE_SUBSCRIBE
            });
            self.getRoster({
              "onError": handlers.onError,
              "onComplete": handlers.onComplete,
              "onSuccess": function(params) {
                self.thatICan(jid);
                handlers.onSuccess(params);
              }
            });
            return true;
          case self.OSDK_ROSTER_ASK_UNSUBSCRIBE :
            /* Auto response from presence controller */
            break;
        }
      }
      request = storage.requests.outcoming.get(jid);
      if (request) {
        switch(request.ask) {
          case self.OSDK_ROSTER_ASK_SUBSCRIBE :
            handlers.onSuccess();
            handlers.onComplete();
            return true;
          case self.OSDK_ROSTER_ASK_UNSUBSCRIBE :
            /* Auto response from presence controller */
            break;
        }
      }
      contact = storage.contacts.get(jid);
      if (contact) {
        if (contact.subscription == self.OSDK_SUBSCRIPTION_TO || contact.subscription == self.OSDK_SUBSCRIPTION_BOTH) error = '06';
      }
      if (error) {
        handlers.onError(error);
        return false;
      } else {
        self.sendPresence({
          to: jid,
          type: xmpp.OSDK_PRESENCE_TYPE_SUBSCRIBE
        });
        self.getRoster(handlers);
      }
      return true;
    };

    this.removeContact = function(jid, params) {

      var handlers = self.getHandlers(params), contact = false;

      if (!connection.connected()) {
        handlers.onError();
        return false;
      } else {
        if (module.utils.isObject(jid)) {
          if (jid.account) {
            contact = storage.contacts.get(jid.account);
          } else {
            handlers.onError();
            return false;
          }
        } else {
          contact = storage.contacts.get(jid);
        }
        if (!contact) {
          handlers.onError();
          return false;
        } else {
          xmpp.sendPresence({
            to: contact.account,
            type: xmpp.OSDK_PRESENCE_TYPE_UNSUBSCRIBE
          });
          self.deleteContact(contact.account, {
            "onError": handlers.onError,
            "onComplete": handlers.onComplete,
            "onSuccess": function(params) {
              self.getRoster(handlers);
            }
          });
        }
      }
      return true;
    };

    this.deleteContact = function(jid, params) {

      var handlers = self.getHandlers(params);

      if (!connection.connected()) {
        handlers.onError();
        return false;
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
        connection.sendIQ(iq, {
          error_handler: handlers.onError,
          result_handler: handlers.onSuccess
        });
        handlers.onComplete();
      }
      return true;
    };

    this.acceptRequest = function(jid, params) {

      var handlers = self.getHandlers(params);

      var request = storage.requests.incoming.get(jid);

      if (!request) {
        handlers.onError();
        return false;
      } else {
        self.sendPresence({
          to: request.account,
          type: self.OSDK_PRESENCE_TYPE_SUBSCRIBED
        });
        storage.requests.accepted.put(request);
        storage.requests.incoming.rem(request);
        self.sendPresence({
          to: request.account,
          type: self.OSDK_PRESENCE_TYPE_SUBSCRIBE
        });
        self.getRoster({
          "onError": handlers.onError,
          "onComplete": handlers.onComplete,
          "onSuccess": function(params) {
            self.thatICan(request.account);
            handlers.onSuccess(params);
          }
        });
        return true;
      }
    };

    this.rejectRequest = function(jid, params) {

      var handlers = self.getHandlers(params);

      var request = storage.requests.incoming.get(jid);

      if (!request && result.ask != self.OSDK_PRESENCE_TYPE_SUBSCRIBE) {
        handlers.onError();
        return false;
      } else {
        self.sendPresence({
          to: request.account,
          type: self.OSDK_PRESENCE_TYPE_UNSUBSCRIBED
        });
        storage.requests.rejected.put(request);
        storage.requests.incoming.rem(request);
        self.deleteContact(request.account, handlers);
        return true;
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
          case 'available' :
            result.real = 'available';
            break;
          case 'chat' :
            result.real = 'available';
            break;
          case 'away' :
            result.real = 'away';
            break;
          case 'do not disturb' :
            result.real = 'do not disturb';
            break;
          case 'dnd' :
            result.real = 'do not disturb';
            break;
          case 'x-available' :
            result.real = 'x-available';
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

      var handlers = self.getHandlers(params);

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
        handlers.onError();
        return false;
      } else {
        var presence = {data: {}}, data = false;
        if (typeof params.status != 'undefined') {
          if (params.status.real) {
            storage.client.status = params.status.real;
          }
          if (params.status.unreal) {
            storage.client.status = params.status.unreal;
          }
        }
        storage.client.capabilities.setUserParams(params);
        self.thatICanToAll(handlers);
      }
      return true;
    };

    this.setStatusAvailable = function(params) {
      storage.client.capabilities.setUserParams({
        instantMessaging: true,
        audioCall: true,
        videoCall: true,
        fileTransfer: false
      });
      storage.client.status = 'available';
      self.thatICanToAll(params || {});
    };

    this.setStatusAway = function(params) {
      storage.client.capabilities.setUserParams({
        instantMessaging: true,
        audioCall: true,
        videoCall: true,
        fileTransfer: false
      });
      storage.client.status = 'away';
      self.thatICanToAll(params || {});
    };

    this.setStatusDoNotDisturb = function(params) {
      storage.client.capabilities.setUserParams({
        instantMessaging: true,
        audioCall: false,
        videoCall: false,
        fileTransfer: false
      });
      storage.client.status = 'do not disturb';
      self.thatICanToAll(params || {});
    };

    this.setStatusXAvailable = function(params) {
      storage.client.capabilities.setUserParams({
        instantMessaging: false,
        audioCall: false,
        videoCall: false,
        fileTransfer: false
      });
      storage.client.status = 'x-available';
      self.thatICanToAll(params || {});
    };

    this.sendMessage = function(to, msg, params) {

      var handlers = self.getHandlers(params);

      if (!connection.connected()) {
        handlers.onError();
        return false;
      }

      if (!to || !msg) {
        if (!to) {
          handlers.onError();
        }
        if (!msg) {
          handlers.onError();
        }
        return false;
      }

      var jid = false;

      if (module.utils.isObject(to)) {
        jid = to.account;
      } else {
        if (module.utils.isString(to)) {
          jid = to;
        }
      }

      if (!jid) {
        handlers.onError();
      }

      storage.message = {
        success: handlers.onSuccess,
        from: storage.client.account,
        to: jid
      };

      var message = new JSJaCMessage();
      message.setTo(new JSJaCJID(jid));
      message.setBody(msg);
      connection.send(message);

      handlers.onComplete();

    };

    this.getClient = function() { return storage.client; };
    this.getContact = function(account) { return storage.contacts.get(account); };
    this.getContacts = function() { return storage.contacts.get(); };
    this.getAcceptedRequest = function(account) { return storage.requests.accepted.get(account); };
    this.getRejectedRequest = function(account) { return storage.requests.rejected.get(account); };
    this.getIncomingRequest = function(account) { return storage.requests.incoming.get(account); };
    this.getOutcomingRequest = function(account) { return storage.requests.outcoming.get(account); };
    this.getAcceptedRequests = function() { return storage.requests.accepted.get(); };
    this.getRejectedRequests = function() { return storage.requests.rejected.get(); };
    this.getIncomingRequests = function() { return storage.requests.incoming.get(); };
    this.getOutcomingRequests = function() { return storage.requests.outcoming.get(); };

    // Initiation

    module.on('connectionFailed', function() {
      if (connection.connected()) {
        connection.disconnect();
      }
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
      module.on('disconnecting', function (data) {
        module.log('Started disconnect process');
        if (connection.connected()) {
          connection.disconnect();
        }
      });
      // Media capabilities
      module.on('gotMediaCapabilities', function(e) {
        module.log('Got media capabilities');
        storage.client.capabilities.setTechParams({
          audioCall: e.data.audio,
          videoCall: e.data.video
        });
      });
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

    module = new oSDK.utils.Module('xmpp');

    xmpp = new XMPP();

    // Register public methods

    xmpp.registerMethods({

      /**
       * Returns current authorized client
       *
       * @method oSDK.getClient
       * @returns {object}
       */
      "getClient": xmpp.getClient,

      /**
       * Get roster from server and parse him
       *
       * @method oSDK.getRoster
       * @param {object} three hanlers: onError, onSuccess, onComplete
       * @returns {bool}
       */
      "getRoster": xmpp.getRoster,

      "getContact": xmpp.getContact,
      "getContacts": xmpp.getContacts,

      "getAcceptedRequest": xmpp.getAcceptedRequest,
      "getRejectedRequest": xmpp.getRejectedRequest,
      "getIncomingRequest": xmpp.getIncomingRequest,
      "getOutcomingRequest": xmpp.getOutcomingRequest,
      "getAcceptedRequests": xmpp.getAcceptedRequests,
      "getRejectedRequests": xmpp.getRejectedRequests,
      "getIncomingRequests": xmpp.getIncomingRequests,
      "getOutcomingRequests": xmpp.getOutcomingRequests,

      "acceptRequest": xmpp.acceptRequest,
      "rejectRequest": xmpp.rejectRequest,

      "setStatus": xmpp.setStatus,
      "setStatusAvailable": xmpp.setStatusAvailable,
      "setStatusAway": xmpp.setStatusAway,
      "setStatusDoNotDisturb": xmpp.setStatusDoNotDisturb,
      "setStatusXAvailable": xmpp.setStatusXAvailable,

      "sendMessage": xmpp.sendMessage,

      "addContact": xmpp.addContact,
      "removeContact": xmpp.removeContact

    });

  }

})();
