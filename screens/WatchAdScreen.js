import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRewardedAd } from "react-native-google-mobile-ads";
import client from "../api/client";
import { COLORS } from "../theme";
import { fetchAdmobConfig } from "../utils/admobConfig";

// A real Google AdMob rewarded video ad. The reward itself is still granted
// by the backend (POST /coins/watch-ad, which owns the daily cap) — this
// screen's job is only to prove a full ad view happened before calling it,
// via the SDK's EARNED_REWARD event rather than a client-side timer.
export default function WatchAdScreen({ navigation }) {
  const [adUnitId, setAdUnitId] = useState(null);
  const [claiming, setClaiming] = useState(false);
  const [claimHandled, setClaimHandled] = useState(false);
  const { isLoaded, isClosed, isEarnedReward, error, load, show } = useRewardedAd(adUnitId);

  useEffect(() => {
    fetchAdmobConfig().then((cfg) => setAdUnitId(cfg.rewardedUnitId));
  }, []);

  useEffect(() => {
    if (adUnitId) load();
  }, [adUnitId, load]);

  useEffect(() => {
    if (isEarnedReward && !claimHandled) {
      setClaimHandled(true);
      claimReward();
    }
  }, [isEarnedReward, claimHandled]);

  async function claimReward() {
    setClaiming(true);
    try {
      const { data } = await client.post("/coins/watch-ad");
      if (data.awarded) {
        Alert.alert("Reward earned!", "You've earned 10 coins.", [{ text: "OK", onPress: () => navigation.goBack() }]);
      } else {
        Alert.alert(
          "Daily ad limit reached",
          "You've already claimed the maximum ad rewards for today — come back tomorrow.",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      }
    } catch (e) {
      Alert.alert("Couldn't claim reward", e.response?.data?.error || e.message, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } finally {
      setClaiming(false);
    }
  }

  function handleRetry() {
    setClaimHandled(false);
    load();
  }

  const closedWithoutReward = isClosed && !isEarnedReward && !claimHandled;

  return (
    <View style={styles.container}>
      {claiming ? (
        <>
          <ActivityIndicator size="large" color="#33D9B2" />
          <Text style={styles.title}>Claiming your reward...</Text>
        </>
      ) : error || closedWithoutReward ? (
        <>
          <Ionicons name="alert-circle" size={64} color="#FF6B6B" />
          <Text style={styles.title}>{error ? "Couldn't load ad" : "Ad closed early"}</Text>
          <Text style={styles.subtitle}>
            {error ? "No ad is available right now — please try again shortly." : "Watch the full ad to earn your coins."}
          </Text>
          <TouchableOpacity style={styles.claimButton} onPress={handleRetry}>
            <Text style={styles.claimButtonText}>Try Again</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : isLoaded ? (
        <>
          <Ionicons name="play-circle" size={64} color="#fff" />
          <Text style={styles.title}>Ad ready</Text>
          <Text style={styles.subtitle}>Watch the full video to earn 10 coins.</Text>
          <TouchableOpacity style={styles.claimButton} onPress={() => show()}>
            <Text style={styles.claimButtonText}>Watch Ad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <ActivityIndicator size="large" color="#33D9B2" />
          <Text style={styles.title}>Loading ad...</Text>
          <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.ink, alignItems: "center", justifyContent: "center", padding: 32 },
  title: { color: "#fff", fontSize: 20, fontWeight: "800", marginTop: 20, textAlign: "center" },
  subtitle: { color: "#9FC7BF", fontSize: 14, marginTop: 8, textAlign: "center" },
  claimButton: { backgroundColor: "#33D9B2", borderRadius: 100, paddingVertical: 16, paddingHorizontal: 36, marginTop: 28 },
  claimButtonText: { color: COLORS.ink, fontWeight: "800", fontSize: 16 },
  cancelButton: { marginTop: 18, paddingVertical: 8, paddingHorizontal: 16 },
  cancelButtonText: { color: "#9FC7BF", fontWeight: "600", fontSize: 14 },
});