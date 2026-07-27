import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from "react-native";
import client from "../api/client";
import { COLORS } from "../theme";

export default function ForgotPasswordScreen({ navigation }) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSend() {
    if (!email.trim()) return Alert.alert("Email required", "Enter the email you registered with");
    setSubmitting(true);
    try {
      const { data } = await client.post("/auth/forgot-password", { email: email.trim() });
      Alert.alert("Check your email", data.message, [{ text: "OK", onPress: () => navigation.navigate("Login") }]);
    } catch (e) {
      Alert.alert("Couldn't send reset link", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={styles.title}>Forgot password?</Text>
      <Text style={styles.body}>Enter the email you registered with and we'll send you a link to reset your password.</Text>

      <TextInput
        style={styles.input}
        placeholder="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />

      <TouchableOpacity style={styles.button} onPress={handleSend} disabled={submitting}>
        {submitting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Send reset link</Text>}
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Back to Login</Text>
      </TouchableOpacity>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: COLORS.surface },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 12 },
  body: { color: COLORS.sub, fontSize: 14, textAlign: "center", lineHeight: 20, marginBottom: 24 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 12, marginBottom: 12, fontSize: 16 },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 14, alignItems: "center", marginTop: 8 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
  link: { color: COLORS.accent, textAlign: "center", marginTop: 16 },
});
