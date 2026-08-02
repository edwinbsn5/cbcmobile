import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../theme";

export default function WelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 48 }]}>
      <StatusBar style="light" />
      <View style={styles.hero}>
        <Image source={require("../assets/icon.png")} style={styles.logo} />
        <Text style={styles.word}>Tujijenge</Text>
        <Text style={styles.tagline}>Build Skills. Build Wealth. Build Your Circle.</Text>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={() => navigation.navigate("Register")}>
        <Text style={styles.primaryButtonText}>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.navigate("Login")}>
        <Text style={styles.secondaryButtonText}>Log In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "flex-end", padding: 24, paddingBottom: 48, backgroundColor: COLORS.accentInk },
  hero: { flex: 1, justifyContent: "center", alignItems: "center" },
  logo: { width: 88, height: 88, borderRadius: 20, marginBottom: 18 },
  word: { fontSize: 28, fontWeight: "800", color: "#FFFFFF", letterSpacing: 0.3 },
  tagline: { color: "rgba(255,255,255,0.72)", fontSize: 15, textAlign: "center", marginTop: 12, paddingHorizontal: 16, lineHeight: 21 },
  primaryButton: { backgroundColor: COLORS.accent, borderRadius: 26, padding: 15, alignItems: "center" },
  primaryButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
  secondaryButton: { borderWidth: 1.4, borderColor: COLORS.accent, borderRadius: 26, padding: 15, alignItems: "center", marginTop: 12 },
  secondaryButtonText: { color: COLORS.accent, fontWeight: "700", fontSize: 16 },
});
