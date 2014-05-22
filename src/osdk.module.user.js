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

  var module = new oSDK.Module('user');

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
        return history;
      },
      push: function(params) {
        function prepareHistoryParams(params) {
          var result = params, d = new Date();
          if (!module.utils.isObject(result)) result = { data: result };
          if (typeof result.type == 'undefined') result.type = 'unknown';
          result.timeZoneOffset = d.getTimezoneOffset() / 60; // in hours
          result.timeStamp = d.getTime() / 1000; // in secondes
          return result;
        }
        var oSDKH = get_oSDKHistory(), key = generateHistoryKey();
        var element = prepareHistoryParams(params);
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

    // Report
    module.info('Create client: ' + this.account);

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
