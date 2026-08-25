import React, { useCallback, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

const ID_TYPES = [{ value: "national_id", label: "National ID" }, { value: "passport", label: "Passport" }];

const STATUS_META = {
  none: { label: "Not started", color: COLORS.sub, icon: "ellipse-outline" },
  pending: { label: "Awaiting review", color: "#8A6D00", icon: "time-outline" },
  verified: { label: "Verified", color: "#2E7D32", icon: "checkmark-circle" },
  rejected: { label: "Not approved", color: "#D32F2F", icon: "close-circle" },
};

export default function KYCScreen() {
  const [status, setStatus] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [idType, setIdType] = useState("national_id");
  const [idNumber, setIdNumber] = useState("");
  const [idPhoto, setIdPhoto] = useState(null);
  const [selfiePhoto, setSelfiePhoto] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    client.get("/kyc/mine").then((r) => { setStatus(r.data.kycStatus); setSubmission(r.data.submission); }).catch(() => {}).finally(() => setLoading(false));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function pick(setter) {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo library access");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    setter({ uri: asset.uri, mimeType, fileName: asset.fileName || `photo.${mimeType.split("/")[1]}` });
  }

  async function upload(photo) {
    const form = new FormData();
    form.append("file", { uri: photo.uri, name: photo.fileName, type: photo.mimeType });
    const { data } = await client.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
    return data.url;
  }

  async function handleSubmit() {
    if (!idNumber.trim()) return Alert.alert("ID number required", "Enter your ID/passport number");
    if (!idPhoto || !selfiePhoto) return Alert.alert("Photos required", "Add both your ID photo and a selfie");
    setSubmitting(true);
    try {
      const [idPhotoUrl, selfiePhotoUrl] = await Promise.all([upload(idPhoto), upload(selfiePhoto)]);
      await client.post("/kyc/submit", { idType, idNumber: idNumber.trim(), idPhotoUrl, selfiePhotoUrl });
      Alert.alert("Submitted", "Your ID is now awaiting admin review — this is a manual check and may take a while.");
      setIdNumber(""); setIdPhoto(null); setSelfiePhoto(null);
      load();
    } catch (e) {
      Alert.alert("Couldn't submit", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;
  const meta = STATUS_META[status] || STATUS_META.none;
  const canSubmit = status !== "verified" && status !== "pending";

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.statusCard}>
        <Ionicons name={meta.icon} size={22} color={meta.color} />
        <View style={{ flex: 1 }}>
          <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
          {status === "rejected" && submission?.rejectionReason && <Text style={styles.rejectionReason}>{submission.rejectionReason}</Text>}
        </View>
      </View>

      <Text style={styles.intro}>
        Chama & Investment groups pool real money. Verifying your identity protects everyone in the group — it's required before
        you can create a group, and some groups may require it to join.
      </Text>

      {canSubmit && (
        <View style={styles.card}>
          <Text style={styles.label}>ID type</Text>
          <View style={styles.optionRow}>
            {ID_TYPES.map((t) => (
              <TouchableOpacity key={t.value} style={[styles.optionChip, idType === t.value && styles.optionChipActive]} onPress={() => setIdType(t.value)}>
                <Text style={[styles.optionChipText, idType === t.value && styles.optionChipTextActive]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>ID number</Text>
          <TextInput style={styles.input} value={idNumber} onChangeText={setIdNumber} placeholder="12345678" keyboardType="number-pad" />

          <Text style={styles.label}>ID photo (front)</Text>
          {idPhoto ? (
            <TouchableOpacity onPress={() => pick(setIdPhoto)}><Image source={{ uri: idPhoto.uri }} style={styles.photoPreview} contentFit="cover" /></TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.photoPicker} onPress={() => pick(setIdPhoto)}>
              <Ionicons name="card-outline" size={22} color={COLORS.accent} />
              <Text style={styles.photoPickerText}>Take/choose a clear photo of your ID</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.label}>Selfie</Text>
          {selfiePhoto ? (
            <TouchableOpacity onPress={() => pick(setSelfiePhoto)}><Image source={{ uri: selfiePhoto.uri }} style={styles.photoPreview} contentFit="cover" /></TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.photoPicker} onPress={() => pick(setSelfiePhoto)}>
              <Ionicons name="person-circle-outline" size={22} color={COLORS.accent} />
              <Text style={styles.photoPickerText}>Take a selfie holding your ID</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
            {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Submit for review</Text>}
          </TouchableOpacity>
          <Text style={styles.hint}>A platform admin manually reviews every submission — no automated ID checks are used.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 12 },
  statusLabel: { fontWeight: "800", fontSize: 15 },
  rejectionReason: { color: COLORS.sub, fontSize: 12, marginTop: 2 },
  intro: { color: COLORS.sub, fontSize: 13, lineHeight: 19, marginBottom: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink },
  optionRow: { flexDirection: "row", gap: 8 },
  optionChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: COLORS.wash },
  optionChipActive: { backgroundColor: COLORS.accent },
  optionChipText: { color: COLORS.ink, fontWeight: "600", fontSize: 12.5 },
  optionChipTextActive: { color: COLORS.accentInk },
  photoPicker: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", borderRadius: 8, paddingVertical: 22 },
  photoPickerText: { color: COLORS.accent, fontWeight: "600", fontSize: 13, textAlign: "center", flexShrink: 1 },
  photoPreview: { width: "100%", height: 150, borderRadius: 8, backgroundColor: "#eee" },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 20 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
  hint: { color: COLORS.sub, fontSize: 11.5, textAlign: "center", marginTop: 10 },
});
