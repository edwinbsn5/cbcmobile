import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

// "Which category do you want to browse?" — shown before both Browse by
// Photos and Browse by Videos. Only main (top-level) categories + an "All
// Categories" option, per spec — no subcategory drill-down here (that
// granularity lives in the multi-select picker at listing-creation time).
export default function MarketCategoryChooserScreen({ route, navigation }) {
  const { mediaType } = route.params;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const destination = mediaType === "video" ? "MarketVideoFeed" : "MarketSwipe";

  useEffect(() => {
    client.get("/market/categories/tree").then((r) => setCategories(r.data)).finally(() => setLoading(false));
  }, []);

  function choose(categoryId, categoryName) {
    navigation.navigate(destination, { mediaType, categoryId, categoryName });
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>Which category do you want to browse?</Text>
      <TouchableOpacity style={styles.row} onPress={() => choose(null, "All Categories")}>
        <View style={styles.icon}><Ionicons name="apps-outline" size={18} color={COLORS.accent} /></View>
        <Text style={styles.rowText}>All Categories</Text>
        <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
      </TouchableOpacity>
      {categories.map((c) => (
        <TouchableOpacity key={c.id} style={styles.row} onPress={() => choose(c.id, c.name)}>
          <View style={styles.icon}><Ionicons name="pricetag-outline" size={18} color={COLORS.accent} /></View>
          <Text style={styles.rowText}>{c.name}</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  prompt: { fontSize: 15, fontWeight: "700", color: COLORS.ink, marginBottom: 14 },
  row: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surface,
    borderRadius: 10, padding: 14, marginBottom: 8,
  },
  icon: { width: 30, height: 30, borderRadius: 8, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  rowText: { flex: 1, fontSize: 14, fontWeight: "600", color: COLORS.ink },
});
