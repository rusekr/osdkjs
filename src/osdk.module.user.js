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
   * Объект, описывающий элементы текущего авторизованного пользователя, элементы списка контактов или входящие запросы. В зависимости от назначения описания меняется состав свойст
   *
   * @constructor IUser
   */
  function IUser() { /* empty */ }

  // Register protected methods to create default User
  module.registerObjects({

    user: {

      create: function(id, resource) {

        var result = new IUser();

        if (id && utils.isString(id) && utils.isValidID(id)) {

          id = id.toLowerCase();

          Object.defineProperties(result, {

            /**
              * Идентификатор контакта или запроса
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
              * Логин контакта или запроса
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
              * Домен контакта или запроса
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
               * JID контакта или запроса, создается для тех экземпляров класса {IUser}, для которых при создании был указан ресурс
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
               * Ресурс контакта или запроса
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