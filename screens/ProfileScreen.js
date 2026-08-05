import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import AdCard from "../components/AdCard";
import AdMobBanner from "../components/AdMobBanner";
import Avatar from "../components/Avatar";
import VerifiedBadge from "../components/VerifiedBadge";
import InfluencerQuestCard from "../components/InfluencerQuestCard";
import { useSaved } from "../hooks/useSaved";
import { useReshared } from "../hooks/useReshared";
import { COLORS } from "../theme";

function StarRow({ value, size = 14 }) {
  return (
    <View style={{ flexDirection: "row", gap: 2 }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Ionicons key={n} name={n <= value ? "star" : "star-outline"} size={size} color="#F5A623" />
      ))}
    </View>
  );
}

function RatingBreakdown({ breakdown, totalCount }) {
  return (
    <View style={styles.breakdown}>
      {[5, 4, 3, 2, 1].map((n) => {
        const count = breakdown?.[n] || 0;
        const pct = totalCount ? (count / totalCount) * 100 : 0;
        return (
          <View key={n} style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>{n}★</Text>
            <View style={styles.breakdownTrack}>
              <View style={[styles.breakdownFill, { width: `${pct}%` }]} />
            </View>
            <Text style={styles.breakdownCount}>{count}</Text>
          </View>
        );
      })}
    </View>
  );
}

function ReviewCard({ review }) {
  return (
    <View style={styles.reviewCard}>
      <View style={styles.reviewHeader}>
        <Avatar uri={review.author?.avatar} name={review.author?.name} style={styles.reviewAvatar} />
        <View>
          <Text style={styles.reviewName}>{review.author?.name}</Text>
          <StarRow value={review.rating} size={12} />
        </View>
      </View>
      {!!review.content && <Text style={styles.reviewContent}>{review.content}</Text>}
    </View>
  );
}

export default function ProfileScreen({ navigation, route }) {
  const { user } = useAuth();
  const [counts, setCounts] = useState({ followerCount: 0, followingCount: 0, avgRating: 0, reviewCount: 0 });
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState({ items: [], avgRating: 0, reviewCount: 0, breakdown: {} });
  const [activeTab, setActiveTab] = useState("Posts");
  const [loading, setLoading] = useState(true);
  const { isSaved, toggleSave, loadSaved } = useSaved();
  const { isReshared, unreshare, loadReshared } = useReshared();
  // Arriving via a "commented/reacted/reshared your post" notification tap.
  // Profile is a RootStack screen React Navigation can bring back into focus
  // with new params without remounting it (if it was already open), so these
  // are read from route.params in an effect, not a useState initializer —
  // see FeedScreen.js's equivalent comment for the full explanation.
  const [focusPostId, setFocusPostId] = useState(null);
  const [focusCommentId, setFocusCommentId] = useState(null);
  const listRef = useRef(null);
  useEffect(() => {
    if (route?.params?.focusPostId) {
      setActiveTab("Posts");
      setFocusPostId(route.params.focusPostId);
      setFocusCommentId(route.params.focusCommentId ?? null);
    }
  }, [route?.params?.focusPostId, route?.params?.focusCommentId]);

  const load = useCallback(async () => {
    if (!user?.id) return;
    const [profileRes, postsRes, reelsRes, productsRes, reviewsRes] = await Promise.all([
      client.get(`/users/${user.id}`),
      client.get(`/users/${user.id}/posts`),
      client.get(`/users/${user.id}/reels`),
      client.get(`/market/products/by-user/${user.id}`),
      client.get(`/users/${user.id}/reviews`),
    ]);
    setCounts(profileRes.data);
    setPosts(postsRes.data);
    setReels(reelsRes.data);
    setProducts(productsRes.data);
    setReviews(reviewsRes.data);
    loadSaved();
    loadReshared();
  }, [user?.id, loadSaved, loadReshared]);

  useFocusEffect(
    useCallback(() => {
      load()
        .catch((e) => Alert.alert("Couldn't load profile", e.response?.data?.error || e.message))
        .finally(() => setLoading(false));
    }, [load])
  );

  async function handleReact(postId, reaction) {
    try {
      await client.post(`/feed/${postId}/react`, { reaction });
      load();
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
  }

  async function handleDeletePost(postId) {
    try {
      await client.delete(`/feed/${postId}`);
      load();
    } catch (e) {
      Alert.alert("Couldn't delete post", e.response?.data?.error || e.message);
    }
  }

  useEffect(() => {
    if (!focusPostId || activeTab !== "Posts" || !posts.length) return;
    const index = posts.findIndex((item) => item.id === focusPostId);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
    }
    setFocusPostId(null);
    setFocusCommentId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, activeTab, focusPostId]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  // The feed response interleaves sponsored/Google ad cards among real
  // posts (same as the main feed) — those don't count toward "Posts".
  const postCount = posts.filter((p) => p.kind !== "ad").length;
  const campusYear = [counts.campus, counts.yearOfJoining && String(counts.yearOfJoining)].filter(Boolean).join(" - ");

  const header = (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate("AvatarViewer", { userId: user?.id, name: user?.name, avatarUrl: user?.avatar })}
        >
          <Avatar uri={user?.avatar} name={user?.name} style={styles.avatar} />
        </TouchableOpacity>
        <View style={styles.topRowText}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{user?.name}</Text>
            {!!user?.isStudentLeader && <VerifiedBadge size={17} tier={counts.influencerQuest?.badge} />}
          </View>
          {!!user?.username && <Text style={styles.username}>@{user.username}</Text>}
        </View>
      </View>

      {!!counts.bio && <Text style={styles.bio}>{counts.bio}</Text>}
      {!!campusYear && <Text style={styles.metaLine}>{campusYear}</Text>}
      {!!counts.county && (
        <Text style={styles.metaLine}>{counts.subCounty ? `${counts.county} - ${counts.subCounty}` : counts.county}</Text>
      )}

      <InfluencerQuestCard progress={counts.influencerQuest} />

      <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("AccountSettings")}>
        <Text style={styles.actionButtonText}>Edit Profile</Text>
      </TouchableOpacity>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{postCount}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("FollowList", { userId: user.id, mode: "followers" })}>
          <Text style={styles.statValue}>{counts.followerCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("FollowList", { userId: user.id, mode: "following" })}>
          <Text style={styles.statValue}>{counts.followingCount}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => setActiveTab("Reviews")}>
          <Text style={styles.statValue}>
            {counts.reviewCount > 0 ? counts.avgRating.toFixed(1) : "—"} <Ionicons name="star" size={12} color="#F5A623" />
          </Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.segment}>
        <TouchableOpacity style={[styles.segmentItem, activeTab === "Posts" && styles.segmentItemActive]} onPress={() => setActiveTab("Posts")}>
          <Text style={[styles.segmentText, activeTab === "Posts" && styles.segmentTextActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentItem, activeTab === "Reels" && styles.segmentItemActive]} onPress={() => setActiveTab("Reels")}>
          <Text style={[styles.segmentText, activeTab === "Reels" && styles.segmentTextActive]}>Reels</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentItem, activeTab === "My Products" && styles.segmentItemActive]} onPress={() => setActiveTab("My Products")}>
          <Text style={[styles.segmentText, activeTab === "My Products" && styles.segmentTextActive]}>My Products</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentItem, activeTab === "Reviews" && styles.segmentItemActive]} onPress={() => setActiveTab("Reviews")}>
          <Text style={[styles.segmentText, activeTab === "Reviews" && styles.segmentTextActive]}>Reviews</Text>
        </TouchableOpacity>
      </View>

      {activeTab === "Reviews" && reviews.reviewCount > 0 && (
        <View style={styles.reviewSummary}>
          <View style={styles.reviewScoreBlock}>
            <Text style={styles.reviewScore}>{reviews.avgRating.toFixed(1)}</Text>
            <StarRow value={Math.round(reviews.avgRating)} size={13} />
            <Text style={styles.reviewScoreSub}>{reviews.reviewCount} review{reviews.reviewCount === 1 ? "" : "s"}</Text>
          </View>
          <RatingBreakdown breakdown={reviews.breakdown} totalCount={reviews.reviewCount} />
        </View>
      )}
    </View>
  );

  if (activeTab === "Reviews") {
    return (
      <FlatList
        key="Reviews"
        style={styles.container}
        data={reviews.items}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={styles.empty}>No reviews yet</Text>}
        renderItem={({ item }) => <ReviewCard review={item} />}
      />
    );
  }

  if (activeTab === "My Products") {
    const photos = products.filter((p) => p.mediaType === "photo");
    const videos = products.filter((p) => p.mediaType === "video");
    return (
      <ScrollView style={styles.container}>
        {header}
        <Text style={styles.productSectionLabel}>Photos</Text>
        {photos.length ? (
          <View style={styles.productGrid}>
            {photos.map((p) => (
              <TouchableOpacity key={p.id} style={styles.productTile} onPress={() => navigation.navigate("MarketProductDetail", { productId: p.id })}>
                <Image source={{ uri: p.photoUrls?.[0] }} style={styles.productTileMedia} contentFit="cover" />
                {p.status === "sold" && <View style={styles.soldBadge}><Text style={styles.soldBadgeText}>SOLD</Text></View>}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>No photo listings yet</Text>
        )}
        <Text style={styles.productSectionLabel}>Videos</Text>
        {videos.length ? (
          <View style={styles.productGrid}>
            {videos.map((p) => (
              <TouchableOpacity key={p.id} style={styles.productTile} onPress={() => navigation.navigate("MarketProductDetail", { productId: p.id })}>
                <Image source={{ uri: p.thumbnailUrl }} style={styles.productTileMedia} contentFit="cover" />
                <Ionicons name="play" size={16} color="#fff" style={styles.reelTilePlayIcon} />
                {p.status === "sold" && <View style={styles.soldBadge}><Text style={styles.soldBadgeText}>SOLD</Text></View>}
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <Text style={styles.empty}>No video listings yet</Text>
        )}
      </ScrollView>
    );
  }

  if (activeTab === "Reels") {
    return (
      <FlatList
        key="Reels"
        style={styles.container}
        data={reels}
        numColumns={3}
        keyExtractor={(r) => r.id}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={styles.empty}>No reels yet — post a video to see it here</Text>}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.reelTile}
            onPress={() => navigation.navigate("Reels", { authorId: user.id, startIndex: index })}
          >
            {item.thumbnailUrl ? (
              <Image source={{ uri: item.thumbnailUrl }} style={styles.reelTileMedia} contentFit="cover" />
            ) : (
              <View style={[styles.reelTileMedia, styles.reelTilePlaceholder]} />
            )}
            <Ionicons name="play" size={16} color="#fff" style={styles.reelTilePlayIcon} />
          </TouchableOpacity>
        )}
      />
    );
  }

  return (
    <FlatList
      key="Posts"
      ref={listRef}
      style={styles.container}
      data={posts}
      keyExtractor={(item, i) => `${item.kind}-${item.id}-${i}`}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.15 }), 300);
      }}
      renderItem={({ item }) =>
        item.kind === "ad" ? (
          item.network === "google" ? <AdMobBanner /> : <AdCard ad={item} />
        ) : (
          <PostCard
            post={item}
            onReact={handleReact}
            isSaved={isSaved("post", item.id)}
            onToggleSave={() => toggleSave("post", item.id)}
            isReshared={isReshared(item.id)}
            onUnreshare={() => unreshare(item.id)}
            onDelete={handleDeletePost}
            onChanged={load}
            autoOpenComments={!!focusCommentId && item.id === focusPostId}
          />
        )
      }
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>You haven't posted anything yet</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { paddingTop: 20, paddingBottom: 4, paddingHorizontal: 16, backgroundColor: COLORS.bg },
  topRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: COLORS.wash },
  topRowText: { flex: 1 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  name: { fontSize: 17, fontWeight: "800", color: COLORS.ink },
  username: { color: COLORS.sub, marginTop: 1, fontSize: 12.5 },
  bio: { color: COLORS.ink, marginTop: 12, fontSize: 13.5, lineHeight: 19 },
  metaLine: { color: COLORS.sub, marginTop: 3, fontSize: 12, fontWeight: "600" },
  actionButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 11, alignItems: "center", marginTop: 14 },
  actionButtonText: { color: "#fff", fontWeight: "800", fontSize: 13.5 },
  statsRow: { flexDirection: "row", gap: 6, marginTop: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  statValue: { fontSize: 15, fontWeight: "800", color: COLORS.accent },
  statLabel: { fontSize: 8.5, color: COLORS.sub, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2 },
  segment: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 10, padding: 3, gap: 3, marginTop: 14, marginBottom: 4 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  segmentItemActive: { backgroundColor: COLORS.accent },
  segmentText: { fontSize: 12, fontWeight: "700", color: COLORS.sub },
  segmentTextActive: { color: "#fff" },
  reelTile: { flex: 1 / 3, aspectRatio: 0.65, margin: 1, backgroundColor: "#000" },
  reelTileMedia: { width: "100%", height: "100%" },
  reelTilePlaceholder: { backgroundColor: "#000" },
  reelTilePlayIcon: { position: "absolute", top: 8, right: 8 },
  empty: { textAlign: "center", color: "#999", marginTop: 20 },
  reviewSummary: { flexDirection: "row", gap: 16, alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginTop: 4 },
  reviewScoreBlock: { alignItems: "center" },
  reviewScore: { fontSize: 28, fontWeight: "800", color: COLORS.ink, lineHeight: 32 },
  reviewScoreSub: { fontSize: 11, color: COLORS.sub, marginTop: 4 },
  breakdown: { flex: 1 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  breakdownLabel: { width: 22, fontSize: 12, color: COLORS.sub, fontWeight: "600" },
  breakdownTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.wash, overflow: "hidden" },
  breakdownFill: { height: "100%", backgroundColor: "#F5A623", borderRadius: 3 },
  breakdownCount: { width: 20, fontSize: 11, color: COLORS.sub, textAlign: "right" },
  reviewCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginHorizontal: 10, marginVertical: 6 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  reviewAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.wash },
  reviewName: { fontSize: 13, fontWeight: "700", color: COLORS.ink, marginBottom: 2 },
  reviewContent: { fontSize: 13, color: COLORS.ink, lineHeight: 18 },
  productSectionLabel: { fontSize: 13, fontWeight: "700", color: COLORS.ink, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 9 },
  productTile: { width: "33.33%", aspectRatio: 0.8, padding: 1 },
  productTileMedia: { width: "100%", height: "100%", backgroundColor: "#000" },
  soldBadge: { position: "absolute", top: 6, left: 6, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  soldBadgeText: { color: "#fff", fontSize: 8, fontWeight: "800" },
});
