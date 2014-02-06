///DEFINING oSDK
(function ($) {
  
  if(!$) {
    //No jquery or no jquery-croc plugin. Exiting.
    return;
  }
  
  $.oSDK = $.oSDK || function (config) {
    
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

        // Make sure that you have 
//         jso_ensureTokens({
//           "opensdp": ["https://192.168.64.164:8243/location/1.0.0/"],
//           // "facebook": ["read_stream"],
//           // "instagram": ["basic", "likes"]
//         });

        // Perform a data request
        // $.oajax({
        //  url: "https://api.instagram.com/v1/subscriptions",
        //  jso_provider: "instagram", // Will match the config identifier
        //  jso_scopes: false, // List of scopes (OPTIONAL)
        //  dataType: 'json',
        //  success: function(data) {
        //    console.log("Response (bridge):");
        //    console.log(data);
        //  },
        //  error: function() {
        //    console.log("ERROR Custom callback()");
        //  }
        // });
        
        $.ajaxSetup({
//           async: false
        });

        // Perform a data request
        $.oajax({
          url: config.testUrlApp,
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
        
        
        $.oajax({
          url: config.testUrlApp,
          type: 'put',
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
        
        
        $.oajax({
          url: config.testUrlApp,
          type: 'post',
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
        
        
        //         $.oajax({
//           url: config.testUrlUser,
//           type: 'get',
//           headers: {'Authorization':'Bearer '+config.appToken},
//           jso_provider: "opensdp",
//           jso_allowia: true,
//           jso_scopes: [config.testScope],
//           dataType: 'json',
//           success: function(data) {
//             console.log("Response (opensdp):");
//             console.log(data);
//           },
//           error: function() {
//             console.log("ERROR Custom callback()");
//           }
//         });
        
        console.log('testUrlAppUser', config.testUrlAppUser);
        $.oajax({
          url: config.testUrlAppUser,
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
        


        
        $.oajax({
          url: config.testUrlAppUser,
          type: 'put',
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
        
                $.oajax({
          url: config.testUrlAppUser,
          type: 'post',
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
        
        $.oajax({
          url: config.testUrlAppUser,
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
        
        
        
        
        
        //         $.oajax({
//           url: config.testUrlAppUser,
//           type: 'get',
//           jso_provider: "opensdp",
//           jso_allowia: true,
//           jso_scopes: [config.testScope],
//           dataType: 'json',
//           success: function(data) {
//             console.log("Response (opensdp):");
//             console.log(data);
//           },
//           error: function() {
//             console.log("ERROR Custom callback()");
//           }
//         });
//         $.ajax({
//           url: config.testUrlAppUser,
//           type: 'get',
//           headers: {'Authorization':'Bearer K9B3wlCsUblMLD2IUkmnhPVrJAMa'},
//           dataType: 'json',
//           success: function(data) {
//             console.log("Response (opensdp):");
//             console.log(data);
//           },
//           error: function() {
//             console.log("ERROR Custom callback()");
//           }
//         });
        
        
        
        
        
//         $.oajax({
//           url: config.testUrlFree,
//           type: 'get',
//           headers: {'Authorization':'Bearer '+config.appToken},
//           jso_provider: "opensdp",
//           jso_allowia: true,
//           jso_scopes: [config.testScope],
//           dataType: 'json',
//           success: function(data) {
//             console.log("Response (opensdp):");
//             console.log(data);
//           },
//           error: function() {
//             console.log("ERROR Custom callback()");
//           }
//         });

        
        
//         return ;
//         $.ajax(config.apiServerURL, {
//           type: 'GET',
// //           contentType: 'application/json; charset=UTF-8',
// //           datatype: 'json',
//           crossDomain: true,
//           data: {
//             'response_type': 'token',
//             'client_id': config.appID,
//             'redirect_uri': location.href,
//           },
//           success: function (data, status) {
//             console.log('osdk connected successfully', data, status);
//             return instance.onConnected(data);
//           },
//           error: function (jqxhr, status) {
//             console.log('osdk failed to connect', jqxhr, status);
//             return instance.onConnectionFailed(status);
//           }
/*
        });*/
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
