
wageApp.directive( 'csvInput', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/directives/csvInput.ejs',
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
				}
			} );
		}
	}
} );

wageApp.directive( 'wageList', function() {
	return {
		restrict: 'E',
		templateUrl: 'js/directives/wageList.ejs',
	}
} );

wageApp.directive( 'bindHeightTo', function( $window ) {
	return {
		restrict: 'A',
		link: function( scope, element, attrs ){
			scope.$watch( function() { return element[0].clientHeight }, function( newVal, oldVal ) {
				scope[ attrs.bindHeightTo ] = newVal;
			});
			function updateHeight() {
				scope[ attrs.bindHeightTo ] = element[0].clientHeight;
				scope.$apply();
			}
			element.on( 'load', function() {
				scope[ attrs.bindHeightTo ] = element[0].clientHeight;
				scope.$apply();
			});
			angular.element( $window ).on( 'resize', updateHeight );
		}
	}
} );
