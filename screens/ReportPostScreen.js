import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import REPORT_REASONS from "../data/reportReasons";
import { COLORS } from "../theme";

export default function ReportPostScreen({ route, navigation }) {
  const { postId, groupId, submissionId } = route.params;
  const [reason, setReason] = useState(null);
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!reason) return Alert.alert("Pick a reason", "Select why you're reporting this post");
    setSubmitting(true);
    try {
      const path = submissionId
        ? `/star/submissions/${submissionId}/report`
        : groupId
        ? `/groups/${groupId}/posts/${postId}/report`
        : `/feed/${postId}/report`;
      await client.post(path, { reason, details: details.trim() || undefined });
      Alert.alert("Report submitted", `Thanks — our team will review this ${submissionId ? "video" : "post"}.`);
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't submit report", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Why are you reporting this {submissionId ? "video" : "post"}?</Text>

      {REPORT_REASONS.map((r) => (
        <TouchableOpacity key={r.key} style={styles.option} onPress={() => setReason(r.key)}>
          <Ionicons name={reason === r.key ? "radio-button-on" : "radio-button-off"} size={20} color={COLORS.accent} />
          <Text style={styles.optionText}>{r.label}</Text>
        </TouchableOpacity>
      ))}

      <Text style={styles.label}>Additional details (optional)</Text>
      <TextInput
        style={styles.input}
        placeholder="Anything that helps us review this..."
        value={details}
        onChangeText={setDetails}
        multiline
        maxLength={500}
      />

      <TouchableOpacity style={[styles.submitButton, !reason && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={!reason || submitting}>
        {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.submitButtonText}>Submit report</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 16, fontWeight: "800", color: COLORS.ink, marginBottom: 12 },
  option: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surface, borderRadius: 10, padding: 13, marginBottom: 8 },
  optionText: { fontSize: 14, color: COLORS.ink, flex: 1 },
  label: { fontSize: 13, color: COLORS.sub, marginTop: 14, marginBottom: 6 },
  input: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, fontSize: 14, minHeight: 80, textAlignVertical: "top", borderWidth: 1, borderColor: COLORS.border },
  submitButton: { backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 20 },
  submitButtonDisabled: { opacity: 0.5 },
  submitButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 15 },
});
