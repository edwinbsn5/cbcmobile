import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";

const CONTESTS_EMAIL = "contests@campusbiasharaclub.com";

export default function BeTheStarScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.badge}>✦ Be the STAR ✦</Text>
        <Text style={styles.title}>Your stage. Your vote.</Text>
        <Text style={styles.subtitle}>Upload a video, get rated 1–10 by the community, climb the Top 100.</Text>
      </View>

      <View style={styles.buttons}>
        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("StarContestList", { mode: "current" })}>
          <View style={styles.icon}><Ionicons name="videocam-outline" size={16} color={COLORS.accent} /></View>
          <View style={styles.buttonText}>
            <Text style={styles.buttonLabel}>Current Contests</Text>
            <Text style={styles.buttonHint}>Open now — submit &amp; vote</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("StarContestList", { mode: "past" })}>
          <View style={styles.icon}><Ionicons name="time-outline" size={16} color={COLORS.accent} /></View>
          <View style={styles.buttonText}>
            <Text style={styles.buttonLabel}>Past Contests</Text>
            <Text style={styles.buttonHint}>Results &amp; past winners</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("MyStarSubmissions")}>
          <View style={styles.icon}><Ionicons name="trophy-outline" size={16} color={COLORS.accent} /></View>
          <View style={styles.buttonText}>
            <Text style={styles.buttonLabel}>My Submissions</Text>
            <Text style={styles.buttonHint}>Your entries &amp; standings</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={() => navigation.navigate("StarTips")}>
          <View style={styles.icon}><Ionicons name="bulb-outline" size={16} color={COLORS.accent} /></View>
          <View style={styles.buttonText}>
            <Text style={styles.buttonLabel}>Tips to WIN</Text>
            <Text style={styles.buttonHint}>How to shoot, edit &amp; stand out</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sponsorRow}
          onPress={() => Linking.openURL(`mailto:${CONTESTS_EMAIL}?subject=${encodeURIComponent("Sponsor / host a contest")}`)}
        >
          <View style={styles.icon}><Ionicons name="mail-outline" size={16} color={COLORS.accent} /></View>
          <View style={styles.buttonText}>
            <Text style={styles.buttonLabel}>Sponsor or request a contest</Text>
            <Text style={styles.buttonHint}>{CONTESTS_EMAIL}</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: { backgroundColor: COLORS.ink, padding: 28, alignItems: "center" },
  badge: { color: "#F5A623", fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  title: { color: "#fff", fontSize: 24, fontWeight: "800", fontStyle: "italic", marginTop: 8 },
  subtitle: { color: "#bcd9d2", fontSize: 12.5, marginTop: 6, textAlign: "center", lineHeight: 18 },
  buttons: { padding: 16, gap: 10 },
  button: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  sponsorRow: {
    flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: COLORS.surface, borderRadius: 12, padding: 16,
    marginTop: 6, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed",
  },
  icon: { width: 34, height: 34, borderRadius: 9, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  buttonText: { flex: 1 },
  buttonLabel: { fontSize: 14.5, fontWeight: "800", color: COLORS.ink },
  buttonHint: { fontSize: 11.5, color: COLORS.sub, marginTop: 1 },
});
