import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { openInAppBrowser } from "../utils/inAppBrowser";
import { COLORS } from "../theme";

// Renders an admin-created sponsored ad or a user-paid boosted post — both
// arrive here already reshaped into the same {advertiser, headline,
// imageUrl, cta, targetUrl} shape (see services/adInterleave.js). Real
// Google ads never reach this component — FeedScreen.js intercepts the
// feed's googleAd slot and renders AdMobBanner instead.
export default function AdCard({ ad }) {
  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Text style={styles.sponsored}>Sponsored</Text>
        <Text style={styles.advertiser}>· {ad.advertiser}</Text>
      </View>
      <Image source={{ uri: ad.imageUrl }} style={styles.media} resizeMode="cover" />
      <Text style={styles.headline}>{ad.headline}</Text>
      <TouchableOpacity style={styles.cta} onPress={() => openInAppBrowser(ad.targetUrl)}>
        <Text style={styles.ctaText}>{ad.cta}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginHorizontal: 10, marginVertical: 6, borderWidth: 1, borderColor: COLORS.bg },
  badgeRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  sponsored: { color: COLORS.sub, fontSize: 12, fontWeight: "600" },
  advertiser: { color: COLORS.sub, fontSize: 12, marginLeft: 4 },
  media: { width: "100%", height: 180, borderRadius: 8, backgroundColor: "#eee", marginBottom: 8 },
  headline: { color: COLORS.ink, fontSize: 15, fontWeight: "600", marginBottom: 8 },
  cta: { backgroundColor: COLORS.wash, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  ctaText: { color: COLORS.accent, fontWeight: "700" },
});
