import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import client from "../api/client";
import CountyPicker from "../components/CountyPicker";
import SubCountyPicker from "../components/SubCountyPicker";
import FeatureAccessModal from "../components/FeatureAccessModal";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme";

const COUNTY_STORAGE_KEY = "chamaBrowseCounty";

const FILTERS = [
  { key: "", label: "Filter" },
  { key: "joined", label: "Joined" },
  { key: "managed", label: "My Groups" },
  { key: "achievements", label: "Achievements" },
];

const SUB_FILTERS = [
  { key: "random", label: "Random Groups" },
  { key: "filled", label: "Filled-Up Groups" },
  { key: "unfilled", label: "Unfilled Groups" },
];

// Fisher-Yates — used so "Random Groups" gives a genuinely shuffled order
// rather than just re-displaying the server's own (roughly creation-order) list.
function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function ChamaScreen({ navigation }) {
  const { user } = useAuth();
  const [chamas, setChamas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [subFilter, setSubFilter] = useState("random");
  const [search, setSearch] = useState("");
  const [county, setCounty] = useState("");
  const [loadedCounty, setLoadedCounty] = useState(false);
  const [subCounty, setSubCounty] = useState("");
  const [hasAccess, setHasAccess] = useState(true); // optimistic — avoids a flash of the banner before the check lands
  const [accessModalVisible, setAccessModalVisible] = useState(false);
  // Search, sub-county, and the Random/Filled-Up/Unfilled sub-filter are
  // collapsed behind this by default — county, Create, and the main
  // Filter/Joined/My Groups/Achievements row stay always visible above the
  // list (see topChrome below); this only gates the secondary controls.
  const [moreOpen, setMoreOpen] = useState(false);

  useFocusEffect(useCallback(() => {
    client.get("/access/status").then((r) => setHasAccess(!!r.data.access?.chama)).catch(() => {});
  }, []));

  // The chosen county is saved and pre-selected on every future visit. If
  // the user has never picked one, pre-load their own profile county
  // instead of leaving the list empty and waiting on a manual pick.
  useEffect(() => {
    AsyncStorage.getItem(COUNTY_STORAGE_KEY).then((saved) => {
      if (saved) setCounty(saved);
      else if (user?.county) setCounty(user.county);
      setLoadedCounty(true);
    });
  }, [user?.county]);

  function handleCountyChange(c) {
    setCounty(c);
    setSubCounty("");
    AsyncStorage.setItem(COUNTY_STORAGE_KEY, c).catch(() => {});
  }

  const isFeedFilter = filter === "achievements";
  const isBrowseFilter = filter === "";

  // Achievements/chama-list responses have different shapes — clear stale
  // data immediately on filter switch so renderItem never sees last
  // filter's items through this filter's card layout for a frame.
  useEffect(() => { setChamas([]); }, [filter]);

  // Random/Filled-Up/Unfilled only apply to the Filter tab's browse-all
  // list — Joined/Managed show their natural list untouched. Memoized so
  // the shuffle for "random" is stable across re-renders, only reshuffling
  // when the underlying data or sub-filter actually changes.
  const displayedChamas = useMemo(() => {
    if (!isBrowseFilter) return chamas;
    if (subFilter === "filled") return chamas.filter((c) => c.remaining === 0);
    if (subFilter === "unfilled") return chamas.filter((c) => c.remaining > 0);
    return shuffled(chamas);
  }, [chamas, subFilter, isBrowseFilter]);

  const load = useCallback(() => {
    if (filter === "achievements") {
      client.get("/chama/achievements").then((r) => setChamas(r.data)).catch((e) => Alert.alert("Couldn't load achievements", e.response?.data?.error || e.message)).finally(() => setLoading(false));
      return;
    }
    if (!county) {
      setChamas([]);
      setLoading(false);
      return;
    }
    client
      .get("/chama", { params: { filter: filter || undefined, search: search || undefined, county, subCounty: subCounty || undefined } })
      .then((r) => setChamas(r.data))
      .catch((e) => Alert.alert("Couldn't load Chamas", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [filter, search, county, subCounty]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  // Fixed above the list, never scrolls away — county (when relevant) +
  // Create stay one tap away, same as the unlock banner and the main
  // Filter/Joined/My Groups/Achievements row, which is how you switch INTO
  // Achievements mode in the first place so it can't be hidden itself.
  const topChrome = (
    <View>
      <View style={styles.ribbon}>
        <Text style={styles.ribbonText}>✦ INVESTMENT GROUPS ✦</Text>
      </View>

      <View style={styles.stickyBar}>
        {!isFeedFilter && (
          <CountyPicker
            value={county}
            onChange={handleCountyChange}
            placeholder="Select your county"
            renderTrigger={({ value, onPress }) => (
              <View style={styles.stickyPill}>
                <TouchableOpacity style={styles.stickyPillTap} onPress={onPress}>
                  <Ionicons name="location-outline" size={13} color={COLORS.ink} />
                  <Text style={styles.stickyPillText} numberOfLines={1}>{value || "Select county"}</Text>
                  <Ionicons name="chevron-down" size={11} color={COLORS.sub} />
                </TouchableOpacity>
                {!!value && (
                  <TouchableOpacity onPress={() => handleCountyChange("")} hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}>
                    <Ionicons name="close-circle" size={14} color={COLORS.sub} />
                  </TouchableOpacity>
                )}
              </View>
            )}
          />
        )}
        <TouchableOpacity
          style={styles.stickyIconBtn}
          onPress={() => (hasAccess ? navigation.navigate("CreateChama") : setAccessModalVisible(true))}
        >
          <Ionicons name="add" size={18} color={COLORS.ink} />
        </TouchableOpacity>
      </View>

      {!hasAccess && (
        <TouchableOpacity style={styles.accessBanner} onPress={() => setAccessModalVisible(true)}>
          <Ionicons name="lock-closed-outline" size={16} color="#8A6D00" />
          <Text style={styles.accessBannerText}>Unlock Investment Group access to join, contribute, or start a group — from KES 5</Text>
          <Ionicons name="chevron-forward" size={16} color="#8A6D00" />
        </TouchableOpacity>
      )}

      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterChipActive]} onPress={() => setFilter(f.key)}>
            <Text style={[styles.filterChipText, filter === f.key && styles.filterChipTextActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <FeatureAccessModal
        visible={accessModalVisible}
        onClose={() => setAccessModalVisible(false)}
        feature="chama"
        featureLabel="Investment Group"
        onPurchased={() => setHasAccess(true)}
      />
    </View>
  );

  // Scrolls with the list (ListHeaderComponent) — search, sub-county, and
  // the Random/Filled-Up/Unfilled sub-filter, collapsed by default. Not
  // shown at all in Achievements mode, same as before.
  const header = !isFeedFilter ? (
    <View>
      <TouchableOpacity style={styles.accordionHead} onPress={() => setMoreOpen((o) => !o)}>
        <Text style={styles.accordionTitle}>Search &amp; sub-filters</Text>
        <Ionicons name={moreOpen ? "chevron-up" : "chevron-down"} size={16} color={COLORS.sub} />
      </TouchableOpacity>
      {moreOpen && (
        <View style={styles.accordionBody}>
          {!!county && (
            <SubCountyPicker county={county} value={subCounty} onChange={setSubCounty} placeholder="Any sub-county" />
          )}
          <View style={[styles.searchRow, county ? { marginTop: 8 } : null]}>
            <Ionicons name="search-outline" size={16} color={COLORS.sub} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Investment Groups"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => { setLoading(true); load(); }}
              returnKeyType="search"
            />
          </View>
          {isBrowseFilter && (
            <View style={styles.subFilterRow}>
              {SUB_FILTERS.map((f) => (
                <TouchableOpacity key={f.key} style={[styles.subFilterChip, subFilter === f.key && styles.subFilterChipActive]} onPress={() => setSubFilter(f.key)}>
                  <Text style={[styles.subFilterChipText, subFilter === f.key && styles.subFilterChipTextActive]}>{f.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  ) : null;

  if (filter === "achievements") {
    return (
      <>
        {topChrome}
        <FlatList
          style={styles.container}
          data={chamas}
          keyExtractor={(a) => a.id}
          ListHeaderComponent={header}
          ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.accent} /> : <Text style={styles.empty}>No public achievements shared yet</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.feedCard} onPress={() => navigation.navigate("ChamaDetail", { chamaId: item.chama?.id })}>
              <Text style={styles.feedName}>{item.user?.name}</Text>
              <Text style={styles.feedMeta}>{item.chama?.name} · {new Date(item.createdAt).toLocaleDateString()}</Text>
              <Text style={styles.feedContent}>{item.content}</Text>
              {!!item.photoUrl && <Image source={{ uri: item.photoUrl }} style={styles.feedPhoto} contentFit="cover" />}
            </TouchableOpacity>
          )}
        />
      </>
    );
  }

  return (
    <>
      {topChrome}
      <FlatList
      style={styles.container}
      data={displayedChamas}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={header}
      ListEmptyComponent={
        loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.accent} /> : (
          <Text style={styles.empty}>{!county ? "Select a county above to see Investment Groups" : "No Investment Groups found"}</Text>
        )
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("ChamaDetail", { chamaId: item.id })}>
          <Image source={{ uri: item.coverUrl }} style={styles.cover} contentFit="cover" />
          <View style={styles.body}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.metaRow}>
              <View style={styles.pill}><Text style={styles.pillText}>{item.filled} of {item.maxMembers} positions filled</Text></View>
              <View style={[styles.pill, item.remaining > 0 ? styles.pillOpen : styles.pillFull]}>
                <Text style={[styles.pillText, item.remaining > 0 ? styles.pillOpenText : styles.pillFullText]}>
                  {item.remaining > 0 ? `${item.remaining} spots left` : "Full"}
                </Text>
              </View>
            </View>
            <Text style={styles.type}>
              {item.contributionType === "fixed_recurring"
                ? `KES ${item.contributionAmount?.toLocaleString()} / ${item.contributionFrequency}`
                : `Goal: KES ${item.goalAmount?.toLocaleString()}`}
            </Text>
            {!!item.subCounty && (
              <View style={styles.locationPill}>
                <Ionicons name="location-outline" size={11} color={COLORS.sub} />
                <Text style={styles.locationPillText}>{item.subCounty}, {item.county}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  ribbon: { backgroundColor: COLORS.accentInk, paddingVertical: 8, paddingHorizontal: 14, alignItems: "center" },
  ribbonText: { color: COLORS.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  stickyBar: {
    flexDirection: "row", justifyContent: "flex-end", gap: 8, padding: 10, paddingHorizontal: 12,
    backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  stickyPill: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    backgroundColor: COLORS.wash, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 8,
  },
  stickyPillTap: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5 },
  stickyPillText: { fontSize: 11.5, fontWeight: "700", color: COLORS.ink, flexShrink: 1 },
  stickyIconBtn: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  accordionHead: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: 12, paddingHorizontal: 16, backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  accordionTitle: { fontSize: 12.5, fontWeight: "700", color: COLORS.ink },
  accordionBody: { paddingHorizontal: 14, paddingVertical: 12, backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.bg, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 10, color: COLORS.ink },
  filterRow: { flexDirection: "row", gap: 8, marginHorizontal: 12, marginTop: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: COLORS.wash },
  filterChipActive: { backgroundColor: COLORS.accent },
  filterChipText: { color: COLORS.ink, fontWeight: "600", fontSize: 12.5 },
  filterChipTextActive: { color: COLORS.accentInk },
  subFilterRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  subFilterChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surface },
  subFilterChipActive: { borderColor: COLORS.accent, backgroundColor: COLORS.wash },
  subFilterChipText: { color: COLORS.sub, fontWeight: "600", fontSize: 11.5 },
  subFilterChipTextActive: { color: COLORS.accent, fontWeight: "700" },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: { backgroundColor: COLORS.surface, margin: 10, borderRadius: 10, overflow: "hidden" },
  cover: { width: "100%", height: 110, backgroundColor: "#eee" },
  body: { padding: 12 },
  name: { color: COLORS.ink, fontSize: 17, fontWeight: "700" },
  desc: { color: COLORS.sub, marginTop: 4 },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  pill: { backgroundColor: COLORS.wash, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: COLORS.ink, fontWeight: "700", fontSize: 11.5 },
  pillOpen: { backgroundColor: "#E3F5E9" },
  pillOpenText: { color: "#2E7D32" },
  pillFull: { backgroundColor: "#FBE7E7" },
  pillFullText: { color: "#D32F2F" },
  type: { color: COLORS.sub, fontSize: 12, marginTop: 8, fontWeight: "600" },
  locationPill: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  locationPillText: { color: COLORS.sub, fontSize: 11, fontWeight: "600" },
  accessBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF3CD", borderRadius: 10, padding: 12, marginHorizontal: 12, marginTop: 12 },
  accessBannerText: { color: "#8A6D00", fontSize: 12, fontWeight: "600", flex: 1 },
  feedCard: { backgroundColor: COLORS.surface, margin: 10, borderRadius: 10, padding: 14 },
  feedName: { color: COLORS.ink, fontSize: 15, fontWeight: "700" },
  feedMeta: { color: COLORS.sub, fontSize: 11.5, marginTop: 2, marginBottom: 8 },
  feedContent: { color: COLORS.ink, fontSize: 13.5, lineHeight: 19 },
  feedPhoto: { width: "100%", height: 160, borderRadius: 8, marginTop: 10, backgroundColor: "#eee" },
});
