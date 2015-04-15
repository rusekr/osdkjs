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
 *   appID: '{Consumer Key}'
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
 * <p>After configuring and adding your listeners you can switch to {@link ConnectionAPI Connection API} for connection related topics such methods you must invoke to start oSDK.
 *
 * @namespace CoreAPI
 */

/**
 * @typedef {object} CoreAPI~ConfigObject
 * @memberof CoreAPI
 * @property {string} appID - Consumer Key for application gained from developer's portal.
 * @property {boolean} [popup=false] - Whether to use popup for oAuth2 authentication of application user or to redirect to authentication page.
 * @property {boolean} [connectionRecovery=false] - Automatic reconnection on connection failures.
 * @property {string} [xmppResource=random] - User configurable XMPP resource or random string.
 * @property {string} [callbackURI=false] - oAuth redirect callback URI if differs from application URI.
 * @property {boolean} [nonEphemeral=false] - Direct authorization by username and password.
 * @property {string} [username=false] - Username (full, with domain) for direct authorization.
 * @property {string} [password=false] - Password for direct authorization.
 * @property {string|string[]} [excludeCSSClasses] - See {@link CobrowsingAPI Cobrowsing API}.
 * @property {boolean} [tryMediaCapabilities=true] - Try access to local videocamera and/or microphone at initialization time and send gotMediaCapabilities event ({@link CapabilitiesAPI Capabilities API}).
 * @property {boolean} [autoDomian] - Autoaddition of own user domain to domain-less user ID`s in user-related methods (like `sendMessage` or `call`).
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
  oSDK.utils.mergeClientConfig(config);
  oSDK.utils.trigger('mergedUserConfig');

  return oSDK;
};
