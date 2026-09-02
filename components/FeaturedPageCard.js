import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { formatCount } from "../utils/formatCount";
import { COLORS } from "../theme";

// The home feed's "Featured Pages" slot — an admin-boosted Page (see
// routes/pageBoosts.js), same card shape as FeaturedGroupCard, just
// pointed at a Page instead of a Group. followerCount/avgRating come from
// services/adInterleave.js's boostedPageCandidates — the same real
// followers/reviews the Page's own detail screen shows, not a fabricated
// number, so a brand-new Page with neither just shows nothing extra.
export default function FeaturedPageCard({ page, onPress }) {
  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Text style={styles.featured}>Featured Page</Text>
      </View>
      {!!page.coverUrl && <Image source={{ uri: page.coverUrl }} style={styles.media} contentFit="cover" />}
      <Text style={styles.name}>{page.name}</Text>
      {!!page.description && <Text style={styles.desc} numberOfLines={2}>{page.description}</Text>}
      {(!!page.followerCount || !!page.reviewCount) && (
        <View style={styles.statsRow}>
          {!!page.followerCount && (
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={13} color={COLORS.sub} />
              <Text style={styles.statText}>{formatCount(page.followerCount)} follower{page.followerCount === 1 ? "" : "s"}</Text>
            </View>
          )}
          {!!page.reviewCount && (
            <View style={styles.statItem}>
              <Ionicons name="star" size={13} color="#F5A623" />
              <Text style={styles.statText}>{page.avgRating} ({formatCount(page.reviewCount)})</Text>
            </View>
          )}
        </View>
      )}
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
  statsRow: { flexDirection: "row", gap: 14, marginBottom: 8 },
  statItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  statText: { fontSize: 12, color: COLORS.sub, fontWeight: "600" },
  cta: { backgroundColor: COLORS.wash, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  ctaText: { color: COLORS.accent, fontWeight: "700" },
});
