import React, { useCallback, useEffect, useState } from "react";
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Modal } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

const FILTERS = [
  { key: null, label: "All Pages", icon: "flag-outline", desc: "Active Pages across the app" },
  { key: "mine", label: "Pages I Follow/Manage", icon: "checkmark-circle-outline", desc: "Pages you're a team member of" },
  { key: "managed", label: "Pages I Manage", icon: "shield-checkmark-outline", desc: "Pages where you're Owner, Admin, or Editor" },
];

export default function PagesListScreen({ navigation, route }) {
  const { categoryId, categoryName } = route.params || {};
  const [pages, setPages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [directory, setDirectory] = useState([]);

  useEffect(() => {
    client.get("/categories/pages").then((r) => setDirectory(r.data)).catch(() => {});
  }, []);

  function browseCategory(id, name) {
    navigation.setParams({ categoryId: id, categoryName: name });
  }

  const load = useCallback(() => {
    const params = {};
    if (filter) params.filter = filter;
    if (categoryId) params.categoryId = categoryId;
    client
      .get("/pages", Object.keys(params).length ? { params } : undefined)
      .then((r) => setPages(r.data))
      .finally(() => setLoading(false));
  }, [filter, categoryId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function selectFilter(key) {
    setLoading(true);
    setFilter(key);
    setPickerOpen(false);
  }

  function clearCategory() {
    navigation.setParams({ categoryId: undefined, categoryName: undefined });
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
              <Text style={styles.heroBadge}>✦ Find Mtu Wako! ✦</Text>
              <Text style={styles.heroTitle}>Reliable Services, Just When You Need It</Text>
              <Text style={styles.heroSubtitle}>
                Mama Fua, Hair Stylists, Sales &amp; Marketers, Errand Services, Electricians, Gardeners, Massage Services.. ETC...
              </Text>
            </View>

            {categoryId ? (
              <View style={styles.browsingBanner}>
                <Text style={styles.browsingBannerText}>Browsing: {categoryName}</Text>
                <TouchableOpacity onPress={clearCategory}>
                  <Ionicons name="close-circle" size={18} color={COLORS.sub} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.directory}>
                <Text style={styles.directoryLabel}>Browse by category</Text>
                {directory.map((cat) => (
                  <View key={cat.id} style={styles.catBlock}>
                    <TouchableOpacity onPress={() => browseCategory(cat.id, cat.name)}>
                      <Text style={styles.catName}>{cat.name}</Text>
                    </TouchableOpacity>
                    {cat.subcategories.length > 0 && (
                      <View style={styles.chipsRow}>
                        {cat.subcategories.map((sub) => (
                          <TouchableOpacity key={sub.id} style={styles.chip} onPress={() => browseCategory(sub.id, sub.name)}>
                            <Text style={styles.chipText}>{sub.name}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty}>
            {categoryId ? "No Pages in this category yet" : filter === "mine" ? "You're not on any Page's team yet" : filter === "managed" ? "You don't manage any Pages yet" : "No Pages yet — be the first to create one"}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("PageDetail", { pageId: item.id })}>
            <Image source={{ uri: item.coverUrl }} style={styles.cover} />
            <View style={styles.body}>
              <View style={styles.nameRow}>
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <View style={styles.categoryPillRow}>
                    {item.categories.slice(0, 3).map((c) => (
                      <View key={c.id} style={styles.categoryPill}>
                        <Text style={styles.categoryPillText}>{c.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
              <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
              <View style={styles.ratingRow}>
                <Ionicons name="star" size={13} color="#F5A623" />
                <Text style={styles.ratingText}>
                  {item.totalCount > 0 ? `${item.avgRating.toFixed(1)} · ${item.totalCount} review${item.totalCount === 1 ? "" : "s"}` : "No reviews yet"}
                </Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.ratingText}>{item.memberCount} team member{item.memberCount === 1 ? "" : "s"}</Text>
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
  browsingBanner: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: COLORS.wash, marginHorizontal: 12, marginTop: 12, borderRadius: 8, padding: 11,
  },
  browsingBannerText: { color: COLORS.ink, fontWeight: "700", fontSize: 13 },
  directory: { paddingVertical: 20, paddingHorizontal: 20, alignItems: "center" },
  directoryLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: COLORS.sub, marginBottom: 16 },
  catBlock: { alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, borderStyle: "dashed", width: "100%" },
  catName: { fontWeight: "700", color: COLORS.ink, fontSize: 14, marginBottom: 10, textAlign: "center" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "center" },
  chip: { backgroundColor: COLORS.wash, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 5 },
  chipText: { fontWeight: "400", fontSize: 11.5, color: COLORS.sub },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: { backgroundColor: COLORS.surface, margin: 10, borderRadius: 10, overflow: "hidden" },
  cover: { width: "100%", height: 100, backgroundColor: "#eee" },
  body: { padding: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: -28 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: "#eee", borderWidth: 2, borderColor: COLORS.surface },
  name: { fontSize: 17, fontWeight: "700" },
  categoryPillRow: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 3 },
  categoryPill: { backgroundColor: COLORS.wash, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  categoryPillText: { color: COLORS.accent, fontSize: 10.5, fontWeight: "600" },
  desc: { color: COLORS.sub, marginTop: 8 },
  ratingRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 8 },
  ratingText: { color: COLORS.sub, fontSize: 12, fontWeight: "600" },
  dot: { color: COLORS.sub, fontSize: 12 },
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "center", padding: 24 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 14, padding: 16 },
  modalTitle: { fontSize: 16, fontWeight: "800", marginBottom: 10 },
  filterOption: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 10 },
  filterOptionIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  filterOptionLabel: { fontSize: 14, fontWeight: "700", color: COLORS.ink },
  filterOptionDesc: { fontSize: 11.5, color: COLORS.sub, marginTop: 1 },
});
