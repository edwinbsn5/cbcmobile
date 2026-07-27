import { Platform } from "react-native";
import { TestIds } from "react-native-google-mobile-ads";
import client from "../api/client";

// Fetches the admin-configured ad unit IDs once and caches them for the
// rest of the session (mobile/screens/... AdMob usage all goes through
// this, never a direct API call) — falls back to Google's own official
// test unit IDs on any failure or if nothing's been configured yet, so ads
// always render something in every environment. Unlike the App ID (baked
// into the native build, see app.config.js), these genuinely update the
// next time the app is opened after an admin saves new ones — no rebuild.
let cached = null;
let inFlight = null;

async function fetchAdmobConfig() {
  if (cached) return cached;
  if (!inFlight) {
    inFlight = client
      .get("/settings/admob")
      .then(({ data }) => {
        cached = {
          bannerUnitId: (Platform.OS === "ios" ? data.bannerUnitIdIos : data.bannerUnitIdAndroid) || TestIds.BANNER,
          interstitialUnitId: (Platform.OS === "ios" ? data.interstitialUnitIdIos : data.interstitialUnitIdAndroid) || TestIds.INTERSTITIAL,
          rewardedUnitId: (Platform.OS === "ios" ? data.rewardedUnitIdIos : data.rewardedUnitIdAndroid) || TestIds.REWARDED,
        };
        return cached;
      })
      .catch(() => {
        cached = { bannerUnitId: TestIds.BANNER, interstitialUnitId: TestIds.INTERSTITIAL, rewardedUnitId: TestIds.REWARDED };
        return cached;
      });
  }
  return inFlight;
}

export { fetchAdmobConfig };
