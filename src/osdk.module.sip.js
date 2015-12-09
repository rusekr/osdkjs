/*
 * oSDK SIP module
 */
(function (oSDK, JsSIP, AdapterJS) {
  "use strict";

  /**
   * @namespace MediaAPI
   */

  /**
   * @namespace CapabilitiesAPI
   */

  var module = new oSDK.utils.Module('sip');

  // Module specific DEBUG.
  module.debug = true;

  module.disconnectedByUser = false;

  var defaultConfig = {
    tryMediaCapabilities: true, // Try media capabilities on app start

    gw: {
      proto: 'wss',
      port: 8088,
      url: 'ws',
      host: null
    },
    debug: true,
    stun: null,
    turn: null,
    authname: false, // Forauthorization_user, separate from uri username if needed.
    use_preloaded_route: false,
    hack_via_tcp: true,
    hack_ip_in_contact: true,
    hack_username_in_contact: null // NOTICE: for default hack_username_in_contact = <contactname>-<uuid>@<contactdomain>
  };

  // RTC sessions array
  var sessions = (function () {
    var
      instance = {},
      store = {};

      // Clears one or all sessions
    instance.clear = function sessionsClear(sessionID, doNotDelete) {

      var deleteSession = function (sessionID) {
        // make sure session is opened
        if (store[sessionID].mediaSessionObject) {
          if (!store[sessionID].mediaSessionObject.isEnded) {
            store[sessionID].mediaSessionObject.end();
          }
          store[sessionID].mediaSessionObject.localStreams().forEach(function (stream) {
            stream.getTracks().forEach(function (track) {
              if (track.stop) {
                track.stop();
              }
            });
          });
          store[sessionID].mediaSessionObject.remoteStreams().forEach(function (stream) {
            stream.getTracks().forEach(function (track) {
              if (track.stop) {
                track.stop();
              }
            });
          });
        }
        if (!doNotDelete) {
          delete store[sessionID];
        }
      };

      if (typeof sessionID != 'undefined') {
        deleteSession(sessionID);
      } else {
        module.utils.each(store, function (session, sessionID) {
          deleteSession(sessionID);
        });
      }
    };

    // Creates new session
    instance.create = function sessionsCreate(sessionID, sessionParams) {
      sessionParams  = module.utils.isObject(sessionParams) ? sessionParams : {};
      store[sessionID] = module.utils.extend({
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

  var authCache = null;

  // Unified media object
  var Media = (function () {
    var mediaToGet = {};
    var streamSource = null;
    var streamObjectURL = null;
    var getUserMedia = null;
    var attachMediaStream = null;
    var n = window.navigator;

    // getUserMedia
    if (n.getUserMedia) {
      getUserMedia = n.getUserMedia.bind(n);

//       attachMediaStream = function (element, stream) {
//         element.src = stream;
//       };
    } else if (n.webkitGetUserMedia) {
      getUserMedia = n.webkitGetUserMedia.bind(n);

//       attachMediaStream = function (element, stream) {
//         element.src = (URL || webkitURL).createObjectURL(stream);
//       };
    }
    else if (n.mozGetUserMedia) {
      getUserMedia = n.mozGetUserMedia.bind(n);

//       attachMediaStream = function (element, stream) {
//         element.mozSrcObject = stream;
//       };
    }

    // Override
    attachMediaStream = function (element, stream) {

      if (window.attachMediaStream) {
        window.attachMediaStream(element, stream);
      } else if (typeof element.srcObject !== 'undefined') {
        element.srcObject = stream;
      } else if (typeof element.mozSrcObject !== 'undefined') {
        element.mozSrcObject = stream;
      } else if (typeof element.src !== 'undefined') {
        element.src = URL.createObjectURL(stream);
      } else {
        console.log('Error attaching stream to element.');
      }
      return element; // !!!
    };

    return {
      tryCapabilities: function (callback) {
        mediaToGet = {
          video: true,
          audio: true
        };
        var successCallback = function (stream) {
          stream.getTracks().forEach(function (track) {
            if (track.stop) {
              track.stop();
            }
          });
          callback.call(this, 'success', mediaToGet);
        };
        var errorCallback = function (err) {
          module.log('Error while getting media stream: ', err);
          if (mediaToGet.video === false) {
            //if tried already to got only audio
            mediaToGet.audio = false;
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
        element.pause();
        element.src =  '';
      }
    };
  })();

  var attachableEvents = {
    'connected': 'sip_connected', // not needed now
    'disconnected': 'sip_disconnected',
    'registered': ['sip_registered'],
    'unregistered': 'sip_unregistered',
    'registrationFailed': ['connectionFailed', 'sip_registrationFailed'], // TODO: test
    'connectionFailed': 'sip_connectionFailed',
    'newRTCSession': 'sip_gotMediaSession'
  };

  var clientInt = {
    canAudio: null,
    canVideo: null,
    needAudio: true, // TODO: retreive from internal storage on start?
    needVideo: true  // TODO: retreive from internal storage on start?
  };

  // Attach triggers for registered events through initialized module object
  var attachTriggers = function (attachableEvents, triggerFunction, context) {
    module.utils.each(attachableEvents, function (ev, i) {
      var outer = [];
      if (typeof(ev) === 'string') { // Assuming event alias
        outer.push(ev);
      } else if (ev instanceof Array){ // Assuming array of event aliases
        outer = outer.concat(ev);
      } else {
        outer.push(i); // Assuming boolean
      }

      module.utils.each(outer, function (outerEvent) {
        triggerFunction.call(context || this, i, function (e) {
          module.trigger(outerEvent, { data: e });
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
    if (!module.utils.isObject(options)) {
      throw new module.Error('Call/answer options must be the object.');
    }
    if (!options.mediaConstraints || !module.utils.isObject(options.mediaConstraints)) {
      options.mediaConstraints = {};
    }
    if (!options.mediaConstraints.audio) {
      if (options.audio && options.audio === true) {
        options.mediaConstraints.audio = true;
      } else {
        options.mediaConstraints.audio = false;
      }
    }
    delete options.audio;
    if (!options.mediaConstraints.video) {
      if (options.video && options.video === true) {
        options.mediaConstraints.video = true;
      } else {
        options.mediaConstraints.video = false;
      }
    }
    delete options.video;

    // Use or create options.data object.
    options.data = (module.utils.isObject(options.data))?options.data:{};
    // Passing mediaConstraints to our future session object through data and keeping it for JsSIP call config.
    options.data.mediaConstraints = options.mediaConstraints;
    // Passing callbacks to future session object.
    if(options.callbacks) {
      options.data.callbacks = options.callbacks;
      delete options.callbacks;
    }

    module.log('converted', options);
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
          'accepted': 'accepted',
          'connecting': 'connecting',
          'ended': 'ended',
          'failed': 'failed',
          'gotDTMF': 'newDTMF',
          'progress': 'progress',
          'started': 'confirmed',
          'streamadded': 'addstream',
          'streamremoved': 'removestream'



        },
        currentSession = sessions.create(evData.session.id, { mediaSessionObject: self });

    currentSession.callOptions = evData.session.data.mediaConstraints;
    currentSession.callbacks = module.utils.isObject(evData.session.data.callbacks) ? evData.session.data.callbacks : {};

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
      },
     /**
     * Whether session ended or not.
     * @alias isEnded
     * @memberof MediaSession
     * @instance
     * @type string
     */
      isEnded: {
        enumerable: true,
        get: function () {
          return evData.session.isEnded();
        }
      }
    });

    module.log('audiovideo', self.hasAudio, self.hasVideo);

    /**
    * Dispatched after the local media stream is added into MediaSession and before the ICE gathering starts for initial INVITE request or “200 OK” response transmission.
    *
    * @memberof MediaSession
    * @event MediaSession#connecting
    * @param {object} request Object representing the incoming INVITE SIP message.
    *
    */

    /**
    * Dispatched when current call answered (2XX received/sent).
    *
    * @memberof MediaSession
    * @event MediaSession#accepted
    * @param {string} initiator Initiator of this event.
    * @param {object} response (Outgoing call only) Instance of the received SIP 2XX response.
    *
    */

    /**
    * Dispatched when current call is confirmed (ACK received/sent).
    *
    * @memberof MediaSession
    * @event MediaSession#started
    * @param {string} initiator Initiator of this event.
    * @param {object} response (Outgoing call only) Instance of the received SIP ACK response.
    *
    */

    /**
    * Dispatched when established call ended.
    *
    * @memberof MediaSession
    * @event MediaSession#ended
    * @param {string} initiator Initiator of this event. Can be 'remote', 'local' and 'system'.
    * @param {object|null} response (If initiator is 'remote') Response object associated with this event.
    * @param {string} cause Cause of this state.
    *
    */

    /**
    * Dispatched when current call was unable to establish.
    *
    * @memberof MediaSession
    * @event MediaSession#failed
    * @param {string} initiator Initiator of this event. Can be 'remote', 'local' and 'system'.
    * @param {object|null} response (If initiator is 'remote') Response object associated with this event.
    * @param {string} cause Cause of this state.
    *
    */

    /**
    * Dispatched when current media session receiving or generating a 1XX SIP class response (>100) to the INVITE request.
    *
    * @memberof MediaSession
    * @event MediaSession#progress
    * @param {string} initiator Initiator of this event. Can be 'remote', 'local' and 'system'.
    * @param {object} response (Outgoing call only) Instance of the received SIP 2XX response.
    *
    */

    /**
    * Dispatched when current media session got DTMF signal.
    *
    * @memberof MediaSession
    * @event MediaSession#gotDTMF
    * @param {string} initiator Initiator of this event. Can be 'remote', 'local' and 'system'.
    * @param {object} dtmf Object representing parameters of DTMF signal.
    * @param {object} response Instance of the incoming/outgoing INFO request.
    *
    */

    /**
    * Dispatched when remote mediastream added to current media session.
    *
    * @memberof MediaSession
    * @event MediaSession#streamadded
    * @param {object} MediaStream - Object representing the remote MediaStream.
    *
    */

    /**
    * Dispatched when remote mediastream removed from current media session.
    *
    * @memberof MediaSession
    * @event MediaSession#streamremoved
    * @param {object} MediaStream - Object representing the remote MediaStream.
    *
    */

    /**
     * Attaches event handlers to session events.
     * @alias on
     * @memberof MediaSession
     * @instance
     * @param {string|string[]} event Event type.
     * @param {function} handler Handler function.
     * @param {object} handler.event Event object.
     */
    self.on = function (sessionEventTypes, handler) {
      module.utils.each([].concat(sessionEventTypes), function (sessionEventType) {
        // Checking of eventType existance
        if (!module.utils.isString(eventNamesMap[sessionEventType])) {
          throw new module.Error({
            message: "Media session no such event type.",
            ecode: '0121',
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
      if (evData.session.connection && evData.session.connection.peerConnection) {
        return evData.session.connection.peerConnection.getLocalStreams.apply(evData.session.connection.peerConnection, [].slice.call(arguments, 0));
      } else {
        return [];
      }
    };

    /**
     * Session opponent streams.
     * @alias remoteStreams
     * @memberof MediaSession
     * @instance
     * @returns {Stream[]} Array of {@link http://dev.w3.org/2011/webrtc/editor/getusermedia.html#mediastream MediaStream} objects.
     */
    self.remoteStreams = function () {
      if (evData.session.connection && evData.session.connection.peerConnection) {
        return evData.session.connection.peerConnection.getRemoteStreams.apply(evData.session.connection.peerConnection, [].slice.call(arguments, 0));
      } else {
        return [];
      }
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
      var streams = evData.session.connection.peerConnection.getLocalStreams.call(evData.session.connection.peerConnection);
      module.log('attachLocalStream got streams and index', streams, index);
      return Media.attachMediaStream(element, streams[index]);
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
      var streams = evData.session.connection.peerConnection.getRemoteStreams.call(evData.session.connection.peerConnection);
      module.log('attachRemoteStream got streams and index', streams, index);
      return Media.attachMediaStream(element, streams[index]);
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

      var localStream = evData.session.connection.peerConnection.getLocalStreams()[0];

      if (!localStream) {
        module.log('Local media stream is not initialized.');
        return;
      }

      // Call the getVideoTracks method via adapter.js.
      var videoTracks = localStream.getVideoTracks();

      if (videoTracks.length === 0) {
        module.log('No local video available.');
        return;
      }

      for (var i = 0; i < videoTracks.length; i++) {
        if (!flag) {
          videoTracks[i].enabled = true;
          module.log('Video unmuted.');
        } else {
          videoTracks[i].enabled = false;
          module.log('Video muted.');
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

      var localStream = evData.session.connection.peerConnection.getLocalStreams()[0];

      if (!localStream) {
        module.log('Local media stream is not initialized.');
        return;
      }

      // Call the getAudioTracks method via adapter.js.
      var audioTracks = localStream.getAudioTracks();

      if (audioTracks.length === 0) {
        module.log('No local audio available.');
        return;
      }

      for (var i = 0; i < audioTracks.length; i++) {
        if (!flag) {
          audioTracks[i].enabled = true;
          module.log('Audio unmuted.');
        } else {
          audioTracks[i].enabled = false;
          module.log('Audio muted.');
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
      self.answer = function (options) {

        if (!module.utils.isObject(options)) {
          options = {};
        }

        // Defaults
        if (typeof options.audio == 'undefined') {
          options.audio = self.hasAudio?true:false;
        }
        if (typeof options.video == 'undefined') {
          options.video = self.hasVideo?true:false;
        }

        // Conversion to JsSIP object.
        options = callOptionsConverter(options);
        options = module.utils.extend({}, { pcConfig: module.config('pcConfig') }, options || {});

        module.log('Modified answer arguments to', options);

        return evData.session.answer.call(evData.session, options);
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

      if (!module.utils.isObject(arguments[0])) {
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
    module.utils.each(eventNamesMap, function (jssipName, ourName) {
      evData.session.on(jssipName, function () {
        module.log('Mapping callback for session event', ourName, 'to JsSIP`s', jssipName);

        // Internal MediaSession before-events handling by type
//         switch (jssipName) {
//           case 'connecting':
//
//           break;
//         }

        var args = [].slice.call(arguments, 0);
        if (module.utils.isArray(currentSession.callbacks[ourName])) {
          module.utils.each(currentSession.callbacks[ourName], function (handler) {
            if (module.utils.isFunction(handler)) {
              module.log('MediaSession applies handler for', ourName, 'event with args:', args);
              try {
                handler.apply(self, args);
              } catch (data) {
                throw new module.Error({
                  message: "MediaSession error in client handler.",
                  ecode: '0111',
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
            sessions.clear(currentSession.id, true);
            break;
        }
      });
    });

  }

  /**
   * Initialization method
   * @alias initialize
   * @memberof sip
   * @private
   */
  module.initialize = function (config) {

    if (module.config('tryMediaCapabilities')) {
      Media.tryCapabilities(function (result, props, NavigatorUserMediaError) {
        if (result != 'success') {
          props.NavigatorUserMediaError = NavigatorUserMediaError.name;
        }

        clientInt.canAudio = props.audio;
        clientInt.canVideo = props.video;
        module.trigger('gotMediaCapabilities', props);
      });
    }

    try {
      if (module.debug) {
        JsSIP.debug.enable('JsSIP:*');
      } else {
        JsSIP.debug.disable('JsSIP:*');
      }
      // JsSIP initialization
      module.JsSIPUA = new JsSIP.UA(config);
    } catch (data) {
      module.trigger(['connectionFailed'], new module.Error({
        message: "SIP configuration error.",
        ecode: '0001',
        data: data
      }));
      module.trigger(['disconnected'], { initiator: 'system' });
    }

    attachTriggers(attachableEvents, module.JsSIPUA.on, module.JsSIPUA);

  };

  // Sip start method
  module.connect = function () {
    module.JsSIPUA.start();
  };

  // Sip stop method
  module.disconnect = function () {
    if (module.JsSIPUA && module.JsSIPUA.isConnected()) {
      module.JsSIPUA.stop();
    } else {
      // If sip is already in disconnected state - signaling about that.
      module.trigger('disconnected');
    }
  };

  module.on('gotTempCreds', function (event) {

    authCache = event.data;

    module.log('Got temp creds', arguments);

    var hosts = [];
    if (module.config('gw.host')) {
      hosts = hosts.concat(module.config('gw.host'));
    } else if (authCache.services && module.utils.isArray(authCache.services.sip)) {
      module.utils.each(authCache.services.sip, function (service) {
        var domain = service.uri.split(';')[0];
        // NOTICE: That can not be several!
        if (service.username) {
          authCache.username = service.username;
        }
        if (service.authname) {
          authCache.authname = service.authname;
        }
        if (service.password) {
          authCache.password = service.password;
        }
        hosts.push(module.config('gw.proto') + '://' + domain + (domain.split(':').length > 1?'':(':' + module.config('gw.port'))) + '/' + module.config('gw.url'));
      });
    }

    // Turn
    var turnServers = [];
    if (module.config('turn')) {
      turnServers = [].concat(module.config('turn'));
    } else if (authCache.services && module.utils.isArray(authCache.services.turn)) {
      module.utils.each(authCache.services.turn, function (service) {
        turnServers.push({
          url: 'turn:' + service.uri.replace(';', '?'),
          username: service.username || authCache.username,
          credential: service.password || authCache.password
        });
      });
    }

    // Stun
    var stunServers = [];
    module.log('stun', module.config('stun'));
    if (module.config('stun')) {
      stunServers = [].concat(module.config('stun'));
    } else if (authCache.services && module.utils.isArray(authCache.services.stun)) {
      module.utils.each(authCache.services.stun, function (service) {
        stunServers.push(service.uri);
      });
    }

    // Combining for jssip 0.7.*
    var iceServers = [];
    if (stunServers.length) {
      stunServers.forEach(function (server) {
        iceServers.push({
          url: 'stun:' + server.replace(/stun:|;.*$/, '')
        });
      });
    }
    if (turnServers.length) {
      iceServers = iceServers.concat(turnServers);
    }

    module.config('pcConfig', {
      'iceServers': iceServers
    });

    module.info('final pcConfig', module.config('pcConfig'));

    // NOTICE: Erasing ephemerals timestamp
    var registrarUsername = authCache.username.split(':')[1] ? authCache.username.split(':')[1] : authCache.username; 
    // NOTICE: auto domain if not present
    if (!registrarUsername.split('@')[1]) {
      registrarUsername += ('@' + authCache.domain);
    }
    var registrarConfig = {
      'ws_servers': hosts,
      'no_answer_timeout': 15,
      'connection_autorecovery': false,
      'uri': 'sip:' + registrarUsername,
      'password': authCache.password,
      'pcConfig': module.config('pcConfig'),
      'trace_sip': true,
      'register': true,
      'authorization_user': module.config('authname') || authCache.authname || registrarUsername,
      'use_preloaded_route': module.config('use_preloaded_route'),
      'hack_via_tcp': module.config('hack_via_tcp'),
      'hack_ip_in_contact': module.config('hack_ip_in_contact'),
      'hack_username_in_contact': (module.config('hack_username_in_contact') !== null ? module.config('hack_username_in_contact') : registrarUsername.split('@')[0] + '-' + module.utils.uuid().slice(0, 8))
    };
    module.log('SIP registering with config', registrarConfig);
    module.initialize(registrarConfig);

    module.connect();

  });

  // On auth disconnecting event
  module.on('disconnecting', function (data) {
    module.disconnectedByUser = (data.initiator == 'user')?true:false;
    module.disconnect();
  });

  // On other modules connectionFailed event
  module.on('connectionFailed', function (data) {
    module.disconnect();
  });

  module.on('sip_gotMediaSession', function (event) {
    // Augmenting session object with useful properties
    var mediaSession = new MediaSession(event);

    module.trigger('gotMediaSession', mediaSession);
    if(mediaSession.incoming) {
      if (mediaSession.isAudioCall) {
        module.trigger('gotIncomingAudioCall', mediaSession);
      } else if (mediaSession.isVideoCall) {
        module.trigger('gotIncomingVideoCall', mediaSession);
      }
    }

    module.log('Modified session to', mediaSession);

  });

  module.on('sip_disconnected', function (event) {
    sessions.clear();

    var disconnectInitiator = 'system';
    if(module.disconnectedByUser) {
      disconnectInitiator = 'user';
      module.disconnectedByUser = false;
    }

    module.trigger('disconnected', { initiator: disconnectInitiator });
  });

    // Handling internal sip_unregistered event
  module.on('sip_unregistered', function (event) {

    if (module.disconnectedByUser) {
      return;
    }

    module.trigger('sip_connectionFailed', event);

  });

  module.on('sip_registered', function (event) {
  module.log('sip_registered event object', event);
    // Finding parallel sessions.
    var gruus = [];
//     var response = event.data.data.response;
//     var numContacts = response.headers.Contact.length;
//     var idx, contactHeader;
//
//     for (idx = 0; idx < numContacts; idx++) {
//       contactHeader = response.headers.Contact[idx].parsed;
//       if (contactHeader.uri.user !== JsSIP.contact.uri.user) {
//         var gruu = contactHeader.getParam('pub-gruu');
//         if (gruu) {
//           gruus.push(gruu.replace(/"/g,''));
//         }
//       }
//     }

    event.data.otherSessions = gruus;

    module.trigger('connected', event);

  });

  // Handling internal connectionFailed event
  module.on('sip_connectionFailed', function (event) {
    module.trigger('connectionFailed', new module.Error({
      message: "SIP connection failure.",
      ecode: '0125',
      data: event
    }));
    module.trigger('disconnected', { initiator: 'system' });
  });

  /**
   * Default semi-transparent proxy of JsSIP call initiator interface.
   * NOTICE: may be add session callbacks options to it.
   * @private
   *
   *
   */
  module.call = function () {

    var
      callOptions = module.utils.isObject(arguments[1])?callOptionsConverter(arguments[1]):null,
      opponent = arguments[0];

    opponent = authCache.autoDomainHelper(opponent);

    module.log('JsSIP call arguments', arguments, callOptions);

    module.JsSIPUA.call.call(module.JsSIPUA, opponent, module.utils.extend({}, { pcConfig: module.config('pcConfig') }, callOptions || {}));

  };

  // Simple audio call method
  module.audioCall = function (userID, callbacksObject) {
    module.call(userID, {
      audio: true,
      video: false,
      callbacks: module.utils.isObject(callbacksObject)?callbacksObject:false
    });
  };

  // Simple video call method
  module.videoCall = function (userID, callbacksObject) {
    module.call(userID, {
      audio: true,
      video: true,
      callbacks: module.utils.isObject(callbacksObject)?callbacksObject:false
    });
  };

  // Expand user capabilities (add "instantMessaging")
  if (typeof module.factory.user != 'undefined') {

    var fUser = new module.factory.user();

  }

// Commented because clearing sessions goes while disconnecting 
//   module.on('windowBeforeUnload', function (event) {
//     module.info('windowBeforeUnload start');
//     sessions.clear();
//     module.info('windowBeforeUnload end');
//   });

  module.checkCompatibility = function sipCheckCompatibility() {
    var err;
    if(!Media.getUserMedia) {
      err = new module.Error({
        ecode: '0002',
        message: 'Your browser do not support getUserMedia.'
      });
      module.trigger(['incompatible', 'connectionFailed'], err);
      throw err;
    }
    if(!window.RTCPeerConnection && !window.mozRTCPeerConnection && !window.webkitRTCPeerConnection) {
      err = new module.Error({
        ecode: '0003',
        message: 'Your browser do not support RTCPeerConnection.'
      });
      module.trigger(['incompatible', 'connectionFailed'], err);
      throw err;
    }
    if(!window.WebSocket) {
      err = new module.Error({
        ecode: '0004',
        message: 'Your browser do not support WebSocket.'
      });
      module.trigger(['incompatible', 'connectionFailed'], err);
      throw err;
    }
  };

  module.on('DOMContentLoaded', function () {

    AdapterJS = AdapterJS || false;
    if (AdapterJS) {
      module.log('Found AdapterJS ', AdapterJS.VERSION);
    }

    if (AdapterJS && AdapterJS.webRTCReady/*Temasys webRTC*/) {
      AdapterJS.webRTCReady(function () {
        module.log('checkCompatibility on AdapterJS.webRTCReady');
        module.checkCompatibility();
      });
    } else {
      module.log('checkCompatibility on DOMContentLoaded');
      module.checkCompatibility();
    }
  });

  // Registration stuff

  module.registerMethods({

    /**
     * This method used to start media (audio or video) call to another user. For advanced use. User can specify type of media for this call (audio only, video only, audion and video, without media).
     *
     * @memberof MediaAPI
     * @method oSDK.call
     *
     * @param {string} userID ID of opponent.
     * @param {object} options Call initiation options.
     * @param {string} options.audio Include audio stream in session.
     * @param {string} options.video Include video stream in session.
     * @param {object} options.callbacks MediaSession event handlers object (object keys represent event names).
     *
     */
    'call': module.call,

    /**
     * This method used to start audio call to another user.
     *
     * @memberof MediaAPI
     * @method oSDK.audioCall
     * @param {string} userID ID of opponent.
     * @param {object} options.callbacks MediaSession event handlers object (object keys represent event names).
     */
    'audioCall': module.audioCall,

    /**
     * This method used to start video call to another user.
     *
     * @memberof MediaAPI
     * @method oSDK.videoCall
     * @param {string} userID ID of opponent.
     * @param {object} options.callbacks MediaSession event handlers object (object keys represent event names).
     */
    'videoCall': module.videoCall,

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
  module.registerNamespaces({
    // TODO: document
    'mediaSessions': sessions,
    // TODO: document
    'Media': Media
  });

  module.registerEvents({

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
    * @param {string} event.NavigatorUserMediaError User's browser disallow capturing cause (Same error names as in navigator.getUserMedia API).
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
    'sip_registered': { self: true },

    /**
    * Dispatched when SIP module successfully unregistered on sip server inside openSDP network.
    *
    * @private
    * @event oSDK#sip_unregistered
    * @param {oSDK~SipUnregisteredEvent} event The event object associated with this event.
    *
    */
    'sip_unregistered': { self: true },

    /**
    * Dispatched when SIP module failed to register on sip server inside openSDP network.
    *
    * @private
    * @event oSDK#sip_registrationFaileds
    * @param {oSDK~SipRegistrationFailedEvent} event The event object associated with this event.
    *
    */
    'sip_registrationFailed': { self: true },

    /*
     * Inner events
     */

    'sip_connected': { self: true },
    'sip_disconnected': { self: true },
    'sip_gotMediaSession': { self: true },
    'sip_connectionFailed': { self: true },

    /*
     * Described in auth module
     */
    'disconnected': { other: true, client: true },

    /*
     * Described in auth module
     */
    'connected': { other: true, client: true },

    /*
     * Described in auth module
     */
    'connectionFailed': { other: true, client: true },

    /*
    * Described in auth module.
    */
    'incompatible': { other: true, client: true }
  });

  module.registerConfig(defaultConfig);


})(oSDK, JsSIP, AdapterJS);
