import React, { useCallback, useMemo, useState } from "react";
import { View, FlatList, Image, RefreshControl, ActivityIndicator, StyleSheet, TouchableOpacity, Text } from "react-native";
import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import PostCard from "../components/PostCard";
import AdCard from "../components/AdCard";
import AdMobBanner from "../components/AdMobBanner";
import StoriesBar from "../components/StoriesBar";
import ComradesNearby from "../components/ComradesNearby";
import FeaturedGroupCard from "../components/FeaturedGroupCard";
import FeaturedPageCard from "../components/FeaturedPageCard";
import Avatar from "../components/Avatar";
import { useSaved } from "../hooks/useSaved";
import { useReshared } from "../hooks/useReshared";
import { useSingleActiveVideo } from "../hooks/useSingleActiveVideo";
import { COLORS } from "../theme";

const QUICK_LINKS = [
  { icon: "flash-outline", label: "Mtu Wako", screen: "Pages" },
  { icon: "calendar-outline", label: "Events", screen: "Events" },
  { icon: "cart-outline", label: "A Girls Market", screen: "AGirlsMarket" },
  { icon: "people-outline", label: "Plugs Wako", screen: "Groups" },
];

// A feed row counts as "a video" for autoplay/fullscreen purposes whether
// it's a plain post or a reshare wrapping a video post — everything else
// (ads, the Comrades Nearby carousel, image/text posts) is ineligible.
function isVideoItem(item) {
  if (item.kind === "post") return item.type === "video";
  if (item.kind === "reshare") return item.post?.type === "video";
  return false;
}

export default function FeedScreen({ navigation }) {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [feed, setFeed] = useState([]);
  const [storyGroups, setStoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { isSaved, toggleSave, loadSaved } = useSaved();
  const { isReshared, unreshare, loadReshared } = useReshared();
  const { activeIndex, viewabilityConfig, onViewableItemsChanged } = useSingleActiveVideo({
    threshold: 50,
    isEligible: isVideoItem,
  });

  const load = useCallback(async () => {
    const [feedRes, storiesRes] = await Promise.all([
      client.get("/feed"),
      client.get("/stories"),
    ]);
    setFeed(feedRes.data);
    setStoryGroups(storiesRes.data);
    loadSaved();
    loadReshared();
  }, [loadSaved, loadReshared]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  // Group posts now appear here too (see backend routes/feed.js), but they
  // still live behind their own group-scoped react/delete routes — a plain
  // /feed/:id call would 404 for them, so look up which one this post
  // actually needs from the already-loaded feed data.
  function groupIdFor(postId) {
    const item = feed.find((it) => (it.kind === "post" && it.id === postId) || (it.kind === "reshare" && it.post.id === postId));
    return item?.groupId || item?.post?.groupId || null;
  }

  async function handleReact(postId, reaction) {
    const groupId = groupIdFor(postId);
    if (groupId) await client.post(`/groups/${groupId}/posts/${postId}/react`, { reaction });
    else await client.post(`/feed/${postId}/react`, { reaction });
    load();
  }

  async function handleDeletePost(postId) {
    const groupId = groupIdFor(postId);
    if (groupId) await client.delete(`/groups/${groupId}/posts/${postId}`);
    else await client.delete(`/feed/${postId}`);
    load();
  }

  async function handleFollow(userId) {
    await client.post(`/users/${userId}/follow`);
    load();
  }

  // Feed-order, index-stable list of the actual video posts (reshares
  // unwrapped to their underlying post) — this is what the fullscreen
  // "Watch" overlay pages through, not the raw mixed-content feed array.
  const videoPosts = useMemo(
    () => feed.filter(isVideoItem).map((item) => (item.kind === "reshare" ? item.post : item)),
    [feed]
  );

  function openVideoFullscreen(postId) {
    const startIndex = videoPosts.findIndex((p) => p.id === postId);
    navigation.navigate("FeedVideoFullscreen", { videos: videoPosts, startIndex: startIndex >= 0 ? startIndex : 0 });
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const hasRealContent = feed.some((item) => item.kind === "post" || item.kind === "reshare");

  return (
    <FlatList
      style={styles.container}
      data={feed}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      windowSize={5}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={50}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <>
          <View style={styles.quickRow}>
            {QUICK_LINKS.map((item) => (
              <TouchableOpacity key={item.screen} style={styles.quickItem} onPress={() => navigation.navigate(item.screen)}>
                <View style={styles.quickIconWrap}>
                  <Ionicons name={item.icon} size={18} color={COLORS.accent} />
                </View>
                <Text style={styles.quickLabel}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <StoriesBar
            storyGroups={storyGroups}
            myUserId={user?.id}
            onOpenStory={(group) => navigation.navigate("StoryViewer", { storyGroups, startGroupId: group.author.id })}
            onAddStory={() => navigation.navigate("CreateStory")}
          />

          <TouchableOpacity style={styles.composer} onPress={() => navigation.navigate("CreatePost")}>
            <Avatar uri={user?.avatar} name={user?.name} style={styles.avatar} />
            <Text style={styles.composerText}>What's on your mind?</Text>
          </TouchableOpacity>

          {!hasRealContent && (
            <Text style={styles.empty}>
              Your feed is empty — it only shows your own posts and posts from people you follow. Visit a profile and tap Follow to see more here.
            </Text>
          )}
        </>
      }
      renderItem={({ item, index }) => {
        if (item.kind === "ad") {
          // The "Google Ad" slot renders a real AdMob banner instead of an
          // admin-entered db.ads row — see services/feedComposer.js's
          // pushSlot("googleAd"), which always emits network: "google" here
          // regardless of that pool's contents. Every other ad slot
          // (sponsored/boosted) is unchanged.
          if (item.network === "google") return <AdMobBanner />;
          return <AdCard ad={item} />;
        }
        if (item.kind === "nearby") {
          return (
            <ComradesNearby
              users={item.users}
              onFollow={handleFollow}
              onOpenProfile={(userId) => navigation.navigate("UserProfile", { userId })}
            />
          );
        }
        if (item.kind === "featuredGroups") {
          return (
            <FeaturedGroupCard
              group={item}
              onPress={() => navigation.navigate("GroupDetail", { groupId: item.groupId })}
            />
          );
        }
        if (item.kind === "featuredPages") {
          return (
            <FeaturedPageCard
              page={item}
              onPress={() => navigation.navigate("PageDetail", { pageId: item.pageId })}
            />
          );
        }
        if (item.kind === "reels") {
          return (
            <View style={styles.reelsSection}>
              <Text style={styles.sectionTitle}>Suggested Reels</Text>
              <FlatList
                horizontal
                showsHorizontalScrollIndicator={false}
                data={item.items}
                keyExtractor={(r) => r.id}
                contentContainerStyle={{ paddingHorizontal: 10 }}
                renderItem={({ item: reel, index: reelIndex }) => (
                  <TouchableOpacity style={styles.reelCard} onPress={() => navigation.navigate("Reels", { startIndex: reelIndex })}>
                    <Image source={{ uri: reel.thumbnailUrl }} style={styles.reelThumb} resizeMode="cover" />
                    <View style={styles.reelPlayBadge}>
                      <Ionicons name="play" size={12} color="#fff" />
                    </View>
                    {!!reel.caption && (
                      <Text style={styles.reelCaption} numberOfLines={2}>{reel.caption}</Text>
                    )}
                  </TouchableOpacity>
                )}
              />
            </View>
          );
        }
        const isActive = isFocused && index === activeIndex;
        const shouldMount = activeIndex >= 0 && Math.abs(index - activeIndex) <= 1;
        if (item.kind === "reshare") {
          return (
            <View>
              <View style={styles.reshareHeader}>
                <Ionicons name="repeat-outline" size={14} color={COLORS.sub} />
                <Text style={styles.reshareHeaderText}>{item.sharedBy?.name} shared this</Text>
              </View>
              {!!item.caption && <Text style={styles.reshareCaption}>{item.caption}</Text>}
              <PostCard
                post={item.post}
                onReact={handleReact}
                isSaved={isSaved("post", item.post.id)}
                onToggleSave={() => toggleSave("post", item.post.id)}
                isReshared={isReshared(item.post.id)}
                onUnreshare={() => unreshare(item.post.id)}
                onDelete={handleDeletePost}
                onChanged={load}
                isActive={isActive}
                shouldMount={shouldMount}
                onOpenVideoFullscreen={openVideoFullscreen}
              />
            </View>
          );
        }
        return (
          <PostCard
            post={item}
            onReact={handleReact}
            isSaved={isSaved("post", item.id)}
            onToggleSave={() => toggleSave("post", item.id)}
            isReshared={isReshared(item.id)}
            onUnreshare={() => unreshare(item.id)}
            onDelete={handleDeletePost}
            onChanged={load}
            isActive={isActive}
            shouldMount={shouldMount}
            onOpenVideoFullscreen={openVideoFullscreen}
          />
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  quickRow: { flexDirection: "row", paddingHorizontal: 10, paddingTop: 10, gap: 8 },
  quickItem: { flex: 1, alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, paddingVertical: 10 },
  quickIconWrap: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center", marginBottom: 6 },
  quickLabel: { fontSize: 11, fontWeight: "700", color: COLORS.ink },
  reshareHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 20, marginTop: 6 },
  reshareHeaderText: { fontSize: 12, fontWeight: "700", color: COLORS.sub },
  reshareCaption: { fontSize: 14, color: COLORS.ink, marginHorizontal: 20, marginTop: 4, lineHeight: 19 },
  composer: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, margin: 10, borderRadius: 10, padding: 12, gap: 10 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.wash },
  composerText: { color: COLORS.sub, fontSize: 15 },
  reelsSection: { marginTop: 8, paddingBottom: 8 },
  sectionTitle: { fontSize: 13, fontWeight: "700", color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.5, marginLeft: 10, marginBottom: 8 },
  reelCard: { width: 100, height: 160, borderRadius: 14, overflow: "hidden", marginRight: 10, backgroundColor: COLORS.wash },
  reelThumb: { width: "100%", height: "100%", position: "absolute" },
  reelPlayBadge: {
    position: "absolute", top: 8, right: 8, width: 22, height: 22, borderRadius: 11,
    backgroundColor: "rgba(0,0,0,0.45)", alignItems: "center", justifyContent: "center",
  },
  reelCaption: {
    position: "absolute", left: 6, right: 6, bottom: 6, color: "#fff", fontSize: 10, fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 3,
  },
  empty: { textAlign: "center", color: "#999", marginTop: 30, marginHorizontal: 24, lineHeight: 20 },
});
