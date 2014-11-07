/*
 * opensdp.osdk
 * http://TODO:git
 *
 * Copyright (c) 2014 Teligent OOO
 * Licensed under the TODO license.
 */


/**
  * <p>CoreAPI allows you to configure oSDK and to add/remove functions which listen to oSDK events.
  * <p>For example to initialize oSDK you can write code:
  *
  * <pre><code>oSDK({
  *   appID: '{ConsumerKeyForApplication}'
  * });</code></pre>
  *
  * <p>It's recommended to initialize oSDK instantly when page loads without using DOMContentLoaded and similar events callbacks. oSDK handles such events itself.
  *
  * <p>Next you can add listeners for some events like connected and disconnected with oSDK.on method:
  *
  * <pre><code>oSDK.on(['connected', 'disconnected'], function (event) {
  *   if (event.type == 'connected') {
  *     alert('Application connected!');
  *   } else {
  *     alert('Application disconnected!');
  *   }
  * });</code></pre>
  *
  * <p>After configuring and adding your listeners you can switch to {@link ConnectionAPI ConnectionAPI} for connection related topics such methods you must invoke to start oSDK.
  *
  * @namespace CoreAPI
  */

/**
 * @typedef {object} CoreAPI~ConfigObject
 * @memberof CoreAPI
 * @property {string} appID - Consumer Key for application gained from developer's portal.
 * @property {boolean} [popup=false] - Whether to use popup for oAuth2 authentication of application user or to redirect to authentication page.
 * @property {boolean} [connectionRecovery=false] - Automatic reconnection on connection failures.
 * @property {string} [xmppResource=random] - User configurable XMPP resource or random string
 */

/**
 * <p>
 * Initialises the openSDP oSDK JavaScript Library and returns a
 * {@link oSDK oSDK} Object instance. The <code>config</code>
 * parameter should be an object containing any properties/event handlers
 * you want to configure; any that are not provided will be set to their
 * default value.
 * </p>
 *
 * <p>
 * The <code>appID</code> property <b>MUST</b> be defined.
 * </p>
 *
 * @memberof CoreAPI
 * @function
 * @alias oSDK
 *
 * @global
 *
 * @param {CoreAPI~ConfigObject} config
 *            <p>
 *            The <code>config</code> parameter should be an object
 *            containing any properties/event handlers you want to
 *            configure; any that are not provided will be set to their
 *            default value.
 *            </p>
 * @returns oSDK
 */
var oSDK = function (config) {
  "use strict";

  // Merge default config with initialization config
  oSDK.utils.mergeConfig(config);
  oSDK.utils.trigger('mergedUserConfig');

  return oSDK;
};
