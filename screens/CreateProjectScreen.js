import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator, Switch } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

function OptionRow({ options, value, onChange }) {
  return (
    <View style={styles.optionRow}>
      {options.map((o) => (
        <TouchableOpacity key={o.value} style={[styles.optionChip, value === o.value && styles.optionChipActive]} onPress={() => onChange(o.value)}>
          <Text style={[styles.optionChipText, value === o.value && styles.optionChipTextActive]}>{o.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function CreateProjectScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [categories, setCategories] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [cover, setCover] = useState(null);
  const [category, setCategory] = useState("");
  const [maxMembers, setMaxMembers] = useState("5");
  const [roles, setRoles] = useState([{ name: "", headcountNeeded: "1" }]);
  const [requiresCapital, setRequiresCapital] = useState(false);
  const [contributionAmount, setContributionAmount] = useState("");
  const [contributionFrequency, setContributionFrequency] = useState("monthly");
  const [visibility, setVisibility] = useState("public");
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    client.get("/projects/categories").then((r) => { setCategories(r.data); setCategory(r.data[0]); }).catch(() => {});
  }, []);

  async function handlePickCover() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return Alert.alert("Permission needed", "Allow photo library access to pick a cover photo");
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (result.canceled || !result.assets?.length) return;
    const asset = result.assets[0];
    const mimeType = asset.mimeType || "image/jpeg";
    setCover({ uri: asset.uri, mimeType, fileName: asset.fileName || `cover.${mimeType.split("/")[1]}` });
  }

  function updateRole(idx, field, value) {
    setRoles((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  }
  function addRole() { setRoles((prev) => [...prev, { name: "", headcountNeeded: "1" }]); }
  function removeRole(idx) { setRoles((prev) => prev.filter((_, i) => i !== idx)); }

  async function handleCreate() {
    if (!title.trim()) return Alert.alert("Title required", "Give your project a title");
    if (!description.trim()) return Alert.alert("Description required", "Describe the business idea");
    const max = parseInt(maxMembers, 10);
    if (!Number.isInteger(max) || max < 1) return Alert.alert("Invalid size", "Max members must be at least 1");

    const cleanRoles = roles.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), headcountNeeded: parseInt(r.headcountNeeded, 10) || 1 }));
    const totalRoleHeadcount = cleanRoles.reduce((sum, r) => sum + r.headcountNeeded, 0);
    if (totalRoleHeadcount > max) return Alert.alert("Too many role positions", "Total role headcount can't exceed max members");

    if (requiresCapital && (!parseInt(contributionAmount, 10) || parseInt(contributionAmount, 10) <= 0)) {
      return Alert.alert("Invalid amount", "Enter a capital contribution amount in KES");
    }

    setSubmitting(true);
    try {
      let coverUrl;
      if (cover) {
        setUploading(true);
        const form = new FormData();
        form.append("file", { uri: cover.uri, name: cover.fileName, type: cover.mimeType });
        const { data: uploaded } = await client.post("/upload", form, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60000 });
        coverUrl = uploaded.url;
        setUploading(false);
      }

      const { data } = await client.post("/projects", {
        title: title.trim(), description: description.trim(), coverUrl, category, maxMembers: max,
        roles: cleanRoles, requiresCapital,
        contributionAmount: requiresCapital ? parseInt(contributionAmount, 10) : undefined,
        contributionFrequency: requiresCapital ? contributionFrequency : undefined,
        visibility,
      });
      Alert.alert("Project created!", "You're the admin — start assembling your team.");
      navigation.replace("ProjectDetail", { projectId: data.id });
    } catch (e) {
      Alert.alert("Couldn't create project", e.response?.data?.error || e.message);
    } finally {
      setUploading(false);
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.card}>
        <Text style={styles.label}>Project title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Solar-Powered Cold Storage" />

        <Text style={styles.label}>Describe the business idea</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="What's the idea? What problem does it solve?" multiline />

        <Text style={styles.label}>Cover photo</Text>
        {cover ? (
          <View style={styles.coverPreviewWrap}>
            <Image source={{ uri: cover.uri }} style={styles.coverPreview} contentFit="cover" />
            <TouchableOpacity style={styles.coverRemoveButton} onPress={() => setCover(null)}><Ionicons name="close" size={16} color="#fff" /></TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.coverPicker} onPress={handlePickCover}>
            <Ionicons name="image-outline" size={22} color={COLORS.accent} />
            <Text style={styles.coverPickerText}>Choose a cover photo</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.label}>Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.optionRow}>
            {categories.map((c) => (
              <TouchableOpacity key={c} style={[styles.optionChip, category === c && styles.optionChipActive]} onPress={() => setCategory(c)}>
                <Text style={[styles.optionChipText, category === c && styles.optionChipTextActive]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={styles.label}>Max team size (overall cap)</Text>
        <TextInput style={styles.input} value={maxMembers} onChangeText={setMaxMembers} keyboardType="number-pad" />

        <Text style={styles.sectionTitle}>Roles needed (optional)</Text>
        {roles.map((r, idx) => (
          <View key={idx} style={styles.roleRow}>
            <TextInput style={[styles.input, { flex: 2 }]} placeholder="Role, e.g. Marketing" value={r.name} onChangeText={(v) => updateRole(idx, "name", v)} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="#" keyboardType="number-pad" value={r.headcountNeeded} onChangeText={(v) => updateRole(idx, "headcountNeeded", v)} />
            <TouchableOpacity onPress={() => removeRole(idx)} style={styles.removeRoleBtn}><Ionicons name="close-circle" size={22} color={COLORS.sub} /></TouchableOpacity>
          </View>
        ))}
        <TouchableOpacity onPress={addRole} style={styles.addRoleBtn}><Text style={styles.addRoleBtnText}>+ Add another role</Text></TouchableOpacity>

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>This project pools capital from members</Text>
          <Switch value={requiresCapital} onValueChange={setRequiresCapital} trackColor={{ true: COLORS.accent }} />
        </View>
        {requiresCapital && (
          <>
            <Text style={styles.label}>Contribution amount (KES)</Text>
            <TextInput style={styles.input} value={contributionAmount} onChangeText={setContributionAmount} keyboardType="number-pad" placeholder="1000" />
            <Text style={styles.label}>Frequency</Text>
            <OptionRow options={[{ value: "weekly", label: "Weekly" }, { value: "monthly", label: "Monthly" }]} value={contributionFrequency} onChange={setContributionFrequency} />
          </>
        )}

        <Text style={styles.sectionTitle}>Visibility</Text>
        <OptionRow options={[{ value: "public", label: "Public — discoverable" }, { value: "invite_only", label: "Invite-only" }]} value={visibility} onChange={setVisibility} />

        <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={submitting}>
          {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>{uploading ? "Uploading cover..." : "Create Project"}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  sectionTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "700", marginTop: 20, marginBottom: 4 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink },
  multiline: { minHeight: 90, textAlignVertical: "top" },
  coverPicker: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed", borderRadius: 8, paddingVertical: 22 },
  coverPickerText: { color: COLORS.accent, fontWeight: "600", fontSize: 13 },
  coverPreviewWrap: { borderRadius: 8, overflow: "hidden" },
  coverPreview: { width: "100%", height: 150, backgroundColor: "#eee" },
  coverRemoveButton: { position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 13, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  optionRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  optionChip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, backgroundColor: COLORS.wash },
  optionChipActive: { backgroundColor: COLORS.accent },
  optionChipText: { color: COLORS.ink, fontWeight: "600", fontSize: 12.5 },
  optionChipTextActive: { color: COLORS.accentInk },
  roleRow: { flexDirection: "row", gap: 8, alignItems: "center", marginBottom: 8 },
  removeRoleBtn: { padding: 4 },
  addRoleBtn: { paddingVertical: 6 },
  addRoleBtnText: { color: COLORS.accent, fontWeight: "700", fontSize: 12.5 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 18, gap: 12 },
  switchLabel: { color: COLORS.ink, fontSize: 13, flex: 1 },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 24 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
});
