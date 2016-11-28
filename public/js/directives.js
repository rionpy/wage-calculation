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
					console.log(files[0]);
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