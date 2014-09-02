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

  // Module specific DEBUG.
  client.debug = true;

  client.registerMethods({
    /**
     * Allows client to register listener for one or several event types.
     *
     * @memberof CoreAPI
     * @method
     * @alias oSDK.on
     * @param {(string|string[])} eventType Event for which to listen.
     * @param {function} listener Function that handles this event.
     * @returns {string} ID of newly registered event listener.
     */
    "on": function (type, handler) { return client.on(type, handler); }, // Simplify interface for users

    /**
     * Allows client to unregister listener for one or several event types.
     *
     * @memberof CoreAPI
     * @method
     * @alias oSDK.off
     * @param {string} eventType Event for which to remove all listeners or ID of event listener added with {@link oSDK.on} oSDK.on method.
     */
    "off": client.off // TODO: test again after overall rework, add more parameter variants to description
  });

})(oSDK);
