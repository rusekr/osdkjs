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
    var module = new oSDK.utils.Module('xmpp');

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

      initPresence: function(callbacks) {

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        this.sendPresence({}, {
          onError: function(error) {
            handlers.onError(error);
          },
          onSuccess: function(response) {
            handlers.onSuccess(response);
          }
        }, true);

        return true;

      },

      sendPresence: function(params, callbacks, initial) {

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        params = params || {};

        var presence = new JSJaCPresence();

        if (params.to) presence.setTo(params.to);
        if (params.type) presence.setType(params.type);
        if (params.show) presence.setShow(params.show);
        if (params.status) presence.setStatus(params.status);
        if (params.priority) presence.setPriority(params.priority);

        if (params.command || params.data) {
          var oSDKNode = presence.buildNode('osdk');
          if (params.command) {
            if (params.command.name) {
              var command = presence.buildNode('command');
              command.setAttribute('name', params.command.name);
              if (params.command.data) {
                command.innerHTML = utils.jsonEncode(params.command.data);
              }
              oSDKNode.appendChild(command);
            }
          }
          if (params.data) {
            var json = presence.buildNode('json');
            json.innerHTML = utils.jsonEncode(params.data);
            oSDKNode.appendChild(json);
          }
          presence.appendNode(oSDKNode);
        }

        if (initial) {
          /* TODO */
        }

        if (this.connection.send(presence)) {
          handlers.onSuccess(params);
          return true;
        } else {
          handlers.onError(this.error('0x0'));
          return false;
        }

      },

      parsePresence: function(packet) {

        var command = false, data = false;

        try {
          if (packet.doc.childNodes[0].childNodes.length) {
            var nodes = packet.doc.childNodes[0].childNodes, len = packet.doc.childNodes[0].childNodes.length, i;
            for (i = 0; i != len; i ++) {
              if (nodes[i].nodeName == 'osdk') {
                var ns = nodes[i].childNodes, l = nodes[i].childNodes.length, t;
                for (t = 0; t != l; t ++) {
                  var nn = ns[t].nodeName;
                  switch (nn.toLowerCase()) {
                    case 'command' :
                      command = {
                        name: ns[t].getAttribute('name'),
                        data: ((ns[t].innerHTML) ? utils.jsonDecode(ns[t].innerHTML) : {})
                      };
                      break;
                    case 'json' :
                      data = utils.jsonDecode(ns[t].innerHTML);
                      break;
                  }
                }
              }
            }
          }
        } catch (eParsePresenceData) {
          return false;
        }
        var result = {
          from: false,
          to: false,
          resource: false,
          type: false,
          show: false,
          status: false,
          priority: false,
          data: false,
          command: false
        };
        var from = false, to = false, resource = false;
        try {
          var fromJID = packet.getFromJID();
          from = fromJID.getBareJID();
          if (!from) {
            from = fromJID._node + '@' + fromJID._domain;
          }
          from = from.toLowerCase();
          result.from = from;
          resource = fromJID._resource;
        } catch(eParsePresenceFrom) {/* --- */}
        if (!result.from) {
          result = false;
        }
        if (result) {
          if (resource) {
            result.resource = resource;
            var contact = this.storage.contacts.get(result.from);
            if (contact) {
              contact.jid = result.from + '/' + resource;
              contact.resource = resource;
            }
          }
          try {
            var toJID = packet.getToJID();
            to = toJID.getBareJID();
            if (!to) {
              to = toJID._node + '@' + toJID._domain;
            }
            to = to.toLowerCase();
            result.to = to;
          } catch(eParsePresenceTo) {result.to = this.storage.client.id;}
          try {
            result.type = (packet.getType() || 'available');
            result.show = (packet.getShow() || false);
            result.status = (packet.getStatus() || false);
            result.priority = (packet.getPriority() || false);
            result.data = data;
            result.command = command;
          } catch (eParsePresence) {
            result = false;
          }
        }
        return result;
      }

    };

    /*
     * Attachment
     */

    general.attach(methods);

  }

})(oSDK, JSJaC);