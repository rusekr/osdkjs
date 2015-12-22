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

    var ClientServerPingInterval = null, ClientServerPingNotSupported = false, ClientServerPingCounter = 0, ClientServerPingID = null, fnPing = function() {
      if (!ClientServerPingNotSupported) {
        ClientServerPingID = 'csPingId_' + (ClientServerPingCounter ++);
        general.connection._sendRaw('<iq from="' + general.getClient().id + '" to="' + general.getClient().domain + '" id="' + ClientServerPingID + '" type="get"><ping xmlns="urn:xmpp:ping"/></iq>');
        // console.warn('Ping send, id: ' + ClientServerPingID);
      }
    };

    /*
     * Private methods
     */

    var methods = {

      handlers: {

        iq: {

          fnOnIq: function(iq) {
            if (general.test('connection')) {
              general.connection.send(iq.errorReply(ERR_FEATURE_NOT_IMPLEMENTED));
            }
            return undefined;
          },

          fnOnIqTime: function(iq) {
            if (general.test('connection')) {
              var now = new Date();
              general.connection.send(iq.reply([iq.buildNode('display', now.toLocaleString()), iq.buildNode('utc', now.jabberDate()), iq.buildNode('tz', now.toLocaleString().substring(now.toLocaleString().lastIndexOf(' ') + 1))]));
            }
            return undefined;
          },

          fnOnIqVersion: function(iq) {
            if (general.test('connection')) {
              general.connection.send(iq.reply([iq.buildNode('name', (general.storage.client.resource || 'oSDK')), iq.buildNode('version', JSJaC.Version), iq.buildNode('os', navigator.userAgent)]));
            }
            return undefined;
          }

        },

        message: {

          fnOnIncoming: function(packet) {
            var stop = false, i, t;
            for (i = 0; i != packet.doc.childNodes[0].childNodes.length; i++) {
              switch(packet.doc.childNodes[0].childNodes[i].nodeName) {
                case 'received' :
                  stop = true;
                  for (t = 0; t != packet.doc.childNodes[0].childNodes[i].attributes.length; t ++) {
                    if (packet.doc.childNodes[0].childNodes[i].attributes[t].nodeName == 'id') {
                      module.trigger('messageDelivered', {id: packet.doc.childNodes[0].childNodes[i].attributes[t].nodeValue});
                    }
                  }
                  break;
              }
            }
            if (stop) return undefined;
            var from = false;
            try {
              var fromJID = packet.getFromJID();
              from = fromJID.getBareJID();
              if (!from) {
                from = fromJID._node + '@' + fromJID._domain;
              }
            } catch(eIncomingMessageTryingOne) {
              try {
                from = fromJID._node + '@' + fromJID._domain;
              } catch(eIncomingMessageTryingTwo) {
                return false;
              }
            }
            if (packet.getBody().htmlEnc() || packet.getSubject().htmlEnc()) {
              var params = {
                msgId: packet.getID(),
                msgType: packet.getType(),
                type: 'text message',
                from: from,
                to: general.storage.client.id,
                subject: packet.getSubject().htmlEnc(),
                message: packet.getBody().htmlEnc()
              };
              var item = general.factory.history.createItem(general.storage.client.id, params);
              var contact = general.storage.contacts.get(params.from) || general.getOrCreateContact(params.from);
              if (contact) {
                contact.history.push(params);
              }
              general.storage.client.history.push(params);
              module.trigger('receivedMessage', {type: 'text message', data: item});
              for (i = 0; i != packet.doc.childNodes[0].childNodes.length; i++) {
                switch(packet.doc.childNodes[0].childNodes[i].nodeName) {
                  case 'request' :
                    if (packet.doc.childNodes[0].childNodes[i].namespaceURI == 'urn:xmpp:receipts') {
                      var m = '<message id="' + ('msgId_' + general.storage.client.login + '_' + (from.split('@')[0]) + '_' + new Date().getTime() + '_received') + '" to="' + new JSJaCJID(from) + '" from="' + (general.storage.client.jid || general.storage.client.id) + '"><received xmlns="urn:xmpp:receipts" id="' + packet.getID() + '" /></message>';
                      general.connection._sendRaw(m);
                    }
                    break;
                }
              }
            } else {
              /* TODO */
            }
            return undefined;
          },

          fnOnOutgoing: function(packet) {
            return undefined;
          }

        },

        presence: {

          fnOnIncoming: function(packet) {
            if (packet) {
              var presence = general.parsePresence(packet);
              if (presence && presence.type == general.XMPP_PRESENCE_TYPE_ERROR) {
                console.warn('Presence type error: ', packet);
              }
              if (presence && (presence.from != general.storage.client.id && presence.from != general.storage.client.jid)) {
                general.debug('JSJaC handling event "onIncomingPresence": ', presence);
                var contact = general.storage.contacts.get(presence.from);
                var request = general.storage.requests.get(presence.from);
                // Presence.type
                if (presence.type) {
                  switch(presence.type) {
                    // UNAVAILABLE
                    case general.XMPP_PRESENCE_TYPE_UNAVAILABLE :
                      if (contact) {
                        contact.status = general.XMPP_PRESENCE_TYPE_UNAVAILABLE;
                        contact.available = false;
                        contact.params = general.getUnavailableStatusParams();
                        module.trigger('contactUpdated', {contact: contact, changed: 'available'});
                      }
                      break;
                    // AVAILABLE
                    case general.XMPP_PRESENCE_TYPE_AVAILABLE :
                      if (contact) {
                        if (!contact.available) {
                          contact.status = general.XMPP_PRESENCE_TYPE_AVAILABLE;
                          contact.available = true;
                          contact.params = general.getAvailableStatusParams();
                          if (contact.subscription == general.XMPP_SUBSCRIPTION_FROM || contact.subscription == general.XMPP_SUBSCRIPTION_BOTH) {
                            general.sendInfoAboutClient(contact.id);
                          }
                          module.trigger('contactUpdated', {contact: contact, changed: 'available'});
                        }
                      }
                      break;
                    // SUBSCRIBE
                    case general.XMPP_PRESENCE_TYPE_SUBSCRIBE :
                      if (!request) {
                        request = general.create.request(presence.from);
                        general.storage.requests.add(request);
                      }
                      module.trigger('receivedRequest', {request: request, type: general.XMPP_PRESENCE_TYPE_SUBSCRIBE});
                      break;
                    // SUBSCRIBED
                    case general.XMPP_PRESENCE_TYPE_SUBSCRIBED :
                      if (contact) {
                        if (contact.ask) {
                          module.trigger('requestAccepted', {contact: contact, changed: 'ask'});
                        }
                        contact.ask = false;
                        if (contact.subscription == general.XMPP_SUBSCRIPTION_FROM) {
                          contact.subscription = general.XMPP_SUBSCRIPTION_BOTH;
                          general.sendInfoAboutClient(contact.id);
                        }
                        if (contact.subscription == general.XMPP_SUBSCRIPTION_NONE) {
                          contact.subscription = general.XMPP_SUBSCRIPTION_TO;
                        }
                        module.trigger('contactUpdated', {contact: contact, changed: 'subscription'});
                      }
                      break;
                    // UNSUBSCRIBED
                    case general.XMPP_PRESENCE_TYPE_UNSUBSCRIBED :
                      if (contact) {
                        if (contact.ask) {
                          module.trigger('requestRejected', {contact: contact, changed: 'ask'});
                        }
                        contact.ask = false;
                        contact.subscription = 'none';
                      }
                      module.trigger('contactUpdated', {contact: contact, changed: 'subscription'});
                      break;
                    // UNSUBSCRIBE
                    case general.XMPP_PRESENCE_TYPE_UNSUBSCRIBE :

                      break;
                  }
                }
                if (presence.command && presence.command.name) {
                  if (typeof general[presence.command.name] != 'undefined' && typeof general[presence.command.name] == 'function') {
                    general[presence.command.name]({
                      from: presence.from,
                      to: presence.to,
                      data: (presence.command.data || {})
                    });
                  }
                }
                if (presence.data) {
                  module.trigger('receivedData', {
                    from: presence.from,
                    to: presence.to,
                    data: presence.data
                  });
                }
              }
            }
            return undefined;
          },

          fnOnOutgoing: function(packet) {
            return undefined;
          }

        },

        packet: {

          fnOnIncoming: function(packet) {
            if (packet.doc.childNodes.length) {
              var i, dom = packet.doc.childNodes[0];
              if (dom.nodeName == 'iq') {
                if (ClientServerPingID == dom.getAttribute('id') && dom.getAttribute('type') == 'error') {
                  ClientServerPingNotSupported = true;
                  if (ClientServerPingInterval) clearInterval(ClientServerPingInterval);
                }
              }
            }
            return undefined;
          },

          fnOnOutgoing: function(packet) {
            return undefined;
          }

        },

        connection: {

          fnOnConnect: function(param) {
            general.debug('Handler ::  onConnect');
            function fire() {
              module.trigger('connected', {});
              module.trigger('rosterLoaded', {change: 'contacts', contacts: general.storage.contacts.get()});
            }
            general.rosterLoadAndParse({
              onError: function(error) {
                module.trigger('connectionFailed', error);
                module.trigger('disconnected');
              },
              onSuccess: function(response) {
                general.initPresence({
                  onError: function(error) {
                    module.trigger('connectionFailed', error);
                    module.trigger('disconnected');
                  },
                  onSuccess: function(response) {
                    var contacts = general.storage.contacts.get();
//                     contacts.forEach(function(value, index) {
//                       var iq = new JSJaCIQ();
//                       iq.setIQ(null, 'get', 'disco#info_' + (value.jid || value.id) + '_' + new Date().getTime());
//                       iq.setFrom(general.storage.client.jid || general.storage.client.id);
//                       iq.setTo(value.jid || value.id);
//                       iq.setType('get');
//                       iq.setQuery('http://jabber.org/protocol/disco#info');
//                       general.connection.sendIQ(iq, {
//                         error_handler: function(aiq) {
//                           /* nothing TODO */
//                         },
//                         result_handler: function(aiq, arg) {
//                           console.warn(aiq.getQuery().childNodes);
//                         }
//                       });
//                     });
                    if (module.config('xmpp.ClientServerPing') && !ClientServerPingNotSupported) {
                      if (ClientServerPingInterval) clearInterval(ClientServerPingInterval);
                      ClientServerPingInterval = setInterval(fnPing, module.config('xmpp.ClientServerPing'));
                    }
                    fire();
                  }
                });
              }
            });
            return undefined;
          },

          fnOnDisconnect: function() {
            // console.warn('_.fnOnDISCONNECT, abort flag: ', module.connectionIsAborted);
            if (module.config('xmpp.ClientServerPing') && !ClientServerPingNotSupported && ClientServerPingInterval) clearInterval(ClientServerPingInterval);
            ClientServerPingNotSupported = false;
            var disconnectInitiator = 'system';
            general.destroyConnection();
            if(module.disconnectedByUser) {
              disconnectInitiator = 'user';
              module.disconnectedByUser = false;
            }
            // console.warn('fire >> oSDK: disconnected');
            module.trigger('disconnected', {initiator: disconnectInitiator});
            return undefined;
          },

          fnOnError: function() {
            // console.warn('_.fnOnERROR, abort flag: ', module.connectionIsAborted);
            if (module.config('xmpp.ClientServerPing') && !ClientServerPingNotSupported && ClientServerPingInterval) clearInterval(ClientServerPingInterval);
            if (module.connectionIsAborted) {
              module.connectionIsAborted = false;
              return;
            }
            ClientServerPingNotSupported = false;
            if (general.test('connection')) {
              general.connection.disconnect();
            } else {
              general.destroyConnection();
              // console.warn('fire >> oSDK: disconnected');
              module.trigger('disconnected');
            }
            // console.warn('fire >> oSDK: connectionFailed');
            module.trigger('connectionFailed', new module.Error({data: arguments}));
            return undefined;
          },

          fnOnResume: function(param) {
            return undefined;
          },

          fnOnStatusChanged: function(param) {
            return undefined;
          }

        }

      }

    };

    /*
     * Attachment
     */

    general.attach(methods);

  }

})(oSDK, JSJaC);