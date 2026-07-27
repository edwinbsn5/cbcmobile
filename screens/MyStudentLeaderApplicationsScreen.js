import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import { COLORS } from "../theme";

const STATUS_STYLE = {
  approved: { bg: "#E6F4EA", fg: "#1E7E34" },
  pending: { bg: "#FFF3CD", fg: "#8A6300" },
  declined: { bg: "#FBE4E4", fg: "#B23B32" },
};

export default function MyStudentLeaderApplicationsScreen({ navigation }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    client.get("/student-leaders/my-applications").then((r) => setApplications(r.data)).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleDelete(id) {
    Alert.alert("Withdraw application", "Withdraw this application? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Withdraw", style: "destructive",
        onPress: async () => {
          try {
            await client.delete(`/student-leaders/applications/${id}`);
            load();
          } catch (e) {
            Alert.alert("Couldn't withdraw", e.response?.data?.error || e.message);
          }
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 12 }}
      data={applications}
      keyExtractor={(a) => a.id}
      ListEmptyComponent={<Text style={styles.empty}>You haven't applied for Student Leader recognition yet.</Text>}
      renderItem={({ item }) => {
        const statusStyle = STATUS_STYLE[item.status] || STATUS_STYLE.pending;
        return (
          <View style={styles.card}>
            <View style={styles.headerRow}>
              <Text style={styles.name}>{item.officialName}{item.alias ? ` ("${item.alias}")` : ""}</Text>
              <View style={[styles.statusPill, { backgroundColor: statusStyle.bg }]}>
                <Text style={[styles.statusText, { color: statusStyle.fg }]}>{item.status}</Text>
              </View>
            </View>
            <Text style={styles.meta}>{item.title} · Served {item.yearsServedFrom}-{item.yearsServedTo}</Text>
            <Text style={styles.meta}>{item.email} · {item.phone}</Text>
            {!!item.message && <Text style={styles.message}>"{item.message}"</Text>}

            {item.status === "pending" && (
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("StudentLeaderApply", { application: item })}>
                  <Text style={styles.actionText}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(item.id)}>
                  <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginBottom: 10 },
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  name: { fontSize: 15, fontWeight: "700", color: COLORS.ink, flex: 1 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  statusText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  meta: { color: COLORS.sub, fontSize: 12.5, marginTop: 4 },
  message: { color: COLORS.ink, fontSize: 13, marginTop: 8, fontStyle: "italic" },
  actionsRow: { flexDirection: "row", marginTop: 12 },
  actionButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8 },
  actionText: { fontWeight: "600", fontSize: 13, color: COLORS.ink },
  deleteButton: { borderColor: "#D32F2F" },
  deleteText: { color: "#D32F2F" },
  empty: { textAlign: "center", color: COLORS.sub, marginTop: 40, marginHorizontal: 24, lineHeight: 20 },
});
