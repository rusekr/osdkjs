/*
 * oSDK SIP module
 */
(function (oSDK, JsSIP) {
  "use strict";

  // Module namespace
  var sip = new oSDK.utils.Module('sip');

  // RTC sessions array
  var sessions = [];

  // Unified media object
  var media = (function () {
    var initialized = false;
    var mediaToGet = {};
    var streamSource = null;
    var streamObjectURL = null;
    var getUserMedia = null;
    var attachMediaStream = null;

    // getUserMedia
    if (window.navigator.webkitGetUserMedia) {
      getUserMedia = window.navigator.webkitGetUserMedia.bind(navigator);

      attachMediaStream = function(element, stream) {
        element.src = webkitURL.createObjectURL(stream);
      };
    }
    else if (window.navigator.mozGetUserMedia) {
      getUserMedia = window.navigator.mozGetUserMedia.bind(navigator);

      attachMediaStream = function(element, stream) {
        element.mozSrcObject = stream;
      };
    }
    else if (window.navigator.getUserMedia) {
      getUserMedia = window.navigator.getUserMedia.bind(navigator);

      attachMediaStream = function(element, stream) {
        element.src = stream;
      };
    }

    return {
      myStream: function () {
        return streamSource;
      },
      initialize: function (callback) {
        if(!initialized) {

          mediaToGet = {
            video: true,
            audio: true
          };
          var successCallback = function (stream) {
            streamSource = stream;
            initialized = true;

            callback.call(this, 'success', mediaToGet, streamSource);
          };
          var errorCallback = function (err) {
            sip.log('Error while getting media stream: ', err);
            if(mediaToGet.video === false) {
              //if tried already to got only audio
              callback.call(this, 'error', mediaToGet, err);
            }
            else {
              //trying to get only audio
              mediaToGet.video = false;
              getUserMedia(mediaToGet, successCallback, errorCallback);
            }
          };
          //trying to get audio and video
          getUserMedia(mediaToGet, successCallback, errorCallback);
        }
        else {
          callback.call(this, 'success', mediaToGet, streamSource);
        }
      },

      initialized: function () {
        return initialized;
      },

      getUserMedia: getUserMedia,

      attachMediaStream: attachMediaStream
    };
  })();

  var attachableEvents = {
    'connected': 'sip.connected', // not needed now
    'disconnected': 'sip.disconnected',
    'registered': ['connected', 'sip.registered'],
    'unregistered': 'sip.unregistered', // not needed now
    'registrationFailed': ['connectionFailed', 'sip.registrationFailed'], // TODO: test
    'connectionFailed': 'connectionFailed',
    'newRTCSession': ['sip.newMediaSession', 'newMediaSession']
  };

  var clientInt = {
    canAudio: null,
    canVideo: null,
    needAudio: true, // TODO: retreive from internal storage on start?
    needVideo: true  // TODO: retreive from internal storage on start?
  };

  var client = {
    canAudio: function () {
      return clientInt.canAudio;
    },
    canVideo: function () {
      return clientInt.canVideo;
    },
    needAudio: function (flag) {
      if(typeof flag !== undefined) {
        clientInt.needAudio = !!flag;
      }
      return clientInt.needAudio;
    },
    needVideo: function (flag) {
      if(typeof flag !== undefined) {
        clientInt.needAudio = !!flag;
      }
      return clientInt.needVideo;
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
  // TODO: !!!may be syncronize getting of media capabilities and connecting states and only after that fire connected?
  sip.initialize = function (config) {

    // Setting JsSIP internal logger
    if(!sip.utils.debug) {
      JsSIP.loggerFactory.level = 0;
    }

    media.initialize(function (result, props, stream) {
      if(result == 'success') {
        clientInt.canAudio = props.audio;
        clientInt.canVideo = props.video;
        sip.trigger('gotMediaCapabilities', { data: props });
      }
      else {
        throw new sip.Error("Media capabilities are not found.");
      }
    });

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

  // Sip start method
  sip.start = function () {
    sip.JsSIPUA.start();
  };

  // Sip stop method
  sip.stop = function () {
    if(sip.JsSIPUA) {
      sip.JsSIPUA.stop();
    }
  };

  sip.on('gotTempCreds', function (e) {
    sip.log('Got temp creds', arguments);
    try {
      sip.initialize({
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

      sip.start();

    } catch (data) {
      sip.trigger(['connectionFailed'], {
        message: "SIP configuration error.",
        ecode: 397496,
        data: data
      });
    }

  });

  // On auth disconnecting event
  sip.on('disconnecting', function (data) {
    sip.stop();
  });

  // On self registrationFailed event
  sip.on('registrationFailed', function (data) {
    sip.trigger('connectionFailed', data);
  });

  // On other modules connectionFailed event
  sip.on('connectionFailed', function (data) {
    sip.stop();
  });

  // TODO: replace with direct jssip listener
  sip.on('sip.newMediaSession', function (event) {
    // Augmenting session object with useful properties
    sip.log('Got newMediaSession with data', event);

    event.data.session.incoming = (event.data.originator == 'remote')?true:false;

    Object.defineProperties(event.data.session, {
      hasVideo: {
        enumerable: true,
        get: function () {
          if (event.data.session.getRemoteStreams().length > 0 && event.data.session.getRemoteStreams()[0].getVideoTracks().length > 0) {
            return true;
          }
          return false;
        }
      },
      hasAudio: {
        enumerable: true,
        get: function () {
          if (event.data.session.getRemoteStreams().length > 0 && event.data.session.getRemoteStreams()[0].getAudioTracks().length > 0) {
            return true;
          }
          return false;
        }
      }
    });

    // Easier link to streams getter functions
    event.data.session.localStreams = event.data.session.getLocalStreams;
    event.data.session.remoteStreams = event.data.session.getRemoteStreams;

    // Mute video shortcut
    event.data.session.muteVideo = function oSDKSIPMuteVideo (flag) {
      flag = !!flag;

      var localStream = event.data.session.localStreams()[0];

      if(!localStream) {
        sip.log('Local media stream is not initialized.');
        return;
      }

      // Call the getVideoTracks method via adapter.js.
      var videoTracks = localStream.getVideoTracks();

      if (videoTracks.length === 0) {
        sip.log('No local video available.');
        return;
      }

      for (var i = 0; i < videoTracks.length; i++) {
        if (!flag) {
          videoTracks[i].enabled = true;
          sip.log('Video unmuted.');
        } else {
          videoTracks[i].enabled = false;
          sip.log('Video muted.');
        }
      }
    };

    // Mute audio shortcut
    event.data.session.muteAudio = function oSDKSIPMuteAudio (flag) {
      flag = !!flag;

      var localStream = event.data.session.localStreams()[0];

      if(!localStream) {
        sip.log('Local media stream is not initialized.');
        return;
      }

      // Call the getAudioTracks method via adapter.js.
      var audioTracks = localStream.getAudioTracks();

      if (audioTracks.length === 0) {
        sip.log('No local audio available.');
        return;
      }

      for (var i = 0; i < audioTracks.length; i++) {
        if (!flag) {
          audioTracks[i].enabled = true;
          sip.log('Audio unmuted.');
        } else {
          audioTracks[i].enabled = false;
          sip.log('Audio muted.');
        }
      }
    };


    sessions.push(event.data.session);
    sip.trigger('newMediaSession', event);
  });

  sip.on('sip.disconnected', function (data) {
    sip.trigger('disconnected');
  });

  sip.call = function () {
    return sip.JsSIPUA.call.apply(sip.JsSIPUA, [].slice.call(arguments, 0));
  };

  sip.on('beforeunload', function (event) {
    sessions.forEach(function (session) {
      // TODO: make sure session is opened
      if(session) {
        session.terminate();
      }
    });
  });

  sip.registerMethods({
    'call': sip.call,
    'attachMediaStream': media.attachMediaStream
  });

  sip.registerNamespaces({
    'client': client
  });

  sip.registerObjects({
    'user': client
  });

  sip.registerEvents({
    'sip.registered': { client: true },
    'sip.unregistered': { client: true },
    'sip.registrationFailed': { client: true },
    'sip.connected': { self: true },
    'sip.disconnected': { self: true },
    'sip.newMediaSession': { self: true },
    'newMediaSession': { client: true },
    'disconnected': { other: true, client: 'last' },
    'connected': { other: true, client: 'last' },
    'connectionFailed': { client: true, other: true, cancels: 'connected' },
    'gotMediaCapabilities': { client: true, other: true }
  });

  // SIP module needs this event registered by some other module
  sip.registerDeps(['gotTempCreds', 'disconnecting']);

  sip.registerConfig(defaultConfig);

})(oSDK, JsSIP);
