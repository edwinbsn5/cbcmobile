import React, { useCallback, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import { COLORS } from "../theme";

function StatusBadge({ status }) {
  const meta = {
    pending: { label: "Pending", color: "#8A6D00" },
    investigating: { label: "Investigating", color: "#8A6D00" },
    confirmed: { label: "Confirmed", color: "#D32F2F" },
    dismissed: { label: "Dismissed", color: "#2E7D32" },
  }[status] || { label: status, color: COLORS.sub };
  return <Text style={[styles.badge, { color: meta.color }]}>{meta.label}</Text>;
}

export default function MyFraudReportsScreen() {
  const [reports, setReports] = useState(null);
  const [appealDrafts, setAppealDrafts] = useState({});
  const [submittingId, setSubmittingId] = useState(null);

  const load = useCallback(() => {
    client.get("/fraud-reports/mine").then((r) => setReports(r.data)).catch((e) => Alert.alert("Couldn't load", e.response?.data?.error || e.message));
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function submitAppeal(report) {
    const message = (appealDrafts[report.id] || "").trim();
    if (!message) return Alert.alert("Message required", "Explain why this ruling should be reconsidered");
    setSubmittingId(report.id);
    try {
      await client.post(`/fraud-reports/${report.id}/appeal`, { message });
      Alert.alert("Appeal submitted", "A platform admin will review it.");
      load();
    } catch (e) {
      Alert.alert("Couldn't submit appeal", e.response?.data?.error || e.message);
    } finally {
      setSubmittingId(null);
    }
  }

  if (!reports) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.intro}>Fraud/dispute reports filed against you, across every Chama and Project group.</Text>
      {reports.map((r) => {
        const canAppeal = r.status === "confirmed" && !r.appealUsed && Date.now() < r.appealDeadlineAt;
        return (
          <View key={r.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.reason}>{r.reason}</Text>
              <StatusBadge status={r.status} />
            </View>
            <Text style={styles.meta}>Filed by {r.reporter?.name} · {new Date(r.createdAt).toLocaleDateString()}</Text>
            {!!r.details && <Text style={styles.details}>{r.details}</Text>}
            {r.ruledAt != null && <Text style={styles.ruling}>Ruling: {r.rulingNotes || "(no notes provided)"}</Text>}
            {r.status === "confirmed" && r.appealDeadlineAt && Date.now() < r.appealDeadlineAt && !r.appealUsed && (
              <Text style={styles.deadline}>Appeal window closes {new Date(r.appealDeadlineAt).toLocaleDateString()}</Text>
            )}
            {canAppeal && (
              <View style={styles.appealBox}>
                <TextInput
                  style={[styles.input, styles.multiline]}
                  placeholder="Explain why this should be reconsidered..."
                  value={appealDrafts[r.id] || ""}
                  onChangeText={(v) => setAppealDrafts((prev) => ({ ...prev, [r.id]: v }))}
                  multiline
                />
                <TouchableOpacity style={styles.button} onPress={() => submitAppeal(r)} disabled={submittingId === r.id}>
                  <Text style={styles.buttonText}>{submittingId === r.id ? "Submitting..." : "Submit appeal"}</Text>
                </TouchableOpacity>
              </View>
            )}
            {r.appealUsed && r.status === "investigating" && <Text style={styles.meta}>Your appeal is under review.</Text>}
          </View>
        );
      })}
      {!reports.length && <Text style={styles.empty}>No reports have been filed against you.</Text>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  intro: { color: COLORS.sub, fontSize: 12.5, marginBottom: 14, lineHeight: 18 },
  card: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  reason: { color: COLORS.ink, fontWeight: "800", fontSize: 14, flex: 1, marginRight: 8 },
  badge: { fontSize: 11, fontWeight: "800", textTransform: "uppercase" },
  meta: { color: COLORS.sub, fontSize: 11.5, marginTop: 4 },
  details: { color: COLORS.ink, fontSize: 12.5, marginTop: 8, lineHeight: 18 },
  ruling: { color: COLORS.ink, fontSize: 12.5, marginTop: 8, backgroundColor: COLORS.wash, padding: 8, borderRadius: 6 },
  deadline: { color: "#8A6D00", fontSize: 11.5, marginTop: 6, fontWeight: "600" },
  appealBox: { marginTop: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 8, color: COLORS.ink },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 11, alignItems: "center" },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
