import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";
import { prepareVideoUpload } from "../utils/prepareVideoUpload";

export default function StarSubmitVideoScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { contestId } = route.params;
  const [media, setMedia] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [preparingVideo, setPreparingVideo] = useState(false);

  async function pickVideo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo library access to attach a video");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    setPreparingVideo(true);
    try {
      const prepared = await prepareVideoUpload(asset);
      setMedia(prepared);
    } catch (e) {
      Alert.alert("Couldn't use this video", e.message);
    } finally {
      setPreparingVideo(false);
    }
  }

  async function handleSubmit() {
    if (!media) return Alert.alert("Video required", "Pick a video to submit");
    setSubmitting(true);
    try {
      setUploading(true);
      const form = new FormData();
      form.append("file", { uri: media.uri, name: media.fileName, type: media.mimeType });
      const { data: uploaded } = await client.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" }, timeout: 60000,
      });
      setUploading(false);

      await client.post(`/star/contests/${contestId}/submissions`, { videoUrl: uploaded.url, caption: caption.trim() });
      Alert.alert("Submitted!", "Your video is live — share your code with friends to get votes.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't submit", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      <Text style={styles.hint}>One submission per contest — make it count!</Text>

      {media ? (
        <View style={styles.previewWrap}>
          <Video source={{ uri: media.uri }} style={styles.preview} useNativeControls resizeMode={ResizeMode.CONTAIN} />
          <TouchableOpacity style={styles.removeButton} onPress={() => setMedia(null)}>
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.pickButton} onPress={pickVideo} disabled={preparingVideo}>
          {preparingVideo ? (
            <ActivityIndicator color={COLORS.accent} />
          ) : (
            <Ionicons name="videocam-outline" size={28} color={COLORS.accent} />
          )}
          <Text style={styles.pickButtonText}>{preparingVideo ? "Processing video..." : "Choose a video"}</Text>
        </TouchableOpacity>
      )}

      <Text style={styles.label}>Caption</Text>
      <TextInput
        style={styles.input}
        placeholder="Vote for me if you dare 😂"
        value={caption}
        onChangeText={setCaption}
        multiline
        maxLength={200}
      />

      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={submitting || preparingVideo || !media}>
        {submitting ? (
          <ActivityIndicator color={COLORS.accentInk} />
        ) : (
          <Text style={styles.submitButtonText}>{uploading ? "Uploading..." : "Submit Video"}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 20 },
  hint: { color: COLORS.sub, fontSize: 12.5, marginBottom: 16, textAlign: "center" },
  pickButton: {
    backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", paddingVertical: 40, gap: 8,
  },
  pickButtonText: { color: COLORS.accent, fontWeight: "700", fontSize: 14 },
  previewWrap: { borderRadius: 10, overflow: "hidden" },
  preview: { width: "100%", height: 260, backgroundColor: "#000" },
  removeButton: {
    position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  label: { fontSize: 12.5, fontWeight: "700", color: COLORS.sub, marginTop: 20, marginBottom: 6 },
  input: {
    backgroundColor: COLORS.surface, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border,
    padding: 12, fontSize: 14, minHeight: 70, textAlignVertical: "top", color: COLORS.ink,
  },
  submitButton: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 15, alignItems: "center", marginTop: 24 },
  submitButtonText: { color: COLORS.accentInk, fontWeight: "800", fontSize: 15 },
});
