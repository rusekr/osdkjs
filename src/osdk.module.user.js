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

  /**
   * An object describes the elements of the currently logged in user, list items or contacts for incoming requests. Depending on the purpose of description the composition of the properties changes
   *
   * @constructor IUser
   */
  function IUser() { /* empty */ }

  // Register protected methods to create default User
  module.registerObjects({

    user: {

      create: function(id, resource) {

        var result = new IUser();

        if (id && utils.isString(id) && (utils.isValidID(id) || (id.substr(0, 1) == '#' && utils.isValidID(id.substr(1))))) {

          id = id.toLowerCase();

          Object.defineProperties(result, {

            /**
              * Contact ID or request
              *
              * @alias id
              * @memberof IUser
              * @instance
              * @type string
              */
            "id": {
              value: id,
              writable: false,
              configurable: false,
              enumerable: false
            },

            /**
              * Login of the contact or request
              *
              * @alias login
              * @memberof IUser
              * @instance
              * @type string
              */
            "login": {
              value: id.split('@')[0],
              writable: false,
              configurable: false,
              enumerable: false
            },

            /**
              * Domain of the contact or request
              *
              * @alias domain
              * @memberof IUser
              * @instance
              * @type string
              */
            "domain": {
              value: id.split('@')[1],
              writable: false,
              configurable: false,
              enumerable: false
            }

          });

          if (resource && utils.isString(resource)) {

            Object.defineProperties(result, {

              /**
               * JID of the contact or request,is created for those instances of the class {IUser}, which was specified when creating the resource
               *
               * @alias jid
               * @memberof IUser
               * @instance
               * @type string
               */
              "jid": {
                value: (id + '/' + resource),
                writable: false,
                configurable: false,
                enumerable: false
              },

              /**
               * Resource of the contact or request
               *
               * @alias resource
               * @memberof IUser
               * @instance
               * @type string
               */
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