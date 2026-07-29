import React, { useCallback, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import LinkifiedText from "../components/LinkifiedText";
import MentionTextInput from "../components/MentionTextInput";
import { COLORS } from "../theme";

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

// Group posts have their own membership-gated comment endpoint
// (/groups/:groupId/posts/:postId/comments); Page posts have their own too
// (/pages/:pageId/feed/:postId/comments); the main feed's is
// /feed/:postId/comments. route.params.groupId/pageId being present is what
// distinguishes the three — everything else about this screen is identical.
export default function CommentsScreen({ route }) {
  const { postId, groupId, pageId } = route.params;
  const { user } = useAuth();
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [replyTarget, setReplyTarget] = useState(null); // { id, authorName }
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const basePath = pageId
    ? `/pages/${pageId}/feed/${postId}/comments`
    : groupId
    ? `/groups/${groupId}/posts/${postId}/comments`
    : `/feed/${postId}/comments`;

  const load = useCallback(() => {
    client.get(basePath).then((r) => setTree(r.data)).finally(() => setLoading(false));
  }, [basePath]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
          await client.delete(`/feed/comments/${commentId}`);
          load();
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

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={90}>
      <FlatList
        data={tree}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding: 12 }}
        renderItem={({ item }) => (
          <CommentNode comment={item} depth={0} myUserId={user?.id} onReply={handleReply} onDelete={handleDelete} />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No comments yet — be the first to say something</Text>}
      />

      {replyTarget && (
        <View style={styles.replyBanner}>
          <Text style={styles.replyBannerText}>Replying to {replyTarget.authorName}</Text>
          <TouchableOpacity onPress={() => setReplyTarget(null)}>
            <Ionicons name="close" size={16} color={COLORS.sub} />
          </TouchableOpacity>
        </View>
      )}

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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  node: { marginBottom: 10 },
  nodeNested: { marginLeft: 20, borderLeftWidth: 2, borderLeftColor: COLORS.border, paddingLeft: 10 },
  bubble: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 10 },
  author: { fontWeight: "700", fontSize: 13, color: COLORS.ink, marginBottom: 2 },
  content: { fontSize: 14, color: COLORS.ink, lineHeight: 19 },
  metaRow: { flexDirection: "row", gap: 14, marginTop: 4, marginLeft: 4 },
  time: { fontSize: 11, color: COLORS.sub },
  replyLink: { fontSize: 11, color: COLORS.accent, fontWeight: "700" },
  deleteLink: { fontSize: 11, color: "#D32F2F", fontWeight: "700" },
  replyBanner: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: COLORS.wash, paddingHorizontal: 14, paddingVertical: 6 },
  replyBannerText: { fontSize: 12, color: COLORS.sub, fontWeight: "600" },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8, padding: 10, backgroundColor: COLORS.surface, borderTopWidth: 1, borderTopColor: COLORS.border },
  input: { flex: 1, backgroundColor: COLORS.bg, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 8, maxHeight: 100, fontSize: 14 },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", color: "#999", marginTop: 30 },
});
