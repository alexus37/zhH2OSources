
function initDemoMap(){

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
        layers: [ Esri_DarkGreyCanvas ]
    });

    var layerControl = L.control.layers(baseLayers);
    layerControl.addTo(map);
    map.setView([47.40, 8.5353], 15);

    return {
        map: map,
        layerControl: layerControl
    };
}

// demo map
var mapStuff = initDemoMap();
var map = mapStuff.map;
var layerControl = mapStuff.layerControl;


// load data (u, v grids) from somewhere (e.g. https://github.com/danwild/wind-js-server)
$.getJSON('h2o.json', function (data) {
    data.features.forEach(function(b){
        L.marker([b.geometry.coordinates[1], b.geometry.coordinates[0]]).addTo(map);
    })
});


navigator.geolocation.getCurrentPosition(function(location) {
    var latlng = new L.LatLng(location.coords.latitude, location.coords.longitude);
    var greenIcon = new L.Icon({
        iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
    L.marker(latlng, {icon: greenIcon}).addTo(map);
    map.setView(latlng, 18);
});
