/*
 * oSDK Errors module (http://jira.teligent.ru/browse/OSDKJS-27)
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

  //errors.error = window.Error;
  errors.error = function (eobj) {
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

  oSDK.on('core.error', function (data) {
    // Here after core.error must be data object
    oSDK.trigger('error', data);
  }, 'every');

  // Catching all unhandled exceptions and converting to core.error events
  window.onerror = function(message, url, line) {
    // TODO: Report this error via ajax so you can keep track
    //       of what pages have JS issues

    oSDK.trigger('core.error', new oSDK.error({ message: message, data: Array.prototype.slice.call(arguments, 0) }));

    // NOTICE: Not suppressing errors propagation after this function
    var suppressErrorAlert = false;

    return suppressErrorAlert;
  };

  // Direct bindings to namespace
  //TODO: make this bindings automatic by registering module function
  oSDK.errors = errors;

  oSDK.error = errors.error;

})(oSDK);
