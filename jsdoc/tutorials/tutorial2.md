## Part 1: Preparing html document

Lets assume that you already got yours `appID` by providing application's name and link on [developers portal](http://portal.osdp.ru), [downloaded](http://download.osdp.ru) or [built](http://build.osdp.ru) oSDK library and created link to it inside the `head` tag of your application's html page like that:

```
&#60;script type="text/javascript" src="libraries/opensdp.osdk.js"&#62;&#60;/script&#62;
```

Now we need some html elements to control our application.

Let's create "connect" button, "disconnect" button, "text area" for output of our application status messages, "calluser" input box for user to whom we will be calling, "audiocall" and "videocall" buttons to initiate corresponding calls by type, "endcall" button to stop calls and "videoelement" html element for displaying in-call video and/or audio.

Insides of our `body` tag in html file after that will be look like:

```
&#60;button id="connect" &#62;Connect&#60;/button&#62;
&#60;button id="disconnect" &#62;Disconnect&#60;/button&#62;
&#60;textarea id="status" &#62;&#60;/textarea&#62;
&#60;input id="calluser" type="text" placeholder="Enter user ID for calling to" /&#62;
&#60;button id="audiocall" &#62;Audio call&#60;/button&#62;
&#60;button id="videocall" &#62;Video call&#60;/button&#62;
&#60;button id="answercall" &#62;Answer call&#60;/button&#62;
&#60;button id="endcall" &#62;End call&#60;/button&#62;
&#60;video id="videoelement" autoplay controls&#62;&#60;/video&#62;
```

## Part 2: Helper variables and functions

Let's create second tag `&#60;script type="text/javascript"&#62;&#60;/script&#62;` inside `head` tag of our page and copy following lines into it:

```
document.addEventListener('DOMContentLoaded', function () {

// All your next javascript code goes here

});
```

This construction delays our code execution until html document structure is fully loaded. Without it we can not find html element (like button or textarea) with javascript because that element is simply not managed to load at the time of general javascript execution begins.


Now let's bind html elements created in previous part to javascript objects to be able to control them. Within previous block of code write:

```
var connectbutton = document.querySelector('#connect');
var disconnectbutton = document.querySelector('#disconnect');
var informationarea = document.querySelector('#status');
var calluser = document.querySelector('#calluser');
var audiocallbutton = document.querySelector('#audiocall');
var videocallbutton = document.querySelector('#videocall');
var endcallbutton = document.querySelector('#endcall');
var videoelement = document.querySelector('#videoelement');
var answercallbutton = document.querySelector('#answercall');
```

To control call states we need object to contain instance of that call. Let's create it:

```
var mediaCall = null;
```

Now we'll write some helper functions.

`addText` method of `informationarea` makes easier for us to add text to our information displaying element and timestamp it:

```
informationarea.addText = function (text) {
  informationarea.innerHTML = informationarea.innerHTML + (new Date()).toLocaleTimeString() + ': ' + text + '\n';
  informationarea.scrollTop = informationarea.scrollHeight;
};
```

`connectbutton`, `disconnectbutton`, `audiocallbutton`, `videocallbutton`, `endcallbutton`, `answercallbutton` buttons getting `on` method for easier adding mouse `click` event handlers:

```
var buttons = document.querySelectorAll('button')
for(var i = 0; i < buttons.length; i++) {
  buttons[i].on = function (eventname, eventhandler) {
    this.addEventListener(eventname, eventhandler, false);
  };
}
```

## Part 3: Adding listeners for some oSDK events ##

In this application we'll be ignoring UI handling of buttons like enabling, disabling or hiding and showing them by events. Application intends to show how call (not UI) logic work.

Now we'll need mechanism to react to some events, generated by oSDK. Let's write code to listen to `connecting`, `connected`, `disconnecting`, `disconnected` and `connectionFailed` events. It will look like this:

```
oSDK.on(['connecting', 'connected', 'disconnecting', 'disconnected', 'connectionFailed'], function (event) {

  // Here we display information regarding event in our information area.
  informationarea.addText('Application got oSDK status: ' + event.type);

  // Connected event returns connected user parameters and we now get user ID from it and display within our information area.
  if(event.type == 'connected') {
    informationarea.addText('Connected as user: ' + event.user.id);
  }

});
```

Every call, incoming or outgoing, in oSDK is represented by object of `MediaSession` which returned by event `gotMediaSession`. Therefore to get that object we need to listen to `gotMediaSession` event:

```
oSDK.on('gotMediaSession', function (data) {

  // Saving call to "global" variable for controlling through user interface.
  mediaCall = data;

  // Displaying facts of call in case of incoming call or outgoing call
  if (mediaCall.incoming) {
    informationarea.addText('Received ' + (mediaCall.isVideoCall ? 'video' : 'audio') + ' call from ' + mediaCall.from + '.');
  } else {
    informationarea.addText((mediaCall.isVideoCall ? 'Video' : 'Audio') + '-calling to ' + mediaCall.to + '.');
  }

});
```

In that code we have `MediaSession` object `data`, assigned link to it to our `mediaCall` variable and for cases of incoming `mediaCall.incoming == true` or outgoing call `mediaCall.incoming <> true` showing that in `informationarea`.

Now what if our call is answered or if it failed because other side rejected it or simply was absent, or if it ended by other side? For handling this types of events we need to assign listeners to this `mediaCall` object.

If media call is answered by us or other side we need to show in `informationarea` that we are processing call and what is more important - to assing media stream associated with this call to our `videoelement` by function `attachRemoteStream` of `mediaCall` object for see and/or hear our opposite side. Thus we got next code:

```
mediaCall.on('started', function () {

  // Displaying call status in two cases.
  if (mediaCall.incoming) {
    informationarea.addText('Call answered.');
  } else {
    informationarea.addText('Call answered by ' + mediaCall.to + '.');
  }

  // Binding opponent's audio or video stream to our displaying html element.
  mediaCall.attachRemoteStream(videoelement);

});
```

If call was ended we need to process `ended` `MediaSession` event by displaying in `informationarea` that the call ended and clean our `videoelement` from media stream with next code:

```
mediaCall.on('ended', function () {

  // Displaying fact that call ended.
  informationarea.addText('Call ended.');

  // Simply unbinding anything from our displaying html element.
  mediaCall.detachStream(videoelement);

});
```

If call was ended because of some error, `MediaSession` object emits `failed` event and we show error side in `informationarea` with first event parameter `initiator` and error cause with third event parameter `cause`. Our code will be like:

```
mediaCall.on('failed', function (initiator, response, cause) {

  // Displaying fact that call failed.
  informationarea.addText('Call failed on ' + initiator + ' side with error text: ' + cause);

  // Simply unbinding anything from our displaying html element.
  mediaCall.detachStream(videoelement);

});
```

Resulting code for `gotMediaSession` oSDK event will be:

```
oSDK.on('gotMediaSession', function (data) {

  mediaCall = data;

  if (mediaCall.incoming) {
    informationarea.addText('Received ' + (mediaCall.isVideoCall ? 'video' : 'audio') + ' call from ' + mediaCall.from + '.');
  } else {
    informationarea.addText((mediaCall.isVideoCall ? 'Video' : 'Audio') + '-calling to ' + mediaCall.to + '.');
  }

  mediaCall.on('started', function () {

    if (mediaCall.incoming) {
      informationarea.addText('Call answered.');
    } else {
      informationarea.addText('Call answered by ' + mediaCall.to + '.');
    }

    mediaCall.attachRemoteStream(videoelement);
  });

  mediaCall.on('ended', function () {

    informationarea.addText('Call ended.');

    mediaCall.detachStream(videoelement);
  });

  mediaCall.on('failed', function (initiator, response, cause) {

    informationarea.addText('Call failed on ' + initiator + ' side with error text: ' + cause);

    mediaCall.detachStream(videoelement);
  });
});
```

## Part 4: Binding invokation of oSDK methods to clicks on our html elements ##

Now we have code for listening all necessary events. All is left to control our imperative elements - buttons for oSDK connect, oSDK disconnect, start audio call, start video call, answer and end call.

Clicking on connect button runs `oSDK.connect` method. Now oSDK will emit event `connecting` and will be trying to connect to openSDP network and in case of successfull connection will emit `connected` event which we got and used in previous part. If connection was unsuccessfull event `connectionFailed` will be emitted with information regarding problem.

```
connectbutton.on('click', function () {
  oSDK.connect();
});
```

Clicking on disconnect button triggers `oSDK.disconnect` methods. After that oSDK emits event `disconnecting` and will be trying to disconnect gracefully from openSDP network. When disconnection process will be finished you'll get `disconnected` event which we handled earlier in part 3 of this tutorial.

```
disconnectbutton.on('click', function () {
  oSDK.disconnect();
});
```



To call to another user we need to get ID of that user from `calluser` element by `calluser.value` value. Next we use `oSDK.audioCall` and `oSDK.videoCall` methods to send call intents to that user. We are binding these intents to clicking on `audiocallbutton` and `videocallbutton` elements.

```
audiocallbutton.on('click', function () {
  oSDK.audioCall(calluser.value);
});

videocallbutton.on('click', function () {
  oSDK.videoCall(calluser.value);
});
```

For answering and ending calls we need to use `MediaSession` object's `answer` and `end` methods. Each call is represented by own `MediaSession` object and current call's object is stored in `mediaCall` variable. Therefore for answering call by clicking on `answercallbutton` html element and ending call by clicking on `endcallbutton` html element we'll simply write following code:

```
answercallbutton.on('click', function () {
  mediaCall.answer();
});

endcallbutton.on('click', function () {
  mediaCall.end();
});
```

That's all we needed for simple making call and receiving call application.

## Part 5: Initializing oSDK with appID ##

For that you simply write:

```
oSDK({
  appID: '&#60;your appID as string&#62;'
});
```

Now you can try to use your application. And you can download complete example with added `appID` field for easier testing from [here](examples/tutorial2.zip).