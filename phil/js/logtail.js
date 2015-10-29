/* logtail - Copyright (c) 2012: Daniel Richman. License: GNU GPL 3 */

var dataelem = "#aprs-log";
var pausetoggle = "#pause";
var scrollelems = ["#aprs-box"];

var elementLabel = "#aprs-label";
var elementBox = "#aprs-box";

var url = "aprs/logs/iss.log";
var api_url = /^localhost/.test(window.location.host) ? "http://localhost:9994" : "aprs/api";
var fix_rn = true;
var load = 20 * 1024; /* 5KB */
var poll = 5000; /* 5s */

var kill = false;
var loading = false;
var pause = false;
var reverse = true;
var log_data = "";
var log_size = 0;

function get_log() {
    if (kill | loading | !$(elementLabel).hasClass('active')) return;
    loading = true;

    var range;
    if (log_size === 0)
        /* Get the last 'load' bytes */
        range = "-" + load.toString();
    else
        /* Get the (log_size - 1)th byte, onwards. */
        range = (log_size - 1).toString() + "-";

    /* The "log_size - 1" deliberately reloads the last byte, which we already
     * have. This is to prevent a 416 "Range unsatisfiable" error: a response
     * of length 1 tells us that the file hasn't changed yet. A 416 shows that
     * the file has been trucnated */

    $.ajax(url, {
        dataType: "text",
        cache: false,
        headers: {Range: "bytes=" + range},
        success: function (data, s, xhr) {
            loading = false;

            var size;
            var recv_size;

            if (xhr.status === 206) {
                if (data.length > load)
                    throw "Expected 206 Partial Content (1)";

                var c_r = xhr.getResponseHeader("Content-Range");
                if (!c_r)
                    throw "Server did not respond with a Content-Range";

                size = parseInt(c_r.split("/")[1]);
                recv_size = parseInt(xhr.getResponseHeader("Content-Length"));

                if (isNaN(size))
                    throw "Invalid Content-Range size";
            } else if (xhr.status === 200) {
                if (log_size > 1) {
                    log_size = 0;
                    log_data = "";
                    show_log();
                }

                size = parseInt(xhr.getResponseHeader("Content-Length"));
                recv_size = size;
            }

            var added = false;

            if (log_size === 0) {
                /* Clip leading part-line if not the whole file */
                if (recv_size < size) {
                    var start = data.indexOf("\n");
                    log_data = data.substring(start + 1);
                } else {
                    log_data = data;
                }

                added = true;
            } else {
                /* Drop the first byte (see above) */
                log_data += data.substring(1);

                if (log_data.length > load) {
                    var start = log_data.indexOf("\n", log_data.length - load);
                    log_data = log_data.substring(start + 1);
                }

                if (data.length > 1)
                    added = true;
            }

            log_size = size;
            if (added)
                show_log(added);
            setTimeout(get_log, poll);
        },
        error: function (xhr, s, t) {
            loading = false;

            if (xhr.status === 416 || xhr.status == 404) {
                /* 416: Requested range not satisfiable: log was truncated. */
                /* 404: Retry soon, I guess */

                log_size = 0;
                log_data = "Reloading log…";
                show_log();

                setTimeout(get_log, 800);
            } else {
                if (s == "error")
                    error(xhr.statusText);
                else
                    error("AJAX Error: " + s);
            }
        }
    });
}

function scroll(where) {
    for (var i = 0; i < scrollelems.length; i++) {
        var s = $(scrollelems[i]);
        if (where === -1)
            s.scrollTop(s.height());
        else
            s.scrollTop(where);
    }
}

function show_log() {
    if (pause) return;

    var t = log_data;

    if (reverse) {
        var t_a = t.split(/\n/g);
        t_a.reverse();
        if (t_a[0] === "")
            t_a.shift();
        t = t_a.join("\n");
    }

    if (fix_rn)
        t = t.replace(/\n/g, "\r\n");

    t = t.replace(/^(.*?\) )([a-z0-9\-]+)(>.*?,)([a-z0-9\-]+)(:.*?)$/gmi, function(whole, a,b,c,d,e) {
                return "" +
                       escapehtml(a) +
                       "<a target='_blank' href='http://aprs.fi/info/"+b+"'>"+b+"</a>" +
                       escapehtml(c) +
                       "<a target='_blank' href='http://aprs.fi/info/"+d+"'>"+d+"</a>" +
                       escapehtml(e);
            });
    t = "<span>" + t.replace(/\n/gi, "</span><span>") + "</span>";

    $(dataelem).html(t);
    if (!reverse)
        scroll(-1);
}

function escapehtml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function error(what) {
    kill = true;

    $(dataelem).text("An error occured :-(.\r\n" +
                     "Reloading may help; no promises.\r\n" +
                     what);
    scroll(0);
}

var aprs_markers = {};

function poll_markers() {

    $.ajax({
        type: "GET",
        url: api_url,
        dataType: "json",
        success: function(data) {
            var newobj = {};

            var k;
            for(k in data.result) {
                var v = data.result[k];

                // if a marker already exist reuse it
                if(k in aprs_markers) {
                    newobj[k] = aprs_markers[k];
                }
                else {
                    newobj[k] = new google.maps.Marker({
                        map: map,
                        visible: true,
                        title: k,
                        zIndex: 1,
                    });
                }

                // clean reused markers
                delete aprs_markers[k];

                // update position only if necessary
                if(newobj[k].x_lat !== v[0] || newobj[k].x_lon !== v[1]) {
                    newobj[k].x_lat = v[0];
                    newobj[k].x_lon = v[1];
                    newobj[k].setPosition(new google.maps.LatLng(v[0], v[1]));
                }


                // update icon only if necessary
                if(newobj[k].x_sym !== v[2]) {
                    newobj[k].x_sym = v[2];

                    var url = "img/aprs/symbol_";
                    url += v[2].charCodeAt(0).toString(16);
                    url += v[2].charCodeAt(1).toString(16);
                    url += ".png";

                    newobj[k].setIcon({
                        url: url,
                        size: new google.maps.Size(20,20),
                        anchor: new google.maps.Point(10,10)
                    });
                }
            }

            // what left is to clean unused markers
            for(k in aprs_markers) {
                aprs_markers[k].setMap(null);
            }

            // assign the new marker set
            aprs_markers = newobj;
        },
        error: function() {
            console.error("Error while polling aprs markers");
        },
        complete: function() {
            setTimeout(poll_markers, 10000);
        }
    });
}

$(document).ready(function () {
    $(elementLabel).on('click', function() {
        var pos = '-200px';
        var elm = $(this);

        if(!elm.hasClass('active')) {
            elm.addClass('active');
            $("#aprs-log-box").scrollTop(0);
            pos = '0px';

            get_log();
        } else {
            elm.removeClass('active');
            checkSize();
        }

        $(elementBox).animate({
            'bottom': pos
        }, 300, 'easeOut', function() {
            if(elm.hasClass('active')) {
                checkSize();
            }
        });

    });


    poll_markers();
});
