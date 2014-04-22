/*
 * oSDK user module (common functions for osdk users)
 */
(function (oSDK) {
  "use strict";

  // Module namespace
  var user = new oSDK.Module('user');

  user.registerMethods({
    'on': user.on,
    'off': user.off
  });

})(oSDK);
