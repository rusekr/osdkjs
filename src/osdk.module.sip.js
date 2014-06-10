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

      attachMediaStream: attachMediaStream,

      detachMediaStream: function (element) {
        attachMediaStream(element, null);
      }
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
   * Converts ours call & answer options to JsSIP friendly structure.
   *
   * @function
   * @private
   */
  function callOptionsConverter(options) {
    if(!sip.utils.isObject(options)) {
      throw new sip.Error('Call/answer options must be the object.');
    }
    if (!options.mediaConstraints || !sip.utils.isObject(options.mediaConstraints)) {
      options.mediaConstraints = {};
    }
    if(!options.mediaConstraints.audio) {
      if (options.audio && options.audio === true) {
        options.mediaConstraints.audio = true;
      } else {
        options.mediaConstraints.audio = false;
      }
    }
    if(!options.mediaConstraints.video) {
      if (options.audio && options.video === true) {
        options.mediaConstraints.video = true;
      } else {
        options.mediaConstraints.video = false;
      }
    }
    sip.log('converted', options);
    return options;
  }

  /**
   * Media session object
   * @constructor MediaSession
   */
  function MediaSession (JsSIPrtcSessionEvent) {

    var self = this;

    self.JsSIPrtcSessionEvent = JsSIPrtcSessionEvent;

    var evData = self.JsSIPrtcSessionEvent.data;

    // Incoming session, if false - outgoing.
    self.incoming = (evData.originator != 'local')?true:false;

    self.originator = evData.originator;

    // Whether session has audio and/or video stream or not.
    Object.defineProperties(self, {
      /**
      * Whether this session has video in stream from remote side or not
      * @alias mediaSession.hasVideo
      * @memberof MediaSession
      * @type boolean
      */
      hasVideo: {
        enumerable: true,
        get: function () {
          if (
            evData.session.getRemoteStreams().length > 0 &&
            evData.session.getRemoteStreams()[0].getVideoTracks().length > 0
          ) {
            return true;
          }
          return false;
        }
      },
      /**
      * Whether this session has audio in stream from remote side or not
      * @alias mediaSession.hasAudio
      * @memberof MediaSession
      * @type boolean
      */
      hasAudio: {
        enumerable: true,
        get: function () {
          if (
            evData.session.getRemoteStreams().length > 0 &&
            evData.session.getRemoteStreams()[0].getAudioTracks().length > 0
          ) {
            return true;
          }
          return false;
        }
      },
      /**
      * Whether this session has only audio in stream from remote side
      * @alias mediaSession.isAudioCall
      * @memberof MediaSession
      * @type boolean
      */
      isAudioCall: {
        enumerable: true,
        get: function () {
          if (
            evData.session.getRemoteStreams().length > 0 &&
            evData.session.getRemoteStreams()[0].getAudioTracks().length > 0 &&
            evData.session.getRemoteStreams()[0].getVideoTracks().length === 0
          ) {
            return true;
          }
          return false;
        }
      },
      /**
      * Whether this session has both audio and video in stream from remote side
      * @alias mediaSession.isVideoCall
      * @memberof MediaSession
      * @type boolean
      */
      isVideoCall: {
        enumerable: true,
        get: function () {
          if (
            evData.session.getRemoteStreams().length > 0 &&
            evData.session.getRemoteStreams()[0].getAudioTracks().length > 0 &&
            evData.session.getRemoteStreams()[0].getVideoTracks().length > 0
          ) {
            return true;
          }
          return false;
        }
      },
     /**
     * Call opponent ID
     * @alias mediaSession.opponent
     * @memberof MediaSession
     * @type string
     */
      opponent: {
        enumerable: true,
        get: function () {
          return evData.session.remote_identity.toString().replace(/^.*?<sip:(.*?)>.*$/, '$1');
        }
      }
    });

    /**
    * Dispatched when current SIP session successfully started.
    *
    * @memberof MediaSession
    * @event MediaSession#started
    * @param {object} event The event object associated with this event.
    *
    */

    /**
    * Dispatched when current SIP session successfully ended (terminated).
    *
    * @memberof MediaSession
    * @event MediaSession#ended
    * @param {object} event The event object associated with this event.
    *
    */

    /**
    * Dispatched when current SIP session abnormally terminated or aborted.
    *
    * @memberof MediaSession
    * @event MediaSession#failed
    * @param {object} event The event object associated with this event.
    *
    */

    /**
    * Dispatched when current SIP session in progress TODO: get from JsSIP doc.
    *
    * @memberof MediaSession
    * @event MediaSession#progress
    * @param {object} event The event object associated with this event.
    *
    */

    /**
    * Dispatched when current SIP session got DTMF signal.
    *
    * @memberof MediaSession
    * @event MediaSession#newDTMF
    * @param {object} event The event object associated with this event.
    *
    */

    /**
     * Attaches event handlers to session events
     * @alias mediaSession.on
     * @memberof MediaSession
     */
    self.on = function (sessionEventType, handler) {
      //TODO: proxy newDTMF to client as gotDTMF on per session basis
      evData.session[sessionEventType] = handler;
    };

    /**
     * Session own streams
     * @alias mediaSession.localStreams
     * @memberof MediaSession
     * @returns {array.<Stream>} Array of stream objects.
     */
    self.localStreams = function () {
      return evData.session.getLocalStreams.apply(evData.session, [].slice.call(arguments, 0));
    };

    /**
     * Session opponent streams
     * @alias mediaSession.remoteStreams
     * @memberof MediaSession
     * @returns {array.<Stream>} Array of stream objects.
     */
    self.remoteStreams = function () {
      return evData.session.getRemoteStreams.apply(evData.session, [].slice.call(arguments, 0));
    };

    /**
     * Attaches local stream to media element
     * @alias mediaSession.attachLocalStream
     * @memberof MediaSession
     */
    self.attachLocalStream = function (element, index) {
      if(typeof index == 'undefined') {
        index = 0;
      }
      var streams = evData.session.getLocalStreams.call(evData.session);
      sip.log('attachLocalStream got streams and index', streams, index);
      media.attachMediaStream(element, streams[index]);
    };

    /**
     * Attaches remote stream to media element
     * @alias mediaSession.attachRemoteStream
     * @memberof MediaSession
     */
    self.attachRemoteStream = function (element, index) {
      if(typeof index == 'undefined') {
        index = 0;
      }
      var streams = evData.session.getRemoteStreams.call(evData.session);
      sip.log('attachRemoteStream got streams and index', streams, index);
      media.attachMediaStream(element, streams[index]);
    };

    /**
     * Detaches stream from media element. This function is for advanced handling of streams. Normally stream will be detached automatically after session end.
     * @alias mediaSession.detachStream
     * @memberof MediaSession
     */
    self.detachStream = function (element) {
      media.detachMediaStream(element);
    };

    /**
     * Disables own video translation to opponent
     * @alias mediaSession.muteVideo
     * @memberof MediaSession
     */
    self.muteVideo = function oSDKSIPMuteVideo (flag) {
      flag = !!flag;

      var localStream = evData.session.getLocalStreams()[0];

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

    /**
     * Disables own audio translation to opponent
     * @alias mediaSession.muteAudio
     * @memberof MediaSession
     */
    self.muteAudio = function oSDKSIPMuteAudio (flag) {
      flag = !!flag;

      var localStream = evData.session.getLocalStreams()[0];

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

    if(self.incoming) {
    /**
     * Answer to incoming call
     * @alias mediaSession.answer
     * @memberof MediaSession
     */
      self.answer = function () {
        if(arguments[0]) {
          arguments[0] = callOptionsConverter(arguments[0]);
        }
        return evData.session.answer.apply(evData.session, [].slice.call(arguments, 0));
      };
    }

    /**
     * Send DTMF signal to other end of call session
     * @alias mediaSession.sendDTMF
     * @memberof MediaSession
     */
    self.sendDTMF = function () {
      return evData.session.sendDTMF.apply(evData.session, [].slice.call(arguments, 0));
    };

    /**
     * End call session
     * @alias mediaSession.end
     * @memberof MediaSession
     */
    self.end = function () {
      return evData.session.terminate.apply(evData.session, [].slice.call(arguments, 0));
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

    var mediaSession = new MediaSession(event);

    sessions.push(mediaSession);

    sip.log('Modifyed session to', mediaSession);
    sip.trigger('gotMediaSession', mediaSession);
  });

  sip.on('sip_disconnected', function (data) {
    sip.trigger('disconnected');
  });

  /**
   * Default semi-transparent proxy of JsSIP call initiator interface.
   * @private
   *
   *
   */
  sip.call = function () {

    if (arguments[1]) {
      arguments[1] = callOptionsConverter(arguments[1]);
    }
    return sip.JsSIPUA.call.apply(sip.JsSIPUA, [].slice.call(arguments, 0));
  };

  //
  sip.audioCall = function (userID) {



    return sip.JsSIPUA.call.apply(sip.JsSIPUA, [].slice.call(arguments, 0));
  };

  sip.videoCall = function () {

  };

  sip.on('beforeunload', function (event) {
    sip.info('Beforeunload start');
    sessions.forEach(function (session) {
      // TODO: make sure session is opened
      if(session) {
        session.end();
      }
    });
    sip.info('Beforeunload end');
  });

  // Registration stuff

  sip.registerMethods({

    /**
     * This method used to start media (audio or video) call to another user. For advanced use. User can specify type of media for this call (audio only, video only, audion and video, without media).
     *
     * @memberof MediaAPI
     * @method oSDK.call
     *
     * @param {string} userID ID of opponent.
     * @param {object} options Call initiation options.
     * @param {string} options.audio Include audio stream in session.
     * @param {string} options.vide Include Video stream in session.
     *
     */
    'call': sip.call,

    /**
     * This method used to start audio call to another user.
     *
     * @memberof MediaAPI
     * @method oSDK.audioCall
     * @param TODO
     * @param TODO
     */
    'audioCall': sip.audioCall,

    /**
     * This method used to start video call to another user.
     *
     * @memberof MediaAPI
     * @method oSDK.videoCall
     * @param TODO
     * @param TODO
     */
    'videoCall': sip.videoCall,

    /**
     * This method used to attach media stream to HTML element.
     *
     * @memberof MediaAPI
     * @method oSDK.attachMediaStream
     * @param {DOMNode} DOMNode Element to which to attach the stream.
     * @param {stream} stream Local or remote stream.
     */
    'attachMediaStream': media.attachMediaStream,

    /**
     * This method used to detach media stream from HTML element.
     *
     * @memberof MediaAPI
     * @method oSDK.detachMediaStream
     * @param {DOMNode} DOMNode Element from which to detach the stream.
     */
    'detachMediaStream': media.detachMediaStream
  });

  /*
   * Described in auth module.
   */
  sip.registerNamespaces({
    'client': client,
    'mediaSessions': sessions // TODO: remove after DEBUG
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
    * Dispatched when oSDK got incoming audio call (both sides have only audio). For use with oSDK.audioCall method.
    *
    * @memberof MediaAPI
    * @event gotIncomingAudioCall
    * @param {MediaSession} event The event object associated with this event.
    *
    */
    'gotIncomingAudioCall': { client: true },

    /**
    * Dispatched when oSDK got incoming video call (both sides have audio and video).  For use with oSDK.videoCall method.
    *
    * @memberof MediaAPI
    * @event gotIncomingVideoCall
    * @param {MediaSession} event The event object associated with this event.
    *
    */
    'gotIncomingVideoCall': { client: true },

    /**
    * Dispatched when SIP module got sesson object of incoming or outgoing call. For advanced use like handling media sessions of all sorts.
    *
    * @memberof MediaAPI
    * @event gotMediaSession
    * @param {MediaSession} event The event object associated with this event.
    *
    */
    'gotMediaSession': { client: true },

    /**
    * Dispatched when SIP module successfully got media capabilities of current client environment (web browser) which consists of audio and video calls possibilities.
    *
    * @memberof CapabilitiesAPI
    * @event gotMediaCapabilities
    * @param {oSDK~MediaAPI#MediaCapabilitiesObject} event The event object associated with this event.
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
