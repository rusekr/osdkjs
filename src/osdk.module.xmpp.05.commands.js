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

      cmdChangeMyStatus: function(params) {
        var contact = this.storage.contacts.get(params.from);
        if (contact) {
          contact.status = params.data.status;
          contact.params = params.data.params;
          module.trigger('contactUpdated', {changed: 'status', contact: contact});
        }
      },

      cmdChangeMySignature: function(params) {
        var contact = this.storage.contacts.get(params.from);
        if (contact) {
          contact.signature = params.data.signature;
          module.trigger('contactUpdated', {changed: 'signature', contact: contact});
        }
      }

    };

    /*
     * Attachment
     */

    general.attach(methods);

  }

})(oSDK, JSJaC);