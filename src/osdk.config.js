/**
 * oSDK initial configuration.
 */
(function (oSDK) {

  // Strict mode on
  "use strict";

  // Constants
  var OSDK_XMPP_SUBSCRIPTIONS_METHOD_CLASSIC = 'classic';
  var OSDK_XMPP_SUBSCRIPTIONS_METHOD_BLIND = 'blind';

  // Default configuration
  oSDK.defaultConfig = {
    apiServerURL: 'https://osdp-teligent-dev-apigw.virt.teligent.ru:8243', //TODO: replace this and following with sdk build parameter
    credsURI: '/osdp/1.0.0/ephemerals',
    authURI: '/authorize/',
      //debug
    testScope: 'gold wood uranium', // FIXME: may be for us(wso2) its not needed?
    sip: {
      // TODO: move to sip module config
      serverURL: 'wss://osdp-teligent-dev-registrar.virt.teligent.ru:8088/ws'
    },
    xmpp: {
      /**
       * Settings
       */
      settings: {
        subscriptionsMethod: OSDK_XMPP_SUBSCRIPTIONS_METHOD_CLASSIC
      },
      /**
       * Connection
       */
      connection: {
        /**
        * Inner JSJaC debuger
        */
        debug: false,
        /**
        * IQ Out interval
        */
        timer: 2000,
        /**
        * Resource name
        */
        resource: 'oClient-' + oSDK.utils.uuid().replace('-', ''),
        /**
        * Server params
        * Mey be {string} or {object}
        */
        server: {
          protocol: 'wss',
          domain: 'osdp-teligent-dev-xmpp.virt.teligent.ru',
          port: 5280,
          url: 'http-bind'
        }
      }
    },
    oauthPopup: false, // oauth login in popup
  };

})(oSDK);
