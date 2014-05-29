/*
 * oSDK user module (TODO: merge into other modules which providing parts of it)
 */
(function (oSDK) {

  /*
   * Use strict mode
   */

  "use strict";

  // Config history

  var HISTORY_MAX_LENGTH = 5000;

  // User on oSDK

  var module = new oSDK.utils.Module('user');

  // Constructor to User object

  function User(params) {

    // Self

    var self = this;

    // Work with history

    var history  = [];

    var generateHistoryKey = function() {
      return '_' + oSDK.utils.md5(self.account);
    };

    var get_oSDKHistory = function() {
      var result = module.utils.storage.getItem('oSDKHistory');
      if (!result && !module.utils.isArray(result)) {
        result = {};
        module.utils.storage.setItem('oSDKHistory', result);
      }
      return result;
    };

    var set_oSDKHistory = function(value) {
      module.utils.storage.setItem('oSDKHistory', value);
      return value;
    };

    if (typeof params != 'undefined' && module.utils.isObject(params) && typeof params.history != 'undefined' && !params.history) {

      // Interface to work with history is not exists

    } else {

      // Interface to work with history to this exemplar of User

      this.history = {
        length: HISTORY_MAX_LENGTH,
        clear: function() {
          history = [];
          var oSDKH = get_oSDKHistory(), key = generateHistoryKey();
          oSDKH[key] = history;
          set_oSDKHistory(oSDKH);
          return true;
        },
        state: function() {
          var oSDKH = get_oSDKHistory(), key = generateHistoryKey();
          if (typeof oSDKH[key] == 'undefined') return [];
          if (typeof params != 'undefined') {
            var c, i = oSDKH[key].length - params, result = [];
            if (i < 0) i = 0;
            for (c = i; c != oSDKH[key].length; c ++) {
              result.push(oSDKH[key][c]);
            }
            return result;
          }
          return oSDKH[key];
        },
        push: function(params) {
          function prepareHistoryParams(params) {
            var result = params, d = new Date();
            if (!module.utils.isObject(result)) result = { data: result };
            if (typeof result.type == 'undefined') result.type = 'unknown';
            result.timeZoneOffset = d.getTimezoneOffset() / 60; // in hours
            result.timeStamp = d.getTime(); // in millisecondes
            return result;
          }
          var oSDKH = get_oSDKHistory(), key = generateHistoryKey();
          var element = prepareHistoryParams(params);
          if (typeof oSDKH[key] == 'undefined') oSDKH[key] = [];
          oSDKH[key].push(element);
          if (oSDKH[key].length > HISTORY_MAX_LENGTH) {
            var hist = [];
            for (var i = 1; i != oSDKH[key].length; i ++) {
              hist.push(oSDKH[key][i]);
            }
            oSDKH[key] = hist;
          }
          set_oSDKHistory(oSDKH);
          return element;
        }
      };

    }

  }

  /*
   * Module user
   */

  module.registerNamespaces({
    user: {
      // Create new exemplar of {Object} User
      create: function(a, params) {
        if (a && module.utils.isString(a) && module.utils.isValidAccount(a)) {
          var account = a.toLowerCase();
          var user = new User(params);
          Object.defineProperties(user, {
            "account": {
              value: account,
              writable: false,
              configurable: false,
              enumerable: false
            },
            "login": {
              value: account.split('@')[0],
              writable: false,
              configurable: false,
              enumerable: false
            },
            "domain": {
              value: account.split('@')[1],
              writable: false,
              configurable: false,
              enumerable: false
            }
          });

          var orientationOfCapabilities = 'common';

          var capabilities = {
            tech: {
              instantMessaging: false,
              audioCall: false,
              videoCall: false,
              fileTransfer: false
            },
            user: {
              instantMessaging: false,
              audioCall: false,
              videoCall: false,
              fileTransfer: false
            },
            common: {
              instantMessaging: false,
              audioCall: false,
              videoCall: false,
              fileTransfer: false
            }
          };

          user.capabilities = {
            getTechParams: function() {
              return capabilities.tech;
            },
            setTechParams: function(params) {
              if (typeof params.instantMessaging != 'undefined') {
                capabilities.tech.instantMessaging = !!params.instantMessaging;
                capabilities.common.instantMessaging = !!(capabilities.tech.instantMessaging & capabilities.user.instantMessaging);
              }
              if (typeof params.audioCall != 'undefined') {
                capabilities.tech.audioCall = !!params.audioCall;
                capabilities.common.audioCall = !!(capabilities.tech.audioCall & capabilities.user.audioCall);
              }
              if (typeof params.videoCall != 'undefined') {
                capabilities.tech.videoCall = !!params.videoCall;
                capabilities.common.videoCall = !!(capabilities.tech.videoCall & capabilities.user.videoCall);
              }
              if (typeof params.fileTransfer != 'undefined') {
                capabilities.tech.fileTransfer = !!params.fileTransfer;
                capabilities.common.fileTransfer = !!(capabilities.tech.fileTransfer & capabilities.user.fileTransfer);
              }
              return true;
            },
            getUserParams: function() {
              return capabilities.user;
            },
            setUserParams: function(params) {
              if (typeof params.instantMessaging != 'undefined') {
                capabilities.user.instantMessaging = !!params.instantMessaging;
                capabilities.common.instantMessaging = !!(capabilities.tech.instantMessaging & capabilities.user.instantMessaging);
              }
              if (typeof params.audioCall != 'undefined') {
                capabilities.user.audioCall = !!params.audioCall;
                capabilities.common.audioCall = !!(capabilities.tech.audioCall & capabilities.user.audioCall);
              }
              if (typeof params.videoCall != 'undefined') {
                capabilities.user.videoCall = !!params.videoCall;
                capabilities.common.videoCall = !!(capabilities.tech.videoCall & capabilities.user.videoCall);
              }
              if (typeof params.fileTransfer != 'undefined') {
                capabilities.user.fileTransfer = !!params.fileTransfer;
                capabilities.common.fileTransfer = !!(capabilities.tech.fileTransfer & capabilities.user.fileTransfer);
              }
              return true;
            },
            getOrientationOfCapabilities: function() {
              return orientationOfCapabilities;
            },
            setOrientationOfCapabilities: function(param) {
              if (typeof param == 'undefined' || !module.utils.isString(param)) return false;
              switch(param.toLowerCase()) {
                case 'tech' : orientationOfCapabilities = 'tech'; break;
                case 'user' : orientationOfCapabilities = 'user'; break;
                case 'common' : orientationOfCapabilities = 'common'; break;
                default : return false;
              }
              return true;
            },
            params: function() {
              return capabilities[orientationOfCapabilities];
            }
          };
          // Report
          module.info('Create user: ' + user.account);
          return user;
        }
        return false;
      },
      // Add properties and methods to {Object} User
      extend: function(proto) {
        for (var i in proto) {
          Object.defineProperty(User, i, { "value": proto[i] });
          if (proto[i] instanceof Function) {
            proto[i].bind(User);
          }
        }
      }
    }
  });

})(oSDK);
