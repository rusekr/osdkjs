/*
 * oSDK oneAPI module.
 */
(function (oSDK) {
  "use strict";

  /**
   * @namespace OneAPI
   */

  // Module namespace
  var module = new oSDK.utils.Module('oneapi');

  var oauth = null;

  var defaultConfig = {
    SMSApiServerURL: '{SMSAPIServerURI}',
    SMSSendPath: '/outbound/tel:+{SMSSendNumber}/requests',
    SMSSendNumber: '000010'
  };

  // Module specific DEBUG.
  module.debug = true;

  module.sendSMS = function (phoneNumber, message) {
    if (!oauth) {
      throw new module.Error('oAuth object is not found. Check if oSDK is connected.');
    }
    if (!phoneNumber.match(/^7{1}\d{10}$/)) {
      throw new module.Error('Incorrect phone number.');
    }

    oauth.ajax({

      url: module.config('SMSApiServerURL') + module.config('SMSSendPath').replace('{SMSSendNumber}', module.config('SMSSendNumber')),
      type: 'post',
      dataType: 'json',
      data: {
        "outboundSMSMessageRequest": {
          "address" : ["tel:+" + phoneNumber],
          "clientCorrelator" : "1",
          "outboundSMSTextMessage" : {
            "message" : message
          },
          "senderAddress" : "tel:+" + module.config('SMSSendNumber'),
          "senderName" : module.config('SMSSendNumber')
        }
      },
      success: function(data) {
        module.log('ajax success args', arguments);
      },
      error: function(jqxhr) {
        module.log('ajax error args', arguments);
      }
    });
  };

  module.on('gotToken', function (event) {
    oauth = event.data;
    module.log('got oauth object', oauth, 'from event', event);
  });

  module.registerConfig(defaultConfig);

  module.registerMethods({
    /**
     * This method used to send SMS message. It has no callbacks or associated events for now.
     *
     * @memberof OneAPI
     * @method oSDK.sendSMS
     * @param {string} phoneNumber - phone number of opponent.
     * @param {string} message - text message to send.
     */
    sendSMS: module.sendSMS
  });

})(oSDK);