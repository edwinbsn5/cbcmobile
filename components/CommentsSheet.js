import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet,
  ActivityIndicator, Animated, Keyboard, Alert,
} from "react-native";
import { useAnimatedKeyboard, useAnimatedReaction, runOnJS } from "react-native-reanimated";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import LinkifiedText from "./LinkifiedText";
import MentionTextInput from "./MentionTextInput";
import { COLORS } from "../theme";

// Where the sheet's top edge sits, as a percentage down the screen — also
// how much of the screen the media above it keeps (100 - this number).
// Callers read the same `progress` value to shrink their own media in sync
// (see ReelsScreen/PostCommentsModal): 0 = closed (sheet off-screen), 1 =
// open (media keeps 36%), 2 = keyboard focused (media keeps 12%).
const OPEN_TOP = 36;
const KEYBOARD_TOP = 12;
const QUICK_REACTIONS = ["😂", "😍", "🔥", "👏", "💯"];

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

function CommentNode({ comment, depth, myUserId, onReply, onDelete }) {
  return (
    <View style={[styles.node, depth > 0 && styles.nodeNested]}>
      <View style={styles.bubble}>
        <Text style={styles.author}>{comment.author?.name}</Text>
        <LinkifiedText text={comment.content} style={styles.content} />
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.time}>{timeAgo(comment.createdAt)}</Text>
        <TouchableOpacity onPress={() => onReply(comment)}>
          <Text style={styles.replyLink}>Reply</Text>
        </TouchableOpacity>
        {comment.userId === myUserId && (
          <TouchableOpacity onPress={() => onDelete(comment.id)}>
            <Text style={styles.deleteLink}>Delete</Text>
          </TouchableOpacity>
        )}
      </View>
      {comment.replies?.map((child) => (
        <CommentNode key={child.id} comment={child} depth={depth + 1} myUserId={myUserId} onReply={onReply} onDelete={onDelete} />
      ))}
    </View>
  );
}

/**
 * TikTok-style comments overlay: a bottom sheet that opens over whatever
 * media the caller is already showing, instead of navigating to a separate
 * screen — the caller's own media (video or photo) never unmounts, so
 * playback never stops. `progress` is an Animated.Value the CALLER creates
 * (useRef(new Animated.Value(0))) and reads to shrink its own media in
 * sync; this component is the one driving it (open-on-mount, keyboard
 * show/hide), the caller only interpolates from it.
 */
export default function CommentsSheet({ progress, basePath, commentCountHint = 0, onClose }) {
  const { user } = useAuth();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [replyTarget, setReplyTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [totalCount, setTotalCount] = useState(commentCountHint);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const inputRef = useRef(null);
  // Keyboard.addListener's endCoordinates.height undershoots under
  // edge-to-edge display (same root cause as ChatScreen.js) — the true
  // height comes from Android's WindowInsets IME value via reanimated
  // instead, bridged into the same `keyboardHeight` state the `bottom`
  // style below already used, so the sheet-position logic elsewhere in
  // this file (Keyboard.addListener + progress.timing) stays untouched.
  const keyboard = useAnimatedKeyboard();
  useAnimatedReaction(
    () => keyboard.height.value,
    (h, prev) => {
      if (h !== prev) runOnJS(setKeyboardHeight)(h);
    },
    []
  );

  const load = useCallback(() => {
    client.get(basePath).then((r) => {
      setTree(r.data);
      setTotalCount(countAll(r.data));
    }).catch((e) => Alert.alert("Couldn't load comments", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [basePath]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    Animated.timing(progress, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    // Tracking the keyboard's real height and applying it as this sheet's
    // `bottom` offset (below) instead of trusting Android's OS-level window
    // resize (`windowSoftInputMode="adjustResize"`) — edge-to-edge display
    // (required for API 36 / Android 15+, see app.config.js) breaks that
    // automatic resize, so a `position: absolute, bottom: 0` sheet like this
    // one would otherwise sit right behind the keyboard with the composer
    // hidden under it. See CHATSCREEN's equivalent fix for the same root cause.
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      Animated.timing(progress, { toValue: 2, duration: 200, useNativeDriver: false }).start();
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      Animated.timing(progress, { toValue: 1, duration: 200, useNativeDriver: false }).start();
    });
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [progress]);

  function handleRequestClose() {
    Keyboard.dismiss();
    Animated.timing(progress, { toValue: 0, duration: 200, useNativeDriver: false }).start(() => onClose?.());
  }

  function handleReply(comment) {
    setReplyTarget({ id: comment.id, authorName: comment.author?.name });
    inputRef.current?.focus();
  }

  function handleDelete(commentId) {
    Alert.alert("Delete comment?", "This will also delete any replies to it.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await client.delete(`/feed/comments/${commentId}`);
            load();
          } catch (e) {
            Alert.alert("Couldn't delete comment", e.response?.data?.error || e.message);
          }
        },
      },
    ]);
  }

  async function handleSubmit() {
    if (!text.trim()) return;
    setSubmitting(true);
    try {
      await client.post(basePath, { content: text.trim(), parentId: replyTarget?.id ?? null });
      setText("");
      setReplyTarget(null);
      load();
    } catch (e) {
      Alert.alert("Couldn't comment", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  const top = progress.interpolate({ inputRange: [0, 1, 2], outputRange: ["100%", `${OPEN_TOP}%`, `${KEYBOARD_TOP}%`] });

  return (
    <Animated.View style={[styles.sheet, { top, bottom: keyboardHeight }]}>
      <View style={styles.grabber} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{totalCount} Comment{totalCount === 1 ? "" : "s"}</Text>
        <TouchableOpacity style={styles.closeButton} onPress={handleRequestClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="close" size={16} color={COLORS.sub} />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} color={COLORS.accent} />
      ) : (
        <FlatList
          data={tree}
          keyExtractor={(c) => c.id}
          style={styles.list}
          contentContainerStyle={{ padding: 12 }}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <CommentNode comment={item} depth={0} myUserId={user?.id} onReply={handleReply} onDelete={handleDelete} />
          )}
          ListEmptyComponent={<Text style={styles.empty}>No comments yet — be the first to say something</Text>}
        />
      )}

      {replyTarget && (
        <View style={styles.replyBanner}>
          <Text style={styles.replyBannerText}>Replying to {replyTarget.authorName}</Text>
          <TouchableOpacity onPress={() => setReplyTarget(null)}>
            <Ionicons name="close" size={14} color={COLORS.sub} />
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.quickRow}>
        {QUICK_REACTIONS.map((e) => (
          <TouchableOpacity key={e} style={styles.chip} onPress={() => setText((t) => t + e)}>
            <Text style={styles.chipText}>{e}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.inputRow}>
        <MentionTextInput
          ref={inputRef}
          style={styles.input}
          placeholder={replyTarget ? `Reply to ${replyTarget.authorName}...` : "Write a comment..."}
          value={text}
          onChangeText={setText}
          multiline
        />
        <TouchableOpacity style={styles.sendButton} onPress={handleSubmit} disabled={submitting || !text.trim()}>
          <Ionicons name="send" size={18} color={COLORS.accentInk} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

function countAll(tree) {
  return tree.reduce((sum, c) => sum + 1 + countAll(c.replies || []), 0);
}

const styles = StyleSheet.create({
  sheet: {
    position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: COLORS.surface,
    borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: "hidden",
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 12, elevation: 12,
  },
  grabber: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: "center", marginTop: 8 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: COLORS.bg },
  headerTitle: { fontSize: 13.5, fontWeight: "800", color: COLORS.ink },
  closeButton: { width: 22, height: 22, borderRadius: 11, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  list: { flex: 1 },
  empty: { textAlign: "center", color: COLORS.sub, marginTop: 30 },
  node: { marginBottom: 10 },
  nodeNested: { marginLeft: 20, borderLeftWidth: 2, borderLeftColor: COLORS.border, paddingLeft: 10 },
  bubble: { backgroundColor: COLORS.wash, borderRadius: 12, padding: 10 },
  author: { fontWeight: "700", fontSize: 12.5, color: COLORS.ink, marginBottom: 2 },
  content: { fontSize: 13.5, color: COLORS.ink, lineHeight: 18 },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 4, marginLeft: 4 },
  time: { fontSize: 10.5, color: COLORS.sub },
  replyLink: { fontSize: 10.5, color: COLORS.accent, fontWeight: "700" },
  deleteLink: { fontSize: 10.5, color: "#D32F2F", fontWeight: "700" },
  replyBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: COLORS.wash, paddingHorizontal: 14, paddingVertical: 6 },
  replyBannerText: { fontSize: 11.5, color: COLORS.sub, fontWeight: "600" },
  quickRow: { flexDirection: "row", gap: 6, paddingHorizontal: 12, paddingTop: 6 },
  chip: { backgroundColor: COLORS.wash, borderRadius: 12, paddingHorizontal: 9, paddingVertical: 4 },
  chipText: { fontSize: 15 },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, backgroundColor: COLORS.surface },
  input: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 80, fontSize: 13.5, color: COLORS.ink },
  sendButton: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
});
