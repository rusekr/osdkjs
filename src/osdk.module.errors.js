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

  oSDK.on('core.error', function (e) {
    oSDK.trigger('error', e);
  }, 'every');

  // Direct bindings to namespace
  //TODO: make this bindings automatic by registering module function
  oSDK.errors = errors;

  oSDK.error = errors.error;

})(oSDK);
