import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, ScrollView, TouchableWithoutFeedback, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import CountyPicker from "./CountyPicker";
import SubCountyPicker from "./SubCountyPicker";
import CategoryPicker from "./CategoryPicker";
import { COLORS } from "../theme";

// Filter bottom sheet for the unified MarketPlace stream: saved items /
// my listings shortcuts, county/sub-county (the same pickers used across
// the app, not a bespoke zone widget), category multi-select (reuses
// CategoryPicker against MarketPlace's own taxonomy), and a price
// range — a single "Search" action applies everything at once and closes
// the sheet, mirroring Fundi Jikoni's own filter sheet.
export default function MarketFilterSheet({
  visible, onClose, county, subCounty, onLocationChange, categoryIds, onCategoryIdsChange,
  minPrice, maxPrice, onSearch, onOpenSaved, onOpenMine,
}) {
  const insets = useSafeAreaInsets();
  const [localCounty, setLocalCounty] = useState(county);
  const [localSubCounty, setLocalSubCounty] = useState(subCounty);
  const [localCategoryIds, setLocalCategoryIds] = useState(categoryIds);
  const [localMin, setLocalMin] = useState(minPrice != null ? String(minPrice) : "");
  const [localMax, setLocalMax] = useState(maxPrice != null ? String(maxPrice) : "");

  useEffect(() => {
    if (!visible) return;
    setLocalCounty(county);
    setLocalSubCounty(subCounty);
    setLocalCategoryIds(categoryIds);
    setLocalMin(minPrice != null ? String(minPrice) : "");
    setLocalMax(maxPrice != null ? String(maxPrice) : "");
  }, [visible]);

  function handleCountyChange(c) {
    setLocalCounty(c);
    setLocalSubCounty("");
  }

  function handleSearch() {
    onLocationChange(localCounty, localSubCounty);
    onCategoryIdsChange(localCategoryIds);
    onSearch({
      county: localCounty || undefined,
      subCounty: localSubCounty || undefined,
      minPrice: localMin ? Number(localMin) : undefined,
      maxPrice: localMax ? Number(localMax) : undefined,
    });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.kbAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <Text style={styles.title}>Filter listings</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={20} color={COLORS.sub} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.row} onPress={onOpenSaved}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}><Ionicons name="bookmark-outline" size={16} color={COLORS.accent} /></View>
              <Text style={styles.rowLabel}>Saved items</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.sub} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={onOpenMine}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}><Ionicons name="pricetags-outline" size={16} color={COLORS.accent} /></View>
              <Text style={styles.rowLabel}>My listings</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={COLORS.sub} />
          </TouchableOpacity>

          <Text style={styles.sectionLabel}>County</Text>
          <CountyPicker value={localCounty} onChange={handleCountyChange} placeholder="Any county" />
          {!!localCounty && (
            <View style={{ marginTop: 8 }}>
              <SubCountyPicker county={localCounty} value={localSubCounty} onChange={setLocalSubCounty} placeholder="Any sub-county" />
            </View>
          )}

          <CategoryPicker selectedIds={localCategoryIds} onChange={setLocalCategoryIds} endpoint="/market/categories/tree" />

          <Text style={styles.sectionLabel}>Price range (KES)</Text>
          <View style={styles.priceRow}>
            <TextInput style={styles.priceInput} placeholder="Min" placeholderTextColor={COLORS.sub} keyboardType="number-pad" value={localMin} onChangeText={setLocalMin} />
            <Text style={styles.priceSep}>–</Text>
            <TextInput style={styles.priceInput} placeholder="Max" placeholderTextColor={COLORS.sub} keyboardType="number-pad" value={localMax} onChangeText={setLocalMax} />
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
            <Ionicons name="search" size={16} color={COLORS.accentInk} />
            <Text style={styles.searchBtnText}>Search</Text>
          </TouchableOpacity>
        </View>
      </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  kbAvoid: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "86%" },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: "center", marginTop: 10 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 6, paddingBottom: 12 },
  title: { fontSize: 15, fontWeight: "800", color: COLORS.ink },
  body: { paddingHorizontal: 18 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  rowIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  rowLabel: { fontSize: 13.5, fontWeight: "700", color: COLORS.ink },
  sectionLabel: { fontSize: 11, fontWeight: "800", color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.4, marginTop: 16, marginBottom: 10 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  priceInput: { flex: 1, borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 11, fontSize: 13, color: COLORS.ink, backgroundColor: COLORS.surface },
  priceSep: { color: COLORS.sub, fontSize: 13 },
  footer: { paddingHorizontal: 18, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  searchBtn: { backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 13, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  searchBtnText: { fontSize: 14, fontWeight: "800", color: COLORS.accentInk },
});
