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
      // TODO: move to sip module config
      serverURL: 'wss://osdp-teligent-test-registrar.teligent.ru:8088/ws'
    },
    xmpp: {
      // TODO: move to xmpp module config
      debug: 2,
      timer: 500,
      resource: 'oClient',
      server: {
        protocol: 'wss',
        domain: 'osdp-teligent-test-xmpp.teligent.ru',
        port: 5280,
        url: 'http-bind'
      }
    },
    oauthPopup: false, // oauth login in popup
  };

})(oSDK);
