import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Dimensions, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import ReactionBar from "../components/ReactionBar";
import FeedVideoPlayer from "../components/FeedVideoPlayer";
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
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
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
    load().finally(() => setLoading(false));
  }, [authorId]);

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
    await client.post(`/reels/${reelId}/react`, { reaction });
    load();
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#fff" />;

  return (
    <FlatList
      data={reels}
      keyExtractor={(r) => r.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
      decelerationRate="fast"
      initialScrollIndex={startIndex}
      getItemLayout={(data, index) => ({ length: height, offset: height * index, index })}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      renderItem={({ item, index }) => (
        <View style={styles.slide}>
          <FeedVideoPlayer
            uri={item.videoUrl}
            poster={item.thumbnailUrl}
            isActive={isFocused && index === activeIndex}
            variant="fullscreen"
            onPressBody={() => {}}
          />
          <View style={styles.overlay} pointerEvents="box-none">
            <TouchableOpacity onPress={() => item.author?.id && navigation.navigate("UserProfile", { userId: item.author.id })}>
              <Text style={styles.author}>@{item.author?.name.replace(" ", "").toLowerCase()}</Text>
            </TouchableOpacity>
            <Text style={styles.caption}>{item.caption}</Text>
          </View>
          <View style={styles.reactionColumn} pointerEvents="box-none">
            <ReactionBar reactions={item.reactions} myUserId={user?.id} onReact={(r) => handleReact(item.id, r)} />
            <TouchableOpacity style={styles.saveButton} onPress={() => toggleSave("reel", item.id)}>
              <Ionicons name={isSaved("reel", item.id) ? "bookmark" : "bookmark-outline"} size={28} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  slide: { width, height, backgroundColor: "#000" },
  // Both pushed up from their old bottom:40 to clear FeedVideoPlayer's own
  // progress-bar/timestamp/mute overlay, which now occupies the bottom
  // ~45px of every slide.
  overlay: { position: "absolute", bottom: 70, left: 16, right: 100 },
  author: { color: "#fff", fontWeight: "700", fontSize: 15, marginBottom: 4 },
  caption: { color: "#fff", fontSize: 14 },
  reactionColumn: { position: "absolute", bottom: 70, right: 16 },
  saveButton: { marginTop: 16, alignItems: "center" },
});
