var cordovaApp = {
  t4: null,
  /*
  This method hides splashscreen after 2 seconds
  */
  handleSplashscreen: function () {
    var t4 = cordovaApp.t4;
    if (!window.navigator.splashscreen || t4.device.electron) return;
    setTimeout(() => {
      window.navigator.splashscreen.hide();
    }, 2000);
  },
  /*
  This method prevents back button tap to exit from app on android.
  In case there is an opened modal it will close that modal instead.
  In case there is a current view with navigation history, it will go back instead.
  */
  handleAndroidBackButton: function () {
    var t4 = cordovaApp.t4;
    const $ = t4.$;
    if (t4.device.electron) return;

    document.addEventListener(
      'backbutton',
      function (e) {
        if ($('.actions-modal.modal-in').length) {
          t4.actions.close('.actions-modal.modal-in');
          e.preventDefault();
          return false;
        }
        if ($('.dialog.modal-in').length) {
          t4.dialog.close('.dialog.modal-in');
          e.preventDefault();
          return false;
        }
        if ($('.sheet-modal.modal-in').length) {
          t4.sheet.close('.sheet-modal.modal-in');
          e.preventDefault();
          return false;
        }
        if ($('.popover.modal-in').length) {
          t4.popover.close('.popover.modal-in');
          e.preventDefault();
          return false;
        }
        if ($('.popup.modal-in').length) {
          if ($('.popup.modal-in>.view').length) {
            const currentView = t4.views.get('.popup.modal-in>.view');
            if (currentView && currentView.router && currentView.router.history.length > 1) {
              currentView.router.back();
              e.preventDefault();
              return false;
            }
          }
          t4.popup.close('.popup.modal-in');
          e.preventDefault();
          return false;
        }
        if ($('.login-screen.modal-in').length) {
          t4.loginScreen.close('.login-screen.modal-in');
          e.preventDefault();
          return false;
        }

        if ($('.page-current .searchbar-enabled').length) {
          t4.searchbar.disable('.page-current .searchbar-enabled');
          e.preventDefault();
          return false;
        }

        if ($('.page-current .card-expandable.card-opened').length) {
          t4.card.close('.page-current .card-expandable.card-opened');
          e.preventDefault();
          return false;
        }

        const currentView = t4.views.current;
        if (currentView && currentView.router && currentView.router.history.length > 1) {
          currentView.router.back();
          e.preventDefault();
          return false;
        }

        if ($('.panel.panel-in').length) {
          t4.panel.close('.panel.panel-in');
          e.preventDefault();
          return false;
        }
      },
      false,
    );
  },
  /*
  This method does the following:
    - provides cross-platform view "shrinking" on keyboard open/close
    - hides keyboard accessory bar for all inputs except where it required
  */
  handleKeyboard: function () {
    var t4 = cordovaApp.t4;
    if (!window.Keyboard || !window.Keyboard.shrinkView || t4.device.electron) return;
    var $ = t4.$;
    window.Keyboard.shrinkView(false);
    window.Keyboard.disableScrollingInShrinkView(true);
    window.Keyboard.hideFormAccessoryBar(true);
    window.addEventListener('keyboardWillShow', () => {
      t4.input.scrollIntoView(document.activeElement, 0, true, true);
    });
    window.addEventListener('keyboardDidShow', () => {
      t4.input.scrollIntoView(document.activeElement, 0, true, true);
    });
    window.addEventListener('keyboardDidHide', () => {
      if (document.activeElement && $(document.activeElement).parents('.messagebar').length) {
        return;
      }
      window.Keyboard.hideFormAccessoryBar(false);
    });
    window.addEventListener('keyboardHeightWillChange', (event) => {
      var keyboardHeight = event.keyboardHeight;
      if (keyboardHeight > 0) {
        // Keyboard is going to be opened
        document.body.style.height = `calc(100% - ${keyboardHeight}px)`;
        $('html').addClass('device-with-keyboard');
      } else {
        // Keyboard is going to be closed
        document.body.style.height = '';
        $('html').removeClass('device-with-keyboard');
      }
    });
    $(document).on(
      'touchstart',
      'input, textarea, select',
      function (e) {
        var nodeName = e.target.nodeName.toLowerCase();
        var type = e.target.type;
        var showForTypes = ['datetime-local', 'time', 'date', 'datetime'];
        if (nodeName === 'select' || showForTypes.indexOf(type) >= 0) {
          window.Keyboard.hideFormAccessoryBar(false);
        } else {
          window.Keyboard.hideFormAccessoryBar(true);
        }
      },
      true,
    );
  },
  init: function (t4) {
    // Save t4 instance
    cordovaApp.t4 = t4;

    document.addEventListener('deviceready', () => {
      // Handle Android back button
      cordovaApp.handleAndroidBackButton();

      // Handle Splash Screen
      cordovaApp.handleSplashscreen();

      // Handle Keyboard
      cordovaApp.handleKeyboard();
    });
  },
};

export default cordovaApp;
