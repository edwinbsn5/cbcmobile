import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { formatCount } from "../utils/formatCount";
import { COLORS } from "../theme";

// The home feed's "Featured Groups" slot — an admin-boosted group (see
// routes/groupBoosts.js), same card shape as AdCard's sponsored posts but
// pointed at a group instead of a link. memberCount/avgRating come from
// services/adInterleave.js's boostedGroupCandidates — the same real
// paid-subscriber count/reviews the group's own detail screen shows, not a
// fabricated number, so a brand-new group with neither just shows nothing
// extra.
export default function FeaturedGroupCard({ group, onPress }) {
  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Text style={styles.featured}>Featured Group</Text>
      </View>
      {!!group.coverUrl && <Image source={{ uri: group.coverUrl }} style={styles.media} contentFit="cover" />}
      <Text style={styles.name}>{group.name}</Text>
      {!!group.description && <Text style={styles.desc} numberOfLines={2}>{group.description}</Text>}
      {(!!group.memberCount || !!group.reviewCount) && (
        <View style={styles.statsRow}>
          {!!group.memberCount && (
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={13} color={COLORS.sub} />
              <Text style={styles.statText}>{formatCount(group.memberCount)} member{group.memberCount === 1 ? "" : "s"}</Text>
            </View>
          )}
          {!!group.reviewCount && (
            <View style={styles.statItem}>
              <Ionicons name="star" size={13} color="#F5A623" />
              <Text style={styles.statText}>{group.avgRating} ({formatCount(group.reviewCount)})</Text>
            </View>
          )}
        </View>
      )}
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
