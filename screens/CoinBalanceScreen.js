import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

const EARN_RULES = [
  { icon: "log-in-outline", label: "Come online (once a day)", coins: 1 },
  { icon: "heart-outline", label: "Like content", coins: 2 },
  { icon: "create-outline", label: "Make a post", coins: 3 },
  { icon: "person-add-outline", label: "Follow another user", coins: 4 },
  { icon: "videocam-outline", label: "Post a video", coins: 5 },
  { icon: "play-circle-outline", label: "Watch a video ad", coins: 10 },
];

export default function CoinBalanceScreen() {
  const [coins, setCoins] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/coins/balance").then((r) => setCoins(r.data.coins)).finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20 }}>
      <View style={styles.balanceCard}>
        <Ionicons name="logo-bitcoin" size={32} color={COLORS.accent} />
        <Text style={styles.balanceValue}>{coins}</Text>
        <Text style={styles.balanceLabel}>coins</Text>
        <Text style={styles.balanceHint}>Every Tap & Win spin costs 10 coins</Text>
      </View>

      <Text style={styles.sectionTitle}>How to earn more coins</Text>
      <View style={styles.rulesCard}>
        {EARN_RULES.map((rule, i) => (
          <View key={rule.label} style={[styles.ruleRow, i === EARN_RULES.length - 1 && { borderBottomWidth: 0 }]}>
            <Ionicons name={rule.icon} size={18} color={COLORS.accent} style={{ width: 24 }} />
            <Text style={styles.ruleLabel}>{rule.label}</Text>
            <Text style={styles.ruleCoins}>+{rule.coins}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  balanceCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 24, alignItems: "center", marginBottom: 20 },
  balanceValue: { fontSize: 36, fontWeight: "800", color: COLORS.ink, marginTop: 8 },
  balanceLabel: { color: COLORS.sub, fontSize: 13, marginTop: -2 },
  balanceHint: { color: COLORS.sub, fontSize: 12, marginTop: 10, textAlign: "center" },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10, color: COLORS.ink },
  rulesCard: { backgroundColor: COLORS.surface, borderRadius: 12 },
  ruleRow: {
    flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16,
    borderBottomWidth: 1, borderBottomColor: COLORS.bg,
  },
  ruleLabel: { flex: 1, fontSize: 14, color: COLORS.ink, marginLeft: 4 },
  ruleCoins: { fontWeight: "800", color: COLORS.accent, fontSize: 14 },
});
