import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator } from "react-native";
import { Video, ResizeMode } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import { COLORS } from "../theme";

// Content-only edit — media isn't swappable here (that's a bigger re-upload
// flow than a basic "fix the caption" edit needs); the existing media, if
// any, is just shown for context.
export default function EditPostScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { post } = route.params;
  const [content, setContent] = useState(post.content || "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!content.trim()) return Alert.alert("Content required", "Your post can't be empty");
    setSaving(true);
    try {
      const path = post.groupId ? `/groups/${post.groupId}/posts/${post.id}` : `/feed/${post.id}`;
      await client.patch(path, { content: content.trim() });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't save changes", e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <TextInput
        style={styles.input}
        value={content}
        onChangeText={setContent}
        multiline
        autoFocus
        placeholder="What's on your mind?"
      />

      {!!post.mediaUrl && (
        <View style={styles.mediaWrap}>
          {post.type === "video" ? (
            <Video source={{ uri: post.mediaUrl }} style={styles.media} useNativeControls resizeMode={ResizeMode.CONTAIN} />
          ) : (
            <Image source={{ uri: post.mediaUrl }} style={styles.media} resizeMode="cover" />
          )}
          {post.photoUrls?.length > 1 && (
            <Text style={styles.photoCountHint}>+{post.photoUrls.length - 1} more photo{post.photoUrls.length - 1 === 1 ? "" : "s"} in this post</Text>
          )}
          <Text style={styles.mediaHint}>Media can't be changed here — delete and repost to swap it</Text>
        </View>
      )}

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.saveButtonText}>Save changes</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, fontSize: 15, minHeight: 100,
    textAlignVertical: "top", borderWidth: 1, borderColor: COLORS.border,
  },
  mediaWrap: { marginTop: 14 },
  media: { width: "100%", height: 200, borderRadius: 8, backgroundColor: "#000" },
  photoCountHint: { color: COLORS.accent, fontSize: 12, fontWeight: "700", marginTop: 6, textAlign: "center" },
  mediaHint: { color: COLORS.sub, fontSize: 12, marginTop: 6, textAlign: "center" },
  saveButton: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  saveButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 15 },
});
