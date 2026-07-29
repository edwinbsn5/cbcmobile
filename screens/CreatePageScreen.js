import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Image, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import CategoryPicker from "../components/CategoryPicker";
import { COLORS } from "../theme";

async function pickImage() {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Permission needed", "Allow photo library access to pick a photo");
    return null;
  }
  const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
  if (result.canceled || !result.assets?.length) return null;
  const asset = result.assets[0];
  const mimeType = asset.mimeType || "image/jpeg";
  return { uri: asset.uri, mimeType, fileName: asset.fileName || `photo.${mimeType.split("/")[1]}` };
}

async function uploadImage(localImage) {
  const form = new FormData();
  form.append("file", { uri: localImage.uri, name: localImage.fileName, type: localImage.mimeType });
  const { data } = await client.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
  return data.url;
}

export default function CreatePageScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryIds, setCategoryIds] = useState([]);
  const [avatar, setAvatar] = useState(null);
  const [cover, setCover] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handleCreate() {
    if (!name.trim()) return Alert.alert("Name required", "Give your Page a name");
    if (!categoryIds.length) return Alert.alert("Category required", "Pick at least one category for your Page");

    setSubmitting(true);
    try {
      let avatarUrl, coverUrl;
      if (avatar || cover) setUploading(true);
      if (avatar) avatarUrl = await uploadImage(avatar);
      if (cover) coverUrl = await uploadImage(cover);
      setUploading(false);

      const { data } = await client.post("/pages", {
        name: name.trim(),
        description: description.trim(),
        categoryIds,
        avatarUrl,
        coverUrl,
      });
      navigation.replace("PageDetail", { pageId: data.id });
    } catch (e) {
      Alert.alert("Couldn't create Page", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.card}>
        <Text style={styles.label}>Page name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Acme Coffee Roasters" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="What's this Page about?" multiline />

        <Text style={styles.label}>Avatar</Text>
        {avatar ? (
          <View style={styles.avatarPreviewWrap}>
            <Image source={{ uri: avatar.uri }} style={styles.avatarPreview} resizeMode="cover" />
            <TouchableOpacity style={styles.imageRemoveButton} onPress={() => setAvatar(null)}>
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imagePicker} onPress={async () => setAvatar(await pickImage())}>
            <Ionicons name="person-circle-outline" size={22} color={COLORS.accent} />
            <Text style={styles.imagePickerText}>Choose an avatar</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Cover photo</Text>
        {cover ? (
          <View style={styles.coverPreviewWrap}>
            <Image source={{ uri: cover.uri }} style={styles.coverPreview} resizeMode="cover" />
            <TouchableOpacity style={styles.imageRemoveButton} onPress={() => setCover(null)}>
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.imagePicker} onPress={async () => setCover(await pickImage())}>
            <Ionicons name="image-outline" size={22} color={COLORS.accent} />
            <Text style={styles.imagePickerText}>Choose a cover photo</Text>
          </TouchableOpacity>
        )}

        <CategoryPicker selectedIds={categoryIds} onChange={setCategoryIds} />

        <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{uploading ? "Uploading..." : "Create Page"}</Text>}
        </TouchableOpacity>
        <Text style={styles.hint}>You'll become the Page's Owner and can invite Admins, Editors, and Moderators afterward.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10 },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  imagePicker: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", borderRadius: 8, paddingVertical: 22,
  },
  imagePickerText: { color: COLORS.accent, fontWeight: "600", fontSize: 13 },
  avatarPreviewWrap: { borderRadius: 40, overflow: "hidden", alignSelf: "flex-start" },
  avatarPreview: { width: 80, height: 80, borderRadius: 40, backgroundColor: "#eee" },
  coverPreviewWrap: { borderRadius: 8, overflow: "hidden" },
  coverPreview: { width: "100%", height: 150, backgroundColor: "#eee" },
  imageRemoveButton: {
    position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 20 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
  hint: { color: COLORS.sub, fontSize: 12, textAlign: "center", marginTop: 10 },
});
