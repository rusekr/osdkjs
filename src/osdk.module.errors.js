/*
 * oSDK Errors module (http://jira.teligent.ru/browse/OSDKJS-27)
 * TODO: Merge with utils
 */
(function (oSDK) {
  "use strict";

  // Module namespace
  var errors = new oSDK.utils.Module('errors');

  // Catching all unhandled exceptions and converting to core.error events
  window.onerror = function(message, url, line) {
    // TODO: Report this error via ajax so you can keep track
    //       of what pages have JS issues

    errors.trigger('error', { message: message, data: Array.prototype.slice.call(arguments, 0) });

    // NOTICE: Not suppressing errors propagation after this function
    var suppressErrorAlert = false;

    return suppressErrorAlert;
  };

  errors.registerEvents({
      'error': { other: true, client: true } // Error event for listen
  });


  // TODO: DEBUG ONLY LISTENER
  if(errors.utils.debug) {
    errors.on('gotTokenFromPopup', function (data) {
      errors.log('ERRORS MODULE GOT TOKEN FROM POPUP AND THAT IS VERY BAD');
    });
  }

})(oSDK);
