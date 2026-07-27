import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import { COLORS } from "../theme";

const CATEGORIES = ["Child Safety (CSAE)", "Account Issues", "Report a Bug", "Suggest New Ideas", "Others"];

export default function NewTicketScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState(route.params?.category || null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSend() {
    if (!category) return Alert.alert("Category required", "Select what this is about");
    if (!subject.trim()) return Alert.alert("Subject required", "Give your ticket a short subject");
    if (!body.trim()) return Alert.alert("Message required", "Describe the issue or idea");

    setSubmitting(true);
    try {
      const { data } = await client.post("/support/tickets", { category, subject: subject.trim(), body: body.trim() });
      navigation.replace("TicketDetail", { ticketId: data.id });
    } catch (e) {
      Alert.alert("Couldn't send", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 20 }}>
      <Text style={styles.label}>Category</Text>
      <View style={styles.chipRow}>
        {CATEGORIES.map((c) => (
          <TouchableOpacity key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
            <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Subject</Text>
      <TextInput style={styles.input} value={subject} onChangeText={setSubject} placeholder="Short summary" maxLength={100} />

      <Text style={styles.label}>Message</Text>
      <TextInput
        style={[styles.input, styles.textarea]}
        value={body}
        onChangeText={setBody}
        placeholder="Describe what's going on..."
        multiline
        textAlignVertical="top"
      />

      <TouchableOpacity style={styles.button} onPress={handleSend} disabled={submitting}>
        {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Send</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.ink, marginBottom: 8, marginTop: 16 },
  chipRow: { flexDirection: "row", flexWrap: "wrap" },
  chip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8, marginBottom: 8 },
  chipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  chipText: { color: COLORS.ink, fontWeight: "600", fontSize: 13 },
  chipTextActive: { color: COLORS.accentInk },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, backgroundColor: COLORS.surface, fontSize: 14 },
  textarea: { height: 140 },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 28 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
});
