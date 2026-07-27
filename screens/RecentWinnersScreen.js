import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function RecentWinnersScreen() {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get("/spin/winners").then((r) => setWinners(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
      data={winners}
      keyExtractor={(_, i) => `winner-${i}`}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <View style={styles.trophy}>
            <Ionicons name="trophy" size={18} color="#F5A623" />
          </View>
          <View style={styles.info}>
            <Text style={styles.username}>@{item.userName}</Text>
            <Text style={styles.date}>{timeAgo(item.createdAt)}</Text>
          </View>
          <Text style={styles.prize}>KES {item.prizeKES.toLocaleString()}</Text>
        </View>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No jackpot winners yet — be the first!</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surface,
    borderRadius: 10, padding: 14, marginBottom: 10,
  },
  trophy: { width: 34, height: 34, borderRadius: 17, backgroundColor: "#FFF3CD", alignItems: "center", justifyContent: "center" },
  info: { flex: 1 },
  username: { fontWeight: "700", fontSize: 14.5, color: COLORS.ink },
  date: { color: COLORS.sub, fontSize: 12, marginTop: 2 },
  prize: { fontWeight: "800", fontSize: 15, color: COLORS.accent },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
