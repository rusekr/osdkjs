/*
 * opensdp.osdk
 * http://TODO:git
 *
 * Copyright (c) 2014 Teligent OOO
 * Licensed under the TODO license.
 */

/** @namespace */
var oSDK = function (config) {
  "use strict";

  // Translate default config to working config
  oSDK.config = oSDK.defaultConfig;

  // Merge default config with initialization config
  oSDK.utils.mergeConfig(config);

  oSDK.trigger('initialized');

  // TODO: oSDK cumulative methods, namespaces and events

  return oSDK;
};
