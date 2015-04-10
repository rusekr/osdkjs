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

    var list = [];

    var invites = [];

    var conference = null;

    /*
     * Private methods
     */

    var generateConferenceLogin = function(client, resource) {
      return '#muc-' + client.login + '@conference.' + client.domain + ((resource) ? '/' + client.login : '');
    };

    var bindConferenceMethods = function() {

      if (conference) {

        conference.sendMessage = (function(params, callbacks) {

        }).bind(conference);

        conference.sendCustomData = (function(params, callbacks) {

        }).bind(conference);

        conference.inviteContact = (function(id, callbacks) {

          var handlers = general.prepareHandlers(callbacks);

          if (!general.test('connection')) {
            handlers.onError(general.error('1x0'));
            return false;
          }

          id = general.getId(id);

          if (!general.test('valide id', id)) {
            handlers.onError(general.error('2x0'));
            return false;
          }

          if (general.test('client id', id)) {
            handlers.onError(general.error('8x0'));
            return false;
          }

          if (!general.sendPresence({to: id, command: {name: 'inviteToConference', data: this.jid}})) {
            handlers.onError(general.error('0x0'));
            return false;
          } else {
            handlers.onSuccess(id);
            return true;
          }

        }).bind(conference);

      }

    };

    var methods = {

      createConference: function(callbacks) {

        if (conference) {

          return conference;

        }

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        var jid = this.storage.client.jid || this.storage.client.id + '/' + module.config('resource');
        var login = this.storage.client.login;
        var domain = this.storage.client.domain;
        var resource = this.storage.client.resource || module.config('resource');

        var room = generateConferenceLogin(this.storage.client, true);

        var presence = new JSJaCPresence();
        presence.setTo(room);
        var iNode = presence.buildNode("item");
        iNode.setAttribute("jid", jid);
        iNode.setAttribute("affiliation", "none");
        iNode.setAttribute("role", "participant");
        var xNode = presence.buildNode("x", [iNode]);
        xNode.setAttribute("xmlns", "http://jabber.org/protocol/muc#user");
        presence.appendNode(xNode);
        presence.setStatus('available');

        if (!this.connection.send(presence)) {
          handlers.onError(this.error('0x0'));
          return false;
        } else {

          conference = this.create.conference(generateConferenceLogin(this.storage.client, false), login);

          Object.defineProperties(conference, {

            "admin": {
              value: this.storage.client,
              writable: false,
              configurable: false,
              enumerable: false
            },

            "contacts": {
              value: []
            }

          });

          bindConferenceMethods();

          handlers.onSuccess(conference);

          return true;
        }

      }

    };

    /*
     * Attachment
     */

    general.attach(methods);

  }

})(oSDK, JSJaC);