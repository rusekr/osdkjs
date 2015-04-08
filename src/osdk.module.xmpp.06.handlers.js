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
              },
              onSuccess: function(response) {
                general.initPresence({
                  onError: function(error) {
                    module.trigger('connectionFailed', error);
                  },
                  onSuccess: function(response) {
                    fire();
                  }
                });
              }
            });
            return undefined;
          },

          fnOnDisconnect: function(param) {
            general.debug('Handler ::  fnOnDisconnect');
            general.destroyConnection();
            var disconnectInitiator = 'system';
            if(module.disconnectedByUser) {
              disconnectInitiator = 'user';
              module.disconnectedByUser = false;
            }
            module.trigger('disconnected', {initiator: disconnectInitiator});
            return undefined;
          },

          fnOnError: function(param) {
            general.debug('Handler ::  onError');
            if (general.test('connection')) {
              general.connection.disconnect();
            } else {
              general.destroyConnection();
              module.trigger('disconnected', {initiator: 'system'});
            }
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