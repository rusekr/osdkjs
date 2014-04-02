/*
 * oSDK Errors module
 */
(function (oSDK) {
  "use strict";

  // Registering module in oSDK
  var moduleName = 'errors';

  var attachableNamespaces = {
    'errors': true
  };

  var attachableMethods = {
  };

  var attachableEvents = {
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

  // Direct bindings to namespace
  //TODO: make this bindings automatic by registering module function
  oSDK.errors = errors;

  oSDK.error = errors.error;

})(oSDK);
