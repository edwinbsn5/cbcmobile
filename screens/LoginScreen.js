import React, { useState } from "react";
import { View, Text, Image, TextInput, TouchableOpacity, StyleSheet, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme";

export default function LoginScreen({ navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState("amina@example.com");
  const [password, setPassword] = useState("password123");
  const [submitting, setSubmitting] = useState(false);

  async function handleLogin() {
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (e) {
      Alert.alert("Login failed", e.response?.data?.error || e.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar style="light" />
      <View style={styles.heroBand}>
        <Image source={require("../assets/icon.png")} style={styles.logo} />
      </View>

      <View style={styles.body}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={COLORS.sub}
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor={COLORS.sub}
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />
        <TouchableOpacity onPress={() => navigation.navigate("ForgotPassword")} style={styles.forgotLink}>
          <Text style={styles.forgotLinkText}>Forgot password?</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={submitting}>
          <Text style={styles.buttonText}>{submitting ? "Logging in..." : "Log In"}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate("Register")}>
          <Text style={styles.link}>Don't have an account? Sign up</Text>
        </TouchableOpacity>
        <Text style={styles.hint}>Seed accounts: amina@example.com / brian@example.com (password123)</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  heroBand: {
    backgroundColor: COLORS.accentInk, paddingVertical: 36, alignItems: "center",
    borderBottomLeftRadius: 32, borderBottomRightRadius: 32,
  },
  logo: { width: 56, height: 56, borderRadius: 14 },
  body: { flex: 1, padding: 24, justifyContent: "center" },
  input: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, marginBottom: 12,
    fontSize: 16, backgroundColor: COLORS.surface, color: COLORS.ink,
  },
  forgotLink: { alignSelf: "flex-end", marginBottom: 4 },
  forgotLinkText: { color: COLORS.ink, fontSize: 13, fontWeight: "700" },
  button: { backgroundColor: COLORS.accent, borderRadius: 26, padding: 15, alignItems: "center", marginTop: 8 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
  link: { color: COLORS.ink, textAlign: "center", marginTop: 16, fontWeight: "600" },
  hint: { color: "#999", textAlign: "center", marginTop: 24, fontSize: 12 },
});
