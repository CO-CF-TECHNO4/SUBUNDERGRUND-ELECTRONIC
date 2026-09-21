import $ from 'dom64';
import Techno4, { getDevice } from 'techno4';

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