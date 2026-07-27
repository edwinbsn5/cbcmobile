import React, { useEffect, useState } from "react";
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

function formatWhen(startAt) {
  return new Date(startAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSaved, toggleSave, loadSaved } = useSaved();

  useEffect(() => {
    client.get("/events").then((r) => setEvents(r.data)).finally(() => setLoading(false));
    loadSaved();
  }, []);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={events}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={
        <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate("CreateEvent")}>
          <Text style={styles.createButtonText}>+ Create Event</Text>
        </TouchableOpacity>
      }
      ListEmptyComponent={<Text style={styles.empty}>No events yet — be the first to create one</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}>
          {item.coverUrl && <Image source={{ uri: item.coverUrl }} style={styles.cover} />}
          <View style={styles.body}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.name}</Text>
              <TouchableOpacity onPress={() => toggleSave("event", item.id)}>
                <Ionicons name={isSaved("event", item.id) ? "bookmark" : "bookmark-outline"} size={20} color={COLORS.accent} />
              </TouchableOpacity>
            </View>
            <Text style={styles.when}>{formatWhen(item.startAt)}</Text>
            {!!item.location && <Text style={styles.location}>{item.location}</Text>}
            <Text style={styles.host}>Hosted by {item.host?.name}</Text>
            <Text style={styles.counts}>{item.goingCount} going · {item.interestedCount} interested</Text>
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
  card: { backgroundColor: COLORS.surface, marginHorizontal: 10, marginBottom: 10, borderRadius: 10, overflow: "hidden" },
  cover: { width: "100%", height: 120, backgroundColor: "#eee" },
  body: { padding: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { fontSize: 17, fontWeight: "700" },
  when: { color: COLORS.accent, fontWeight: "600", marginTop: 4, fontSize: 13 },
  location: { color: COLORS.sub, marginTop: 2, fontSize: 13 },
  host: { color: COLORS.sub, fontSize: 12, marginTop: 6 },
  counts: { color: COLORS.sub, fontSize: 12, marginTop: 4 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
