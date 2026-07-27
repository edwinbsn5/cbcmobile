// Converted from app.json to a JS config specifically so the AdMob plugin
// below can read an App ID from the environment at build time — an AdMob
// App ID is compiled into the native app (AndroidManifest.xml / Info.plist),
// so it can never be "hot-edited" the way ad unit IDs can (those are fetched
// at runtime instead — see mobile/utils/admobConfig.js). To ship a real App
// ID: set ADMOB_ANDROID_APP_ID / ADMOB_IOS_APP_ID (local .env for a dev
// client, or an EAS secret for a hosted build) and rebuild. Until then this
// falls back to Google's own official test App IDs, so builds work
// out-of-the-box with test ads in any environment.
module.exports = {
  expo: {
    name: "The CBC",
    slug: "socialapp",
    version: "1.0.0",
    owner: "gekonge",
    // Navy-and-gold "Fine Seal" mark (mobile/assets/icon.png) — the native
    // Android launcher icons at android/app/src/main/res/mipmap-*/ were
    // generated from this same source and already reflect it directly; this
    // field only matters if `expo prebuild` regenerates android/ later, so
    // that run doesn't revert to Expo's default icon.
    icon: "./assets/icon.png",
    extra: {
      eas: {
        projectId: "2f817692-4fdd-4ba5-bbc9-b6ad64d4af35",
      },
    },
    orientation: "portrait",
    userInterfaceStyle: "light",
    // Navy, matching the brand palette's primary color (mobile/theme.js), with
    // the Fine Seal mark centered on it (mobile/assets/splash-icon.png) — the
    // native drawable at android/app/src/main/res/drawable/splashscreen.xml
    // already reflects this directly; this field only matters if `expo
    // prebuild` regenerates android/ later. Compiled into the native app —
    // takes effect after a rebuild, not on next JS reload, same caveat as the
    // AdMob App ID above.
    splash: { image: "./assets/splash-icon.png", backgroundColor: "#0B1F3A", resizeMode: "contain" },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "the.campusbiashara.club",
      infoPlist: {
        NSLocationWhenInUseUsageDescription: "The CBC uses your location to show you Comrades Nearby on your feed.",
      },
    },
    android: {
      package: "the.campusbiashara.club",
      googleServicesFile: "./google-services.json",
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0B1F3A",
      },
    },
    plugins: [
      "expo-location",
      "expo-notifications",
      "expo-web-browser",
      [
        "react-native-google-mobile-ads",
        {
          androidAppId: process.env.ADMOB_ANDROID_APP_ID || "ca-app-pub-3940256099942544~3347511713",
          iosAppId: process.env.ADMOB_IOS_APP_ID || "ca-app-pub-3940256099942544~1458002511",
        },
      ],
    ],
  },
};
