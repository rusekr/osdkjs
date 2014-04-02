
window.webRTC = window.webRTC || (function ($) {

  if (!$ || !$.oSDK) {
    return false;
  }
  
  
  
  
  
    var config = null;
    var osdk = null;
  
  $(function () {
    
    $('.hashsave')
      .on('change keyup paste', function (event) {

        var obj = $(this);

        hash.set(obj.data('name'), obj.val());

        return false;
      })
      .each(function (i, obj) {

        obj = $(obj);

        if(hash.get(obj.data('name'))) {

          obj.val(hash.get(obj.data('name')));
        }
      });
    
    $('.apptoken').val(localStorage.getItem('token') || '');
    
    $('.apptoken').on('change', function (e) {
      
      localStorage.setItem('token', $(this).val());
    });
    
    var sipconnect = $('.connect');

    
    sipconnect.on('click', function (event) {
      config  = {
        appID: $('.appid').val(), //for obtaining user tokens
        appToken: $('.apptoken').val(), //for obtaining access to 
        //debug
        apiServerURL: $('.appauthurl').val(),
        testUrlApp: $('.appurl1').val(),
        testUrlUser: $('.appurl2').val(),
        testUrlAppUser: $('.appurl3').val(),

        testScope: 'gold wood uranium'
      };
      
      osdk = $.oSDK(config);
      osdk.connect();
      
    });
    $('.getdefaults').on('click', function () {
      $('.appid').val('FWyhIPB1xS3xVBgshxXiXe47ppsa');
      $('.apptoken').val('QXx_OfUQ6AUmW8C34oxhlruley4a');
      $('.appauthurl').val('https://192.168.64.164:8243/authorize');
      $('.appurl1').val('https://192.168.64.164:8243/locationApp/1.0.0/');
      $('.appurl2').val('https://192.168.64.164:8243/locationUser/1.0.0/');
      $('.appurl3').val('https://192.168.64.164:8243/locationAppUser/1.0.0/');
    });
  
  
  
  
  });
  
  
  
  
  
  
  
  return;

//   var oSDK = null;
//   var oApiKey = "7a7pJMrmvmhMJNKPMpFy";
// 
//   var sipcall = null;
//   var sipcallstop = null;
//   var sipconnect = null;
//   var sipanswer = null;
//   var sipurl = null;
//   var sippswd = null;
// 
//   var remoteHear = null;
//   var selfView = null;
//   var remoteView = null;
// 
//   var sipStartCall = function (e) {
//     //start call duration timer
//     mediaCall.durationSeconds = 0;
//     mediaCall.durationTimer = setInterval(function () {
//       mediaCall.durationSeconds++;
//       oClient.setCallDuration(mediaCall.durationSeconds);
//     }, 1000);
// 
//     sipcall.data('active', true);
//     sipcall.attr('title','End call');
//   };
// 
//   var sipEndCall= function (e) {
// 
//     console.log('sip call ended');
// 
//     if(mediaCall.durationTimer) {
//       clearInterval(mediaCall.durationTimer);
//       mediaCall.durationTimer = null;
//     }
// 
//     setTimeout(function () {
//       oClient.dialerPage();
// 
//       sipcall.data('active', false);
//       sipcall.attr('title','Call');
//     }, 2000);
//   };
// 
//   var mediaCall = {
//     name: null,
//     durationSeconds: 0,
//     durationTimer: null,
//     video: false,
//     session: null,
// 
// // 		mediaOptions: {
// // 			'mediaConstraints': {'audio': true, 'video': false }
// // 		},
// 
//     prepareMediaSession: function () {
// 
//       if(!mediaCall.session) {
//         return false;
//       }
// 
//       // Register callbacks to desired call events
//       var callEventHandlers = {
// 
//         'onProvisional': function (e) {
//           console.log('croco call ringing', e);
//           //$('#state').html('Ringing');
//         },
//         'onConnect':    function(e){
//           console.log('croco call started', e);
// 
//           sipStartCall(e);
//         },
//         'onClose':      function(e){
// 
//           console.log('croco call ended', e);
// 
//           sipEndCall(e);
// 
//         },
//         'onRemoteMediaReceived': function (e) {
//           console.log('croco call got remote media', e);
// 
//         }
//       };
// 
//       if(mediaCall.video) {
//         mediaCall.session.localVideoElement = selfView;
//       }
//       
//       if(mediaCall.video) {
//         mediaCall.session.remoteVideoElement = remoteView;
//         console.log('mediaCall.session.remoteVideoElement = remoteView');
//       } else {
//         mediaCall.session.remoteAudioElement = remoteHear;
//         console.log('mediaCall.session.remoteAudioElement = remoteHear');
//       }
// 
//       for(var eh in callEventHandlers) {
//         console.log(eh);
//         mediaCall.session[eh] = callEventHandlers[eh];
//       }
// 
//     }
//   };
//   
//   function muteVideo(flag) {
//     flag = !!flag;
// 
//     if(!mediaCall.session) {
//       console.log('Local media stream is not initialized.');
//       return;
//     }
// 
//     var localStream = mediaCall.session.peerConnection.getLocalStreams()[0];
// 
//     // Call the getVideoTracks method via adapter.js.
//     var videoTracks = localStream.getVideoTracks();
// 
//     if (videoTracks.length === 0) {
//       console.log('No local video available.');
//       return;
//     }
// 
//     if (!flag) {
//       for (i = 0; i < videoTracks.length; i++) {
//       videoTracks[i].enabled = true;
//       }
//       console.log('Video unmuted.');
//     } else {
//       for (i = 0; i < videoTracks.length; i++) {
//       videoTracks[i].enabled = false;
//       }
//       console.log('Video muted.');
//     }
// 
//   }
// 
//   function muteAudio(flag) {
//     flag = !!flag;
// 
//     if(!mediaCall.session) {
//       console.log('Local media stream is not initialized.');
//       return;
//     }
// 
//     if (!flag) {
//       mediaCall.session.unmute()
//       console.log('Audio unmuted.');
//     } else {
//       mediaCall.session.mute()
//       console.log('Audio muted.');
//     }
// 
//   }
// 
//   $(function () {
// 
//     sipcall = $('.start-call');
//     sipcallstop = $('.end-call');
//     sipconnect = $('.head .connect');
//     sipanswer = $('.answer-call');
//     sipurl = $('.edit-user .sip-login');
//     sippswd = $('.edit-user .sip-pswd');
// 
//     remoteHear = $('.cphone audio.opponent')[0];//$(new Audio());
//     selfView = $('.cvideo video.player')[0];
//     remoteView = $('.cvideo video.opponent')[0];
// 
//     console.log('media elements', remoteHear, selfView, remoteView);
// 
//     sipconnect.find ('span').attr ('data-color', 'b2icon-red');
// 
//     //Connecting to croco network using current login and password.
//     sipconnect.on('click', function (event) {
// 
//       if(sipconnect.data('active')) {
//         sipconnect.data('active', false);
//         /* Toggle to yellow */
//         // sipconnect.css('color', 'yellow');
//         sipconnect.find ('span').attr ('data-color', 'b2icon-yellow');
//         oSDK.stop();
//         sipconnect.attr('title','Connect');
//       }
//       else {
//         sipconnect.data('active', true);
// 
//         /* Toggle to yellow */
//         // sipconnect.css('color', 'yellow');
//         sipconnect.find ('span').attr ('data-color', 'b2icon-yellow');
// 
//         oSDK = $.oSDK({
//           apiKey: oApiKey,
//           address: sipurl.val(),
//           password: sippswd.val(),
//           register: true,
//           onConnected: function() {
//               // Ready to start communicating!
//               //alert('connected');
//               console.log('Connected to Crocodile network.');
//           },
//           onRegistered: function () {
//               console.log('Registered as ' + sipurl.val() + ' in Crocodile network.');
//           },
// 
//           acceptTimeout: 45   // Incoming sessions will be rejected if not accepted within this time (seconds)
//           //,trace_sip: true
//         
//           ,media: {
//             onMediaSession: function (event) {
//               console.log('Croco got media session!', event);
//               mediaCall.session = event.session;
// 
//               mediaCall.name = event.session.address;
// //              mediaCall.video = event.session.capabilities['sip.video'];
// 
//               mediaCall.video = false;
//               
//               //работает в хроме и должно работать везде
//               if (mediaCall.session.peerConnection.getRemoteStreams().length > 0 && mediaCall.session.peerConnection.getRemoteStreams()[0].getVideoTracks().length > 0) {
//                 mediaCall.video = true;
//               }
//               //FIXME: firefox check if incoming call is of type video, temporary because getVideoTracks not working.in ff25
//               if(mediaCall.session.sipSession.request.body.match(/m=video/)) {
//                 mediaCall.video = true;
//               }
// 
//               mediaCall.prepareMediaSession();
// 
// 
// 
//               oClient.incomingCall(mediaCall);
//             }
//           }
//         });
// 
//         oSDK.onConnected = function(e){
//           console.log('Croco connected', e);
// 
//         };
// 
//         oSDK.onDisconnected = function(e){
//           console.log('Croco disconnected', e);
//           /* Toggle to red */
//           // sipconnect.css('color', 'red');
//           sipconnect.find ('span').attr ('data-color', 'b2icon-red');
//           sipconnect.data('active', false);
//           oClient.setMyNumber(null);
//           oClient.setMyBalance(null);
//         };
// 
//         oSDK.onRegistered = function(e){
//           console.log('Croco registered', e);
//           /* Toggle to green */
//           // sipconnect.css('color', 'green');
//           sipconnect.find ('span').attr ('data-color', 'b2icon-green');
//           oClient.setMyNumber(sipurl.val());
// 
//           var fakeBalance = parseInt(Math.random() * 999) +'.' + parseInt(Math.random() * 99)
//           oClient.setMyBalance(fakeBalance); //TODO: retreive and set from croco
//         };
// 
//         oSDK.onUnregistered = function(e){
//           console.log('Croco unregistered', e);
//         };
//         oSDK.onRegistrationFailed = function(e){
//           console.log('Croco can\'t register', e);
// 
//         };
// 
//         sipconnect.attr('title','Disconnect');
//       }
// 
//       return false;
//     });
// 
//     sipcall.on('click', function (event) {
// 
//       if(!sipconnect.data('active')) {
//         alert('Нет соединения с сетью.');
//         return false;
//       }
// 
//       //if calling from profile
//       var callNumber = oClient.getCallNumber(this);
//       console.log('croco call number', callNumber);
// 
//       mediaCall.name = callNumber;
//       mediaCall.video = oClient.isVideoCall(this);
// 
// // 			mediaCall.mediaOptions['mediaConstraints']['video'] = mediaCall.video;
// // 			console.log('croco call options:', mediaCall.mediaOptions);
// 
//       if(!callNumber) {
//         alert('Не указан номер абонента для связи.');
//         return false;
//       }
// 
//       if(!sipcall.data('active')) {
// 
//         sipcall.data('active', true);
// 
//         mediaCall.session = oSDK.media.connect(callNumber, {
//           streamConfig: {
//             audio: {send: true, receive: true},
//             video: mediaCall.video?{send: true, receive: true}:{send: false, receive: false}
//           }
//         });
// 
//         mediaCall.prepareMediaSession();
// 
//         sipcall.data('active', true);
//         sipcall.attr('title','End call');
// 
//         oClient.makeCall(mediaCall);
// 
//         oClient.setCallDuration('Ожидание ответа');
//       }
// 
//       return false;
//     });
// 
//     sipcallstop.on('click', function (event) {
//       console.log('croco check if terminate media session', mediaCall);
//       if(mediaCall.session && mediaCall.session.close) {
//         sipcall.data('active', false);
//         sipcall.attr('title','Call');
//         console.log('croco terminating media session');
//         mediaCall.session.close();
//       }
//     });
// 
//     sipanswer.on('click', function (event) {
// 
//       oClient.makeCall({ name: mediaCall.name, video: mediaCall.video });
//       console.log('sip received call');
//       console.log(mediaCall);
// 
//       console.log('sip call invoking answer');
// 
//       mediaCall.session.accept({
//         audio: {send: true, receive: true},
//         video: mediaCall.video?{send: true, receive: true}:{send: false, receive: false}
//       });
// 
//       sipcall.data('active', true);
//       sipcall.attr('title','End call');
//     });
//     
//     $('.cphone .mymic, .cvideo .mymic').on('click', function (event) {
//       if($(this).hasClass('muted')) {
//         $(this).removeClass('muted');
//         muteAudio(false);
//       }
//       else {
//         $(this).addClass('muted');
//         muteAudio(true);
//       }
//       
//     });
//     
//     $('.myvideosend .v-toggle').on('click', function (event) {
//       var $this = $(this);
//       if($this.hasClass('v-on')) {
//         muteVideo(false);
//       } else {
//         muteVideo(true);
//       }
//     });
// 
//     $(window).on('beforeunload', function () {
//       //trying to quit gracefully
//       if(mediaCall.session && mediaCall.session.close) {
//         mediaCall.session.close();
//       }
//       oSDK.stop();
//     });
// 
//     $('.hashsave')
//       .on('change keyup paste', function (event) {
// 
//         var obj = $(this);
// 
//         hash.set(obj.data('name'), obj.val());
// 
//         return false;
//       })
//       .each(function (i, obj) {
// 
//         obj = $(obj);
// 
//         if(hash.get(obj.data('name'))) {
// 
//           obj.val(hash.get(obj.data('name')));
//         }
//       });
// 
//   });



} ) (jQuery || false);
