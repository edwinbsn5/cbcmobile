import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import { COLORS } from "../theme";

const WINDOWS = [
  { hours: 24, label: "24 hours" },
  { hours: 72, label: "3 days" },
  { hours: 168, label: "7 days" },
];

export default function TrendingHashtagsScreen({ navigation }) {
  const [hours, setHours] = useState(24);
  const [tags, setTags] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    client.get("/hashtags/trending", { params: { hours } }).then((r) => setTags(r.data))
      .catch((e) => Alert.alert("Couldn't load trending hashtags", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [hours]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <View style={styles.windowRow}>
        {WINDOWS.map((w) => (
          <TouchableOpacity key={w.hours} style={[styles.windowChip, hours === w.hours && styles.windowChipActive]} onPress={() => { setLoading(true); setHours(w.hours); }}>
            <Text style={[styles.windowChipText, hours === w.hours && styles.windowChipTextActive]}>{w.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />
      ) : (
        <FlatList
          data={tags}
          keyExtractor={(t) => t.id}
          ListEmptyComponent={<Text style={styles.empty}>Nothing trending in this window yet</Text>}
          renderItem={({ item, index }) => (
            <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("HashtagFeed", { tag: item.name })}>
              <Text style={styles.rank}>{index + 1}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.tagText}>#{item.name}</Text>
                <Text style={styles.meta}>{item.recentCount} post{item.recentCount === 1 ? "" : "s"} in this window</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  windowRow: { flexDirection: "row", gap: 8, padding: 12 },
  windowChip: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 8, backgroundColor: COLORS.surface },
  windowChipActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  windowChipText: { color: COLORS.ink, fontWeight: "600", fontSize: 13 },
  windowChipTextActive: { color: COLORS.accentInk },
  row: { flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: COLORS.surface, marginHorizontal: 12, marginBottom: 8, borderRadius: 10, padding: 14 },
  rank: { fontSize: 18, fontWeight: "800", color: COLORS.sub, width: 24 },
  tagText: { fontSize: 15, fontWeight: "700", color: COLORS.accent },
  meta: { color: COLORS.sub, fontSize: 12, marginTop: 2 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
