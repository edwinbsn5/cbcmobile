import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";

const TIER_COLOR = { none: COLORS.sub, blue_provisional: "#1DA1F2", blue: "#1DA1F2", gold_provisional: "#D4A62A", gold: "#D4A62A" };

// Shown on every profile (own or someone else's) right under the stats row —
// see routes/users.js's GET /:id for how `progress` is computed server-side
// (services/influencerQuest.js).
export default function InfluencerQuestCard({ progress }) {
  if (!progress) return null;
  const color = TIER_COLOR[progress.tier] || COLORS.sub;

  return (
    <View style={styles.row}>
      <Ionicons name="trophy-outline" size={14} color={color} />
      <Text style={styles.text}>
        Influencer Quest: <Text style={styles.points}>{progress.points.toLocaleString()} Points</Text>
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  text: { fontSize: 12.5, color: COLORS.sub, fontWeight: "600" },
  points: { color: COLORS.ink, fontWeight: "800" },
});
