/*
 * oSDK SIP module
 */
(function (oSDK, JsSIP) {

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
    'disconnected': 'sip.disconnected', 
    'registered': 'sip.registered', 
    'unregistered': 'sip.unregistered', 
    'registrationFailed': 'sip.registrationFailed',
    'newRTCSession': 'newMediaSession'
  };
  
  oSDK.utils.attach(moduleName, {
    namespaces: attachableNamespaces,
    methods: attachableMethods,
    events: attachableEvents
  });
  
  
  // Module namespace
  var sip = {};
  
  sip.JsSIP = JsSIP;
  
  // Module methods
  
  // Init method
  sip.init = function (config) {
    
    // JsSIP initialization
    sip.JsSIPUA = new sip.JsSIP.UA(config);

    // Attaching external events to registered in oSDK events
    var attachSipEvent = function (e) {
      oSDK.trigger(typeof(attachableEvents[e.type])==='string'?attachableEvents[e.type]:e.type, e);
    };
    for(var i in attachableEvents) {
      sip.JsSIPUA.on(i, attachSipEvent );
    }

    // Attaching internal events to main oSDK events
    oSDK.on('sip.registered:internal', function () {
      oSDK.trigger('connected', [].slice.call(arguments, 0));
    } );
    oSDK.on('sip.registrationFailed:internal', function () {
      oSDK.trigger('connectionFailed', {'error': 'SIP can\'t register.'});
    } );
    oSDK.on('sip.disconnected:internal', function () {
      oSDK.trigger('disconnected', {});
    } );
  };

  // Attaching internal events to internal oSDK events
  oSDK.on('auth.gotTempCreds:internal', function (e) {
    oSDK.log('SIP got temp creds', arguments);
    sip.init({
      'ws_servers': oSDK.config.sipServerURL,
          'uri': 'sip:' + e.data.username.split(':')[1],
          'password': e.data.password,
          'stun_servers': [],
          'registrar_server': 'sip:'+oSDK.config.sipServerURL.replace(/^[^\/]+\/\/(.*?):[^:]+$/, '$1'),
          'trace_sip': true,
          'register': true,
          'authorization_user': e.data.username.split(':')[1],
          'use_preloaded_route': false
          //,hack_via_tcp: true
    });
    
    sip.start();
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
