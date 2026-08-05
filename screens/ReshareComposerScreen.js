import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Keyboard } from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

export default function ReshareComposerScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { post } = route.params;
  const [caption, setCaption] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Same manual keyboard-height tracking as ChatScreen.js — see its comment
  // for why KeyboardAvoidingView's automatic behavior isn't reliable here.
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => setKeyboardHeight(e.endCoordinates?.height || 0));
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  async function handleShare() {
    setSubmitting(true);
    try {
      await client.post(`/feed/${post.id}/reshare`, { caption: caption.trim() || undefined });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't reshare", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 14, marginBottom: keyboardHeight }]}>
      <TextInput
        style={styles.captionInput}
        placeholder="Say something about this (optional)"
        placeholderTextColor={COLORS.sub}
        value={caption}
        onChangeText={setCaption}
        multiline
        autoFocus
      />

      <View style={styles.preview}>
        <View style={styles.previewHeader}>
          <Avatar uri={post.author?.avatar} name={post.author?.name} style={styles.avatar} />
          <Text style={styles.previewName}>{post.author?.name}</Text>
        </View>
        {!!post.content && <Text style={styles.previewContent} numberOfLines={4}>{post.content}</Text>}
        {!!post.mediaUrl && post.type !== "video" && (
          <Image source={{ uri: post.mediaUrl }} style={styles.previewMedia} contentFit="cover" />
        )}
        {post.photoUrls?.length > 1 && (
          <Text style={styles.photoCountBadge}>+{post.photoUrls.length - 1} more photo{post.photoUrls.length - 1 === 1 ? "" : "s"}</Text>
        )}
      </View>

      <TouchableOpacity style={[styles.shareButton, submitting && styles.shareButtonDisabled]} onPress={handleShare} disabled={submitting}>
        <Text style={styles.shareButtonText}>{submitting ? "Sharing..." : "Share now"}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 14 },
  captionInput: { backgroundColor: COLORS.surface, color: COLORS.ink, borderRadius: 10, padding: 12, fontSize: 15, minHeight: 60, textAlignVertical: "top" },
  preview: { backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, padding: 12, marginTop: 14 },
  previewHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  avatar: { width: 28, height: 28, borderRadius: 14 },
  previewName: { fontWeight: "700", fontSize: 13, color: COLORS.ink },
  previewContent: { fontSize: 13, color: COLORS.ink, lineHeight: 18 },
  previewMedia: { width: "100%", height: 140, borderRadius: 8, marginTop: 8, backgroundColor: COLORS.wash },
  photoCountBadge: { color: COLORS.accent, fontSize: 11.5, fontWeight: "700", marginTop: 6 },
  shareButton: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 16 },
  shareButtonDisabled: { opacity: 0.6 },
  shareButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 15 },
});
