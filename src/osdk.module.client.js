/**
 * oSDK base interface for oSDK users
 */

(function(oSDK) {

  /**
   * Use strict mode
   */

  "use strict";

  // Module namespace
  var client = new oSDK.utils.Module('client');

  client.registerMethods({
    /**
     * Allows client to register listener for one or several eventTypes {@link eventTypes}.
     *
     * @method
     * @alias oSDK.on
     * @param {string} eventType
     * @param {function} listener
     */
    "on": function (type, handler) { return client.on(type, handler); }, // Simplify interface for users
    /**
     * Allows client to unregister listener for one or several eventTypes {@link eventTypes}.
     *
     * @method
     * @alias oSDK.off
     * @param {string} eventType
     */
    "off": client.off // TODO: test again after overall rework, add more parameter variants to description
  });

})(oSDK);
