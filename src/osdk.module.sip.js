/*
 * oSDK SIP module
 */
(function (oSDK, JsSIP) {
  "use strict";

  // Module namespace
  var sip = {
    sessions: []
  };


  // Registering module in oSDK
  var moduleName = 'sip';

  // Other modules dependencies
  var moduleDeps = ['auth']; // TODO: apply to register function

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
    'registrationFailed': ['sip.registrationFailed', 'core.connectionFailed', 'core.error'], // TODO: test
    'newRTCSession': ['sip.newMediaSession', 'core.newMediaSession']
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
    try {
      sip.init({
        'ws_servers': oSDK.config.sip.serverURL,
            'ws_server_max_reconnection': 0,
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

      sip.JsSIPUA.start();

    } catch (data) {
      oSDK.trigger(['sip.connectionFailed', 'core.connectionFailed'], new oSDK.error({
        message: "SIP configuration error.",
        ecode: 397496,
        data: data
      }));
    }

  });

  oSDK.on('auth.disconnected', function (data) {
    // We may have connection error and therefore not initialized sip module without stop method.
    if(sip.JsSIPUA) {
      sip.JsSIPUA.stop();
    }
  });

  oSDK.on('sip.disconnected', function (data) {
    // Stopping jssip autoreconnect after first connection failure
    sip.JsSIPUA.stop();
    oSDK.trigger('core.disconnected', data);
  });

  oSDK.on('sip.newMediaSession', function (data) {
    oSDK.log(data);
    sip.sessions.push(data.data.session);
  });

  oSDK.on('core.newMediaSession', function (data) {
    oSDK.trigger('newMediaSession', data);
  });

  // Attaching registered in oSDK methods to internal methods
  sip.call = function () {
    return sip.JsSIPUA.call.apply(sip.JsSIPUA, [].slice.call(arguments, 0));
  };


  window.onbeforeunload = function (event) {
    sip.sessions.forEach(function (session) {
      if(session) {
        session.terminate();
      }
    });
  };

  // Direct bindings to namespace
  //TODO: make this bindings automatic by registering module function
  oSDK.sip = sip;
  oSDK.call = sip.call;

})(oSDK, JsSIP);
