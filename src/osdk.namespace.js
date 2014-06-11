/*
 * opensdp.osdk
 * http://TODO:git
 *
 * Copyright (c) 2014 Teligent OOO
 * Licensed under the TODO license.
 */


/**
  * CoreAPI allows you to configure oSDK and to add/remove functions which listen to oSDK events. After that you can switch to {@link ConnectionAPI ConnectionAPI} for connection related topics.
  *
  * @namespace CoreAPI
  */

/**
 * @typedef {object} CoreAPI~ConfigObject
 * @memberof CoreAPI
 * @property {string} appID - ID of application gained from {@link http://osdp.ru developer's portal}.
 *
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

  // Returns oSDK version string
  Object.defineProperties(oSDK, {
    version: {
      enumerable: true,
      writable: false,
      configurable: false,
      value: '<%= pkg.version %>'
    }
  });

  // Merge default config with initialization config
  oSDK.utils.mergeConfig(config);

  return oSDK;
};
