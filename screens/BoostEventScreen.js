import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import CampusPicker from "../components/CampusPicker";
import CountyPicker from "../components/CountyPicker";
import SubCountyPicker from "../components/SubCountyPicker";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme";

const GENDER_OPTIONS = ["Male", "Female", "Other", "Prefer not to say"];
const BOOST_COST_KES = 100; // must match backend/routes/eventBoosts.js

export default function BoostEventScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { event } = route.params;
  const { updateWalletBalance } = useAuth();
  const [targetCampus, setTargetCampus] = useState("");
  const [targetCounty, setTargetCounty] = useState("");
  const [targetSubCounty, setTargetSubCounty] = useState("");
  const [targetGender, setTargetGender] = useState("");
  const [targetAgeMin, setTargetAgeMin] = useState("");
  const [targetAgeMax, setTargetAgeMax] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleBoost() {
    setSubmitting(true);
    try {
      const { data } = await client.post("/event-boosts", {
        eventId: event.id,
        targetCampus: targetCampus || undefined,
        targetCounty: targetCounty || undefined,
        targetSubCounty: targetSubCounty || undefined,
        targetGender: targetGender || undefined,
        targetAgeMin: targetAgeMin || undefined,
        targetAgeMax: targetAgeMax || undefined,
      });
      updateWalletBalance(data.walletBalance);
      Alert.alert("Event boosted!", "Your event is now pinned at the top of the Events list for the next 7 days.");
      navigation.goBack();
    } catch (e) {
      if (e.response?.status === 402) {
        Alert.alert(
          "Insufficient wallet balance",
          `You need KES ${e.response.data.shortfall} more. Top up your wallet first.`,
          [{ text: "Top up now", onPress: () => navigation.navigate("Wallet") }, { text: "Cancel" }]
        );
      } else {
        Alert.alert("Couldn't boost event", e.response?.data?.error || e.message);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.previewCard}>
        <Text style={styles.previewLabel}>Boosting this event</Text>
        <View style={styles.previewRow}>
          {!!event.coverUrl && <Image source={{ uri: event.coverUrl }} style={styles.previewCover} contentFit="cover" />}
          <View style={{ flex: 1 }}>
            <Text style={styles.previewName}>{event.name}</Text>
            {!!event.location && <Text style={styles.previewDesc} numberOfLines={2}>{event.location}</Text>}
          </View>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Target audience (optional)</Text>
      <Text style={styles.hint}>Leave any field blank to target everyone</Text>

      <Text style={styles.label}>Campus / location</Text>
      <CampusPicker value={targetCampus} onChange={setTargetCampus} placeholder="Any campus" />

      <Text style={styles.label}>County</Text>
      <CountyPicker
        value={targetCounty}
        onChange={(c) => { setTargetCounty(c); setTargetSubCounty(""); }}
        placeholder="Any county"
      />

      <Text style={styles.label}>Sub-county</Text>
      <SubCountyPicker county={targetCounty} value={targetSubCounty} onChange={setTargetSubCounty} placeholder="Any sub-county" />

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

      <View style={styles.costBox}>
        <Text style={styles.costText}>Cost: KES {BOOST_COST_KES} for 7 days</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleBoost} disabled={submitting}>
        {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : (
          <Text style={styles.buttonText}>Boost for KES {BOOST_COST_KES}</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  previewCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 20 },
  previewLabel: { color: COLORS.sub, fontSize: 12, fontWeight: "700", marginBottom: 8 },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  previewCover: { width: 48, height: 48, borderRadius: 8, backgroundColor: "#eee" },
  previewName: { color: COLORS.ink, fontSize: 15, fontWeight: "700" },
  previewDesc: { fontSize: 12, color: COLORS.sub, marginTop: 2 },
  sectionTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "700" },
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
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 16 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
});
