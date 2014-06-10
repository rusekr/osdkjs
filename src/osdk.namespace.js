/*
 * opensdp.osdk
 * http://TODO:git
 *
 * Copyright (c) 2014 Teligent OOO
 * Licensed under the TODO license.
 */

/**
 * @namespace ConnectionAPI
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
 * @memberof ConnectionAPI
 * @function
 * @param {oSDK~Config} config
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
