import React, { useState, useRef, useEffect } from "react";
import { View, TextInput, TouchableOpacity, Text, StyleSheet, Image, ScrollView, ActivityIndicator, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme";
import ColorSwatchPicker from "../components/ColorSwatchPicker";
import TextAlignPicker from "../components/TextAlignPicker";
import Avatar from "../components/Avatar";
import MentionTextInput from "../components/MentionTextInput";
import { BG_COLORS, TEXT_COLORS } from "../utils/textStyleColors";
import { prepareVideoUpload } from "../utils/prepareVideoUpload";

const MAX_PHOTOS = 10;

export default function CreatePostScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [composerText, setComposerText] = useState("");
  const [media, setMedia] = useState(null); // { uri, type: "video", mimeType, fileName } — single video only
  const [photos, setPhotos] = useState([]); // [{ uri, mimeType, fileName }, ...] — 1-10 photos
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [preparingVideo, setPreparingVideo] = useState(false);

  // Colored background/font/alignment — only meaningful (and only ever
  // shown) for a pure text post, no photo or video attached.
  const [bgColor, setBgColor] = useState(null);
  const [textColor, setTextColor] = useState(null);
  const [textAlign, setTextAlign] = useState("left");
  const hasMedia = !!media || photos.length > 0;
  const styledInputRef = useRef(null);

  // Same fix as CreateStoryScreen's text canvas: a plain `autoFocus` on this
  // multiline input can drop focus again almost immediately on some Android
  // devices (Samsung/One UI in particular) when combined with
  // `textAlignVertical: "center"` — focusing manually after the swatch-pick
  // re-render settles avoids the race that triggers it.
  useEffect(() => {
    if (!bgColor) return;
    const t = setTimeout(() => styledInputRef.current?.focus(), 250);
    return () => clearTimeout(t);
    // Only re-run on the no-background -> has-background transition (like
    // the autoFocus it replaces), not on every subsequent color swap while
    // already typing.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [!!bgColor]);

  function clearTextStyle() {
    setBgColor(null);
    setTextColor(null);
    setTextAlign("left");
  }

  // A post is either the existing single video, or 1-10 photos — never both,
  // matching how the feed's swipe carousel and the single-video player are
  // mutually exclusive render paths in PostCard.
  async function handleAttachPhotos() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo library access to attach photos");

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: MAX_PHOTOS,
      quality: 0.7,
    });
    if (result.canceled || !result.assets?.length) return;

    const picked = result.assets.map((a) => ({
      uri: a.uri,
      mimeType: a.mimeType || "image/jpeg",
      fileName: a.fileName || `upload.${(a.mimeType || "image/jpeg").split("/")[1]}`,
    }));
    setMedia(null);
    clearTextStyle();
    setPhotos((prev) => {
      const combined = [...prev, ...picked];
      if (combined.length > MAX_PHOTOS) Alert.alert("Too many photos", `Only the first ${MAX_PHOTOS} photos were kept`);
      return combined.slice(0, MAX_PHOTOS);
    });
  }

  async function handleAttachVideo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo library access to attach a video");

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    setPreparingVideo(true);
    try {
      const prepared = await prepareVideoUpload(asset);
      setPhotos([]);
      clearTextStyle();
      setMedia({ ...prepared, type: "video" });
    } catch (e) {
      Alert.alert("Couldn't use this video", e.message);
    } finally {
      setPreparingVideo(false);
    }
  }

  function removePhoto(index) {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  }

  async function handlePost() {
    if (!composerText.trim() && !media && !photos.length) return;
    setPosting(true);
    try {
      let mediaUrl = null;
      let thumbnailUrl = null;
      let type = "text";
      let photoUrls;
      if (photos.length) {
        setUploading(true);
        const form = new FormData();
        photos.forEach((p) => form.append("files", { uri: p.uri, name: p.fileName, type: p.mimeType }));
        const { data } = await client.post("/upload/multiple", form, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 120000,
        });
        photoUrls = data.urls;
        setUploading(false);
      } else if (media) {
        setUploading(true);
        const form = new FormData();
        form.append("file", { uri: media.uri, name: media.fileName, type: media.mimeType });
        const { data: uploaded } = await client.post("/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
          timeout: 60000,
        });
        mediaUrl = uploaded.url;
        type = uploaded.type;
        thumbnailUrl = uploaded.thumbnailUrl;
        setUploading(false);
      }
      await client.post("/feed", {
        content: composerText.trim(),
        type,
        mediaUrl,
        thumbnailUrl,
        photoUrls,
        ...(!hasMedia && bgColor ? { bgColor, textColor: textColor || undefined, textAlign } : {}),
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't post", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
      setPosting(false);
    }
  }

  const busy = posting || uploading || preparingVideo;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      {bgColor ? (
        <View style={[styles.styledComposerBox, { backgroundColor: bgColor }]}>
          <MentionTextInput
            ref={styledInputRef}
            style={[styles.styledComposerInput, { color: textColor || "#FFFFFF", textAlign }]}
            placeholder="What's on your mind?"
            placeholderTextColor={(textColor || "#FFFFFF") + "AA"}
            value={composerText}
            onChangeText={setComposerText}
            multiline
          />
        </View>
      ) : (
        <View style={styles.composerRow}>
          <Avatar uri={user?.avatar} name={user?.name} style={styles.avatar} />
          <MentionTextInput
            style={styles.composerInput}
            placeholder="What's on your mind?"
            value={composerText}
            onChangeText={setComposerText}
            multiline
            autoFocus
          />
        </View>
      )}

      {!hasMedia && (
        <View style={styles.styleSection}>
          <Text style={styles.styleLabel}>Background</Text>
          <ColorSwatchPicker colors={BG_COLORS} value={bgColor} onSelect={setBgColor} includeNone size={30} />
          {!!bgColor && (
            <>
              <Text style={[styles.styleLabel, { marginTop: 14 }]}>Font color</Text>
              <ColorSwatchPicker colors={TEXT_COLORS} value={textColor} onSelect={setTextColor} size={28} />
              <Text style={[styles.styleLabel, { marginTop: 14 }]}>Alignment</Text>
              <TextAlignPicker value={textAlign} onSelect={setTextAlign} />
            </>
          )}
        </View>
      )}

      {media && (
        <View style={styles.previewWrap}>
          <Video source={{ uri: media.uri }} style={styles.preview} useNativeControls resizeMode={ResizeMode.CONTAIN} />
          <TouchableOpacity style={styles.removeButton} onPress={() => setMedia(null)}>
            <Ionicons name="close" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      )}

      {photos.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
          {photos.map((p, i) => (
            <View key={i} style={styles.photoThumbWrap}>
              <Image source={{ uri: p.uri }} style={styles.photoThumb} resizeMode="cover" />
              <TouchableOpacity style={styles.removeButtonSmall} onPress={() => removePhoto(i)}>
                <Ionicons name="close" size={12} color="#fff" />
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      <View style={styles.attachRow}>
        <TouchableOpacity style={styles.attachButton} onPress={handleAttachPhotos} disabled={busy || !!media}>
          <Ionicons name="images-outline" size={20} color={media ? COLORS.sub : COLORS.accent} />
          <Text style={[styles.attachButtonText, media && styles.attachButtonTextDisabled]}>
            {photos.length ? `Add more photos (${photos.length}/${MAX_PHOTOS})` : "Add photos"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.attachButton} onPress={handleAttachVideo} disabled={busy || photos.length > 0}>
          {preparingVideo ? (
            <ActivityIndicator size="small" color={COLORS.accent} />
          ) : (
            <Ionicons name="videocam-outline" size={20} color={photos.length ? COLORS.sub : COLORS.accent} />
          )}
          <Text style={[styles.attachButtonText, photos.length > 0 && styles.attachButtonTextDisabled]}>
            {preparingVideo ? "Processing video..." : "Add video"}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.postButton, !composerText.trim() && !media && !photos.length && styles.postButtonDisabled]}
        onPress={handlePost}
        disabled={busy || (!composerText.trim() && !media && !photos.length)}
      >
        {busy ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.postButtonText}>Post</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.surface, padding: 16 },
  composerRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.wash },
  composerInput: { flex: 1, minHeight: 100, fontSize: 16, textAlignVertical: "top", color: COLORS.ink },
  styledComposerBox: { borderRadius: 14, minHeight: 220, padding: 20, justifyContent: "center" },
  styledComposerInput: { fontSize: 26, fontWeight: "700" },
  styleSection: { marginTop: 16 },
  styleLabel: { fontSize: 12, fontWeight: "700", color: COLORS.sub, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.4 },
  previewWrap: { marginTop: 12, borderRadius: 10, overflow: "hidden" },
  preview: { width: "100%", height: 220, backgroundColor: "#000" },
  removeButton: {
    position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  photosRow: { marginTop: 12 },
  photoThumbWrap: { width: 88, height: 88, borderRadius: 10, overflow: "hidden", marginRight: 8, backgroundColor: COLORS.wash },
  photoThumb: { width: "100%", height: "100%" },
  removeButtonSmall: {
    position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  attachRow: { flexDirection: "row", gap: 20, marginTop: 16 },
  attachButton: { flexDirection: "row", alignItems: "center", gap: 8 },
  attachButtonText: { color: COLORS.accent, fontWeight: "600", fontSize: 14 },
  attachButtonTextDisabled: { color: COLORS.sub },
  postButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 20 },
  postButtonDisabled: { backgroundColor: COLORS.border },
  postButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
});
