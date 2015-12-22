/*
 * oSDK XMPP module
 * with JSJaC library
 */

(function(oSDK, JSJaC) {

  // Strict mode
  "use strict";

  // Compatibility test
  if (oSDK && JSJaC) {

    // oSDK XMPP module
    var module = oSDK.utils.modules.xmpp;

    // General component of oSDK XMPP module
    var general = module.general;

    // oSDK Utilities
    var utils = module.utils;

    /*
     * Private variables
     */



    /*
     * Private methods
     */

    var methods = {

      getId: function(param) {
        if (param) {
          if (utils.isString(param) && utils.isValidID(param)) {
            return param;
          } else {
            if (utils.isObject(param) && param.id && utils.isValidID(param.id)) {
              return param.id;
            }
            if (utils.isObject(param) && param.id && utils.isValidLogin(param.id)) {
              return general.authDomainHelper(param.id);
            }
          }
          if (utils.isString(param) && utils.isValidLogin(param)) {
            return general.authDomainHelper(param);
          }
        }
        return undefined;
      },

      debug: function() {
        var print = false, debug = this.config('debug');
        if (debug && (debug === 5 || debug === 6)) {
          print = true;
        } else {
          if (this.storage && this.storage.params && (this.storage.params.debug == 5 || this.storage.params.debug == 6)) {
            print = true;
          }
        }
        if (arguments.length && print) {
          switch (arguments.length) {
            case 1 :
              module.info(arguments[0]);
              break;
            case 2 :
              module.info(arguments[0], arguments[1]);
              break;
            default :
              module.info(arguments);
              break;
          }
        }
        return undefined;
      },

      generateServerUrl: function(params) {
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
      },

      generateRosterID: function() {
        if (this.storage && this.storage.client.id) {
          return 'roster_' + this.storage.client.login;
        }
        return 'roster_is_undefined';
      },

      prepareHandlers: function(params) {
        params = (utils.isObject(params)) ? params : {};
        var empty = function() {/* empty function */};
        return {
          onError: ((typeof params.onError == 'function') ? params.onError : empty),
          onSuccess: ((typeof params.onSuccess == 'function') ? params.onSuccess : empty)
        };
      },

      createConnection: function(params) {
        this.debug ('Create new connection: ', params);
        var debug = false;
        if (params.debug || params.debug === 0) {
          if (utils.isBoolean(params.debug)) {
            if (params.debug) {
              debug = new JSJaCConsoleLogger(3);
            } else {
              debug = new JSJaCConsoleLogger(0);
            }
          } else {
            if (utils.isNumber(params.debug)) {
              if (params.debug == 6) {
                /* No JSJaC debug */
              } else {
                if (params.debug == 5) {
                  debug = new JSJaCConsoleLogger(3);
                } else {
                  debug = new JSJaCConsoleLogger(params.debug);
                }
              }
            }
          }
        }
        this.connection = new JSJaCWebSocketConnection({
          oDbg: debug,
          timerval: (params.timer) ? params.timer : 2000,
          httpbase: params.server
        });
        this.connection.registerHandler('onConnect', this.handlers.connection.fnOnConnect);
        this.connection.registerHandler('onDisconnect', this.handlers.connection.fnOnDisconnect);
        this.connection.registerHandler('onError', this.handlers.connection.fnOnError);
        this.connection.registerHandler('onResume', this.handlers.connection.fnOnResume);
        this.connection.registerHandler('onStatusChanged', this.handlers.connection.fnOnStatusChanged);
        this.connection.registerHandler('iq', this.handlers.iq.fnOnIq);
        this.connection.registerIQGet('query', NS_TIME, this.handlers.iq.fnOnIqTime);
        this.connection.registerIQGet('query', NS_VERSION, this.handlers.iq.fnOnIqVersion);
        this.connection.registerHandler('message_in', this.handlers.message.fnOnIncoming);
        this.connection.registerHandler('message_out', this.handlers.message.fnOnOutgoing);
        this.connection.registerHandler('presence_in', this.handlers.presence.fnOnIncoming);
        this.connection.registerHandler('presence_out', this.handlers.presence.fnOnOutgoing);
        this.connection.registerHandler('packet_in', this.handlers.packet.fnOnIncoming);
        this.connection.registerHandler('packet_out', this.handlers.packet.fnOnOutgoing);
        this.connection.connect({
          domain: params.domain,
          resource: params.resource,
          username: params.login,
          password: params.password
        });
      },

      destroyConnection: function() {
        if (this.storage) this.storage.destroy();
        this.storage = null;
        
        this.connection = null;
      },

      test: function(param1, param2) {
        var result = false;
        switch (param1) {
          case 'connection' :
            if (this.connection && utils.isObject(this.connection) && this.connection.connected && this.connection.connected()) {
              result = true;
            }
            break;
          case 'valide id' :
            if (param2 && utils.isString(param2) && utils.isValidID(param2)) {
              result = true;
            }
            break;
          case 'client id' :
            if (this.test('valide id', param2) && this.storage && (this.storage.client.id == param2 || (this.storage.client.jid && this.storage.client.jid == param2))) {
              result = true;
            }
            break;
          case 'item name' :
            if (param2 && utils.isString(param2) && utils.isValidName(param2)) {
              result = true;
            }
            break;
          case 'item group' :
            if (param2 && utils.isString(param2)) {
              result = true;
            }
            break;
          case 'contact exists' :
            if (general.storage.contacts.get(param2)) {
              result = true;
            }
            break;
          case 'request exists' :
            if (general.storage.requests.get(param2)) {
              result = true;
            }
            break;
        }
        return result;
      }

    };

    /*
     * Attachment
     */

    general.attach(methods);

  }

})(oSDK, JSJaC);