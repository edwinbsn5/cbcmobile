import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from "react-native";
import client from "../api/client";
import { COLORS } from "../theme";

export default function CheckEmailScreen({ navigation, route }) {
  const { email } = route.params || {};
  const [resending, setResending] = useState(false);

  async function handleResend() {
    setResending(true);
    try {
      const { data } = await client.post("/auth/resend-verification", { email });
      Alert.alert("Sent", data.message);
    } catch (e) {
      Alert.alert("Couldn't resend", e.response?.data?.error || e.message);
    } finally {
      setResending(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>📧</Text>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.body}>
        We sent a verification link to{"\n"}
        <Text style={styles.email}>{email}</Text>
        {"\n\n"}Tap the link to finish creating your account, then come back here and log in.
      </Text>

      <TouchableOpacity style={styles.button} onPress={handleResend} disabled={resending}>
        {resending ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Resend email</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: COLORS.surface },
  icon: { fontSize: 44, marginBottom: 16 },
  title: { color: COLORS.ink, fontSize: 22, fontWeight: "800", marginBottom: 12 },
  body: { fontSize: 14, color: COLORS.sub, textAlign: "center", lineHeight: 21, marginBottom: 28 },
  email: { fontWeight: "700", color: COLORS.ink },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 14, paddingHorizontal: 28, alignItems: "center", minWidth: 200 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
  link: { color: COLORS.accent, textAlign: "center", marginTop: 20 },
});
