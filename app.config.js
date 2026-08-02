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
    name: "Tujijenge",
    slug: "socialapp",
    version: "1.1.3",
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
        NSLocationWhenInUseUsageDescription: "Tujijenge uses your location to show you Comrades Nearby on your feed.",
      },
    },
    android: {
      package: "the.campusbiashara.club",
      googleServicesFile: "./google-services.json",
      // Play Store requires a strictly increasing versionCode on every
      // upload; bump this each time you build a new release for the Store
      // (it defaulted to 1 previously since this field was never set).
      versionCode: 7,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#0B1F3A",
      },
      // Android 16 (API 36) no longer allows opting out of edge-to-edge, so
      // this can't stay implicit/false — declaring it explicitly lets the
      // react-native-edge-to-edge config plugin set it up properly (theme,
      // nav bar contrast) instead of Android forcing it on unconfigured.
      edgeToEdgeEnabled: true,
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
      // Google Play requires targeting API 36 (Android 16) and 16KB memory
      // page size support; NDK 27+ is required for 16KB-aligned native libs.
      // newArchEnabled stays false to match the pre-upgrade build — turning
      // it on is a separate, larger migration.
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 36,
            targetSdkVersion: 36,
            buildToolsVersion: "36.0.0",
            ndkVersion: "27.1.12297006",
            newArchEnabled: false,
            // R8/ProGuard: shrinks + obfuscates the release build (smaller
            // APK/AAB, and Play Console wants the resulting mapping.txt for
            // readable crash/ANR stack traces).
            enableProguardInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],
    ],
  },
};
