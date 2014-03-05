/**
 * Inner adapters to some functions of external libraries.
 */

(function (oSDK, jQuery) {

  // jQuery adapters
  oSDK.jq = jQuery; // For domload events handling
  oSDK.ajax = jQuery.ajax;
  oSDK.oajax = jQuery.oajax;

})(oSDK, jQuery); 