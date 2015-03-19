/*
 * oSDK History module
 */

(function (oSDK) {

  "use strict";

  /**
   * @namespace HistoryAPI
   */


  // Instance of inner user module
  var module = new oSDK.utils.Module('history');

  // Module specific DEBUG.
  module.debug = true;

  // Utils
  var utils = module.utils;

  // Element of client history list
  function IHistoryElement(params, client) {

    this.type = null;

    this.from = null;
    this.to = null;

    this.incoming = null;
    this.outgoing = null;

    this.params = {};

    if (typeof params.type != 'undefined') {
      this.type = params.type;
    } else {
      this.type = 'unknown';
    }

    if (typeof params.from != 'undefined') {
      this.from = params.from;
    }

    if (typeof params.to != 'undefined') {
      this.to = params.to;
    }

    if (client && (this.from || this.to)) {
      if (client == this.from) {
        this.incoming = false;
        this.outgoing = true;
      }
      if (client == this.to) {
        this.incoming = true;
        this.outgoing = false;
      }
    }

    this.params = params;

    var date = new Date();

    this.timestamp = date.getTime() / 1000;

    this.timeZoneOffset = date.getTimezoneOffset() / 60;

    this.day = date.getDate();
    this.month = date.getMonth() + 1;
    this.year = date.getFullYear();

    this.hours = date.getHours();
    this.minutes = date.getMinutes();
    this.seconds = date.getSeconds();

  }

  // Base history object
  function IHistory(clientId, contactId) {

    var self = this;

    var client = clientId;
    var contact = contactId;

    // Settings
    var settings = {
      length: 10000,
      lsHistoryName: 'oSDKHistory'
    };

    // History key generator
    var keygen = function() {
      return '__' + settings.lsHistoryName + '__' + utils.md5(client + '+' + contact);
    };

    // Get history to current user from localStorage
    var getHistory = function() {
      // Current history list
      var result = utils.storage.getItem(keygen());
      // If history is not created (first launch)
      if (!result) utils.storage.setItem(keygen(), []);
      // Return history list
      return result || [];
    };

    // Set history to current user in localStorage
    var setHistory = function(value) {
      utils.storage.setItem(keygen(), value);
      return value;
    };

    this.clear = function() {
      setHistory(keygen(), null);
      return true;
    };

    this.state = function(lng) {
      var history = getHistory();
      if (!history || !utils.isArray(history) || !history.length) {
        return [];
      }
      if (typeof lng == 'undefined' || !utils.isNumber(lng)) {
        return history;
      }
      var result = [], start = history.length - lng, i;
      if (start < 0) {
        return history;
      }
      for (i = start; i != history.length; i++) {
        result.push(history[i]);
      }
      return result;
    };

    this.push = function(params) {
      if (utils.isObject(params)) {
        var item = new IHistoryElement(params, client);
        var history = getHistory();
        if (!history || !utils.isArray(history)) {
          history = [];
        }
        history.push(item);
        if (history.length > settings.length) {
          var i, result = [];
          for (i = 1; i != settings.length; i++) {
            result.push(history[i]);
          }
          history = result;
        }
        setHistory(history);
        return item;
      } else {
        return false;
      }
    };

  }

  // Register protected methods to create history object
  module.registerObjects({
    history: {
      create: function(clientId, contactId) {
        return new IHistory(clientId, contactId);
      },
      createItem: function(client, params) {
        return new IHistoryElement(params, client);
      }
    }
  });

})(oSDK);