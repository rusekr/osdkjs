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

  /**
   * Element of an array of objects {IHistory} keeps the basic data of the entry and user settings
   *
   * @constructor IHistoryElement
   */
  function IHistoryElement(params, client) {

    /**
     * Тип записи
     *
     * @alias type
     * @memberof IHistoryElement
     * @instance
     * @type string
     */
    this.type = null;

    /**
     * ID of the message sender or caller
     *
     * @alias from
     * @memberof IHistoryElement
     * @instance
     * @type string
     */
    this.from = null;

    /**
     * ID of the message recipient or call recipient
     *
     * @alias to
     * @memberof IHistoryElement
     * @instance
     * @type string
     */
    this.to = null;

    /**
     * The flag informs that the record is made about an incomming message or call
     *
     * @alias incoming
     * @memberof IHistoryElement
     * @instance
     * @type boolean
     */
    this.incoming = null;

    /**
     * The flag informs that the record is made about an outgoing message or call
     *
     * @alias outgoing
     * @memberof IHistoryElement
     * @instance
     * @type boolean
     */
    this.outgoing = null;

    /**
     * An object contains additional entries of client options
     *
     * @alias params
     * @memberof IHistoryElement
     * @instance
     * @type object
     */
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

    /**
     * Time of creation in seconds
     *
     * @alias timestamp
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.timestamp = date.getTime() / 1000;

    /**
     * Time zone in hours
     *
     * @alias timeZoneOffset
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.timeZoneOffset = date.getTimezoneOffset() / 60;

    /**
     * Day of month 1-31
     *
     * @alias day
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.day = date.getDate();

    /**
     * Month 0-11
     *
     * @alias month
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.month = date.getMonth();

    /**
     * Year
     *
     * @alias year
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.year = date.getFullYear();

    /**
     * Hours 0-23
     *
     * @alias hours
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.hours = date.getHours();

    /**
     * Minutes 0-59
     *
     * @alias minutes
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.minutes = date.getMinutes();

    /**
     * Seconds 0-59
     *
     * @alias seconds
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.seconds = date.getSeconds();

  }

  /**
   *The history object keeps message and call history for each element of contact list for the currently logged in user
   *
   * @constructor IHistory
   */
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

    /**
     * Clears the array of history for the contact which the object is attached to
     *
     * @alias clear
     * @memberof IHistory
     * @instance
     * @type boolean
     */
    this.clear = function() {
      setHistory(keygen(), null);
      return true;
    };

    /**
     * Returns contact history or its fragment
     *
     * @alias state
     * @memberof IHistory
     * @instance
     * @type array
     */
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

    /**
     * Adding element  {IHistoryElement} into contact history
     *
     * @alias push
     * @memberof IHistory
     * @instance
     * @type {IHistoryElement|false}
     */
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