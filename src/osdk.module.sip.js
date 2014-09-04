/*
 * oSDK SIP module
 */
(function (oSDK, JsSIP) {
  "use strict";

  /**
   * @namespace MediaAPI
   */

  var sip = new oSDK.utils.Module('sip');

  // Module specific DEBUG.
  sip.debug = true;

  var defaultConfig = {
    sip: {
      gw: {
        proto: 'wss',
        port: 8088,
        url: 'ws',
        host: null
      }
    }
  };

  // RTC sessions array
  var sessions = (function () {
    var
      instance = {},
      store = {};

      // Clears one or all sessions
    instance.clear = function sessionsClear(sessionID) {

      var deleteSession = function (sessionID) {
        // TODO: make sure session is opened
//         if (store[sessionID].mediaSessionObject && !store[sessionID].mediaSessionObject.end_time) {
//           store[sessionID].mediaSessionObject.end();
//         }
        delete store[sessionID];
      };

      if (typeof sessionID != 'undefined') {
        deleteSession(sessionID);
      } else {
        sip.utils.each(store, function (session, sessionID) {
          deleteSession(sessionID);
        });
      }
    };

    // Creates new session
    instance.create = function sessionsCreate(sessionID, sessionParams) {
      store[sessionID] = sip.utils.extend({
        callOptions: {},
        mediaSessionObject: null,
        callbacks: {}
      }, sessionParams);
      store[sessionID].id = sessionID;

      return store[sessionID];
    };

    // Returns session object by ID
    instance.find = function sessionsFind(sessionID) {
      return store[sessionID];
    };

    instance.show = function sessionsShow() {
      return store;
    };

    return instance;
  })();

  // Unified media object
  var Media = (function () {
    var mediaToGet = {};
    var streamSource = null;
    var streamObjectURL = null;
    var getUserMedia = null;
    var attachMediaStream = null;
    var n = window.navigator;

    // getUserMedia
    if (n.webkitGetUserMedia) {
      getUserMedia = n.webkitGetUserMedia.bind(n);

      attachMediaStream = function (element, stream) {
        element.src = webkitURL.createObjectURL(stream);
      };
    }
    else if (n.mozGetUserMedia) {
      getUserMedia = n.mozGetUserMedia.bind(n);

      attachMediaStream = function (element, stream) {
        element.mozSrcObject = stream;
      };
    }
    else if (n.getUserMedia) {
      getUserMedia = n.getUserMedia.bind(n);

      attachMediaStream = function (element, stream) {
        element.src = stream;
      };
    }

    return {
      tryCapabilities: function (callback) {
        mediaToGet = {
          video: true,
          audio: true
        };
        var successCallback = function (stream) {
          stream.stop();
          callback.call(this, 'success', mediaToGet);
        };
        var errorCallback = function (err) {
          sip.log('Error while getting media stream: ', err);
          if (mediaToGet.video === false) {
            //if tried already to got only audio
            callback.call(this, 'error', mediaToGet, err);
          }
          else {
            //trying to get only audio
            mediaToGet.video = false;
            getUserMedia.call(this, mediaToGet, successCallback, errorCallback);
          }
        };
        //trying to get audio and video
        getUserMedia.call(this, mediaToGet, successCallback, errorCallback);
      },

      getUserMedia: function (caps, success, error) {
        return getUserMedia.call(this, caps, success, error);
      },

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
      if (typeof flag !== undefined) {
        clientInt.needAudio = !!flag;
      }
      return clientInt.needAudio;
    },
    needVideo: function (flag) {
      if (typeof flag !== undefined) {
        clientInt.needAudio = !!flag;
      }
      return clientInt.needVideo;
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
    if (!sip.utils.isObject(options)) {
      throw new sip.Error('Call/answer options must be the object.');
    }
    if (!options.mediaConstraints || !sip.utils.isObject(options.mediaConstraints)) {
      options.mediaConstraints = {};
    }
    if (!options.mediaConstraints.audio) {
      if (options.audio && options.audio === true) {
        options.mediaConstraints.audio = true;
      } else {
        options.mediaConstraints.audio = false;
      }
      delete options.audio;
    }
    if (!options.mediaConstraints.video) {
      if (options.video && options.video === true) {
        options.mediaConstraints.video = true;
      } else {
        options.mediaConstraints.video = false;
      }
      delete options.video;
    }
    sip.log('converted', options);
    return options;
  }

  /**
   * Media session object. Emitted as first parameter of {@link MediaAPI.html#gotMediaSession gotMediaSession} event. With this object you can control associated audio or video call. Each call is represented with separate <code>MediaSession</code> object.
   *
   * @constructor MediaSession
   */
  function MediaSession (JsSIPrtcSessionEvent) {

    var evData = JsSIPrtcSessionEvent.data,
        self = this,
        eventNamesMap = {
          'connecting': 'connecting',
          'progress': 'progress',
          'started': 'started',
          'gotDTMF': 'newDTMF',
          'failed': 'failed',
          'ended': 'ended'
        },
        currentSession = sessions.create(evData.session.id, { mediaSessionObject: self });

    currentSession.callOptions = evData.session.mediaConstraints;
    sip.log('incoming session added', sessions.show(), currentSession);

    // Whether session has audio and/or video stream or not.
    Object.defineProperties(self, {

      /**
       * Contains internal JsSIP newRTCSession event data. For advanced use.
       *
       * @alias JsSIPrtcSessionEvent
       * @memberof MediaSession
       * @instance
       *
       * @type object
       */
      JsSIPrtcSessionEvent: {
        enumerable: true,
        get: function () {
          return JsSIPrtcSessionEvent;
        }
      },

      /**
       * Initiator of the media session. Can be 'local', 'remote' or 'system'.
       *
       * @alias originator
       * @memberof MediaSession
       * @instance
       * @type string
       */
      originator: {
        enumerable: true,
        get: function () {
          return evData.originator;
        }
      },

      /**
       * Whether this media session is incoming or not.
       *
       * @alias incoming
       * @memberof MediaSession
       * @instance
       * @type boolean
       */
      incoming: {
        enumerable: true,
        get: function () {
          return (evData.originator != 'local')?true:false;
        }
      },

      /**
      * Whether this session has video in stream from remote side or not.
      * @alias hasVideo
      * @memberof MediaSession
      * @instance
      * @type boolean
      */
      hasVideo: {
        enumerable: true,
        get: function () {
          if (
              evData.originator == 'local' &&
              currentSession.callOptions.video === true ||
              evData.originator != 'local' &&
              evData.request.body.match(/m=video/)
          ) {
            return true;
          }
          return false;
        }
      },

      /**
      * Whether this session has audio in stream from remote side or not.
      * @alias hasAudio
      * @memberof MediaSession
      * @instance
      * @type boolean
      */
      hasAudio: {
        enumerable: true,
        get: function () {
          if (
              evData.originator == 'local' &&
              currentSession.callOptions.audio === true ||
              evData.originator != 'local' &&
              evData.request.data.match(/m=audio/)
          ) {
            return true;
          }
          return false;
        }
      },

      /**
      * Whether this session has only audio in stream from remote side.
      * @alias isAudioCall
      * @memberof MediaSession
      * @instance
      * @type boolean
      */
      isAudioCall: {
        enumerable: true,
        get: function () {
          if (
            self.hasAudio && !self.hasVideo
          ) {
            return true;
          }
          return false;
        }
      },

      /**
      * Whether this session has both audio and video in stream from remote side.
      * @alias isVideoCall
      * @memberof MediaSession
      * @instance
      * @type boolean
      */
      isVideoCall: {
        enumerable: true,
        get: function () {
          if (
            self.hasAudio && self.hasVideo
          ) {
            return true;
          }
          return false;
        }
      },
     /**
     * Call opponent ID.
     * @alias opponent
     * @memberof MediaSession
     * @instance
     * @type string
     */
      opponent: {
        enumerable: true,
        get: function () {
          return evData.session.remote_identity.toString().replace(/^.*?<sip:(.*?)>.*$/, '$1');
        }
      },
     /**
     * Current user ID.
     * @alias me
     * @memberof MediaSession
     * @instance
     * @type string
     */
      me: {
        enumerable: true,
        get: function () {
          return evData.session.local_identity.toString().replace(/^.*?<sip:(.*?)>.*$/, '$1');
        }
      },
     /**
     * Call initiator ID.
     * @alias from
     * @memberof MediaSession
     * @instance
     * @type string
     */
      from: {
        enumerable: true,
        get: function () {
          if (self.incoming) {
            return self.opponent;
          } else {
            return self.me;
          }
        }
      },
     /**
     * Callee ID.
     * @alias to
     * @memberof MediaSession
     * @instance
     * @type string
     */
      to: {
        enumerable: true,
        get: function () {
          if (!self.incoming) {
            return self.opponent;
          } else {
            return self.me;
          }
        }
      }
    });

    sip.log('audiovideo', self.hasAudio, self.hasVideo);

    /**
    * Dispatched after the local media stream is added into MediaSession and before the ICE gathering starts for initial INVITE request or “200 OK” response transmission.
    *
    * @memberof MediaSession
    * @event MediaSession#connecting
    * @param {object} event The event object associated with this event.
    *
    */

    /**
    * Dispatched when current call answered.
    *
    * @memberof MediaSession
    * @event MediaSession#started
    * @param {object} event The event object associated with this event.
    *
    */

    /**
    * Dispatched when established call ended.
    *
    * @memberof MediaSession
    * @event MediaSession#ended
    * @param {object} event The event object associated with this event.
    *
    */

    /**
    * Dispatched when current call was unable to establish.
    *
    * @memberof MediaSession
    * @event MediaSession#failed
    * @param {object} event The event object associated with this event.
    *
    */

    /**
    * Dispatched when current media session receiving or generating a 1XX SIP class response (>100) to the INVITE request.
    *
    * @memberof MediaSession
    * @event MediaSession#progress
    * @param {object} event The event object associated with this event.
    *
    */

    /**
    * Dispatched when current media session got DTMF signal.
    *
    * @memberof MediaSession
    * @event MediaSession#gotDTMF
    * @param {object} event The event object associated with this event.
    *
    */

    /**
     * Attaches event handlers to session events.
     * @alias on
     * @memberof MediaSession
     * @instance
     * @param {string||array} event Event type.
     * @param {function} handler Handler function.
     * @param {object} handler.event Event object.
     */
    self.on = function (sessionEventTypes, handler) {
      sip.utils.each([].concat(sessionEventTypes), function (sessionEventType) {
        // Checking of eventType existance
        if (!sip.utils.isString(eventNamesMap[sessionEventType])) {
          throw new sip.Error({
            message: "Media session no such event type.",
            ecode: 'sip0121',
            data: sessionEventType
          });
        }
        if (!currentSession.callbacks[sessionEventType]) {
          currentSession.callbacks[sessionEventType] = [];
        }
        currentSession.callbacks[sessionEventType].push(handler);
      });
    };

    /**
     * Session own streams.
     * @alias localStreams
     * @memberof MediaSession
     * @instance
     * @returns {Stream[]} Array of {@link http://dev.w3.org/2011/webrtc/editor/getusermedia.html#mediastream MediaStream} objects.
     */
    self.localStreams = function () {
      return evData.session.getLocalStreams.apply(evData.session, [].slice.call(arguments, 0));
    };

    /**
     * Session opponent streams.
     * @alias remoteStreams
     * @memberof MediaSession
     * @instance
     * @returns {Stream[]} Array of {@link http://dev.w3.org/2011/webrtc/editor/getusermedia.html#mediastream MediaStream} objects.
     */
    self.remoteStreams = function () {
      return evData.session.getRemoteStreams.apply(evData.session, [].slice.call(arguments, 0));
    };

    /**
     * Attaches local stream to media element.
     * @alias attachLocalStream
     * @memberof MediaSession
     * @instance
     * @param {DOMNode} element - Element to which to attach a media stream.
     * @param {integer} [index] - Index of the track in stream.
     */
    self.attachLocalStream = function (element, index) {
      if (typeof index == 'undefined') {
        index = 0;
      }
      var streams = evData.session.getLocalStreams.call(evData.session);
      sip.log('attachLocalStream got streams and index', streams, index);
      Media.attachMediaStream(element, streams[index]);
    };

    /**
     * Attaches remote stream to media element.
     * @alias attachRemoteStream
     * @memberof MediaSession
     * @instance
     * @param {DOMNode} element - Element to which to attach a media stream.
     * @param {integer} [index] - Index of the track in stream.
     */
    self.attachRemoteStream = function (element, index) {
      if (typeof index == 'undefined') {
        index = 0;
      }
      var streams = evData.session.getRemoteStreams.call(evData.session);
      sip.log('attachRemoteStream got streams and index', streams, index);
      Media.attachMediaStream(element, streams[index]);
    };

    /**
     * Detaches stream from media element.
     * @alias detachStream
     * @memberof MediaSession
     * @instance
     * @param {DOMNode} element - Element from which to detach a media stream.
     */
    self.detachStream = function (element) {
      Media.detachMediaStream(element);
    };

    /**
     * Disables own video translation to opponent.
     * @alias muteVideo
     * @memberof MediaSession
     * @instance
     * @param {boolean} flag Flag to set mute to true or false.
     */
    self.muteVideo = function oSDKSIPMuteVideo (flag) {
      flag = !!flag;

      var localStream = evData.session.getLocalStreams()[0];

      if (!localStream) {
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
     * Disables own audio translation to opponent.
     * @alias muteAudio
     * @memberof MediaSession
     * @instance
     * @param {boolean} flag Flag to set mute to true or false.
     */
    self.muteAudio = function oSDKSIPMuteAudio (flag) {
      flag = !!flag;

      var localStream = evData.session.getLocalStreams()[0];

      if (!localStream) {
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

    if (self.incoming) {
    /**
     * Answer to incoming call. NOTICE: this method is available only for incoming session.
     * @alias answer
     * @memberof MediaSession
     * @instance
     * @param {object} [options] Answer options. Defaults to corresponding parameters of caller side.
     * @param {boolean} options.audio Answer with own audio stream.
     * @param {boolean} options.video Answer with own video stream.
     */
      self.answer = function () {

        if (!sip.utils.isObject(arguments[0])) {
          arguments[0] = {};
        }

        // Defaults
        if (typeof arguments[0].audio == 'undefined') {
          arguments[0].audio = self.hasAudio?true:false;
        }
        if (typeof arguments[0].video == 'undefined') {
          arguments[0].video = self.hasVideo?true:false;
        }

        // Conversion to JsSIP object.
        arguments[0] = callOptionsConverter(arguments[0]);

        sip.log('Modified answer arguments to', arguments[0]);

        return evData.session.answer.apply(evData.session, [].slice.call(arguments, 0));
      };
    }

    /**
     * TODO: to document options parameter.
     * Send DTMF signal to other end of call session.
     * @alias sendDTMF
     * @memberof MediaSession
     * @instance
     * @param {object} options Options of signal to be sent.
     */
    self.sendDTMF = function () {
      return evData.session.sendDTMF.apply(evData.session, [].slice.call(arguments, 0));
    };

    /**
     * Terminates this call session.
     * @alias end
     * @memberof MediaSession
     * @instance
     * @param {object} [options] Options for call session termination.
     * @param {string} options.reasonPhrase String representing the SIP reason phrase.
     */
    self.end = function () {

      if (!sip.utils.isObject(arguments[0])) {
        arguments[0] = {};
      }

      // Conversion to JsSIP config object
      if (typeof arguments[0].reasonPhrase != 'undefined') {
        arguments[0].reason_phrase = arguments[0].reasonPhrase;
        delete arguments[0].reasonPhrase;
      }

      return evData.session.terminate.apply(evData.session, [].slice.call(arguments, 0));
    };

    // Assigning internal event handlers for JsSIP events
    sip.utils.each(eventNamesMap, function (jssipName, ourName) {
      evData.session[jssipName] = function () {
        sip.log('Mapping callback for session event', ourName, 'to JsSIP`s', jssipName);

        // Internal MediaSession before-events handling by type
        switch (jssipName) {
          case 'connecting':

          break;
        }

        var args = [].slice.call(arguments, 0);
        if (sip.utils.isArray(currentSession.callbacks[ourName])) {
          sip.utils.each(currentSession.callbacks[ourName], function (handler) {
            if (sip.utils.isFunction(handler)) {
              sip.log('MediaSession applies handler for', ourName, 'event.');
              try {
                handler.apply(self, args);
              } catch (data) {
                throw new sip.Error({
                  message: "SIP media session handling error.",
                  ecode: 'sip0111',
                  data: data
                });
              }
            }
          });
        }

        // Internal MediaSession after-events handling by type
        switch (jssipName) {
          case 'ended':
          case 'failed':
            // Stopping getting of local media stream to release camera/microphone.
            if (sip.utils.isArray(evData.session.getLocalStreams()))
            sip.utils.each(evData.session.getLocalStreams(), function (stream) {
              stream.stop();
            });
            // Deleting current session TODO: Commented as something wrong with that
            // sessions.clear(currentSession.id);
            break;
        }
      };
    });

  }

  /**
   * Initialization method
   * @alias initialize
   * @memberof sip
   * @private
   */
  sip.initialize = function (config) {

    Media.tryCapabilities(function (result, props) {
      if (result == 'success') {
        clientInt.canAudio = props.audio;
        clientInt.canVideo = props.video;
        sip.trigger('gotMediaCapabilities', props);
      }
      else {
        throw new sip.Error("Media capabilities are not found.");
      }
    });

    try {
      // JsSIP initialization
      sip.JsSIPUA = new JsSIP.UA(config);
    } catch (data) {
      sip.trigger(['connectionFailed'], new sip.Error({
        message: "SIP configuration error.",
        ecode: 'sip0001',
        data: data
      }));
    }

    // TODO: merge with other module stuff
    attachTriggers(attachableEvents, sip.JsSIPUA.on, sip.JsSIPUA);

  };

  // Sip start method
  sip.connect = function () {
    sip.JsSIPUA.start();
  };

  // Sip stop method
  sip.disconnect = function () {
    if (sip.JsSIPUA) {
      sip.JsSIPUA.stop();
    }
  };

  sip.on('gotTempCreds', function (event) {

    sip.log('Got temp creds', arguments);

    var hosts = [];
    if (sip.config('gw.host')) {
      hosts = hosts.concat(sip.config('gw.host'));
    } else if (event.data.uris && sip.utils.isArray(event.data.uris.sip)) {
      sip.utils.each(event.data.uris.sip, function (uri) {
        hosts.push(sip.config('gw.proto') + '://' + uri.split(';')[0] + (uri.split(';')[0].split(':').length > 1?'':(':' + sip.config('gw.port'))) + '/' + sip.config('gw.url'));
      });
    }

    // Turn
    var turnServers = [];
    if (event.data.uris && sip.utils.isArray(event.data.uris.turn)) {
      sip.utils.each(event.data.uris.turn, function (uri) {
        turnServers.push({
          urls: 'turn:' + uri.replace(';', '?'),
          username: event.data.username,
          credential: event.data.password
        });
      });
    }

    // Stun
    var stunServers = [];
    if (event.data.uris && sip.utils.isArray(event.data.uris.stun)) {
      sip.utils.each(event.data.uris.stun, function (uri) {
        stunServers.push('stun:' + uri.replace(/;.*$/, ''));
      });
    }

    sip.initialize({
      'log': {
        'level': sip.debug?3:0
      },
      'ws_servers': hosts,
      'connection_autorecovery': false,
      'uri': 'sip:' + event.data.username.split(':')[1],
      'password': event.data.password,
      'stun_servers': stunServers,
      'turn_servers': turnServers,
      'trace_sip': true,
      'register': true,
      'authorization_user': event.data.username.split(':')[1],
      'use_preloaded_route': false
      //,hack_via_tcp: true
    });

    sip.connect();

  });

  // On auth disconnecting event
  sip.on('disconnecting', function (data) {
    sip.disconnect();
    sessions.clear();
  });

  // On other modules connectionFailed event
  sip.on('connectionFailed', function (data) {
    sip.disconnect();
  });

  // TODO: replace with direct jssip listener
  sip.on('sip_gotMediaSession', function (event) {
    // Augmenting session object with useful properties
    var mediaSession = new MediaSession(event);

    sip.trigger('gotMediaSession', mediaSession);
    if(mediaSession.incoming) {
      if (mediaSession.isAudioCall) {
        sip.trigger('gotIncomingAudioCall', mediaSession);
      } else if (mediaSession.isVideoCall) {
        sip.trigger('gotIncomingVideoCall', mediaSession);
      }
    }

    sip.log('Modified session to', mediaSession);

  });

  sip.on('sip_disconnected', function (data) {
    sip.trigger('disconnected');
  });

  /**
   * Default semi-transparent proxy of JsSIP call initiator interface.
   * NOTICE: may be add session callbacks options to it.
   * @private
   *
   *
   */
  sip.call = function () {

    var
      callOptions = sip.utils.isObject(arguments[1])?callOptionsConverter(arguments[1]):null,
      opponent = arguments[0];

    sip.log('JsSIP call arguments', arguments, callOptions);

    sip.JsSIPUA.call.call(sip.JsSIPUA, opponent, callOptions);

  };

  // Simple audio call method
  sip.audioCall = function (userID, callbacksObject) {

    currentSessionID = sip.call(userID, { audio: true, video: false });

    // TODO: check callbacksObject for sanity
    if (sip.utils.isObject(callbacksObject)) {
      sessions[currentSessionID].callbacks = callbacksObject;
    }

    return currentSessionID;
  };

  // Simple video call method
  sip.videoCall = function () {
    currentSessionID = sip.call(userID, { audio: true, video: true });

    // TODO: check callbacksObject for sanity
    if (sip.utils.isObject(callbacksObject)) {
      sessions[currentSessionID].callbacks = callbacksObject;
    }

    return currentSessionID;
  };

  // Expand user capabilities (add "instantMessaging")
  if (typeof sip.factory.user != 'undefined') {

    var fUser = new sip.factory.user();

    fUser.expandCapabilities('audioCall', false, false, 'sip');
    fUser.expandCapabilities('videoCall', false, false, 'sip');

  }

  sip.on('windowBeforeUnload', function (event) {
    sip.info('windowBeforeUnload start');
    sessions.clear();
    sip.info('windowBeforeUnload end');
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

    /** TODO: incomplete for public
     * This method used to start audio call to another user.
     * @private
     *
     * @memberof MediaAPI
     * @method oSDK.audioCall
     * @param TODO
     * @param TODO
     */
    'audioCall': sip.audioCall,

    /** TODO: incomplete for public
     * This method used to start video call to another user.
     *
     * @private
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
     * @param {stream} stream Local or remote {@link http://dev.w3.org/2011/webrtc/editor/getuserMedia.html#mediastream MediaStream}.
     */
    'attachMediaStream': Media.attachMediaStream,

    /**
     * This method used to detach media stream from HTML element.
     *
     * @memberof MediaAPI
     * @method oSDK.detachMediaStream
     * @param {DOMNode} DOMNode Element from which to detach the stream.
     */
    'detachMediaStream': Media.detachMediaStream
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
    * Dispatched when oSDK got incoming audio call (both sides have only audio). Subset of gotMediaSession event type.
    *
    * @memberof MediaAPI
    * @event gotIncomingAudioCall
    * @param {MediaSession} event The event object associated with this event.
    *
    */
    'gotIncomingAudioCall': { client: true },

    /**
    * Dispatched when oSDK got incoming video call (both sides have audio and video). Subset of gotMediaSession event type.
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
    * @param {object} event The event object associated with this event.
    * @param {boolean} event.audio User's browser allows capturing audio.
    * @param {boolean} event.video User's browser allows capturing video.
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
