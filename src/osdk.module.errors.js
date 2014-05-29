/*
 * oSDK Errors module (http://jira.teligent.ru/browse/OSDKJS-27)
 * TODO: Merge with utils
 */
(function (oSDK) {
  "use strict";

  // Module namespace
  var errors = new oSDK.utils.Module('errors');

  // Catching all unhandled exceptions and converting to core.error events
  errors.on('windowerror', function() {

    // Triggering only our errors
    if(errors.utils.isObject(arguments[0]) && arguments[0].error && arguments[0].error.oSDKError) {
      errors.log('Proxying oSDKError unhandled exception with data', arguments[0].error);
      errors.trigger('error', arguments[0].error);
    }

    // NOTICE: Not suppressing errors propagation after this function
    var suppressErrorAlert = false;

    return suppressErrorAlert;
  });

  errors.registerEvents({
      'error': { other: true, client: true } // Error event for listen
  });

})(oSDK);
