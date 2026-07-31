import { RewardedAd, RewardedAdEventType } from "react-native-google-mobile-ads";
import { fetchAdmobConfig } from "./admobConfig";

let rewarded = null;
let isLoaded = false;

// Loads one rewarded ad and resolves true/false once we actually know
// whether it's ready to show — mirrors utils/interstitialAds.js exactly.
// Call showRewardedAd() only after this resolves true.
async function loadRewardedAd() {
  const { rewardedUnitId } = await fetchAdmobConfig();
  return new Promise((resolve) => {
    rewarded = RewardedAd.createForAdRequest(rewardedUnitId);
    isLoaded = false;

    const unsubscribeLoaded = rewarded.addAdEventListener(RewardedAdEventType.LOADED, () => {
      isLoaded = true;
      unsubscribeLoaded();
      resolve(true);
    });
    const unsubscribeError = rewarded.addAdEventListener(RewardedAdEventType.ERROR, () => {
      unsubscribeError();
      resolve(false);
    });

    rewarded.load();
  });
}

// onEarned fires only once the SDK confirms the user actually watched
// through to the reward point (RewardedAdEventType.EARNED_REWARD) — never
// on a mere close/skip, so points are only ever awarded for a real watch.
function showRewardedAd(onEarned) {
  if (!rewarded || !isLoaded) return false;
  const unsubscribeEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
    unsubscribeEarned();
    onEarned?.();
  });
  isLoaded = false;
  rewarded.show();
  return true;
}

export { loadRewardedAd, showRewardedAd };
