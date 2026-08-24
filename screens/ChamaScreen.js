import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

const FILTERS = [
  { key: "", label: "Explore" },
  { key: "joined", label: "Joined" },
  { key: "managed", label: "Managed" },
];

export default function ChamaScreen({ navigation }) {
  const [chamas, setChamas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(() => {
    client
      .get("/chama", { params: { filter: filter || undefined, search: search || undefined } })
      .then((r) => setChamas(r.data))
      .catch((e) => Alert.alert("Couldn't load Chamas", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [filter, search]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return (
    <FlatList
      style={styles.container}
      data={chamas}
      keyExtractor={(c) => c.id}
      ListHeaderComponent={
        <View>
          <TouchableOpacity style={styles.createButton} onPress={() => navigation.navigate("CreateChama")}>
            <Text style={styles.createButtonText}>+ Start a Chama</Text>
          </TouchableOpacity>

          <View style={styles.hero}>
            <Text style={styles.heroBadge}>✦ Chama & Savings ✦</Text>
            <Text style={styles.heroTitle}>Save together, grow together</Text>
            <Text style={styles.heroSubtitle}>Table banking and rotating savings groups, run transparently.</Text>
          </View>

          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={16} color={COLORS.sub} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search Chamas"
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
        </View>
      }
      ListEmptyComponent={loading ? <ActivityIndicator style={{ marginTop: 40 }} color={COLORS.accent} /> : <Text style={styles.empty}>No Chamas found</Text>}
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
              {" · "}{item.payoutModel === "merry_go_round" ? "Merry-go-round" : "Pooled savings"}
            </Text>
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
});
