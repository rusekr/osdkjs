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

    // Keys generator
    var key = function (value) {
      if (utils) {
        return '_' + utils.md5(value.toLowerCase());
      }
      return '_' + value;
    };

    /*
     * Statuses
     */

    var statuses = {};

    // Type = unavailable, show = undefined
    statuses[key('unavailable')] = {
      name: 'unavailable',
      xmpp: {type: 'unavailable'}
    };

    // Type = undefined, show = undefined
    statuses[key('available')] = {
      name: 'available',
      xmpp: {type: 'available'}
    };

    // Type = undefined, show = chat
    statuses[key('chat')] = {
      name: 'chat',
      xmpp: {show: 'chat'}
    };

    // Type = undefined, show = away
    statuses[key('away')] = {
      name: 'away',
      xmpp: {show: 'away'}
    };

    // Type = undefined, show = dnd
    statuses[key('dnd')] = {
      name: 'dnd',
      xmpp: {show: 'dnd'}
    };

    // Type = undefined, show = xa
    statuses[key('xa')] = {
      name: 'xa',
      xmpp: {show: 'xa'}
    };

    /*
     * Private methods
     */

    var methods = {

      // Return current authorized client
      getClient: function(param) {
        if (this.storage && this.storage.client) {
          if (!param || !utils.isString(param)) {
            return this.storage.client;
          } else {
            if (typeof this.storage.client[param] == 'undefined') {
              return undefined;
            } else {
              return this.storage.client[param];
            }
          }
        }
        return false;
      },

      // Register new client status or redefine system
      registerStatus: function(param) {
        try {
          if (param && utils.isObject(param)) {
            if (typeof param.name == 'undefined' || !param.name || !utils.isString(param.name)) {
              return false;
            }
            if (typeof param.xmpp == 'undefined' || !param.xmpp || !utils.isObject(param.xmpp)) {
              return false;
            }
            if (typeof param.xmpp.type == 'undefined' && typeof param.xmpp.show == 'undefined') {
              return false;
            } else {
              if (param.xmpp.type && !utils.isString(param.xmpp.type)) {
                return false;
              }
              if (param.xmpp.show && !utils.isString(param.xmpp.show)) {
                return false;
              }
            }
            if (param.xmpp.type) {
              param.xmpp.type = param.xmpp.type.toLowerCase();
              if (param.xmpp.type != 'unavailable' && param.xmpp.type != 'available') {
                return false;
              }
              if (param.name.toLowerCase() != param.xmpp.type) {
                return false;
              }
            }
            if (param.xmpp.show) {
              param.xmpp.show = param.xmpp.show.toLowerCase();
              if (param.xmpp.show != 'chat' && param.xmpp.show != 'away' && param.xmpp.show != 'dnd' && param.xmpp.show != 'xa') {
                return false;
              }
            }
            statuses[key(param.name.toLowerCase())] = {
              name: param.name.toLowerCase(),
              xmpp: param.xmpp,
              preprocessing: ((param.callback && typeof param.callback == 'function') ? param.callback : false)
            };
          }
          return true;
        } catch(eRegisterStatuses) {/* --- */}
        return false;
      },

      // Register one or more statuses
      registerStatuses: function(params) {
        if (params && utils.isArray(params)) {
          var i, len = params.length;
          for (i = 0; i != params.length; i ++) {
            var status = params[i];
            if (status && utils.isObject(status)) {
              if (!this.registerStatus(status)) return false;
            }
          }
        }
        return true;
      },

      // Set status to current client
      setStatus: function(param, callbacks) {

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        if (!param || !utils.isString(param)) {
          handlers.onError(this.error('2x1'));
          return false;
        }

        var k = key(param);

        if (typeof statuses[k] == 'undefined') {
          handlers.onError(this.error('3x0'));
          return false;
        }

        if (typeof statuses[k].xmpp.type != 'undefined') {
          handlers.onError(this.error('3x1'));
          return false;
        }

        var parameters = {};

        if (typeof statuses[k].preprocessing == 'function') {
          parameters = statuses[k].preprocessing(statuses[k].name) || {};
        }

        if (!utils.isObject(parameters)) parameters = {};

        var presence = {
          show: statuses[k].xmpp.show,
          command: {
            name: 'cmdChangeMyStatus',
            data: {
              show: statuses[k].xmpp.show,
              status: statuses[k].name,
              params: parameters
            }
          }
        };

        if (callbacks && typeof callbacks.to != 'undefined' && utils.isValidID(callbacks.to)) presence.to = callbacks.to;

        if (!this.sendPresence(presence)) {
          handlers.onError(general.error('3x2'));
          return false;
        } else {
          general.storage.client.status = statuses[k].name;
          general.storage.client.params = parameters;
          var response = {
            client: general.storage.client,
            status: general.storage.client.status,
            params: general.storage.client.params,
            changed: 'status'
          };
          module.trigger('clientUpdated', response);
          handlers.onSuccess(response);
          return true;
        }

      },

      // Set signature to current client
      setSignature: function(param, callbacks) {

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        if (!utils.isString(param)) {
          handlers.onError(this.error('4x0'));
          return false;
        }

        var presence = {
          status: param,
          command: {
            name: 'cmdChangeMySignature',
            data: {
              signature: param
            }
          }
        };

        if (callbacks && typeof callbacks.to != 'undefined' && utils.isValidID(callbacks.to)) presence.to = callbacks.to;

        if (!this.sendPresence(presence)) {
          handlers.onError(general.error('4x1'));
          return false;
        } else {
          general.storage.client.signature = param;
          var response = {
            client: general.storage.client,
            signature: param,
            changed: 'signature'
          };
          module.trigger('clientUpdated', response);
          handlers.onSuccess(response);
          return true;
        }

      },

      // Get info about unavailable status
      getUnavailableStatusParams: function() {
        var result = {}, k = key('unavailable');
        if (typeof statuses[k].preprocessing == 'function') {
          result = statuses[k].preprocessing('unavailable');
          if (!utils.isObject(result)) result = {};
        }
        return result;
      },

      // Get info about available status
      getAvailableStatusParams: function() {
        var result = {}, k = key('available');
        if (typeof statuses[k].preprocessing == 'function') {
          result = statuses[k].preprocessing('available');
          if (!utils.isObject(result)) result = {};
        }
        return result;
      },

      // Send info about current authorized client
      sendInfoAboutClient: function(id, callbacks) {

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        id = this.getId(id);

        if (!this.test('valide id', id)) {
          handlers.onError(this.error('2x0'));
          return false;
        }

        this.setStatus(this.storage.client.status, {to: id});
        this.setSignature(this.storage.client.signature, {to: id});

        handlers.onSuccess();

        return true;

      }

    };

    /*
     * Attachment
     */

    general.attach(methods);

  }

})(oSDK, JSJaC);