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

    var configuration = {
      // Debug level
      debug: 6,
      // Connection
      connection: {
        // Timer
        timer: 2000,
        // Server params
        server: {
          protocol: 'wss',
          domain: null,
          port: 5280,
          url: 'http-bind'
        }
      }
    };

    /*
     * Private methods
     */

    var methods = {

      config: function(param) {
        var obj = configuration, keys = param.split('.'), i;
        for (i = 0; i != keys.length; i ++) {
          var key = keys[i];
          if (typeof obj[key] == 'undefined') {
            return null;
          } else {
            obj = obj[key];
          }
        }
        return obj;
      }

    };

    /*
     * Registration in oSDK
     */

    module.registerConfig(configuration);

    /*
     * Attachment
     */

    general.attach(methods);

  }

})(oSDK, JSJaC);