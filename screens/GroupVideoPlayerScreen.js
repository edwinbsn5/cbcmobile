import React, { useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Dimensions, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import ReactionBar from "../components/ReactionBar";
import PostOptionsMenu from "../components/PostOptionsMenu";
import FeedVideoPlayer from "../components/FeedVideoPlayer";
import CommentsSheet from "../components/CommentsSheet";
import { useSingleActiveVideo } from "../hooks/useSingleActiveVideo";
import { useAuth } from "../context/AuthContext";
import { formatCount } from "../utils/formatCount";

const { height, width } = Dimensions.get("window");

// Group Videos tab's fullscreen watch view — same vertical-paging pattern as
// the main-feed ReelsScreen, plus the report/edit/delete + comment access
// that reels don't have, since these are regular group posts (section:"video")
// under the hood and carry all of that for free.
export default function GroupVideoPlayerScreen({ route, navigation }) {
  const { groupId, startIndex = 0 } = route.params;
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuFor, setMenuFor] = useState(null);
  const [commentsOpenId, setCommentsOpenId] = useState(null);
  const commentsProgress = useRef(new Animated.Value(0)).current;
  const { activeIndex, viewabilityConfig, onViewableItemsChanged } = useSingleActiveVideo({ threshold: 80 });

  async function load() {
    const { data } = await client.get(`/groups/${groupId}/videos`);
    setVideos(data);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [groupId]);

  async function handleReact(videoId, reaction) {
    await client.post(`/groups/${groupId}/posts/${videoId}/react`, { reaction });
    load();
  }

  function handleDelete(video) {
    Alert.alert("Delete video?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await client.delete(`/groups/${groupId}/posts/${video.id}`);
          if (videos.length <= 1) navigation.goBack();
          else load();
        },
      },
    ]);
  }

  function handleUnfollow(video) {
    Alert.alert(`Unfollow ${video.author?.name}?`, "", [
      { text: "Cancel", style: "cancel" },
      { text: "Unfollow", style: "destructive", onPress: async () => { await client.post(`/users/${video.author.id}/unfollow`); } },
    ]);
  }

  function handleBlock(video) {
    Alert.alert(
      `Block ${video.author?.name}?`,
      "They won't be able to follow or message you, and neither of you will see each other's content.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Block", style: "destructive", onPress: async () => { await client.post(`/users/${video.author.id}/block`); navigation.goBack(); } },
      ]
    );
  }

  const mediaAnimatedStyle = {
    transform: [
      { scale: commentsProgress.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 0.36, 0.12] }) },
      { translateY: commentsProgress.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -(height * 0.32), -(height * 0.44)] }) },
    ],
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#fff" />;

  return (
    <FlatList
      data={videos}
      keyExtractor={(v) => v.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
      decelerationRate="fast"
      initialScrollIndex={startIndex}
      getItemLayout={(data, index) => ({ length: height, offset: height * index, index })}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      renderItem={({ item, index }) => {
        const isOwn = item.userId === user?.id;
        const commentsOpen = commentsOpenId === item.id;
        return (
          <View style={styles.slide}>
            <Animated.View style={commentsOpen ? mediaAnimatedStyle : null}>
              <FeedVideoPlayer
                uri={item.mediaUrl}
                poster={item.thumbnailUrl}
                isActive={isFocused && index === activeIndex}
                variant="fullscreen"
                onPressBody={() => {}}
              />
            </Animated.View>
            <TouchableOpacity
              style={[styles.backButton, { top: insets.top + 10 }]}
              onPress={() => navigation.goBack()}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={26} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.menuButton, { top: insets.top + 10 }]}
              onPress={() => setMenuFor(item.id)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={22} color="#fff" />
            </TouchableOpacity>

            <PostOptionsMenu
              visible={menuFor === item.id}
              onClose={() => setMenuFor(null)}
              isOwn={isOwn}
              authorFirstName={item.author?.name?.split(" ")[0] || "user"}
              onEdit={() => navigation.navigate("EditPost", { post: item })}
              onDelete={() => handleDelete(item)}
              onReport={() => navigation.navigate("ReportPost", { postId: item.id, groupId })}
              onUnfollow={() => handleUnfollow(item)}
              onBlock={() => handleBlock(item)}
            />

            <View style={[styles.overlay, { bottom: 70 + insets.bottom }]} pointerEvents="box-none">
              <TouchableOpacity onPress={() => item.author?.id && navigation.navigate("UserProfile", { userId: item.author.id })}>
                <Text style={styles.author}>{item.author?.name}</Text>
              </TouchableOpacity>
              {!!item.content && <Text style={styles.caption}>{item.content}</Text>}
            </View>

            <View style={[styles.reactionColumn, { bottom: 70 + insets.bottom }]} pointerEvents="box-none">
              <ReactionBar reactions={item.reactions} myUserId={user?.id} onReact={(r) => handleReact(item.id, r)} />
              <TouchableOpacity style={styles.commentButton} onPress={() => setCommentsOpenId(item.id)}>
                <Ionicons name="chatbubble-outline" size={26} color="#fff" />
                <Text style={styles.commentCount}>{formatCount(item.commentCount || 0)}</Text>
              </TouchableOpacity>
            </View>

            {commentsOpen && (
              <CommentsSheet
                progress={commentsProgress}
                basePath={`/groups/${groupId}/posts/${item.id}/comments`}
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
  backButton: { position: "absolute", left: 16 },
  menuButton: { position: "absolute", right: 16 },
  // Both pushed up from their old bottom:40 to clear FeedVideoPlayer's own
  // progress-bar/timestamp/mute overlay, which now occupies the bottom
  // ~45px of every slide (plus the bottom safe-area inset, applied inline).
  overlay: { position: "absolute", left: 16, right: 100 },
  author: { color: "#fff", fontWeight: "700", fontSize: 15, marginBottom: 4 },
  caption: { color: "#fff", fontSize: 14 },
  reactionColumn: { position: "absolute", right: 16, alignItems: "center" },
  commentButton: { marginTop: 16, alignItems: "center" },
  commentCount: { color: "#fff", fontWeight: "700", fontSize: 12, marginTop: 2 },
});
