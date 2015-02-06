oSDK cobrowsing support:

1) oSDK cobrowsing module requires:

1.1) Auth module for users authentification.

1.2) Own websocket connection permitted by ephemerals for interclient messaging.

2) oSDK cobrowsing module provides:

2.2) "oSDK.cobrowsingRequest(<userID>)" method.

2.1) "cobrowsingRequest" event which returns "cobrowsingSession" object.

2.2) "cobrowsingSession" object has:

2.2.1) "allow" method - starts cobrowsing related messages exchange.

2.2.1) "reject" method - blocks cobrowsing related messages exchange from starting.

2.2.2) "stop" method - stops cobrowsing related messages exchange.

2.2.3) "isActive" method - returns status of cobrowsing related messages exchange.

2.2.4) "started" event.

2.2.5) "rejected" event.

2.2.6) "stopped" event.

3) Technical terms:

3.1) Mechanism for same page identification and differences warnings and/or page synchronisation. 

3.2) Mechanism for click/focus/key pressed html objects identification and exchange.


oSDK cobrowsing support websocket server requires:

1) Access to ephemerals user base.


oSDK cobrowsing support websocket server provides:

1) Session based cobrowsing communication channels.

2) Clients connections errors broadcasting.


Widget based on oSDK cobrowsing support:

1) oSDK cobrowsing widget requires:

1.1) Auth module for users authentification.

1.2) (optional) XMPP module for text messaging.

1.3) (optional) SIP module for audio/video calls.

2) oSDK cobrowsing widget provides:

2.2) Button to start cobrowsing.

2.3) Audio call interface.

2.4) Video call interface.

2.5) Text chat interface.

2.6) Other party cursor image and click displaying interface.

2.7) Other party keys pressed displaying interface.