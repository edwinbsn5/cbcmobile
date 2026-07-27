import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, ScrollView } from "react-native";
import client from "../api/client";
import { COLORS } from "../theme";

export default function ReportImposterScreen({ navigation }) {
  const [username, setUsername] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!username.trim()) return Alert.alert("Username required", "Enter the username of the Student Leader you're reporting");
    if (!reason.trim()) return Alert.alert("Reason required", "Explain why you believe this leader didn't qualify or cheated");

    setSubmitting(true);
    try {
      await client.post("/student-leaders/report-imposter", { username: username.trim(), reason: reason.trim() });
      Alert.alert("Report submitted", "Thanks — our team will review this.");
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't submit report", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.title}>Report Imposter</Text>
      <Text style={styles.intro}>
        If you believe an approved Student Leader didn't qualify, or cheated to get approved, tell us who and why.
      </Text>

      <View style={styles.card}>
        <Text style={styles.label}>Username</Text>
        <TextInput
          style={styles.input}
          value={username}
          onChangeText={setUsername}
          placeholder="Their username"
          autoCapitalize="none"
        />

        <Text style={styles.label}>Reason for reporting</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={reason}
          onChangeText={setReason}
          placeholder="Explain what happened..."
          multiline
          maxLength={500}
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Submit report</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.ink },
  intro: { color: COLORS.sub, fontSize: 13.5, lineHeight: 19, marginTop: 8, marginBottom: 16 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 4, marginTop: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink },
  multiline: { minHeight: 100, textAlignVertical: "top", marginTop: 12 },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 20 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
});
