import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

// Lets a user drill into a category or subcategory to browse Pages tagged
// with it — tapping either navigates back to PagesListScreen ("Pages")
// with a categoryId param, which filters GET /api/pages accordingly.
export default function PageCategoriesScreen({ navigation }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    client.get("/categories/pages").then((r) => setCategories(r.data)).finally(() => setLoading(false));
  }, []);

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function browse(id, name) {
    navigation.navigate("Pages", { categoryId: id, categoryName: name });
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <View style={styles.container}>
      {categories.map((cat) => {
        const isExpanded = !!expanded[cat.id];
        return (
          <View key={cat.id} style={styles.block}>
            <View style={styles.row}>
              <TouchableOpacity style={styles.rowMain} onPress={() => browse(cat.id, cat.name)}>
                <Text style={styles.categoryText}>{cat.name}</Text>
              </TouchableOpacity>
              {cat.subcategories.length > 0 && (
                <TouchableOpacity onPress={() => toggleExpand(cat.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={COLORS.sub} />
                </TouchableOpacity>
              )}
            </View>
            {isExpanded &&
              cat.subcategories.map((sub) => (
                <TouchableOpacity key={sub.id} style={styles.subRow} onPress={() => browse(sub.id, sub.name)}>
                  <Text style={styles.subText}>{sub.name}</Text>
                  <Ionicons name="chevron-forward" size={14} color={COLORS.sub} />
                </TouchableOpacity>
              ))}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 12 },
  block: { backgroundColor: COLORS.surface, borderRadius: 10, marginBottom: 8, paddingHorizontal: 14 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14 },
  rowMain: { flex: 1 },
  categoryText: { fontSize: 15, fontWeight: "700", color: COLORS.ink },
  subRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, paddingLeft: 12, borderTopWidth: 1, borderTopColor: COLORS.bg },
  subText: { fontSize: 14, color: COLORS.ink },
});
