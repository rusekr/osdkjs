/*
 * oSDK XMPP module
 * with JSJaC library
 */

(function(oSDK, JSJaC) {

  // Strict mode
  "use strict";

    // oSDK XMPP general object
    var IXMPP = function() {

      // Save instance
      var instance = this;

      // Connection
      this.connection = null;

      // Storage
      this.storage = null;

      /*
       * Constants
       */

      // XMPP subscriptions types
      this.XMPP_SUBSCRIPTION_NONE = 'none';
      this.XMPP_SUBSCRIPTION_FROM = 'from';
      this.XMPP_SUBSCRIPTION_TO = 'to';
      this.XMPP_SUBSCRIPTION_BOTH = 'both';

      // XMPP presences types
      this.XMPP_PRESENCE_TYPE_AVAILABLE = 'available';
      this.XMPP_PRESENCE_TYPE_UNAVAILABLE = 'unavailable';
      this.XMPP_PRESENCE_TYPE_SUBSCRIBE = 'subscribe';
      this.XMPP_PRESENCE_TYPE_SUBSCRIBED = 'subscribed';
      this.XMPP_PRESENCE_TYPE_UNSUBSCRIBE = 'unsubscribe';
      this.XMPP_PRESENCE_TYPE_UNSUBSCRIBED = 'unsubscribed';
      this.XMPP_PRESENCE_TYPE_PROBE = 'probe';
      this.XMPP_PRESENCE_TYPE_ERROR = 'error';

      // XMPP presences shows
      this.XMPP_PRESENCE_SHOW_CHAT = 'chat';
      this.XMPP_PRESENCE_SHOW_AWAY = 'away';
      this.XMPP_PRESENCE_SHOW_DND = 'dnd';
      this.XMPP_PRESENCE_SHOW_XA = 'xa';

      /*
       * Factory of {IClient}, {IContact}, {IRequest} and {IConference}
       */

      this.factory = {};

      this.create = {};

      // Define inner factoryes
      if (typeof oSDKModule.factory.user != 'undefined') {

        this.factory.user = new oSDKModule.factory.user();

        this.create.user = this.factory.user.create;

        /*
         * New factories
         */

        // {IHistory} factory
        if (typeof oSDKModule.factory.history != 'undefined') {
          this.factory.history = new oSDKModule.factory.history();
          this.create.history = this.factory.history.create;
        } else {
          this.factory.history = false;
          this.create.history = function() {};
        }

        // {IClient} factory
        oSDKModule.registerObjects({
          client: {
            create: function(id, resource) {
              var result = instance.create.user(id, resource);
              if (result) {

                /*
                 * Properties
                 */

                result.status = instance.XMPP_PRESENCE_TYPE_AVAILABLE;
                result.signature = '';
                result.params = {};

                /*
                 * History
                 */

                if (instance.factory.history) {
                  result.history = instance.create.history(id, id);
                } else {
                  result.history = false;
                }

                /*
                 * Methods
                 */

                // Set status
                result.setStatus = (function(data, callbacks) {
                  return oSDKModule.general.setStatus(data, callbacks);
                }).bind(result);

                // Set signature
                result.setSignature = (function(data, callbacks) {
                  return oSDKModule.general.setSignature(data, callbacks);
                }).bind(result);

              }
              return result;
            }
          }
        });

        // {IContact} factory
        oSDKModule.registerObjects({
          contact: {
            create: function(id, resource) {
              var result = instance.create.user(id, resource);
              if (result) {

                /*
                 * Properties
                 */

                result.jid = id;
                if (!resource) result.resource = '';
                result.nickname = ((id.split('/')[0]).split('@')[0]);
                result.available = false;
                result.ask = false;
                result.subscription = instance.XMPP_SUBSCRIPTION_NONE;
                result.status = instance.XMPP_PRESENCE_TYPE_UNAVAILABLE;
                result.signature = '';
                result.group = 'general';
                result.params = oSDKModule.general.getUnavailableStatusParams();
                result.disco = [];

                /*
                 * History
                 */

                if (instance.factory.history) {
                  result.history = instance.create.history(instance.storage.client.id, id);
                } else {
                  result.history = false;
                }

                /*
                 * Methods
                 */

                // Send data
                result.sendData = (function(data, callbacks) {
                  return oSDKModule.general.sendData(this.jid || this.id, data, callbacks);
                }).bind(result);

                // Send message
                result.sendMessage = (function(data, callbacks) {
                  return oSDKModule.general.sendMessage(this.jid || this.id, data, callbacks);
                }).bind(result);

              }
              return result;
            }
          }
        });

        // {IRequest} factory
        oSDKModule.registerObjects({
          request: {
            create: function(id, resource) {
              var result = instance.create.user(id, resource);
              if (result) {

                /*
                 * Methods
                 */

                // Accept request
                result.accept = (function(callbacks) {
                  return oSDKModule.general.acceptRequest(this.jid || this.id, callbacks);
                }).bind(result);

                // Reject request
                result.reject = (function(callbacks) {
                  return oSDKModule.general.rejectRequest(this.jid || this.id, callbacks);
                }).bind(result);

              }
              return result;
            }
          }
        });

        // {IConference} factory
        oSDKModule.registerObjects({
          conference: {
            create: function(id, resource) {
              var result = instance.create.user(id, resource);
              if (result) {

              }
              return result;
            }
          }
        });

      } else {
        return false;
      }

      // {IClient} factory
      if (typeof oSDKModule.factory.client != 'undefined') {
        this.factory.client = new oSDKModule.factory.client();
        this.create.client = this.factory.client.create;
      }

      // {IContact} factory
      if (typeof oSDKModule.factory.contact != 'undefined') {
        this.factory.contact = new oSDKModule.factory.contact();
        this.create.contact = this.factory.contact.create;
      }

      // {IRequest} factory
      if (typeof oSDKModule.factory.request != 'undefined') {
        this.factory.request = new oSDKModule.factory.request();
        this.create.request = this.factory.request.create;
      }

      // {IConference} factory
      if (typeof oSDKModule.factory.conference != 'undefined') {
        this.factory.conference = new oSDKModule.factory.conference();
        this.create.conference = this.factory.conference.create;
      }

      // Attach other components to this object
      this.attach = function(params, filter) {
        var i;
        for (i in params) {
          if (!filter || (filter && oSDKModule.utils.isArray(filter) && filter.indexOf(i) == -1)) {
            if (typeof params[i] != 'function') {
              instance[i] = params[i];
            } else {
              instance[i] = params[i].bind(instance);
            }
          }
        }
      };

      // Got temp creds (Launch)
      oSDKModule.on('gotTempCreds', function() {
        var server = instance.config('connection.server');
        server.domain = server.domain || arguments[0].data.services.xmpp[0].uri.split(';')[0];
        var username = arguments[0].data.services.xmpp[0].username || arguments[0].data.username.split(':')[1];
        var login = username.split('@')[0];
        // NOTICE: cut plus in login optional hack
        login = instance.config('connection.hack_plus_on_login') ? (login.charAt(0) == '+' ? login.substr(1) : login) : login;
        var params = {
          debug: instance.config('debug'),
          timer: instance.config('connection.timer'),
          server: ((oSDKModule.utils.isString(server)) ? server : instance.generateServerUrl(server)),
          login: login,
          password: arguments[0].data.services.xmpp[0].password || arguments[0].data.password,
          domain: username.split('@')[1],
          resource: (instance.config('resource') || 'oSDK-client-' + oSDKModule.utils.uuid().replace('-', '')),
          timestamp: arguments[0].data.username.split(':')[0] || null
        };
        instance.authDomainHelper = arguments[0].data.authDomainHelper;
        instance.storage = new instance.classes.IStorage(params);
        instance.createConnection(params);
        return undefined;
      });

      // Disconnection
      oSDKModule.on('disconnecting', function (data) {
        oSDKModule.disconnectedByUser = (data.initiator == 'user') ? true : false;
        oSDKModule.connectionIsAborted = false;
        if (instance.test('connection')) {
          instance.connection.disconnect();
        } else {
          try {
            oSDKModule.connectionIsAborted = true;
            instance.connection._abort();
          } catch (eAbort) {
            oSDKModule.trigger('disconnected');
          }
        }
        return undefined;
      });

    };

  // Compatibility test
  if (oSDK && JSJaC) {

    // Create new oSDK module
    var oSDKModule = new oSDK.utils.Module('xmpp'); oSDKModule.debug = true; oSDKModule.disconnectedByUser = false;

    // Compatibility
    oSDKModule.checkCompatibility = function sipCheckCompatibility() {
      var err;
      if(!window.WebSocket) {
        err = new oSDKModule.Error({
          ecode: '0004',
          message: 'Your browser do not support WebSocket.'
        });
        oSDKModule.trigger(['incompatible', 'connectionFailed'], err);
      }
    };

    oSDKModule.on('DOMContentLoaded', function () {
      oSDKModule.checkCompatibility();
    });

    // Create general component of oSDK XMPP module
    oSDKModule.general = new IXMPP();

  }

})(oSDK, JSJaC);