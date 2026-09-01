import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import Avatar from "../components/Avatar";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

function cheapestTierLabel(tiers) {
  if (!tiers || !tiers.length) return null;
  const cheapest = tiers.reduce((a, b) => (b.priceKES < a.priceKES ? b : a));
  return cheapest.priceKES === 0 ? "Free" : `From KES ${cheapest.priceKES}/${cheapest.periodDays}d`;
}

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
      .catch((e) => Alert.alert("Couldn't load groups", e.response?.data?.error || e.message))
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
      <View style={styles.ribbon}>
        <Text style={styles.ribbonText}>✦ PLUGS &amp; MENTORS ✦</Text>
      </View>

      <View style={styles.stickyBar}>
        <View style={styles.stickyPill}>
          <TouchableOpacity style={styles.stickyPillTap} onPress={() => setPickerOpen(true)}>
            <Ionicons name="filter-outline" size={13} color={COLORS.ink} />
            <Text style={styles.stickyPillText} numberOfLines={1}>{activeFilter ? activeFilter.label : "Explore Groups"}</Text>
            <Ionicons name="chevron-down" size={11} color={COLORS.sub} />
          </TouchableOpacity>
          {!!activeFilter && (
            <TouchableOpacity onPress={() => selectFilter(null)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}>
              <Ionicons name="close-circle" size={14} color={COLORS.sub} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.stickyIconBtn} onPress={() => navigation.navigate("CreateGroup")}>
          <Ionicons name="add" size={18} color={COLORS.ink} />
        </TouchableOpacity>
      </View>

      <FlatList
        style={styles.container}
        data={groups}
        keyExtractor={(g) => g.id}
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
          <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => navigation.navigate("GroupDetail", { groupId: item.id })}>
            <Image source={{ uri: item.coverUrl }} style={styles.cover} contentFit="cover" />
            <TouchableOpacity style={styles.saveButton} onPress={() => toggleSave("group", item.id)}>
              <Ionicons name={isSaved("group", item.id) ? "bookmark" : "bookmark-outline"} size={18} color="#F0A93B" />
            </TouchableOpacity>
            <View style={styles.body}>
              <View style={styles.identityRow}>
                <Avatar uri={item.avatarUrl} name={item.name} style={styles.cardAvatar} />
                <View style={styles.identityText}>
                  <View style={styles.nameRow}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    {item.status === "suspended" && (
                      <View style={styles.statusPill}>
                        <Text style={styles.statusPillText}>Suspended</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.admin}>Admin: {item.admin?.name}</Text>
                </View>
              </View>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.footerRow}>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color="#F5A623" />
                  <Text style={styles.ratingText}>
                    {item.reviewCount > 0 ? `${item.avgRating.toFixed(1)} · ${item.reviewCount} review${item.reviewCount === 1 ? "" : "s"}` : "No reviews yet"}
                  </Text>
                </View>
                {!!cheapestTierLabel(item.tiers) && (
                  <View style={styles.priceTag}>
                    <Text style={styles.priceTagText}>{cheapestTierLabel(item.tiers)}</Text>
                  </View>
                )}
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
  ribbon: { backgroundColor: COLORS.accentInk, paddingVertical: 8, paddingHorizontal: 14, alignItems: "center" },
  ribbonText: { color: COLORS.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  stickyBar: {
    flexDirection: "row", gap: 8, padding: 10, paddingHorizontal: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  stickyPill: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    backgroundColor: COLORS.wash, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 8,
  },
  stickyPillTap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  stickyPillText: { fontSize: 11.5, fontWeight: "700", color: COLORS.ink, flexShrink: 1 },
  stickyIconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: { backgroundColor: COLORS.surface, margin: 10, borderRadius: 14, overflow: "hidden", shadowColor: "#0B1F3A", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2 },
  cover: { width: "100%", height: 100, backgroundColor: "#eee" },
  saveButton: { position: "absolute", top: 10, right: 10, backgroundColor: "rgba(0,0,0,0.4)", borderRadius: 15, width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  body: { padding: 12 },
  identityRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginTop: -30 },
  cardAvatar: { width: 52, height: 52, borderRadius: 16, borderWidth: 3, borderColor: COLORS.surface },
  identityText: { flex: 1, paddingTop: 22 },
  nameRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap" },
  name: { color: COLORS.ink, fontSize: 16, fontWeight: "800", maxWidth: "78%" },
  statusPill: { backgroundColor: "#FFF3CD", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginLeft: 8 },
  statusPillText: { color: "#856404", fontSize: 11, fontWeight: "700" },
  desc: { color: COLORS.sub, marginTop: 10, fontSize: 13 },
  admin: { color: COLORS.sub, fontSize: 11.5, fontWeight: "600", marginTop: 2 },
  footerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.wash,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  ratingText: { color: COLORS.sub, fontSize: 12, fontWeight: "600" },
  priceTag: { backgroundColor: COLORS.wash, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  priceTagText: { color: COLORS.accent, fontWeight: "800", fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16 },
  modalTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "800", marginBottom: 10 },
  filterOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  filterOptionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  filterOptionLabel: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  filterOptionDesc: { fontSize: 11.5, color: COLORS.sub, marginTop: 1 },
});
