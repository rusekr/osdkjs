<p>Lets assume that we already got ours application ID by providing it's name and link on developers portal.
<p>Now we need to fill our index.html file with some basic oSDK stuff.

## Part1: Preparing our html document

We need some html elements to control our application.

Let's create "connect" button, "disconnect" button, "text area" for output of our messages and all stuff we'll be doing, "user id" input box for user to whom we will be texting, "message" text box for message we'll be sending and finally "send text message" button.

Our _html_ code after that will be like:


    &#60;button id="connect" &#62;Connect&#60;/button&#62;
    &#60;button id="disconnect" &#62;Disconnect&#60;/button&#62;
    &#60;textarea id="status" &#62;&#60;/textarea&#62;
    &#60;input id="messageuser" type="text" placeholder="Enter user for whom to send a message" /&#62;
    &#60;input id="messagetext" type="text" placeholder="Enter message to send" /&#62;
    &#60;button id="messagesend" &#62;Send message&#60;/button&#62;


## Part2: Helper variables and functions

Let's bind created in previous part html elements to javascript objects to be able to control them.
For that's we can write code like that:

    var connectbutton = document.querySelector('#connect');
    var disconnectbutton = document.querySelector('#disconnect');
    var informationarea = document.querySelector('#status');
    var sendmessagebutton = document.querySelector('#messagesend');
    var sendmessagetext = document.querySelector('#messagetext');
    var sendmessageuser = document.querySelector('#messageuser');

Now we make some helper functions for easier  need to add handlers to click events of

<p>oSDK needs to be initialized prior to starting. For that we need to write:




## Part2: Adding listeners for some events ##




## Part3: Connecting to network ##
