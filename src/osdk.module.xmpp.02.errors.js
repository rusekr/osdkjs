/*
 * oSDK XMPP module
 * with JSJaC library
 */

(function(oSDK, JSJaC) {

  // Strict mode
  "use strict";

  // Compatibility test
  if (oSDK && JSJaC) {

    // oSDK XMPP module
    var module = new oSDK.utils.Module('xmpp');

    // General component of oSDK XMPP module
    var general = module.general;

    // oSDK Utilities
    var utils = module.utils;

    /*
     * Private variables
     */

    var errors = [
      // Section 00 - Unspecified
      [
        /* 00 */ 'Unspecified error'
      ],
      // Section 01 - Connection
      [
        /* 00 */ 'oSDK is not connected'
      ],
      // Section 02 - Validation
      [
        /* 00 */ 'Invalid ID',
        /* 01 */ 'Invalid client status',
        /* 02 */ 'Invalid nickname',
        /* 03 */ 'Invalid group name',
        /* 04 */ 'Invalid contacts\' parameters',
        /* 05 */ 'Invalid message format',
        /* 06 */ 'Invalid data format'
      ],
      // Section 03 - Statuses
      [
        /* 00 */ 'Unregistered client status',
        /* 01 */ 'You can not set system status',
        /* 02 */ 'Status has not set'
      ],
      // Section 04 - Signatures
      [
        /* 00 */ 'Invalid signature',
        /* 01 */ 'Signature has not set'
      ],
      // Section 05 - Contacts
      [
        /* 00 */ 'This contact does not exist in your contact list',
        /* 01 */ 'This contact is already in your contact list',
        /* 02 */ 'You can not add youself to contact list',
        /* 03 */ 'You can not remove youself from contact list'
      ],
      // Section 06 - Requests
      [
        /* 00 */ 'You can not reject your auth request',
        /* 01 */ 'You can not accept your auth request',
        /* 02 */ 'Request does not exist'
      ],
      // Section 07 - Subscriptions
      [
        /* 00 */ 'You can not send youself auth request',
        /* 01 */ 'Auth request to contact has already sent',
        /* 02 */ 'You have already subscribed to contact'
      ],
      // Section 08 - Messages
      [
        /* 00 */ 'You can not send message to youself'
      ]
    ];

    /*
     * Private methods
     */

    var methods = {

      // Generate oSDK error in oSDK XMPP module
      error: function(number, notification) {
        if (!utils.isString(number)) {
          return this.error('0x0');
        } else {
          number = number.split('x');
          if (number.length != 2) {
            return this.error('0x0');
          } else {
            var section = parseInt(number[0]);
            var caption = parseInt(number[1]);
            if (typeof errors[section] == 'undefined' || typeof errors[section][caption] == 'undefined') {
              return this.error('0x0');
            } else {
              var sSection = ((section < 10) ? '0' + section : '' + section);
              var sCaption = ((caption < 10) ? '0' + caption : '' + caption);
              var code = sSection + sCaption;
              return {
                module: 'xmpp',
                code: 'xmpp' + code,
                ecode: ((section * 100) + caption),
                scode: code,
                message: errors[section][caption] + ((notification) ? ' (' + notification + ')' : '')
              };
            }
          }
        }
      }

    };

    /*
     * Attachment
     */

    general.attach(methods);

  }

})(oSDK, JSJaC);