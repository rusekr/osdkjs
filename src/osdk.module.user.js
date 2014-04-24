/*
 * Functions for oSDK users
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

  function User(jid, params) {
    jid = jid.toLowerCase();
    this.account = jid;
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
    user: function(jid, params) {
      if (jid && user.utils.isString(jid) && user.utils.isValidAccount(jid)) {
        return new User(jid, (params) ? params : {});
      }
      return false;
    }
  });

})(oSDK);
