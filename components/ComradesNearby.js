import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import Avatar from "./Avatar";
import { COLORS } from "../theme";

const RING_SIZE = 62;
const STROKE_WIDTH = 3.5;
const RADIUS = (RING_SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
const MAX_DISPLAY_KM = 10;
const MIN_FILL = 0.15;

// Closer = a fuller ring; distances past MAX_DISPLAY_KM never drop below a
// thin sliver, so far-away comrades are still visibly "on the ring" too.
function fillFor(distanceKm) {
  const pct = 1 - Math.min(distanceKm, MAX_DISPLAY_KM) / MAX_DISPLAY_KM;
  return Math.max(MIN_FILL, pct);
}

function formatDistance(km) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
}

function GenderDot({ gender }) {
  if (gender !== "Male" && gender !== "Female") return null;
  return <View style={[styles.genderDot, { backgroundColor: gender === "Male" ? "#3B82F6" : "#EC4899" }]} />;
}

export default function ComradesNearby({ users, onFollow, onOpenProfile }) {
  if (!users?.length) return null;

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Comrades Nearby</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10 }}>
        {users.map((u) => {
          const offset = CIRCUMFERENCE * (1 - fillFor(u.distanceKm));
          return (
            <View key={u.id} style={styles.card}>
              <TouchableOpacity onPress={() => onOpenProfile?.(u.id)} style={styles.ringWrap}>
                <Svg width={RING_SIZE} height={RING_SIZE} style={StyleSheet.absoluteFill}>
                  <Circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RADIUS} stroke={COLORS.wash} strokeWidth={STROKE_WIDTH} fill="none" />
                  <Circle
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={RADIUS}
                    stroke={COLORS.accent}
                    strokeWidth={STROKE_WIDTH}
                    fill="none"
                    strokeDasharray={`${CIRCUMFERENCE} ${CIRCUMFERENCE}`}
                    strokeDashoffset={offset}
                    strokeLinecap="round"
                    rotation="-90"
                    origin={`${RING_SIZE / 2}, ${RING_SIZE / 2}`}
                  />
                </Svg>
                <Avatar uri={u.avatar} name={u.name} style={styles.avatar} />
                <View style={styles.distanceBadge}>
                  <Text style={styles.distanceBadgeText}>{formatDistance(u.distanceKm)}</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.nameRow}>
                <GenderDot gender={u.gender} />
                <Text style={styles.name} numberOfLines={1}>{u.name.split(" ")[0]}</Text>
              </View>

              <TouchableOpacity style={styles.followPill} onPress={() => onFollow(u.id)}>
                <Text style={styles.followPillText}>Follow</Text>
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingTop: 12, paddingBottom: 10, backgroundColor: COLORS.surface },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink, marginLeft: 20, marginBottom: 12 },
  card: { width: 92, alignItems: "center", marginRight: 14 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center" },
  avatar: { width: 52, height: 52, borderRadius: 26 },
  distanceBadge: {
    position: "absolute", bottom: -6, alignSelf: "center", backgroundColor: COLORS.ink,
    borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2,
  },
  distanceBadgeText: { color: "#fff", fontSize: 9.5, fontWeight: "800" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  genderDot: { width: 6, height: 6, borderRadius: 3 },
  name: { fontSize: 11.5, fontWeight: "700", color: COLORS.ink, maxWidth: 70 },
  followPill: { borderWidth: 1.5, borderColor: COLORS.accent, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 4, marginTop: 8 },
  followPillText: { color: COLORS.accent, fontWeight: "700", fontSize: 11 },
});
