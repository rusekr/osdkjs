/*
 * oSDK user module (TODO: merge into other modules which providing parts of it)
 */
(function (oSDK) {

  /*
   * Use strict mode
   */

  "use strict";

  /*
   * User on oSDK
   */

  var module = new oSDK.Module('user');

  /**
   * Constructor to User object
   */

  function User(params) {

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
