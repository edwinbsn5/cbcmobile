import React, { useCallback, useState } from "react";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import AdCard from "../components/AdCard";
import Avatar from "../components/Avatar";
import VerifiedBadge from "../components/VerifiedBadge";
import StudentLeaderCard from "../components/StudentLeaderCard";
import { useSaved } from "../hooks/useSaved";
import { useReshared } from "../hooks/useReshared";
import { COLORS } from "../theme";

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user: me } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [reels, setReels] = useState([]);
  const [contests, setContests] = useState([]);
  const [activeTab, setActiveTab] = useState("Posts");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [messaging, setMessaging] = useState(false);
  const { isSaved, toggleSave, loadSaved } = useSaved();
  const { isReshared, unreshare, loadReshared } = useReshared();

  const load = useCallback(async () => {
    const [profileRes, postsRes, reelsRes, contestsRes] = await Promise.all([
      client.get(`/users/${userId}`),
      client.get(`/users/${userId}/posts`),
      client.get(`/users/${userId}/reels`),
      client.get(`/users/${userId}/star-submissions`),
    ]);
    setProfile(profileRes.data);
    setPosts(postsRes.data);
    setReels(reelsRes.data);
    setContests(contestsRes.data);
    navigation.setOptions({ title: profileRes.data.name });
    loadSaved();
    loadReshared();
  }, [userId, navigation, loadSaved, loadReshared]);

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
      {!!profile.county && <Text style={styles.metaLine}>{profile.county}</Text>}

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
      </View>

      <StudentLeaderCard info={profile.studentLeaderInfo} />

      <View style={styles.segment}>
        <TouchableOpacity style={[styles.segmentItem, activeTab === "Posts" && styles.segmentItemActive]} onPress={() => setActiveTab("Posts")}>
          <Text style={[styles.segmentText, activeTab === "Posts" && styles.segmentTextActive]}>Posts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentItem, activeTab === "Reels" && styles.segmentItemActive]} onPress={() => setActiveTab("Reels")}>
          <Text style={[styles.segmentText, activeTab === "Reels" && styles.segmentTextActive]}>Reels</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentItem, activeTab === "Contests" && styles.segmentItemActive]} onPress={() => setActiveTab("Contests")}>
          <Text style={[styles.segmentText, activeTab === "Contests" && styles.segmentTextActive]}>My Contests</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (activeTab === "Contests") {
    return (
      <FlatList
        key="Contests"
        style={styles.container}
        data={contests}
        numColumns={3}
        keyExtractor={(s) => s.id}
        ListHeaderComponent={header}
        ListEmptyComponent={<Text style={styles.empty}>No contest entries yet</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.reelTile}
            onPress={() => navigation.navigate("StarSubmissionDetail", { submissionId: item.id })}
          >
            <Video source={{ uri: item.videoUrl }} style={styles.reelTileMedia} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
            <View style={styles.contestTileTag}><Text style={styles.contestTileTagText}>#{item.code}</Text></View>
            <View style={styles.contestTilePts}><Text style={styles.contestTilePtsText}>{item.points}</Text></View>
            <View style={[styles.contestStatusPill, item.contestEnded ? styles.contestStatusEnded : styles.contestStatusLive]}>
              <Text style={styles.contestStatusText}>{item.contestEnded ? "ENDED" : "LIVE"}</Text>
            </View>
            <Ionicons name="play" size={16} color="#fff" style={styles.reelTilePlayIcon} />
          </TouchableOpacity>
        )}
      />
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
          <AdCard ad={item} />
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
  contestTileTag: { position: "absolute", left: 3, bottom: 3, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  contestTileTagText: { color: "#fff", fontSize: 8, fontWeight: "700" },
  contestTilePts: { position: "absolute", top: 3, left: 3, backgroundColor: "#F5A623", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  contestTilePtsText: { color: "#241a06", fontSize: 8, fontWeight: "800" },
  contestStatusPill: { position: "absolute", right: 3, bottom: 3, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  contestStatusLive: { backgroundColor: COLORS.accentInk },
  contestStatusEnded: { backgroundColor: "rgba(0,0,0,0.55)" },
  contestStatusText: { color: "#fff", fontSize: 7, fontWeight: "800" },
  empty: { textAlign: "center", color: "#999", marginTop: 20 },
});
