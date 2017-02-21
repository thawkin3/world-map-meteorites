$(document).ready(function() {

	// INITIALIZE SOME CHART VARIABLES 
	var width = 960,
		height = 500,
		sizeModifier = 50,
		hue = 0,
		meteorites;

	// MERCATOR IS THE FLAT MAP OF THE WORLD
	// https://github.com/d3/d3-3.x-api-reference/blob/master/Geo-Projections.md
	var projection = d3.geo.mercator();

	// SET UP ZOOM FUNCTIONALITY
	// TRANSLATE DEFAULTS TO [0, 0]; (0,0) POINT IS AT THE CENTER OF A 960x500px RECTANGLE
	// SCALE DEFAULTS TO 1
	// SCALE EXTENT SETS THE ZOOM'S ALLOWED RANGE, DEFAULTS FROM 0 TO INFINITY
	// ON ZOOM SETS A FUNCTION TO BE TRIGGERED ON ZOOM
	var zoom = d3.behavior.zoom()
		.translate([0, 0])
		.scale(1)
		.scaleExtent([.5, 18])
		.on("zoom", zoomed);

	// SETS THE PROJECTION USED BY THE PATH GENERATOR TO USE THE MAP SET IN THE projection VARIABLE ABOVE
	var path = d3.geo.path()
		.projection(projection);

	// SET CHART HEIGHT AND WIDTH
	var svg = d3.select('.chart')
		.attr('width', width)
		.attr('height', height);

	// CHART BACKGROUND
	// SET THE WIDTH, HEIGHT, AND BACKGROUND COLOR
	// CALL ZOOM TO APPLY THE ZOOM TO THIS BACKGROUND
	svg.append('rect')
		.attr('width', width)
		.attr('height', height)
		.attr('fill', '#266D98')
		.call(zoom);

	// CREATE THE TOOLTIP
	var tooltip = d3.select('.mainContainer').append('div')
		.attr('class', 'tooltip')
		.style('opacity', 0);

	// CREATE A GROUP FOR THE MAP
	var map = svg.append('g');

	// LOAD IN THE COORDINATES FOR THE MAP OF THE EARTH
	d3.json('javascripts/world-50m.v1.json', function (error, json) {
		
		// IF THERE WAS AN ERROR, STOP NOW AND SHOW AN ERROR MESSAGE
		if (error) { 
			$(".errorMessage").show();
			$(".chart").hide();
			return error;
		}

		// CONSOLE LOG SOME DATA
		// console.log("Data from country coordinates:");
		// console.log(json);
		// console.log(json.objects);
		// console.log(json.objects.countries);

		// CREATE PATHS FOR ALL THE DATAPOINTS TO VISUALIZE THE COUNTRIES
		// TOPOJSON IS: An extension of GeoJSON that encodes topology
		// DATA IS 241 COUNTRIES AND ALL THE LINES REQUIRED TO DRAW THE BOUNDARIES FOR EACH
		// FILL IS THE COUNTRY BACKGROUND
		// STROKE IS THE COUNTRY OUTLINE
		map.selectAll('path')
			.data(topojson.feature(json, json.objects.countries).features)
			.enter()
			.append('path')
			.attr('fill', '#95E1D3')
			.attr('stroke', '#266D98')
			.attr('d', path)
			.call(zoom);
	});

	// LOAD THE METEORITES DATA POINTS
	d3.json('javascripts/meteorites.json', function (error, json) {

		// IF THERE WAS AN ERROR, STOP NOW AND SHOW AN ERROR MESSAGE
		if (error) { 
			$(".errorMessage").show();
			$(".chart").hide();
			return error;
		}

		// CONSOLE LOG SOME DATA
		// console.log("Data from meteorites:");
		// console.log(json);
		// console.log(json.features);

		// SORT THE DATA POINTS BY DATE
		json.features.sort(function (a, b) {
			return new Date(a.properties.year) - new Date(b.properties.year);
		});

		// CREATE COLORS FOR THE DATA POINTS, INCREASING BY DATE
		for (var i = 0; i < json.features.length; i++) {
			hue += 0.35;
			if (hue > 360) { hue = 0.35; }
			json.features[i].color = 'hsl(' + parseFloat(hue.toFixed(2)) + ',100%, 50%)';
		}

		// SORT THE DATA POINTS BY MASS FROM BIGGEST TO SMALLEST
		// THAT WAY THE SMALL METEORITES DON'T GET HIDDEN BY THE BIGGER METEORITES
		json.features.sort(function (a, b) {
			return b.properties.mass - a.properties.mass;
		});

		// CREATE CIRCLES FOR ALL THE METEORITES
		// CX IS THE X COORDINATE SCALED TO THE MAP DIMENSIONS
		// CY IS THE Y COORDINATE SCALED TO THE MAP DIMENSIONS
		// R IS BASED ON THE MASS OF THE METEORITE
		// SET STROKE AND FILL COLORS
		meteorites = svg.append('g')
			.selectAll('path')
			.data(json.features)
			.enter()
			.append('circle')
			.attr('cx', function (d) {
				return projection([d.properties.reclong, d.properties.reclat])[0];
			})
			.attr('cy', function (d) {
				return projection([d.properties.reclong, d.properties.reclat])[1];
			})
			.attr('r', function(d) {
				var range = 200000;

				if (d.properties.mass <= range) {
					return 2;
				} else if (d.properties.mass <= range * 2) {
					return 10;
				} else if (d.properties.mass <= range * 3) {
					return 20;
				} else if (d.properties.mass <= range * 20) {
					return 30;
				} else if (d.properties.mass <= range * 100) {
					return 40;
				} else {
					return 50;
				}
			})
			.attr('stroke-width', 1)
			.attr('stroke', '#EAFFD0')
			.attr('vector-effect', 'non-scaling-stroke')
			.attr('fill-opacity', 0.5)
			.attr('fill', function(d) {
				return d.color;
			})
			.on('mouseover', function (d) {
				// TURN THE CIRCLE BLACK
				d3.select(this).attr('d', path).style('fill', 'black');
				// SHOW THE TOOLTIP, SET HTML CONTENT AND POSITION
				tooltip.transition()
					.duration(200)
					.style('opacity', .9);
				var massInKg;
				if (d.properties.mass > 100000) {
					massInKg = numberWithCommas((parseFloat(d.properties.mass)/1000).toFixed(0));
				} else {
					massInKg = numberWithCommas((parseFloat(d.properties.mass)/1000).toFixed(2));
				}
				tooltip.html(
						'<span class="def">Name:</span> ' + d.properties.name + '<br />' +
						'<span class="def">Mass:</span> ' + massInKg + ' kg<br />' +
						'<span class="def">Year:</span> ' + new Date(d.properties.year).getUTCFullYear() + '<br />' +
						'<span class="def">Classification:</span> ' + d.properties.recclass + '<br />' +
						'<span class="def">Latitude:</span> ' + d.properties.reclat + '<br />' +
						'<span class="def">Longitude:</span> ' + d.properties.reclong + '<br />'
					)
					.style('left', (d3.event.pageX + 30) + 'px')
					.style('top', (d3.event.pageY / 1.5) + 'px');
			})
			.on('mouseout', function (d) {
				// RESET COLOR OF THE CIRCLE
				d3.select(this).attr('d', path).style('fill', function(d) {
					return d.properties.color;
				});

				// HIDE THE TOOLTIP
				tooltip.transition()
					.duration(500)
					.style('opacity', 0);
			});

	});

	// MOVE AND SCALE THE COUNTRIES AND METEORITES WHEN THE MAP IS ZOOMED OR PANNED
	function zoomed () {
		map.attr("transform", "translate(" + d3.event.translate + ")scale(" + d3.event.scale + ")");
		meteorites.attr('transform', 'translate(' + d3.event.translate + ')scale(' + d3.event.scale + ')');
	}

	// COMMA FORMATTING HELPER FORMULA
	function numberWithCommas (x) {
	    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
	}

});