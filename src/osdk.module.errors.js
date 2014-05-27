/*
 * oSDK Errors module (http://jira.teligent.ru/browse/OSDKJS-27)
 * TODO: Merge with utils
 */
(function (oSDK) {
  "use strict";

  // Module namespace
  var errors = new oSDK.utils.Module('errors');

  // Catching all unhandled exceptions and converting to core.error events
  window.onerror = function() {

    // Triggering only our errors
    if(errors.utils.isObject(arguments[4]) && arguments[4].oSDKError) {
      errors.log('Proxying oSDKError unhandled exception with data', arguments[4]);
      errors.trigger('error', arguments[4]);
    }

    // NOTICE: Not suppressing errors propagation after this function
    var suppressErrorAlert = false;

    return suppressErrorAlert;
  };

  errors.registerEvents({
      'error': { other: true, client: true } // Error event for listen
  });

})(oSDK);
