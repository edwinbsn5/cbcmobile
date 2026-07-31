import React, { useCallback, useState } from "react";
import { View, Text, Image, TextInput, TouchableOpacity, FlatList, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import AdCard from "../components/AdCard";
import AdMobBanner from "../components/AdMobBanner";
import Avatar from "../components/Avatar";
import VerifiedBadge from "../components/VerifiedBadge";
import StudentLeaderCard from "../components/StudentLeaderCard";
import { useSaved } from "../hooks/useSaved";
import { useReshared } from "../hooks/useReshared";
import { COLORS } from "../theme";

function StarRow({ value, size = 14, onRate }) {
  return (
    <View style={{ flexDirection: "row", gap: onRate ? 6 : 2 }}>
      {[1, 2, 3, 4, 5].map((n) =>
        onRate ? (
          <TouchableOpacity key={n} onPress={() => onRate(n)}>
            <Ionicons name={n <= value ? "star" : "star-outline"} size={size} color="#F5A623" />
          </TouchableOpacity>
        ) : (
          <Ionicons key={n} name={n <= value ? "star" : "star-outline"} size={size} color="#F5A623" />
        )
      )}
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

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState({ items: [], avgRating: 0, reviewCount: 0, breakdown: {} });
  const [activeTab, setActiveTab] = useState("Posts");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myReviewText, setMyReviewText] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const { isSaved, toggleSave, loadSaved } = useSaved();
  const { isReshared, unreshare, loadReshared } = useReshared();

  const load = useCallback(async () => {
    const [profileRes, postsRes, reelsRes, productsRes, reviewsRes] = await Promise.all([
      client.get(`/users/${userId}`),
      client.get(`/users/${userId}/posts`),
      client.get(`/users/${userId}/reels`),
      client.get(`/market/products/by-user/${userId}`),
      client.get(`/users/${userId}/reviews`),
    ]);
    setProfile(profileRes.data);
    setPosts(postsRes.data);
    setReels(reelsRes.data);
    setProducts(productsRes.data);
    setReviews(reviewsRes.data);
    const mine = reviewsRes.data.items.find((r) => r.reviewerId === me?.id);
    if (mine) {
      setMyRating(mine.rating);
      setMyReviewText(mine.content || "");
    }
    navigation.setOptions({ title: profileRes.data.name });
    loadSaved();
    loadReshared();
  }, [userId, navigation, loadSaved, loadReshared, me?.id]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function handleToggleFollow() {
    setSubmitting(true);
    try {
      const path = profile.amIFollowing ? "unfollow" : "follow";
      const { data } = await client.post(`/users/${userId}/${path}`);
      setProfile((prev) => ({ ...prev, ...data }));
    } catch (e) {
      Alert.alert("Couldn't update follow status", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleMessage() {
    setMessaging(true);
    try {
      const { data } = await client.post("/inbox/start", { userId });
      navigation.navigate("Chat", { conversationId: data.id, otherUser: data.otherUser });
    } catch (e) {
      Alert.alert("Couldn't start chat", e.response?.data?.error || e.message);
    } finally {
      setMessaging(false);
    }
  }

  async function handleReact(postId, reaction) {
    await client.post(`/feed/${postId}/react`, { reaction });
    load();
  }

  async function handleDeletePost(postId) {
    await client.delete(`/feed/${postId}`);
    load();
  }

  async function handleSubmitReview() {
    if (myRating < 1) return Alert.alert("Pick a rating", "Tap a star to rate this person");
    setReviewSubmitting(true);
    try {
      await client.post(`/users/${userId}/reviews`, { rating: myRating, content: myReviewText.trim() });
      load();
    } catch (e) {
      Alert.alert("Couldn't submit review", e.response?.data?.error || e.message);
    } finally {
      setReviewSubmitting(false);
    }
  }

  if (loading || !profile) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const isMe = me?.id === userId;
  // The feed response interleaves sponsored/Google ad cards among real
  // posts (same as the main feed) — those don't count toward "Posts".
  const postCount = posts.filter((p) => p.kind !== "ad").length;
  const campusYear = [profile.campus, profile.yearOfJoining && String(profile.yearOfJoining)].filter(Boolean).join(" - ");

  const header = (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <TouchableOpacity
          onPress={() => navigation.navigate("AvatarViewer", { userId: profile.id, name: profile.name, avatarUrl: profile.avatar })}
        >
          <Avatar uri={profile.avatar} name={profile.name} style={styles.avatar} />
        </TouchableOpacity>
        <View style={styles.topRowText}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{profile.name}</Text>
            {!!profile.isStudentLeader && <VerifiedBadge size={17} />}
          </View>
          {!!profile.username && <Text style={styles.username}>@{profile.username}</Text>}
        </View>
      </View>

      {!!profile.bio && <Text style={styles.bio}>{profile.bio}</Text>}
      {!!campusYear && <Text style={styles.metaLine}>{campusYear}</Text>}
      {!!profile.county && (
        <Text style={styles.metaLine}>{profile.subCounty ? `${profile.county} - ${profile.subCounty}` : profile.county}</Text>
      )}

      {!isMe && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, profile.amIFollowing && styles.followingButton]}
            onPress={handleToggleFollow}
            disabled={submitting}
          >
            <Text style={[styles.actionButtonText, profile.amIFollowing && styles.followingButtonText]}>
              {submitting ? "..." : profile.amIFollowing ? "Following" : "Follow"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.messageButton]}
            onPress={handleMessage}
            disabled={messaging}
          >
            <Text style={[styles.actionButtonText, styles.messageButtonText]}>{messaging ? "..." : "Message"}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{postCount}</Text>
          <Text style={styles.statLabel}>Posts</Text>
        </View>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("FollowList", { userId, mode: "followers" })}>
          <Text style={styles.statValue}>{profile.followerCount}</Text>
          <Text style={styles.statLabel}>Followers</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => navigation.navigate("FollowList", { userId, mode: "following" })}>
          <Text style={styles.statValue}>{profile.followingCount}</Text>
          <Text style={styles.statLabel}>Following</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.statCard} onPress={() => setActiveTab("Reviews")}>
          <Text style={styles.statValue}>
            {profile.reviewCount > 0 ? profile.avgRating.toFixed(1) : "—"} <Ionicons name="star" size={12} color="#F5A623" />
          </Text>
          <Text style={styles.statLabel}>Reviews</Text>
        </TouchableOpacity>
      </View>

      <StudentLeaderCard info={profile.studentLeaderInfo} />

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

      {activeTab === "Reviews" && (
        <>
          {reviews.reviewCount > 0 && (
            <View style={styles.reviewSummary}>
              <View style={styles.reviewScoreBlock}>
                <Text style={styles.reviewScore}>{reviews.avgRating.toFixed(1)}</Text>
                <StarRow value={Math.round(reviews.avgRating)} size={13} />
                <Text style={styles.reviewScoreSub}>{reviews.reviewCount} review{reviews.reviewCount === 1 ? "" : "s"}</Text>
              </View>
              <RatingBreakdown breakdown={reviews.breakdown} totalCount={reviews.reviewCount} />
            </View>
          )}

          {!isMe && (
            <View style={styles.composer}>
              <Text style={styles.reviewFormLabel}>Your rating</Text>
              <StarRow value={myRating} size={28} onRate={setMyRating} />
              <TextInput
                style={styles.composerInput}
                placeholder="Write a review (optional)"
                placeholderTextColor={COLORS.sub}
                value={myReviewText}
                onChangeText={setMyReviewText}
                multiline
              />
              <TouchableOpacity style={styles.postButton} onPress={handleSubmitReview} disabled={reviewSubmitting}>
                <Text style={styles.postButtonText}>{reviewSubmitting ? "Submitting..." : "Submit review"}</Text>
              </TouchableOpacity>
            </View>
          )}
        </>
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
                <Image source={{ uri: p.photoUrls?.[0] }} style={styles.productTileMedia} resizeMode="cover" />
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
                <Image source={{ uri: p.thumbnailUrl }} style={styles.productTileMedia} resizeMode="cover" />
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
        ListEmptyComponent={<Text style={styles.empty}>No reels yet</Text>}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.reelTile}
            onPress={() => navigation.navigate("Reels", { authorId: userId, startIndex: index })}
          >
            {item.thumbnailUrl ? (
              <Image source={{ uri: item.thumbnailUrl }} style={styles.reelTileMedia} resizeMode="cover" />
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
      style={styles.container}
      data={posts}
      keyExtractor={(item, i) => `${item.kind}-${item.id}-${i}`}
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
          />
        )
      }
      ListHeaderComponent={header}
      ListEmptyComponent={<Text style={styles.empty}>No posts yet</Text>}
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
  actionRow: { flexDirection: "row", gap: 8, marginTop: 14 },
  actionButton: { flex: 1, backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  actionButtonText: { color: COLORS.accentInk, fontWeight: "800", fontSize: 13.5 },
  followingButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  followingButtonText: { color: COLORS.ink },
  messageButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  messageButtonText: { color: COLORS.ink },
  statsRow: { flexDirection: "row", gap: 6, marginTop: 12 },
  statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  statValue: { fontSize: 15, fontWeight: "800", color: COLORS.accent },
  statLabel: { fontSize: 8.5, color: COLORS.sub, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3, marginTop: 2 },
  segment: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 10, padding: 3, gap: 3, marginTop: 14, marginBottom: 4 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  segmentItemActive: { backgroundColor: COLORS.accent },
  segmentText: { fontSize: 12, fontWeight: "700", color: COLORS.sub },
  segmentTextActive: { color: COLORS.accentInk },
  reelTile: { flex: 1 / 3, aspectRatio: 0.65, margin: 1, backgroundColor: "#000" },
  reelTileMedia: { width: "100%", height: "100%" },
  reelTilePlaceholder: { backgroundColor: "#000" },
  reelTilePlayIcon: { position: "absolute", top: 8, right: 8 },
  empty: { textAlign: "center", color: "#999", marginTop: 20 },
  productSectionLabel: { fontSize: 13, fontWeight: "700", color: COLORS.ink, marginHorizontal: 16, marginTop: 16, marginBottom: 8 },
  productGrid: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 9 },
  productTile: { width: "33.33%", aspectRatio: 0.8, padding: 1 },
  productTileMedia: { width: "100%", height: "100%", backgroundColor: "#000" },
  soldBadge: { position: "absolute", top: 6, left: 6, backgroundColor: "rgba(0,0,0,0.65)", borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  soldBadgeText: { color: "#fff", fontSize: 8, fontWeight: "800" },
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
  composer: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginTop: 10 },
  reviewFormLabel: { fontSize: 12.5, fontWeight: "700", color: COLORS.sub, marginBottom: 6 },
  composerInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginTop: 10, minHeight: 60, textAlignVertical: "top", color: COLORS.ink, fontSize: 13.5 },
  postButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 11, alignItems: "center", marginTop: 10 },
  postButtonText: { color: COLORS.accentInk, fontWeight: "800", fontSize: 13.5 },
  reviewCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginHorizontal: 10, marginVertical: 6 },
  reviewHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 6 },
  reviewAvatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.wash },
  reviewName: { fontSize: 13, fontWeight: "700", color: COLORS.ink, marginBottom: 2 },
  reviewContent: { fontSize: 13, color: COLORS.ink, lineHeight: 18 },
});
