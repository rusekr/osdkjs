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

      getRequest: function(id) {
        return this.storage.requests.get(id);
      },

      getRequests: function() {
        return this.storage.requests.get();
      },

      sendAuthRequest: function(id, callbacks) {

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
          handlers.onError(this.error('7x0'));
          return false;
        }

        if (!this.test('contact exists', id)) {
          handlers.onError(this.error('5x0'));
          return false;
        }

        var contact = this.storage.contacts.get(id);

        if (contact.ask && contact.ask == this.XMPP_PRESENCE_TYPE_SUBSCRIBE) {
          handlers.onError(this.error('7x1'));
          return false;
        }

        if (contact.subscription == this.XMPP_SUBSCRIPTION_TO || contact.subscription == this.XMPP_SUBSCRIPTION_BOTH) {
          handlers.onError(this.error('7x2'));
          return false;
        }

        if (!this.sendPresence({ to: id, type: this.XMPP_PRESENCE_TYPE_SUBSCRIBE })) {
          handlers.onError('0x0');
          return false;
        } else {
          contact.ask = true;
          module.trigger('contactUpdated', {changed: 'ask', contact: contact});
          handlers.onSuccess({changed: 'ask', contact: contact});
          return true;
        }

      },

      acceptRequest: function(id, callbacks) {

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
          handlers.onError(this.error('6x1'));
          return false;
        }

        var request = this.storage.requests.get(id);

        if (!request) {
          handlers.onError(this.error('6x2'));
          return false;
        }

        if (!this.sendPresence({to: id, type: this.XMPP_PRESENCE_TYPE_SUBSCRIBED})) {
          handlers.onError(this.error('0x0'));
          return false;
        } else {
          this.storage.requests.remove(id);
          this.sendInfoAboutClient(id);
          var contact = this.storage.contacts.get(id);
          if (!contact) {
            contact = this.create.contact(id);
            contact.subscription = this.XMPP_SUBSCRIPTION_FROM;
            contact.ask = true;
            this.storage.contacts.add(contact);
            this.rosterLoad();
            module.trigger('rosterUpdated', {changed: 'contacts', contacts: this.storage.contacts.get()});
          }
          handlers.onSuccess({type: 'accept', id: id});
          return true;
        }

      },

      rejectRequest: function(id, callbacks) {

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
          handlers.onError(this.error('6x0'));
          return false;
        }

        var request = this.storage.requests.get(id);

        if (!request) {
          handlers.onError(this.error('6x2'));
          return false;
        }

        if (!this.sendPresence({to: id, type: this.XMPP_PRESENCE_TYPE_UNSUBSCRIBED})) {
          handlers.onError(this.error('0x0'));
          return false;
        } else {
          this.storage.requests.remove(id);
          handlers.onSuccess({type: 'reject', id: id});
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