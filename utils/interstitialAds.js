import { InterstitialAd, AdEventType } from "react-native-google-mobile-ads";
import { fetchAdmobConfig } from "./admobConfig";

let interstitial = null;
let isLoaded = false;

// Loads one interstitial ad and resolves true/false once we actually know
// whether it's ready to show — not a blind "wait a bit and hope" delay.
// Call showInterstitialAd() only after this resolves true.
async function loadInterstitial() {
  const { interstitialUnitId } = await fetchAdmobConfig();
  return new Promise((resolve) => {
    interstitial = InterstitialAd.createForAdRequest(interstitialUnitId);
    isLoaded = false;

    const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
      isLoaded = true;
      unsubscribeLoaded();
      resolve(true);
    });
    const unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
      unsubscribeError();
      resolve(false);
    });
    interstitial.addAdEventListener(AdEventType.CLOSED, () => {
      isLoaded = false;
    });

    interstitial.load();
  });
}

function showInterstitialAd() {
  if (interstitial && isLoaded) {
    interstitial.show();
  }
}

export { loadInterstitial, showInterstitialAd };
