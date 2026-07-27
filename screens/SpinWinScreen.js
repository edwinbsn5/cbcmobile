import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme";

// Must match backend/data/spinStages.js's prizeKES values, in the same order.
const PRIZES = [100, 200, 500, 1000, 5000, 10000];

export default function SpinWinScreen({ navigation }) {
  const { updateWalletBalance } = useAuth();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const timeoutRef = useRef(null);

  async function load() {
    const { data } = await client.get("/spin/status");
    setStatus(data);
  }

  useEffect(() => {
    return () => clearTimeout(timeoutRef.current);
  }, []);

  // Refetches every time this screen gains focus, not just on mount, so the
  // coin balance is current when navigating back from WatchAd having just
  // earned coins — without this, the old balance would stick around until
  // the app was fully restarted.
  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [])
  );

  async function handleSpin() {
    setSpinning(true);
    let delay = 80;
    const cycle = () => {
      setHighlightIndex((i) => (i + 1 + PRIZES.length) % PRIZES.length);
      delay += 15;
      timeoutRef.current = setTimeout(cycle, delay);
    };
    cycle();

    try {
      const { data } = await client.post("/spin");
      // Let the reel keep cycling briefly for suspense before landing on
      // the server-determined result — the animation never decides the
      // outcome, it just reveals it.
      setTimeout(() => {
        clearTimeout(timeoutRef.current);
        const resultIndex = PRIZES.indexOf(data.prizeAmount);
        // A losing spin doesn't land on any chip — every chip shown is a
        // real winnable amount, so resting on one would misleadingly
        // suggest it was won.
        setHighlightIndex(resultIndex);
        setSpinning(false);
        setStatus((prev) => ({ ...prev, coins: data.coins, spinsToday: data.spinsToday, canSpin: data.spinsToday < data.maxSpinsPerDay && data.coins >= 10 }));
        if (data.prizeAmount > 0) {
          updateWalletBalance(data.walletBalance);
          Alert.alert("JACKPOT! You won!", `KES ${data.prizeAmount.toLocaleString()} has been added to your wallet.`);
        } else {
          Alert.alert("No luck this time", "Keep spinning — every spin is a chance at the jackpot!");
        }
      }, 1200);
    } catch (e) {
      clearTimeout(timeoutRef.current);
      setSpinning(false);
      if (e.response?.status === 402) {
        Alert.alert("Not enough coins", e.response.data.error, [
          { text: "Watch an ad", onPress: () => navigation.navigate("WatchAd") },
          { text: "OK", style: "cancel" },
        ]);
      } else {
        Alert.alert("Couldn't spin", e.response?.data?.error || e.message);
      }
      load();
    }
  }

  if (loading || !status) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const spinsLeft = status.maxSpinsPerDay - status.spinsToday;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <Text style={styles.title}>Tap & Win</Text>
      <Text style={styles.subtitle}>Every spin costs 10 coins · up to 10 spins a day</Text>

      <View style={styles.statsRow}>
        <View style={styles.statChip}>
          <Ionicons name="logo-bitcoin" size={14} color={COLORS.accent} />
          <Text style={styles.statChipText}>{status.coins} coins</Text>
        </View>
        <View style={styles.statChip}>
          <Ionicons name="refresh-outline" size={14} color={COLORS.accent} />
          <Text style={styles.statChipText}>{spinsLeft} spins left today</Text>
        </View>
      </View>

      <View style={styles.reel}>
        {PRIZES.map((p, i) => (
          <View key={p} style={[styles.chip, i === highlightIndex && styles.chipActive]}>
            <Text style={[styles.chipText, i === highlightIndex && styles.chipTextActive]}>KES {p.toLocaleString()}</Text>
          </View>
        ))}
      </View>

      {status.canSpin ? (
        <TouchableOpacity style={styles.spinButton} onPress={handleSpin} disabled={spinning}>
          {spinning ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.spinButtonText}>TAP</Text>}
        </TouchableOpacity>
      ) : (
        <View style={styles.cooldownBox}>
          <Text style={styles.cooldownText}>
            {spinsLeft <= 0
              ? "You've used all your spins for today. Come back tomorrow!"
              : "Not enough coins to spin — earn more below."}
          </Text>
        </View>
      )}

      <View style={styles.actionsCol}>
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonHalf]} onPress={() => navigation.navigate("RecentWinners")}>
            <Ionicons name="trophy-outline" size={18} color={COLORS.accent} />
            <Text style={styles.actionButtonText}>Recent Winners</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionButton, styles.actionButtonHalf]} onPress={() => navigation.navigate("CoinBalance")}>
            <Ionicons name="logo-bitcoin" size={18} color={COLORS.accent} />
            <Text style={styles.actionButtonText}>My Coin Balance</Text>
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("WatchAd")}>
          <Ionicons name="play-circle-outline" size={18} color={COLORS.accent} />
          <Text style={styles.actionButtonText}>Watch Video Ads & Earn 10 Coins</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.sub} />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface },
  contentContainer: { padding: 24, paddingTop: 0, alignItems: "center" },
  title: { fontSize: 26, fontWeight: "800", color: COLORS.accent },
  subtitle: { color: COLORS.sub, marginTop: 6, marginBottom: 16, fontSize: 13, textAlign: "center" },
  statsRow: { flexDirection: "row", gap: 10, marginBottom: 20 },
  statChip: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.bg,
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7,
  },
  statChipText: { fontSize: 12.5, fontWeight: "700", color: COLORS.accent },
  reel: { flexDirection: "row", flexWrap: "wrap", justifyContent: "center", marginBottom: 28 },
  chip: { borderWidth: 2, borderColor: COLORS.border, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 14, margin: 6, minWidth: 84, alignItems: "center" },
  chipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.wash },
  chipText: { fontSize: 15, fontWeight: "700", color: COLORS.sub },
  chipTextActive: { color: COLORS.accent },
  spinButton: { backgroundColor: COLORS.accent, borderRadius: 100, width: 120, height: 120, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  spinButtonText: { color: COLORS.accentInk, fontWeight: "800", fontSize: 19 },
  cooldownBox: { backgroundColor: COLORS.bg, borderRadius: 12, padding: 18, alignItems: "center", width: "100%" },
  cooldownText: { color: COLORS.sub, fontWeight: "600", textAlign: "center" },
  actionsCol: { width: "100%", marginTop: 24, gap: 10 },
  actionsRow: { flexDirection: "row", gap: 10 },
  actionButton: {
    flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.bg,
    borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16,
  },
  actionButtonHalf: { flex: 1, paddingHorizontal: 10 },
  actionButtonText: { flex: 1, fontSize: 14.5, fontWeight: "700", color: COLORS.ink },
});
