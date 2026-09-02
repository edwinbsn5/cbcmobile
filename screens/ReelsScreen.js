import React, { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Dimensions, StyleSheet, TouchableOpacity, ActivityIndicator, Animated, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import ReactionBar from "../components/ReactionBar";
import FeedVideoPlayer from "../components/FeedVideoPlayer";
import CommentsSheet from "../components/CommentsSheet";
import { useSingleActiveVideo } from "../hooks/useSingleActiveVideo";
import { useAuth } from "../context/AuthContext";
import { useSaved } from "../hooks/useSaved";
import { loadInterstitial, showInterstitialAd } from "../utils/interstitialAds";

const { height, width } = Dimensions.get("window");

// Module-level, not component state — Reels can mount/unmount many times as
// the user navigates around; this makes the interstitial trigger fire once
// per app session (process lifetime) rather than once per screen mount.
let interstitialShownThisSession = false;

export default function ReelsScreen({ route, navigation }) {
  const { authorId, startIndex = 0 } = route.params || {};
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentsOpenId, setCommentsOpenId] = useState(null);
  const listRef = useRef(null);
  // Tracks the last focusReelId we've already scrolled to/opened, not just
  // "have we ever handled one" — Reels is a stack screen React Navigation
  // can bring back into focus with new params without remounting it (e.g.
  // it was already open from the "Suggested Reels" row), so a boolean
  // "handled" flag would permanently ignore every notification tap after
  // the first. Comparing against the specific id lets a new tap through
  // even if an earlier one was already processed on this same mount.
  const lastHandledReelIdRef = useRef(null);
  // Shared across every slide — only ever driven while exactly one slide has
  // comments open, so there's no cross-talk between slides. Reset to 0 by
  // CommentsSheet's own close animation before it unmounts, so it's always
  // back at rest by the time a different slide opens it.
  const commentsProgress = useRef(new Animated.Value(0)).current;
  const { isSaved, toggleSave, loadSaved } = useSaved();
  // Every row here is already a video, so the default isEligible (accept
  // everything) is exactly right — same single-active-video behavior as
  // before, just shared with Feed/Group Videos instead of duplicated.
  const { activeIndex, viewabilityConfig, onViewableItemsChanged } = useSingleActiveVideo({ threshold: 80 });

  async function load() {
    const url = authorId ? `/users/${authorId}/reels` : "/reels";
    const { data } = await client.get(url);
    setReels(data);
    loadSaved();
  }

  useEffect(() => {
    load()
      .catch((e) => Alert.alert("Couldn't load reels", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [authorId]);

  // Arriving via a "commented on your reel" notification tap — jump to that
  // reel (it may not be at startIndex/0 in this ranked list) and pop its
  // comments open. Re-runs on every new focusReelId, including a second
  // notification tap while this screen was already open (see
  // lastHandledReelIdRef's comment above for why a plain "handled once"
  // flag isn't enough here).
  useEffect(() => {
    const focusReelId = route.params?.focusReelId;
    const focusCommentId = route.params?.focusCommentId;
    if (!focusReelId || focusReelId === lastHandledReelIdRef.current || !reels.length) return;
    const index = reels.findIndex((r) => r.id === focusReelId);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, animated: false });
      if (focusCommentId) setCommentsOpenId(focusReelId);
      lastHandledReelIdRef.current = focusReelId;
    }
  }, [reels, route.params?.focusReelId, route.params?.focusCommentId]);

  // Once per session, the first time Reels is opened: load + show one
  // interstitial ad. Deliberately the only ad-frequency behavior this adds —
  // not a general interstitial system, just this one clearly-scoped trigger.
  useEffect(() => {
    if (interstitialShownThisSession) return;
    interstitialShownThisSession = true;
    loadInterstitial().then((ready) => {
      if (ready) showInterstitialAd();
    });
  }, []);

  async function handleReact(reelId, reaction) {
    try {
      await client.post(`/reels/${reelId}/react`, { reaction });
      load();
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
  }

  // Media scale/translateY shared by whichever slide currently has comments
  // open — the video is never paused or unmounted, just visually shrunk into
  // the top of the screen while CommentsSheet covers the rest (see
  // components/CommentsSheet.js's own comment on the shared `progress` value).
  const mediaAnimatedStyle = {
    transform: [
      { scale: commentsProgress.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 0.36, 0.12] }) },
      { translateY: commentsProgress.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -(height * 0.32), -(height * 0.44)] }) },
    ],
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#fff" />;

  return (
    <FlatList
      ref={listRef}
      data={reels}
      keyExtractor={(r) => r.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
      decelerationRate="fast"
      initialScrollIndex={startIndex}
      getItemLayout={(data, index) => ({ length: height, offset: height * index, index })}
      onScrollToIndexFailed={(info) => {
        setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: false }), 300);
      }}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      renderItem={({ item, index }) => {
        const commentsOpen = commentsOpenId === item.id;
        return (
          <View style={styles.slide}>
            <Animated.View style={commentsOpen ? mediaAnimatedStyle : null}>
              <FeedVideoPlayer
                uri={item.videoUrl}
                poster={item.thumbnailUrl}
                isActive={isFocused && index === activeIndex}
                variant="fullscreen"
                onPressBody={() => {}}
              />
            </Animated.View>
            <View style={[styles.overlay, { bottom: 70 + insets.bottom }]} pointerEvents="box-none">
              <TouchableOpacity onPress={() => item.author?.id && navigation.navigate("UserProfile", { userId: item.author.id })}>
                <Text style={styles.author}>@{item.author?.name.replace(" ", "").toLowerCase()}</Text>
              </TouchableOpacity>
              <Text style={styles.caption}>{item.caption}</Text>
            </View>
            <View style={[styles.reactionColumn, { bottom: 70 + insets.bottom }]} pointerEvents="box-none">
              <ReactionBar reactions={item.reactions} myUserId={user?.id} onReact={(r) => handleReact(item.id, r)} align="right" />
              <TouchableOpacity style={styles.commentButton} onPress={() => setCommentsOpenId(item.id)}>
                <Ionicons name="chatbubble-outline" size={26} color="#fff" />
                <Text style={styles.commentCount}>{item.commentCount || 0}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={() => toggleSave("reel", item.id)}>
                <Ionicons name={isSaved("reel", item.id) ? "bookmark" : "bookmark-outline"} size={28} color="#fff" />
              </TouchableOpacity>
            </View>
            {commentsOpen && (
              <CommentsSheet
                progress={commentsProgress}
                basePath={`/reels/${item.id}/comments`}
                commentCountHint={item.commentCount || 0}
                onClose={() => {
                  setCommentsOpenId(null);
                  load();
                }}
              />
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  slide: { width, height, backgroundColor: "#000" },
  // Both pushed up from their old bottom:40 to clear FeedVideoPlayer's own
  // progress-bar/timestamp/mute overlay, which now occupies the bottom
  // ~45px of every slide (plus the bottom safe-area inset, applied inline).
  overlay: { position: "absolute", left: 16, right: 100 },
  author: { color: "#fff", fontWeight: "700", fontSize: 15, marginBottom: 4 },
  caption: { color: "#fff", fontSize: 14 },
  reactionColumn: { position: "absolute", right: 16 },
  commentButton: { marginTop: 16, alignItems: "center" },
  commentCount: { color: "#fff", fontWeight: "700", fontSize: 11, marginTop: 4 },
  saveButton: { marginTop: 16, alignItems: "center" },
});
