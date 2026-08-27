import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import client from "../api/client";
import CountyPicker from "../components/CountyPicker";
import SubCountyPicker from "../components/SubCountyPicker";
import FeatureAccessModal from "../components/FeatureAccessModal";
import { COLORS } from "../theme";

const COUNTY_STORAGE_KEY = "projectsBrowseCounty";

const FILTERS = [
  { key: "", label: "Explore" },
  { key: "joined", label: "Joined" },
  { key: "managed", label: "Managed" },
];

export default function ProjectsScreen({ navigation }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [county, setCounty] = useState("");
  const [loadedCounty, setLoadedCounty] = useState(false);
  const [subCounty, setSubCounty] = useState("");
  const [hasAccess, setHasAccess] = useState(true);
  const [accessModalVisible, setAccessModalVisible] = useState(false);

  useFocusEffect(useCallback(() => {
    client.get("/access/status").then((r) => setHasAccess(!!r.data.access?.project)).catch(() => {});
  }, []));

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
    setSubCounty("");
    AsyncStorage.setItem(COUNTY_STORAGE_KEY, c).catch(() => {});
  }

  const load = useCallback(() => {
    if (!county) {
      setProjects([]);
      setLoading(false);
      return;
    }
    client
      .get("/projects", { params: { filter: filter || undefined, search: search || undefined, county, subCounty: subCounty || undefined } })
      .then((r) => setProjects(r.data))
      .catch((e) => Alert.alert("Couldn't load projects", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [filter, search, county, subCounty]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return (
    <FlatList
      style={styles.container}
      data={projects}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View>
          <TouchableOpacity
            style={styles.createButton}
            onPress={() => (hasAccess ? navigation.navigate("CreateProject") : setAccessModalVisible(true))}
          >
            <Text style={styles.createButtonText}>+ Pitch a Project</Text>
          </TouchableOpacity>

          <View style={styles.hero}>
            <Text style={styles.heroBadge}>✦ Investments & Projects ✦</Text>
            <Text style={styles.heroTitle}>Pitch it. Build a team. Ship it.</Text>
            <Text style={styles.heroSubtitle}>Business ideas looking for collaborators — join a team or start your own.</Text>
          </View>

          {!hasAccess && (
            <TouchableOpacity style={styles.accessBanner} onPress={() => setAccessModalVisible(true)}>
              <Ionicons name="lock-closed-outline" size={16} color="#8A6D00" />
              <Text style={styles.accessBannerText}>Unlock Projects & Investments access to join, pitch, or start a project — from KES 5</Text>
              <Ionicons name="chevron-forward" size={16} color="#8A6D00" />
            </TouchableOpacity>
          )}

          <View style={styles.locationBox}>
            <View style={styles.locationRow}>
              <Text style={styles.locationLabel}>County: Find Projects Based Near You</Text>
              {!!county && (
                <TouchableOpacity onPress={() => handleCountyChange("")}>
                  <Text style={styles.locationClear}>Clear</Text>
                </TouchableOpacity>
              )}
            </View>
            <CountyPicker value={county} onChange={handleCountyChange} placeholder="Select your county" />
            {!!county && (
              <View style={{ marginTop: 8 }}>
                <SubCountyPicker county={county} value={subCounty} onChange={setSubCounty} placeholder="Any sub-county" />
              </View>
            )}
            {!county && loadedCounty && (
              <Text style={styles.locationWarning}>Select a county above before browsing</Text>
            )}
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color={COLORS.sub} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search projects"
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={() => { setLoading(true); load(); }}
              returnKeyType="search"
            />
          </View>

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
            feature="project"
            featureLabel="Projects & Investments"
            onPurchased={() => setHasAccess(true)}
          />
        </View>
      }
      ListEmptyComponent={
        loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.accent} /> : (
          <Text style={styles.empty}>{!county ? "Select a county above to see projects" : "No projects found"}</Text>
        )
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("ProjectDetail", { projectId: item.id })}>
          <Image source={{ uri: item.coverUrl }} style={styles.cover} contentFit="cover" />
          <View style={styles.body}>
            <View style={styles.nameRow}>
              <Text style={styles.name}>{item.title}</Text>
              <View style={styles.categoryPill}><Text style={styles.categoryPillText}>{item.category}</Text></View>
            </View>
            <Text style={styles.desc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.metaRow}>
              <View style={styles.pill}><Text style={styles.pillText}>{item.filled} of {item.maxMembers} positions filled</Text></View>
              <View style={[styles.pill, item.remaining > 0 ? styles.pillOpen : styles.pillFull]}>
                <Text style={[styles.pillText, item.remaining > 0 ? styles.pillOpenText : styles.pillFullText]}>
                  {item.remaining > 0 ? `${item.remaining} spots left` : "Full"}
                </Text>
              </View>
            </View>
            {!!item.roles?.length && (
              <View style={styles.rolesRow}>
                {item.roles.map((r) => (
                  <View key={r.id} style={styles.rolePill}><Text style={styles.rolePillText}>{r.name} · {r.remaining} open</Text></View>
                ))}
              </View>
            )}
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
  searchRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginHorizontal: 12, marginTop: 12, borderRadius: 8, paddingHorizontal: 12 },
  searchInput: { flex: 1, paddingVertical: 10, color: COLORS.ink },
  filterRow: { flexDirection: "row", gap: 8, marginHorizontal: 12, marginTop: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16, backgroundColor: COLORS.wash },
  filterChipActive: { backgroundColor: COLORS.accent },
  filterChipText: { color: COLORS.ink, fontWeight: "600", fontSize: 12.5 },
  filterChipTextActive: { color: COLORS.accentInk },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: { backgroundColor: COLORS.surface, margin: 10, borderRadius: 10, overflow: "hidden" },
  cover: { width: "100%", height: 110, backgroundColor: "#eee" },
  body: { padding: 12 },
  nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { color: COLORS.ink, fontSize: 17, fontWeight: "700", flex: 1 },
  categoryPill: { backgroundColor: COLORS.accentInk, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  categoryPillText: { color: COLORS.accent, fontSize: 10.5, fontWeight: "700" },
  desc: { color: COLORS.sub, marginTop: 4 },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap" },
  pill: { backgroundColor: COLORS.wash, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  pillText: { color: COLORS.ink, fontWeight: "700", fontSize: 11.5 },
  pillOpen: { backgroundColor: "#E3F5E9" },
  pillOpenText: { color: "#2E7D32" },
  pillFull: { backgroundColor: "#FBE7E7" },
  pillFullText: { color: "#D32F2F" },
  rolesRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  rolePill: { backgroundColor: COLORS.wash, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  rolePillText: { color: COLORS.accent, fontSize: 11, fontWeight: "700" },
  locationBox: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginHorizontal: 12, marginTop: 12 },
  locationRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  locationLabel: { fontSize: 12.5, fontWeight: "700", color: COLORS.sub },
  locationClear: { fontSize: 12, fontWeight: "700", color: COLORS.accent },
  locationWarning: { fontSize: 11.5, color: "#D32F2F", fontWeight: "600", marginTop: 8 },
  accessBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#FFF3CD", borderRadius: 10, padding: 12, marginHorizontal: 12, marginTop: 12 },
  accessBannerText: { color: "#8A6D00", fontSize: 12, fontWeight: "600", flex: 1 },
  locationPill: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8 },
  locationPillText: { color: COLORS.sub, fontSize: 11, fontWeight: "600" },
});
