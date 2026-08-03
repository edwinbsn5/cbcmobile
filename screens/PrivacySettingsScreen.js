import React, { useState } from "react";
import { View, Text, Switch, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme";

export default function PrivacySettingsScreen({ navigation }) {
  const { user, updateUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const hideWalletBalance = !!user?.hideWalletBalance;

  async function handleToggle(value) {
    setSaving(true);
    try {
      const { data } = await client.patch("/auth/me", { hideWalletBalance: value });
      await updateUser(data.user);
    } catch (e) {
      Alert.alert("Couldn't update setting", e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.intro}>
        Your email and wallet balance are never shown on your public profile — this setting only
        controls what you see on your own Profile tab.
      </Text>

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>Show wallet balance on my Profile</Text>
          <Text style={styles.rowCaption}>Turn off to hide the balance chip when you view your own Profile tab.</Text>
        </View>
        <Switch value={!hideWalletBalance} onValueChange={(v) => handleToggle(!v)} disabled={saving} />
      </View>

      <TouchableOpacity style={styles.linkRow} onPress={() => navigation.navigate("BlockedUsers")}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowLabel}>Blocked users</Text>
          <Text style={styles.rowCaption}>People you've blocked can't follow or message you.</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={COLORS.sub} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, padding: 16 },
  intro: { color: COLORS.sub, fontSize: 13, marginBottom: 16, lineHeight: 18 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 12, padding: 16 },
  linkRow: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginTop: 12 },
  rowLabel: { color: COLORS.ink, fontSize: 15, fontWeight: "600" },
  rowCaption: { color: COLORS.sub, fontSize: 12, marginTop: 4 },
});
