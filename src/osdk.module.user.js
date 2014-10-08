/*
 * oSDK User module
 */

(function (oSDK) {

  "use strict";

  /**
   * @namespace UserAPI
   */

  // Instance of inner user module

  var module = new oSDK.utils.Module('user');

  // Module specific DEBUG.
  module.debug = true;

  var utils = module.utils;

  // Default configuration

  var config = {
    history: {
      // Default length of history journal to any user
      length: 1000
    }
  };

  // Class User

  var listOfRegisteredParamsToUser = [];

  /**
   * Some user object, maybe instance of contact in contact's list (interpretation of XMPP roster) or current authorized client or some other elements
   *
   * @constructor User
   */

  function User(params) {

    var self = this;

    var i, len = listOfRegisteredParamsToUser.length;

    for (i = 0; i != len; i ++) {
      var ep = listOfRegisteredParamsToUser[i];
      self[ep.name] = ep.value;
    }

    /**
     * Status of current instance of {User}
     *
     * @alias status
     * @memberof User
     * @instance
     * @type string
     */
    this.status = 'offline';

    if (!params || (params && (typeof params.history == 'undefined' || params.history))) {

      /**
       * Local history of current instance of {User}<br />
       * Instance of class {UserHistory}
       *
       * @alias history
       * @memberof User
       * @instance UserHistory
       * @type object
       */
      this.history = new UserHistory(self);

    }

    /**
     * Capabilities to current instance of {User}<br />
     * Instance of class {UserCapabilities}
     *
     * @alias capabilities
     * @memberof User
     * @instance UserCapabilities
     * @type object
     */
    this.capabilities = new UserCapabilities(self);

  }

  // Class UserHistory

  /**
   * Local history to use in instance of User
   *
   * @constructor UserHistory
   */

  function UserHistory(param) {

    var self = this;

    var user = param;

    // Generate unique key to history in localStorage
    var generateHistoryKey = function() {
      return '_' + utils.md5(oSDK.getClient().id + user.id);
    };

    // Get history to current user from localStorage
    var getHistoryFromLS = function() {
      var result = utils.storage.getItem('oUserHistory');
      if (!result && !utils.isArray(result)) {
        result = {};
        utils.storage.setItem('oUserHistory', result);
      }
      return result;
    };

    // Set history to current user in localStorage
    var setHistoryInLS = function(value) {
      utils.storage.setItem('oUserHistory', value);
      return value;
    };

    /**
     * Clear a local history for current instance of {User}
     *
     * @alias clear
     * @memberof UserHistory
     * @instance
     * @returns {boolean} true
     */
    this.clear = function() {
      var oSDKH = getHistoryFromLS(), key = generateHistoryKey();
      oSDKH[key] = [];
      setHistoryInLS(oSDKH);
      return true;
    };

    /**
     * Return history list to current instance of {User}
     *
     * @alias state
     * @memberof UserHistory
     * @instance
     * @param {number} param - length of required history list or undefined
     * @returns {array} list of history
     */
    this.state = function(param) {
      var oSDKH = getHistoryFromLS(), key = generateHistoryKey();
      if (typeof oSDKH[key] == 'undefined' || !oSDKH[key].length) return [];
      if (typeof param != 'undefined') {
        var c, i = oSDKH[key].length - param, result = [];
        if (i < 0) i = 0;
        for (c = i; c != oSDKH[key].length; c ++) {
          result.push(oSDKH[key][c]);
        }
        return result;
      }
      return oSDKH[key];
    };

    /**
     * Insert into history
     *
     * @alias push
     * @memberof UserHistory
     * @instance
     * @param {object} param - some object to save in history
     * @returns {object} inserted object
     */
    this.push = function(params) {
      function prepareHistoryParams(params) {
        var result = params;
        if (!utils.isObject(result)) result = { data: result };
        if (typeof result.type == 'undefined') result.type = 'unknown';
        return result;
      }
      var oSDKH = getHistoryFromLS(), key = generateHistoryKey();
      var element = prepareHistoryParams(params);
      if (typeof oSDKH[key] == 'undefined') oSDKH[key] = [];
      oSDKH[key].push(element);
      if (oSDKH[key].length > config.history.length) {
        var hist = [];
        for (var i = 1; i != oSDKH[key].length; i ++) {
          hist.push(oSDKH[key][i]);
        }
        oSDKH[key] = hist;
      }
      setHistoryInLS(oSDKH);
      return element;
    };

  }

  // Class UserCapabilities

  var listOfRegisteredParamsToCapabilities = [];

  /**
   * Capabilities to use in instance of User
   *
   * @constructor UserCapabilities
   */

  function UserCapabilities(param) {

    var self = this;

    var user = param;

    var params = {
      tech: {},
      user: {}
    };

    var i, len = listOfRegisteredParamsToCapabilities.length;

    for (i = 0; i != len; i ++) {
      var ep = listOfRegisteredParamsToCapabilities[i];
      params.tech[ep.name] = ep.tech;
      params.user[ep.name] = ep.user;
    }

    this.getTechParam = function(param) {
      if (utils.isNull(params.tech[param])) return undefined;
      return params.tech[param];
    };

    this.setTechParam = function(param, value) {
      if (utils.isNull(params.tech[param])) return undefined;
      params.tech[param] = !!value;
      return true;
    };

    this.getTechParams = function() {
      return params.tech;
    };

    this.setTechParams = function(list) {
      if (list && utils.isObject(list)) {
        var i;
        for (i in list) {
          if (!utils.isNull(params.tech[i])) {
            params.tech[i] = !!list[i];
          }
        }
        return true;
      }
      return false;
    };

    this.getUserParam = function(param) {
      if (utils.isNull(params.user[param])) return undefined;
      return params.user[param];
    };

    this.setUserParam = function(param, value) {
      if (utils.isNull(params.user[param])) return undefined;
      params.user[param] = !!value;
      return true;
    };

    this.getUserParams = function() {
      return params.user;
    };

    this.setUserParams = function(list) {
      if (list && utils.isObject(list)) {
        var i;
        for (i in list) {
          if (!utils.isNull(params.user[i])) {
            params.user[i] = !!list[i];
          }
        }
        return true;
      }
      return false;
    };

    this.param = function(param) {
      if (utils.isNull(params.tech[param]) || utils.isNull(params.user[param])) return undefined;
      return !!(params.tech[param] & params.user[param]);
    };

    this.params = function() {
      var result = {}, i, len = listOfRegisteredParamsToCapabilities.length;
      for (i = 0; i != len; i ++) {
        var ep = listOfRegisteredParamsToCapabilities[i];
        result[ep.name] = !!(params.tech[ep.name] & params.user[ep.name]);
      }
      return result;
    };

    /**
     * Return capabilities to current instance of {User}
     *
     * @alias getParams
     * @memberof UserCapabilities
     * @instance
     * @param {mixed} param - undefined if get returns all capabilities, string tif get returns some named capability, or object if get returns list of required capabilities
     * @returns {mixed} boolean or object
     */
    this.getParams = function(param) {
      if (utils.isNull(param)) {
        return this.params();
      } else {
        if (utils.isString(param)) {
          return this.param(param);
        }
        if (utils.isObject(param)) {
          var i, len = listOfRegisteredParamsToCapabilities.length;
          for (i = 0; i != len; i ++) {
            var ep = listOfRegisteredParamsToCapabilities[i];
            if (!utils.isNull(param[ep.name])) {
              param[ep.name] = !!(params.tech[ep.name] & params.user[ep.name]);
            }
            return param;
          }
        }
      }
    };

    /**
     * Set one or more params of capabilities of current instance of {User}
     *
     * @alias setParams
     * @memberof UserCapabilities
     * @instance
     * @param {mixed} param - string to set one capability or object to set some list of capabilities
     * @param {boolean} value - if param is set as string, then capability, which name is {param}, must be set in {value}
     * @returns {boolean} true
     */
    this.setParams = function(param, value) {
      if (utils.isNull(value) && utils.isObject(param)) {
        var i;
        for (i in param) {
          params.user[i] = !!param[i];
        }
      } else {
        if (!utils.isNull(value) && utils.isString(param)) {
          params.user[param] = !!value;
        }
      }
      return true;
    };

  }

  // Register protected methods

  module.registerObjects({

    user: {

      // Uxpand list of properties on User class

      expandProperties: function(varName, varValue, moduleName) {

        if (!varName || utils.isNull(varValue)) return false;

        listOfRegisteredParamsToUser.push({
          name: varName,
          value: varValue,
          module: ((moduleName) ? moduleName : 'unknown')
        });

        return true;

      },

      // Expand list of properties on UserCapabilities class

      expandCapabilities: function(varName, varTechValue, varUserValue, moduleName) {

        if (!varName || utils.isNull(varTechValue) || utils.isNull(varUserValue)) return false;

        listOfRegisteredParamsToCapabilities.push({
          name: varName,
          module: ((moduleName) ? moduleName : 'unknown'),
          tech: varTechValue,
          user: varUserValue
        });

        return true;

      }

    }

  });

  // Register public methods on oSDK

  module.registerMethods({

    /**
     * Create a new instance of User for usage in oSDK or client's code
     *
     * @memberof UserAPI
     * @method oSDK.user
     * @param {string} id - contains id for new user
     * @param {object} params - settings as object to create instance of User with some options, or undefined
     * @param {boolean} params.history - if set as false, then property "history" does not exist
     * @returns {object} new instance of User
     */
    user: function(id, params){

      if (id && utils.isString(id) && utils.isValidID(id)) {

          id = id.toLowerCase();

          var instance = new User(params);

          Object.defineProperties(instance, {

            /**
             * ID of current instance of User, contains user login and domain (login@domain), is neither writable, nor enumerable
             *
             * @alias id
             * @memberof User
             * @instance
             * @type string
             */
            "id": {
              value: id,
              writable: false,
              configurable: false,
              enumerable: false
            },

            /**
             * Login of current instance of User, part of User.id, is neither writable, nor enumerable
             *
             * @alias login
             * @memberof User
             * @instance
             * @type string
             */
            "login": {
              value: id.split('@')[0],
              writable: false,
              configurable: false,
              enumerable: false
            },

            /**
             * Domain of current instance of User, part of User.id, is neither writable, nor enumerable
             *
             * @alias domain
             * @memberof User
             * @instance
             * @type string
             */
            "domain": {
              value: id.split('@')[1],
              writable: false,
              configurable: false,
              enumerable: false
            }

          });

          return instance;

      }

      return false;

    }

  });

})(oSDK);
