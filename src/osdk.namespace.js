/*
 * opensdp.osdk
 * http://TODO:git
 *
 * Copyright (c) 2014 Teligent OOO
 * Licensed under the TODO license.
 */

/** @namespace
 * @alias oSDK
 * @param {Object} config
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
