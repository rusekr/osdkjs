/*
 * opensdp.osdk
 * http://TODO:git
 *
 * Copyright (c) 2014 Teligent OOO
 * Licensed under the TODO license.
 */

/** @namespace */
var oSDK = oSDK || {};

(function (oSDK) {
  
  if(!JQuery) {
    // No jquery. Exiting.
    // TODO: raise exception
    return;
  }

  /**
   * Starting point of sdk {@link oSDK.connect}.
   * @param {object} config - main configuration of osdk
   */
  oSDK.connect = function (config) {
    
    // Default configuration
    var defaultConfig = {
      apiServerURL: '',
      appID: '', 
    };

    var parseConfig = function (config) {
      // TODO: parse config
      // Merge with default config
      config = $.extend(true, {}, defaultConfig, config);
      return config;
    } 
    
    //runtime
    config = parseConfig(config);
    
    //runtime on pageload
    $(function () {
      
      console.warn('onload hash', location.hash);
      
      // Add configuration for one or more providers.
      jso_configure({
        "opensdp": {
          client_id: config.appID,
          redirect_uri: window.location.href.replace(/\?.*$|#.*$/, ''),
          authorization: config.apiServerURL,
          presenttoken: 'qs'
        }
      });
      console.log('app url', window.location.href.replace(/\?.*$|#.*$/, ''));
      
      //check for tocken if we are just after redirect
      jso_checkfortoken('opensdp');
      
      // This dumps all cached tokens to console, for easyer debugging.
      jso_dump();
      
    });
    
    
    var instance = {
      //connect to openSDP network
      connect: function () {
        
        console.log('osdk sending acess token request to connect');

        // Make sure that you have 
        jso_ensureTokens({
          "opensdp": ["mainauth"]
        });

        $.ajaxSetup({
//           async: false
        });



        $.oajax({
          url: config.testUrlApp,
          type: 'delete',
          headers: {'Authorization':'Bearer '+config.appToken},
          jso_provider: "opensdp",
          jso_allowia: true,
          jso_scopes: [config.testScope],
          dataType: 'json',
          success: function(data) {
            console.log("Response (opensdp):");
            console.log(data);
          },
          error: function() {
            console.log("ERROR Custom callback()");
          }
        });

      }
      //default onConnect callback
      ,onConnected: function () {
        
      }
      ,onConnectionFailed: function () {
        
      }
      ,sip: {
        register: function () {
          
        }
      }
 
      
    };
    
//     var oSDK = {};
//     
//     for (var propName in croc) {
//       if (croc.hasOwnProperty(propName)) {
//         oSDK[propName] = croc[propName];
//       }
//     }

    return instance;
  }

})(oSDK);
