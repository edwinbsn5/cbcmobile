import React, { useCallback, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

export default function GuarantorsScreen() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [relationship, setRelationship] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(() => {
    client.get("/guarantors/mine").then((r) => setData(r.data)).catch((e) => Alert.alert("Couldn't load", e.response?.data?.error || e.message)).finally(() => setLoading(false));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function sendRequest() {
    if (!username.trim()) return Alert.alert("Username required", "Enter their platform username");
    setSubmitting(true);
    try {
      await client.post("/guarantors/request", { username: username.trim(), relationship: relationship.trim() || undefined });
      setUsername(""); setRelationship("");
      Alert.alert("Request sent", "They'll get a notification to accept or decline.");
      load();
    } catch (e) {
      Alert.alert("Couldn't send request", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function respond(id, action) {
    try { await client.post(`/guarantors/${id}/${action}`); load(); }
    catch (e) { Alert.alert("Couldn't respond", e.response?.data?.error || e.message); }
  }

  if (loading || !data) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const pendingRequestsOfMe = data.requestsOfMe.filter((r) => r.status === "pending");

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.statusCard}>
        <Ionicons name={data.isFullyGuaranteed ? "checkmark-circle" : "people-outline"} size={22} color={data.isFullyGuaranteed ? "#2E7D32" : COLORS.sub} />
        <Text style={[styles.statusText, data.isFullyGuaranteed && { color: "#2E7D32" }]}>
          {data.guarantors.filter((g) => g.status === "accepted").length} of {data.required} guarantors accepted
        </Text>
      </View>
      <Text style={styles.intro}>
        Guarantors are a social-accountability signal, not a legal guarantee — they're notified if you're ever confirmed for fraud.
        Some groups require {data.required} accepted guarantors before you can join.
      </Text>

      {!!pendingRequestsOfMe.length && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>People asking you to be their guarantor</Text>
          {pendingRequestsOfMe.map((r) => (
            <View key={r.id} style={styles.row}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowName}>{r.principal?.name}</Text>
                {!!r.relationship && <Text style={styles.rowSub}>{r.relationship}</Text>}
              </View>
              <View style={styles.rowActions}>
                <TouchableOpacity style={styles.approveBtn} onPress={() => respond(r.id, "accept")}><Text style={styles.approveBtnText}>Accept</Text></TouchableOpacity>
                <TouchableOpacity style={styles.rejectBtn} onPress={() => respond(r.id, "decline")}><Text style={styles.rejectBtnText}>Decline</Text></TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>My guarantors</Text>
        {data.guarantors.map((g) => (
          <View key={g.id} style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{g.guarantor?.name}</Text>
              {!!g.relationship && <Text style={styles.rowSub}>{g.relationship}</Text>}
            </View>
            <Text style={[styles.statusBadge, g.status === "accepted" && styles.statusAccepted, g.status === "declined" && styles.statusDeclined]}>{g.status}</Text>
          </View>
        ))}
        {!data.guarantors.length && <Text style={styles.empty}>You haven't added any guarantors yet.</Text>}
      </View>

      {data.guarantors.filter((g) => g.status !== "declined").length < data.required && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Add a guarantor</Text>
          <TextInput style={styles.input} placeholder="Their platform username" value={username} onChangeText={setUsername} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Relationship (e.g. Brother, Employer)" value={relationship} onChangeText={setRelationship} />
          <TouchableOpacity style={styles.button} onPress={sendRequest} disabled={submitting}>
            <Text style={styles.buttonText}>{submitting ? "Sending..." : "Send request"}</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  statusCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 8 },
  statusText: { fontWeight: "800", fontSize: 14, color: COLORS.ink },
  intro: { color: COLORS.sub, fontSize: 12.5, lineHeight: 18, marginBottom: 16 },
  section: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.3 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowName: { color: COLORS.ink, fontWeight: "700", fontSize: 13.5 },
  rowSub: { color: COLORS.sub, fontSize: 11.5, marginTop: 2 },
  rowActions: { flexDirection: "row", gap: 8 },
  approveBtn: { backgroundColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  approveBtnText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 12 },
  rejectBtn: { backgroundColor: "#FBE7E7", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  rejectBtnText: { color: "#D32F2F", fontWeight: "700", fontSize: 12 },
  statusBadge: { fontSize: 11.5, fontWeight: "700", color: "#8A6D00", textTransform: "uppercase" },
  statusAccepted: { color: "#2E7D32" },
  statusDeclined: { color: "#D32F2F" },
  empty: { color: COLORS.sub, textAlign: "center", paddingVertical: 8 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 10, color: COLORS.ink },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 4 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
});
