/*
 * oSDK Errors module
 */
(function (oSDK) {

  // Registering module in oSDK
  var moduleName = 'error';

  var attachableNamespaces = {
    'error': true
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
  var error = window.Error;

  // Direct bindings to namespace
  //TODO: make this bindings automatic by registering module function
  oSDK.error = error;

})(oSDK);
