import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { COLORS } from "../theme";

// The home feed's "Featured Groups" slot — an admin-boosted group (see
// routes/groupBoosts.js), same card shape as AdCard's sponsored posts but
// pointed at a group instead of a link.
export default function FeaturedGroupCard({ group, onPress }) {
  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Text style={styles.featured}>Featured Group</Text>
      </View>
      {!!group.coverUrl && <Image source={{ uri: group.coverUrl }} style={styles.media} contentFit="cover" />}
      <Text style={styles.name}>{group.name}</Text>
      {!!group.description && <Text style={styles.desc} numberOfLines={2}>{group.description}</Text>}
      <TouchableOpacity style={styles.cta} onPress={onPress}>
        <Text style={styles.ctaText}>View Group</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginHorizontal: 10, marginVertical: 6, borderWidth: 1, borderColor: COLORS.border },
  badgeRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  featured: { color: COLORS.sub, fontSize: 12, fontWeight: "600" },
  media: { width: "100%", height: 140, borderRadius: 8, backgroundColor: COLORS.wash, marginBottom: 8 },
  name: { fontSize: 15, fontWeight: "700", color: COLORS.ink, marginBottom: 2 },
  desc: { fontSize: 13, color: COLORS.sub, marginBottom: 8 },
  cta: { backgroundColor: COLORS.wash, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  ctaText: { color: COLORS.accent, fontWeight: "700" },
});
