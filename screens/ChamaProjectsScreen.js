import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

function formatKES(n) { return `KES ${Math.round(n || 0).toLocaleString()}`; }

const STATUS_LABELS = {
  planning: "Planning", in_progress: "In Progress", on_hold: "On Hold", completed: "Completed", cancelled: "Cancelled",
};
const STATUS_COLORS = {
  planning: { bg: "#E9EEF7", fg: COLORS.sub },
  in_progress: { bg: "#FFF3CD", fg: "#8A6D00" },
  on_hold: { bg: "#FDECEA", fg: "#C4433C" },
  completed: { bg: "#E3F5E9", fg: "#2E7D32" },
  cancelled: { bg: "#EEE", fg: "#777" },
};

export default function ChamaProjectsScreen({ route, navigation }) {
  const { chamaId, chamaName, isAdmin } = route.params;
  const [projects, setProjects] = useState(null);

  const load = useCallback(() => {
    client.get(`/chama/${chamaId}/projects`).then((r) => setProjects(r.data)).catch((e) => {
      setProjects([]);
      Alert.alert("Couldn't load projects", e.response?.data?.error || e.message);
    });
  }, [chamaId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <FlatList
      style={styles.container}
      data={projects || []}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View>
          <View style={styles.hero}>
            <Ionicons name="rocket-outline" size={22} color={COLORS.accent} />
            <Text style={styles.heroTitle}>Project Updates</Text>
            <Text style={styles.heroSubtitle}>Business projects run by {chamaName}, tracked from idea to payoff.</Text>
          </View>
          {isAdmin && (
            <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate("CreateChamaProject", { chamaId })}>
              <Ionicons name="add" size={18} color={COLORS.accentInk} />
              <Text style={styles.createButtonText}>New project</Text>
            </TouchableOpacity>
          )}
        </View>
      }
      ListEmptyComponent={
        projects === null ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.accent} /> : (
          <Text style={styles.empty}>{isAdmin ? "No projects yet — post one to keep members updated." : "No projects posted yet."}</Text>
        )
      }
      renderItem={({ item }) => {
        const pct = item.budgetKES ? Math.min(100, Math.round((item.spentKES / item.budgetKES) * 100)) : null;
        const sc = STATUS_COLORS[item.status] || STATUS_COLORS.planning;
        return (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("ChamaProjectDetail", { chamaId, projectId: item.id, isAdmin })}>
            <View style={styles.cardTop}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={[styles.statusPill, { backgroundColor: sc.bg }]}>
                <Text style={[styles.statusPillText, { color: sc.fg }]}>{STATUS_LABELS[item.status] || item.status}</Text>
              </View>
            </View>
            {!!item.objectives && <Text style={styles.cardDesc} numberOfLines={2}>{item.objectives}</Text>}
            {pct !== null && (
              <View style={{ marginTop: 10 }}>
                <View style={styles.barTrack}><View style={[styles.barFill, { width: `${pct}%` }]} /></View>
                <Text style={styles.budgetText}>{formatKES(item.spentKES)} of {formatKES(item.budgetKES)} spent</Text>
              </View>
            )}
            {(!!item.startDate || !!item.endDate) && (
              <Text style={styles.timelineText}>
                {item.startDate ? new Date(item.startDate).toLocaleDateString() : "—"} → {item.endDate ? new Date(item.endDate).toLocaleDateString() : "—"}
              </Text>
            )}
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: { backgroundColor: COLORS.accentInk, marginHorizontal: 12, marginTop: 12, borderRadius: 12, paddingVertical: 20, paddingHorizontal: 20, alignItems: "center" },
  heroTitle: { color: "#fff", fontSize: 18, fontWeight: "800", marginTop: 8 },
  heroSubtitle: { color: "#B9C6DC", fontSize: 12, marginTop: 6, textAlign: "center", lineHeight: 18 },
  createButton: { flexDirection: "row", gap: 6, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.accent, marginHorizontal: 12, marginTop: 12, borderRadius: 8, padding: 12 },
  createButtonText: { color: COLORS.accentInk, fontWeight: "700" },
  empty: { textAlign: "center", color: COLORS.sub, marginTop: 40 },
  card: { backgroundColor: COLORS.surface, marginHorizontal: 12, marginTop: 12, borderRadius: 10, padding: 14 },
  cardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  cardTitle: { color: COLORS.ink, fontSize: 15.5, fontWeight: "700", flex: 1 },
  statusPill: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  statusPillText: { fontSize: 10.5, fontWeight: "700" },
  cardDesc: { color: COLORS.sub, fontSize: 12.5, marginTop: 6, lineHeight: 18 },
  barTrack: { height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: "hidden" },
  barFill: { height: 6, backgroundColor: COLORS.accent, borderRadius: 3 },
  budgetText: { color: COLORS.sub, fontSize: 11, marginTop: 5 },
  timelineText: { color: COLORS.sub, fontSize: 11, marginTop: 8 },
});
