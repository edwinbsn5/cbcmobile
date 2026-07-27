import React, { useRef } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { COLORS } from "../theme";

// A 4-box digit entry backed by one invisible TextInput that actually holds
// focus/keyboard state — the boxes are pure display. Used for the withdrawal
// PIN everywhere it's collected (withdraw sheet, Wallet Settings, reset).
export default function PinInput({ value, onChange, autoFocus = false, secure = true }) {
  const inputRef = useRef(null);

  return (
    <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={styles.wrap}>
      {[0, 1, 2, 3].map((i) => {
        const filled = i < value.length;
        const active = i === value.length;
        return (
          <View key={i} style={[styles.box, active && styles.boxActive]}>
            <Text style={styles.digit}>{filled ? (secure ? "•" : value[i]) : ""}</Text>
          </View>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^0-9]/g, "").slice(0, 4))}
        keyboardType="number-pad"
        maxLength={4}
        autoFocus={autoFocus}
        style={styles.hiddenInput}
      />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: "row", gap: 10, alignSelf: "flex-start" },
  box: {
    width: 46, height: 52, borderRadius: 10, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface,
  },
  boxActive: { borderColor: COLORS.accent },
  digit: { fontSize: 20, fontWeight: "800", color: COLORS.ink },
  hiddenInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
});
