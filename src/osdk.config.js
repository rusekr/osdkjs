/**
 * oSDK initial configuration.
 */
(function (oSDK) {

  // Default configuration
  oSDK.defaultConfig = {
    apiServerURL: 'https://osdp-teligent-test-apigw.teligent.ru:8243', //TODO: replace this and following with sdk build parameter
    credsURI: '/am/1.0.1/ephemerals',
    authURI: '/authorize/',
      //debug
    testScope: 'gold wood uranium', // FIXME: may be for us(wso2) its not needed?

    sip: {
      serverURL: 'wss://osdp-teligent-test-registrar.teligent.ru:8088/ws', // TODO: move to sip module config
    },
    xmpp: {
      serverURL: 'wss://osdp-teligent-test-registrar.teligent.ru:5280/http-bind/', //TODO: move to xmpp module config
    },

    oauthPopup: false, // oauth login in popup
  };

})(oSDK);
