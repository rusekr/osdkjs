/*
 * oSDK XMPP module
 * with JSJaC library
 */

(function(oSDK, JSJaC) {

  // Strict mode
  "use strict";

  // Compatibility test
  if (oSDK && JSJaC) {

    // oSDK XMPP module
    var module = oSDK.utils.modules.xmpp;

    // General component of oSDK XMPP module
    var general = module.general;

    // oSDK Utilities
    var utils = module.utils;

    /*
     * Private variables
     */



    /*
     * Private methods
     */

    var methods = {

      classes: {

        IList: function() {

          // Private variables
          var list = [], link = {}, len = 0;

          /*
           * Private methods
           */

          // Link generator
          function generateLink(param) {
            if (utils.isString(param)) {
              return '_' + utils.md5(param);
            } else {
              if (utils.isObject(param) && param.id) {
                return '_' + utils.md5(param.id);
              }
            }
            return false;
          }

          // Links regenerator
          function regenerateLinks() {
            link = {};
            list.forEach(function(value, index) {
              link[generateLink(value.id)] = index;
            });
            return undefined;
          }

          // Search item in inner list
          function test(param) {
            var id = general.getId(param);
            if (id) {
              var index = generateLink(id);
              if (typeof link[index] != 'undefined' && typeof list[link[index]] != 'undefined' && utils.isObject(list[link[index]])) {
                return true;
              }
            }
            return false;
          }

          // Public methods

          // Get item or full inner list
          this.get = function(param) {
            if (utils.isNull(param)) {
              return list;
            } else {
              var id = general.getId(param);
              if (id) {
                var index = generateLink(id);
                if (typeof link[index] != 'undefined' && typeof list[link[index]] != 'undefined' && utils.isObject(list[link[index]])) {
                  return list[link[index]];
                }
              }
            }
            return undefined;
          };

          // Add item to inner list
          this.add = function(param) {
            var id = general.getId(param);
            if (!test(id)) {
              if (utils.isObject(param)) {
                list.push(param);
                len = list.length;
                this.sort();
              }
            }
            return this;
          };

          // Remove item from inner list
          this.remove = function(param) {
            var id = general.getId(param);
            if (test(id)) {
              var newList = [];
              list.forEach(function(value, index) {
                if (value.id != id) {
                  newList.push(value);
                }
              });
              list = newList;
              len = list.length;
              this.sort();
            }
            return this;
          };

          // Get length of inner list
          this.len = function() {
            return len;
          };

          // Sort inner list
          this.sort = function() {
            list = list.sort(function(a, b) {
              var i, len;
              if (a.login.length > b.login.length) {
                len = b.login.length;
              } else {
                len = a.login.length;
              }
              for (i = 0; i != len; i ++) {
                var ca = a.login.charCodeAt(i);
                var cb = b.login.charCodeAt(i);
                if (ca != cb) return ca - cb;
              }
              if (a.login.length > b.login.length) {
                return -1;
              } else {
                return 1;
              }
            });
            regenerateLinks();
            return this;
          };

          // Clearing
          this.clear = function() {
            list = [];
            link = {};
            len = 0;
            return this;
          };

        },

        IStorage: function(params) {

          // Save this
          var instance = this;

          // Save parameters
          this.params = params;

          // Current authorized client
          this.client = general.create.client(params.login + '@' + params.domain, params.resource);

          // Loaded roster
          this.roster = [];

          // Contacts list
          this.contacts = new general.classes.IList();

          // Requests list
          this.requests = new general.classes.IList();

          // Remove item from all lists
          this.remove = function(id) {
            this.contacts.remove(id);
            this.requests.remove(id);
          };

          // Clearing
          this.clear = function() {
            this.roster = [];
            this.contacts = new general.classes.IList();
            this.requests = new general.classes.IList();
          };

          // Destroy
          this.destroy = function() {
            this.params = null;
            this.client = null;
            this.clear();
          };

        }

      }

    };

    /*
     * Attachment
     */

    general.attach(methods);

  }

})(oSDK, JSJaC);