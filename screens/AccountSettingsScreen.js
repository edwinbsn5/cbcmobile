import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNavigation } from "@react-navigation/native";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

export default function AccountSettingsScreen() {
  const { user, updateUser, updateToken, logout } = useAuth();
  const navigation = useNavigation();

  const [name, setName] = useState(user?.name || "");
  const [username, setUsername] = useState(user?.username || "");
  const [tiktokHandle, setTiktokHandle] = useState(user?.tiktokHandle || "");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function handleSaveProfile() {
    if (!name.trim()) return Alert.alert("Name required", "Name cannot be empty");
    const trimmedUsername = username.trim();
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(trimmedUsername)) {
      return Alert.alert("Invalid username", "Username must be 3-20 characters: letters, numbers, underscore only");
    }
    setSavingProfile(true);
    try {
      const { data } = await client.patch("/auth/me", { name, username: trimmedUsername, tiktokHandle: tiktokHandle.trim() });
      await updateUser(data.user);
      Alert.alert("Saved", "Your profile has been updated");
    } catch (e) {
      Alert.alert("Update failed", e.response?.data?.error || e.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword || !newPassword) return Alert.alert("Missing fields", "Enter your current and new password");
    setChangingPassword(true);
    try {
      const { data } = await client.post("/auth/change-password", { currentPassword, newPassword });
      await updateToken(data.token);
      setCurrentPassword("");
      setNewPassword("");
      Alert.alert("Password updated", "Your other devices have been signed out — you'll need the new password there.");
    } catch (e) {
      Alert.alert("Change failed", e.response?.data?.error || e.message);
    } finally {
      setChangingPassword(false);
    }
  }

  function confirmDeleteAccount() {
    if (!deletePassword) return Alert.alert("Password required", "Enter your password above to confirm deletion");
    Alert.alert(
      "Delete account",
      "This can't be undone. Are you sure you want to permanently delete your account?",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: handleDeleteAccount },
      ]
    );
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await client.delete("/auth/me", { data: { password: deletePassword } });
      Alert.alert("Account deleted", "Sorry to see you go.");
      logout();
    } catch (e) {
      Alert.alert("Deletion failed", e.response?.data?.error || e.message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.sectionTitle}>Profile</Text>
      <View style={styles.card}>
        <TouchableOpacity
          style={styles.avatarRow}
          onPress={() => navigation.navigate("AvatarViewer", { userId: user?.id, name: user?.name, avatarUrl: user?.avatar })}
        >
          <Avatar uri={user?.avatar} name={user?.name} style={styles.avatarPreview} />
          <Text style={styles.avatarRowText}>Tap to change profile picture</Text>
        </TouchableOpacity>

        <Text style={styles.label}>Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Your name" />
        <Text style={styles.label}>Username</Text>
        <TextInput style={styles.input} value={username} onChangeText={setUsername} placeholder="Your username" autoCapitalize="none" />
        <Text style={styles.label}>TikTok handle (optional)</Text>
        <TextInput
          style={styles.input}
          value={tiktokHandle}
          onChangeText={setTiktokHandle}
          placeholder="yourtiktokhandle"
          autoCapitalize="none"
        />
        <Text style={styles.hint}>If we ever repost your video content, we'll credit this handle.</Text>
        <TouchableOpacity style={styles.button} onPress={handleSaveProfile} disabled={savingProfile}>
          {savingProfile ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Save profile</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Change password</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Current password</Text>
        <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry />
        <Text style={styles.label}>New password</Text>
        <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} secureTextEntry />
        <TouchableOpacity style={styles.button} onPress={handleChangePassword} disabled={changingPassword}>
          {changingPassword ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Update password</Text>}
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Danger zone</Text>
      <View style={styles.card}>
        <Text style={styles.dangerCopy}>Deleting your account removes your login and profile. This can't be undone.</Text>
        <Text style={styles.label}>Enter your password to confirm</Text>
        <TextInput style={styles.input} value={deletePassword} onChangeText={setDeletePassword} secureTextEntry />
        <TouchableOpacity style={[styles.dangerButton, { marginTop: 12 }]} onPress={confirmDeleteAccount} disabled={deleting}>
          {deleting ? <ActivityIndicator color="#D32F2F" /> : <Text style={styles.dangerButtonText}>Delete account</Text>}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  sectionTitle: { color: COLORS.ink, fontWeight: "700", fontSize: 15, marginBottom: 8, marginTop: 8 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 20 },
  avatarRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  avatarPreview: { width: 56, height: 56, borderRadius: 28, marginRight: 12 },
  avatarRowText: { color: COLORS.accent, fontWeight: "600", fontSize: 13 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 4, marginTop: 8 },
  hint: { fontSize: 11, color: COLORS.sub, marginTop: 4 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 16 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
  dangerCopy: { color: COLORS.sub, fontSize: 13, marginBottom: 12 },
  dangerButton: { borderWidth: 1, borderColor: "#D32F2F", borderRadius: 8, padding: 12, alignItems: "center" },
  dangerButtonText: { color: "#D32F2F", fontWeight: "700" },
});
