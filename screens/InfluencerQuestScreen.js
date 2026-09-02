import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { loadRewardedAd, showRewardedAd } from "../utils/rewardedAds";
import { COLORS } from "../theme";

const TIER_LABEL = { none: "Not verified yet", blue_provisional: "Blue (provisional)", blue: "Blue — verified", gold_provisional: "Gold (provisional)", gold: "Gold — verified" };
const TIER_COLOR = { none: COLORS.sub, blue_provisional: "#1DA1F2", blue: "#1DA1F2", gold_provisional: "#D4A62A", gold: "#D4A62A" };

const POINT_SOURCES = [
  { icon: "radio-outline", label: "Being online", points: "+1 / day" },
  { icon: "heart-outline", label: "Liking a post", points: "+2" },
  { icon: "flash-outline", label: "Reacting (love, haha, wow...)", points: "+4" },
  { icon: "create-outline", label: "Posting or sharing a reel", points: "+3" },
  { icon: "person-add-outline", label: "Gaining a new follower", points: "+5" },
  { icon: "play-circle-outline", label: "Watching a rewarded ad", points: "+7" },
  { icon: "rocket-outline", label: "Boosting a post, Page, group, event, or listing", points: "+100" },
  { icon: "ribbon-outline", label: "Getting access to Investment Groups or The PLAN", points: "+100" },
];

export default function InfluencerQuestScreen({ navigation }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [watchingAd, setWatchingAd] = useState(false);

  const load = useCallback(() => {
    client.get("/influencer-quest/me").then((r) => setProgress(r.data))
      .catch((e) => Alert.alert("Couldn't load progress", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleWatchAd() {
    setWatchingAd(true);
    try {
      const ready = await loadRewardedAd();
      if (!ready) {
        Alert.alert("No ad available", "Couldn't load a rewarded ad right now — try again in a bit.");
        return;
      }
      const started = showRewardedAd(async () => {
        try {
          const { data } = await client.post("/influencer-quest/watch-ad");
          setProgress(data);
          Alert.alert("+7 points!", "Thanks for watching — your points have been updated.");
        } catch (e) {
          Alert.alert("Couldn't record points", e.response?.data?.error || e.message);
        }
      });
      if (!started) {
        Alert.alert("No ad available", "Couldn't load a rewarded ad right now — try again in a bit.");
      }
    } finally {
      setWatchingAd(false);
    }
  }

  const tier = progress?.tier || "none";
  const daysLeft = progress ? Math.max(0, Math.ceil((progress.periodEndsAt - Date.now()) / (24 * 60 * 60 * 1000))) : null;
  const pct = progress?.target ? Math.min(100, (progress.points / progress.target) * 100) : 100;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.hero}>
        <Text style={styles.heroBadge}>✦ Influencer Quest ✦</Text>
        <Text style={styles.heroTitle}>Earn Your Tick.</Text>
        <Text style={styles.heroSubtitle}>Rack up points from everyday activity — unlock a verified Blue or Gold tick on Tujijenge.</Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginVertical: 20 }} color={COLORS.accent} />
      ) : (
        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <View>
              <Text style={styles.pointsValue}>{progress.points.toLocaleString()}</Text>
              <Text style={styles.pointsLabel}>points this period</Text>
            </View>
            <View style={[styles.tierChip, { backgroundColor: TIER_COLOR[tier] + "22" }]}>
              <Ionicons name="checkmark-circle" size={14} color={TIER_COLOR[tier]} />
              <Text style={[styles.tierChipText, { color: TIER_COLOR[tier] }]}>{TIER_LABEL[tier]}</Text>
            </View>
          </View>

          {progress.target ? (
            <>
              <View style={styles.track}>
                <View style={[styles.trackFill, { width: `${pct}%`, backgroundColor: TIER_COLOR[tier] }]} />
              </View>
              <Text style={styles.trackCaption}>
                {Math.max(0, progress.target - progress.points).toLocaleString()} more points to {tier === "none" ? "unlock Blue" : tier === "blue_provisional" ? "lock Blue in for good" : tier === "blue" ? "unlock Gold" : "lock Gold in for good"} · {daysLeft}d left this period
              </Text>
            </>
          ) : (
            <Text style={styles.trackCaption}>🏆 Gold tick locked in permanently — nothing more to hit.</Text>
          )}

          <TouchableOpacity style={styles.watchAdButton} onPress={handleWatchAd} disabled={watchingAd}>
            {watchingAd ? (
              <ActivityIndicator color={COLORS.accentInk} />
            ) : (
              <>
                <Ionicons name="play-circle-outline" size={18} color={COLORS.accentInk} />
                <Text style={styles.watchAdButtonText}>Watch an ad for +7 points</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.targetsCard}>
        <Text style={styles.targetsTitle}>Tiers</Text>
        <Text style={styles.targetsText}>3,000 pts in 30 days → Blue tick. 7,000 pts in the next 30 days locks Blue in for good.</Text>
        <Text style={styles.targetsText}>From Blue: 10,000 pts in 30 days → Gold tick. 20,000 pts in the next 30 days locks Gold in for good.</Text>
      </View>

      <Text style={styles.sectionTitle}>How points work</Text>
      {POINT_SOURCES.map((s) => (
        <View key={s.label} style={styles.pointRow}>
          <View style={styles.pointIcon}>
            <Ionicons name={s.icon} size={18} color={COLORS.accent} />
          </View>
          <Text style={styles.pointLabel}>{s.label}</Text>
          <Text style={styles.pointValue}>{s.points}</Text>
        </View>
      ))}

      <TouchableOpacity style={styles.actionCard} onPress={() => navigation.navigate("ReportImposter")}>
        <View style={styles.actionIcon}>
          <Ionicons name="flag-outline" size={22} color={COLORS.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.actionLabel}>Report Imposter</Text>
          <Text style={styles.actionDesc}>Flag a verified user you believe gamed their tier</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: { backgroundColor: COLORS.accentInk, borderRadius: 12, paddingVertical: 22, paddingHorizontal: 20, alignItems: "center", marginBottom: 16 },
  heroBadge: { color: COLORS.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  heroTitle: { color: "#fff", fontSize: 19, fontWeight: "800", textAlign: "center", marginTop: 10 },
  heroSubtitle: { color: "#B9C6DC", fontSize: 12, marginTop: 8, textAlign: "center", lineHeight: 18 },

  progressCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginBottom: 20 },
  progressHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  pointsValue: { fontSize: 30, fontWeight: "800", color: COLORS.ink },
  pointsLabel: { fontSize: 12, color: COLORS.sub, marginTop: 2 },
  tierChip: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  tierChipText: { fontSize: 11.5, fontWeight: "800" },
  track: { height: 8, borderRadius: 4, backgroundColor: COLORS.wash, overflow: "hidden", marginTop: 16 },
  trackFill: { height: "100%", borderRadius: 4 },
  trackCaption: { fontSize: 12, color: COLORS.sub, marginTop: 8 },
  watchAdButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 12, marginTop: 16 },
  watchAdButtonText: { color: COLORS.accentInk, fontWeight: "800", fontSize: 13.5 },

  sectionTitle: { fontSize: 12, fontWeight: "700", color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 },
  pointRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, marginBottom: 6 },
  pointIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  pointLabel: { flex: 1, fontSize: 13, color: COLORS.ink, fontWeight: "600" },
  pointValue: { fontSize: 13, color: COLORS.accent, fontWeight: "800" },

  targetsCard: { backgroundColor: COLORS.wash, borderRadius: 10, padding: 14, marginTop: 14, marginBottom: 20, gap: 6 },
  targetsTitle: { fontSize: 12, fontWeight: "800", color: COLORS.ink, textTransform: "uppercase", letterSpacing: 0.3 },
  targetsText: { fontSize: 12, color: COLORS.sub, lineHeight: 17 },

  actionCard: {
    flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 16, marginBottom: 10,
  },
  actionIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 15, fontWeight: "700", color: COLORS.ink },
  actionDesc: { fontSize: 12.5, color: COLORS.sub, marginTop: 2 },
});
