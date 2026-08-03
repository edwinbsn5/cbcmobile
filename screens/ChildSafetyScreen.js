import React from "react";
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { openInAppBrowser } from "../utils/inAppBrowser";
import { WEB_BASE_URL } from "../api/client";
import { COLORS } from "../theme";

const SAFETY_EMAIL = "safety@campusbiasharaclub.com";

export default function ChildSafetyScreen({ navigation }) {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.intro}>
        Tujijenge has zero tolerance for child sexual abuse and exploitation (CSAE). This applies to every post,
        reel, story, comment, message, and account on the platform.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={() => navigation.navigate("NewTicket", { category: "Child Safety (CSAE)" })}
      >
        <Ionicons name="flag-outline" size={18} color={COLORS.accentInk} />
        <Text style={styles.primaryButtonText}>Report a child safety concern</Text>
      </TouchableOpacity>
      <Text style={styles.caption}>
        Use this if your concern isn't tied to one specific post — for example, a user's behavior or a direct
        message. To report a specific post, reel, or comment, use the Report option in its options menu instead.
      </Text>

      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => {
          const url = `mailto:${SAFETY_EMAIL}?subject=${encodeURIComponent("CSAE report")}`;
          Linking.canOpenURL(url).then((ok) => {
            if (ok) Linking.openURL(url);
            else Alert.alert("No email app found", `Please email ${SAFETY_EMAIL} directly.`);
          });
        }}
      >
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>Contact us directly</Text>
          <Text style={styles.rowCaption}>{SAFETY_EMAIL} — for urgent concerns or if you don't have an account</Text>
        </View>
        <Ionicons name="mail-outline" size={20} color={COLORS.sub} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.linkRow} onPress={() => openInAppBrowser(`${WEB_BASE_URL}/csae`)}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>Read our full Child Safety Standards</Text>
          <Text style={styles.rowCaption}>What's prohibited, how we respond, and how we work with law enforcement</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.sub} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  intro: { color: COLORS.sub, fontSize: 13, marginBottom: 16, lineHeight: 18 },
  primaryButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 12, paddingVertical: 14,
  },
  primaryButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 15 },
  caption: { color: COLORS.sub, fontSize: 12, marginTop: 8, marginBottom: 20, lineHeight: 17 },
  linkRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginTop: 12 },
  rowLabel: { color: COLORS.ink, fontSize: 15, fontWeight: "600" },
  rowCaption: { color: COLORS.sub, fontSize: 12, marginTop: 4 },
});
