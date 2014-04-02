///DEFINING oSDK
(function ($) {
  
  if(!$) {
    //No jquery or no jquery-croc plugin. Exiting.
    return;
  }
  
  $.oSDK = function (config) {
    
    //defining
    var defaultConfig = {
      apiServerURL: '',
      appID: '', 
    };

    var parseConfig = function (config) {
      //TODO: parse config
      
      //merge with default config
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

        
        console.log('testUrlAppUser', config.testUrlAppUser);

//$.ajaxSetup({ async: false });
var u = [config.testUrlAppUser, config.testUrlApp, config.testUrlUser];
var i = 0;
for(i = 0; i < u.length; i++) {
  url = u[i];
  if(!url) {
    continue;
  }
  console.warn(url);
  
        jso_configure({
          "opensdp": {
            client_id: config.appID,
            redirect_uri: window.location.href.replace(/\?.*$|#.*$/, ''),
            authorization: config.apiServerURL,
            presenttoken: 'qs'
          }
        });
        
        $.oajax({
          url: url,
          type: 'get',
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

        $.ajax({
          url: url,
          type: 'get',
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

        jso_configure({
            "opensdp": {
              client_id: config.appID,
              redirect_uri: window.location.href.replace(/\?.*$|#.*$/, ''),
              authorization: config.apiServerURL,
              presenttoken: 'bearer'
            }
          });
        
        $.oajax({
          url: url,
          type: 'get',
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
        
        $.ajax({
          url: url + '?access_token=' + config.appToken,
          type: 'get',
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
        
        $.ajax({
          url: url,
          type: 'get',
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

})(jQuery);
