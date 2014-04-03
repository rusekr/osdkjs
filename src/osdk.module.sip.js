/*
 * oSDK SIP module
 */
(function (oSDK, JsSIP) {
  "use strict";

  // Module namespace
  var sip = {};


  // Registering module in oSDK
  var moduleName = 'sip';

  var attachableNamespaces = {
    'sip': true
  };

  var attachableMethods = {
//     'start': 'connect',
//     'stop': 'disconnect',
    'call': true
  };

  var attachableEvents = {
    'connected': 'sip.connected',
    'disconnected': ['sip.disconnected', 'core.disconnected'],
    'registered': ['sip.registered', 'core.connected'],
    'unregistered': 'sip.unregistered',
    'registrationFailed': ['sip.registrationFailed', 'core.connectionFailed'],
    'newRTCSession': 'newMediaSession'
  };

  // TODO: not used now
//   var attachableEventsInterface = {
//     generator: 'oSDK.sip.JsSIPUA.on',
//     parameters: ['name', 'handler']
//   };

  oSDK.utils.attach(moduleName, {
    namespaces: attachableNamespaces,
    methods: attachableMethods,
    events: attachableEvents
//    ,eventsInterface: attachableEventsInterface // TODO:
  });

  sip.JsSIP = JsSIP;

  // Module methods

  // Init method
  sip.init = function (config) {

    // JsSIP initialization
    sip.JsSIPUA = new sip.JsSIP.UA(config);

    // Attaching external events to registered in oSDK events
    oSDK.utils.attachTriggers(attachableEvents, sip.JsSIPUA.on, sip.JsSIPUA);

  };

  // Attaching internal events to internal oSDK events
  oSDK.on('auth.gotTempCreds', function (e) {
    oSDK.log('SIP got temp creds', arguments);
    sip.init({
      'ws_servers': oSDK.config.sip.serverURL,
          'uri': 'sip:' + e.data.username.split(':')[1],
          'password': e.data.password,
          'stun_servers': [],
          'registrar_server': 'sip:'+oSDK.config.sip.serverURL.replace(/^[^\/]+\/\/(.*?):[^:]+$/, '$1'),
          'trace_sip': true,
          'register': true,
          'authorization_user': e.data.username.split(':')[1],
          'use_preloaded_route': false
          //,hack_via_tcp: true
    });

    sip.start();
  });

  oSDK.on('auth.disconnected', function (e) {
    oSDK.sip.stop();
  });

  oSDK.on('sip.disconnected', function (e) {
    oSDK.trigger('core.disconnected');
  });
  

  // Attaching registered in oSDK methods to internal methods
  sip.call = function () {
    return sip.JsSIPUA.call.apply(sip.JsSIPUA, [].slice.call(arguments, 0));
  };

  // Starts the sip module (async)
  sip.start = function () {
    return sip.JsSIPUA.start.apply(sip.JsSIPUA, [].slice.call(arguments, 0));
  };

  // Stops the sip module (async)
  sip.stop = function () {
    return sip.JsSIPUA.stop.apply(sip.JsSIPUA, [].slice.call(arguments, 0));
  };

  // Direct bindings to namespace
  //TODO: make this bindings automatic by registering module function
  oSDK.sip = sip;
  oSDK.call = sip.call;

})(oSDK, JsSIP);
