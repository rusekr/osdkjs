/*
 * oSDK XMPP module
 * with JSJaC library
 */

(function () {

  "use strict";

  /**
   * @namespace RosterAPI
   */

  /**
   * @namespace PresenceAPI
   */

  /**
   * @namespace MessagingAPI
   */

  /*
   * Exemplar of oSDK XMPP module
   * xmpp - inner
   * module - outer
   */

  var xmpp, module;

  /*
   * Report about text message
   * TODO
   */

  /**
   * Instance of this class is used in XMPP module as notification of an incoming or outgoing text message to be written into history journal of some contact
   *
   * @constructor TextMessage
   */

  function TextMessage(params) {

    /**
     * Always set as "TextMessage"
     *
     * @alias type
     * @memberof TextMessage
     * @instance
     * @type string
     */
    this.type = 'TextMessage';

    /**
     * ID of contact, who sent this message
     *
     * @alias from
     * @memberof TextMessage
     * @instance
     * @type string
     */
    this.from = null;

    /**
     * ID of contact, who accepted this message
     *
     * @alias to
     * @memberof TextMessage
     * @instance
     * @type string
     */
    this.to = null;

    /**
     * Subject of this message
     *
     * @alias subject
     * @memberof TextMessage
     * @instance
     * @type string
     */
    this.subject = null;

    /**
     * Text of message
     *
     * @alias message
     * @memberof TextMessage
     * @instance
     * @type string
     */
    this.message = null;

    /**
     * Set as {boolean} true if this message is incoming (to = ID of current authorized client)
     *
     * @alias incoming
     * @memberof TextMessage
     * @instance
     * @type boolean
     */
    this.incoming = false;

    /**
     * Set as {boolean} true if this message is outgoing (from = ID of current authorized client)
     *
     * @alias outgoing
     * @memberof TextMessage
     * @instance
     * @type boolean
     */
    this.outgoing = false;

    if (typeof params.from != 'undefined' && module.utils.isValidID(params.from)) this.from = params.from;
    if (typeof params.to != 'undefined' && module.utils.isValidID(params.to)) this.to = params.to;
    if (typeof params.subject != 'undefined' && module.utils.isString(params.subject)) this.subject = params.subject;
    if (typeof params.message != 'undefined' && module.utils.isString(params.message)) this.message = params.message;

    if (this.from || this.to) {
      if (this.from) {
        if (oSDK.getClient().id == this.from) {
          this.incoming = false;
          this.outgoing = true;
        }
      }
      if (this.to) {
        if (oSDK.getClient().id == this.to) {
          this.incoming = true;
          this.outgoing = false;
        }
      }
    }

    var date = new Date();

    /**
     * Time stamp
     *
     * @alias timestamp
     * @memberof TextMessage
     * @instance
     * @type string
     */
    this.timestamp = date.getTime();

    /**
     * Time zone offset in hours
     *
     * @alias timeZoneOffset
     * @memberof TextMessage
     * @instance
     * @type number
     */
    this.timeZoneOffset = date.getTimezoneOffset() / 60;

    /**
     * Day (1-31)
     *
     * @alias day
     * @memberof TextMessage
     * @instance
     * @type number
     */
    this.day = date.getDate();

    /**
     * Month (1-12)
     *
     * @alias month
     * @memberof TextMessage
     * @instance
     * @type number
     */
    this.month = date.getMonth() + 1;

    /**
     * Year
     *
     * @alias year (YYYY)
     * @memberof TextMessage
     * @instance
     * @type number
     */
    this.year = date.getFullYear();

    /**
     * Hours (0-23)
     *
     * @alias hours
     * @memberof TextMessage
     * @instance
     * @type number
     */
    this.hours = date.getHours();

    /**
     * Minutes (0-59)
     *
     * @alias minutes
     * @memberof TextMessage
     * @instance
     * @type number
     */
    this.minutes = date.getMinutes();

    /**
     * Seconds (0-59)
     *
     * @alias seconds
     * @memberof TextMessage
     * @instance
     * @type number
     */
    this.seconds = date.getSeconds();

  }

  /*
   * Some list, maybe:
   * xmpp roster
   * list of contacts
   * incoming requests
   * outgoing requests
   * accepted requests
   * rejected requests
   */

  function SDKList() {

    var self = this;

    var list = [], link = {}, len = 0;

    function generateLink(data) {
      if (module.utils.isString(data)) {
        return '__' + module.utils.md5(data);
      } else {
        if (module.utils.isObject(data) && data.id) {
          return '__' + module.utils.md5(data.id);
        }
      }
      return false;
    }

    this.len = function() {
      return len;
    };

    this.put = function(elm) {
      list.push(elm); len = list.length;
      var index = generateLink(elm.id);
      link[index] = len - 1;
      return self;
    };

    this.get = function(num) {
      if (typeof num == 'undefined') {
        return list;
      } else {
        var id = false;
        if (module.utils.isNumber(num) && typeof list[num] != 'undefined') {
          return list[num];
        } else {
          if (module.utils.isString(num)) {
            id = num;
          } else {
            if (module.utils.isObject(num) && num.id) {
              id = num.id;
            }
          }
          if (id) {
            var index = generateLink(id);
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
      if (module.utils.isObject(dat) && dat.id) {
        jid = dat.id;
      } else {
        if (module.utils.isString(dat)) {
          jid = dat;
        }
      }
      if (!jid) return false;
      var i, len = list.length, tempList = [], tempLink = {}, index;
      for (i = 0; i != len; i ++) {
        if (list[i].id != jid) {
          index = generateLink(list[i].id);
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
          if (list[i].id == data[t].id) {
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

    // JID

    this.jid = params.login + '@' + params.domain;

    // Logged user

    this.client = oSDK.user(this.jid, { history: false });

    // Login & Domain

    this.login = params.login;
    this.domain = params.domain;

    // Capabilities of logged user

    this.client.capabilities.setTechParams({
      audioCall: xmpp.techCapabilities().audioCall,
      videoCall: xmpp.techCapabilities().videoCall
    });

    this.client.capabilities.setUserParams(xmpp.userCapabilities());

    module.log('Create new authorized client: ', this.client);

    // Roster

    this.roster = new SDKList();

    // Contacts

    this.contacts = new SDKList();

    // Requests

    this.requests = {
      accepted: new SDKList(),
      rejected: new SDKList(),
      incoming: new SDKList(),
      outgoing: new SDKList(),
      wasAccepted: new SDKList(),
      wasRejected: new SDKList()
    };

    // Flags of some statuses

    this.logged = false;

    this.status = null;

    this.confirm = null;

    this.message = {
      from: null,
      to: null,
      success: null
    };

    this.clear = function() {
      // Client
      this.jid = null;
      this.client = null;
      this.login = null;
      this.domain = null;
      // Roster
      this.roster = new SDKList();
      // Contacts
      this.contacts = new SDKList();
      // Requests
      this.requests = {
        accepted: new SDKList(),
        rejected: new SDKList(),
        incoming: new SDKList(),
        outgoing: new SDKList(),
        wasAccepted: new SDKList(),
        wasRejected: new SDKList()
      };
      // Flags of some statuses
      this.logged = false;
      this.status = null;
      this.confirm = null;
      this.message = {
        from: null,
        to: null,
        success: null
      };
    };

  }

  // Inner XMPP module

  function XMPP() {

    // Self, utils, JSJaC connection & inner storage

    var self = this, utils = module.utils, connection = null, storage = null;

    // Storage to client capabilities

    var techCapabilities = {

      instantMessaging: false,
      audioCall: false,
      videoCall: false,
      fileTransfer: false

    };

    var userCapabilities = {

      instantMessaging: false,
      audioCall: false,
      videoCall: false,
      fileTransfer: false

    };

    this.techCapabilities = function() {return techCapabilities;};
    this.userCapabilities = function() {return userCapabilities;};

    var lastClientParams = {
      type: false,
      status: false
    };

    this.lastClientParams = function() {return lastClientParams;};

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
          debug: true,
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
            domain: null,
            port: 5280,
            url: 'http-bind'
          }
        }
      } };
    };

    // Expand user capabilities (add "instantMessaging")

    if (typeof module.factory.user != 'undefined') {

      var oSDKMUser = new module.factory.user();

      oSDKMUser.expandProperties('ask', false, 'xmpp');
      oSDKMUser.expandProperties('subscription', false, 'xmpp');
      oSDKMUser.expandProperties('signature', false, 'xmpp');

      oSDKMUser.expandCapabilities('instantMessaging', false, false, 'xmpp');

    }

    // Register config

    module.registerConfig(this.config());

    // Attachable events

    this.events = function() {
      return {
        // Inner
        // 'xmpp.connected': {self: true},
        'connected': { other: true, client: 'last' },
        // 'xmpp.disconnected': {self: true},
        'disconnected': { other: true, client: 'last' },
        // 'xmpp.connectionFailed': {self: true},
        'connectionFailed': { other: true, client: true },

        /**
         * Dispatched when XMPP module got a new roster from server and parsed him
         *
         * @memberof RosterAPI
         * @event gotNewRoster
         * @returns {array} Contacts list
         */
        'gotNewRoster': {client: true},

        /**
         * Dispatched when contact changed its status or capabilities
         *
         * @memberof PresenceAPI
         * @event contactStatusChanged
         * @returns {object} SDKUser
         */
        'contactStatusChanged': {client: true},

        /**
         * Dispatched when XMPP module accepted new auth request from other user
         *
         * @memberof PresenceAPI
         * @event incomingRequest
         * @param {object} SDKUser
         */
        'incomingRequest': {client: true},

        /**
         * Dispatched when XMPP module sent auth request to other user
         *
         * @memberof PresenceAPI
         * @event outgoingRequest
         * @param {object} SDKUser
         */
        'outgoingRequest': {client: true},

        /**
         * Dispatched when XMPP module accepted new message from other user
         *
         * @memberof MessagingAPI
         * @event incomingMessage
         * @param {object} TextMessage
         */
        'incomingMessage': {client: true},

        /**
         * Dispatched when XMPP module sent new message to other user
         *
         * @memberof MessagingAPI
         * @event outgoingMessage
         * @param {object} TextMessage
         */
        'outgoingMessage': {client: true},

        /**
         * Dispatched when contact accepted your auth request
         *
         * @memberof PresenceAPI
         * @event requestWasAccepted
         * @param {object} SDKUser
         */
        'requestWasAccepted': {client: true},

        /**
         * Dispatched when contact rejected your auth request
         *
         * @memberof PresenceAPI
         * @event requestWasRejected
         * @param {object} SDKUser
         */
        'requestWasRejected': {client: true},

        /**
         * Dispatched when received free data from other contact
         *
         * @memberof PresenceAPI
         * @event receivedData
         * @param {object}
         */
        'receivedData': {client: true}

      };
    };

    // Register events

    module.registerEvents(this.events());

    // Register methods

    this.registerMethods = module.registerMethods;

    // Inner commands

    this.commands = {
      thatICan: function(p) {
        var contact = storage.contacts.get(p.info.from);
        if (p.data.status) {
          if (contact) {
            contact.status = p.data.status;
          }
        }
        if (p.data.tech || p.data.user) {
          if (contact) {
            if (p.data.tech) {
              contact.capabilities.setTechParams(p.data.tech);
            }
            if (p.data.user) {
              contact.capabilities.setUserParams(p.data.user);
            }
          }
        }
        module.trigger('contactStatusChanged', {contact: contact});
      },
      thatICanOnStart: function(p) {
        this.thatICan(p);
        this.sendMeWhatYouCan(p);
      },
      sendMeWhatYouCan: function(p) {
        self.thatICan(p.info.from);
      }
    };

    // XMPP handler's

    this.handlers = {

      fnIQ: function(iq) {
        module.info('XMPP HANDLER(iq)');
        if (connection && connection.connected()) {
          connection.send(iq.errorReply(ERR_FEATURE_NOT_IMPLEMENTED));
          return true;
        }
        return false;
      },

      fnIQV: function(iq) {
        module.info('XMPP HANDLER(iq version)');
        if (connection && connection.connected()) {
          connection.send(iq.reply([iq.buildNode('name', 'oSDK client'), iq.buildNode('version', JSJaC.Version), iq.buildNode('os', navigator.userAgent)]));
          return true;
        }
        return false;
      },

      fnIQT: function(iq) {
        module.info('XMPP HANDLER(iq time)');
        if (connection && connection.connected()) {
          var now = new Date();
          connection.send(iq.reply([iq.buildNode('display', now.toLocaleString()), iq.buildNode('utc', now.jabberDate()), iq.buildNode('tz', now.toLocaleString().substring(now.toLocaleString().lastIndexOf(' ') + 1))]));
          return true;
        }
        return false;
      },

      fnIncomingMessage: function(packet) {
        module.info('XMPP HANDLER(incoming message)');
        var id = packet.getFromJID().getNode() + '@' + packet.getFromJID().getDomain();
        var user = oSDK.user(id);
        var message = new TextMessage({
          from: packet.getFromJID().getNode() + '@' + packet.getFromJID().getDomain(),
          to: xmpp.getClient().id,
          message: packet.getBody().htmlEnc()
        });
        if (user.history) user.history.push(message);
        module.trigger('incomingMessage', message);
      },

      fnOutgoingMessage: function(packet) {
        module.info('XMPP HANDLER(outgoing message)');
        var user = oSDK.user(storage.message.to);
        var message = new TextMessage({
          from: xmpp.getClient().id,
          to: storage.message.to,
          message: packet.getBody().htmlEnc()
        });
        if (user.history) user.history.push(message);
        if (storage.message.success) {
          storage.message.success({
            to: storage.message.to,
            from: storage.message.from,
            message: packet.getBody().htmlEnc()
          });
        }
        storage.message = {
          success: null,
          from: null,
          to: null
        };
        module.trigger('outgoingMessage', message);
      },

      fnIncomingPresence: function(packet) {
        module.info('XMPP HANDLER(incoming presence)');
        var data = self.getPresenceData(packet), user, contact, request;
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
                  contact = storage.contacts.get(data.from);
                  if (contact.status == 'offline' && (contact.subscription == self.OSDK_SUBSCRIPTION_TO || contact.subscription == self.OSDK_SUBSCRIPTION_BOTH)) {
                    contact.status = 'online';
                    module.trigger('contactStatusChanged', {contact: contact});
                    if (!data.show && !data.status && !data.priority && (contact.subscription == self.OSDK_SUBSCRIPTION_FROM || contact.subscription == self.OSDK_SUBSCRIPTION_BOTH)) {
                      self.thatICan(contact.id);
                    }
                  }
                  break;
                // UNAVAILABLE
                case xmpp.OSDK_PRESENCE_TYPE_UNAVAILABLE :
                  contact = storage.contacts.get(data.from);
                  if (contact && contact.status != 'offline') {
                    contact.status = 'offline';
                    contact.capabilities.setTechParams({
                      instantMessaging: false,
                      audioCall: false,
                      videoCall: false,
                      fileTransfer: false
                    });
                    contact.capabilities.setUserParams({
                      instantMessaging: false,
                      audioCall: false,
                      videoCall: false,
                      fileTransfer: false
                    });
                    module.trigger('contactStatusChanged', {contact: contact});
                  }
                  break;
                // SUBSCRIBE
                case self.OSDK_PRESENCE_TYPE_SUBSCRIBE :
                  user = oSDK.user(data.from);
                  user.ask = self.OSDK_PRESENCE_TYPE_SUBSCRIBE;
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
                  user = storage.requests.outgoing.get(data.from);
                  if (user) {
                    if (user.ask) {
                      switch(user.ask) {
                        case self.OSDK_PRESENCE_TYPE_SUBSCRIBE :
                          storage.requests.wasAccepted.put(user);
                          storage.requests.outgoing.rem(user);
                          self.getRoster({
                            "onSuccess": function(params) {
                              if (storage.confirm != user.id) {
                                module.trigger('requestWasAccepted', {contact: storage.contacts.get(user.id)});
                              } else {
                                storage.confirm = null;
                              }
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
                  user = storage.requests.outgoing.get(data.from);
                  if (user) {
                    if (user.ask) {
                      switch(user.ask) {
                        case self.OSDK_PRESENCE_TYPE_SUBSCRIBE :
                          storage.requests.wasRejected.put(user);
                          storage.requests.outgoing.rem(data.from);
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
                          /* TODO */
                          break;
                      }
                    } else {
                      /* TODO */
                    }
                  }
                  break;
              }
            }
            if (data.show || data.status) {
              contact = storage.contacts.get(data.from) || oSDK.user(data.from);
              var oldStatus = contact.status;
              if (data.show) {
                var show = self.decodeStatus(data.show);
                if (show.unreal) {
                  contact.status = show.unreal;
                } else {
                  contact.status = show.real;
                }
              }
              if (data.status) {
                contact.signature = data.status;
              }
              if (data.status || oldStatus != contact.status) {
                module.trigger('contactStatusChanged', {contact: contact});
              }
            }
            if (data.data) {
              module.trigger('receivedData', {
                from: data.from,
                to: storage.client.id,
                data: data.data
              });
            }
            if (data.command) {
              var commandName = data.command.name;
              var commandData = data.command.data;
              if (typeof self.commands[commandName] == 'function') {
                self.commands[commandName]({
                  info: {
                    command: commandName,
                    from: data.from,
                    to: data.to
                  },
                  data: commandData
                });
              }
            }
          }
        }
      },
      fnOutgoingPresence: function(packet) {
        module.info('XMPP HANDLER(outgoing presence)');
        if (connection && connection.connected()) {
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
        }
      },
      fnIncomingPacket: function(packet) {
        /* module.info('XMPP HANDLER(incoming packet)'); */
      },
      fnOutgoingPacket: function(packet) {
        /* module.info('XMPP HANDLER(outgoing packet)'); */
      },
      fnOnConnect: function() {
        module.info('XMPP HANDLER(connect)');
        var clientParams = xmpp.lastClientParams();
        if (!clientParams.status) clientParams.status = 'online';
        storage.client.status = clientParams.status;
        techCapabilities.instantMessaging = true;
        storage.client.capabilities.setTechParams({instantMessaging: techCapabilities.instantMessaging});
        switch(clientParams.status) {
          case 'online' :
            userCapabilities.instantMessaging = true;
            userCapabilities.audioCall = true;
            userCapabilities.videoCall = true;
            userCapabilities.fileTransfer = false;
            break;
          case 'away' :
            userCapabilities.instantMessaging = true;
            userCapabilities.audioCall = true;
            userCapabilities.videoCall = true;
            userCapabilities.fileTransfer = false;
            break;
          case 'do not disturb' :
            userCapabilities.instantMessaging = true;
            userCapabilities.audioCall = false;
            userCapabilities.videoCall = false;
            userCapabilities.fileTransfer = false;
            break;
          case 'x-available' :
            userCapabilities.instantMessaging = false;
            userCapabilities.audioCall = false;
            userCapabilities.videoCall = false;
            userCapabilities.fileTransfer = false;
            break;
        }
        storage.client.capabilities.setUserParams(userCapabilities);
        self.getRoster({
          onError: function(data) {
            /* TODO */
            module.error('Can`t get roster', data);
          },
          onSuccess: function(data) {
            self.iAmLogged({
              onError: function(data) {
                /* TODO */
                module.error('Can`t login', data);
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
        storage.clear();
        connection = null;
        techCapabilities.instantMessaging = false;

        var disconnectInitiator = 'system';
        if(module.disconnectedByUser) {
          disconnectInitiator = 'user';
          module.disconnectedByUser = false;
        }
        module.trigger('disconnected', { initiator: disconnectInitiator });
        return true;
      },
      fnOnError: function(error) {
        module.info('XMPP HANDLER(error)');
        if (connection && connection.connected()) {
          connection.disconnect();
        } else {
          module.trigger('disconnected', { initiator: 'system' });
        }
        storage.clear();
        connection = null;
        techCapabilities.instantMessaging = false;
        module.trigger('connectionFailed', new module.Error({ data: arguments }));

        return false;
      },
      fnOnResume: function() {
        module.info('XMPP HANDLER(resume)');
        return true;
      },
      fnOnStatusChanged: function(status) {
        module.info('XMPP HANDLER(status changed): ', status);
        return true;
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
        params.domain = '';
      } else {
        result += params.domain;
      }
      if (params.domain.split(':').length === 1 && params.port) result += ':' + params.port;
      if (params.url) result += '/' + params.url;
      result += '/';
      return result;
    };

    // Generate roster id

    this.generateRosterId = function() {return 'roster_' + utils.md5(storage.client.id);};

    // Get handlers

    this.getHandlers = function(params) {
      params = params || {};
      var empty = function() {/*---*/};
      var handlers = ((utils.isObject(params)) ? params : {});
      handlers.onError = ((typeof params.onError == 'function') ? params.onError : empty);
      handlers.onSuccess = ((typeof params.onSuccess == 'function') ? params.onSuccess : empty);
      return handlers;
    };

    // Get presence data

    this.getPresenceData = function(packet) {
      var command = false, data = false;
      try {
        if (packet.doc.childNodes[0].childNodes.length) {
          var nodes = packet.doc.childNodes[0].childNodes, len = packet.doc.childNodes[0].childNodes.length, i;
          for (i = 0; i != len; i ++) {
            if (nodes[i].nodeName == 'osdk') {
              var ns = nodes[i].childNodes, l = nodes[i].childNodes.length, t;
              for (t = 0; t != l; t ++) {
                var nn = ns[t].nodeName;
                switch (nn.toLowerCase()) {
                  case 'command' :
                    command = {
                      name: ns[t].getAttribute('name'),
                      data: utils.jsonDecode(ns[t].innerHTML)
                    };
                    break;
                  case 'json' :
                    data = utils.jsonDecode(ns[t].innerHTML);
                    break;
                }
              }
            }
          }
        }
      } catch (eTryToGetPresenceData) { /* --- */ }
      try {
        return {
          from: (packet.getFromJID()._node + '@' + packet.getFromJID()._domain).toLowerCase(),
          to: (packet.getToJID()._node + '@' + packet.getToJID()._domain).toLowerCase(),
          type: packet.getType() || 'available',
          show: packet.getShow() || false,
          status: packet.getStatus() || false,
          priority: packet.getPriority() || false,
          data: data,
          command: command
        };
      } catch (eConvertPresenceData) { return false; }
    };

    // Send presence

    this.sendPresence = function(params) {

      var handlers = self.getHandlers(params);

      if (connection && connection.connected()) {

        params = params || {};

        var presence = new JSJaCPresence();

        if (params.to) presence.setTo(params.to);
        if (params.type) presence.setType(params.type);
        if (params.show) presence.setShow(params.show);
        if (params.status) presence.setStatus(params.status);
        if (params.priority) presence.setPriority(params.priority);

        if (params.command || params.data) {

          var oSDKNode = presence.buildNode('osdk');

          if (params.command) {

            if (params.command.name) {

              var command = presence.buildNode('command');

              command.setAttribute('name', params.command.name);

              if (params.command.data) {

                command.innerHTML = utils.jsonEncode(params.command.data);

              }

              oSDKNode.appendChild(command);

            }

          }

          if (params.data) {

            var json = presence.buildNode('json');

            json.innerHTML = utils.jsonEncode(params.data);

            oSDKNode.appendChild(json);

          }

          presence.appendNode(oSDKNode);

        }

        try {

          connection.send(presence);

          handlers.onSuccess();

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
        data.to = contacts[i].id;
        if (contacts[i].status != 'offline') {
          if (!this.sendPresence(data)) {
            return false;
          }
        }
      }
      return true;
    };

    this.iAmLogged = function(params) {

      var handlers = self.getHandlers(params);

      if (connection && connection.connected()) {

        var thatICan = {};
        thatICan.tech = storage.client.capabilities.getTechParams();
        thatICan.user = storage.client.capabilities.getUserParams();
        thatICan.status = storage.client.status;

        this.sendPresence({
          onError: handlers.onError,
          command: {
            name: 'thatICan',
            data: thatICan
          }
        });

        handlers.onSuccess();

        return true;

      } else {

        handlers.onError();

        return false;

      }
    };

    this.sendMeWhatYouCanToAll = function(params) {

      var i, len = storage.contacts.len(), con = storage.contacts.get();

      for (i = 0; i != len; i ++) {

        self.sendMeWhatYouCan(con[i].id, params);

      }

    };

    this.sendMeWhatYouCan = function(to, params) {
      if (!to) {
        self.sendMeWhatYouCanToAll(params);
        return false;
      }
      var handlers = self.getHandlers(params);
      var contact = storage.contacts.get(to);
      if ((connection && connection.connected()) && contact && (contact.subscription == self.OSDK_SUBSCRIPTION_TO || contact.subscription == self.OSDK_SUBSCRIPTION_BOTH)) {
        this.sendPresence({
          to: to,
          command: {
            name: 'sendMeWhatYouCan'
          },
          onError: handlers.onError
        });
        handlers.onSuccess();
      } else {
        handlers.onError();
        return false;
      }
    };

    this.thatICanToAll = function(params) {

      var handlers = self.getHandlers(params);

      if (connection && connection.connected()) {

        var thatICan = {};
        thatICan.tech = storage.client.capabilities.getTechParams();
        thatICan.user = storage.client.capabilities.getUserParams();
        thatICan.status = storage.client.status;

        var status = self.encodeStatus(storage.client.status);

        var commandName = 'thatICan';

//         if (module.utils.isObject(params) && params.onStart) commandName += 'OnStart';

        var data = {
          command: {
            name: commandName,
            data: thatICan
          },
          onError: handlers.onError
        };

        if (status.real) {
          data.show = status.real;
        } else {
          data.show = 'chat';
        }

        this.sendPresence(data);

        handlers.onSuccess();

        return true;

      } else {

        handlers.onError();

        return false;

      }

    };

    this.thatICan = function(to, params) {

      var handlers = self.getHandlers(params);

      var contact = storage.contacts.get(to);

      if ((connection && connection.connected()) && contact && (contact.subscription == self.OSDK_SUBSCRIPTION_FROM || contact.subscription == self.OSDK_SUBSCRIPTION_BOTH) && contact.status != 'offline') {

        var thatICan = {};
        thatICan.tech = storage.client.capabilities.getTechParams();
        thatICan.user = storage.client.capabilities.getUserParams();
        thatICan.status = storage.client.status;

        var status = self.encodeStatus(storage.client.status);

        var commandName = 'thatICan';

//         if (module.utils.isObject(params) && params.onStart) commandName += 'OnStart';

        var data = {
          to: to,
          command: {
            name: commandName,
            data: thatICan
          },
          onError: handlers.onError
        };

        if (status.real) {
          data.show = status.real;
        } else {
          data.show = 'chat';
        }

        this.sendPresence(data);

        handlers.onSuccess();

        return true;

      } else {

        handlers.onError();

        return false;

      }
    };

    // Get roster

    this.getRoster = function(params) {

      // Get handlers from params
      var handlers = self.getHandlers(params);

      if (connection && connection.connected()) {

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
              storage.requests.outgoing.clear();

            }

            for (i = 0; i != len; i ++) {

              var jid = nodes.childNodes[i].getAttribute('jid').toLowerCase();

              if (!oSDK.utils.isValidID(jid)) {
                if (oSDK.utils.isValidLogin(jid)) {
                  continue;
                }
              }

              if (jid != storage.client.id) {

                var user = oSDK.user(jid);

                user.status = 'offline';

                var ask = nodes.childNodes[i].getAttribute('ask');
                var subscription = nodes.childNodes[i].getAttribute('subscription');

                user.ask = false;

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
                }

                user.subscription = false;

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
                }

                if (user) storage.roster.put(user);

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
                  storage.requests.outgoing.put(roster[i]);
                }

                if (addToContacts) storage.contacts.put(roster[i]);

              }

            }

            var data = {
              contacts: storage.contacts.get(),
              acceptedRequests: storage.requests.accepted.get(),
              rejectedRequests: storage.requests.rejected.get(),
              incomingRequests: storage.requests.incoming.get(),
              outgoingRequests: storage.requests.outgoing.get()
            };

            module.trigger('gotNewRoster', {"data": data});

            handlers.onSuccess({"data": data});

            if (storage.logged) {

              self.sendMeWhatYouCan();

            }

          }

        });

        return true;

      } else {

        handlers.onError();

        return false;

      }

    };

    // Add to roster contact with subscription "none"

    this.addToRoster = function(jid, params) {

      var handlers = self.getHandlers(params), error = false, contact, request;

      if (!connection || !connection.connected()) error = 1;

      if (!error && (module.utils.isEmpty(jid) || !module.utils.isString(jid) || !module.utils.isValidID(jid))) error = 2;

      if (!error && jid == storage.client.id) error = 3;

      request = storage.requests.incoming.get(jid);
      if (!error && request) error = 4;

      request = storage.requests.outgoing.get(jid);
      if (!error && request) error = 5;

      contact = storage.contacts.get(jid);
      if (!error && contact) error = 6;

      if (error) {
        var messages = [
          'No connection to the server',
          'Wrong Login format',
          'You can not add youself to contact list',
          'The request has been already sent to this contact',
          'This contact has already made request',
          'This contact is already in your contact list'
        ];
        handlers.onError({
          number: error,
          message: messages[error - 1]
        });
        return false;
      }

      var iq = new JSJaCIQ(); iq.setType('set');
      var query = iq.setQuery('jabber:iq:roster');
      var item = query.appendChild(iq.buildNode('item', { 'xmlns': 'jabber:iq:roster', 'jid': jid })); item.setAttribute('subscription', 'none');

      connection.send(iq);

      self.getRoster(handlers);

      return true;

    };

    // Add & Remove (|| delete) Contact

    this.addContact = function(jid, params) {

      var handlers = self.getHandlers(params), error = false, contact = false, request = false;

      if (!connection || !connection.connected()) error = 1;
      if (!error && (module.utils.isEmpty(jid) || !module.utils.isString(jid) || !module.utils.isValidID(jid))) error = 2;
      if (jid == storage.client.id) error = 3;

      if (!error) {
        request = storage.requests.incoming.get(jid);
      }
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
      request = false;
      if (!error) {
        request = storage.requests.outgoing.get(jid);
      }
      if (request) {
        switch(request.ask) {
          case self.OSDK_ROSTER_ASK_SUBSCRIBE :
            handlers.onSuccess();
            return true;
          case self.OSDK_ROSTER_ASK_UNSUBSCRIBE :
            /* Auto response from presence controller */
            break;
        }
      }
      if (!error) {
        contact = storage.contacts.get(jid);
      }
      if (contact && (contact.ask || contact.subscription != 'none')) {
        if (contact.ask && contact.ask == self.OSDK_PRESENCE_TYPE_SUBSCRIBE) {
          error = 4;
        } else {
          if (contact.subscription == self.OSDK_SUBSCRIPTION_TO || contact.subscription == self.OSDK_SUBSCRIPTION_BOTH) error = 6;
        }
      }
      if (error) {
        var messages = [
          'No connection to the server',
          'Wrong Login format',
          'You can not add youself to contact list',
          'The request has been already sent to this contact',
          'This contact has already made request',
          'This contact is already in your contact list'
        ];
        handlers.onError({
          number: error,
          message: messages[error - 1]
        });
        return false;
      } else {
        self.sendPresence({
          to: jid,
          type: xmpp.OSDK_PRESENCE_TYPE_SUBSCRIBE
        });
        var usr = oSDK.user(jid);
        usr.ask = xmpp.OSDK_PRESENCE_TYPE_SUBSCRIBE;
        usr.subscription = xmpp.OSDK_SUBSCRIPTION_NONE;
        module.trigger('outgoingRequest', {contact: usr});
        self.getRoster(handlers);
      }
      return true;
    };

    this.removeContact = function(jid, params) {

      var handlers = self.getHandlers(params), contact = false;

      if (!connection || !connection.connected()) {
        handlers.onError();
        return false;
      } else {
        if (module.utils.isObject(jid)) {
          if (jid.id) {
            contact = storage.contacts.get(jid.id);
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
            to: contact.id,
            type: xmpp.OSDK_PRESENCE_TYPE_UNSUBSCRIBE
          });
          self.deleteContact(contact.id, {
            "onError": handlers.onError,
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

      if (!connection || !connection.connected()) {
        handlers.onError();
        return false;
      } else {
        if (module.utils.isObject(jid)) {
          jid = jid.id;
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
          to: request.id,
          type: self.OSDK_PRESENCE_TYPE_SUBSCRIBED
        });
        storage.requests.accepted.put(request);
        storage.requests.incoming.rem(request);
        storage.confirm = jid;
        self.sendPresence({
          to: request.id,
          type: self.OSDK_PRESENCE_TYPE_SUBSCRIBE
        });
        self.getRoster({
          "onError": handlers.onError,
          "onSuccess": function(params) {
            self.thatICan(request.id);
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
          to: request.id,
          type: self.OSDK_PRESENCE_TYPE_UNSUBSCRIBED
        });
        storage.requests.rejected.put(request);
        storage.requests.incoming.rem(request);
        self.deleteContact(request.id, handlers);
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
          case 'online' :
            result.real = 'chat';
            break;
          case 'away' :
            result.real = 'away';
            break;
          case 'do not disturb' :
            result.real = 'dnd';
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
            result.real = 'online';
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
            result.real = 'online';
            result.unreal = status;
            break;
        }
      }
      return result;
    };

    // Send free date to other contact

    this.sendData = function(to, data, params) {
      if (connection && connection.connected()) {
        if (!utils.isObject(data)) data = {data: data};
        self.sendPresence({to: to, data: data}, params);
        return true;
      } else {
        throw new oSDK.Error('Not connected to send data!');
      }
    };

    this.sendDataToAll = function(data, params) {
      if (connection && connection.connected()) {
        if (!utils.isObject(data)) data = {data: data};
        var contacts = storage.contacts.get(), len = storage.contacts.len(), i;
        for (i = 0; i != len; i ++) {
          if ((contacts[i].subscription == self.OSDK_SUBSCRIPTION_FROM || contacts[i].subscription == self.OSDK_SUBSCRIPTION_BOTH) && contacts[i].status != 'offline') {
            self.sendPresence({to: contacts[i].id, data: data}, params);
          }
        }
        return true;
      } else {
        throw new oSDK.Error('Not connected to send data!');
      }
    };

    // Set status & capabilities, system or not

    this.setStatus = function() {

      var handlers = self.getHandlers(params);

      var params = {}, argument;

      switch(arguments.length) {
        case 1 :
          argument = arguments[0];
          if (utils.isString(argument)) {
            params.status = argument;
          } else {
            if (utils.isObject(argument)) {
              if (typeof argument.status != 'undefined' && utils.isString(argument.status)) params.status = argument.status;
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
            params.status = arguments[0];
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
      if (!connection || !connection.connected()) {
        handlers.onError();
        return false;
      } else {
        var presence = {data: {}}, data = false;
        if (typeof params.status != 'undefined') {
          storage.client.status = params.status;
        }
        lastClientParams.status = storage.client.status;
        userCapabilities.instantMessaging = params.instantMessaging;
        userCapabilities.audioCall = params.audioCall;
        userCapabilities.videoCall = params.videoCall;
        userCapabilities.fileTransfer = params.fileTransfer;
        storage.client.capabilities.setUserParams(userCapabilities);
        self.thatICanToAll(handlers);
      }
      return true;
    };

    this.setStatusOnline = function(params) {
      userCapabilities = {
        instantMessaging: true,
        audioCall: true,
        videoCall: true,
        fileTransfer: false
      };
      storage.client.capabilities.setUserParams(userCapabilities);
      lastClientParams.status = 'online';
      storage.client.status = lastClientParams.status;
      self.thatICanToAll(params || {});
    };

    this.setStatusAway = function(params) {
      userCapabilities = {
        instantMessaging: true,
        audioCall: true,
        videoCall: true,
        fileTransfer: false
      };
      storage.client.capabilities.setUserParams(userCapabilities);
      lastClientParams.status = 'away';
      storage.client.status = lastClientParams.status;
      self.thatICanToAll(params || {});
    };

    this.setStatusDoNotDisturb = function(params) {
      userCapabilities = {
        instantMessaging: true,
        audioCall: false,
        videoCall: false,
        fileTransfer: false
      };
      storage.client.capabilities.setUserParams(userCapabilities);
      lastClientParams.status = 'do not disturb';
      storage.client.status = lastClientParams.status;
      self.thatICanToAll(params || {});
    };

    this.setStatusXAvailable = function(params) {
      userCapabilities = {
        instantMessaging: true,
        audioCall: false,
        videoCall: false,
        fileTransfer: false
      };
      storage.client.capabilities.setUserParams(userCapabilities);
      lastClientParams.status = 'x-available';
      storage.client.status = lastClientParams.status;
      self.thatICanToAll(params || {});
    };

    this.sendMessage = function(to, msg, params) {

      var handlers = self.getHandlers(params);

      if (!connection || !connection.connected()) {
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
        jid = to.id;
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
        from: storage.client.id,
        to: jid
      };

      var message = new JSJaCMessage();
      message.setTo(new JSJaCJID(jid));
      message.setBody(msg);
      connection.send(message);

    };

    this.getClient = function() { return storage.client; };
    this.getContact = function(id) { return storage.contacts.get(id); };
    this.getContacts = function() { return storage.contacts.get(); };
    this.getAcceptedRequest = function(id) { return storage.requests.accepted.get(id); };
    this.getRejectedRequest = function(id) { return storage.requests.rejected.get(id); };
    this.getIncomingRequest = function(id) { return storage.requests.incoming.get(id); };
    this.getOutgoingRequest = function(id) { return storage.requests.outgoing.get(id); };
    this.getAcceptedRequests = function() { return storage.requests.accepted.get(); };
    this.getRejectedRequests = function() { return storage.requests.rejected.get(); };
    this.getIncomingRequests = function() { return storage.requests.incoming.get(); };
    this.getOutgoingRequests = function() { return storage.requests.outgoing.get(); };

    // Initiation

    module.on(['connectionFailed', 'disconnecting'], function(data) {
      if (arguments[0].type == 'disconnecting') {
        module.disconnectedByUser = (data.initiator == 'user')?true:false;
      }
      if (connection && connection.connected()) {
        // Disconnect and generate `disconnected` event.
        connection.disconnect();
      } else {
        // Just generate `disconnected` event.
        module.trigger('disconnected');
      }
      return true;
    });

    module.on('gotTempCreds', function() {
      // Check & define params
      var server = module.config('connection.server');
      server.domain = arguments[0].data.uris.xmpp[0].split(';')[0];
      var params = {
        debug: module.config('connection.debug'),
        timer: module.config('connection.timer'),
        server: ((utils.isString(server)) ? server : self.generateServerUrl(server)),
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
      connection.registerHandler('message_out', xmpp.handlers.fnOutgoingMessage);
      connection.registerHandler('presence_in', xmpp.handlers.fnIncomingPresence);
      connection.registerHandler('presence_out', xmpp.handlers.fnOutgoingPresence);
      connection.registerHandler('packet_in', xmpp.handlers.fnIncomingPacket);
      connection.registerHandler('packet_out', xmpp.handlers.fnOutgoingPacket);
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

    // Media capabilities
    module.on('gotMediaCapabilities', function(e) {
      module.log('Got media capabilities', e);
      techCapabilities.audioCall = !!e.audio;
      techCapabilities.videoCall = !!e.video;
      if (storage && storage.client) {
        storage.client.capabilities.setTechParams({
          audioCall: techCapabilities.audioCall,
          videoCall: techCapabilities.videoCall
        });
      }
      if (connection && connection.connected()) {
        xmpp.thatICanToAll();
      }
      return true;
    });

    // Disconnect
    module.on('disconnecting', function (data) {
      module.log('Started disconnect process');
      if (connection && connection.connected()) {
        connection.disconnect();
      }
      return true;
    });

  }

  if (oSDK && JSJaC) {

    // Inner exemplar of inner XMPP module

    module = new oSDK.utils.Module('xmpp');

    // User manual disconnect flag.
    module.disconnectedByUser = false;

    // Module specific DEBUG.
    module.debug = true;

    xmpp = new XMPP();

    // Register public methods

    xmpp.registerMethods({

      /**
       * Returns current authorized client
       *
       * @memberof RosterAPI
       * @method oSDK.getClient
       * @returns {object} SDKUser
       */
      "getClient": xmpp.getClient,

      /**
       * Get roster from server and parse him
       *
       * @memberof RosterAPI
       * @method oSDK.getRoster
       * @param {object} Callbacks
       * @param {object} Callbacks.onError
       * @param {object} Callbacks.onSuccess
       * @returns {bool}
       */
      "getRoster": xmpp.getRoster,

      /**
       * Return contact from contacts list by User.login or User.id
       *
       * @memberof RosterAPI
       * @method oSDK.getContact
       * @param {string} User.id
       * @returns {object} SDKUser
       */
      "getContact": xmpp.getContact,

      /**
       * Return contacts list
       *
       * @memberof RosterAPI
       * @method oSDK.getContacts
       * @returns {array} Contacts list
       */
      "getContacts": xmpp.getContacts,

      /**
       * Returns accepted request by login or id
       *
       * @memberof PresenceAPI
       * @method oSDK.getAcceptedRequest
       * @param {string} User.id
       * @returns {object} SDKUser
       */
      "getAcceptedRequest": xmpp.getAcceptedRequest,

      /**
       * Returns rejected recuest by login or id
       *
       * @memberof PresenceAPI
       * @method oSDK.getRejectedRequest
       * @param {string} User.id
       * @returns {object} SDKUser
       */
      "getRejectedRequest": xmpp.getRejectedRequest,

      /**
       * Returns incoming request by login or id
       *
       * @memberof PresenceAPI
       * @method oSDK.getIncomingRequest
       * @param {string} User.id
       * @returns {object} SDKUser
       */
      "getIncomingRequest": xmpp.getIncomingRequest,

      /**
       * Returns outgoing request by login or id
       *
       * @memberof PresenceAPI
       * @method oSDK.getOutgoingRequest
       * @param {string} User.id
       * @returns {object} SDKUser
       */
      "getOutgoingRequest": xmpp.getOutgoingRequest,

      /**
       * Returns list of accepted requests
       *
       * @memberof PresenceAPI
       * @method oSDK.getAcceptedRequests
       * @returns {array} List of accepted requests
       */
      "getAcceptedRequests": xmpp.getAcceptedRequests,

      /**
       * Returns list of rejected requests
       *
       * @memberof PresenceAPI
       * @method oSDK.getRejectedRequests
       * @returns {array} List of rejected requests
       */
      "getRejectedRequests": xmpp.getRejectedRequests,

      /**
       * Returns list of incoming requests
       *
       * @memberof PresenceAPI
       * @method oSDK.getIncomingRequests
       * @returns {array} List of incoming requests
       */
      "getIncomingRequests": xmpp.getIncomingRequests,

      /**
       * Returns list of outgoing requests
       *
       * @memberof PresenceAPI
       * @method oSDK.getOutgoingRequests
       * @returns {array} List of outgoing requests
       */
      "getOutgoingRequests": xmpp.getOutgoingRequests,

      /**
       * Accept request from other user
       *
       * @memberof PresenceAPI
       * @method oSDK.acceptRequest
       * @returns {object} SDKUser
       */
      "acceptRequest": xmpp.acceptRequest,

      /**
       * Reject request from other user
       *
       * @memberof PresenceAPI
       * @method oSDK.rejectRequest
       * @returns {object} SDKUser
       */
      "rejectRequest": xmpp.rejectRequest,

      /**
       * Send your data to other contact
       *
       * @memberof PresenceAPI
       * @method oSDK.sendData
       * @param {string} to - contact id
       * @param {object} data - your data
       * @param {object} Callbacks
       * @param {function} Callbacks.onError
       * @param {function} Callbacks.onSuccess
       * @returns {boolean} true
       */
      "sendData": xmpp.sendData,

      /**
       * Send your data to all contacts from contacts list
       *
       * @memberof PresenceAPI
       * @method oSDK.sendDataToAll
       * @param {object} data - your data
       * @param {object} Callbacks
       * @param {function} Callbacks.onError
       * @param {function} Callbacks.onSuccess
       * @returns {boolean} true
       */
      "sendDataToAll": xmpp.sendDataToAll,

      /**
       * Set status or/and capabilities to current auth client
       *
       * @memberof PresenceAPI
       * @method oSDK.setStatus
       * @param {object} Params
       * @param {string} Params.status maybe: 'available' or 'chat', 'away', 'do not disturb' or 'dnd', 'x-available' or 'xa'
       * @param {bool} Params.instantMessaging
       * @param {bool} Params.audioCall
       * @param {bool} Params.videoCall
       * @param {bool} Params.fileTransfer
       * @param {object} Callbacks
       * @param {function} Callbacks.onError
       * @param {function} Callbacks.onSuccess
       * @returns {bool} True or False
       */
      "setStatus": xmpp.setStatus,

      /**
       * Set status 'available' (XMPP.chat) to current auth client and set:<br />
       * Client.capability.instantMessaging to true<br />
       * Client.capability.audioCall to true<br />
       * Client.capability.videoCall to true<br />
       * Client.capability.fileTransfer to true
       *
       * @memberof PresenceAPI
       * @method oSDK.setStatusAvailable
       * @param {object} Callbacks
       * @param {function} Callbacks.onError
       * @param {function} Callbacks.onSuccess
       * @returns {bool} True or False
       */
      "setStatusOnline": xmpp.setStatusOnline,

      /**
       * Set status 'away' (XMPP.away) to current auth client and set:<br />
       * Client.capability.instantMessaging to true<br />
       * Client.capability.audioCall to true<br />
       * Client.capability.videoCall to true<br />
       * Client.capability.fileTransfer to true
       *
       * @memberof PresenceAPI
       * @method oSDK.setStatusAway
       * @param {object} Callbacks
       * @param {function} Callbacks.onError
       * @param {function} Callbacks.onSuccess
       * @returns {bool} True or False
       */
      "setStatusAway": xmpp.setStatusAway,

      /**
       * Set status 'do not disturb' (XMPP.dnd) to current auth client and set:<br />
       * Client.capability.instantMessaging to true<br />
       * Client.capability.audioCall to false<br />
       * Client.capability.videoCall to false<br />
       * Client.capability.fileTransfer to false
       *
       * @memberof PresenceAPI
       * @method oSDK.setStatusDoNotDisturb
       * @param {object} Callbacks
       * @param {function} Callbacks.onError
       * @param {function} Callbacks.onSuccess
       * @returns {bool} True or False
       */
      "setStatusDoNotDisturb": xmpp.setStatusDoNotDisturb,

      /**
       * Set status 'x-available' (XMPP.xa) to current auth client and set:<br />
       * Client.capability.instantMessaging to false<br />
       * Client.capability.audioCall to true<br />
       * Client.capability.videoCall to true<br />
       * Client.capability.fileTransfer to false
       *
       * @memberof PresenceAPI
       * @method oSDK.setStatusXAvailable
       * @param {object} Callbacks
       * @param {function} Callbacks.onError
       * @param {function} Callbacks.onSuccess
       * @returns {bool} True or False
       */
      "setStatusXAvailable": xmpp.setStatusXAvailable,

      /**
       * Send text message
       *
       * @memberof MessagingAPI
       * @method oSDK.sendMessage
       * @param {string} to - ID of contact
       * @param {string} message - Text message
       * @param {object} callbacks
       * @param {function} callbacks.onError - Erorr handler
       * @param {function} callbacks.onSuccess - Success handler
       */
      "sendMessage": xmpp.sendMessage,

      /**
       * Add contact to roster without subscription request
       *
       * @memberof RosterAPI
       * @method oSDK.addToRoster
       * @param {string} User.id
       * @param {object} Callbacks
       * @param {function} Callbacks.onError
       * @param {function} Callbacks.onSuccess
       */
      "addToRoster": xmpp.addToRoster,

      /**
       * Add contact to roster
       *
       * @memberof RosterAPI
       * @method oSDK.addContact
       * @param {string} to - User.id
       * @param {object} Callbacks
       * @param {function} Callbacks.onError
       * @param {function} Callbacks.onSuccess
       */
      "addContact": xmpp.addContact,

      /**
       * Remove contact from roster
       *
       * @memberof RosterAPI
       * @method oSDK.removeContact
       * @param {string} to - User.id
       * @param {object} Callbacks
       * @param {function} Callbacks.onError
       * @param {function} Callbacks.onSuccess
       */
      "removeContact": xmpp.removeContact

    });

  }

})();
