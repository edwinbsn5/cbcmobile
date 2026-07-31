import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from "react-native";
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

  async function handleBoost() {
    setSubmitting(true);
    try {
      const { data } = await client.post("/market-boosts", {
        productId: product.id,
        targetCounty: targetCounty || undefined,
        targetSubCounty: targetSubCounty || undefined,
      });
      updateWalletBalance(data.walletBalance);
      Alert.alert("Listing boosted!", "Your listing may now appear as a featured pick in Browse by Photos/Videos for the next 7 days.");
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
            resizeMode="cover"
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

      <View style={styles.costBox}>
        <Text style={styles.costText}>Cost: KES {BOOST_COST_KES} for 7 days</Text>
        <Text style={styles.costHint}>Your listing gets a random chance to show as a featured pick at position 2 of Browse by Photos/Videos.</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleBoost} disabled={submitting}>
        {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Boost for KES {BOOST_COST_KES}</Text>}
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
  costBox: { backgroundColor: COLORS.wash, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24, gap: 6 },
  costText: { color: COLORS.accent, fontWeight: "700" },
  costHint: { color: COLORS.sub, fontSize: 11.5, textAlign: "center" },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
});
