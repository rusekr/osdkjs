/*
 * oSDK SIP module
 */
(function (oSDK, JsSIP) {
  "use strict";

  /**
   * @namespace MediaAPI
   */
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

      attachMediaStream = function (element, stream) {
        element.src = webkitURL.createObjectURL(stream);
      };
    }
    else if (window.navigator.mozGetUserMedia) {
      getUserMedia = window.navigator.mozGetUserMedia.bind(navigator);

      attachMediaStream = function (element, stream) {
        element.mozSrcObject = stream;
      };
    }
    else if (window.navigator.getUserMedia) {
      getUserMedia = window.navigator.getUserMedia.bind(navigator);

      attachMediaStream = function (element, stream) {
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
    'connected': 'sip_connected', // not needed now
    'disconnected': 'sip_disconnected',
    'registered': ['connected', 'sip_registered'],
    'unregistered': 'sip_unregistered', // not needed now
    'registrationFailed': ['connectionFailed', 'sip_registrationFailed'], // TODO: test
    'connectionFailed': 'connectionFailed',
    'newRTCSession': ['sip_gotMediaSession']
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

  /**
  * Event object for new incoming or outgoing media (audio/video) calls. All work with call which generated this object goes through this object.
  *
  * @memberof MediaAPI
  * @typedef {object} MediaSessionObject
  * @property {JsSIP.rtcSession} JsSIPrtcSessionEvent JsSIP library session controlling object
  * @property {bool} incoming Whether this session incoming or outgoing
  * @property {bool} hasAudio Whether this session has audio streams or not
  * @property {bool} hasVideo Whether this session has video streams or not
  * @property {function} on Lets you add listeners to current session events
  */

  /**
  * Dispatched when current SIP session successfully started.
  *
  * @event oSDK#SIPSession~started
  * @param {object} event The event object associated with this event.
  *
  */

  /**
   * MediaSessionObject constructor
   *
   * @class oSDK.MediaSession
   */
  function MediaSession (JsSIPrtcSessionEvent) {

    var self = this;
    var event = JsSIPrtcSessionEvent;

    self.JsSIPrtcSessionEvent = event;

    // Incoming session, if false - outgoing.
    self.incoming = (event.data.originator == 'remote')?true:false;

    // Whether session has audio and/or video stream or not.
    Object.defineProperties(self, {
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

    // Translation of session handlers.
    self.on = function (sessionEventType, handler) {
      //TODO: proxy newDTMF to client as gotDTMF on per session basis
      event.data.session[sessionEventType] = handler;
    };

    // Other side user ID
    self.opponent = event.data.request.from.uri.user;

    // Easier link to streams getter functions
    self.localStreams = function () {
      return event.data.session.getLocalStreams.apply(event.data.session, [].slice.call(arguments, 0));
    };
    self.remoteStreams = function () {
      return event.data.session.getRemoteStreams.apply(event.data.session, [].slice.call(arguments, 0));
    };

    // Mute video shortcut
    self.muteVideo = function oSDKSIPMuteVideo (flag) {
      flag = !!flag;

      var localStream = event.data.session.getLocalStreams()[0];

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
    self.muteAudio = function oSDKSIPMuteAudio (flag) {
      flag = !!flag;

      var localStream = event.data.session.getLocalStreams()[0];

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

    // Session answer proxy
    if(self.incoming) {
      self.answer = function () {
        return event.data.session.answer.apply(event.data.session, [].slice.call(arguments, 0));
      };
    }

    // Send DTMF signal to other end of call session
    self.sendDTMF = function () {
      return event.data.session.sendDTMF.apply(event.data.session, [].slice.call(arguments, 0));
    };

    // Terminate session proxying function
    self.end = function () {
      return event.data.session.terminate.apply(event.data.session, [].slice.call(arguments, 0));
    };

  }

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
        sip.trigger('gotMediaCapabilities', props);
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

  sip.on('gotTempCreds', function (event) {
    sip.log('Got temp creds', arguments);
    try {
      sip.initialize({
        'ws_servers': sip.config('serverURL'),
        'connection_recovery': false,
        'uri': 'sip:' + event.data.username.split(':')[1],
        'password': event.data.password,
        'stun_servers': [],
        'registrar_server': 'sip:'+sip.config('serverURL').replace(/^[^\/]+\/\/(.*?):[^:]+$/, '$1'),
        'trace_sip': true,
        'register': true,
        'authorization_user': event.data.username.split(':')[1],
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

  // On other modules connectionFailed event
  sip.on('connectionFailed', function (data) {
    sip.stop();
  });

  // TODO: replace with direct jssip listener
  sip.on('sip_gotMediaSession', function (event) {
    // Augmenting session object with useful properties
    sessions.push(event.data.session);

    var mediaSession = new MediaSession(event);

    sip.log('Modifyed session to', mediaSession);
    sip.trigger('gotMediaSession', mediaSession);
  });

  sip.on('sip_disconnected', function (data) {
    sip.trigger('disconnected');
  });

  sip.call = function () {

    if (arguments[1] && sip.utils.isObject(arguments[1])) {
      if (!arguments[1].mediaConstraints || !sip.utils.isObject(arguments[1].mediaConstraints)) {
        arguments[1].mediaConstraints = {};
      }
      if (arguments[1].audio && arguments[1].audio === true) {
        arguments[1].mediaConstraints.audio = true;
      } else {
        arguments[1].mediaConstraints.audio = false;
      }
      if (arguments[1].audio && arguments[1].video === true) {
        arguments[1].mediaConstraints.video = true;
      } else {
        arguments[1].mediaConstraints.video = false;
      }
    }
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

  // Registration stuff

  sip.registerMethods({

    /**
     * This method used to start media (audio or video) call to another user.
     *
     * @memberof MediaAPI
     * @method oSDK.call
     */
    'call': sip.call,

    /**
     * This method is used to attach audio or video stream of media session to web page object like audio or video element.
     *
     * @memberof MediaAPI
     * @method oSDK.attachMediaStream
     */
    'attachMediaStream': media.attachMediaStream
  });

  /*
   * Described in auth module.
   */
  sip.registerNamespaces({
    'client': client
  });

  /*
   * Described in auth module.
   */
  sip.registerObjects({
    'User': client
  });

  sip.registerEvents({

    /*
     * Main events
     */

    /**
    * Dispatched when SIP module got sesson object of incoming or outgoing call.
    *
    * @memberof MediaAPI
    * @event oSDK#gotMediaSession
    * @param {MediaSessionObject} event The event object associated with this event.
    *
    */
    'gotMediaSession': { client: true },

    /**
    * Dispatched when SIP module successfully got media capabilities of current client environment (web browser) which consists of audio and video calls possibilities.
    *
    * @memberof MediaAPI
    * @event oSDK#gotMediaCapabilities
    * @param {oSDK~gotMediaCapabilitiesEvent} event The event object associated with this event.
    *
    */
    'gotMediaCapabilities': { client: true, other: true },

    /*
     * Optional events
     */

    /**
    * Dispatched when SIP module successfully registered on sip server inside openSDP network.
    *
    * @private
    * @event oSDK#sip_registered
    * @param {oSDK~SipRegisteredEvent} event The event object associated with this event.
    *
    */
    'sip_registered': { client: false },

    /**
    * Dispatched when SIP module successfully unregistered on sip server inside openSDP network.
    *
    * @private
    * @event oSDK#sip_unregistered
    * @param {oSDK~SipUnregisteredEvent} event The event object associated with this event.
    *
    */
    'sip_unregistered': { client: false },

    /**
    * Dispatched when SIP module failed to register on sip server inside openSDP network.
    *
    * @private
    * @event oSDK#sip_registrationFaileds
    * @param {oSDK~SipRegistrationFailedEvent} event The event object associated with this event.
    *
    */
    'sip_registrationFailed': { client: false },

    /*
     * Inner events
     */

    'sip_connected': { self: true },
    'sip_disconnected': { self: true },
    'sip_gotMediaSession': { self: true },

    /*
     * Described in auth module
     */
    'disconnected': { other: true, client: 'last' },

    /*
     * Described in auth module
     */
    'connected': { other: true, client: 'last' },

    /*
     * Described in auth module
     */
    'connectionFailed': { client: true, other: true, cancels: 'connected' }
  });

  sip.registerConfig(defaultConfig);


})(oSDK, JsSIP);
