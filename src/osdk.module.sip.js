/*
 * oSDK SIP module
 */
(function (oSDK, JsSIP) {
  "use strict";

  // Module namespace
  var sip = new oSDK.Module('sip');
  // RTC sessions array
  var sessions = [];

  var attachableEvents = {
    // 'connected': 'sip.connected', // not needed now
    'disconnected': ['sip.disconnected', 'core.disconnected'],
    'registered': ['sip.registered', 'core.connected'],
    // 'unregistered': 'sip.unregistered', // not needed now
    'registrationFailed': ['sip.registrationFailed'], // TODO: test
    'connectionFailed': ['sip.connectionFailed'],
    'newRTCSession': ['sip.newMediaSession']
  };

  var client = {
    // TODO: merge mediaObject
    canAudio: function () {
      return true; // stub
    },
    canVideo: function () {
      return true; // stub
    }
  };

  var defaultConfig = {
    sip: {
      'serverURL': 'wss://osdp-teligent-dev-registrar.virt.teligent.ru:8088/ws'
    }
  };

  // Attach triggers for registered events through initialized module object
  var attachTriggers = function (attachableEvents, triggerFunction, context) {

      sip.utils.each(attachableEvents, function (ev, i) {
        var outer = [];
        if (typeof(ev) === 'string') { // Assuming event alias
          outer.push(ev);
        } else if (ev instanceof Array){ // Assuming array of event aliases
          outer = outer.concat(ev);
        } else {
          outer.push(i); // Assuming boolean
        }

        sip.utils.each(outer, function (outerEvent) {
          triggerFunction.call(context || this, i, function (e) {
            sip.trigger(outerEvent, e);
          });
        });


      });
  };

  // Init method
  sip.init = function (config) {

    // Setting JsSIP internal logger
    if(!sip.utils.debug) {
      JsSIP.loggerFactory.level = 0;
    }

    // JsSIP initialization
    sip.JsSIPUA = new JsSIP.UA(config);

    // TODO: merge with other module stuff
    attachTriggers(attachableEvents, sip.JsSIPUA.on, sip.JsSIPUA);

    // Extend {Object} User
    oSDK.user.extend({
      // Properties
      canAudio: false,
      canVideo: false
    });

  };

  sip.on('core.gotTempCreds', function (e) {
    sip.log('Got temp creds', arguments);
    try {
      sip.init({
        'ws_servers': sip.config('serverURL'),
        'connection_recovery': false,
        'uri': 'sip:' + e.data.username.split(':')[1],
        'password': e.data.password,
        'stun_servers': [],
        'registrar_server': 'sip:'+sip.config('serverURL').replace(/^[^\/]+\/\/(.*?):[^:]+$/, '$1'),
        'trace_sip': true,
        'register': true,
        'authorization_user': e.data.username.split(':')[1],
        'use_preloaded_route': false
        //,hack_via_tcp: true
      });

      sip.JsSIPUA.start();

    } catch (data) {
      sip.trigger(['sip.connectionFailed'], {
        message: "SIP configuration error.",
        ecode: 397496,
        data: data
      });
    }

  });

  sip.on('core.disconnected', function (data) {
    // We may have connection error and therefore not initialized sip module without stop method.
    if(sip.JsSIPUA) {
      sip.JsSIPUA.stop();
    }
  });

  sip.on(['sip.registrationFailed'], function (data) {
    sip.trigger('core.connectionFailed', data);

    if(sip.JsSIPUA) {
      sip.JsSIPUA.stop();
    }
  });

  sip.on('sip.disconnected', function (data) {
    sip.trigger('core.disconnected', data);
  });

  sip.on('sip.newMediaSession', function (data) {
    // sip.log(data);
    sessions.push(data.data.session);
    sip.trigger('newMediaSession', data);
  });

  sip.call = function () {
    return sip.JsSIPUA.call.apply(sip.JsSIPUA, [].slice.call(arguments, 0));
  };

  sip.on('core.beforeunload', function (event) {
    sessions.forEach(function (session) {
      // TODO: make sure session is opened
      if(session) {
        session.terminate();
      }
    });
  });

  sip.registerMethods({
    'call': sip.call
  });

  sip.registerNamespaces({
    'client': client
  });

  sip.registerEvents(attachableEvents);

  sip.registerConfig(defaultConfig);

})(oSDK, JsSIP);
