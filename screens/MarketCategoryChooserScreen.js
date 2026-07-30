import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import client from "../api/client";
import { COLORS } from "../theme";

// "Which category do you want to browse?" — shown before both Browse by
// Photos and Browse by Videos. Tag Clusters layout: bold category name,
// non-bold subcategory chips below it, centered. Tapping a category OR a
// subcategory chip browses that id directly — the market's categoryIds
// filter is an ANY-match against the junction table, so a subcategory id
// is just as valid a filter as its parent's.
export default function MarketCategoryChooserScreen({ route, navigation }) {
  const { mediaType, county, subCounty } = route.params;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const destination = mediaType === "video" ? "MarketVideoFeed" : "MarketSwipe";

  useEffect(() => {
    client.get("/market/categories/tree").then((r) => setCategories(r.data)).finally(() => setLoading(false));
  }, []);

  function choose(categoryId, categoryName) {
    navigation.navigate(destination, { mediaType, categoryId, categoryName, county, subCounty });
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Browse by category</Text>
      <TouchableOpacity style={styles.allChip} onPress={() => choose(null, "All Categories")}>
        <Text style={styles.allChipText}>All Categories</Text>
      </TouchableOpacity>
      {categories.map((cat) => (
        <View key={cat.id} style={styles.catBlock}>
          <TouchableOpacity onPress={() => choose(cat.id, cat.name)}>
            <Text style={styles.catName}>{cat.name}</Text>
          </TouchableOpacity>
          {cat.subcategories.length > 0 && (
            <View style={styles.chipsRow}>
              {cat.subcategories.map((sub) => (
                <TouchableOpacity key={sub.id} style={styles.chip} onPress={() => choose(sub.id, sub.name)}>
                  <Text style={styles.chipText}>{sub.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, paddingVertical: 20, paddingHorizontal: 20, alignItems: "center" },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 1, textTransform: "uppercase", color: COLORS.sub, marginBottom: 16 },
  allChip: { backgroundColor: COLORS.accent, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 8, marginBottom: 18 },
  allChipText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 12.5 },
  catBlock: { alignItems: "center", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border, borderStyle: "dashed", width: "100%" },
  catName: { fontWeight: "700", color: COLORS.ink, fontSize: 14, marginBottom: 10, textAlign: "center" },
  chipsRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, justifyContent: "center" },
  chip: { backgroundColor: COLORS.wash, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 5 },
  chipText: { fontWeight: "400", fontSize: 11.5, color: COLORS.sub },
});
