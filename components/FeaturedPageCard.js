import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../theme";

// The home feed's "Featured Pages" slot — an admin-boosted Page (see
// routes/pageBoosts.js), same card shape as FeaturedGroupCard, just
// pointed at a Page instead of a Group.
export default function FeaturedPageCard({ page, onPress }) {
  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Text style={styles.featured}>Featured Page</Text>
      </View>
      {!!page.coverUrl && <Image source={{ uri: page.coverUrl }} style={styles.media} resizeMode="cover" />}
      <Text style={styles.name}>{page.name}</Text>
      {!!page.description && <Text style={styles.desc} numberOfLines={2}>{page.description}</Text>}
      <TouchableOpacity style={styles.cta} onPress={onPress}>
        <Text style={styles.ctaText}>View Page</Text>
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
