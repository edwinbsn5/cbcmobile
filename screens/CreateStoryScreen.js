import React, { useState, useRef, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";
import ColorSwatchPicker from "../components/ColorSwatchPicker";
import TextAlignPicker from "../components/TextAlignPicker";
import { BG_COLORS, TEXT_COLORS } from "../utils/textStyleColors";
import { prepareVideoUpload } from "../utils/prepareVideoUpload";

export default function CreateStoryScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState("media");
  const [media, setMedia] = useState(null); // { uri, type, mimeType, fileName }
  const [posting, setPosting] = useState(false);
  const [preparingVideo, setPreparingVideo] = useState(false);

  // Text-story canvas — defaults to the first palette color rather than
  // blank, so switching into Text mode immediately shows a colored canvas
  // (matching Facebook's own text-story entry point).
  const [text, setText] = useState("");
  const [bgColor, setBgColor] = useState(BG_COLORS[0]);
  const [textColor, setTextColor] = useState(null);
  const [textAlign, setTextAlign] = useState("center");
  const textInputRef = useRef(null);

  // A plain `autoFocus` on this multiline input drops focus again almost
  // immediately on some Android devices (Samsung/One UI in particular) when
  // combined with `textAlignVertical: "center"` — a documented RN/Android
  // interaction, not specific to this screen. Focusing manually after the
  // mode-switch animation settles avoids the race that triggers it.
  useEffect(() => {
    if (mode !== "text") return;
    const t = setTimeout(() => textInputRef.current?.focus(), 250);
    return () => clearTimeout(t);
  }, [mode]);

  async function handlePick() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo library access to add a story");

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.All, quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const type = asset.type === "video" ? "video" : "image";

    if (type === "video") {
      setPreparingVideo(true);
      try {
        const prepared = await prepareVideoUpload(asset);
        setMedia({ ...prepared, type });
      } catch (e) {
        Alert.alert("Couldn't use this video", e.message);
      } finally {
        setPreparingVideo(false);
      }
      return;
    }

    const mimeType = asset.mimeType || "image/jpeg";
    setMedia({ uri: asset.uri, type, mimeType, fileName: asset.fileName || `story.${mimeType.split("/")[1]}` });
  }

  async function handleShareMedia() {
    if (!media) return;
    setPosting(true);
    try {
      const form = new FormData();
      form.append("file", { uri: media.uri, name: media.fileName, type: media.mimeType });
      const { data: uploaded } = await client.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });
      await client.post("/stories", { mediaUrl: uploaded.url, type: uploaded.type, thumbnailUrl: uploaded.thumbnailUrl });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't post story", e.response?.data?.error || e.message);
    } finally {
      setPosting(false);
    }
  }

  async function handleShareText() {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await client.post("/stories", { type: "text", content: text.trim(), bgColor, textColor: textColor || undefined, textAlign });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't post story", e.response?.data?.error || e.message);
    } finally {
      setPosting(false);
    }
  }

  const canShare = mode === "media" ? !!media : !!text.trim();

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.modeRow}>
        <TouchableOpacity focusable={false} style={[styles.modeButton, mode === "media" && styles.modeButtonActive]} onPress={() => setMode("media")}>
          <Text style={[styles.modeText, mode === "media" && styles.modeTextActive]}>Photo/Video</Text>
        </TouchableOpacity>
        <TouchableOpacity focusable={false} style={[styles.modeButton, mode === "text" && styles.modeButtonActive]} onPress={() => setMode("text")}>
          <Text style={[styles.modeText, mode === "text" && styles.modeTextActive]}>Aa Text</Text>
        </TouchableOpacity>
      </View>

      {mode === "media" ? (
        <>
          {media ? (
            <View style={styles.previewWrap}>
              {media.type === "video" ? (
                <Video source={{ uri: media.uri }} style={styles.preview} useNativeControls resizeMode={ResizeMode.CONTAIN} />
              ) : (
                <Image source={{ uri: media.uri }} style={styles.preview} resizeMode="cover" />
              )}
              <TouchableOpacity style={styles.removeButton} onPress={() => setMedia(null)}>
                <Ionicons name="close" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.picker} onPress={handlePick} disabled={preparingVideo}>
              {preparingVideo ? (
                <ActivityIndicator color={COLORS.accent} />
              ) : (
                <Ionicons name="image-outline" size={30} color={COLORS.accent} />
              )}
              <Text style={styles.pickerText}>{preparingVideo ? "Processing video..." : "Choose a photo or video"}</Text>
              <Text style={styles.pickerHint}>Visible to everyone for 24 hours</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.shareButton, !canShare && styles.shareButtonDisabled]} onPress={handleShareMedia} disabled={!canShare || posting || preparingVideo}>
            {posting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.shareButtonText}>Share to your story</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={[styles.textCanvas, { backgroundColor: bgColor }]}>
            <TextInput
              ref={textInputRef}
              style={[styles.textCanvasInput, { color: textColor || "#FFFFFF", textAlign }]}
              placeholder="Type something..."
              placeholderTextColor={(textColor || "#FFFFFF") + "AA"}
              value={text}
              onChangeText={setText}
              multiline
            />
          </View>

          <View style={styles.styleSection}>
            <Text style={styles.styleLabel}>Background</Text>
            <ColorSwatchPicker colors={BG_COLORS} value={bgColor} onSelect={(c) => setBgColor(c || BG_COLORS[0])} size={30} />
            <Text style={[styles.styleLabel, { marginTop: 14 }]}>Font color</Text>
            <ColorSwatchPicker colors={TEXT_COLORS} value={textColor} onSelect={setTextColor} size={28} />
            <Text style={[styles.styleLabel, { marginTop: 14 }]}>Alignment</Text>
            <TextAlignPicker value={textAlign} onSelect={setTextAlign} />
          </View>

          <TouchableOpacity style={[styles.shareButton, !canShare && styles.shareButtonDisabled]} onPress={handleShareText} disabled={!canShare || posting}>
            {posting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.shareButtonText}>Share to your story</Text>}
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  modeRow: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 10, padding: 3, gap: 3, marginBottom: 14 },
  modeButton: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 8 },
  modeButtonActive: { backgroundColor: COLORS.accent },
  modeText: { fontSize: 13, fontWeight: "700", color: COLORS.sub },
  modeTextActive: { color: COLORS.accentInk },
  picker: {
    flex: 1, alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", borderRadius: 14, backgroundColor: COLORS.surface,
  },
  pickerText: { color: COLORS.accent, fontWeight: "700", fontSize: 15 },
  pickerHint: { color: COLORS.sub, fontSize: 12 },
  previewWrap: { flex: 1, borderRadius: 14, overflow: "hidden", backgroundColor: "#000" },
  preview: { width: "100%", height: "100%" },
  removeButton: {
    position: "absolute", top: 12, right: 12, width: 30, height: 30, borderRadius: 15,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  textCanvas: { minHeight: 260, borderRadius: 14, padding: 24, justifyContent: "center" },
  textCanvasInput: { fontSize: 28, fontWeight: "700" },
  styleSection: { marginTop: 14 },
  styleLabel: { fontSize: 12, fontWeight: "700", color: COLORS.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  shareButton: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 16 },
  shareButtonDisabled: { opacity: 0.5 },
  shareButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 15 },
});
