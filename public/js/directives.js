/**
 * Includes template containing file input, or fallback for legacy browsers.
 */
wageApp.directive( 'csvInput', function() {
	var template = legacyBrowser? 'js/directives/csvLegacy.ejs' : 'js/directives/csvInput.ejs';
	return {
		restrict: 'E',
		templateUrl: template,
	}
} );

/**
 * Implements the csv-reader attribute for elements.
 * Reads a file selected with the input element.
 */
wageApp.directive( 'csvReader', function() {
	return {
		restrict: 'A',
		link: function( scope, element ) {
			element.on( 'change', function( fileSelectEvent ) {
				var files = fileSelectEvent.target.files;
				if ( files.length ) {
					scope.$apply( function() {
						scope.csvFilename = files[0].name;
					} );
					// Use FileReader() from File API
					var reader = new FileReader();
					reader.onload = function( readerEvent ) {
						var contents = readerEvent.target.result;
						scope.$apply( function() {
							scope.csv = contents;
						} );
					}

					reader.readAsText( files[0] );

					// Reset form parent for reselecting the same CSV.
					element.parent()[0].reset();
				}
			} );
		}
	}
} );

/**
 * Outputs tables based on the wages scope variable.
 */
wageApp.directive( 'wageList', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/directives/wageList.ejs',
	}
} );

/**
 * Directive for tracking element height & saving it to a scope variable.
 * Usage: 'bind-height-to="identifier"' -> $scope.identifier == element.height
 */
wageApp.directive( 'bindHeightTo', function( $window ) {
	return {
		restrict: 'A',
		link: function( scope, element, attrs ){
			// Watch for changes in the function return.
			scope.$watch( function() { return element[0].clientHeight }, function( newVal, oldVal ) {
				scope[ attrs.bindHeightTo ] = newVal;
			});

			// Updates the scope variable.
			function updateHeight() {
				scope[ attrs.bindHeightTo ] = element[0].clientHeight;
				scope.$apply();
			}

			// Bind to load and resize, as they are not handled by $watch.
			element.on( 'load', function() {
				scope[ attrs.bindHeightTo ] = element[0].clientHeight;
				scope.$apply();
			});
			angular.element( $window ).on( 'resize', updateHeight );
		}
	}
} );
