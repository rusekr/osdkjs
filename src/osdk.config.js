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

    sipServerURL: 'wss://osdp-teligent-test-registrar.teligent.ru:8088/ws', // TODO: move to sip config
  };

  // Enabling debug
  oSDK.utils.debug = true;

})(oSDK);
