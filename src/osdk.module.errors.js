/*
 * oSDK Errors module
 */
(function (oSDK) {
  "use strict";

  // Registering module in oSDK
  var moduleName = 'errors';

  var attachableNamespaces = {
    'errors': true, // This module object
    'error': true // Error object for throwing
  };

  var attachableMethods = {
  };

  var attachableEvents = {
    'error': ['errors.error', 'core.error'] // Error event for listen
  };

  oSDK.utils.attach(moduleName, {
    namespaces: attachableNamespaces,
    methods: attachableMethods,
    events: attachableEvents
  });

  // Module namespace
  // TODO: override error message prefixing osdk.
  var errors = {};

  errors.error = window.Error;

  oSDK.on('core.error', function () {
    oSDK.trigger('error', Array.prototype.slice.call(arguments, 0));
  }, 'every');

  // Catching all unhandled exceptions and converting to core.error events
  window.onerror = function(msg, url, line) {
    // TODO: Report this error via ajax so you can keep track
    //       of what pages have JS issues

    oSDK.trigger('core.error', { error: true, data: Array.prototype.slice.call(arguments, 0) });

    var suppressErrorAlert = true;
    // If you return true, then error alerts (like in older versions of
    // Internet Explorer) will be suppressed.
    return suppressErrorAlert;
  };

  // Direct bindings to namespace
  //TODO: make this bindings automatic by registering module function
  oSDK.errors = errors;

  oSDK.error = errors.error;

})(oSDK);
