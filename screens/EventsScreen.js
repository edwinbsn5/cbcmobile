import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import client from "../api/client";
import CountyPicker from "../components/CountyPicker";
import { useAuth } from "../context/AuthContext";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

const COUNTY_STORAGE_KEY = "eventsBrowseCounty";

const FILTERS = [
  { key: "upcoming", label: "Upcoming" },
  { key: "popular", label: "Popular" },
  { key: "going", label: "Going" },
  { key: "interested", label: "Interested" },
  { key: "hosting", label: "Hosting" },
];

function formatWhen(startAt) {
  return new Date(startAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

// Fixed navy header band (mirrors every other "hero" section's own navy)
// sitting outside the FlatList so it stays put while the list scrolls
// underneath — search + county + underline filter tabs live below it,
// inside the scrolling content. Ported from Fundi Jikoni's own
// EventsListScreen/EventCard layout.
export default function EventsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("upcoming");
  const [county, setCounty] = useState("");
  const [loadedCounty, setLoadedCounty] = useState(false);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const { isSaved, toggleSave, loadSaved } = useSaved();

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);

  // Defaults to the user's own profile county the first time this screen
  // ever loads (no saved preference yet) so the list pre-loads immediately
  // — still switchable, and remembered from then on. Only scopes the two
  // browse-everyone filters (Upcoming/Popular) server-side; Going/
  // Interested/Hosting ignore it.
  useFocusEffect(useCallback(() => {
    if (loadedCounty) return;
    AsyncStorage.getItem(COUNTY_STORAGE_KEY).then((saved) => {
      setCounty(saved || user?.county || "");
      setLoadedCounty(true);
    });
  }, [loadedCounty, user?.county]));

  function handleCountyChange(c) {
    setCounty(c);
    AsyncStorage.setItem(COUNTY_STORAGE_KEY, c).catch(() => {});
  }

  const load = useCallback(() => {
    if (!loadedCounty) return;
    setLoading(true);
    client
      .get("/events", { params: { filter, county: county || undefined, q: debouncedQ || undefined } })
      .then((r) => setEvents(r.data))
      .catch((e) => Alert.alert("Couldn't load events", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
    loadSaved();
  }, [filter, county, debouncedQ, loadedCounty, loadSaved]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs", { screen: "Home" }))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={19} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>Events</Text>
          <Text style={styles.headerSubtitle}>Meetups happening around the country</Text>
        </View>
      </View>

      <FlatList
        data={events}
        keyExtractor={(e) => e.id}
        refreshing={loading}
        onRefresh={load}
        contentContainerStyle={{ padding: 12, paddingBottom: insets.bottom + 90 }}
        ListHeaderComponent={
          <View>
            <View style={styles.searchRow}>
              <Ionicons name="search-outline" size={16} color={COLORS.sub} />
              <TextInput
                style={styles.searchInput}
                value={q}
                onChangeText={setQ}
                placeholder="Search events..."
                placeholderTextColor={COLORS.sub}
                returnKeyType="search"
              />
            </View>

            <View style={styles.countyBox}>
              <View style={styles.countyRow}>
                <Text style={styles.countyLabel}>County: Find Events Near You</Text>
                {!!county && (
                  <TouchableOpacity onPress={() => handleCountyChange("")}>
                    <Text style={styles.countyClear}>Clear</Text>
                  </TouchableOpacity>
                )}
              </View>
              <CountyPicker value={county} onChange={handleCountyChange} placeholder="Any county" />
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow}>
              {FILTERS.map((f) => (
                <TouchableOpacity key={f.key} style={styles.tab} onPress={() => setFilter(f.key)}>
                  <Text style={[styles.tabText, filter === f.key && styles.tabTextActive]}>{f.label}</Text>
                  <View style={[styles.tabMarker, filter === f.key && styles.tabMarkerActive]} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        }
        ListEmptyComponent={
          loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.accent} /> : (
            <Text style={styles.empty}>
              {filter === "going"
                ? "You haven't RSVP'd Going to any events yet"
                : filter === "interested"
                ? "You haven't marked any events Interested yet"
                : filter === "hosting"
                ? "You aren't hosting any events yet"
                : filter === "popular"
                ? "No events qualify yet — check back later"
                : "No events here yet — be the first to create one"}
            </Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}>
            {item.coverUrl ? (
              <Image source={{ uri: item.coverUrl }} style={styles.cover} contentFit="cover" />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder]}>
                <Ionicons name="calendar-outline" size={28} color={COLORS.accent} />
              </View>
            )}
            <View style={styles.body}>
              <View style={styles.nameRow}>
                <View style={styles.nameWithBadge}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.isBoosted && (
                    <View style={styles.boostedPill}>
                      <Text style={styles.boostedPillText}>⚡ Boosted</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity onPress={() => toggleSave("event", item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={isSaved("event", item.id) ? "bookmark" : "bookmark-outline"} size={20} color={COLORS.accent} />
                </TouchableOpacity>
              </View>
              <Text style={styles.when}>{formatWhen(item.startAt)}</Text>
              {!!item.location && (
                <Text style={styles.location}>{item.location}{item.county ? ` · ${item.county}` : ""}</Text>
              )}
              <View style={styles.footerRow}>
                <Text style={styles.host}>Hosted by {item.host?.name}</Text>
                <Text style={styles.counts}>{item.goingCount} going · {item.interestedCount} interested</Text>
              </View>
              {item.status === "cancelled" && (
                <View style={styles.cancelledBadge}><Text style={styles.cancelledBadgeText}>Cancelled</Text></View>
              )}
            </View>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={[styles.fab, { bottom: insets.bottom + 18 }]} onPress={() => navigation.navigate("CreateEvent")}>
        <Ionicons name="add" size={24} color={COLORS.accentInk} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.accentInk, paddingHorizontal: 16, paddingBottom: 16, flexDirection: "row", alignItems: "center", gap: 10 },
  backBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 19, fontWeight: "800", color: "#fff" },
  headerSubtitle: { fontSize: 12, color: "#B9C6DC", marginTop: 3 },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, paddingHorizontal: 12, marginBottom: 12 },
  searchInput: { flex: 1, paddingVertical: 10, color: COLORS.ink },
  countyBox: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 12 },
  countyRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  countyLabel: { fontSize: 12.5, fontWeight: "700", color: COLORS.sub },
  countyClear: { fontSize: 12, fontWeight: "700", color: COLORS.accent },
  tabRow: { borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 12 },
  tab: { marginRight: 22, paddingBottom: 9, alignItems: "center" },
  tabText: { fontSize: 12.5, fontWeight: "600", color: COLORS.sub },
  tabTextActive: { color: COLORS.accent, fontWeight: "800" },
  tabMarker: { height: 2, width: "100%", borderRadius: 1, marginTop: 7, backgroundColor: "transparent" },
  tabMarkerActive: { backgroundColor: COLORS.accent },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: { backgroundColor: COLORS.surface, marginBottom: 10, borderRadius: 10, overflow: "hidden" },
  cover: { width: "100%", height: 120, backgroundColor: "#eee" },
  coverPlaceholder: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.wash },
  body: { padding: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  nameWithBadge: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1, flexShrink: 1, flexWrap: "wrap" },
  name: { color: COLORS.ink, fontSize: 17, fontWeight: "700" },
  boostedPill: { backgroundColor: "#FFF3CD", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  boostedPillText: { color: "#8A6D00", fontSize: 10.5, fontWeight: "700" },
  when: { color: COLORS.accent, fontWeight: "600", marginTop: 4, fontSize: 13 },
  location: { color: COLORS.sub, marginTop: 2, fontSize: 13 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 8 },
  host: { color: COLORS.sub, fontSize: 12 },
  counts: { color: COLORS.sub, fontSize: 12 },
  cancelledBadge: { alignSelf: "flex-start", backgroundColor: "#FDECEA", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 8 },
  cancelledBadgeText: { color: "#C4433C", fontSize: 10.5, fontWeight: "800" },
  fab: {
    position: "absolute", right: 18, width: 54, height: 54, borderRadius: 27,
    backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center",
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 8, elevation: 6,
  },
});
