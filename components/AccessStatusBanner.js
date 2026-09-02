import React from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

function formatExpiry(ts) {
  const d = new Date(ts);
  const date = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const time = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  return `${date} at ${time}`;
}

/**
 * Replaces the plain "Unlock access" teaser once the user actually has an
 * active feature-access pass (Investment Groups / The PLAN) — shows which
 * tier they're on and exactly when it expires, down to the time, instead
 * of leaving them to find out only when a paywall interrupts them. The
 * free tier gets an extra "renewable" note since re-claiming it isn't
 * just "buy again" — it's rate-limited to once every 30 days (see
 * services/featureAccess.js's freeAccessAvailable).
 */
export default function AccessStatusBanner({ pass, tiers, onPress }) {
  if (!pass) return null;
  const tier = tiers?.find((t) => t.key === pass.tier);
  const isFree = pass.tier === "free";

  return (
    <TouchableOpacity style={styles.banner} onPress={onPress}>
      <Ionicons name="time-outline" size={16} color="#2E7D32" />
      <Text style={styles.text}>
        {isFree
          ? `You have ${tier?.durationLabel || "2 days"} access (Free tier)`
          : `You have the ${tier?.label || pass.tier} plan`}
        {" — expires "}{formatExpiry(pass.expiresAt)}
        {isFree ? " · renewable again 30 days after you claimed it" : ""}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  banner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E8F5E9", borderRadius: 10, padding: 12, marginHorizontal: 12, marginTop: 12 },
  text: { color: "#2E7D32", fontSize: 12, fontWeight: "600", flex: 1, lineHeight: 17 },
});
