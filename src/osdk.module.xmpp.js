/*
 * oSDK SIP module
 */

(function (oSDK, JsSIP) {

  // Registering module in oSDK
  var moduleName = 'xmpp';

  var attachableNamespaces = {
    'xmpp': true
  };

  var attachableMethods = {
  //     'start': 'connect',
  //     'stop': 'disconnect',
    'send': true
  };

  var attachableEvents = {
    'onconnect': ['xmpp.onconnect', 'connected'],
    'onerror': 'xmpp.onerror',
    'ondisconnect': ['xmpp.ondisconnect', 'disconnected'],
    'status_changed': 'xmpp.status_changed',
    'presence': 'xmpp.presence',
    'message': 'xmpp.message',
    'iq': 'xmpp.iq'
  };

  oSDK.utils.attach(moduleName, {
    namespaces: attachableNamespaces,
    methods: attachableMethods,
    events: attachableEvents
  });


  // Module namespace
  var xmpp = {
    oDbg: null,
    con: null
  };

  xmpp.init  = function (data) {
      xmpp.oDbg = new JSJaCConsoleLogger();

      xmpp.con = new JSJaCWebSocketConnection({
          oDbg: xmpp.oDbg,
          httpbase: oSDK.config.xmpp.serverURL,
          timerval: 500
      });

      oSDK.log('jsjac con', xmpp.con);


//       // Attaching external events to registered in oSDK events
//       var attachEvent = function (e) {
//         oSDK.trigger(typeof(attachableEvents[e.type])==='string'?attachableEvents[e.type]:e.type, e);
//       };
//       for(var i in attachableEvents) {
//         sip.JsSIPUA.on(i, attachEvent );
//       }
//
//       // Attaching internal events to main oSDK events
//       oSDK.on('sip.registered:internal', function () {
//         oSDK.trigger('connected', [].slice.call(arguments, 0));
//       } );
//       oSDK.on('sip.registrationFailed:internal', function () {
//         oSDK.trigger('connectionFailed', {'error': 'SIP can\'t register.'});
//       } );
//       oSDK.on('sip.disconnected:internal', function () {
//         oSDK.trigger('disconnected', {});
//       } );
//
//       function setupCon(oCon) {
//         oCon.registerHandler('message', handleMessage);
//         oCon.registerHandler('presence', handlePresence);
//         oCon.registerHandler('iq', handleIQ);
//         oCon.registerHandler('onconnect', handleConnected);
//         oCon.registerHandler('onerror', handleError);
//         oCon.registerHandler('status_changed', handleStatusChanged);
//         oCon.registerHandler('ondisconnect', handleDisconnected);
//
//         oCon.registerIQGet('query', NS_VERSION, handleIqVersion);
//         oCon.registerIQGet('query', NS_TIME, handleIqTime);
//       }
//
//       setupCon(con);
//
//         // setup args for connect method
//         oArgs.domain = oForm.domain.value || server.replace(/^.*?\:\/\/(.*?)(\:\d{1,5})?\/.*$/, "$1"); //server.replace(/^.*?\:\/\/(.*?)\/.*$/, "$1");
//         oArgs.username = oForm.username.value;
//         oArgs.resource = 'jsjac_simpleclient';
//         oArgs.pass = oForm.password.value;
//         oArgs.register = oForm.register.checked;
};

  // Attaching internal events to internal oSDK events
  oSDK.on('auth.gotTempCreds', function (e) {
    oSDK.log('XMPP got temp creds', arguments);

    oSDK.trigger('connected', [].slice.call(arguments, 0));
//     sip.init({
//       'ws_servers': oSDK.config.sipServerURL,
//           'uri': 'sip:' + e.data.username.split(':')[1],
//           'password': e.data.password,
//           'stun_servers': [],
//           'registrar_server': 'sip:'+oSDK.config.sipServerURL.replace(/^[^\/]+\/\/(.*?):[^:]+$/, '$1'),
//           'trace_sip': true,
//           'register': true,
//           'authorization_user': e.data.username.split(':')[1],
//           'use_preloaded_route': false
//           //,hack_via_tcp: true
//     });
//
//     sip.start();

      // Initialze

      xmpp.init();

//       xmpp.con.connect(oArgs);

  });





  xmpp.JSJaC = JSJaC;

  // Direct bindings to namespace
  //TODO: make this bindings automatic by registering module function
  oSDK.xmpp = xmpp;

})(oSDK, JsSIP);
