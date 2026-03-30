/**
 * withAndroidSplashRoundedCorners.js
 *
 * Android 12+ Splash Screen API uses `windowSplashScreenAnimatedIcon`.
 * When this item is a regular drawable, Android renders it inside a plain circle.
 * When it is an <adaptive-icon>, Android clips it with the device's icon-shape
 * mask (rounded square on every modern device), giving the look seen in Discord,
 * Gmail, etc.
 *
 * This plugin must be listed BEFORE expo-splash-screen in app.json so that
 * expo-splash-screen's handlers run first (LIFO chaining), and ours run after
 * to override the icon reference.
 *
 * What this does:
 *   1. withDangerousMod: creates res/drawable/splashscreen_logo_rounded.xml
 *      as an adaptive-icon (foreground = splash logo, background = splash bg color)
 *   2. withAndroidStyles: patches the parsed styles XML so that
 *      windowSplashScreenAnimatedIcon points to splashscreen_logo_rounded
 */

const { withDangerousMod, withAndroidStyles } = require("@expo/config-plugins");
const path = require("path");
const fs = require("fs");

const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/splashscreen_background"/>
    <foreground android:drawable="@drawable/splashscreen_logo"/>
</adaptive-icon>
`;

const withAndroidSplashRoundedCorners = (config) => {
  // Step 1: write the adaptive-icon drawable via dangerous mod
  config = withDangerousMod(config, [
    "android",
    (modConfig) => {
      const drawableDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "drawable",
      );
      fs.mkdirSync(drawableDir, { recursive: true });
      fs.writeFileSync(
        path.join(drawableDir, "splashscreen_logo_rounded.xml"),
        ADAPTIVE_ICON_XML,
        "utf-8",
      );
      console.log(
        "[withAndroidSplashRoundedCorners] wrote splashscreen_logo_rounded.xml",
      );
      return modConfig;
    },
  ]);

  // Step 2: patch the styles xml2js object so windowSplashScreenAnimatedIcon
  // points to our adaptive-icon.  withAndroidStyles is a base mod (phase 0)
  // so it runs AFTER dangerous mods and is safe to chain via the pipeline.
  // Because this plugin is registered BEFORE expo-splash-screen in app.json,
  // expo-splash-screen's withAndroidStyles handler runs first (sets the icon),
  // then ours runs and overrides it to the rounded version.
  config = withAndroidStyles(config, (config) => {
    const styles = config.modResults;
    const splashStyle = styles.resources.style?.find(
      (s) => s.$.name === "Theme.App.SplashScreen",
    );
    if (splashStyle) {
      const iconItem = splashStyle.item?.find(
        (i) => i.$.name === "windowSplashScreenAnimatedIcon",
      );
      if (iconItem) {
        iconItem._ = "@drawable/splashscreen_logo_rounded";
        console.log(
          "[withAndroidSplashRoundedCorners] patched windowSplashScreenAnimatedIcon",
        );
      }
    }
    return config;
  });

  return config;
};

module.exports = withAndroidSplashRoundedCorners;
