/**
 * Check for browsers that don't support FileReader.
 */
var legacyBrowser = typeof FileReader == 'undefined'? true : false;

var wageApp = angular.module( 'wageApp', [] );
