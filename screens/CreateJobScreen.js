import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import { COLORS } from "../theme";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Internship", "Remote"];

export default function CreateJobScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [description, setDescription] = useState("");
  const [applyContact, setApplyContact] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    if (!title.trim()) return Alert.alert("Title required", "Give the position a title");
    if (!company.trim()) return Alert.alert("Company required", "Tell us who's hiring");
    if (!jobType) return Alert.alert("Job type required", "Select one of the options");
    if (!applyContact.trim()) return Alert.alert("Apply contact required", "Provide an email or link to apply");

    setSubmitting(true);
    try {
      const { data } = await client.post("/jobs", {
        title: title.trim(),
        company: company.trim(),
        location: location.trim(),
        jobType,
        salaryRange: salaryRange.trim(),
        description: description.trim(),
        applyContact: applyContact.trim(),
      });
      Alert.alert("Job submitted", "Your listing has been submitted and will appear once an admin approves it.");
      navigation.replace("JobDetail", { jobId: data.id });
    } catch (e) {
      Alert.alert("Couldn't create job posting", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 16 }}>
      <View style={styles.card}>
        <Text style={styles.label}>Job title</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="Software Engineer" />

        <Text style={styles.label}>Company</Text>
        <TextInput style={styles.input} value={company} onChangeText={setCompany} placeholder="Acme Ltd" />

        <Text style={styles.label}>Location</Text>
        <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Nairobi, Kenya (optional)" />

        <Text style={styles.label}>Job type</Text>
        <View style={styles.chipRow}>
          {JOB_TYPES.map((t) => (
            <TouchableOpacity key={t} style={[styles.chip, jobType === t && styles.chipActive]} onPress={() => setJobType(t)}>
              <Text style={[styles.chipText, jobType === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Salary range</Text>
        <TextInput style={styles.input} value={salaryRange} onChangeText={setSalaryRange} placeholder="e.g. KES 80,000 - 120,000 (optional)" />

        <Text style={styles.label}>Description</Text>
        <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} placeholder="Role details, requirements..." multiline />

        <Text style={styles.label}>Apply contact</Text>
        <TextInput style={styles.input} value={applyContact} onChangeText={setApplyContact} placeholder="email@company.com or https://..." autoCapitalize="none" />

        <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={submitting}>
          {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Submit for approval</Text>}
        </TouchableOpacity>
        <Text style={styles.hint}>New job postings are reviewed by an admin before they appear publicly.</Text>
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
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.ink, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: COLORS.accentInk },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 20 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
  hint: { color: COLORS.sub, fontSize: 12, textAlign: "center", marginTop: 10 },
});
