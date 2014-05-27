
/*
 * oSDK Test module for debug purposes.
 */
(function (oSDK) {
  "use strict";

  // Module namespace
  var test = new oSDK.utils.Module('test');

  // TODO: DEBUG ONLY LISTENER
  if(test.utils.debug) {
    test.on('gotTokenFromPopup', function (data) {
      test.log('GOT TOKEN FROM POPUP AND THAT IS VERY BAD!');
    });
  }

})(oSDK);
