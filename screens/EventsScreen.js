import React, { useCallback, useState } from "react";
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

const FILTERS = [
  { key: "upcoming", label: "Upcoming Events", icon: "time-outline", desc: "Everything ahead, soonest first" },
  { key: "popular", label: "Popular Events", icon: "trending-up-outline", desc: "Most people going, among events yet to happen" },
  { key: "going", label: "Events I'm Going To", icon: "checkmark-circle-outline", desc: "Events you've RSVP'd Going to" },
  { key: "interested", label: "Events I'm Interested In", icon: "star-outline", desc: "Events you've marked Interested" },
  { key: "hosting", label: "Events I'm Hosting", icon: "shield-checkmark-outline", desc: "Events you created" },
];

function formatWhen(startAt) {
  return new Date(startAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function EventsScreen({ navigation }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { isSaved, toggleSave, loadSaved } = useSaved();

  const load = useCallback(() => {
    client
      .get("/events", filter ? { params: { filter } } : undefined)
      .then((r) => setEvents(r.data))
      .catch((e) => Alert.alert("Couldn't load events", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
    loadSaved();
  }, [filter, loadSaved]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function selectFilter(key) {
    setLoading(true);
    setFilter(key);
    setPickerOpen(false);
  }

  const activeFilter = FILTERS.find((f) => f.key === filter);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <>
      <FlatList
        style={styles.container}
        data={events}
        keyExtractor={(e) => e.id}
        ListHeaderComponent={
          <View>
            <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate("CreateEvent")}>
              <Text style={styles.createButtonText}>+ Create Event</Text>
            </TouchableOpacity>

            <View style={styles.hero}>
              <Text style={styles.heroBadge}>✦ Events ✦</Text>
              <Text style={styles.heroTitle}>Never Miss Out.</Text>
              <Text style={styles.heroSubtitle}>Campus events, meetups &amp; gatherings worth showing up for.</Text>
            </View>

            <TouchableOpacity style={styles.filterButton} onPress={() => setPickerOpen(true)}>
              <Ionicons name="filter-outline" size={16} color={COLORS.accent} />
              <Text style={styles.filterButtonText}>{activeFilter ? activeFilter.label : "Filter Events"}</Text>
            </TouchableOpacity>
            {activeFilter && (
              <TouchableOpacity onPress={() => selectFilter(null)}>
                <Text style={styles.clearFilterText}>✕ Clear filter — showing all events</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filter === "going"
              ? "You haven't RSVP'd Going to any events yet"
              : filter === "interested"
              ? "You haven't marked any events Interested yet"
              : filter === "hosting"
              ? "You aren't hosting any events yet"
              : filter === "popular"
              ? "No events qualify yet — check back later"
              : "No events yet — be the first to create one"}
          </Text>
        }
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

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Filter Events</Text>
            {FILTERS.map((f) => (
              <TouchableOpacity key={f.key} style={styles.filterOption} onPress={() => selectFilter(f.key)}>
                <View style={styles.filterOptionIcon}>
                  <Ionicons name={f.icon} size={18} color={COLORS.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.filterOptionLabel}>{f.label}</Text>
                  <Text style={styles.filterOptionDesc}>{f.desc}</Text>
                </View>
                {filter === f.key && <Ionicons name="checkmark" size={18} color={COLORS.accent} />}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  createButton: { backgroundColor: COLORS.accent, marginHorizontal: 12, marginTop: 12, borderRadius: 8, padding: 12, alignItems: "center" },
  createButtonText: { color: COLORS.accentInk, fontWeight: "700" },
  hero: { backgroundColor: COLORS.accentInk, marginHorizontal: 12, marginTop: 12, borderRadius: 12, paddingVertical: 22, paddingHorizontal: 20, alignItems: "center" },
  heroBadge: { color: COLORS.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  heroTitle: { color: "#fff", fontSize: 19, fontWeight: "800", textAlign: "center", marginTop: 10 },
  heroSubtitle: { color: "#B9C6DC", fontSize: 12, marginTop: 8, textAlign: "center", lineHeight: 18 },
  filterButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.accent, marginHorizontal: 12, marginTop: 8, borderRadius: 8, padding: 11,
  },
  filterButtonText: { color: COLORS.accent, fontWeight: "700" },
  clearFilterText: { color: COLORS.sub, fontSize: 12, textAlign: "center", marginTop: 8, textDecorationLine: "underline" },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: { backgroundColor: COLORS.surface, marginHorizontal: 10, marginBottom: 10, borderRadius: 10, overflow: "hidden" },
  cover: { width: "100%", height: 120, backgroundColor: "#eee" },
  body: { padding: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  name: { color: COLORS.ink, fontSize: 17, fontWeight: "700" },
  when: { color: COLORS.accent, fontWeight: "600", marginTop: 4, fontSize: 13 },
  location: { color: COLORS.sub, marginTop: 2, fontSize: 13 },
  host: { color: COLORS.sub, fontSize: 12, marginTop: 6 },
  counts: { color: COLORS.sub, fontSize: 12, marginTop: 4 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16 },
  modalTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "800", marginBottom: 10 },
  filterOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  filterOptionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  filterOptionLabel: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  filterOptionDesc: { fontSize: 11.5, color: COLORS.sub, marginTop: 1 },
});
