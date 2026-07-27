import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Dimensions, SafeAreaView } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

const { width: SCREEN_W } = Dimensions.get("window");
const PHOTO_SIZE = SCREEN_W - 64;

export default function AvatarViewerScreen({ route, navigation }) {
  const { userId, name, avatarUrl } = route.params;
  const { user, updateUser } = useAuth();
  const [currentUrl, setCurrentUrl] = useState(avatarUrl);
  const [uploading, setUploading] = useState(false);

  const isOwn = userId === user?.id;

  async function handleReplace() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo library access to change your profile picture");

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", { uri: asset.uri, name: asset.fileName || `avatar.${mimeType.split("/")[1]}`, type: mimeType });
      const { data: uploaded } = await client.post("/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });

      const { data } = await client.patch("/auth/me", { avatar: uploaded.url });
      await updateUser(data.user);
      setCurrentUrl(data.user.avatar);
    } catch (e) {
      Alert.alert("Couldn't update photo", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="close" size={28} color="#fff" />
      </TouchableOpacity>

      <View style={styles.photoWrap}>
        <Avatar
          uri={currentUrl}
          name={name}
          style={{ width: PHOTO_SIZE, height: PHOTO_SIZE, borderRadius: PHOTO_SIZE / 2 }}
        />
      </View>

      {isOwn && (
        <TouchableOpacity style={styles.replaceButton} onPress={handleReplace} disabled={uploading}>
          {uploading ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.replaceButtonText}>Replace photo</Text>}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  closeButton: { position: "absolute", top: 16, left: 16, zIndex: 1 },
  photoWrap: { alignItems: "center", justifyContent: "center" },
  replaceButton: {
    position: "absolute",
    bottom: 48,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 24,
    minWidth: 160,
    alignItems: "center",
  },
  replaceButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 15 },
});
