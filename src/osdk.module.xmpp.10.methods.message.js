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

      sendMessage: function(id, param, callbacks) {

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        id = this.getId(id);

        if (!this.test('valide id', id)) {
          if (utils.isString(id) && id.substr(0,1) == '#') {
            if (!this.test('valide id', id.substr(1))) {
              handlers.onError(this.error('2x0'));
              return false;
            }
          } else {
            handlers.onError(this.error('2x0'));
            return false;
          }
        }

        if (this.test('client id', id)) {
          handlers.onError(this.error('8x0'));
          return false;
        }

        var data = {
          subject: false,
          message: false
        };

        if (utils.isString(param)) {
          data.message = param;
        } else {
          if (utils.isObject(param)) {
            if (param.message && utils.isString(param.message)) {
              data.message = param.message;
            }
            if (param.subject && utils.isString(param.subject)) {
              data.subject = param.subject;
            }
          }
        }

        if (!data.message) {
          handlers.onError(this.error('2x5'));
          return false;
        }

        var msgId = false, msgType = false;

        if (module.config('xmpp.AddMessageId') || module.config('xmpp.AddMessageType')) {
          msgId = 'msgId_' + this.storage.client.login + '_' + (this.storage.contacts.get(id) || this.getOrCreateContact(id)).login + '_' + new Date().getTime();
          if (module.config('xmpp.AddMessageType')) {
            msgType = 'chat';
          }
        }

        var message = new JSJaCMessage();
        if (msgId) message.setID(msgId);
        message.setTo(new JSJaCJID(id));
        message.setFrom(this.storage.client.id);
        if (msgType) message.setType(msgType);
        message.setBody(data.message);
        message.setSubject(data.subject || '');
        if (module.config('xmpp.MessageDeliveryReceipts')) {
          var request = message.buildNode('request');
          request.setAttribute('xmlns', 'urn:xmpp:receipts');
          message.doc.childNodes[0].appendChild(request);
        }
        if (!this.connection.send(message)) {
          handlers.onError(this.error('0x0'));
          return false;
        } else {
          var params = {
            type: 'text message',
            from: this.storage.client.id,
            to: id,
            subject: data.subject,
            message: data.message
          };
          if (msgId) params.msgId = msgId;
          if (msgType) params.msgType = msgType;
          var item = this.factory.history.createItem(this.storage.client.id, params);
          var contact = this.storage.contacts.get(params.to) || this.getOrCreateContact(params.to);
          if (contact) {
            contact.history.push(params);
          }
          this.storage.client.history.push(params);
          handlers.onSuccess({type: 'text message', data: item});
          return false;
        }

      },

      sendCustomData: function(id, param, callbacks) {

        var handlers = this.prepareHandlers(callbacks);

        if (!this.test('connection')) {
          handlers.onError(this.error('1x0'));
          return false;
        }

        id = this.getId(id);

        if (!this.test('valide id', id)) {
          if (utils.isString(id) && id.substr(0,1) == '#') {
            if (!this.test('valide id', id.substr(1))) {
              handlers.onError(this.error('2x0'));
              return false;
            }
          } else {
            handlers.onError(this.error('2x0'));
            return false;
          }
        }

        if (this.test('client id', id)) {
          handlers.onError(this.error('8x0'));
          return false;
        }

        if (!utils.isObject(param)) {
          param = {data: param};
        }

        if (!this.sendPresence({to: id, data: param})) {
          handlers.onError(this.error('0x0'));
          return false;
        } else {
          var params = {
            type: 'data',
            from: this.storage.client.id,
            to: id,
            data: param
          };
          handlers.onSuccess(params);
          return false;
        }

      }

    };

    /*
     * Attachment
     */

    general.attach(methods);

  }

})(oSDK, JSJaC);