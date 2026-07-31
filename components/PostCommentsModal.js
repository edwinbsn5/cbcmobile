import React, { useRef } from "react";
import { View, Text, TouchableOpacity, Image, StyleSheet, Modal, Animated, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import FeedVideoPlayer from "./FeedVideoPlayer";
import CommentsSheet from "./CommentsSheet";
import Avatar from "./Avatar";
import { COLORS } from "../theme";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * Full-screen comments overlay for a Feed/Group/Page post (photo or video) —
 * the scrolling-list equivalent of Reels' in-place shrink. Since these
 * posts live inline in a FlatList rather than already being full-screen,
 * this mounts a dedicated fresh media instance in a Modal instead of
 * resizing the list item itself; a fresh video instance means playback
 * restarts from 0 rather than continuing the in-list video's position — an
 * accepted trade-off given these posts aren't full-screen to begin with.
 */
export default function PostCommentsModal({ visible, post, basePath, onClose }) {
  const insets = useSafeAreaInsets();
  const progress = useRef(new Animated.Value(0)).current;

  if (!post) return null;

  const mediaAnimatedStyle = {
    transform: [
      { scale: progress.interpolate({ inputRange: [0, 1, 2], outputRange: [1, 0.36, 0.12] }) },
      { translateY: progress.interpolate({ inputRange: [0, 1, 2], outputRange: [0, -(SCREEN_HEIGHT * 0.32), -(SCREEN_HEIGHT * 0.44)] }) },
    ],
  };

  const isVideo = post.type === "video" && !!post.mediaUrl;
  const photoUri = post.photoUrls?.[0] || post.mediaUrl;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
          <View style={styles.headerLeft}>
            <Avatar uri={post.author?.avatar} name={post.author?.name} style={styles.avatar} />
            <Text style={styles.authorName} numberOfLines={1}>{post.author?.name}</Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.mediaArea}>
          <Animated.View style={[styles.mediaInner, mediaAnimatedStyle]}>
            {isVideo ? (
              <FeedVideoPlayer uri={post.mediaUrl} poster={post.thumbnailUrl} isActive variant="fullscreen" onPressBody={() => {}} />
            ) : (
              <Image source={{ uri: photoUri }} style={styles.image} resizeMode="contain" />
            )}
          </Animated.View>
        </View>

        <CommentsSheet
          progress={progress}
          basePath={basePath}
          commentCountHint={post.commentCount || 0}
          onClose={onClose}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 14, paddingBottom: 10 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 12 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: "#333" },
  authorName: { color: "#fff", fontWeight: "700", fontSize: 13.5, flexShrink: 1 },
  closeButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center" },
  mediaArea: { flex: 1, overflow: "hidden" },
  mediaInner: { width: "100%", height: SCREEN_HEIGHT, backgroundColor: "#000" },
  image: { width: "100%", height: "100%" },
});
