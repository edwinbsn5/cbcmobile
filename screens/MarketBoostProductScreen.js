import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import CountyPicker from "../components/CountyPicker";
import SubCountyPicker from "../components/SubCountyPicker";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme";

const BOOST_COST_KES = 100; // must match backend/routes/marketBoosts.js

export default function MarketBoostProductScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { product } = route.params;
  const { updateWalletBalance } = useAuth();
  const [targetCounty, setTargetCounty] = useState("");
  const [targetSubCounty, setTargetSubCounty] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [freeBoostAvailable, setFreeBoostAvailable] = useState(false);

  // Gold-tier Influencer Quest users get one free Market product boost
  // every 30 days (see backend/services/influencerQuest.js's isGoldTier) —
  // the wallet charge is waived server-side automatically; this just
  // decides what to show here.
  useEffect(() => {
    client.get("/influencer-quest/benefits").then((r) => setFreeBoostAvailable(r.data.freeMarketBoostAvailable)).catch(() => {});
  }, []);

  async function handleBoost() {
    setSubmitting(true);
    try {
      const { data } = await client.post("/market-boosts", {
        productId: product.id,
        targetCounty: targetCounty || undefined,
        targetSubCounty: targetSubCounty || undefined,
      });
      updateWalletBalance(data.walletBalance);
      Alert.alert(
        "Listing boosted!",
        data.usedFreeBoost
          ? "Your listing may now appear as a featured pick for the next 7 days — this month's free Gold tier perk."
          : "Your listing may now appear as a featured pick in Browse by Photos/Videos for the next 7 days."
      );
      navigation.goBack();
    } catch (e) {
      if (e.response?.status === 402) {
        Alert.alert(
          "Insufficient wallet balance",
          `You need KES ${e.response.data.shortfall} more. Top up your wallet first.`,
          [{ text: "Top up now", onPress: () => navigation.navigate("Wallet") }, { text: "Cancel" }]
        );
      } else {
        Alert.alert("Couldn't boost listing", e.response?.data?.error || e.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.previewCard}>
        <Text style={styles.previewLabel}>Boosting this listing</Text>
        <View style={styles.previewRow}>
          <Image
            source={{ uri: product.mediaType === "video" ? product.thumbnailUrl : product.photoUrls?.[0] }}
            style={styles.previewMedia}
            contentFit="cover"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.previewTitle} numberOfLines={2}>{product.title}</Text>
            <Text style={styles.previewPrice}>KES {product.priceKES.toLocaleString()}</Text>
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Where should it appear? (optional)</Text>
      <Text style={styles.hint}>Leave blank to appear for buyers everywhere</Text>

      <Text style={styles.label}>County</Text>
      <CountyPicker
        value={targetCounty}
        onChange={(c) => { setTargetCounty(c); setTargetSubCounty(""); }}
        placeholder="Any county"
      />

      <Text style={styles.label}>Sub-county</Text>
      <SubCountyPicker county={targetCounty} value={targetSubCounty} onChange={setTargetSubCounty} placeholder="Any sub-county" />

      {freeBoostAvailable ? (
        <View style={styles.freeBox}>
          <Text style={styles.freeText}>🔵 Free this month — your Gold tier benefit covers this boost for 7 days</Text>
        </View>
      ) : (
        <View style={styles.costBox}>
          <Text style={styles.costText}>Cost: KES {BOOST_COST_KES} for 7 days</Text>
        </View>
      )}
      <Text style={styles.costHint}>Your listing gets a random chance to show as a featured pick at position 2 of Browse by Photos/Videos.</Text>

      <TouchableOpacity style={styles.button} onPress={handleBoost} disabled={submitting}>
        {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : (
          <Text style={styles.buttonText}>{freeBoostAvailable ? "Boost for free" : `Boost for KES ${BOOST_COST_KES}`}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  previewCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 20 },
  previewLabel: { color: COLORS.sub, fontSize: 12, fontWeight: "700", marginBottom: 10 },
  previewRow: { flexDirection: "row", gap: 12, alignItems: "center" },
  previewMedia: { width: 64, height: 64, borderRadius: 8, backgroundColor: "#eee" },
  previewTitle: { fontSize: 14.5, fontWeight: "700", color: COLORS.ink },
  previewPrice: { fontSize: 13, fontWeight: "800", color: COLORS.accent, marginTop: 3 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.ink },
  hint: { color: COLORS.sub, fontSize: 12, marginTop: 4, marginBottom: 16 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 6, marginTop: 12 },
  costBox: { backgroundColor: COLORS.wash, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  costText: { color: COLORS.accent, fontWeight: "700" },
  freeBox: { backgroundColor: "#E6F4EA", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  freeText: { color: "#1E7E34", fontWeight: "700", textAlign: "center" },
  costHint: { color: COLORS.sub, fontSize: 11.5, textAlign: "center", marginTop: 6 },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
});
