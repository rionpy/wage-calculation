wageApp.controller( 'wageController', [ '$scope', '$http', function( $scope, $http ) {
	/**
	 * Provide dummy data for legacy browsers.
	 */
	$scope.dummyCsv = false;
	if ( legacyBrowser ) {
		$http.get( 'dummy.csv' ).then( function( response ) {
			$scope.dummyCsv = response.data;
		} );
	}

	/**
	 * Parse dummy data. Called by file input in csvLegacy.ejs.
	 */
	$scope.parseDummyCsv = function() {
		$scope.csv = $scope.dummyCsv;
	}

	/**
	 * Define constants.
	 */
	var REGULAR_HOURS = 480;
	var HOURLY_WAGE = 3.75;
	var EVENING_COMPENSATION = 1.15;
	var EC_START = 1080;
	var EC_END = 360;
	var DAY_MINUTES = 1440;
	var OVERTIME_FACTOR_1 = 0.25;
	var OVERTIME_FACTOR_2 = 0.5;
	var OVERTIME_FACTOR_3 = 1;
	var OT_ZONE_1 = 120;
	var OT_ZONE_2 = 120;
	var MINUTE_WAGE = HOURLY_WAGE / 60;

	/**
	 * Define scope variables & controllers.
	 */
	$scope.wageDetails = false;
	$scope.toggleWageDetails = function() {
		$scope.wageDetails = !$scope.wageDetails;
	}

	/**
	 * Returns minutes since 00:00.
	 */
	var hoursToMinutes = function( hours ) {
		hours = hours || '00:00';
		var time = hours.split( ':' );
		return parseInt( time[0] ) * 60 + parseInt( time[1] );
	};

	/**
	 * Calculate evening hours (between 18:00 & 6:00).
	 */
	var calculateEveningMinutes = function( startMinutes, endMinutes ) {
		startMinutes = startMinutes || 0;
		endMinutes = endMinutes || 0;
		var eveningMinutes = 0;

		// Shift started before 06:00
		if ( startMinutes < EC_END ) {
			if ( endMinutes <= EC_END ) {
				eveningMinutes += endMinutes - startMinutes;
			} else {
				eveningMinutes += EC_END - startMinutes;
			}
			
		}

		// Shift ended after 18:00
		if ( endMinutes > EC_START ) {
			if ( startMinutes < EC_START ) {
				eveningMinutes += endMinutes - EC_START;
			} else {
				eveningMinutes += endMinutes - startMinutes;
			}

			// Shift didn't end before 06:00 of the next day.
			if ( endMinutes > ( DAY_MINUTES + EC_END ) ) {
				eveningMinutes -= endMinutes - ( DAY_MINUTES + EC_END );
			}
		}

		return eveningMinutes;
	};

	/**
	 * Sorts an object by turning it into an array.
	 */
	var sortObjectToArray = function( object, sortProperty, reverse ) {
		reverse = reverse || false;
		var sorted = [];
		angular.forEach( object, function( item ) {
			sorted.push( item );
		} );
		sorted.sort( function ( a, b ) {
			return ( a[ sortProperty ] > b[ sortProperty ] ? 1 : -1 );
		} );
		if ( reverse ) {
			sorted.reverse();
		}
		return sorted;
	}

	/**
	 * Sets orderBy property for a month in the wages array.
	 */
	$scope.setOrder = function( order, id ) {
		if ( order.id == id ) {
			order.reverse = !order.reverse;
		} else {
			order.reverse = false;
		}

		order.id = id;
		return order;
	}

	/**
	 * Returns parse error for frontend.
	 */
	var getError = function( error ) {
		return 'Error on line ' + $scope.currentCsvRow + ': ' + error;
	}
	$scope.currentCsvRow = 0;

	/**
	 * Watches for changes in the CSV scope variable and calculates wages on change.
	 * The variable is updated by the csvReader directive.
	 */
	$scope.$watch( 'csv', function( newCsv ) {
		// Reset parse error in frontend.
		$scope.parseError = false;

		// Only handle the watched CSV-variable if it's defined, as it is undefined when bound.
		if ( newCsv ) {
			var rows = newCsv.split( '\n' );
			var hoursWorked = {};

			// Format CSV data to more manageable form.
			// Start loop at 1 to skip header row.
			for ( var i = 1; i < rows.length; i++ ) {
				// Skip empty rows.
				if ( rows[ i ].match( /^\s*$/ ) ) {
					continue;
				}

				// Set current row index for error reporting.
				$scope.currentCsvRow = i + 1;

				// Trim whitespace at start, end, and around delimiters.
				var row = rows[ i ].replace( /^\s+|\s+(?=,)|^\s$/g, '' ).replace( /,\s+/g, ',' ).split( ',' );

				// Check for wrong amount of columns.
				if ( row.length > 5 ) {
					$scope.parseError = getError( 'Extra column.' );
					return false;
				} else if ( row.length < 5 ) {
					$scope.parseError = getError( 'Missing columns.' );
					return false;
				}

				var name = row[0];

				// Validate ID as integer.
				if ( row[1] == parseInt( row[1] ) ) {
					var id = row[1];
				} else {
					$scope.parseError = getError( 'ID should be an integer.' );
					return false;
				}

				// Validate date as dd.mm.YY.
				var date = row[2].replace( /\s*/g, '' );
				if ( date.match( /^(3[01]|[0-2]?[0-9])\.(1[0-2]|0?[0-9])\.[0-9]{4}$/g ) ) {
					date = date.split( '.' );
					var year = date[2];
					// Pad the month for display purposes.
					var month = ( '0' + date[1] ).slice( -2 );
					var day = date[0];
				} else {
					$scope.parseError = getError( 'Date should be in the following format: dd.mm.YYYY' );
					return false;
				}

				// Validate shift timestamps.
				var timestampRegexp = /^(0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/;
				// if ( !row[3].match( /^(0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/ ) || !row[4].match( /^(0?[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/ ) ) {
				if ( !timestampRegexp.test( row[3] ) || !timestampRegexp.test( row[4] ) ) {
					$scope.parseError = getError( 'Invalid timestamp. Proper format is: hh:MM' );
					return false;
				}

				// Turn shifts from hours to minutes for calculations.
				var entryStart = hoursToMinutes( row[3] );
				var entryEnd = hoursToMinutes( row[4] );
				if ( entryEnd < entryStart ) {
					entryEnd = DAY_MINUTES + entryEnd;
				}
				var shiftDuration = entryEnd - entryStart;
				var eveningMinutes = calculateEveningMinutes( entryStart, entryEnd );

				// Initiate sub-objects.
				if ( ! ( year in hoursWorked ) ) {
					hoursWorked[ year ] = {
						'index': year,
						'months': {},
					};
				}
				if ( ! ( month in hoursWorked[ year ].months ) ) {
					hoursWorked[ year ].months[ month ] = {
						'index': month,
						'order': {
							'id': 'index',
							'reverse': false,
						},
						'ids': {},
					};
				}
				if ( ! ( id in hoursWorked[ year ].months[ month ].ids ) ) {
					hoursWorked[ year ].months[ month ].ids[ id ] = {
						'index': id,
						'name': name,
						'days': {},
					};
				}
				if ( ! ( day in hoursWorked[ year ].months[ month ].ids[ id ].days ) ) {
					hoursWorked[ year ].months[ month ].ids[ id ].days[ day ] = {
						'index': day,
					};
				}

				// Add to total hours in minutes.
				var totalMinutes = shiftDuration + hoursWorked[ year ].months[ month ].ids[ id ].days[ day ]['totalMinutes'] || shiftDuration;
				hoursWorked[ year ].months[ month ].ids[ id ].days[ day ]['totalMinutes'] = totalMinutes;

				// Add to evening hours in minutes.
				hoursWorked[ year ].months[ month ].ids[ id ].days[ day ]['eveningMinutes'] = eveningMinutes + hoursWorked[ year ].months[ month ].ids[ id ].days[ day ]['eveningMinutes'] || eveningMinutes;

				// Define overtime hours in minutes.
				if ( totalMinutes > REGULAR_HOURS ) {
					hoursWorked[ year ].months[ month ].ids[ id ].days[ day ]['overtime'] = totalMinutes - REGULAR_HOURS;
				} else {
					hoursWorked[ year ].months[ month ].ids[ id ].days[ day ]['overtime'] = 0;
				}
			}

			// Calculate wages & total hours/month and add to hoursWorked.
			// Convert hoursWorked to true array for ngRepeat.
			hoursWorked = sortObjectToArray( hoursWorked, 'index' );
			var i = hoursWorked.length;

			while ( i-- ) {
				hoursWorked[ i ].months = months = sortObjectToArray( hoursWorked[ i ].months, 'index' );
				var j = months.length;

				while ( j-- ) {
					hoursWorked[ i ].months[ j ].ids = ids = sortObjectToArray( hoursWorked[ i ].months[ j ].ids, 'index' );
					var g = ids.length;

					while ( g-- ) {
						var monthTotalSalary = 0;
						var monthEveningCompensation = 0;
						var monthOvertimeCompensation = 0;

						angular.forEach( ids[ g ].days, function( day, dayKey ) {
							var eveningCompensation = day['eveningMinutes'] * ( EVENING_COMPENSATION / 60 );
							var regularWage = day['totalMinutes'] * MINUTE_WAGE;
							var overtimeCompensation = 0;

							if ( day['overtime'] > ( OT_ZONE_1 + OT_ZONE_2 ) ) {
								overtimeCompensation = MINUTE_WAGE * OVERTIME_FACTOR_1 * OT_ZONE_1 + MINUTE_WAGE * OVERTIME_FACTOR_2 * OT_ZONE_2 + MINUTE_WAGE * OVERTIME_FACTOR_3 * ( day['overtime'] - OT_ZONE_1 - OT_ZONE_2 );
							} else if ( day['overtime'] > OT_ZONE_1 ) {
								overtimeCompensation = MINUTE_WAGE * OVERTIME_FACTOR_1 * OT_ZONE_1 + MINUTE_WAGE * OVERTIME_FACTOR_2 * ( day['overtime'] - OT_ZONE_1 );
							} else {
								overtimeCompensation = MINUTE_WAGE * OVERTIME_FACTOR_1 * day['overtime'] || 0;
							}

							monthEveningCompensation += eveningCompensation;
							monthOvertimeCompensation += overtimeCompensation;
							monthTotalSalary += regularWage + eveningCompensation + overtimeCompensation;
						} );

						hoursWorked[ i ].months[ j ].ids[ g ].monthTotalSalary = monthTotalSalary.toFixed( 2 );
						hoursWorked[ i ].months[ j ].ids[ g ].monthTotalSalaryValue = parseFloat( monthTotalSalary );

						hoursWorked[ i ].months[ j ].ids[ g ].monthEveningCompensation = monthEveningCompensation.toFixed( 2 );
						hoursWorked[ i ].months[ j ].ids[ g ].monthEveningCompensationValue = parseFloat( monthEveningCompensation );

						hoursWorked[ i ].months[ j ].ids[ g ].monthOvertimeCompensation = monthOvertimeCompensation.toFixed( 2 );
						hoursWorked[ i ].months[ j ].ids[ g ].monthOvertimeCompensationValue = parseFloat( monthOvertimeCompensation );
					}
				}
			}

			$scope.wages = hoursWorked;
		}
	} );
} ] );