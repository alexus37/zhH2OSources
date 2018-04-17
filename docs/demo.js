
function initDemoMap() {

    var Esri_WorldImagery = L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri'
    });

    var Esri_DarkGreyCanvas = L.tileLayer(
        "http://{s}.sm.mapstack.stamen.com/" +
        "(toner-lite,$fff[difference],$fff[@23],$fff[hsl-saturation@20])/" +
        "{z}/{x}/{y}.png",
        {
            attribution: 'Tiles &copy; Esri'
        }
    );

    var baseLayers = {
        "Grey Canvas": Esri_DarkGreyCanvas,
        "Satellite": Esri_WorldImagery

    };

    var map = L.map('map', {
        layers: [Esri_DarkGreyCanvas]
    });
    var info = L.control();
    info.onAdd = function (map) {
		this._div = L.DomUtil.create('div', 'info');
		this.update();
		return this._div;
	};

	info.update = function (props) {
		this._div.innerHTML = '<h4>Drink water source in Zurich</h4>' +
			'<b>Enabe your location to get routed to the next one!</b><br />';
	};

	info.addTo(map);

    var layerControl = L.control.layers(baseLayers);
    layerControl.addTo(map);
    map.setView([47.40, 8.5353], 15);

    return {
        map: map,
        layerControl: layerControl
    };
}

function toRad(n) {
    return n * Math.PI / 180;
};
function distVincenty(lat1, lon1, lat2, lon2) {
    var a = 6378137,
        b = 6356752.3142,
        f = 1 / 298.257223563, // WGS-84 ellipsoid params
        L = toRad(lon2 - lon1),
        U1 = Math.atan((1 - f) * Math.tan(toRad(lat1))),
        U2 = Math.atan((1 - f) * Math.tan(toRad(lat2))),
        sinU1 = Math.sin(U1),
        cosU1 = Math.cos(U1),
        sinU2 = Math.sin(U2),
        cosU2 = Math.cos(U2),
        lambda = L,
        lambdaP,
        iterLimit = 100;
    do {
        var sinLambda = Math.sin(lambda),
            cosLambda = Math.cos(lambda),
            sinSigma = Math.sqrt((cosU2 * sinLambda) * (cosU2 * sinLambda) + (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda) * (cosU1 * sinU2 - sinU1 * cosU2 * cosLambda));
        if (0 === sinSigma) {
            return 0; // co-incident points
        };
        var cosSigma = sinU1 * sinU2 + cosU1 * cosU2 * cosLambda,
            sigma = Math.atan2(sinSigma, cosSigma),
            sinAlpha = cosU1 * cosU2 * sinLambda / sinSigma,
            cosSqAlpha = 1 - sinAlpha * sinAlpha,
            cos2SigmaM = cosSigma - 2 * sinU1 * sinU2 / cosSqAlpha,
            C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
        if (isNaN(cos2SigmaM)) {
            cos2SigmaM = 0; // equatorial line: cosSqAlpha = 0 (§6)
        };
        lambdaP = lambda;
        lambda = L + (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
    } while (Math.abs(lambda - lambdaP) > 1e-12 && --iterLimit > 0);

    if (!iterLimit) {
        return NaN; // formula failed to converge
    };

    var uSq = cosSqAlpha * (a * a - b * b) / (b * b),
        A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq))),
        B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq))),
        deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM))),
        s = b * A * (sigma - deltaSigma);
    return s.toFixed(3); // round to 1mm precision
};

function shuffle(array) {
    var currentIndex = array.length, temporaryValue, randomIndex;

    // While there remain elements to shuffle...
    while (0 !== currentIndex) {

        // Pick a remaining element...
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex -= 1;

        // And swap it with the current element.
        temporaryValue = array[currentIndex];
        array[currentIndex] = array[randomIndex];
        array[randomIndex] = temporaryValue;
    }

    return array;
}

function init() {
    // google direction stuff
    var directionsService = new google.maps.DirectionsService;


    var mapStuff = initDemoMap();
    var map = mapStuff.map;
    var layerControl = mapStuff.layerControl;
    var geoJson = undefined;
    // load data (u, v grids) from somewhere (e.g. https://github.com/danwild/wind-js-server)
    $.getJSON('h2o.json', function (data) {
        geoJson = data;

        navigator.geolocation.getCurrentPosition(function (location) {
            var latlng = new L.LatLng(location.coords.latitude, location.coords.longitude);
            // compute the distance to the current location 
            geoJson.features.forEach(function (b) {
                b.properties.distance = distVincenty(location.coords.latitude, location.coords.longitude,
                    b.geometry.coordinates[1], b.geometry.coordinates[0]);
            });

            // sort by distnace
            var sortByDistance = geoJson.features.sort(function (a, b) { return a.properties.distance - b.properties.distance; })

            // take the first 25 
            var closestPoints = sortByDistance.slice(0, 25);

            // add them to the map
            closestPoints.forEach(function (b) {
                L.marker([b.geometry.coordinates[1], b.geometry.coordinates[0]]).addTo(map);
            });

            // get the closest
            var destination = closestPoints[0].geometry.coordinates;

            // compute direction 
            directionsService.route({
                origin: new google.maps.LatLng(location.coords.latitude, location.coords.longitude),
                destination: new google.maps.LatLng(destination[1], destination[0]),
                travelMode: 'WALKING'
            }, function (response, status) {
                if (status === 'OK') {
                    console.log(response);
                    if(response.routes.length > 0) {
                        var overPolyline = response.routes[0].overview_polyline;
                        var latlngArr = polyline.decode(overPolyline);

                        var firstpolyline = new L.Polyline(latlngArr, {
                            color: 'orange',
                            weight: 3,
                            opacity: 0.5,
                            smoothFactor: 1
                        });
                        firstpolyline.addTo(map);
                    }
                } else {
                    console.log('Directions request failed due to ' + status);
                }

                // add polyline

                var greenIcon = new L.Icon({
                    iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                    iconSize: [25, 41],
                    iconAnchor: [12, 41],
                    popupAnchor: [1, -34],
                    shadowSize: [41, 41]
                });
                L.marker(latlng, { icon: greenIcon }).addTo(map);
                map.setView(latlng, 18);
            });
        }, function () {
            // return hundert random points
            var randomShuffel = shuffle(geoJson.features).slice(0, 25);
            randomShuffel.forEach(function (b) {
                L.marker([b.geometry.coordinates[1], b.geometry.coordinates[0]]).addTo(map);
            });
        });
    });


}
// d



