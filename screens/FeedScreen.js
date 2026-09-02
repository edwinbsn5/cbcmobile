import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, FlatList, RefreshControl, ActivityIndicator, StyleSheet, TouchableOpacity, Text, Alert } from "react-native";
import { Image } from "expo-image";
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
  { icon: "flash-outline", label: "BSN & Services", screen: "Pages" },
  { icon: "calendar-outline", label: "Events", screen: "Events" },
  { icon: "cart-outline", label: "MarketPlace", screen: "AGirlsMarket" },
  { icon: "people-outline", label: "Plugs & Mentors", screen: "Groups" },
];

// A feed row counts as "a video" for autoplay/fullscreen purposes whether
// it's a plain post or a reshare wrapping a video post — everything else
// (ads, the Comrades Nearby carousel, image/text posts) is ineligible.
function isVideoItem(item) {
  if (item.kind === "post") return item.type === "video";
  if (item.kind === "reshare") return item.post?.type === "video";
  return false;
}

// "For You" (a global, ranked-by-interest discovery feed) is what a user
// lands on when they open the app — "Following" (their own connections-only
// feed, previously the only home feed) is one tab away.
const DEFAULT_TAB = "forYou";

export default function FeedScreen({ navigation, route }) {
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const [activeTab, setActiveTab] = useState(DEFAULT_TAB);
  const [feed, setFeed] = useState([]);
  // Every feed endpoint now returns { items, nextCursor } instead of a bare
  // array — nextCursor is null once there's nothing further to page in.
  // loadingMore guards against onEndReached firing a second request while
  // one's already in flight (FlatList can fire it more than once near the
  // threshold).
  const [nextCursor, setNextCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);
  // Partners is gated behind having an active boost — a 403 from
  // GET /feed/partners means "not eligible right now", not a real error, so
  // it's tracked separately from a genuinely-empty feed (see load() below).
  const [partnersLocked, setPartnersLocked] = useState(false);
  const [storyGroups, setStoryGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  // Whether this screen has EVER completed a load, on any tab — distinct
  // from feed.length, which can legitimately be 0 for a reason that has
  // nothing to do with "still loading for the first time" (an empty
  // Following feed, a locked/empty Partners tab). Using feed.length for
  // that check meant switching away from an empty tab re-triggered the
  // full-screen spinner as if the whole screen were loading from scratch.
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  // Arriving here via a "commented/reshared your post" notification tap —
  // scroll to that post and pop its comments open once the feed loads.
  // Home is a bottom-tab screen that Expo/React Navigation keeps mounted
  // once visited, so a SECOND notification tap while it's already mounted
  // delivers new route.params without remounting the component — reading
  // route.params only into a useState initializer (as this used to) would
  // silently miss every tap after the first, since useState's initial value
  // is only ever used on mount. Watching route.params in an effect instead
  // picks up each new arrival regardless of mount state.
  const [focusPostId, setFocusPostId] = useState(null);
  const [focusCommentId, setFocusCommentId] = useState(null);
  useEffect(() => {
    if (route.params?.focusPostId) {
      setFocusPostId(route.params.focusPostId);
      setFocusCommentId(route.params.focusCommentId ?? null);
    }
  }, [route.params?.focusPostId, route.params?.focusCommentId]);
  const listRef = useRef(null);
  const { isSaved, toggleSave, loadSaved } = useSaved();
  const { isReshared, unreshare, loadReshared } = useReshared();
  const { activeIndex, viewabilityConfig, onViewableItemsChanged } = useSingleActiveVideo({
    threshold: 50,
    isEligible: isVideoItem,
  });

  const endpointFor = (tab) => (tab === "partners" ? "/feed/partners" : tab === "forYou" ? "/feed/for-you" : "/feed");

  const load = useCallback(async () => {
    try {
      const [feedRes, storiesRes] = await Promise.all([client.get(endpointFor(activeTab)), client.get("/stories")]);
      setPartnersLocked(false);
      setFeed(feedRes.data.items);
      setNextCursor(feedRes.data.nextCursor);
      setStoryGroups(storiesRes.data);
      loadSaved();
      loadReshared();
    } catch (e) {
      if (activeTab === "partners" && e.response?.status === 403) {
        setPartnersLocked(true);
        setFeed([]);
        setNextCursor(null);
        return;
      }
      throw e;
    } finally {
      setHasLoadedOnce(true);
    }
  }, [activeTab, loadSaved, loadReshared]);

  async function loadMore() {
    if (loadingMore || !nextCursor || partnersLocked) return;
    setLoadingMore(true);
    try {
      const { data } = await client.get(endpointFor(activeTab), { params: { cursor: nextCursor } });
      setFeed((prev) => [...prev, ...data.items]);
      setNextCursor(data.nextCursor);
    } catch (e) {
      // Silent — a failed "load more" shouldn't interrupt someone mid-scroll
      // with an alert; they can just keep scrolling and it'll retry.
    } finally {
      setLoadingMore(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      load()
        .catch((e) => Alert.alert("Couldn't load feed", e.response?.data?.error || e.message))
        .finally(() => setLoading(false));
    }, [load])
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }

  function switchTab(tab) {
    if (tab === activeTab) return;
    setLoading(true);
    setActiveTab(tab);
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
    try {
      const groupId = groupIdFor(postId);
      if (groupId) await client.post(`/groups/${groupId}/posts/${postId}/react`, { reaction });
      else await client.post(`/feed/${postId}/react`, { reaction });
      load();
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
  }

  async function handleDeletePost(postId) {
    try {
      const groupId = groupIdFor(postId);
      if (groupId) await client.delete(`/groups/${groupId}/posts/${postId}`);
      else await client.delete(`/feed/${postId}`);
      load();
    } catch (e) {
      Alert.alert("Couldn't delete post", e.response?.data?.error || e.message);
    }
  }

  async function handleFollow(userId) {
    try {
      await client.post(`/users/${userId}/follow`);
      load();
    } catch (e) {
      Alert.alert("Couldn't follow", e.response?.data?.error || e.message);
    }
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

  useEffect(() => {
    if (!focusPostId || !feed.length) return;
    const index = feed.findIndex(
      (item) => (item.kind === "post" && item.id === focusPostId) || (item.kind === "reshare" && item.post.id === focusPostId)
    );
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: true, viewPosition: 0.15 });
    }
    setFocusPostId(null);
    setFocusCommentId(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [feed, focusPostId]);

  // Only the very first load (nothing to show yet) takes over the whole
  // screen — switching tabs keeps the header (incl. the tab buttons
  // themselves) mounted and just leaves the previous tab's content up until
  // the new tab's data arrives, so the buttons never flicker away.
  if (loading && !hasLoadedOnce) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const hasRealContent = feed.some((item) => item.kind === "post" || item.kind === "reshare");

  return (
    <FlatList
      ref={listRef}
      style={styles.container}
      data={feed}
      keyExtractor={(item) => `${item.kind}-${item.id}`}
      windowSize={5}
      maxToRenderPerBatch={5}
      updateCellsBatchingPeriod={50}
      viewabilityConfig={viewabilityConfig}
      onViewableItemsChanged={onViewableItemsChanged}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.15 }), 300);
      }}
      onEndReached={loadMore}
      onEndReachedThreshold={0.6}
      ListFooterComponent={loadingMore ? <ActivityIndicator style={styles.footerLoader} color={COLORS.accent} /> : null}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      ListHeaderComponent={
        <>
          <View style={styles.quickRow}>
            {QUICK_LINKS.map((item) => (
              <TouchableOpacity key={item.screen} style={styles.quickItem} onPress={() => navigation.navigate(item.screen)}>
                <View style={styles.quickIconWrap}>
                  <Ionicons name={item.icon} size={18} color={COLORS.accent} />
                </View>
                <Text style={styles.quickLabel} numberOfLines={2}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <StoriesBar
            storyGroups={storyGroups}
            myUserId={user?.id}
            myAvatar={user?.avatar}
            myName={user?.name}
            onOpenStory={(group) => navigation.navigate("StoryViewer", { storyGroups, startGroupId: group.author.id })}
            onAddStory={() => navigation.navigate("CreateStory")}
          />

          <View style={styles.feedTabs}>
            <TouchableOpacity style={styles.feedTab} onPress={() => switchTab("partners")}>
              <Text style={[styles.feedTabText, activeTab === "partners" && styles.feedTabTextActive]}>Partners</Text>
              {activeTab === "partners" && <View style={styles.feedTabUnderline} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.feedTab} onPress={() => switchTab("following")}>
              <Text style={[styles.feedTabText, activeTab === "following" && styles.feedTabTextActive]}>Following</Text>
              {activeTab === "following" && <View style={styles.feedTabUnderline} />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.feedTab} onPress={() => switchTab("forYou")}>
              <Text style={[styles.feedTabText, activeTab === "forYou" && styles.feedTabTextActive]}>For You</Text>
              {activeTab === "forYou" && <View style={styles.feedTabUnderline} />}
            </TouchableOpacity>
          </View>

          {activeTab === "partners" && partnersLocked ? (
            <View style={styles.partnersLockWrap}>
              <View style={styles.partnersLockIconWrap}>
                <Ionicons name="ribbon-outline" size={22} color={COLORS.accent} />
              </View>
              <Text style={styles.partnersLockTitle}>Partners is for boosted businesses</Text>
              <Text style={styles.partnersLockText}>
                Boost a Page, post, group, event, or Marketplace listing to unlock this space — swap marketing tips and experiences with other boosted members.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.composer}>
                <TouchableOpacity
                  style={styles.composerMain}
                  onPress={() => navigation.navigate("CreatePost", activeTab === "partners" ? { partnersFeed: true } : undefined)}
                >
                  <Avatar uri={user?.avatar} name={user?.name} style={styles.avatar} />
                  <Text style={styles.composerText} numberOfLines={1}>
                    {activeTab === "partners"
                      ? "Share a marketing tip or experience..."
                      : `What's on your mind${user?.name ? `, ${user.name.split(" ")[0]}` : ""}?`}
                  </Text>
                </TouchableOpacity>
                <View style={styles.composerIcons}>
                  <TouchableOpacity
                    style={styles.composerIconCircle}
                    onPress={() => navigation.navigate("CreatePost", { autoAction: "photo", ...(activeTab === "partners" ? { partnersFeed: true } : {}) })}
                  >
                    <Ionicons name="image-outline" size={18} color={COLORS.ink} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.composerIconCircle}
                    onPress={() => navigation.navigate("CreatePost", { autoAction: "textStyle", ...(activeTab === "partners" ? { partnersFeed: true } : {}) })}
                  >
                    <Text style={styles.composerAaText}>Aa</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {!hasRealContent && (
                <Text style={styles.empty}>
                  {activeTab === "following"
                    ? "Your Following feed is empty — it only shows your own posts and posts from people you follow. Visit a profile and tap Follow to see more here."
                    : activeTab === "partners"
                    ? "Nothing here yet — be the first to share a marketing tip or experience with other boosted members."
                    : "Nothing to show yet — check back once more people are posting."}
                </Text>
              )}
            </>
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
                    <Image source={{ uri: reel.thumbnailUrl }} style={styles.reelThumb} contentFit="cover" />
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
                autoOpenComments={!!focusCommentId && item.post.id === focusPostId}
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
            autoOpenComments={!!focusCommentId && item.id === focusPostId}
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
  quickLabel: { fontSize: 11, fontWeight: "700", color: COLORS.ink, textAlign: "center", lineHeight: 14, minHeight: 28 },
  feedTabs: { flexDirection: "row", marginHorizontal: 10, marginTop: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  feedTab: { flex: 1, alignItems: "center", paddingBottom: 10 },
  feedTabText: { fontSize: 14, fontWeight: "700", color: COLORS.sub },
  feedTabTextActive: { color: COLORS.ink },
  feedTabUnderline: { marginTop: 8, height: 3, width: 40, borderRadius: 2, backgroundColor: COLORS.accent },
  partnersLockWrap: { alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 14, margin: 10, padding: 22 },
  partnersLockIconWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  partnersLockTitle: { fontSize: 15, fontWeight: "700", color: COLORS.ink, marginBottom: 6, textAlign: "center" },
  partnersLockText: { fontSize: 13, color: COLORS.sub, textAlign: "center", lineHeight: 19 },
  reshareHeader: { flexDirection: "row", alignItems: "center", gap: 6, marginHorizontal: 20, marginTop: 6 },
  reshareHeaderText: { fontSize: 12, fontWeight: "700", color: COLORS.sub },
  reshareCaption: { fontSize: 14, color: COLORS.ink, marginHorizontal: 20, marginTop: 4, lineHeight: 19 },
  composer: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, margin: 10, borderRadius: 10, padding: 12, gap: 10 },
  composerMain: { flexDirection: "row", alignItems: "center", flex: 1, gap: 10, minWidth: 0 },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.wash },
  composerText: { color: COLORS.sub, fontSize: 15, flex: 1 },
  composerIcons: { flexDirection: "row", alignItems: "center", gap: 7 },
  composerIconCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  composerAaText: { fontWeight: "700", fontSize: 15, color: COLORS.ink },
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
  footerLoader: { marginVertical: 20 },
});
