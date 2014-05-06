/**
 * oSDK base interface for oSDK users
 * This module extended by other modules
 */

(function(oSDK) {

  /**
   * Use strict mode
   */

  "use strict";

  // Module namespace
  var oSDKI = new oSDK.Module('interface');

  oSDKI.registerMethods({
    "on": oSDKI.on,
    "off": oSDKI.off,
    "md5": oSDKI.utils.md5 // TODO: need to be removed , client must use it's own hash functions
  });

})(oSDK);
