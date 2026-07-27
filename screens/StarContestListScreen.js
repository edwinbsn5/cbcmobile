import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import client from "../api/client";
import { COLORS } from "../theme";

function daysLeft(endAt) {
  const ms = endAt - Date.now();
  return Math.max(0, Math.ceil(ms / (24 * 60 * 60 * 1000)));
}

export default function StarContestListScreen({ route, navigation }) {
  const { mode } = route.params; // "current" | "past"
  const [contests, setContests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: mode === "past" ? "Past Contests" : "Current Contests" });
    client.get(`/star/contests?status=${mode}`).then((r) => setContests(r.data)).finally(() => setLoading(false));
  }, [mode]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 12 }}
      data={contests}
      keyExtractor={(c) => c.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("StarContestDetail", { contestId: item.id })}>
          <View style={styles.top}>
            <Text style={styles.name} numberOfLines={1}>{item.title}</Text>
            <View style={styles.prizeChip}><Text style={styles.prizeChipText}>KES {item.prizeKES.toLocaleString()}</Text></View>
          </View>
          <Text style={styles.desc} numberOfLines={2}>{item.challenge}</Text>
          <View style={styles.metaRow}>
            <Text style={styles.meta}>
              {mode === "past" ? "Ended " + new Date(item.endAt).toLocaleDateString() : `Ends in ${daysLeft(item.endAt)} day${daysLeft(item.endAt) === 1 ? "" : "s"}`}
            </Text>
            <Text style={styles.meta}><Text style={styles.metaBold}>{item.submissionCount}</Text> entries</Text>
          </View>
          {mode === "past" && item.winnerUserName && (
            <Text style={styles.winner}>🏆 Won by @{item.winnerUserName}</Text>
          )}
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={styles.empty}>{mode === "past" ? "No past contests yet" : "No contests are open right now — check back soon!"}</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, borderRadius: 11, padding: 14, marginBottom: 10 },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 },
  name: { flex: 1, fontSize: 15, fontWeight: "800", color: COLORS.ink },
  prizeChip: { backgroundColor: "#FFF3CD", borderRadius: 10, paddingHorizontal: 9, paddingVertical: 4 },
  prizeChipText: { color: "#7a4e00", fontSize: 11, fontWeight: "800" },
  desc: { fontSize: 12.5, color: COLORS.sub, marginTop: 6, lineHeight: 18 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 10 },
  meta: { fontSize: 11.5, color: COLORS.sub },
  metaBold: { color: COLORS.accent, fontWeight: "800" },
  winner: { fontSize: 12, color: "#7a4e00", fontWeight: "700", marginTop: 8 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
