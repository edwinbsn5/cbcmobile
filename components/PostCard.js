import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import ReactionBar from "./ReactionBar";
import PostOptionsMenu from "./PostOptionsMenu";
import FeedVideoPlayer from "./FeedVideoPlayer";
import PhotoCarousel from "./PhotoCarousel";
import FeedImage from "./FeedImage";
import LinkPreviewCard from "./LinkPreviewCard";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme";
import { formatCount } from "../utils/formatCount";

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function PostCard({
  post,
  onReact,
  isSaved,
  onToggleSave,
  isReshared,
  onUnreshare,
  onDelete,
  onChanged,
  isActive,
  shouldMount,
  onOpenVideoFullscreen,
}) {
  const { user } = useAuth();
  const navigation = useNavigation();
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwn = post.userId === user?.id;

  async function handleUnfollow() {
    Alert.alert(`Unfollow ${post.author?.name}?`, "", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unfollow",
        style: "destructive",
        onPress: async () => {
          await client.post(`/users/${post.author.id}/unfollow`);
          onChanged?.();
        },
      },
    ]);
  }

  function handleBlock() {
    Alert.alert(
      `Block ${post.author?.name}?`,
      "They won't be able to follow or message you, and neither of you will see each other's content.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: async () => {
            await client.post(`/users/${post.author.id}/block`);
            onChanged?.();
          },
        },
      ]
    );
  }

  function handleDelete() {
    Alert.alert("Delete post?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: () => onDelete?.(post.id) },
    ]);
  }

  const isGroupIdentity = !!post.author?.isGroup;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerLeft}
          onPress={() => {
            if (!post.author?.id) return;
            if (isGroupIdentity) navigation.navigate("GroupDetail", { groupId: post.groupId });
            else navigation.navigate("UserProfile", { userId: post.author.id });
          }}
        >
          <Avatar uri={post.author?.avatar} name={post.author?.name} style={styles.avatar} />
          <View>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{post.author?.name}</Text>
              {!!post.author?.isStudentLeader && <VerifiedBadge />}
            </View>
            <Text style={styles.time}>
              {timeAgo(post.createdAt)} ago{post.editedAt ? " · edited" : ""}
            </Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuOpen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="ellipsis-horizontal" size={20} color={COLORS.sub} />
        </TouchableOpacity>
      </View>

      {!!post.groupTag && (
        <Text style={styles.groupTagText}>📍 Posted in {post.groupTag.name}</Text>
      )}

      <PostOptionsMenu
        visible={menuOpen}
        onClose={() => setMenuOpen(false)}
        isOwn={isOwn}
        authorFirstName={post.author?.name?.split(" ")[0] || "user"}
        onEdit={() => navigation.navigate("EditPost", { post })}
        onDelete={handleDelete}
        onReport={() => navigation.navigate("ReportPost", { postId: post.id, groupId: post.groupId || undefined })}
        onUnfollow={isGroupIdentity ? undefined : handleUnfollow}
        onBlock={isGroupIdentity ? undefined : handleBlock}
      />

      {!!post.title && <Text style={styles.blogTitle}>{post.title}</Text>}
      {post.bgColor ? (
        <View style={styles.mediaFullBleed}>
          <View style={[styles.styledTextBox, { backgroundColor: post.bgColor }]}>
            <Text style={[styles.styledTextContent, { color: post.textColor || "#FFFFFF", textAlign: post.textAlign || "left" }]}>
              {post.content}
            </Text>
          </View>
        </View>
      ) : (
        !!post.content && <Text style={styles.content}>{post.content}</Text>
      )}
      {!!post.linkPreview && <LinkPreviewCard preview={post.linkPreview} />}
      {post.mediaUrl && post.type === "video" && (
        <View style={styles.mediaFullBleed}>
          <FeedVideoPlayer
            uri={post.mediaUrl}
            poster={post.thumbnailUrl}
            isActive={isActive}
            shouldMount={shouldMount}
            onPressBody={() => onOpenVideoFullscreen?.(post.id)}
          />
        </View>
      )}
      {post.type !== "video" && post.photoUrls?.length > 1 && (
        <View style={styles.mediaFullBleed}>
          <PhotoCarousel photos={post.photoUrls} />
        </View>
      )}
      {post.mediaUrl && post.type !== "video" && !(post.photoUrls?.length > 1) && (
        <View style={styles.mediaFullBleed}>
          <FeedImage uri={post.mediaUrl} />
        </View>
      )}

      <View style={styles.actionsRow}>
        <ReactionBar reactions={post.reactions} myUserId={user?.id} onReact={(r) => onReact(post.id, r)} />

        <TouchableOpacity
          style={styles.pill}
          onPress={() => navigation.navigate("Comments", { postId: post.id, groupId: post.groupId || undefined })}
        >
          <Ionicons name="chatbubble-outline" size={14} color={COLORS.accent} />
          <Text style={styles.pillText}>{formatCount(post.commentCount || 0)}</Text>
        </TouchableOpacity>

        {!post.groupId ? (
          <TouchableOpacity
            style={[styles.pill, isReshared && styles.pillActive]}
            onPress={() => {
              if (isReshared) {
                Alert.alert("Remove your reshare?", "This removes it from your followers' feeds.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Remove", style: "destructive", onPress: () => onUnreshare?.() },
                ]);
              } else {
                navigation.navigate("ReshareComposer", { post });
              }
            }}
          >
            <Ionicons name="repeat-outline" size={14} color={isReshared ? COLORS.accentInk : COLORS.accent} />
            <Text style={[styles.pillText, isReshared && styles.pillTextActive]}>{formatCount(post.reshareCount || 0)}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.pill}>
            <Ionicons name="repeat-outline" size={14} color={COLORS.accent} />
            <Text style={styles.pillText}>{formatCount(post.reshareCount || 0)}</Text>
          </View>
        )}

        <View style={styles.pill}>
          <Ionicons name="eye-outline" size={14} color={COLORS.accent} />
          <Text style={styles.pillText}>{formatCount(post.impressions || 0)}</Text>
        </View>

        {onToggleSave && (
          <TouchableOpacity style={[styles.pill, isSaved && styles.pillActive]} onPress={onToggleSave}>
            <Ionicons name={isSaved ? "bookmark" : "bookmark-outline"} size={14} color={isSaved ? COLORS.accentInk : COLORS.accent} />
            <Text style={[styles.pillText, isSaved && styles.pillTextActive]}>{formatCount(post.saveCount || 0)}</Text>
          </TouchableOpacity>
        )}
      </View>

      {post.userId === user?.id && !post.groupId && (
        <TouchableOpacity style={styles.boostRow} onPress={() => navigation.navigate("BoostPost", { post })}>
          <Text style={styles.boostText}>📣 Boost this post</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginHorizontal: 10, marginVertical: 6, shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, elevation: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  headerLeft: { flexDirection: "row", alignItems: "center", flexShrink: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginRight: 10 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  name: { fontWeight: "700", fontSize: 15, color: COLORS.ink },
  time: { color: COLORS.sub, fontSize: 12 },
  groupTagText: { color: COLORS.sub, fontSize: 11.5, fontWeight: "600", marginTop: -4, marginBottom: 8 },
  blogTitle: { fontSize: 17, fontWeight: "800", color: COLORS.ink, marginBottom: 4 },
  content: { fontSize: 15, marginBottom: 8, lineHeight: 20, color: COLORS.ink },
  // Pulls media out past the card's own padding (12) AND its horizontal
  // margin from the screen edge (10) — see PostCard's `card` style below —
  // so photos reach the true screen edges instead of stopping at the card's
  // rounded boundary. Only media does this; header/caption/actions keep the
  // card's normal padding, matching Facebook's own feed layout split.
  mediaFullBleed: { marginHorizontal: -22, marginBottom: 8 },
  styledTextBox: { minHeight: 220, justifyContent: "center", paddingVertical: 24, paddingHorizontal: 20 },
  styledTextContent: { fontSize: 24, fontWeight: "700", lineHeight: 32 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.wash, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  pillActive: { backgroundColor: COLORS.accent },
  pillText: { fontSize: 12, fontWeight: "700", color: COLORS.ink },
  pillTextActive: { color: COLORS.accentInk },
  boostRow: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  boostText: { color: COLORS.accent, fontWeight: "600", fontSize: 13 },
});
