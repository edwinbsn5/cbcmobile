import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import CampusPicker from "../components/CampusPicker";
import CountyPicker from "../components/CountyPicker";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const BOOST_COST_KES = 100; // must match backend/routes/boosts.js

export default function BoostPostScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { post } = route.params;
  const { updateWalletBalance } = useAuth();
  const [targetCampus, setTargetCampus] = useState("");
  const [targetCounty, setTargetCounty] = useState("");
  const [targetGender, setTargetGender] = useState("");
  const [targetAgeMin, setTargetAgeMin] = useState("");
  const [targetAgeMax, setTargetAgeMax] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [freeBoostAvailable, setFreeBoostAvailable] = useState(false);

  // Student Leaders get one free post boost every 30 days (see
  // backend/services/studentLeaderBenefits.js) — the wallet charge is
  // waived server-side automatically; this just decides what to show here.
  useEffect(() => {
    client.get("/student-leaders/benefits").then((r) => setFreeBoostAvailable(r.data.freePostBoostAvailable)).catch(() => {});
  }, []);

  async function handleBoost() {
    setSubmitting(true);
    try {
      const { data } = await client.post("/boosts", {
        postId: post.id,
        targetCampus: targetCampus || undefined,
        targetCounty: targetCounty || undefined,
        targetGender: targetGender || undefined,
        targetAgeMin: targetAgeMin || undefined,
        targetAgeMax: targetAgeMax || undefined,
      });
      updateWalletBalance(data.walletBalance);
      Alert.alert(
        "Post boosted!",
        data.usedFreeBoost
          ? "Your post is now live as a sponsored post for the next 7 days — this month's free Student Leader boost."
          : "Your post is now live as a sponsored post for the next 7 days."
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
        Alert.alert("Couldn't boost post", e.response?.data?.error || e.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.previewCard}>
        <Text style={styles.previewLabel}>Boosting this post</Text>
        {!!post.content && <Text style={styles.previewContent} numberOfLines={3}>{post.content}</Text>}
        {post.mediaUrl && <Image source={{ uri: post.mediaUrl }} style={styles.previewMedia} resizeMode="cover" />}
        {post.photoUrls?.length > 1 && (
          <Text style={styles.photoCountBadge}>+{post.photoUrls.length - 1} more photo{post.photoUrls.length - 1 === 1 ? "" : "s"}</Text>
        )}
      </View>

      <Text style={styles.sectionTitle}>Target audience (optional)</Text>
      <Text style={styles.hint}>Leave any field blank to target everyone</Text>

      <Text style={styles.label}>Campus / location</Text>
      <CampusPicker value={targetCampus} onChange={setTargetCampus} placeholder="Any campus" />

      <Text style={styles.label}>County</Text>
      <CountyPicker value={targetCounty} onChange={setTargetCounty} placeholder="Any county" />

      <Text style={styles.label}>Gender</Text>
      <View style={styles.chipRow}>
        {GENDER_OPTIONS.map((g) => (
          <TouchableOpacity
            key={g}
            style={[styles.chip, targetGender === g && styles.chipActive]}
            onPress={() => setTargetGender(targetGender === g ? "" : g)}
          >
            <Text style={[styles.chipText, targetGender === g && styles.chipTextActive]}>{g}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Min age</Text>
      <TextInput style={styles.input} value={targetAgeMin} onChangeText={setTargetAgeMin} placeholder="Any" keyboardType="number-pad" />

      <Text style={styles.label}>Max age</Text>
      <TextInput style={styles.input} value={targetAgeMax} onChangeText={setTargetAgeMax} placeholder="Any" keyboardType="number-pad" />

      {freeBoostAvailable ? (
        <View style={styles.freeBox}>
          <Text style={styles.freeText}>🔵 Free this month — your Student Leader benefit covers this boost for 7 days</Text>
        </View>
      ) : (
        <View style={styles.costBox}>
          <Text style={styles.costText}>Cost: KES {BOOST_COST_KES} for 7 days</Text>
        </View>
      )}

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
  previewLabel: { color: COLORS.sub, fontSize: 12, fontWeight: "700", marginBottom: 8 },
  previewContent: { fontSize: 15 },
  previewMedia: { width: "100%", height: 160, borderRadius: 8, marginTop: 8, backgroundColor: "#eee" },
  photoCountBadge: { color: COLORS.accent, fontSize: 11.5, fontWeight: "700", marginTop: 6 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
  hint: { color: COLORS.sub, fontSize: 12, marginTop: 4, marginBottom: 16 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 6, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, backgroundColor: COLORS.surface, color: COLORS.ink },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8, backgroundColor: COLORS.surface },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.ink, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: COLORS.accentInk },
  costBox: { backgroundColor: COLORS.wash, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  costText: { color: COLORS.accent, fontWeight: "700" },
  freeBox: { backgroundColor: "#E6F4EA", borderRadius: 8, padding: 14, alignItems: "center", marginTop: 24 },
  freeText: { color: "#1E7E34", fontWeight: "700", textAlign: "center" },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
});
