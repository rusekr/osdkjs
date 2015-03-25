/*
 * oSDK XMPP module
 * with JSJaC library
 */

(function(oSDK, JSJaC) {

  /**
   * @namespace PresenceAPI
   */

  /**
   * @namespace RosterAPI
   */

  /**
   * @namespace MessagingAPI
   */

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
     * Register events
     */

    module.registerEvents({

      'connected': { other: true, client: 'last' },

      'disconnected': { other: true, client: 'last' },

      'connectionFailed': { other: true, client: true },

      /**
       * Dispatched when с сервера был загружен список контактов
       *
       * @memberof RosterAPI
       * @event rosterLoaded
       * @param {array} array Список контактов
       *
       */
      'rosterLoaded': {client: true},

      /**
       * Dispatched when в списке контактов изменилось количество записей
       *
       * @memberof RosterAPI
       * @event rosterUpdated
       * @param {array} array Список контактов
       *
       */
      'rosterUpdated': {client: true},

      /**
       * Dispatched when было обменено одно или более свойств текущего авторизованного пользователя
       *
       * @memberof PresenceAPI
       * @event clientUpdated
       * @param {IUser} object Текущий авторизованный клиент
       *
       */
      'clientUpdated': {client: true},

      /**
       * Dispatched when когда было изменено одно или более свойств определенного элемента из списка контактов
       *
       * @memberof RosterAPI
       * @event contactUpdated
       * @param {IUser} object Элемент списка контактов
       *
       */
      'contactUpdated': {client: true},

      'receivedData': {client: true},

      /**
       * Dispatched when было получено новое сообщение
       *
       * @memberof MessagingAPI
       * @event receivedMessage
       * @param {IHistoryElement} object Элемент списка истории сообщений
       *
       */
      'receivedMessage': {client: true},

      /**
       * Dispatched when когда поступил новый авторизационный запрос
       *
       * @memberof RosterAPI
       * @event receivedRequest
       * @param {IUser} object Запрос авторизации
       *
       */
      'receivedRequest': {client: true},

      /**
       * Dispatched when когда запрос текущего авторизованного пользователя был принят второй стороной
       *
       * @memberof RosterAPI
       * @event requestAccepted
       * @param {IUser} object Элемент списка контактов
       *
       */
      'requestAccepted': {client: true},

      /**
       * Dispatched when когда запрос текущего авторизованного пользователя был отклонен второй стороной
       *
       * @memberof RosterAPI
       * @event requestRejected
       * @param {IUser} object Элемент списка контактов
       *
       */
      'requestRejected': {client: true}

    });

    /*
     * Register methods
     */

    module.registerMethods({

      // Client

      /**
       * Возвращает информацию о текущем авторизованном пользователе
       *
       * @memberof PresenceAPI
       * @method oSDK.getClient
       * @returns {IUser} - текущий авторизованный пользователь
       */
      getClient: general.getClient,

      /**
       * Изменяет данные системного или регистрирует пользовательский статус
       *
       * @memberof PresenceAPI
       * @method oSDK.registerStatus
       * @param {object} Информация о статусе
       * @returns {boolean}
       */
      registerStatus: general.registerStatus,

      /**
       * Изменяет данные системных или регистрирует несколько пользовательских статусов
       *
       * @memberof PresenceAPI
       * @method oSDK.registerStatuses
       * @param {array} Массив объектов, хранящий информацию о регистрируемых статусах
       * @returns {boolean}
       */
      registerStatuses: general.registerStatuses,

      /**
       * Изменяет статус текущего авторизованного пользователя
       *
       * @memberof PresenceAPI
       * @method oSDK.setStatus
       * @param {string} Новый статус пользователя
       * @returns {boolean}
       */
      setStatus: general.setStatus,

      /**
       * Изменяет подпись текущего авторизованного пользователя
       *
       * @memberof PresenceAPI
       * @method oSDK.setSignature
       * @param {string} Новый подпись пользователя
       * @returns {boolean}
       */
      setSignature: general.setSignature,

      // Contact

      /**
       * Возвращает элемент списка контактов
       *
       * @memberof RosterAPI
       * @method oSDK.getContact
       * @param {string} Идентификатор контакта
       * @returns {IUser} Элемент списка контактов
       */
      getContact: general.getContact,

      /**
       * Возвращает список контактов
       *
       * @memberof RosterAPI
       * @method oSDK.getContacts
       * @returns {array} Список контактов
       */
      getContacts: general.getContacts,

      /**
       * Возвращает элемент списка контактов, а если такового нет - создает его
       *
       * @memberof RosterAPI
       * @method oSDK.getOrCreateContact
       * @param {string} Идентификатор контакта
       * @returns {IUser} Элемент списка контактов
       */
      getOrCreateContact: general.getOrCreateContact,

      /**
       * Добавляет элемент в список контактов
       *
       * @memberof RosterAPI
       * @method oSDK.addContact
       * @param {object}.id Идентификатор контакта
       * @param {object}.group Группа контакта
       * @param {object}.nickname Псевдоним контакта
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {IUser} Элемент списка контактов
       */
      addContact: general.addContact,

      /**
       * Изменяет информацию об элементе в списке контактов
       *
       * @memberof RosterAPI
       * @method oSDK.updateContact
       * @param {object}.id Идентификатор контакта
       * @param {object}.group Группа контакта
       * @param {object}.nickname Псевдоним контакта
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {IUser} Элемент списка контактов
       */
      updateContact: general.updateContact,

      /**
       * Удаляет элемент из списка контактов
       *
       * @memberof RosterAPI
       * @method oSDK.removeContact
       * @param {string} Идентификатор контакта
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {boolean}
       */
      removeContact: general.removeContact,

      /**
       * Возвращает список контактов, отфильтрованных по группе к которой они принадлежат
       *
       * @memberof RosterAPI
       * @method oSDK.getGroup
       * @param {string} Имя группы
       * @returns {array} Список контактов
       */
      getGroup: general.getGroup,

      /**
       * Возвращает список c именами всех существующих групп
       *
       * @memberof RosterAPI
       * @method oSDK.getGroups
       * @returns {array} Список имен групп
       */
      getGroups: general.getGroups,

      /**
       * Сортирует список контактов по именам групп
       *
       * @memberof RosterAPI
       * @method oSDK.sortContactsByGroups
       * @returns {object} Возвращает комбинированный список контактов
       */
      sortContactsByGroups: general.sortContactsByGroups,

      // Request

      /**
       * Возвращает запрос из списка поступивших запросов авторизации
       *
       * @memberof RosterAPI
       * @method oSDK.getRequest
       * @param {string} Идентификатор запроса
       * @returns {IUser} Элемент списка запросов
       */
      getRequest: general.getRequest,

      /**
       * Возвращает список поступивших запросов
       *
       * @memberof RosterAPI
       * @method oSDK.getRequests
       * @returns {array} Список запросов
       */
      getRequests: general.getRequests,

      /**
       * Отправляет авторизационный запрос
       *
       * @memberof RosterAPI
       * @method oSDK.sendAuthRequest
       * @param {string} Идентификатор контакта
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {boolean}
       */
      sendAuthRequest: general.sendAuthRequest,

      /**
       * Принимает поступивший авторизационный запрос
       *
       * @memberof RosterAPI
       * @method oSDK.acceptRequest
       * @param {string} Идентификатор запроса
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {boolean}
       */
      acceptRequest: general.acceptRequest,

      /**
       * Отклоняет поступивший авторизационный запрос
       *
       * @memberof RosterAPI
       * @method oSDK.rejectRequest
       * @param {string} Идентификатор запроса
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {boolean}
       */
      rejectRequest: general.rejectRequest,

      // Message

      /**
       * Отправляет текстовое сообщение
       *
       * @memberof MessagingAPI
       * @method oSDK.sendMessage
       * @param {string} Идентификатор адресата
       * @param {object}.subject Заголовок сообщения
       * @param {object}.message Текстовое сообщение
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {boolean}
       */
      sendMessage: general.sendMessage,

      sendData: general.sendData

    });

  }

})(oSDK, JSJaC);