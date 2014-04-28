/*
 * oSDK Errors module (http://jira.teligent.ru/browse/OSDKJS-27)
 * TODO: Merge with utils
 */
(function (oSDK) {
  "use strict";

  // Module namespace
  var errors = new oSDK.Module('errors');

  // errors.Error like window.Error;
  var Error = function (eobj) {
    // Defaults
    this.ecode = 0;
    this.name = "Error";
    this.level = "Error";
    this.message = "Unknown error detected";
    this.htmlMessage = "Unknown error detected";
    this.data = {};
    this.toString = function(){return this.name + ": " + this.message;};

    // Updating properties
    var self = this;
    oSDK.utils.each(eobj, function (prop, propname) {
      self[propname] = prop;
    });

  };

  errors.on('core.error', function (data) {
    if(!(data instanceof Error)) {
      data = new Error(data);
    }
    // Here after core.error must be data object
    errors.trigger('error', data);
  }, 'every');

  // Catching all unhandled exceptions and converting to core.error events
  window.onerror = function(message, url, line) {
    // TODO: Report this error via ajax so you can keep track
    //       of what pages have JS issues

    errors.trigger('core.error', { message: message, data: Array.prototype.slice.call(arguments, 0) });

    // NOTICE: Not suppressing errors propagation after this function
    var suppressErrorAlert = false;

    return suppressErrorAlert;
  };

  errors.registerEvents({
      'error': ['errors.error', 'core.error'] // Error event for listen
  });

})(oSDK);
