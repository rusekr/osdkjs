/*
 * oSDK user module (TODO: merge into other modules which providing parts of it)
 */
(function (oSDK) {

  /**
   * Use strict mode
   */

  "use strict";

  /**
   * User on oSDK
   */

  var user = new oSDK.Module('user');

  /**
   * Constructor to User object
   */

  function User(id, params) {
    id = id.toLowerCase();
    this.account = id;
    this.login = this.account.split('@')[0];
    this.domain = this.account.split('@')[1];
    this.group = null;
    this.status = 'unavailable';
    this.subscription = 'none';
    this.ask = null;
    this.history = [];
    this.can = {
      chat: false,
      audio: false,
      video: false
    };
    user.info('Create client: ' + this.account);
  }

  /**
   * Module user
   */

  user.registerMethods({
    user: function(id, params) {
      if (id && user.utils.isString(id) && user.utils.isValidAccount(id)) {
        return new User(id, (params) ? params : {});
      }
      return false;
    }
  });

})(oSDK);
