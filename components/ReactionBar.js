import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../theme";
import { formatCount } from "../utils/formatCount";

const REACTIONS = [
  { key: "like", emoji: "👍" },
  { key: "love", emoji: "❤️" },
  { key: "haha", emoji: "😆" },
  { key: "wow", emoji: "😮" },
  { key: "sad", emoji: "😢" },
  { key: "angry", emoji: "😡" },
];

export default function ReactionBar({ reactions = {}, myUserId, onReact }) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const total = Object.keys(reactions).length;
  const myReaction = reactions[myUserId];

  return (
    <View style={styles.wrap}>
      {pickerOpen && (
        <View style={styles.picker}>
          {REACTIONS.map((r) => (
            <TouchableOpacity
              key={r.key}
              onPress={() => {
                onReact(r.key);
                setPickerOpen(false);
              }}
              style={styles.pickerItem}
            >
              <Text style={styles.pickerEmoji}>{r.emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        onPress={() => (myReaction ? onReact(myReaction) : setPickerOpen((o) => !o))}
        onLongPress={() => setPickerOpen(true)}
        style={[styles.pill, myReaction && styles.pillActive]}
      >
        <Text style={styles.pillEmoji}>{myReaction ? REACTIONS.find((r) => r.key === myReaction)?.emoji : "👍"}</Text>
        <Text style={[styles.pillText, myReaction && styles.pillTextActive]}>{formatCount(total)}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "relative" },
  pill: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.wash,
    borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7,
  },
  pillActive: { backgroundColor: COLORS.accent },
  pillEmoji: { fontSize: 14 },
  pillText: { fontSize: 12, fontWeight: "700", color: COLORS.ink },
  pillTextActive: { color: COLORS.accentInk },
  picker: {
    position: "absolute", bottom: 42, left: 0, flexDirection: "row", backgroundColor: COLORS.surface,
    borderRadius: 24, paddingHorizontal: 8, paddingVertical: 6, zIndex: 10,
    shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, elevation: 4,
  },
  pickerItem: { paddingHorizontal: 4 },
  pickerEmoji: { fontSize: 26 },
});
