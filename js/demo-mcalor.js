var map;
var ryg = d3.interpolateRdYlGn;

var host = 'http://sistemic.udea.edu.co',
    port = '4000',
    path = '/data/noiseProvider/';

var url = host + ':' + port + path;
var token = '0a70cb90153806082421599d21d653858de8f3b25da2dc9a1fe1e4e8f36d7373';

// Date Parser and Formater
var utcParse = d3.utcParse("%d/%m/%YT%H:%M:%S");   // example 10/11/2017T21:52:08

var sensors = ["noiseSensor1", "noiseSensor2"];
var count = 0;

// variable to store the sensor's last value
var sensorsData = [];

// number of comunas
var coms = 16;

function initMap() {
    
    var medellin = {lat: 6.25184, lng: -75.56359};

    // Create the Google Map…
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,        
        center: medellin
    });

    getCityData();

}

function DrawOverlay(err, mapData) {
    if(err) throw err;

    // Fix the sensorsData to the mapData
    // Remove this after Fiware online
    for(var i = 0; i < mapData.features.length; i++) {
        mapData.features[i].properties.value = sensorsData[i].value;
    }

    //OverLay
    var overlay = new google.maps.OverlayView(); 
    overlay.onAdd = function () {

        //オーバーレイ設定
        var layer = d3.select(this.getPanes().overlayLayer).append("div").attr("class", "SvgOverlay");
        var svg = layer.append("svg");
        var gunmalayer = svg.append("g").attr("class", "AdminDivisions");
        var markerOverlay = this;
        var overlayProjection = markerOverlay.getProjection();

        //Google Projection作成
        var googleMapProjection = d3.geoTransform({point: function(x, y) {
            d = new google.maps.LatLng(y, x);
            d = overlayProjection.fromLatLngToDivPixel(d);
            this.stream.point(d.x + 4000, d.y + 4000);
        }});

        //パスジェネレーター作成
        var path = d3.geoPath().projection(googleMapProjection);

        var max = d3.max(mapData.features, function(d) { return d.properties.value; }); // value 1 mean the most dangerous
        
        overlay.draw = function () {
        
            //地図描く
            gunmalayer.selectAll("path")
                .data(mapData.features, function(d) { return d.id; })
                .attr("d", path) // for zoom???
                .enter().append("path")
                .attr("class", function(d) { 
                    if(d.properties.value == max) {
                        return "polygon-danger";
                    } else {
                        return "polygon"
                    }
                })
                .attr("d", path)
                .attr("fill", function(d) { return ryg(Math.abs(d.properties.value - 100) / 100); }); 

        };
    };

    //作成したSVGを地図にオーバーレイする
    overlay.setMap(map);

    //せっかくなんでアニメーションとかも付けてみる。
    var anime = Anime();
    setInterval(anime, 1000);

};

function getCityData() {

    // Get the latest observation of every sensor
    for(var i = 0; i < sensors.length; i++) {
        d3.request(url + sensors[i])
            .header('IDENTITY_KEY', token)
            .response(function(xhr) {
                return JSON.parse(xhr.responseText, (key, value) => {
                    if(key == 'timestamp') return utcParse(value);     // return the parsed date
                    else if(key == 'value' && !isNaN(Number(value))) return Number(value);  // return value type Number
                    else return value;  // return value unchanged
                });
            })
            .get(function(responseData) {
                var item = {name: sensors[count++], value: responseData.observations[0].value}
                sensorsData.push(item);
                if(count == sensors.length) generateData();
            });
    }
}

function generateData() {
    for(var i = sensors.length; i < coms; i++) {
        sensors.push("noiseSensor" + (i + 1));
        var item = {name: sensors[i], value: (i - 1) * 7}
        sensorsData.push(item);
    }
    d3.json("data/map.json", DrawOverlay);
}


function Anime() {			
    var flag = true;
    return function() {
        if(flag) {
            d3.select(".polygon-danger").transition().attr("fill", "#FFCC00");
            flag = false;
        } else {
            d3.select(".polygon-danger").transition().attr("fill", ryg(0));
            flag = true;
        }
    }
}