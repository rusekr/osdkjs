
/*
 * oSDK Test module for debug purposes.
 */
(function (oSDK) {
  "use strict";

  // Module namespace
  var module = new oSDK.utils.Module('test');

  // Module specific DEBUG.
  module.debug = true;

  // TODO: DEBUG ONLY LISTENER
  if(module.utils.debug) {
    module.on('gotTokenFromPopup', function (data) {
      module.log('GOT TOKEN FROM POPUP AND THAT IS VERY BAD!');
    });
  }

})(oSDK);
