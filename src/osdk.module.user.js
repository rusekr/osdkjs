/*
 * oSDK User module
 */

(function (oSDK) {

  "use strict";

  /**
   * @namespace UserAPI
   */

  // Exemplar of inner user module

  var module = new oSDK.utils.Module('user');

  var utils = module.utils;

  // Default configuration

  var config = {
    history: {
      // Default length of history journal to any user
      length: 1000
    }
  };

  // Class SDKUser

  var listOfRegisteredParamsToUser = [];

  /**
   * Some user object, maybe exemplar of contact in contacts list (interpretation of XMPP roster) or current authorized client or some other elements
   *
   * @constructor SDKUser
   */

  function SDKUser(params) {

    var self = this;

    var i, len = listOfRegisteredParamsToUser.length;

    for (i = 0; i != len; i ++) {
      var ep = listOfRegisteredParamsToUser[i];
      self[ep.name] = ep.value;
    }

    /**
     * Status of current exemplar of {SDKUser}
     *
     * @alias status
     * @memberof SDKUser
     * @instance
     * @type string
     */
    this.status = 'offline';

    if (!params || (params && (typeof params.history == 'undefined' || params.history))) {

      /**
       * Local history to current exemplar of {SDKUser}<br />
       * Exemplar of class {SDKHistory}
       *
       * @alias history
       * @memberof SDKUser
       * @instance SDKHistory
       * @type object
       */
      this.history = new SDKHistory(self);

    }

    /**
     * Capabilities to current exemplar of {SDKUser}<br />
     * Exemplar of class {SDKCapabilities}
     *
     * @alias capabilities
     * @memberof SDKUser
     * @instance SDKCapabilities
     * @type object
     */
    this.capabilities = new SDKCapabilities(self);

  }

  // Class SDKHistory

  /**
   * Local history to use in exemplar of SDKUser
   *
   * @constructor SDKHistory
   */

  function SDKHistory(param) {

    var self = this;

    var user = param;

    // Generate unique key to history in localStorage
    var generateHistoryKey = function() {
      return '_' + utils.md5(user.account);
    };

    // Get history to current user from localStorage
    var getHistoryFromLS = function() {
      var result = utils.storage.getItem('oSDKHistory');
      if (!result && !utils.isArray(result)) {
        result = {};
        utils.storage.setItem('oSDKHistory', result);
      }
      return result;
    };

    // Set history to current user in localStorage
    var setHistoryInLS = function(value) {
      utils.storage.setItem('oSDKHistory', value);
      return value;
    };

    /**
     * Clear a local history for current exemplar of {SDKUser}
     *
     * @alias clear
     * @memberof SDKHistory
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
     * Return history list to current exemplar of {SDKUser}
     *
     * @alias state
     * @memberof SDKHistory
     * @instance
     * @param {number} param - len of history or undefined
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
     * Insert to history
     *
     * @alias push
     * @memberof SDKHistory
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

  // Class SDKCapabilities

  var listOfRegisteredParamsToCapabilities = [];

  /**
   * Capabilities to use in exemplar of SDKUser
   *
   * @constructor SDKCapabilities
   */

  function SDKCapabilities(param) {

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
     * Return capabilities to current exemplar of {SDKUser}
     *
     * @alias getParams
     * @memberof SDKCapabilities
     * @instance
     * @param {mixed} param - undefined to get all capabilities, string to gen some named capability, or object to get list of required capabilities
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
     * Set once or more params of capabilities to current exemplar of {SDKUser}
     *
     * @alias setParams
     * @memberof SDKCapabilities
     * @instance
     * @param {mixed} param - string to set once capability or object to set some list of capabilities
     * @param {boolean} value - if param set as string, then capability, which name is {param}, be set in {value}
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

      // Uxpand list of properties on SDKUser class

      expandProperties: function(varName, varValue, moduleName) {

        if (!varName || utils.isNull(varValue)) return false;

        listOfRegisteredParamsToUser.push({
          name: varName,
          value: varValue,
          module: ((moduleName) ? moduleName : 'unknown')
        });

        return true;

      },

      // Expand list of properties on SDKCapabilities class

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
     * Create a new exemplar of SDKUser for use in oSDK or clients code
     *
     * @memberof UserAPI
     * @method oSDK.user
     * @param {string} account - contains account to new user
     * @param {object} params - settings to create as object or undefined
     * @returns {object} new exemplar of SDKUser
     */
    user: function(account, params){

      if (account && utils.isString(account) && utils.isValidAccount(account)) {

          account = account.toLowerCase();

          var exemplar = new SDKUser(params);

          Object.defineProperties(exemplar, {

            /**
             * Account to current exemplar of {SDKUser}, contains user login and domain, is not writable, is not enumerable
             *
             * @memberof SDKUser
             * @instance
             *
             * @type string
             */
            "account": {
              value: account,
              writable: false,
              configurable: false,
              enumerable: false
            },

            /**
             * Login to current exemplar of {SDKUser}, is not writable, is not enumerable
             *
             * @memberof SDKUser
             * @instance
             *
             * @type string
             */
            "login": {
              value: account.split('@')[0],
              writable: false,
              configurable: false,
              enumerable: false
            },

            /**
             * Domain to current exemplar of {SDKUser}, is not writable, is not enumerable
             *
             * @memberof SDKUser
             * @instance
             *
             * @type string
             */
            "domain": {
              value: account.split('@')[1],
              writable: false,
              configurable: false,
              enumerable: false
            }

          });

          return exemplar;

      }

      return false;

    }

  });

})(oSDK);