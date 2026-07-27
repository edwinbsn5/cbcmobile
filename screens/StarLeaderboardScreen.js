import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import client from "../api/client";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

export default function StarLeaderboardScreen({ route, navigation }) {
  const { contestId } = route.params;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get(`/star/contests/${contestId}/leaderboard`).then((r) => setRows(r.data)).finally(() => setLoading(false));
  }, [contestId]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 12 }}
      data={rows}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("StarSubmissionDetail", { submissionId: item.id })}>
          <Text style={styles.position}>#{item.position}</Text>
          <Avatar uri={item.author?.avatar} name={item.author?.name} style={styles.avatar} />
          <View style={styles.info}>
            <Text style={styles.name} numberOfLines={1}>{item.author?.name}</Text>
            <Text style={styles.code} numberOfLines={1}>#{item.code}{item.caption ? ` · "${item.caption}"` : ""}</Text>
          </View>
          <View style={styles.stats}>
            <Text style={styles.points}>{item.points} pts</Text>
            <Text style={styles.prize}>KES {item.prizeKES.toLocaleString()}</Text>
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No submissions yet</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 9 },
  position: { width: 28, fontSize: 15, fontWeight: "800", color: "#F5A623" },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: COLORS.border },
  info: { flex: 1, minWidth: 0 },
  name: { fontSize: 13.5, fontWeight: "700", color: COLORS.ink },
  code: { fontSize: 11, color: COLORS.sub, marginTop: 2 },
  stats: { alignItems: "flex-end" },
  points: { fontSize: 13, fontWeight: "800", color: COLORS.accent },
  prize: { fontSize: 11, color: "#7a4e00", fontWeight: "700", marginTop: 2 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
