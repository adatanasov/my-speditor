var map, marker;
var MARKER_PATH = 'images/truck-icon.png';
var directionsDisplay, directionsService;
var ROUTE_ID, MAP_EXISTS, MAP_ID;

$('document').ready(function(){
	ROUTE_ID = getParameterByName('routeId');
	drawMapIfExists();
});

function initMap() {
  var myLatlng = new google.maps.LatLng(42.77,23.09);
  map = new google.maps.Map(document.getElementById('map'), {
    zoom: 7,
	mapTypeId: google.maps.MapTypeId.ROADMAP,
    center: myLatlng,
	streetViewControl: false,
	mapTypeControl: false
  });
  
  directionsService = new google.maps.DirectionsService;
  directionsDisplay = new google.maps.DirectionsRenderer({
    draggable: true,
    map: map
  });

  directionsDisplay.addListener('directions_changed', function() {
    computeTotalDistance(directionsDisplay.getDirections());
  });

  var onChangeHandler = function() {
    calculateAndDisplayRoute(directionsService, directionsDisplay);
  };
  
  var start = new google.maps.places.Autocomplete(
      (document.getElementById('start')), {
        types: ['(cities)']
      });

  var end = new google.maps.places.Autocomplete(
      (document.getElementById('end')), {
        types: ['(cities)']
      });
	  
  start.addListener('place_changed', onChangeHandler);
  end.addListener('place_changed', onChangeHandler);    
};

function calculateAndDisplayRoute(directionsService, directionsDisplay) {
  var startInput = document.getElementById('start');
  var endInput = document.getElementById('end');
  if(startInput.value && endInput.value) {
	  directionsService.route({
		origin: startInput.value,
		destination: endInput.value,
		travelMode: google.maps.TravelMode.DRIVING
	  }, function(response, status) {
		if (status === google.maps.DirectionsStatus.OK) {
		  directionsDisplay.setDirections(response);
		  
		  var geocoder = new google.maps.Geocoder();
		  var address = startInput.value;
		  geocoder.geocode({'address': address}, function(results, status) {
			  if (status === google.maps.GeocoderStatus.OK) {
				  if (marker) {
					marker.setMap(null);
					marker = null;
				  }
				  marker = new google.maps.Marker({
					position: results[0].geometry.location,
					map: map,
					draggable:true,
					title:"TRUCK",
					animation: google.maps.Animation.DROP,
					icon: { 
						url: MARKER_PATH,
						size: new google.maps.Size(51, 51),
						scaledSize: new google.maps.Size(51, 51)
				  }});
				  infowindow = new google.maps.InfoWindow({
					 content: 'Content here...'
					});
				  google.maps.event.addListener(marker, "click", function() {
					  infowindow.open(map, marker);
				  });
			  } else {
				alert('Geocode was not successful for the following reason: ' + status);
				}
		  });
		} else {
		  window.alert('Directions request failed due to ' + status);
		}
	  });
  }
};

function setMap(mapInfo) {
    var waypointsList = [];
    for(var i=0; i < mapInfo.Waypoints.length; i++)
        waypointsList[i] = {
			'location': new google.maps.LatLng(mapInfo.Waypoints[i].lat, mapInfo.Waypoints[i].lng),
			'stopover':false 
		}
         
    directionsService.route({'origin':new google.maps.LatLng(mapInfo.Start.lat, mapInfo.Start.lng),
    'destination':new google.maps.LatLng(mapInfo.End.lat, mapInfo.End.lng),
    'waypoints': waypointsList,
    'travelMode': google.maps.DirectionsTravelMode.DRIVING},function(response, status) {
        if (status === google.maps.DirectionsStatus.OK) {
			directionsDisplay.setDirections(response);
		} else {
			console.log('Directions request failed due to ' + status);
		}
    }) 
};

function computeTotalDistance(result) {
  var total = 0;
  var myroute = result.routes[0];
  for (var i = 0; i < myroute.legs.length; i++) {
    total += myroute.legs[i].distance.value;
  }
  total = total / 1000;
  document.getElementById('total').value = total + ' km';
};

$('.save-map').on('click', function () {
	var mapInfo = getMapInfo();
	
	if (MAP_EXISTS) {
		// update the map
		$.ajax({
			type: "PUT",
			url: 'http://api.everlive.com/v1/NZCsBulPD19OCNSf/Map/' + MAP_ID,
			headers: { "Authorization" : "Bearer " + getCookie('MYSPEDITOR_AUTH') },
			contentType: "application/json",
			data: JSON.stringify(mapInfo),
			success: function (data) {
				alert('Map successfully updated!');
				alert(JSON.stringify(data));
			},
			error: function (error) {
				alert(error.responseJSON.message);
				alert(JSON.stringify(error));
			} 
		});
	} else {
		// create the map 
		$.ajax({
			type: "POST",
			url: 'http://api.everlive.com/v1/NZCsBulPD19OCNSf/Map',
			headers: { "Authorization" : "Bearer " + getCookie('MYSPEDITOR_AUTH') },
			contentType: "application/json",
			data: JSON.stringify(mapInfo),
			success: function (data) {
				alert('Map successfully created!');
				alert(JSON.stringify(data));
				MAP_EXISTS = true;
				MAP_ID = data.Result.Id;
				
				// get the route
				var updatedRoute;
		
				$.ajax({
					type: "GET",
					url: 'http://api.everlive.com/v1/NZCsBulPD19OCNSf/Route/' + ROUTE_ID,
					headers: { "Authorization" : "Bearer " + getCookie('MYSPEDITOR_AUTH')},
					contentType: "application/json",
					success: function (data) {
						updatedRoute = data.Result;						
						updatedRoute.Map = MAP_ID;
						
						// update the route with the map id
						$.ajax({
							type: "PUT",
							url: 'http://api.everlive.com/v1/NZCsBulPD19OCNSf/Route/' + ROUTE_ID,
							headers: { "Authorization" : "Bearer " + getCookie('MYSPEDITOR_AUTH')},
							contentType: "application/json",
							data: JSON.stringify(updatedRoute),
							success: function (data) {
								alert('Route successfully updated!');
								alert(JSON.stringify(data));
							},
							error: function (error) {
								alert(error.responseJSON.message);
								alert(JSON.stringify(error));
							} 
						});
					},
					error: function (error) {
						alert(error.responseJSON.message);
						alert(JSON.stringify(error));
					} 
				});
			},
			error: function (error) {
				alert(error.responseJSON.message);
				alert(JSON.stringify(error));
			} 
		});		
	}
});

function getMapInfo() {
	var waypointsList = [], waypoints, mapInfo = {};	
    var routeLegs = directionsDisplay.directions.routes[0].legs[0];
    mapInfo.Start = {'lat': routeLegs.start_location.lat(), 'lng':routeLegs.start_location.lng()};
    mapInfo.End = {'lat': routeLegs.end_location.lat(), 'lng':routeLegs.end_location.lng()};
    waypoints = routeLegs.via_waypoints;
	
    for (var i=0; i<waypoints.length; i++) {
		waypointsList[i] = {'lat': waypoints[i].lat(), 'lng': waypoints[i].lng()};
	}
		
    mapInfo.Waypoints = waypointsList; 
	return mapInfo;
};

function getCookie(cname) {
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i=0; i<ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0)==' ') {
			c = c.substring(1);
		}
        if (c.indexOf(name) == 0) {
			return c.substring(name.length, c.length);
		} 
    }
    return "";
};

function getParameterByName(name) {
    name = name.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]");
    var regex = new RegExp("[\\?&]" + name + "=([^&#]*)"),
        results = regex.exec(location.search);
    return results === null ? "" : decodeURIComponent(results[1].replace(/\+/g, " "));
};

function drawMapIfExists() {
	$.ajax({
		type: "GET",
		url: 'http://api.everlive.com/v1/NZCsBulPD19OCNSf/Route/' + ROUTE_ID,
		headers: { "Authorization" : "Bearer " + getCookie('MYSPEDITOR_AUTH')},
		contentType: "application/json",
		success: function (data) {
			MAP_EXISTS = data.Result.MapId == '' ? false : true;
			if (MAP_EXISTS) {
				MAP_ID = data.Result.MapId;
				
				$.ajax({
					type: "GET",
					url: 'http://api.everlive.com/v1/NZCsBulPD19OCNSf/Map/' + MAP_ID,
					headers: { "Authorization" : "Bearer " + getCookie('MYSPEDITOR_AUTH')},
					contentType: "application/json",
					success: function (data) {
						var mapInfo = data.Result;						
						setMap(mapInfo);
					},
					error: function (error) {
						alert(error.responseJSON.message);
						alert(JSON.stringify(error));
					} 
				});
			}
		},
		error: function (error) {
			alert(error.responseJSON.message);
			alert(JSON.stringify(error));
		}
	});
};