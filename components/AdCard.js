import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { openInAppBrowser } from "../utils/inAppBrowser";
import { useAuth } from "../context/AuthContext";
import { formatCount } from "../utils/formatCount";
import ReactionBar from "./ReactionBar";
import PostCommentsModal from "./PostCommentsModal";
import { COLORS } from "../theme";

// Renders an admin-created sponsored ad or a user-paid boosted post — both
// arrive here already reshaped into the same {advertiser, headline,
// imageUrl, cta, targetUrl} shape (see services/adInterleave.js). Real
// Google ads never reach this component — FeedScreen.js intercepts the
// feed's googleAd slot and renders AdMobBanner instead.
export default function AdCard({ ad }) {
  const { user } = useAuth();
  // A user-boosted post carries the full real post (see adInterleave.js's
  // boostedAdCandidates) — an admin-created ad never has one, since there's
  // no real post underneath it to react to or comment on.
  const [post, setPost] = useState(ad.post || null);
  const [commentsOpen, setCommentsOpen] = useState(false);

  async function handleReact(reaction) {
    try {
      const { data } = await client.post(`/feed/${ad.boostedPostId}/react`, { reaction });
      setPost((prev) => (prev ? { ...prev, reactions: data.reactions } : prev));
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
  }

  return (
    <View style={styles.card}>
      <View style={styles.badgeRow}>
        <Text style={styles.sponsored}>Sponsored</Text>
        <Text style={styles.advertiser}>· {ad.advertiser}</Text>
      </View>
      {/* A boosted post that's pure text (no photo/video) has no imageUrl
          at all — rendering the Image unconditionally left a blank grey
          box in that case. */}
      {!!ad.imageUrl && <Image source={{ uri: ad.imageUrl }} style={styles.media} contentFit="cover" />}
      <Text style={styles.headline}>{ad.headline}</Text>
      {/* A boosted post (as opposed to an admin-created ad) never has a
          cta/targetUrl — rendering the button unconditionally left an
          empty, non-functional button under every user-boosted post. */}
      {!!ad.cta && (
        <TouchableOpacity style={styles.cta} onPress={() => openInAppBrowser(ad.targetUrl)}>
          <Text style={styles.ctaText}>{ad.cta}</Text>
        </TouchableOpacity>
      )}
      {!!post && (
        <>
          <View style={styles.actionsRow}>
            <ReactionBar reactions={post.reactions} myUserId={user?.id} onReact={handleReact} />
            <TouchableOpacity style={styles.pill} onPress={() => setCommentsOpen(true)}>
              <Ionicons name="chatbubble-outline" size={14} color={COLORS.accent} />
              <Text style={styles.pillText}>{formatCount(post.commentCount || 0)}</Text>
            </TouchableOpacity>
          </View>
          <PostCommentsModal
            visible={commentsOpen}
            post={post}
            basePath={`/feed/${ad.boostedPostId}/comments`}
            onClose={() => setCommentsOpen(false)}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginHorizontal: 10, marginVertical: 6, borderWidth: 1, borderColor: COLORS.bg },
  badgeRow: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  sponsored: { color: COLORS.sub, fontSize: 12, fontWeight: "600" },
  advertiser: { color: COLORS.sub, fontSize: 12, marginLeft: 4 },
  media: { width: "100%", height: 180, borderRadius: 8, backgroundColor: "#eee", marginBottom: 8 },
  headline: { color: COLORS.ink, fontSize: 15, fontWeight: "600", marginBottom: 8 },
  cta: { backgroundColor: COLORS.wash, paddingVertical: 8, borderRadius: 6, alignItems: "center" },
  ctaText: { color: COLORS.accent, fontWeight: "700" },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.bg },
  pill: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.wash, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { fontSize: 12, fontWeight: "700", color: COLORS.ink },
});
