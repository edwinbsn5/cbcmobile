import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

/**
 * Multi-select category/subcategory picker for Pages, fed from GET
 * /api/categories/pages (fetched once — small server-seeded reference
 * data). A Page can be tagged with any mix of top-level categories and
 * subcategories — tapping a category row toggles it directly (selecting
 * the parent itself is a valid tag, not just a group of children); the
 * chevron expands/collapses its subcategories, each with its own
 * independent checkbox. `selectedIds` is a plain array of page_categories
 * ids; onChange(nextIds) fires on every toggle.
 */
export default function CategoryPicker({ selectedIds, onChange }) {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  useEffect(() => {
    client.get("/categories/pages").then((r) => setCategories(r.data)).finally(() => setLoading(false));
  }, []);

  function toggle(id) {
    const next = selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id];
    onChange(next);
  }

  function toggleExpand(id) {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (loading) return <ActivityIndicator color={COLORS.accent} />;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Categories</Text>
      <Text style={styles.hint}>Select any that apply — categories and subcategories can both be picked</Text>
      {categories.map((cat) => {
        const catSelected = selectedIds.includes(cat.id);
        const isExpanded = !!expanded[cat.id];
        return (
          <View key={cat.id} style={styles.categoryBlock}>
            <View style={styles.categoryRow}>
              <TouchableOpacity style={styles.checkRow} onPress={() => toggle(cat.id)}>
                <Ionicons name={catSelected ? "checkbox" : "square-outline"} size={20} color={catSelected ? COLORS.accent : COLORS.sub} />
                <Text style={styles.categoryText}>{cat.name}</Text>
              </TouchableOpacity>
              {cat.subcategories.length > 0 && (
                <TouchableOpacity onPress={() => toggleExpand(cat.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={18} color={COLORS.sub} />
                </TouchableOpacity>
              )}
            </View>
            {isExpanded &&
              cat.subcategories.map((sub) => {
                const subSelected = selectedIds.includes(sub.id);
                return (
                  <TouchableOpacity key={sub.id} style={[styles.checkRow, styles.subRow]} onPress={() => toggle(sub.id)}>
                    <Ionicons name={subSelected ? "checkbox" : "square-outline"} size={18} color={subSelected ? COLORS.accent : COLORS.sub} />
                    <Text style={styles.subText}>{sub.name}</Text>
                  </TouchableOpacity>
                );
              })}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 12 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 2 },
  hint: { fontSize: 11.5, color: COLORS.sub, marginBottom: 8 },
  categoryBlock: { borderBottomWidth: 1, borderBottomColor: COLORS.bg },
  categoryRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
  checkRow: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1, paddingVertical: 2 },
  subRow: { paddingLeft: 24, paddingVertical: 8 },
  categoryText: { fontSize: 14.5, fontWeight: "600", color: COLORS.ink },
  subText: { fontSize: 13.5, color: COLORS.ink },
});
