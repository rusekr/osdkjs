/*
 * oSDK user module
 */
(function (oSDK) {

  // Strict mode
  "use strict";

  /**
   * @namespace UserAPI
   */

  // Instance of inner user module
  var module = new oSDK.utils.Module('user');

  // Module specific DEBUG.
  module.debug = true;

  // Utils
  var utils = module.utils;

  // Base User object
  function IUser() { /* empty */ }

  // Register protected methods to create default User
  module.registerObjects({

    user: {

      create: function(id, resource) {

        var result = new IUser();

        if (id && utils.isString(id) && utils.isValidID(id)) {

          id = id.toLowerCase();

          Object.defineProperties(result, {

            "id": {
              value: id,
              writable: false,
              configurable: false,
              enumerable: false
            },

            "login": {
              value: id.split('@')[0],
              writable: false,
              configurable: false,
              enumerable: false
            },

            "domain": {
              value: id.split('@')[1],
              writable: false,
              configurable: false,
              enumerable: false
            }

          });

          if (resource && utils.isString(resource)) {

            Object.defineProperties(result, {

              "jid": {
                value: (id + '/' + resource),
                writable: false,
                configurable: false,
                enumerable: false
              },

              "resource": {
                value: resource,
                writable: false,
                configurable: false,
                enumerable: false
              }

            });

          }

        }

        return result;

      }

    }

  });

})(oSDK);