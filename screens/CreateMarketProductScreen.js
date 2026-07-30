import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Video, ResizeMode } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import CategoryPicker from "../components/CategoryPicker";
import { COLORS } from "../theme";

async function pickMultiplePhotos() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permission needed", "Allow photo library access to attach photos");
    return [];
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ImagePicker.MediaTypeOptions.Images,
    allowsMultipleSelection: true,
    selectionLimit: 10,
    quality: 0.7,
  });
  if (result.canceled || !result.assets?.length) return [];
  return result.assets.map((a) => ({
    uri: a.uri, mimeType: a.mimeType || "image/jpeg",
    fileName: a.fileName || `upload.${(a.mimeType || "image/jpeg").split("/")[1]}`,
  }));
}

async function pickVideo() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permission needed", "Allow photo library access to attach a video");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Videos, quality: 0.7 });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const mimeType = asset.mimeType || "video/mp4";
  return { uri: asset.uri, mimeType, fileName: asset.fileName || `upload.${mimeType.split("/")[1]}` };
}

async function uploadMultiplePhotos(photoList) {
  const form = new FormData();
  photoList.forEach((p) => form.append("files", { uri: p.uri, name: p.fileName, type: p.mimeType }));
  const { data } = await client.post("/upload/multiple", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 120000 });
  return data.urls;
}

async function uploadMedia(localMedia) {
  const form = new FormData();
  form.append("file", { uri: localMedia.uri, name: localMedia.fileName, type: localMedia.mimeType });
  const { data } = await client.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
  return data;
}

export default function CreateMarketProductScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceKES, setPriceKES] = useState("");
  const [mediaType, setMediaType] = useState("photo");
  const [photos, setPhotos] = useState([]);
  const [video, setVideo] = useState(null);
  const [categoryIds, setCategoryIds] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function switchMediaType(type) {
    setMediaType(type);
    setPhotos([]);
    setVideo(null);
  }

  async function handleAddPhotos() {
    const picked = await pickMultiplePhotos();
    if (!picked.length) return;
    setPhotos((prev) => {
      const combined = [...prev, ...picked];
      if (combined.length > 10) Alert.alert("Too many photos", "Only the first 10 photos were kept");
      return combined.slice(0, 10);
    });
  }

  async function handlePickVideo() {
    const picked = await pickVideo();
    if (picked) setVideo(picked);
  }

  async function handleSubmit() {
    if (!title.trim()) return Alert.alert("Title required", "Give your product a title");
    const price = parseInt(priceKES, 10);
    if (!Number.isInteger(price) || price < 0) return Alert.alert("Invalid price", "Enter a valid price in KES");
    if (mediaType === "photo" && !photos.length) return Alert.alert("Photos required", "Add at least one photo");
    if (mediaType === "video" && !video) return Alert.alert("Video required", "Add a video");
    if (!categoryIds.length) return Alert.alert("Category required", "Pick at least one category");

    setSubmitting(true);
    try {
      let photoUrls, mediaUrl, thumbnailUrl;
      setUploading(true);
      if (mediaType === "photo") {
        photoUrls = await uploadMultiplePhotos(photos);
      } else {
        const uploaded = await uploadMedia(video);
        mediaUrl = uploaded.url;
        thumbnailUrl = uploaded.thumbnailUrl;
      }
      setUploading(false);

      const { data } = await client.post("/market/products", {
        title: title.trim(), description: description.trim(), priceKES: price, mediaType,
        photoUrls, mediaUrl, thumbnailUrl, categoryIds,
      });
      Alert.alert("Listing submitted", "Your product will appear in A Girls Market once an admin approves it.");
      navigation.replace("MyMarketProducts");
      void data;
    } catch (e) {
      Alert.alert("Couldn't create listing", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.card}>
        <Text style={styles.label}>Title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Brazilian Body Wave Wig" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Condition, size, details..." multiline />

        <Text style={styles.label}>Price (KES)</Text>
        <TextInput style={styles.input} value={priceKES} onChangeText={setPriceKES} placeholder="2500" keyboardType="number-pad" />

        <Text style={styles.label}>Media type</Text>
        <View style={styles.mediaTypeRow}>
          <TouchableOpacity style={[styles.mediaTypeButton, mediaType === "photo" && styles.mediaTypeButtonActive]} onPress={() => switchMediaType("photo")}>
            <Text style={[styles.mediaTypeText, mediaType === "photo" && styles.mediaTypeTextActive]}>Photos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.mediaTypeButton, mediaType === "video" && styles.mediaTypeButtonActive]} onPress={() => switchMediaType("video")}>
            <Text style={[styles.mediaTypeText, mediaType === "video" && styles.mediaTypeTextActive]}>Video</Text>
          </TouchableOpacity>
        </View>

        {mediaType === "photo" ? (
          <>
            {photos.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosRow}>
                {photos.map((p, i) => (
                  <View key={i} style={styles.photoThumbWrap}>
                    <Image source={{ uri: p.uri }} style={styles.photoThumb} resizeMode="cover" />
                    <TouchableOpacity style={styles.removeButtonSmall} onPress={() => setPhotos((prev) => prev.filter((_, idx) => idx !== i))}>
                      <Ionicons name="close" size={12} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.attachButton} onPress={handleAddPhotos}>
              <Ionicons name="images-outline" size={18} color={COLORS.accent} />
              <Text style={styles.attachButtonText}>{photos.length ? `Add more photos (${photos.length}/10)` : "Add photos"}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            {video && (
              <View style={styles.previewWrap}>
                <Video source={{ uri: video.uri }} style={styles.preview} useNativeControls resizeMode={ResizeMode.CONTAIN} />
                <TouchableOpacity style={styles.removeButton} onPress={() => setVideo(null)}>
                  <Ionicons name="close" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            )}
            <TouchableOpacity style={styles.attachButton} onPress={handlePickVideo}>
              <Ionicons name="videocam-outline" size={18} color={COLORS.accent} />
              <Text style={styles.attachButtonText}>{video ? "Change video" : "Add video"}</Text>
            </TouchableOpacity>
          </>
        )}

        <CategoryPicker selectedIds={categoryIds} onChange={setCategoryIds} endpoint="/market/categories/tree" />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{uploading ? "Uploading..." : "Submit for review"}</Text>}
        </TouchableOpacity>
        <Text style={styles.hint}>New listings are reviewed by an admin before they appear in A Girls Market.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  mediaTypeRow: { flexDirection: "row", gap: 8 },
  mediaTypeButton: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  mediaTypeButtonActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  mediaTypeText: { fontWeight: "700", fontSize: 13, color: COLORS.sub },
  mediaTypeTextActive: { color: COLORS.accentInk },
  photosRow: { marginTop: 10 },
  photoThumbWrap: { width: 72, height: 72, borderRadius: 8, overflow: "hidden", marginRight: 8, backgroundColor: COLORS.wash },
  photoThumb: { width: "100%", height: "100%" },
  removeButtonSmall: {
    position: "absolute", top: 4, right: 4, width: 18, height: 18, borderRadius: 9,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  previewWrap: { marginTop: 10, borderRadius: 8, overflow: "hidden" },
  preview: { width: "100%", height: 180, backgroundColor: "#000" },
  removeButton: {
    position: "absolute", top: 6, right: 6, width: 24, height: 24, borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  attachButton: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 10 },
  attachButtonText: { color: COLORS.accent, fontWeight: "600", fontSize: 13 },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 20 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
  hint: { color: COLORS.sub, fontSize: 12, textAlign: "center", marginTop: 10 },
});
