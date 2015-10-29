// Copyright (c) Rossen Georgiev <http://rgp.io>
// easeOut animation
$.easing.easeOut=function(x,t,b,c,d){return c*(t/=d)*t+b;};

var DEG_TO_RAD = Math.PI / 180.0;
var EARTH_RADIUS = 6371000.0;

var computeRadiusForDegreesOverHorizon = function(alt, deg) {
      var elva = deg * DEG_TO_RAD;
      var slant = EARTH_RADIUS * (Math.cos(Math.PI/2+elva)+Math.sqrt(Math.pow(Math.cos(Math.PI/2+elva),2)+alt*(2*EARTH_RADIUS+alt)/Math.pow(EARTH_RADIUS,2)));
      var meters = Math.acos((Math.pow(EARTH_RADIUS,2)+Math.pow(EARTH_RADIUS+alt,2)-Math.pow(slant,2))/(2*EARTH_RADIUS*(EARTH_RADIUS+alt)))*EARTH_RADIUS;

      return Math.round(meters);
};

var twoZeroPad = function(n) {
    n = String(n);
    return (n.length<2) ? '0'+n : n;
};
// updates timebox
var updateTimebox = function(date) {
    var elm = $("#timebox");
    var a,b,c,d,e,f,g,z;

    a = date.getUTCFullYear();
    b = twoZeroPad(date.getUTCMonth()+1); // months 0-11
    c = twoZeroPad(date.getUTCDate());
    e = twoZeroPad(date.getUTCHours());
    f = twoZeroPad(date.getUTCMinutes());
    g = twoZeroPad(date.getUTCSeconds());

    elm.find(".current").text("UTC: "+a+'-'+b+'-'+c+' '+e+':'+f+':'+g);

    a = date.getFullYear();
    b = twoZeroPad(date.getMonth()+1); // months 0-11
    c = twoZeroPad(date.getDate());
    e = twoZeroPad(date.getHours());
    f = twoZeroPad(date.getMinutes());
    g = twoZeroPad(date.getSeconds());
    z = date.getTimezoneOffset() / -60;

    elm.find(".local").text("Local: "+a+'-'+b+'-'+c+' '+e+':'+f+':'+g+" "+((z<0)?"-":"+")+z);
};
// refresh timebox
setInterval(function() {
    updateTimebox(new Date());
}, 1000);

function roundNumber(number, digits) {
  var multiple = Math.pow(10, digits);
  var rndedNum = Math.round(number * multiple) / multiple;
  return rndedNum;
}

// animate timebox and lookangles in

var elm = $("#timebox");

var origW = elm.width();
var iconW = elm.find("svg").width();

// prep for animation
$(".slickbox.animate").css({width:iconW}).find("span").hide();

// animate timebox
elm.fadeIn(500,"easeOut").animate({width:origW},400,"easeOut", function() {
  $("#timebox span").fadeIn(500, "easeOut");
});

/*
// animate lookanglesbox, delayed start by 300ms
$("#lookanglesbox").delay(200).fadeIn(500,"easeOut").animate({width:origW},400,"easeOut", function() {
  if(GPS_ts === null) {
      $("#lookanglesbox .nopos").fadeIn(500, "easeOut");
  } else if($("#lookanglesbox span:first").is(":hidden")) {
      $("#lookanglesbox .nofollow").fadeIn(500, "easeOut");
  }
});
*/

var updateCard = function(idx) {
    var elm = $(".card.sat"+idx);

    if(elm.length === 0) {
        $("#cardholder").append('<div class="card noselect sat'+idx+'" data-idx="'+idx+'"></div>');
        elm = $(".card.sat"+idx);
    }

    var sat = sats[idx];

    var text = "";

    text += "<h5>" + sat.tle.name + "</h5><hr />";
    text += "<span><b>Latitude: </b>" + roundNumber(sat.orbit.getLatLng().lat(), 6) + "</h5>";
    text += "<span><b>Longitude: </b>" + roundNumber(sat.orbit.getLatLng().lng(), 6) + "</h5>";
    text += "<span><b>Altitude: </b>" + roundNumber(sat.orbit.getAltitude(), 2) + " km</h5>";
    text += "<span><b>Speed: </b>" + roundNumber(sat.orbit.getVelocity(), 4) + " km/s</h5>";
    text += "<span><b>Period: </b>" + roundNumber(sat.orbit.getPeriod() * 0.01666666666666666666666666, 2) + " min</h5>";

    elm.html(text);
    
    $("#iss-alt").text(roundNumber(sat.orbit.getAltitude(), 1));
};

var followSatIdx = null;

var followSat = function(idx) {
    $('.card.follow').removeClass('follow');

    followSatIdx = idx;

    if(idx !== null || sats[idx] !== undefined)  {
        $('.card.sat'+idx).addClass('follow');
        setMapCenter(sats[idx].marker.getPosition());
    }
};

$('#cardholder').on('click', '.card', function(event) {
    followSat(parseInt($(event.currentTarget).attr('data-idx')));
});

var center_offset_x = -102.5;
var center_offset_y = 0;

var setMapCenter = function(pos) {
    setOffsetMapCenter(pos, center_offset_x, center_offset_y);
};

var setOffsetMapCenter = function(pos, offset_x, offset_y) {
    offset = (typeof offset === "number") ? offset : 0;

    var p = map.getProjection();
    var point = p.fromLatLngToPoint(pos);
    point.x -= offset_x / Math.pow(2, map.getZoom());
    point.y -= offset_y / Math.pow(2, map.getZoom());
    map.panTo(p.fromPointToLatLng(point));
};

var checkSize = function() {
    if($('#aprs-label').hasClass('active')) {
        $('#map').height($('body').height() - $('#aprs-box').height());
    }
    else {
        $('#map').height($(window).height());
    }

    $('#cardholder').height($('#map').height() - 40);

    google.maps.event.trigger(map, 'resize');
};

window.onresize = checkSize;

var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 2,
    center: new google.maps.LatLng(50,0),
    mapTypeId: google.maps.MapTypeId.SATELLITE,
    keyboardShortcuts: false,
    streetViewControl: false,
    rotateControl: false,
    panControl: false,
    scaleControl: false,
    zoomControl: false,
    zoomControlOptions: {
        style: google.maps.ZoomControlStyle.DEFAULT
    },
    scrollwheel: false
});

checkSize();

google.maps.event.addListener(map, 'dragstart', function() { followSat(null); });

layers_clouds = new google.maps.weather.CloudLayer();
layers_clouds.setMap(map);

nite.init(map);

var sun_marker = new google.maps.Marker({
    map: map,
    position: nite.getSunPosition(),
    title: "Sol",
    icon: {
        url: "img/icon_sun.png",
        size: new google.maps.Size(30,30),
        scaledSize: new google.maps.Size(30,30),
        anchor: new google.maps.Point(15,15),
    }
});

setInterval(function() {
    nite.refresh();
    sun_marker.setPosition(nite.getSunPosition());
}, 60000); // 1min

var stations;
var sats = [];


$.get("tle/custom.txt", function(data) {
    stations = orbits.util.parseTLE(data);

    var hash = window.location.hash.toLowerCase();
    var match = /^#!(.*)$/.exec(hash);

    var i = 0;
    for(;i < stations.length; i++) {
        var name = stations[i].name;

        if(match && name.toLowerCase() !== match[1]) continue;

        var satOpts = {
            map: map,
            tle: stations[i],
            pathLength: 2,
            horizonOpts: {
                fillOpacity: 0.1,
                strokeOpacity: 0.7,
                clickable: false,
                strokeWeight: 3,
            },
            polylineOpts: {
                icons: [{
                    icon: {
                        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                        scale: 1.6,
                        stokeOpacity: 1,
                    },
                    offset: '0',
                    repeat: '120px',

                }],
            }
        };

        if(name == "ISS (ZARYA)") {
            satOpts.markerOpts = {
                icon: {
                    url: "img/iss.png",
                    size: new google.maps.Size(95,73),
                    scaledSize: new google.maps.Size(95,73),
                    anchor: new google.maps.Point(43,43),
                },
            };
            satOpts.horizonOpts.strokeColor = "lime";
            satOpts.horizonOpts.fillColor = "white";

            satOpts.polylineOpts.strokeWeight = 2;
            satOpts.polylineOpts.strokeColor = "white";
            satOpts.polylineOpts.strokeOpacity = 0.8;

            satOpts.shadowPolylinesOpts = {
                strokeColor: "white"
            };
        } else {
            continue;
        }

        var sat = new orbits.Satellite(satOpts);        

        sat.refresh();
        sat.refresh_path();
        sats.push(sat);
    }

    if(sats.length) {
        updateCard(0);
        //followSat(0);
    }

    // refresh satellite position every 600ms
    setInterval(function() {
        var i = 0;
        for(;i < sats.length; i++) {
            updateCard(i);
            sats[i].refresh();

            //if(followSatIdx === i) setMapCenter(sats[i].marker.getPosition());
        }
    }, 1000);

    // refresh orbit path every 5min
    setInterval(function() {
        var i = 0;
        for(;i < sats.length; i++) {
            sats[i].refresh_path();
        }
    }, 5*60000);
});

