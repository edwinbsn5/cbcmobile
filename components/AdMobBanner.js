import React, { useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import { BannerAd, BannerAdSize } from "react-native-google-mobile-ads";
import { fetchAdmobConfig } from "../utils/admobConfig";

// Renders in the feed's "googleAd" slot (see services/feedComposer.js) — a
// real AdMob banner, not an admin-entered db.ads row like every other ad
// slot. Waits for the unit ID fetch before mounting BannerAd since the SDK
// needs a real unit id up front, not a default/placeholder swap-in later.
export default function AdMobBanner() {
  const [unitId, setUnitId] = useState(null);

  useEffect(() => {
    let mounted = true;
    fetchAdmobConfig().then((cfg) => {
      if (mounted) setUnitId(cfg.bannerUnitId);
    });
    return () => {
      mounted = false;
    };
  }, []);

  if (!unitId) return null;

  return (
    <View style={styles.wrap}>
      <BannerAd unitId={unitId} size={BannerAdSize.MEDIUM_RECTANGLE} onAdFailedToLoad={() => {}} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", marginVertical: 10 },
});
