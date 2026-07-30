import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";

// Hub screen for every paid-promotion surface — previously three separate
// top-level menu entries, now grouped under one "My Ads Board" item.
const ITEMS = [
  { icon: "megaphone-outline", label: "My Sponsored Posts", hint: "Posts you've boosted in the home feed", screen: "MySponsoredPosts" },
  { icon: "trending-up-outline", label: "My Boosted Groups", hint: "Groups featured via Featured Groups", screen: "MyBoostedGroups" },
  { icon: "flag-outline", label: "My Boosted Pages", hint: "Pages featured via Featured Pages", screen: "MyBoostedPages" },
];

export default function MyAdsBoardScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.intro}>Manage every paid promotion you've run — posts, groups, and Pages — in one place.</Text>
      <View style={styles.list}>
        {ITEMS.map((item) => (
          <TouchableOpacity key={item.screen} style={styles.row} onPress={() => navigation.navigate(item.screen)}>
            <View style={styles.icon}>
              <Ionicons name={item.icon} size={18} color={COLORS.accent} />
            </View>
            <View style={styles.rowText}>
              <Text style={styles.rowLabel}>{item.label}</Text>
              <Text style={styles.rowHint}>{item.hint}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  intro: { color: COLORS.sub, fontSize: 13, marginBottom: 16, lineHeight: 18 },
  list: { gap: 10 },
  row: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  icon: { width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14.5, fontWeight: "800", color: COLORS.ink },
  rowHint: { fontSize: 11.5, color: COLORS.sub, marginTop: 1 },
});
