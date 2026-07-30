import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Modal, FlatList, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import COUNTIES from "../data/counties";
import { COLORS } from "../theme";

/**
 * Companion to CountyPicker — shows the sub-counties belonging to whichever
 * county name is passed in `county` (data/counties.js's per-county
 * subCounties list). Disabled (greyed placeholder, no modal) until a county
 * is actually picked, since there's nothing to list before that.
 */
export default function SubCountyPicker({ county, value, onChange, placeholder = "Select your sub-county" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const subCounties = COUNTIES.find((c) => c.name === county)?.subCounties || [];
  const filtered = query ? subCounties.filter((c) => c.toLowerCase().includes(query.toLowerCase())) : subCounties;

  function select(c) {
    onChange(c);
    setQuery("");
    setOpen(false);
  }

  return (
    <View>
      <TouchableOpacity
        style={[styles.trigger, !county && styles.triggerDisabled]}
        onPress={() => county && setOpen(true)}
        disabled={!county}
      >
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {value || (county ? placeholder : "Select a county first")}
        </Text>
        <Ionicons name="chevron-down" size={18} color={COLORS.sub} />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select sub-county — {county}</Text>
            <TouchableOpacity onPress={() => setOpen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={COLORS.ink} />
            </TouchableOpacity>
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search sub-counties..."
            value={query}
            onChangeText={setQuery}
            autoCapitalize="words"
          />
          <FlatList
            data={filtered}
            keyExtractor={(c) => c}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.row} onPress={() => select(item)}>
                <Text style={styles.rowText}>{item}</Text>
                {item === value && <Ionicons name="checkmark" size={18} color={COLORS.accent} />}
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.empty}>No matches</Text>}
          />
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, backgroundColor: COLORS.surface,
  },
  triggerDisabled: { opacity: 0.5 },
  triggerText: { fontSize: 15, color: COLORS.ink },
  triggerPlaceholder: { color: COLORS.sub },
  modalContainer: { flex: 1, backgroundColor: COLORS.bg, paddingTop: 50 },
  modalHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 16, marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: COLORS.ink, flex: 1, marginRight: 10 },
  searchInput: { marginHorizontal: 16, borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, backgroundColor: COLORS.surface, marginBottom: 8, color: COLORS.ink },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 13, paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  rowText: { fontSize: 15, color: COLORS.ink },
  empty: { textAlign: "center", color: COLORS.sub, marginTop: 30 },
});
