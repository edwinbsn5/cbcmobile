import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import client from "../api/client";
import { COLORS } from "../theme";

export default function JobsScreen({ navigation }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/jobs").then((r) => setJobs(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={jobs}
      keyExtractor={(j) => j.id}
      ListHeaderComponent={
        <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate("CreateJob")}>
          <Text style={styles.createButtonText}>+ Post a Job</Text>
        </TouchableOpacity>
      }
      ListEmptyComponent={<Text style={styles.empty}>No job postings yet — be the first to post one</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("JobDetail", { jobId: item.id })}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{item.title}</Text>
            {item.status !== "approved" && (
              <View style={styles.statusPill}>
                <Text style={styles.statusPillText}>{item.status === "rejected" ? "Rejected" : "Pending approval"}</Text>
              </View>
            )}
          </View>
          <Text style={styles.company}>{item.company}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.metaText}>{item.jobType}</Text>
            {!!item.location && <Text style={styles.metaText}> · {item.location}</Text>}
            {!!item.salaryRange && <Text style={styles.metaText}> · {item.salaryRange}</Text>}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  createButton: { backgroundColor: COLORS.accent, margin: 12, borderRadius: 8, padding: 12, alignItems: "center" },
  createButtonText: { color: COLORS.accentInk, fontWeight: "700" },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: { backgroundColor: COLORS.surface, marginHorizontal: 10, marginBottom: 10, borderRadius: 10, padding: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  title: { fontSize: 17, fontWeight: "700" },
  statusPill: { backgroundColor: "#FFF3CD", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  statusPillText: { color: "#856404", fontSize: 11, fontWeight: "700" },
  company: { color: COLORS.accent, fontWeight: "600", marginTop: 4 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  metaText: { color: COLORS.sub, fontSize: 12 },
});
