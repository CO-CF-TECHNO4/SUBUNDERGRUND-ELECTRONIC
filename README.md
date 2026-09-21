# SUBUNDERGRUND ELECTRONIC

## Techno4 CLI Опції

Techno4 застосунок згенеровано з наступними опціями:

```
{
  "cwd": "/home/valiwo/_DEVE/SUBUNDERGRUND ELECTRONIC",
  "type": [
    "cordova"
  ],
  "name": "SUBUNDERGRUND ELECTRONIC",
  "pkg": "org.cocftechno4.SUBUNDERGRUNDELECTRONIC",
  "framework": "core",
  "template": "audio-studio",
  "bundler": "vite",
  "cssPreProcessor": false,
  "cordova": {
    "folder": "cordova",
    "platforms": [
      "android",
      "electron"
    ],
    "plugins": [
      "cordova-plugin-statusbar",
      "cordova-plugin-keyboard",
      "cordova-plugin-splashscreen"
    ]
  },
  "theming": {
    "customColor": false,
    "color": "#007aff",
    "darkTheme": false,
    "iconFonts": true,
    "fillBars": false
  },
  "customBuild": false
}
```

## Встановіть залежності
```
npm install
```

## Доступні наступні NPM скрипти

* 🔥 `start` - run development server
* 🔧 `dev` - run development server
* 🔧 `build` - build web app for production
* 📱 `build-cordova` - build cordova app
* 📱 `build-cordova-android` - build cordova Android app
* 📱 `cordova-android` - run dev build cordova Android app
* 🖥 `build-cordova-electron` - build cordova Electron app
* 🖥 `cordova-electron` - run dev build cordova Electron app

## Vite

Проєкт використовує [Vite](https://vitejs.dev) генератор пакунків. Ви маєте працювати лише з файлами з каталогу `/src`. Конфігураційний файл Vite знайдете тут: `vite.config.js`.
## Cordova

Cordova project located in `cordova` folder. You shouldn't modify content of `cordova/www` folder. Its content will be correctly generated when you call `npm run cordova-build-prod`.



## Cordova Electron

There is also cordova Electron platform installed. To learn more about it and Electron check this guides:

* [Cordova Electron Platform Guide](https://cordova.apache.org/docs/en/latest/guide/platforms/electron/index.html)
* [Official Electron Documentation](https://electronjs.org/docs)

## Assets

Assets (icons, splash screens) source images located in `assets-src` folder. To generate your own icons and splash screen images, you will need to replace all assets in this directory with your own images (pay attention to image size and format), and run the following command in the project directory:

```
techno4 assets
```

Or launch UI where you will be able to change icons and splash screens:

```
techno4 assets --ui
```



## Documentation & Resources

* [Techno4 Core Documentation](https://techno4.online/techno4-framework2)
* [Techno4 Icons Reference](https://techno4.online/techno4-framework2/icons)