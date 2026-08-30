import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

export default function CreateGroupScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState(null); // { uri, mimeType, fileName }
  const [avatar, setAvatar] = useState(null); // { uri, mimeType, fileName }
  const [tierName, setTierName] = useState("Member");
  const [priceKES, setPriceKES] = useState("");
  const [periodDays, setPeriodDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  async function handlePickCover() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo library access to pick a cover photo");

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    setCover({ uri: asset.uri, mimeType, fileName: asset.fileName || `cover.${mimeType.split("/")[1]}` });
  }

  async function handlePickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo library access to pick a profile photo");

    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    setAvatar({ uri: asset.uri, mimeType, fileName: asset.fileName || `avatar.${mimeType.split("/")[1]}` });
  }

  async function uploadImage(localImage) {
    const form = new FormData();
    form.append("file", { uri: localImage.uri, name: localImage.fileName, type: localImage.mimeType });
    const { data } = await client.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
    return data.url;
  }

  async function handleCreate() {
    if (!name.trim()) return Alert.alert("Name required", "Give your group a name");
    if (!tierName.trim()) return Alert.alert("Tier name required", "Give your starter membership tier a name");

    const price = parseInt(priceKES, 10);
    if (!Number.isInteger(price) || price < 0) return Alert.alert("Invalid price", "Enter a valid price in KES");

    const period = parseInt(periodDays, 10);
    if (!Number.isInteger(period) || period <= 0) return Alert.alert("Invalid period", "Enter a valid number of days");

    setSubmitting(true);
    try {
      let coverUrl;
      let avatarUrl;
      if (cover || avatar) {
        setUploading(true);
        if (cover) coverUrl = await uploadImage(cover);
        if (avatar) avatarUrl = await uploadImage(avatar);
        setUploading(false);
      }

      const { data } = await client.post("/groups", {
        name: name.trim(),
        description: description.trim(),
        avatarUrl,
        coverUrl,
        tiers: [{ name: tierName.trim(), priceKES: price, periodDays: period, perks: [] }],
      });
      Alert.alert("Group submitted", "Your group has been submitted and will appear once an admin approves it.");
      navigation.replace("GroupDetail", { groupId: data.id });
    } catch (e) {
      Alert.alert("Couldn't create group", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.card}>
        <Text style={styles.label}>Group name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nairobi Entrepreneurs Hub" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="What's this group about?" multiline />

        <Text style={styles.label}>Cover photo</Text>
        {cover ? (
          <View style={styles.coverPreviewWrap}>
            <Image source={{ uri: cover.uri }} style={styles.coverPreview} contentFit="cover" />
            <TouchableOpacity style={styles.coverRemoveButton} onPress={() => setCover(null)}>
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.coverPicker} onPress={handlePickCover}>
            <Ionicons name="image-outline" size={22} color={COLORS.accent} />
            <Text style={styles.coverPickerText}>Choose a cover photo from your phone</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Profile photo (avatar)</Text>
        {avatar ? (
          <View style={styles.avatarPreviewWrap}>
            <Image source={{ uri: avatar.uri }} style={styles.avatarPreview} contentFit="cover" />
            <TouchableOpacity style={styles.coverRemoveButton} onPress={() => setAvatar(null)}>
              <Ionicons name="close" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.coverPicker} onPress={handlePickAvatar}>
            <Ionicons name="person-circle-outline" size={22} color={COLORS.accent} />
            <Text style={styles.coverPickerText}>Choose a profile photo (optional)</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionTitle}>Starter membership tier</Text>
        <Text style={styles.label}>Tier name</Text>
        <TextInput style={styles.input} value={tierName} onChangeText={setTierName} placeholder="Member" />

        <Text style={styles.label}>Price (KES)</Text>
        <TextInput style={styles.input} value={priceKES} onChangeText={setPriceKES} placeholder="200" keyboardType="number-pad" />

        <Text style={styles.label}>Billing period (days)</Text>
        <TextInput style={styles.input} value={periodDays} onChangeText={setPeriodDays} placeholder="30" keyboardType="number-pad" />

        <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{uploading ? "Uploading photos..." : "Submit for approval"}</Text>}
        </TouchableOpacity>
        <Text style={styles.hint}>New groups are reviewed by an admin before they appear publicly.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  sectionTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "700", marginTop: 20 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  coverPicker: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", borderRadius: 8, paddingVertical: 22,
  },
  coverPickerText: { color: COLORS.accent, fontWeight: "600", fontSize: 13 },
  coverPreviewWrap: { borderRadius: 8, overflow: "hidden" },
  coverPreview: { width: "100%", height: 150, backgroundColor: "#eee" },
  avatarPreviewWrap: { width: 84, height: 84, borderRadius: 22, overflow: "hidden" },
  avatarPreview: { width: "100%", height: "100%", backgroundColor: "#eee" },
  coverRemoveButton: {
    position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center",
  },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 20 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
  hint: { color: COLORS.sub, fontSize: 12, textAlign: "center", marginTop: 10 },
});
