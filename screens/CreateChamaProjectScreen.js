import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert } from "react-native";
import client from "../api/client";
import { COLORS } from "../theme";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(s) {
  if (!s?.trim()) return undefined;
  if (!DATE_RE.test(s.trim())) return null;
  const t = new Date(`${s.trim()}T00:00:00`).getTime();
  return isNaN(t) ? null : t;
}

export default function CreateChamaProjectScreen({ route, navigation }) {
  const { chamaId } = route.params;
  const [title, setTitle] = useState("");
  const [objectives, setObjectives] = useState("");
  const [budget, setBudget] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (!title.trim()) return Alert.alert("Title required", "Give this project a name");
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (start === null) return Alert.alert("Invalid start date", "Use the format YYYY-MM-DD, e.g. 2026-09-01");
    if (end === null) return Alert.alert("Invalid end date", "Use the format YYYY-MM-DD, e.g. 2026-12-31");
    const budgetKES = budget.trim() ? parseInt(budget, 10) : undefined;
    if (budget.trim() && (!Number.isInteger(budgetKES) || budgetKES < 0)) return Alert.alert("Invalid budget", "Enter a whole number in KES");

    setSubmitting(true);
    try {
      const { data } = await client.post(`/chama/${chamaId}/projects`, {
        title: title.trim(), objectives: objectives.trim() || undefined, budgetKES, startDate: start, endDate: end,
      });
      navigation.replace("ChamaProjectDetail", { chamaId, projectId: data.id, isAdmin: true });
    } catch (e) {
      Alert.alert("Couldn't create project", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.label}>Project title</Text>
      <TextInput style={styles.input} placeholder="e.g. Poultry Farm Expansion" value={title} onChangeText={setTitle} />

      <Text style={styles.label}>Objectives</Text>
      <TextInput style={[styles.input, styles.multiline]} placeholder="What is this project trying to achieve?" value={objectives} onChangeText={setObjectives} multiline />

      <Text style={styles.label}>Budget (KES, optional)</Text>
      <TextInput style={styles.input} placeholder="e.g. 150000" keyboardType="number-pad" value={budget} onChangeText={setBudget} />

      <Text style={styles.label}>Start date (optional)</Text>
      <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={startDate} onChangeText={setStartDate} />

      <Text style={styles.label}>Target end date (optional)</Text>
      <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={endDate} onChangeText={setEndDate} />

      <TouchableOpacity style={styles.primaryButton} onPress={submit} disabled={submitting}>
        <Text style={styles.primaryButtonText}>{submitting ? "Creating..." : "Create project"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  label: { fontSize: 12.5, color: COLORS.sub, marginBottom: 5, marginTop: 14, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 11, color: COLORS.ink, backgroundColor: COLORS.surface },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 13, alignItems: "center", marginTop: 24 },
  primaryButtonText: { color: COLORS.accentInk, fontWeight: "700" },
});
