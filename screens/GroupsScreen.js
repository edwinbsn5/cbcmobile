import React, { useCallback, useState } from "react";
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

const FILTERS = [
  { key: "explore", label: "Explore Groups", icon: "shuffle-outline", desc: "A random mix of groups to discover" },
  { key: "popular", label: "Popular Groups", icon: "trending-up-outline", desc: "Most members, among groups under 6 months old" },
  { key: "best_rated", label: "Best Rated Groups", icon: "star-outline", desc: "Most-reviewed in the last 6 months, among groups under 6 months old" },
  { key: "joined", label: "Groups I Have Joined", icon: "checkmark-circle-outline", desc: "Groups you're subscribed to" },
  { key: "managed", label: "Groups I Manage", icon: "shield-checkmark-outline", desc: "Groups you created and administer" },
];

export default function GroupsScreen({ navigation }) {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const { isSaved, toggleSave, loadSaved } = useSaved();

  const load = useCallback(() => {
    client
      .get("/groups", filter ? { params: { filter } } : undefined)
      .then((r) => setGroups(r.data))
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
        data={groups}
        keyExtractor={(g) => g.id}
        ListHeaderComponent={
          <View>
            <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate("CreateGroup")}>
              <Text style={styles.createButtonText}>+ Create Group</Text>
            </TouchableOpacity>

            <View style={styles.hero}>
              <Text style={styles.heroBadge}>✦ Groups ✦</Text>
              <Text style={styles.heroTitle}>Find Your People.</Text>
              <Text style={styles.heroSubtitle}>Communities, causes &amp; interests worth joining on The CBC.</Text>
            </View>

            <TouchableOpacity style={styles.filterButton} onPress={() => setPickerOpen(true)}>
              <Ionicons name="filter-outline" size={16} color={COLORS.accent} />
              <Text style={styles.filterButtonText}>{activeFilter ? activeFilter.label : "Filter Groups"}</Text>
            </TouchableOpacity>
            {activeFilter && (
              <TouchableOpacity onPress={() => selectFilter(null)}>
                <Text style={styles.clearFilterText}>✕ Clear filter — showing all groups</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {filter === "joined"
              ? "You haven't joined any groups yet"
              : filter === "managed"
              ? "You don't manage any groups yet"
              : filter === "popular" || filter === "best_rated"
              ? "No groups qualify yet — check back later"
              : "No groups yet — be the first to create one"}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("GroupDetail", { groupId: item.id })}>
            <Image source={{ uri: item.coverUrl }} style={styles.cover} />
            <TouchableOpacity style={styles.saveButton} onPress={() => toggleSave("group", item.id)}>
              <Ionicons name={isSaved("group", item.id) ? "bookmark" : "bookmark-outline"} size={20} color="#fff" />
            </TouchableOpacity>
            <View style={styles.body}>
              <View style={styles.nameRow}>
                <Text style={styles.name}>{item.name}</Text>
                {item.status !== "approved" && (
                  <View style={styles.statusPill}>
                    <Text style={styles.statusPillText}>{item.status === "rejected" ? "Rejected" : "Pending approval"}</Text>
                  </View>
                )}
              </View>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              <Text style={styles.admin}>Admin: {item.admin?.name}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color="#F5A623" />
                <Text style={styles.ratingText}>
                  {item.reviewCount > 0 ? `${item.avgRating.toFixed(1)} · ${item.reviewCount} review${item.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}
                </Text>
              </View>
              <View style={styles.tierRow}>
                {item.tiers.map((t) => (
                  <View key={t.id} style={styles.tierPill}>
                    <Text style={styles.tierPillText}>{t.name} · KES {t.priceKES}/mo</Text>
                  </View>
                ))}
              </View>
            </View>
          </TouchableOpacity>
        )}
      />

      <Modal visible={pickerOpen} transparent animationType="fade" onRequestClose={() => setPickerOpen(false)}>
        <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setPickerOpen(false)}>
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Filter Groups</Text>
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
  card: { backgroundColor: COLORS.surface, margin: 10, borderRadius: 10, overflow: "hidden" },
  cover: { width: "100%", height: 120, backgroundColor: "#eee" },
  saveButton: { position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.45)", borderRadius: 16, padding: 6 },
  body: { padding: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  name: { fontSize: 17, fontWeight: "700" },
  statusPill: { backgroundColor: "#FFF3CD", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  statusPillText: { color: "#856404", fontSize: 11, fontWeight: "700" },
  desc: { color: COLORS.sub, marginTop: 4 },
  admin: { color: COLORS.sub, fontSize: 12, marginTop: 6 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 6 },
  ratingText: { color: COLORS.sub, fontSize: 12, fontWeight: "600" },
  tierRow: { flexDirection: "row", marginTop: 10, flexWrap: "wrap" },
  tierPill: { backgroundColor: COLORS.wash, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4, marginRight: 8, marginBottom: 6 },
  tierPillText: { color: COLORS.accent, fontWeight: "600", fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10 },
  filterOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  filterOptionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  filterOptionLabel: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  filterOptionDesc: { fontSize: 11.5, color: COLORS.sub, marginTop: 1 },
});
