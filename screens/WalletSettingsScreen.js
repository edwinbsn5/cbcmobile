import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Alert, ActivityIndicator } from "react-native";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import PinInput from "../components/PinInput";
import { COLORS } from "../theme";

export default function WalletSettingsScreen() {
  const { user, updateUser } = useAuth();

  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [settingPin, setSettingPin] = useState(false);

  const [currentPin, setCurrentPin] = useState("");
  const [changeNewPin, setChangeNewPin] = useState("");
  const [changeConfirmPin, setChangeConfirmPin] = useState("");
  const [changingPin, setChangingPin] = useState(false);

  const [forgotRequested, setForgotRequested] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [resetCode, setResetCode] = useState("");
  const [resetNewPin, setResetNewPin] = useState("");
  const [resetConfirmPin, setResetConfirmPin] = useState("");
  const [resetting, setResetting] = useState(false);

  async function handleSetPin() {
    if (newPin.length !== 4) return Alert.alert("Enter a PIN", "Your PIN must be exactly 4 digits");
    if (newPin !== confirmPin) return Alert.alert("PINs don't match", "Re-enter your new PIN to confirm");
    setSettingPin(true);
    try {
      await client.post("/wallet/pin", { pin: newPin });
      await updateUser({ ...user, hasWalletPin: true });
      setNewPin("");
      setConfirmPin("");
      Alert.alert("PIN set", "Your withdrawal PIN has been set");
    } catch (e) {
      Alert.alert("Couldn't set PIN", e.response?.data?.error || e.message);
    } finally {
      setSettingPin(false);
    }
  }

  async function handleChangePin() {
    if (currentPin.length !== 4) return Alert.alert("Enter your current PIN", "Your current PIN is 4 digits");
    if (changeNewPin.length !== 4) return Alert.alert("Enter a new PIN", "Your new PIN must be exactly 4 digits");
    if (changeNewPin !== changeConfirmPin) return Alert.alert("PINs don't match", "Re-enter your new PIN to confirm");
    setChangingPin(true);
    try {
      await client.post("/wallet/pin/change", { currentPin, newPin: changeNewPin });
      setCurrentPin("");
      setChangeNewPin("");
      setChangeConfirmPin("");
      Alert.alert("PIN updated", "Your withdrawal PIN has been changed");
    } catch (e) {
      Alert.alert("Couldn't change PIN", e.response?.data?.error || e.message);
    } finally {
      setChangingPin(false);
    }
  }

  async function handleRequestReset() {
    setRequestingCode(true);
    try {
      const { data } = await client.post("/wallet/pin/forgot");
      setForgotRequested(true);
      Alert.alert("Check your email", data.message);
    } catch (e) {
      Alert.alert("Couldn't send code", e.response?.data?.error || e.message);
    } finally {
      setRequestingCode(false);
    }
  }

  async function handleResetPin() {
    if (!resetCode.trim()) return Alert.alert("Enter the code", "Enter the 6-digit code we emailed you");
    if (resetNewPin.length !== 4) return Alert.alert("Enter a new PIN", "Your new PIN must be exactly 4 digits");
    if (resetNewPin !== resetConfirmPin) return Alert.alert("PINs don't match", "Re-enter your new PIN to confirm");
    setResetting(true);
    try {
      await client.post("/wallet/pin/reset", { code: resetCode.trim(), newPin: resetNewPin });
      await updateUser({ ...user, hasWalletPin: true });
      setForgotRequested(false);
      setResetCode("");
      setResetNewPin("");
      setResetConfirmPin("");
      Alert.alert("PIN reset", "Your withdrawal PIN has been reset");
    } catch (e) {
      Alert.alert("Couldn't reset PIN", e.response?.data?.error || e.message);
    } finally {
      setResetting(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.sectionTitle}>Withdrawal PIN</Text>
      <Text style={styles.hint}>This 4-digit PIN protects withdrawals from your wallet — you'll enter it every time you withdraw.</Text>

      {!user?.hasWalletPin ? (
        <View style={styles.card}>
          <Text style={styles.label}>Choose a 4-digit PIN</Text>
          <PinInput value={newPin} onChange={setNewPin} />
          <Text style={[styles.label, { marginTop: 16 }]}>Confirm PIN</Text>
          <PinInput value={confirmPin} onChange={setConfirmPin} />
          <TouchableOpacity style={styles.button} onPress={handleSetPin} disabled={settingPin}>
            {settingPin ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Set PIN</Text>}
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Change PIN</Text>
            <Text style={styles.label}>Current PIN</Text>
            <PinInput value={currentPin} onChange={setCurrentPin} />
            <Text style={[styles.label, { marginTop: 16 }]}>New PIN</Text>
            <PinInput value={changeNewPin} onChange={setChangeNewPin} />
            <Text style={[styles.label, { marginTop: 16 }]}>Confirm new PIN</Text>
            <PinInput value={changeConfirmPin} onChange={setChangeConfirmPin} />
            <TouchableOpacity style={styles.button} onPress={handleChangePin} disabled={changingPin}>
              {changingPin ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Update PIN</Text>}
            </TouchableOpacity>
          </View>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Forgot your PIN?</Text>
            {!forgotRequested ? (
              <>
                <Text style={styles.hint}>We'll email a reset code to {user?.email}.</Text>
                <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={handleRequestReset} disabled={requestingCode}>
                  {requestingCode ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Email me a reset code</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.label}>6-digit code</Text>
                <TextInputCode value={resetCode} onChangeText={setResetCode} />
                <Text style={[styles.label, { marginTop: 12 }]}>New PIN</Text>
                <PinInput value={resetNewPin} onChange={setResetNewPin} />
                <Text style={[styles.label, { marginTop: 16 }]}>Confirm new PIN</Text>
                <PinInput value={resetConfirmPin} onChange={setResetConfirmPin} />
                <TouchableOpacity style={styles.button} onPress={handleResetPin} disabled={resetting}>
                  {resetting ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.buttonText}>Reset PIN</Text>}
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRequestReset} disabled={requestingCode}>
                  <Text style={styles.resend}>Resend code</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

// A plain 6-digit code field — no boxes needed, this is typed from an email
// rather than memorized like a PIN.
function TextInputCode({ value, onChangeText }) {
  return (
    <TextInput
      style={styles.input}
      placeholder="123456"
      keyboardType="number-pad"
      maxLength={6}
      value={value}
      onChangeText={(t) => onChangeText(t.replace(/[^0-9]/g, ""))}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  sectionTitle: { fontWeight: "700", fontSize: 15, marginBottom: 4 },
  cardTitle: { fontWeight: "700", fontSize: 15, marginBottom: 10 },
  hint: { fontSize: 12.5, color: COLORS.sub, marginBottom: 16, lineHeight: 18 },
  card: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 16, marginBottom: 20 },
  label: { fontSize: 13, color: COLORS.sub, marginBottom: 8 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, color: COLORS.ink },
  button: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 12, alignItems: "center", marginTop: 18 },
  buttonText: { color: COLORS.accentInk, fontWeight: "700" },
  resend: { color: COLORS.accent, fontWeight: "700", textAlign: "center", marginTop: 12, fontSize: 13 },
});
