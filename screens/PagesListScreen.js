import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import client from "../api/client";
import CountyPicker from "../components/CountyPicker";
import { COLORS } from "../theme";

const COUNTY_STORAGE_KEY = "pagesBrowseCounty";

// One icon per top-level category, by exact name — falls back to a generic
// briefcase for anything an admin adds later that isn't in this list, so
// the grid never breaks for an unrecognized category.
const CATEGORY_ICONS = {
  "Beauty & Hair Services": "cut-outline",
  "Body & Personal Care Services": "fitness-outline",
  "Home Care Services": "home-outline",
  "Errands & Delivery": "bicycle-outline",
  "Business & Marketing Services": "briefcase-outline",
  "Other Businesses": "ellipsis-horizontal-circle-outline",
};
function iconForCategory(name) {
  return CATEGORY_ICONS[name] || "storefront-outline";
}

const FILTERS = [
  { key: null, label: "All Pages", icon: "flag-outline", desc: "Active Pages across the app" },
  { key: "mine", label: "Pages I Follow/Manage", icon: "checkmark-circle-outline", desc: "Pages you're a team member of" },
  { key: "managed", label: "Pages I Manage", icon: "shield-checkmark-outline", desc: "Pages where you're Owner, Admin, or Editor" },
];

export default function PagesListScreen({ navigation }) {
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [directory, setDirectory] = useState([]);
  const [county, setCounty] = useState("");
  const [loadedCounty, setLoadedCounty] = useState(false);
  const [categoryId, setCategoryId] = useState(null);
  const [categoryName, setCategoryName] = useState(null);
  const [expandedCategoryId, setExpandedCategoryId] = useState(null);
  const [busyFollowIds, setBusyFollowIds] = useState({});

  async function handleToggleFollow(item) {
    setBusyFollowIds((prev) => ({ ...prev, [item.id]: true }));
    try {
      const path = item.amIFollowing ? "unfollow" : "follow";
      const { data } = await client.post(`/pages/${item.id}/${path}`);
      setPages((prev) => prev.map((p) => (p.id === item.id ? { ...p, ...data } : p)));
    } catch (e) {
      Alert.alert("Couldn't update follow status", e.response?.data?.error || e.message);
    } finally {
      setBusyFollowIds((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
    }
  }

  useEffect(() => {
    client.get("/categories/pages").then((r) => setDirectory(r.data)).catch(() => {});
  }, []);

  // The chosen county is saved and pre-selected on every future visit — no
  // need to pick it again unless the user wants to browse a different one.
  useEffect(() => {
    AsyncStorage.getItem(COUNTY_STORAGE_KEY).then((saved) => {
      if (saved) setCounty(saved);
      setLoadedCounty(true);
    });
  }, []);

  function handleCountyChange(c) {
    setCounty(c);
    AsyncStorage.setItem(COUNTY_STORAGE_KEY, c).catch(() => {});
  }

  function browseCategory(id, name) {
    if (!county) return;
    setCategoryId(id);
    setCategoryName(name);
  }

  // Tapping a top-level category tile: no subcategories -> browse it
  // directly (e.g. "Other Businesses"); has subcategories -> reveal them
  // as a chip row instead of immediately filtering, so a specific
  // subcategory ("Hair Styling & Barbering") is still reachable, not just
  // the broad top-level bucket.
  function tapCategoryTile(cat) {
    if (!county) return;
    if (!cat.subcategories.length) return browseCategory(cat.id, cat.name);
    setExpandedCategoryId((prev) => (prev === cat.id ? null : cat.id));
  }

  const load = useCallback(() => {
    if (!county) {
      setPages([]);
      setLoading(false);
      return;
    }
    const params = { county };
    if (filter) params.filter = filter;
    if (categoryId) params.categoryId = categoryId;
    client
      .get("/pages", { params })
      .then((r) => setPages(r.data))
      .catch((e) => Alert.alert("Couldn't load pages", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [filter, categoryId, county]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function selectFilter(key) {
    setLoading(true);
    setFilter(key);
    setPickerOpen(false);
  }

  function clearCategory() {
    setCategoryId(null);
    setCategoryName(null);
    setExpandedCategoryId(null);
  }

  const activeFilter = FILTERS.find((f) => f.key === filter);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <>
      <FlatList
        style={styles.container}
        data={pages}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={
          <View>
            <View style={styles.actionBar}>
              <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("CreatePage")}>
                <Ionicons name="add-circle-outline" size={20} color={COLORS.accent} />
                <Text style={styles.actionLabel}>Create Page</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={() => setPickerOpen(true)}>
                <Ionicons name="filter-outline" size={20} color={COLORS.accent} />
                <Text style={styles.actionLabel}>{activeFilter?.key ? activeFilter.label : "Filter Pages"}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.hero}>
              <Text style={styles.heroBadge}>✦ Find BSN & Services! ✦</Text>
              <Text style={styles.heroTitle}>Reliable Services, Just When You Need It</Text>
              <Text style={styles.heroSubtitle}>
                Mama Fua, Hair Stylists, Sales &amp; Marketers, Errand Services, Electricians, Gardeners, Massage Services.. ETC...
              </Text>
            </View>

            <View style={styles.countyBox}>
              <Text style={styles.countyLabel}>County: Find Services Near You</Text>
              <CountyPicker value={county} onChange={handleCountyChange} placeholder="Select your county" />
              {!county && loadedCounty && (
                <Text style={styles.countyWarning}>Select a county above before browsing</Text>
              )}
            </View>

            {categoryId ? (
              <View style={styles.browsingBanner}>
                <Text style={styles.browsingBannerText}>Browsing: {categoryName}{county ? ` · ${county}` : ""}</Text>
                <TouchableOpacity onPress={clearCategory}>
                  <Ionicons name="close-circle" size={18} color={COLORS.sub} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.directory}>
                <Text style={styles.directoryLabel}>Browse by category</Text>
                <View style={styles.catGrid}>
                  {directory.map((cat) => {
                    const expanded = expandedCategoryId === cat.id;
                    return (
                      <TouchableOpacity key={cat.id} style={styles.catTile} onPress={() => tapCategoryTile(cat)}>
                        <View style={[styles.catTileIcon, expanded && styles.catTileIconActive]}>
                          <Ionicons name={iconForCategory(cat.name)} size={22} color={expanded ? "#fff" : COLORS.accentInk} />
                        </View>
                        <Text style={styles.catTileText} numberOfLines={2}>{cat.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {expandedCategoryId && (() => {
                  const cat = directory.find((c) => c.id === expandedCategoryId);
                  if (!cat) return null;
                  return (
                    <View style={styles.subChipsBox}>
                      <TouchableOpacity style={styles.chip} onPress={() => browseCategory(cat.id, cat.name)}>
                        <Text style={styles.chipText}>All {cat.name}</Text>
                      </TouchableOpacity>
                      {cat.subcategories.map((sub) => (
                        <TouchableOpacity key={sub.id} style={styles.chip} onPress={() => browseCategory(sub.id, sub.name)}>
                          <Text style={styles.chipText}>{sub.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  );
                })()}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {!county
              ? "Select a county above to see Pages"
              : categoryId
              ? "No Pages in this category yet"
              : filter === "mine"
              ? "You're not on any Page's team yet"
              : filter === "managed"
              ? "You don't manage any Pages yet"
              : "No Pages yet — be the first to create one"}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => navigation.navigate("PageDetail", { pageId: item.id })}>
            <Image source={{ uri: item.coverUrl }} style={styles.cover} contentFit="cover" />
            <View style={styles.body}>
              <View style={styles.nameRow}>
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} contentFit="cover" />
                <View style={{ flex: 1 }}>
                  <View style={styles.nameLine}>
                    <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                    {item.isVerified && <Ionicons name="checkmark-circle" size={14} color="#2563EB" style={{ marginLeft: 4 }} />}
                  </View>
                  <View style={styles.categoryPillRow}>
                    {item.categories.slice(0, 3).map((c) => (
                      <View key={c.id} style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{c.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.followButton, item.amIFollowing && styles.followingButton]}
                  onPress={() => handleToggleFollow(item)}
                  disabled={!!busyFollowIds[item.id]}
                >
                  <Text style={[styles.followButtonText, item.amIFollowing && styles.followingButtonText]}>
                    {busyFollowIds[item.id] ? "..." : item.amIFollowing ? "Following" : "Follow"}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.footerRow}>
                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={13} color="#F5A623" />
                  <Text style={styles.ratingText}>
                    {item.totalCount > 0 ? `${item.avgRating.toFixed(1)} · ${item.totalCount} review${item.totalCount === 1 ? "" : "s"}` : "No reviews yet"}
                  </Text>
                </View>
                {item.totalCount > 0 ? (
                  <View style={styles.recommendBadge}>
                    <Text style={styles.recommendPct}>{item.recommendPct}%</Text>
                    <Text style={styles.recommendLabel}>Recommend</Text>
                  </View>
                ) : (
                  <View style={styles.newBadge}>
                    <Text style={styles.newBadgeText}>New listing</Text>
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
            <Text style={styles.modalTitle}>Filter Pages</Text>
            {FILTERS.map((f) => (
              <TouchableOpacity key={f.label} style={styles.filterOption} onPress={() => selectFilter(f.key)}>
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
  actionBar: { flexDirection: "row", backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  actionButton: { flex: 1, alignItems: "center", gap: 4, paddingVertical: 14 },
  actionLabel: { fontSize: 11.5, fontWeight: "700", color: COLORS.ink },
  hero: { backgroundColor: COLORS.accentInk, paddingVertical: 26, paddingHorizontal: 22, alignItems: "center" },
  heroBadge: { color: COLORS.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  heroTitle: { color: "#fff", fontSize: 19, fontWeight: "800", textAlign: "center", marginTop: 10, lineHeight: 25 },
  heroSubtitle: { color: "#B9C6DC", fontSize: 12, marginTop: 8, textAlign: "center", lineHeight: 18 },
  countyBox: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16, marginHorizontal: 12, marginTop: 12 },
  countyLabel: { fontSize: 12.5, fontWeight: "700", color: COLORS.sub, marginBottom: 6 },
  countyWarning: { fontSize: 11.5, color: "#D32F2F", fontWeight: "600", marginTop: 8 },
  browsingBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: COLORS.wash, marginHorizontal: 12, marginTop: 12, borderRadius: 8, padding: 11,
  },
  browsingBannerText: { color: COLORS.ink, fontWeight: "700", fontSize: 13 },
  directory: { paddingVertical: 18, paddingHorizontal: 14 },
  directoryLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: COLORS.sub, marginBottom: 14, textAlign: "center" },
  catGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  catTile: { width: "23%", alignItems: "center", marginBottom: 16 },
  catTileIcon: {
    width: 54, height: 54, borderRadius: 16, backgroundColor: COLORS.wash,
    alignItems: "center", justifyContent: "center", marginBottom: 6,
  },
  catTileIconActive: { backgroundColor: COLORS.accentInk },
  catTileText: { fontSize: 10.5, fontWeight: "700", color: COLORS.ink, textAlign: "center", lineHeight: 13 },
  subChipsBox: { flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "center", marginTop: 4 },
  chip: { backgroundColor: COLORS.wash, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 5 },
  chipText: { fontWeight: "600", fontSize: 11.5, color: COLORS.ink },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: {
    backgroundColor: COLORS.surface, margin: 10, borderRadius: 14, overflow: "hidden",
    shadowColor: "#0B1F3A", shadowOpacity: 0.08, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 2,
  },
  cover: { width: "100%", height: 90, backgroundColor: "#eee" },
  body: { padding: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: -26 },
  avatar: { width: 48, height: 48, borderRadius: 14, backgroundColor: "#eee", borderWidth: 3, borderColor: COLORS.surface },
  nameLine: { flexDirection: "row", alignItems: "center" },
  name: { color: COLORS.ink, fontSize: 15.5, fontWeight: "800", flexShrink: 1 },
  categoryPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3 },
  categoryPill: { backgroundColor: COLORS.wash, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  categoryPillText: { color: COLORS.accent, fontSize: 10.5, fontWeight: "600" },
  followButton: { backgroundColor: COLORS.accent, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 7, alignSelf: "center" },
  followingButton: { backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },
  followButtonText: { color: COLORS.accentInk, fontWeight: "800", fontSize: 11.5 },
  followingButtonText: { color: COLORS.ink },
  desc: { color: COLORS.sub, marginTop: 10, fontSize: 13 },
  footerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.wash,
  },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  ratingText: { color: COLORS.sub, fontSize: 12, fontWeight: "600" },
  recommendBadge: { alignItems: "center", backgroundColor: "#E9F8EE", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5 },
  recommendPct: { color: "#2E7D32", fontSize: 13, fontWeight: "800" },
  recommendLabel: { color: "#2E7D32", fontSize: 8.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4 },
  newBadge: { backgroundColor: COLORS.bg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  newBadgeText: { color: COLORS.sub, fontSize: 10.5, fontWeight: "700" },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16 },
  modalTitle: { color: COLORS.ink, fontSize: 16, fontWeight: "800", marginBottom: 10 },
  filterOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  filterOptionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  filterOptionLabel: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  filterOptionDesc: { fontSize: 11.5, color: COLORS.sub, marginTop: 1 },
});
