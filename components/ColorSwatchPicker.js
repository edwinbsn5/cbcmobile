import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";

const LIGHT_COLORS = new Set(["#FFFFFF", "#F1F1F1", "#FFEB3B"]);

// A row of tappable color circles from a fixed palette — used for both the
// background-color and font-color pickers on colored text posts/stories.
// `includeNone` adds a leading "clear" swatch (only meaningful for the
// background picker, to get back to a plain post/story).
export default function ColorSwatchPicker({ colors, value, onSelect, includeNone, size = 32 }) {
  return (
    <View style={styles.row}>
      {includeNone && (
        <TouchableOpacity
          focusable={false}
          style={[styles.swatch, styles.noneSwatch, { width: size, height: size, borderRadius: size / 2 }, !value && styles.swatchSelected]}
          onPress={() => onSelect(null)}
        >
          <Ionicons name="close" size={size * 0.5} color={COLORS.sub} />
        </TouchableOpacity>
      )}
      {colors.map((c) => (
        <TouchableOpacity
          key={c}
          focusable={false}
          style={[styles.swatch, { backgroundColor: c, width: size, height: size, borderRadius: size / 2 }, value === c && styles.swatchSelected]}
          onPress={() => onSelect(c)}
        >
          {value === c && <Ionicons name="checkmark" size={size * 0.55} color={LIGHT_COLORS.has(c) ? "#111" : "#fff"} />}
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  swatch: { alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "transparent" },
  noneSwatch: { backgroundColor: "#fff", borderColor: COLORS.border },
  swatchSelected: { borderColor: COLORS.ink },
});
