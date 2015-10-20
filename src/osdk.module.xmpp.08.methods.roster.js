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

      rosterLoad: function(callbacks) {

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        var iq = new JSJaCIQ();
        iq.setIQ(null, 'get', this.generateRosterID());
        iq.setFrom(this.storage.client.jid || this.storage.client.id);
        iq.setQuery(NS_ROSTER);

        this.connection.sendIQ(iq, {
          error_handler: function(aiq) {
            handlers.onError(general.error('0x0'));
          },
          result_handler: function(aiq, arg) {
            if (aiq.getQuery().childNodes && aiq.getQuery().childNodes.length) {
              general.storage.roster = aiq.getQuery().childNodes;
            } else {
              general.storage.roster = [];
            }
            handlers.onSuccess(general.storage.roster);
          }
        });

      },

      rosterParse: function(param) {
        try {
          var roster = param || this.storage.roster;
          var i, len = roster.length, factory = new module.factory.contact();
          this.storage.contacts.clear();
          for (i = 0; i != len; i ++) {
            this.debug(roster[i]);
            var jid = roster[i].getAttribute('jid');
            if (jid) {
              var prepare = jid.split('/');
              jid = prepare[0].toLowerCase() + ((typeof prepare[1] != 'undefined') ? '/' + prepare[1] : '');
              if (this.storage.client.id != jid && this.storage.client.jid != jid) {
                var contact = factory.create(jid);
                if (roster[i].getAttribute('name')) contact.nickname = roster[i].getAttribute('name');
                if (roster[i].getAttribute('ask')) contact.ask = roster[i].getAttribute('ask');
                if (roster[i].getAttribute('subscription')) contact.subscription = roster[i].getAttribute('subscription');
                contact.params = this.getUnavailableStatusParams();
                if (roster[i].childNodes && roster[i].childNodes.length) {
                  var t, tln = roster[i].childNodes.length;
                  for (t = 0; t != tln; t ++) {
                    if(roster[i].childNodes[t].nodeName == 'group') {
                      contact.group = roster[i].childNodes[t].innerHTML;
                    }
                  }
                }
                this.storage.contacts.add(contact);
              }
            }
          }
          return true;
        } catch(eRosterParse) {
          this.storage.contacts.clear();
          return false;
        }
      },

      rosterLoadAndParse: function(callbacks) {

        var handlers = this.prepareHandlers(callbacks);

        this.rosterLoad({
          onError: function(error) {
            handlers.onError(error);
          },
          onSuccess: function(response) {
            if (!general.rosterParse()) {
              handlers.onError(general.error('0x0'));
            } else {
              handlers.onSuccess(general.storage.contacts.get());
            }
          }
        });

      },

      rosterInsert: function(id, params, callbacks) {

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        params = ((utils.isObject(params)) ? params : {});

        var iq = new JSJaCIQ();
        iq.setType('set');
        iq.setFrom(this.storage.client.jid || this.storage.client.id);
        var query = iq.setQuery(NS_ROSTER);
        var item = iq.buildNode('item', {
          xmlns: NS_ROSTER,
          jid: id,
          name: (params.nickname || id.split('@')[0]),
          subscription: 'none'
        });

        item.appendChild(iq.buildNode('group', (params.group || 'general')));
        query.appendChild(item);

        this.connection.sendIQ(iq, {
          error_handler: function(aiq) {
            handlers.onError(general.error('0x0'));
          },
          result_handler: function(aiq, arg) {
            general.rosterLoad({
              onError: function(error) {
                handlers.onError(error);
              },
              onSuccess: function(roster) {
                handlers.onSuccess(roster);
              }
            });
          }
        });

        return true;

      },

      rosterUpdate: function(id, params, callbacks) {

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        params = ((utils.isObject(params)) ? params : {});

        if (!params.nickname && !params.group) {

          handlers.onError(this.error('0x0'));
          return false;

        } else {

          var iq = new JSJaCIQ();
          iq.setType('set');
          iq.setFrom(this.storage.client.jid || this.storage.client.id);
          var query = iq.setQuery(NS_ROSTER);
          var change = {jid: id};
          if (params.nickname) change.name = params.nickname;
          var item = iq.buildNode('item', change);
          if (params.group) {
            item.appendChild(iq.buildNode('group', params.group));
          }
          query.appendChild(item);

          this.connection.sendIQ(iq, {
            error_handler: function(aiq) {
              handlers.onError(general.error('0x0'));
            },
            result_handler: function(aiq, arg) {
              general.rosterLoad({
                onError: function(error) {
                  handlers.onError(error);
                },
                onSuccess: function(roster) {
                  handlers.onSuccess(roster);
                }
              });
            }
          });

        }

        return true;

      },

      rosterDelete: function(id, callbacks) {

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        var iq = new JSJaCIQ();
        iq.setType('set');
        iq.setFrom(this.storage.client.jid || this.storage.client.id);
        var query = iq.setQuery(NS_ROSTER);
        var item = iq.buildNode('item', {
          jid: id,
          subscription: 'remove'
        });
        query.appendChild(item);

        this.connection.sendIQ(iq, {
          error_handler: function(aiq) {
            handlers.onError(general.error('0x0'));
          },
          result_handler: function(aiq, arg) {
            general.rosterLoad({
              onError: function(error) {
                handlers.onError(error);
              },
              onSuccess: function(roster) {
                handlers.onSuccess(roster);
              }
            });
          }
        });

        return true;

      },

      getContact: function(id) {
        id = this.getId(id);
        return this.storage.contacts.get(id);
      },

      getContacts: function() {
        return this.storage.contacts.get();
      },

      getOrCreateContact: function(param) {
        if (param && utils.isString(param)) {
          var params = param.split('/');
          if (params[0] && utils.isValidLogin(params[0])) {
            params[0] = this.getId(params[0]);
          }
          if (params[0] && utils.isValidID(params[0])) {
            var id = params[0];
            if (id != general.storage.client.id) {
              var contact = general.getContact(id);
              if (contact) {
                return contact;
              } else {
                var resource = (typeof params[1] != 'undefined' && params[1]) ? params[1] : false;
                return general.create.contact(id, resource);
              }
            }
          }
        }
        return false;
      },

      addContact: function(params, callbacks) {

        var id = this.getId(params);

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        if (!this.test('valide id', id)) {
          handlers.onError(this.error('2x0'));
          return false;
        }

        if (this.test('client id', id)) {
          handlers.onError(this.error('5x2'));
          return false;
        }

        if (this.test('contact exists', id)) {
          handlers.onError(this.error('5x1'));
          return false;
        }

        var parameters = {};

        if (params.nickname) {
          if (!this.test('item name', params.nickname)) {
            handlers.onError(this.error('2x2'));
            return false;
          }
          parameters.nickname = params.nickname;
        }

        if (params.group) {
          if (!this.test('item group', params.group)) {
            handlers.onError(this.error('2x3'));
            return false;
          }
          parameters.group = params.group;
        }

        this.rosterInsert(id, parameters, {
          onError: function(error) {
            handlers.onError(error);
          },
          onSuccess: function(roster) {
            var factory = new module.factory.contact();
            var contact = factory.create(id);
            if (parameters.nickname) contact.nickname = parameters.nickname;
            if (parameters.group) contact.group = parameters.group;
            general.storage.contacts.add(contact);
            module.trigger('rosterUpdated', {change: 'contacts', contacts: general.storage.contacts.get()});
            handlers.onSuccess({change: 'contacts', contacts: general.storage.contacts.get()});
          }
        });

        return true;

      },

      updateContact: function(params, callbacks) {

        var id = this.getId(params);

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        if (!this.test('valide id', id)) {
          handlers.onError(this.error('2x0'));
          return false;
        }

        if (!this.test('contact exists', id)) {
          handlers.onError(this.error('5x0'));
          return false;
        }

        var parameters = {};

        if (params.nickname) {
          if (!this.test('item name', params.nickname)) {
            handlers.onError(this.error('2x2'));
            return false;
          }
          parameters.nickname = params.nickname;
        }

        if (params.group) {
          if (!this.test('item group', params.group)) {
            handlers.onError(this.error('2x3'));
            return false;
          }
          parameters.group = params.group;
        }

        if (!parameters.nickname && !parameters.group) {
          handlers.onError(this.error('2x4'));
          return false;
        }

        this.rosterUpdate(id, parameters, {
          onError: function(error) {
            handlers.onError(error);
          },
          onSuccess: function(roster) {
            var contact = general.storage.contacts.get(id);
            if (parameters.nickname) contact.nickname = parameters.nickname;
            if (parameters.group) contact.group = parameters.group;
            module.trigger('contactUpdated', {change: 'contact', contact: contact});
            handlers.onSuccess({change: 'contact', contact: contact});
          }
        });

        return true;

      },

      removeContact: function(id, params) {

        var handlers = this.prepareHandlers(params);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        id = this.getId(id);

        if (!this.test('valide id', id)) {
          handlers.onError(this.error('2x0'));
          return false;
        }

        if (this.test('client id', id)) {
          handlers.onError(this.error('5x3'));
          return false;
        }

        if (!this.test('contact exists', id)) {
          handlers.onError(this.error('5x0'));
          return false;
        }

        var contact = this.storage.contacts.get(id);
        var request = this.storage.requests.get(id);

        if ((contact.ask && contact.ask == this.XMPP_PRESENCE_TYPE_SUBSCRIBE) || (contact.subscription == this.XMPP_SUBSCRIPTION_TO || contact.subscription == this.XMPP_SUBSCRIPTION_BOTH)) {
          this.sendPresence({
            to: contact.id,
            type: this.XMPP_PRESENCE_TYPE_UNSUBSCRIBE
          });
        }

        if (request || (contact.subscription == this.XMPP_SUBSCRIPTION_FROM || contact.subscription == this.XMPP_SUBSCRIPTION_BOTH)) {
          this.sendPresence({
            to: contact.id,
            type: this.XMPP_PRESENCE_TYPE_UNSUBSCRIBED
          });
        }

        this.rosterDelete(id, {
          onError: function(error) {
            handlers.onError(error);
          },
          onSuccess: function(roster) {
            general.storage.remove(id);
            module.trigger('rosterUpdated', {change: 'contacts', contacts: general.storage.contacts.get()});
            handlers.onSuccess({change: 'contacts', contacts: general.storage.contacts.get()});
          }
        });

      },

      getGroup: function(group) {
        var result = [];
        var contacts = this.storage.contacts.get();
        var i, len = contacts.length;
        for (i = 0; i != len; i++) {
          var contact = contacts[i];
          if (group == contact.group) {
            result.push(contact);
          }
        }
        return result;
      },

      getGroups: function() {
        var result = [], saver = {};
        var contacts = this.storage.contacts.get();
        var i, len = contacts.length;
        for (i = 0; i != len; i++) {
          var contact = contacts[i];
          var hash = '_' + utils.md5(contact.group);
          if (typeof saver[hash] == 'undefined' || !saver[hash]) {
            saver[hash] = true;
            result.push(contact.group);
          }
        }
        if (result.length) {
          result = result.sort(function(a, b) {
            var i, len;
            if (a.length > b.length) {
              len = b.length;
            } else {
              len = a.length;
            }
            for (i = 0; i != len; i ++) {
              var ca = a.charCodeAt(i);
              var cb = b.charCodeAt(i);
              if (ca != cb) return ca - cb;
            }
            if (a.length > b.length) {
              return -1;
            } else {
              return 1;
            }
          });
        }
        return result;
      },

      sortContactsByGroups: function() {
        var result = {};
        var groups = this.getGroups();
        var contacts = this.storage.contacts.get();
        var g, gl = groups.length;
        var c, cl = contacts.length;
        for (g = 0; g != gl; g++) {
          var group = groups[g];
          for (c = 0; c != cl; c++) {
            var contact = contacts[c];
            if (group == contact.group) {
              var key = group;
              if (typeof result[key] == 'undefined') {
                try {
                  result[key] = [];
                } catch(eSortContactsByGroups) {
                  key = '_' + key;
                  result[key] = [];
                }
              }
              result[key].push(contact);
            }
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