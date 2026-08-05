import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { Video, ResizeMode } from "expo-av";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import CategoryPicker from "../components/CategoryPicker";
import { COLORS } from "../theme";

// Content-only edit — media isn't swappable here (same convention as
// EditPostScreen: delete and relist to change photos/video).
export default function EditMarketProductScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { product } = route.params;
  const [title, setTitle] = useState(product.title);
  const [description, setDescription] = useState(product.description || "");
  const [priceKES, setPriceKES] = useState(String(product.priceKES));
  const [categoryIds, setCategoryIds] = useState(product.categories.map((c) => c.id));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return Alert.alert("Title required", "Your listing can't have an empty title");
    const price = parseInt(priceKES, 10);
    if (!Number.isInteger(price) || price < 0) return Alert.alert("Invalid price", "Enter a valid price in KES");
    if (!categoryIds.length) return Alert.alert("Category required", "Pick at least one category");

    setSaving(true);
    try {
      await client.patch(`/market/products/${product.id}`, { title: title.trim(), description: description.trim(), priceKES: price, categoryIds });
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't save changes", e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={[styles.container, { paddingBottom: insets.bottom + 16 }]} contentContainerStyle={{ padding: 16 }}>
      {product.mediaType === "video" ? (
        <Video source={{ uri: product.mediaUrl }} style={styles.media} useNativeControls resizeMode={ResizeMode.CONTAIN} />
      ) : (
        <Image source={{ uri: product.photoUrls[0] }} style={styles.media} contentFit="cover" />
      )}
      {product.photoUrls?.length > 1 && (
        <Text style={styles.photoCountHint}>+{product.photoUrls.length - 1} more photo{product.photoUrls.length - 1 === 1 ? "" : "s"} in this listing</Text>
      )}
      <Text style={styles.mediaHint}>Media can't be changed here — delete and relist to swap it</Text>

      <Text style={styles.label}>Title</Text>
      <TextInput style={styles.input} value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline />

      <Text style={styles.label}>Price (KES)</Text>
      <TextInput style={styles.input} value={priceKES} onChangeText={setPriceKES} keyboardType="number-pad" />

      <CategoryPicker selectedIds={categoryIds} onChange={setCategoryIds} endpoint="/market/categories/tree" />

      <TouchableOpacity style={styles.saveButton} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.saveButtonText}>Save changes</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  media: { width: "100%", height: 200, borderRadius: 8, backgroundColor: "#000" },
  photoCountHint: { color: COLORS.accent, fontSize: 12, fontWeight: "700", marginTop: 6, textAlign: "center" },
  mediaHint: { color: COLORS.sub, fontSize: 12, marginTop: 6, textAlign: "center" },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 4, marginTop: 16 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink, backgroundColor: COLORS.surface },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  saveButton: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 15 },
});
