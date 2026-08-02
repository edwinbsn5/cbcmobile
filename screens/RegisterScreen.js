import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { WEB_BASE_URL } from "../api/client";
import { openInAppBrowser } from "../utils/inAppBrowser";
import { COLORS } from "../theme";

export default function RegisterScreen({ navigation }) {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleRegister() {
    const trimmedUsername = username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      return Alert.alert("Invalid username", "Username must be 3-20 characters: letters, numbers, underscore only");
    }
    if (!agreedToTerms) {
      return Alert.alert("Agreement required", "Please agree to the Terms & Conditions and Privacy Policy to continue");
    }
    setSubmitting(true);
    try {
      // Gate() in App.js switches away from the auth stack automatically
      // once register() sets the logged-in user — no navigation call needed.
      await register(name, trimmedUsername, email, password, agreedToTerms);
    } catch (e) {
      Alert.alert("Registration failed", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create account</Text>
      <TextInput style={styles.input} placeholder="Full name" placeholderTextColor={COLORS.sub} value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Username" placeholderTextColor={COLORS.sub} autoCapitalize="none" value={username} onChangeText={setUsername} />
      <TextInput style={styles.input} placeholder="Email" placeholderTextColor={COLORS.sub} autoCapitalize="none" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Password" placeholderTextColor={COLORS.sub} secureTextEntry value={password} onChangeText={setPassword} />

      <TouchableOpacity style={styles.agreeRow} onPress={() => setAgreedToTerms((v) => !v)} activeOpacity={0.7}>
        <View style={[styles.checkbox, agreedToTerms && styles.checkboxChecked]}>
          {agreedToTerms && <Ionicons name="checkmark" size={14} color={COLORS.accentInk} />}
        </View>
        <Text style={styles.agreeText}>
          I agree to the{" "}
          <Text style={styles.agreeLink} onPress={() => openInAppBrowser(`${WEB_BASE_URL}/terms`)}>
            Terms &amp; Conditions
          </Text>
          {" "}and{" "}
          <Text style={styles.agreeLink} onPress={() => openInAppBrowser(`${WEB_BASE_URL}/privacy`)}>
            Privacy Policy
          </Text>
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, (!agreedToTerms || submitting) && styles.buttonDisabled]}
        onPress={handleRegister}
        disabled={!agreedToTerms || submitting}
      >
        <Text style={styles.buttonText}>{submitting ? "Creating..." : "Sign Up"}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate("Login")}>
        <Text style={styles.link}>Already have an account? Log in</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 24, backgroundColor: COLORS.bg },
  title: { fontSize: 24, fontWeight: "800", textAlign: "center", marginBottom: 24, color: COLORS.ink },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginBottom: 12,
    fontSize: 16, backgroundColor: COLORS.surface, color: COLORS.ink,
  },
  agreeRow: { flexDirection: "row", alignItems: "flex-start", marginTop: 4, marginBottom: 8, paddingRight: 8 },
  checkbox: {
    width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: "center", justifyContent: "center", marginRight: 10, marginTop: 1, backgroundColor: COLORS.surface,
  },
  checkboxChecked: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  agreeText: { flex: 1, fontSize: 13, color: COLORS.sub, lineHeight: 18 },
  agreeLink: { color: COLORS.ink, fontWeight: "700" },
  button: { backgroundColor: COLORS.accent, borderRadius: 26, padding: 15, alignItems: "center", marginTop: 8 },
  buttonDisabled: { backgroundColor: "#BCC0C4" },
  buttonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
  link: { color: COLORS.ink, textAlign: "center", marginTop: 16, fontWeight: "600" },
});
