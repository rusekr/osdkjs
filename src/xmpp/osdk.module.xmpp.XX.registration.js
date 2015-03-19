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
     * Register events
     */

    module.registerEvents({

      'connected': { other: true, client: 'last' },

      'disconnected': { other: true, client: 'last' },

      'connectionFailed': { other: true, client: true },

      'rosterLoaded': {client: true},

      'rosterUpdated': {client: true},

      'clientUpdated': {client: true},

      'contactUpdated': {client: true},

      'receivedData': {client: true},

      'receivedMessage': {client: true},

      'receivedRequest': {client: true},

      'requestAccepted': {client: true},

      'requestRejected': {client: true}

    });

    /*
     * Register methods
     */

    module.registerMethods({

      // Client

      getClient: general.getClient,

      registerStatus: general.registerStatus,

      registerStatuses: general.registerStatuses,

      setStatus: general.setStatus,

      setSignature: general.setSignature,

      // Contact

      getContact: general.getContact,

      getContacts: general.getContacts,

      getOrCreateContact: general.getOrCreateContact,

      addContact: general.addContact,

      updateContact: general.updateContact,

      removeContact: general.removeContact,

      getGroup: general.getGroup,

      getGroups: general.getGroups,

      sortContactsByGroups: general.sortContactsByGroups,

      // Request

      getRequest: general.getRequest,

      getRequests: general.getRequests,

      sendAuthRequest: general.sendAuthRequest,

      acceptRequest: general.acceptRequest,

      rejectRequest: general.rejectRequest,

      // Message

      sendMessage: general.sendMessage,

      sendData: general.sendData

    });

  }

})(oSDK, JSJaC);