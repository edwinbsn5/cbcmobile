import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Image } from "expo-image";

// Small, fixed palette — deterministic per name so the same person always
// gets the same badge color across every screen.
const BADGE_COLORS = ["#0E9384", "#D97706", "#7C3AED", "#DB2777", "#2563EB", "#059669", "#DC2626", "#4F46E5"];

function hashToIndex(str, mod) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return hash % mod;
}

function initialsFor(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const initials = (parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "");
  return initials.toUpperCase() || "?";
}

// Drop-in <Image> replacement: `<Image source={{uri}} style={S}/>` becomes
// `<Avatar uri={uri} name={name} style={S}/>`. When `uri` is empty, renders
// an initials badge using the same `style` so every call site's existing
// size/shape (circular or rounded-square) is preserved untouched.
export default function Avatar({ uri, name, style }) {
  if (uri) return <Image source={{ uri }} style={style} contentFit="cover" />;

  const flat = StyleSheet.flatten(style) || {};
  const dim = flat.width || flat.height || 40;
  const color = BADGE_COLORS[hashToIndex(name || "?", BADGE_COLORS.length)];
  return (
    <View style={[style, styles.badge, { backgroundColor: color }]}>
      <Text style={[styles.badgeText, { fontSize: dim * 0.4 }]}>{initialsFor(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: { alignItems: "center", justifyContent: "center" },
  badgeText: { color: "#fff", fontWeight: "800" },
});
