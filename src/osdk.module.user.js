/*
 * Functions for oSDK users
 */
(function (oSDK) {

  "use strict";

  var user = new oSDK.Module('user');

  user.registerMethods({
    'on': user.on,
    'off': user.off
  });

})(oSDK);
