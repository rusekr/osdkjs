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
       * Dispatched when the contact list was downloaded from serverв
       *
       * @memberof RosterAPI
       * @event rosterLoaded
       * @param {array} array Contact list
       *
       */
      'rosterLoaded': {client: true},

      /**
       * Dispatched when the number of entries was changed in conact list
       *
       * @memberof RosterAPI
       * @event rosterUpdated
       * @param {array} array Contact list
       *
       */
      'rosterUpdated': {client: true},

      /**
       * Dispatched when one or more properties were changed for currently logged in user
       *
       * @memberof PresenceAPI
       * @event clientUpdated
       * @param {IUser} object currently logged in user
       *
       */
      'clientUpdated': {client: true},

      /**
       * Dispatched when one or more properties of certain element were changed in contact list
       *
       * @memberof RosterAPI
       * @event contactUpdated
       * @param {IUser} object element of contact list
       *
       */
      'contactUpdated': {client: true},

      'receivedData': {client: true},

      /**
       * Dispatched when new message was recieved
       *
       * @memberof MessagingAPI
       * @event receivedMessage
       * @param {IHistoryElement} object element of message history
       *
       */
      'receivedMessage': {client: true},

      /**
       * Dispatched when new authorization request is recieved
       *
       * @memberof RosterAPI
       * @event receivedRequest
       * @param {IUser} object authorization request
       *
       */
      'receivedRequest': {client: true},

      /**
       * Dispatched when the request of the currently logged in user was approved by the other side
       *
       * @memberof RosterAPI
       * @event requestAccepted
       * @param {IUser} object element of contact list
       *
       */
      'requestAccepted': {client: true},

      /**
       * Dispatched when the request of the currently logged in user was rejected by the other side
       *
       * @memberof RosterAPI
       * @event requestRejected
       * @param {IUser} object element of contact list
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
       * Return information about the currently logged in user
       *
       * @memberof PresenceAPI
       * @method oSDK.getClient
       * @returns {IUser} - the currently logged in user
       */
      getClient: general.getClient,

      /**
       * Change system status or registering user status
       *
       * @memberof PresenceAPI
       * @method oSDK.registerStatus
       * @param {object} status info
       * @returns {boolean}
       */
      registerStatus: general.registerStatus,

      /**
       * Change system statuses or registering several user statuses
       *
       * @memberof PresenceAPI
       * @method oSDK.registerStatuses
       * @param {array} array of the objects that keeps info about registered statuses
       * @returns {boolean}
       */
      registerStatuses: general.registerStatuses,

      /**
       * Change status of the currently logged in user
       *
       * @memberof PresenceAPI
       * @method oSDK.setStatus
       * @param {string} new user status
       * @returns {boolean}
       */
      setStatus: general.setStatus,

      /**
       * Change signature of the currently logged in user
       *
       * @memberof PresenceAPI
       * @method oSDK.setSignature
       * @param {string} new user signature
       * @returns {boolean}
       */
      setSignature: general.setSignature,

      // Contact

      /**
       * Return element of the contact list
       *
       * @memberof RosterAPI
       * @method oSDK.getContact
       * @param {string} contact ID
       * @returns {IUser} element of the contact list
       */
      getContact: general.getContact,

      /**
       * Return contact list
       *
       * @memberof RosterAPI
       * @method oSDK.getContacts
       * @returns {array} contact list
       */
      getContacts: general.getContacts,

      /**
       * Return element of the contact list, or create it if it does not exist
       *
       * @memberof RosterAPI
       * @method oSDK.getOrCreateContact
       * @param {string} Contact ID
       * @returns {IUser} element of the contact list
       */
      getOrCreateContact: general.getOrCreateContact,

      /**
       * Add element into the contact list
       *
       * @memberof RosterAPI
       * @method oSDK.addContact
       * @param {object}.id contact ID
       * @param {object}.group group of the contact
       * @param {object}.nickname nickname of the contact
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {IUser} element of the contact list
       */
      addContact: general.addContact,

      /**
       * Change info about element in contact list
       *
       * @memberof RosterAPI
       * @method oSDK.updateContact
       * @param {object}.id contact ID
       * @param {object}.group group of the contact
       * @param {object}.nickname nickname of the contact
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {IUser} element of the contact list
       */
      updateContact: general.updateContact,

      /**
       * Remove element from the contact list
       *
       * @memberof RosterAPI
       * @method oSDK.removeContact
       * @param {string} contact ID
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {boolean}
       */
      removeContact: general.removeContact,

      /**
       * Return contact list filtered by the group it belongs to
       *
       * @memberof RosterAPI
       * @method oSDK.getGroup
       * @param {string} Group name
       * @returns {array} Contact list
       */
      getGroup: general.getGroup,

      /**
       * Return list of names of all existing groups
       *
       * @memberof RosterAPI
       * @method oSDK.getGroups
       * @returns {array} list of group names
       */
      getGroups: general.getGroups,

      /**
       * Filter contact list by group name
       *
       * @memberof RosterAPI
       * @method oSDK.sortContactsByGroups
       * @returns {object} Return combined contact list
       */
      sortContactsByGroups: general.sortContactsByGroups,

      // Request

      /**
       * Return the request from the list of recieved authirization requests
       *
       * @memberof RosterAPI
       * @method oSDK.getRequest
       * @param {string} Request ID
       * @returns {IUser} element of the request list
       */
      getRequest: general.getRequest,

      /**
       * Return the list of recieved requests
       *
       * @memberof RosterAPI
       * @method oSDK.getRequests
       * @returns {array} the request list
       */
      getRequests: general.getRequests,

      /**
       * Send authorization request
       *
       * @memberof RosterAPI
       * @method oSDK.sendAuthRequest
       * @param {string} contact ID
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {boolean}
       */
      sendAuthRequest: general.sendAuthRequest,

      /**
       * Get authorization request
       *
       * @memberof RosterAPI
       * @method oSDK.acceptRequest
       * @param {string} request ID
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {boolean}
       */
      acceptRequest: general.acceptRequest,

      /**
       * Reject recieved authorization request
       *
       * @memberof RosterAPI
       * @method oSDK.rejectRequest
       * @param {string} request ID
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {boolean}
       */
      rejectRequest: general.rejectRequest,

      // Message

      /**
       * Send text message
       *
       * @memberof MessagingAPI
       * @method oSDK.sendMessage
       * @param {string} recipient ID
       * @param {object}.subject Message caption
       * @param {object}.message Text message
       * @param {callbacks}.onError
       * @param {callbacks}.onSuccess
       * @returns {boolean}
       */
      sendMessage: general.sendMessage,

      sendData: general.sendData

    });

  }

})(oSDK, JSJaC);