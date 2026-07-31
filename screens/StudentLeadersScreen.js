import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";

const ACTIONS = [
  { key: "apply", icon: "school-outline", label: "Apply", desc: "Apply for Student Leader recognition", screen: "StudentLeaderApply" },
  { key: "mine", icon: "document-text-outline", label: "My Applications", desc: "Track status, edit, or withdraw your application", screen: "MyStudentLeaderApplications" },
  { key: "report", icon: "flag-outline", label: "Report Imposter", desc: "Flag a Student Leader who didn't qualify or cheated to get approved", screen: "ReportImposter" },
];

export default function StudentLeadersScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <View style={styles.hero}>
        <Text style={styles.heroBadge}>✦ Influencer Quest ✦</Text>
        <Text style={styles.heroTitle}>Earn Your Tick.</Text>
        <Text style={styles.heroSubtitle}>Rack up points from everyday activity — unlock a verified Blue or Gold tick on The CBC.</Text>
      </View>

      <Text style={styles.intro}>
        Recognition for comrades who are active on the app — post, react, follow, and show up daily to earn
        points automatically. Hit the target within 30 days and get a verified badge on your profile.
      </Text>

      <View style={styles.benefitsCard}>
        <Text style={styles.benefitsTitle}>Benefits</Text>
        <View style={styles.benefitRow}>
          <Ionicons name="megaphone-outline" size={18} color={COLORS.accent} />
          <Text style={styles.benefitText}>Boost 1 post free, every month</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="star-outline" size={18} color={COLORS.accent} />
          <Text style={styles.benefitText}>Feature 1 group free, every month</Text>
        </View>
        <View style={styles.benefitRow}>
          <Ionicons name="checkmark-circle" size={18} color={COLORS.accent} />
          <Text style={styles.benefitText}>A blue verified badge on your profile</Text>
        </View>
      </View>

      {ACTIONS.map((a) => (
        <TouchableOpacity key={a.key} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)}>
          <View style={styles.actionIcon}>
            <Ionicons name={a.icon} size={22} color={COLORS.accent} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.actionLabel}>{a.label}</Text>
            <Text style={styles.actionDesc}>{a.desc}</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.sub} />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  title: { fontSize: 22, fontWeight: "800", color: COLORS.ink },
  hero: { backgroundColor: COLORS.accentInk, borderRadius: 12, paddingVertical: 22, paddingHorizontal: 20, alignItems: "center", marginBottom: 16 },
  heroBadge: { color: COLORS.accent, fontSize: 11, fontWeight: "800", letterSpacing: 1.5 },
  heroTitle: { color: "#fff", fontSize: 19, fontWeight: "800", textAlign: "center", marginTop: 10 },
  heroSubtitle: { color: "#B9C6DC", fontSize: 12, marginTop: 8, textAlign: "center", lineHeight: 18 },
  intro: { color: COLORS.sub, fontSize: 13.5, lineHeight: 19, marginTop: 8, marginBottom: 18 },
  benefitsCard: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 20 },
  benefitsTitle: { fontSize: 12, fontWeight: "700", color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 },
  benefitRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  benefitText: { fontSize: 14, color: COLORS.ink, flex: 1 },
  actionCard: {
    flexDirection: "row", alignItems: "center", gap: 14, backgroundColor: COLORS.surface,
    borderRadius: 12, padding: 16, marginBottom: 10,
  },
  actionIcon: { width: 42, height: 42, borderRadius: 21, backgroundColor: COLORS.bg, alignItems: "center", justifyContent: "center" },
  actionLabel: { fontSize: 15, fontWeight: "700", color: COLORS.ink },
  actionDesc: { fontSize: 12.5, color: COLORS.sub, marginTop: 2 },
});
