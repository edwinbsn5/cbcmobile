import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../theme";

const OPTIONS = ["left", "center", "right"];

// Ionicons has no real align-left/center/right glyphs, so each option draws
// its own tiny 3-bar icon (classic "lines of text" align indicator) rather
// than reusing an unrelated generic icon that wouldn't actually show which
// alignment it represents.
function AlignIcon({ align, active }) {
  const barColor = active ? COLORS.accentInk : COLORS.ink;
  const alignItems = align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center";
  return (
    <View style={[styles.iconBox, { alignItems }]}>
      <View style={[styles.bar, { width: 18, backgroundColor: barColor }]} />
      <View style={[styles.bar, { width: 12, backgroundColor: barColor }]} />
      <View style={[styles.bar, { width: 16, backgroundColor: barColor }]} />
    </View>
  );
}

// Used identically by CreatePostScreen and the text-story composer.
export default function TextAlignPicker({ value, onSelect }) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((align) => (
        <TouchableOpacity
          key={align}
          focusable={false}
          style={[styles.button, value === align && styles.buttonActive]}
          onPress={() => onSelect(align)}
        >
          <AlignIcon align={align} active={value === align} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 8 },
  button: { width: 36, height: 36, borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.wash },
  buttonActive: { backgroundColor: COLORS.accent },
  iconBox: { width: 20, height: 14, justifyContent: "space-between" },
  bar: { height: 2, borderRadius: 1 },
});
