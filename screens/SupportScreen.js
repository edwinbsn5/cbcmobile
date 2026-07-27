import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

const CATEGORY_ICONS = {
  "Child Safety (CSAE)": "alert-circle-outline",
  "Account Issues": "person-circle-outline",
  "Report a Bug": "bug-outline",
  "Suggest New Ideas": "bulb-outline",
  Others: "help-circle-outline",
};

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function SupportScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [tab, setTab] = useState("open");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await client.get("/support/tickets");
    setTickets(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  const filtered = tickets.filter((t) => t.status === tab);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <View style={styles.container}>
      <View style={styles.segment}>
        <TouchableOpacity style={[styles.segmentItem, tab === "open" && styles.segmentItemActive]} onPress={() => setTab("open")}>
          <Text style={[styles.segmentText, tab === "open" && styles.segmentTextActive]}>Open</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.segmentItem, tab === "closed" && styles.segmentItemActive]} onPress={() => setTab("closed")}>
          <Text style={[styles.segmentText, tab === "closed" && styles.segmentTextActive]}>Closed</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(t) => t.id}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>{tab === "open" ? "No open tickets" : "No closed tickets"}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("TicketDetail", { ticketId: item.id })}>
            <View style={styles.iconWrap}>
              <Ionicons name={CATEGORY_ICONS[item.category] || "help-circle-outline"} size={20} color={COLORS.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.subject} numberOfLines={1}>{item.subject}</Text>
              <Text style={styles.meta}>{item.category} · {timeAgo(item.lastMessageAt)}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate("NewTicket")}>
        <Ionicons name="add" size={24} color={COLORS.accentInk} />
        <Text style={styles.fabText}>New Ticket</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  segment: { flexDirection: "row", backgroundColor: COLORS.surface, borderRadius: 10, padding: 3, gap: 3, margin: 12, marginBottom: 0 },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 9, borderRadius: 8 },
  segmentItemActive: { backgroundColor: COLORS.accent },
  segmentText: { fontSize: 13, fontWeight: "700", color: COLORS.sub },
  segmentTextActive: { color: COLORS.accentInk },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, padding: 14, borderRadius: 12, marginBottom: 8, gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  subject: { fontSize: 14.5, fontWeight: "700", color: COLORS.ink },
  meta: { fontSize: 12, color: COLORS.sub, marginTop: 2 },
  empty: { textAlign: "center", color: COLORS.sub, marginTop: 40 },
  fab: {
    position: "absolute", bottom: 20, right: 16, backgroundColor: COLORS.accent, borderRadius: 24,
    paddingVertical: 12, paddingHorizontal: 18, flexDirection: "row", alignItems: "center", gap: 6,
    shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, shadowOffset: { width: 0, height: 3 }, elevation: 4,
  },
  fabText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 14 },
});
