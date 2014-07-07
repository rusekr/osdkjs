/*
 * oSDK User module
 */

(function (oSDK) {

  "use strict";

  /**
   * @namespace UserAPI
   */

  /**
   * @namespace HistoryAPI
   */

  /**
   * @namespace CapabilitiesAPI
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

  function SDKUser(params) {

    var self = this;

    var i, len = listOfRegisteredParamsToUser.length;

    for (i = 0; i != len; i ++) {
      var ep = listOfRegisteredParamsToUser[i];
      self[ep.name] = ep.value;
    }

    // Default status of user
    this.status = 'offline';

    // History to user
    if (!params || (params && (typeof params.history == 'undefined' || params.history))) {

      this.history = new SDKHistory(self);

    }

    // Capabilities to user

    this.capabilities = new SDKCapabilities(self);

  }

  // Class SDKHistory

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

    // Clear history to current user
    this.clear = function() {
      var oSDKH = getHistoryFromLS(), key = generateHistoryKey();
      oSDKH[key] = [];
      setHistoryInLS(oSDKH);
      return true;
    };

    // Get history
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

      // Push to history
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

    user: function(account, params){
      
      if (account && utils.isString(account) && utils.isValidAccount(account)) {

          account = account.toLowerCase();

          var exemplar = new SDKUser(params);

          Object.defineProperties(exemplar, {
            "account": {
              value: account,
              writable: false,
              configurable: false,
              enumerable: false
            },
            "login": {
              value: account.split('@')[0],
              writable: false,
              configurable: false,
              enumerable: false
            },
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