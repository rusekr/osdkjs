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
   * Элемент массива объектов {IHistory}, хранит базовые данные о записи и пользовательские параметры
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
     * Идентификатор отправителя сообщения или инициатора звонка
     *
     * @alias from
     * @memberof IHistoryElement
     * @instance
     * @type string
     */
    this.from = null;

    /**
     * Идентификатор адресата сообщения или принимающего звонок
     *
     * @alias to
     * @memberof IHistoryElement
     * @instance
     * @type string
     */
    this.to = null;

    /**
     * Флаг, сообщающий о том, что данная запись сделана о входящем сообщении или звонке
     *
     * @alias incoming
     * @memberof IHistoryElement
     * @instance
     * @type boolean
     */
    this.incoming = null;

    /**
     * Флаг, сообщающий о том, что данная запись сделана о исходящем сообщении или звонке
     *
     * @alias outgoing
     * @memberof IHistoryElement
     * @instance
     * @type boolean
     */
    this.outgoing = null;

    /**
     * Объект, хранящий дополнительные клиентские параметры записи
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
     * Время создания объекта в секундах
     *
     * @alias timestamp
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.timestamp = date.getTime() / 1000;

    /**
     * Часовой пояс в часах
     *
     * @alias timeZoneOffset
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.timeZoneOffset = date.getTimezoneOffset() / 60;

    /**
     * День месяца 1-31
     *
     * @alias day
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.day = date.getDate();

    /**
     * Месяц 0-11
     *
     * @alias month
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.month = date.getMonth();

    /**
     * Год
     *
     * @alias year
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.year = date.getFullYear();

    /**
     * Часы 0-23
     *
     * @alias hours
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.hours = date.getHours();

    /**
     * Минуты 0-59
     *
     * @alias minutes
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.minutes = date.getMinutes();

    /**
     * Секунды 0-59
     *
     * @alias seconds
     * @memberof IHistoryElement
     * @instance
     * @type number
     */
    this.seconds = date.getSeconds();

  }

  /**
   * Объект истории, хранящий историю сообщений и звонков для каждого элемента списка контактов, или для текущего авторизованного пользователя
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
     * Очищает массив истории того контакта, к которому прикреплен объект
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
     * Возвращает историю контакта или ее фрагмент
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
     * Добавляет элемент {IHistoryElement} в историю контакта
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