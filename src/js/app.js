import $ from 'dom64';
import Techno4, { getDevice } from 'techno4';

// Smart audio synth formatting for circular knobs (RoundRange)
if (Techno4.RoundRange) {
  const origFormat = Techno4.RoundRange.prototype.formatDisplayValue;
  Techno4.RoundRange.prototype.formatDisplayValue = function (val) {
    if (typeof this.params.formatValue === 'function') {
      return this.params.formatValue.call(this, val);
    }
    const unit = this.params.unit || '';
    if (unit === 'Hz') {
      if (val >= 1000) {
        return (val / 1000).toFixed(val >= 10000 ? 0 : 1).replace('.0', '') + 'k';
      }
      return Math.round(val) + 'Hz';
    }
    if (unit === '×' || unit === 'x') {
      const num = Number(val);
      return '×' + (num % 1 === 0 ? num.toFixed(0) : (Math.round(num * 10) % 10 === 0 ? num.toFixed(1) : num.toFixed(2)));
    }
    if (this.params.title === 'Q') {
      const num = Number(val);
      return num % 1 === 0 ? num.toFixed(0) : num.toFixed(1);
    }
    return origFormat.call(this, val);
  };
}

// Import T4 Styles
import 'techno4/css';

// Import Icons and App Custom Styles
import '../css/icons.css';
import '../css/app.css';
// Import Cordova APIs
import cordovaApp from './cordova-app.js';

// Import Routes
import routes from './routes.js';
// Import Store
import store from './store.js';

// Import main app component
import App from '../app.t4';

var device = getDevice();
var app = new Techno4({
  name: 'SUBUNDERGRUND ELECTRONIC', // App name
  theme: 'auto', // Automatic theme detection
  el: '#app', // App root element
  component: App, // App main component
  id: 'org.cocftechno4.SUBUNDERGRUNDELECTRONIC', // App bundle ID
  // App store
  store: store,
  // App routes
  routes: routes,

  // Touch settings: disable activeState and touchRipple to prevent global event hijacking and delay on all clicks/touches
  touch: {
    activeState: false,
    touchRipple: false,
    tapHold: false,
    touchHighlight: false,
  },

  // Input settings
  input: {
    scrollIntoViewOnFocus: device.cordova && !device.electron,
    scrollIntoViewCentered: device.cordova && !device.electron,
  },
  // Cordova Statusbar settings
  statusbar: {
    iosOverlaysWebView: true,
    androidOverlaysWebView: false,
  },
  on: {
    init: function () {
      var t4 = this;
      if (t4.device.cordova) {
        // Init cordova APIs (see cordova-app.js)
        cordovaApp.init(t4);
      }
    },
  },
});