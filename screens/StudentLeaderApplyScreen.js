import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import client from "../api/client";
import CampusPicker from "../components/CampusPicker";
import CAMPUSES from "../data/campuses";
import { COLORS } from "../theme";

export default function StudentLeaderApplyScreen({ route, navigation }) {
  const editing = route.params?.application || null;

  const [officialName, setOfficialName] = useState(editing?.officialName || "");
  const [alias, setAlias] = useState(editing?.alias || "");
  const [campus, setCampus] = useState(editing?.campus && CAMPUSES.includes(editing.campus) ? editing.campus : "");
  const [yearsServedFrom, setYearsServedFrom] = useState(editing ? String(editing.yearsServedFrom) : "");
  const [yearsServedTo, setYearsServedTo] = useState(editing ? String(editing.yearsServedTo) : "");
  const [title, setTitle] = useState(editing?.title || "");
  const [email, setEmail] = useState(editing?.email || "");
  const [phone, setPhone] = useState(editing?.phone || "");
  const [message, setMessage] = useState(editing?.message || "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!officialName.trim()) return Alert.alert("Official name required", "Enter your official name");
    if (!CAMPUSES.includes(campus)) return Alert.alert("Campus/college required", "Type your campus/college name and select it from the suggestions");
    if (!title.trim()) return Alert.alert("Title required", "Enter the position/title you served");
    const from = parseInt(yearsServedFrom, 10);
    const to = parseInt(yearsServedTo, 10);
    if (!yearsServedFrom.trim() || isNaN(from)) return Alert.alert("Start year required", "Enter the year you started serving");
    if (!yearsServedTo.trim() || isNaN(to)) return Alert.alert("End year required", "Enter the year you finished serving");
    if (to < from) return Alert.alert("Invalid range", "The end year can't be before the start year");
    if (!email.trim()) return Alert.alert("Email required", "Enter a contact email");
    if (!phone.trim()) return Alert.alert("Phone required", "Enter a contact phone number");

    const body = {
      officialName: officialName.trim(),
      alias: alias.trim(),
      campus,
      yearsServedFrom: from,
      yearsServedTo: to,
      title: title.trim(),
      email: email.trim(),
      phone: phone.trim(),
      message: message.trim(),
    };

    setSubmitting(true);
    try {
      if (editing) {
        await client.patch(`/student-leaders/applications/${editing.id}`, body);
        Alert.alert("Application updated", "Your changes have been saved.");
      } else {
        await client.post("/student-leaders/apply", body);
        Alert.alert("Application submitted", "We'll notify you once it's been reviewed.");
      }
      navigation.goBack();
    } catch (e) {
      Alert.alert("Couldn't submit", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.card}>
        <Text style={styles.label}>Official Name</Text>
        <TextInput style={styles.input} value={officialName} onChangeText={setOfficialName} placeholder="Your full official name" />

        <Text style={styles.label}>Alias / Nickname</Text>
        <TextInput style={styles.input} value={alias} onChangeText={setAlias} placeholder="What comrades call you (optional)" />

        <Text style={styles.label}>Campus / College</Text>
        <CampusPicker value={campus} onChange={setCampus} />

        <Text style={styles.label}>Years Served</Text>
        <View style={styles.rangeRow}>
          <TextInput
            style={[styles.input, styles.rangeInput]}
            value={yearsServedFrom}
            onChangeText={setYearsServedFrom}
            placeholder="e.g. 2024"
            keyboardType="number-pad"
            maxLength={4}
          />
          <Text style={styles.rangeDash}>to</Text>
          <TextInput
            style={[styles.input, styles.rangeInput]}
            value={yearsServedTo}
            onChangeText={setYearsServedTo}
            placeholder="e.g. 2025"
            keyboardType="number-pad"
            maxLength={4}
          />
        </View>

        <Text style={styles.label}>Title (Position you served)</Text>
        <TextInput style={styles.input} value={title} onChangeText={setTitle} placeholder="e.g. Class Representative" />

        <Text style={styles.label}>Email</Text>
        <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="you@example.com" autoCapitalize="none" keyboardType="email-address" />

        <Text style={styles.label}>Phone No.</Text>
        <TextInput style={styles.input} value={phone} onChangeText={setPhone} placeholder="07XXXXXXXX" keyboardType="phone-pad" />

        <Text style={styles.label}>Message to Fellow Comrades</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          value={message}
          onChangeText={setMessage}
          placeholder="Say a few words to your fellow comrades (optional)"
          multiline
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>{editing ? "Save changes" : "Submit application"}</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 4, marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  rangeRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  rangeInput: { flex: 1 },
  rangeDash: { color: COLORS.sub, fontWeight: "600", fontSize: 13 },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 20 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
});
