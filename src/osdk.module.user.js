/*
 * oSDK inner user
 */
(function (oSDK) {

  /**
   * Constructor to user object
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
    oSDK.info('Create client: ' + this.account);
  }

  /**
   * Create exemplar of user
   */
  oSDK.user = function(jid, params) {
    if (jid && oSDK.utils.isString(jid) && oSDK.utils.isValidAccount(jid)) {
      return new User(jid, (params) ? params : {});
    }
    return false;
  };

})(oSDK);
