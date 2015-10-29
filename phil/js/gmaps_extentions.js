// Copyright (c) Rossen Georgiev <http://rgp.io>
// custom label function

google.maps.Label = function(opt_options) {
    // init default values
    this.set('visible', true);
    this.set('opacity', 1);
    this.set('clickable', false);
    this.set('strokeColor', "#00F");
    this.set('text', "");
    this.set('textOnly', false); // true only text, false text within a box

    this.setValues(opt_options);

    var span = this.span_ = document.createElement('span');
    span.style.cssText = 'position: relative; left: -50%;' +
    'white-space: nowrap; color: #000;-moz-user-select:none;-webkit-user-select:none;-ms-user-select:none;-khtml-user-select:none;';

    span.style.cssText += !this.get('textOnly') ?
        'border: 1px solid '+this.get('strokeColor')+'; border-radius: 5px; ' +
        'top:-12px;font-size:9px;padding: 2px; background-color: white'
        :
        'top:-8px;font-size:12px;font-weight: bold; text-shadow: 2px 0 0 #fff, -2px 0 0 #fff, 0 2px 0 #fff, 0 -2px 0 #fff, 1px 1px #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff;'
        ;

    var div = this.div_ = document.createElement('div');
    div.appendChild(span);
    div.style.cssText = 'position: absolute; display: none;-moz-user-select:none;-webkit-user-select:none;-ms-user-select:none;-khtml-user-select:none;';
};

google.maps.Label.prototype = new google.maps.OverlayView();


// Implement onAdd
google.maps.Label.prototype.onAdd = function() {
  var pane = this.getPanes().overlayImage;
  pane.appendChild(this.div_);

  // redraw if any option is changed
  var ctx = this;
  var callback = function() { ctx.draw(); };
  this.listeners_ = [
    google.maps.event.addListener(this, 'opacity_changed', callback),
    google.maps.event.addListener(this, 'position_changed', callback),
    google.maps.event.addListener(this, 'visible_changed', callback),
    google.maps.event.addListener(this, 'clickable_changed', callback),
    google.maps.event.addListener(this, 'text_changed', callback),
    google.maps.event.addListener(this, 'zindex_changed', callback),
    google.maps.event.addDomListener(this.div_, 'click', function() {
      if (ctx.get('clickable')) {
        google.maps.event.trigger(ctx, 'click');
      }
    })
  ];
};


// Implement onRemove
google.maps.Label.prototype.onRemove = function() {
  this.div_.parentNode.removeChild(this.div_);

  // remove all listeners
  for (var i = 0, j = this.listeners_.length; i < j; i++) {
    google.maps.event.removeListener(this.listeners_[i]);
  }
};


// Implement draw
google.maps.Label.prototype.draw = function() {
  var projection = this.getProjection();
  var position = projection.fromLatLngToDivPixel(this.get('position'));

  var div = this.div_;
  if(position !== null) {
      div.style.left = position.x + 'px';
      div.style.top = position.y + 'px';
  }

  div.style.display = this.get('visible') && this.get('opacity') >= 0.6 ? 'block' : 'none';
  this.span_.style.cursor = this.get('clickable') ? 'pointer' : '';
  div.style.zIndex = this.get('zIndex');
  this.span_.innerHTML = this.get('text').toString();
};

// simple status control
google.maps.StatusTextControl = function(options) {
    this.options = options || {
        text: "",
        map: null,
        position: 0,
        fontSize: "10px",
    };

    this.div_ = document.createElement('div');
    this.div_.style.cssText = "display: none";
    this.div_.innerHTML = "<div style='opacity: 0.7; width: 100%; height: 100%; position: absolute;'>" +
        "<div style='width: 1px;'></div>" +
        "<div style='width: auto; height: 100%; margin-left: 1px; background-color: rgb(245, 245, 245);'></div></div>";

    var div = document.createElement('div');
    div.style.cssText = 'position: relative; padding-right: 6px; padding-left: 6px;' +
      ' font-family: Roboto, Arial, sans-serif; color: rgb(68, 68, 68);' +
      ' white-space: nowrap; direction: ltr; text-align: right;' +
      ' font-size: ' + this.options.fontSize;

    this.span_ = document.createElement('span');
    div.appendChild(this.span_);
    this.div_.appendChild(div);

    // update text
    this.setText(this.options.text);

    // add control
    if(this.options.map)
        this.options.map.controls[options.position].push(this.div_);
};

google.maps.StatusTextControl.prototype.setText = function(text) {
    this.options.text = text;
    this.span_.innerHTML = text;
    this.div_.style.display = (text === "") ? "none" : "block";
};
