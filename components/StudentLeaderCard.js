import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";

const LEADER_BLUE = "#1DA1F2";

// Shown on a Student Leader's profile (own or someone else's) right under
// the stats row, before the Posts/Reels/Contests tabs — see
// StudentLeaderApplyScreen.js for where these fields are collected and
// routes/users.js's GET /:id for how `info` is resolved server-side from
// the user's approved application.
export default function StudentLeaderCard({ info }) {
  if (!info) return null;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <Ionicons name="checkmark-circle" size={15} color={LEADER_BLUE} />
        <Text style={styles.headText}>SERVED AS...</Text>
      </View>
      <View style={styles.body}>
        <View style={styles.row}>
          <Text style={styles.k}>Title</Text>
          <Text style={styles.v}>{info.title}</Text>
        </View>
        {!!info.alias && (
          <View style={styles.row}>
            <Text style={styles.k}>Nickname</Text>
            <Text style={styles.v}>"{info.alias}"</Text>
          </View>
        )}
        <View style={[styles.row, styles.rowLast]}>
          <Text style={styles.k}>Years</Text>
          <Text style={styles.v}>{info.yearsServedFrom} – {info.yearsServedTo}</Text>
        </View>
        {!!info.message && (
          <View style={styles.messageBox}>
            <Text style={styles.messageLabel}>Message to comrades</Text>
            <Text style={styles.messageText}>"{info.message}"</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 12, backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: "rgba(29,161,242,0.25)", overflow: "hidden",
  },
  head: {
    flexDirection: "row", alignItems: "center", gap: 7,
    paddingHorizontal: 14, paddingVertical: 10,
    backgroundColor: "rgba(29,161,242,0.08)",
    borderBottomWidth: 1, borderBottomColor: "rgba(29,161,242,0.16)",
  },
  headText: { fontSize: 11.5, fontWeight: "800", letterSpacing: 0.4, color: "#0D7BC4" },
  body: { paddingHorizontal: 14, paddingVertical: 4 },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "baseline",
    paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  rowLast: { borderBottomWidth: 0 },
  k: { fontSize: 11, color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.4, fontWeight: "700" },
  v: { fontSize: 13.5, color: COLORS.ink, fontWeight: "600" },
  messageBox: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, marginTop: 4, marginBottom: 12 },
  messageLabel: { fontSize: 10.5, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.4, color: COLORS.sub, marginBottom: 5 },
  messageText: { fontSize: 13, color: COLORS.ink, fontStyle: "italic", lineHeight: 18 },
});
