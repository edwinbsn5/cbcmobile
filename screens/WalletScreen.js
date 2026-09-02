import React, { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, FlatList, StyleSheet, ActivityIndicator, Alert, Modal, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationContext";
import PinInput from "../components/PinInput";
import { MIN_WITHDRAWAL_KES, computeWithdrawalBreakdown } from "../utils/walletFees";
import { COLORS } from "../theme";

function formatKES(amount) {
  return `KES ${amount.toLocaleString()}`;
}

// Every wallet_transactions.type value actually produced across the backend
// (routes/wallet.js, boosts.js, groupBoosts.js, groups.js, spin.js,
// starContests.js) gets a real label + icon + tint here.
const TX_META = {
  deposit: { label: "M-Pesa top-up", icon: "phone-portrait-outline", tint: COLORS.accent, positive: true },
  withdrawal: { label: "M-Pesa withdrawal", icon: "arrow-up-circle-outline", tint: "#D32F2F", positive: false },
  subscription_payment: { label: "Group subscription", icon: "people-outline", tint: "#1E88E5", positive: false },
  subscription_earning: { label: "Subscription earning", icon: "people-outline", tint: "#2E7D32", positive: true },
  post_boost: { label: "Post boost", icon: "megaphone-outline", tint: "#D81B60", positive: false },
  group_boost: { label: "Group boost", icon: "trending-up-outline", tint: "#D81B60", positive: false },
  spin_win: { label: "Tap & Win prize", icon: "game-controller-outline", tint: "#8A6D00", positive: true },
  star_contest_win: { label: "Be the STAR win", icon: "star-outline", tint: "#8A6D00", positive: true },
};
function txMeta(type) {
  return TX_META[type] || { label: type, icon: "swap-horizontal-outline", tint: COLORS.sub, positive: undefined };
}

export default function WalletScreen({ navigation }) {
  const { user, updateWalletBalance } = useAuth();
  const { lastNotification } = useNotifications();
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAllActivity, setShowAllActivity] = useState(false);

  const [depositVisible, setDepositVisible] = useState(false);
  const [depositPhone, setDepositPhone] = useState("2547");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositSubmitting, setDepositSubmitting] = useState(false);

  const [withdrawVisible, setWithdrawVisible] = useState(false);
  const [withdrawPhone, setWithdrawPhone] = useState("2547");
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPin, setWithdrawPin] = useState("");
  const [withdrawSubmitting, setWithdrawSubmitting] = useState(false);

  async function load() {
    const { data } = await client.get("/wallet");
    setBalance(data.balance);
    setTransactions(data.transactions);
    updateWalletBalance(data.balance);
  }

  useEffect(() => {
    load()
      .catch((e) => Alert.alert("Couldn't load wallet", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  // The backend credits/debits the wallet and emits this socket notification
  // the instant M-Pesa confirms (deposit) or a payout resolves (withdrawal) —
  // reacting to it here reflects the new balance immediately, instead of
  // waiting for the user to reopen the app or the screen to remount.
  useEffect(() => {
    if (lastNotification?.type === "wallet") load();
  }, [lastNotification]);

  function openWithdraw() {
    if (!user?.hasWalletPin) {
      Alert.alert(
        "Set up a withdrawal PIN",
        "For your security, you need to set a 4-digit withdrawal PIN before you can withdraw.",
        [
          { text: "Not now", style: "cancel" },
          { text: "Set up PIN", onPress: () => navigation.navigate("WalletSettings") },
        ]
      );
      return;
    }
    setWithdrawVisible(true);
  }

  async function handleDeposit() {
    if (!/^2547\d{8}$/.test(depositPhone)) return Alert.alert("Invalid phone", "Use format 2547XXXXXXXX");
    const amt = parseInt(depositAmount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount in KES");

    setDepositSubmitting(true);
    try {
      const { data } = await client.post("/wallet/topup", { phone: depositPhone, amount: amt });
      setDepositVisible(false);
      setDepositAmount("");
      Alert.alert("Check your phone", data.message);
      setTimeout(load, 3000);
    } catch (e) {
      Alert.alert("Deposit failed", e.response?.data?.error || e.message);
    } finally {
      setDepositSubmitting(false);
    }
  }

  const withdrawAmt = parseInt(withdrawAmount, 10) || 0;
  const breakdown = withdrawAmt >= MIN_WITHDRAWAL_KES ? computeWithdrawalBreakdown(withdrawAmt) : null;

  async function handleWithdraw() {
    if (!/^2547\d{8}$/.test(withdrawPhone)) return Alert.alert("Invalid phone", "Use format 2547XXXXXXXX");
    if (withdrawAmt < MIN_WITHDRAWAL_KES) return Alert.alert("Amount too low", `Minimum withdrawal is ${formatKES(MIN_WITHDRAWAL_KES)}`);
    if (withdrawAmt > balance) return Alert.alert("Insufficient balance", `Your balance is ${formatKES(balance)}`);
    if (withdrawPin.length !== 4) return Alert.alert("Enter your PIN", "Your 4-digit withdrawal PIN is required");

    setWithdrawSubmitting(true);
    try {
      const { data } = await client.post("/wallet/withdraw", { phone: withdrawPhone, amount: withdrawAmt, pin: withdrawPin });
      setWithdrawVisible(false);
      setWithdrawAmount("");
      setWithdrawPin("");
      Alert.alert(
        "Withdrawal requested",
        `${data.message}\n\nYou'll receive ${formatKES(data.breakdown.netPayout)} after a KES ${data.breakdown.serviceFee} service fee and KES ${data.breakdown.tax} tax.`
      );
      setTimeout(load, 3000);
    } catch (e) {
      Alert.alert("Withdrawal failed", e.response?.data?.error || e.message);
    } finally {
      setWithdrawSubmitting(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const visibleTransactions = showAllActivity ? transactions : transactions.slice(0, 5);

  return (
    <View style={styles.container}>
      <FlatList
        data={visibleTransactions}
        keyExtractor={(t) => t.id}
        ListHeaderComponent={
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>Available balance</Text>
              <Text style={styles.cardAmount}>{formatKES(balance)}</Text>
              <View style={styles.cardFoot}>
                <Text style={styles.cardName} numberOfLines={1}>{user?.name}</Text>
                <Text style={styles.cardName}>•••• wallet</Text>
              </View>
            </View>

            <View style={styles.circles}>
              <TouchableOpacity style={styles.circleWrap} onPress={() => setDepositVisible(true)}>
                <View style={styles.circle}><Ionicons name="arrow-down" size={20} color={COLORS.accent} /></View>
                <Text style={styles.circleLabel}>Deposit</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.circleWrap} onPress={openWithdraw}>
                <View style={styles.circle}><Ionicons name="arrow-up" size={20} color={COLORS.accent} /></View>
                <Text style={styles.circleLabel}>Withdraw</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.circleWrap} onPress={() => navigation.navigate("WalletSettings")}>
                <View style={styles.circle}><Ionicons name="settings-outline" size={20} color={COLORS.accent} /></View>
                <Text style={styles.circleLabel}>Settings</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionTitle}>Recent activities</Text>
          </>
        }
        renderItem={({ item }) => {
          const meta = txMeta(item.type);
          const positive = meta.positive !== undefined ? meta.positive : item.amount >= 0;
          return (
            <View style={styles.txRow}>
              <View style={[styles.txIcon, { backgroundColor: meta.tint + "22" }]}>
                <Ionicons name={meta.icon} size={16} color={meta.tint} />
              </View>
              <View style={styles.txBody}>
                <Text style={styles.txLabel}>{meta.label}</Text>
                <Text style={styles.txDate}>{new Date(item.createdAt).toLocaleString()}</Text>
                {item.status === "failed" && <Text style={styles.txFailed}>Failed: {item.failReason}</Text>}
                {item.status === "pending_approval" && <Text style={styles.txPending}>Pending admin approval</Text>}
                {item.status === "pending" && item.type === "withdrawal" && <Text style={styles.txPending}>Processing with M-Pesa...</Text>}
              </View>
              <Text style={[styles.txAmount, positive ? styles.txPositive : styles.txNegative]}>
                {positive ? "+" : "-"}{formatKES(Math.abs(item.amount))}
              </Text>
            </View>
          );
        }}
        ListFooterComponent={
          transactions.length > 5 ? (
            <TouchableOpacity onPress={() => setShowAllActivity((v) => !v)}>
              <Text style={styles.viewAll}>{showAllActivity ? "Show less" : "View all activity"}</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={<Text style={styles.empty}>No transactions yet</Text>}
      />

      {/* Deposit bottom sheet */}
      <Modal visible={depositVisible} transparent animationType="slide" onRequestClose={() => setDepositVisible(false)}>
        <KeyboardAvoidingView style={styles.kbAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableWithoutFeedback onPress={() => setDepositVisible(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Deposit via M-Pesa</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone (2547XXXXXXXX)"
            keyboardType="number-pad"
            value={depositPhone}
            onChangeText={setDepositPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="Amount (KES)"
            keyboardType="number-pad"
            value={depositAmount}
            onChangeText={setDepositAmount}
          />
          <TouchableOpacity style={styles.sheetBtn} onPress={handleDeposit} disabled={depositSubmitting}>
            <Text style={styles.sheetBtnText}>{depositSubmitting ? "Sending prompt..." : "Deposit"}</Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Withdraw bottom sheet */}
      <Modal visible={withdrawVisible} transparent animationType="slide" onRequestClose={() => setWithdrawVisible(false)}>
        <KeyboardAvoidingView style={styles.kbAvoid} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <TouchableWithoutFeedback onPress={() => setWithdrawVisible(false)}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Withdraw to M-Pesa</Text>
          <TextInput
            style={styles.input}
            placeholder="Phone (2547XXXXXXXX)"
            keyboardType="number-pad"
            value={withdrawPhone}
            onChangeText={setWithdrawPhone}
          />
          <TextInput
            style={styles.input}
            placeholder="Amount (KES)"
            keyboardType="number-pad"
            value={withdrawAmount}
            onChangeText={setWithdrawAmount}
          />
          <Text style={styles.feeNote}>
            Minimum withdrawal {formatKES(MIN_WITHDRAWAL_KES)}. A KES 100 service fee and 3% tax are
            deducted from every withdrawal.
          </Text>
          {breakdown && (
            <View style={styles.breakdownBox}>
              <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Service fee</Text><Text style={styles.breakdownValue}>-{formatKES(breakdown.serviceFee)}</Text></View>
              <View style={styles.breakdownRow}><Text style={styles.breakdownLabel}>Tax (3%)</Text><Text style={styles.breakdownValue}>-{formatKES(breakdown.tax)}</Text></View>
              <View style={[styles.breakdownRow, styles.breakdownNetRow]}><Text style={styles.breakdownNetLabel}>You'll receive</Text><Text style={styles.breakdownNetValue}>{formatKES(breakdown.netPayout)}</Text></View>
            </View>
          )}
          <Text style={styles.pinLabel}>Enter your withdrawal PIN</Text>
          <PinInput value={withdrawPin} onChange={setWithdrawPin} />
          <TouchableOpacity style={[styles.sheetBtn, { marginTop: 16 }]} onPress={handleWithdraw} disabled={withdrawSubmitting}>
            <Text style={styles.sheetBtnText}>{withdrawSubmitting ? "Requesting..." : "Withdraw"}</Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.accent, margin: 14, borderRadius: 16, padding: 20, minHeight: 130, justifyContent: "space-between" },
  cardLabel: { color: "rgba(11,31,58,0.75)", fontSize: 12, letterSpacing: 0.5, textTransform: "uppercase" },
  cardAmount: { color: COLORS.accentInk, fontSize: 30, fontWeight: "800", marginTop: 6 },
  cardFoot: { flexDirection: "row", justifyContent: "space-between", marginTop: 18 },
  cardName: { color: "rgba(11,31,58,0.8)", fontSize: 12, maxWidth: "60%" },
  circles: { flexDirection: "row", justifyContent: "center", gap: 32, marginTop: 4, marginBottom: 18 },
  circleWrap: { alignItems: "center", gap: 6 },
  circle: { width: 52, height: 52, borderRadius: 26, backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", elevation: 2, shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  circleLabel: { fontSize: 12, fontWeight: "700", color: COLORS.ink },
  sectionTitle: { color: COLORS.ink, fontWeight: "700", fontSize: 15, marginHorizontal: 14, marginBottom: 8 },
  txRow: { backgroundColor: COLORS.surface, flexDirection: "row", alignItems: "center", gap: 10, padding: 14, marginHorizontal: 14, marginBottom: 8, borderRadius: 10 },
  txIcon: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  txBody: { flex: 1 },
  txLabel: { color: COLORS.ink, fontWeight: "600" },
  txDate: { color: COLORS.sub, fontSize: 12, marginTop: 2 },
  txFailed: { color: "#D32F2F", fontSize: 12, marginTop: 2 },
  txPending: { color: "#8A6D00", fontSize: 12, marginTop: 2 },
  txAmount: { fontWeight: "700", fontSize: 15 },
  txPositive: { color: "#2E7D32" },
  txNegative: { color: "#D32F2F" },
  viewAll: { textAlign: "center", color: COLORS.accent, fontWeight: "800", fontSize: 13, marginVertical: 12 },
  empty: { textAlign: "center", color: "#999", marginTop: 20 },
  kbAvoid: { flex: 1 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 16, marginBottom: 12 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 10, color: COLORS.ink },
  sheetBtn: { backgroundColor: COLORS.accent, borderRadius: 8, padding: 13, alignItems: "center" },
  sheetBtnText: { color: COLORS.accentInk, fontWeight: "700" },
  feeNote: { color: COLORS.sub, fontSize: 12, lineHeight: 17, marginBottom: 10 },
  breakdownBox: { backgroundColor: COLORS.bg, borderRadius: 10, padding: 12, marginBottom: 14 },
  breakdownRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  breakdownLabel: { color: COLORS.sub, fontSize: 12.5 },
  breakdownValue: { color: COLORS.ink, fontSize: 12.5, fontWeight: "600" },
  breakdownNetRow: { marginTop: 4, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border, marginBottom: 0 },
  breakdownNetLabel: { color: COLORS.ink, fontSize: 13.5, fontWeight: "800" },
  breakdownNetValue: { color: COLORS.accent, fontSize: 13.5, fontWeight: "800" },
  pinLabel: { fontSize: 13, fontWeight: "700", color: COLORS.ink, marginBottom: 8 },
});
