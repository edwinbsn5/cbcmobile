import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, Modal, StyleSheet, TouchableWithoutFeedback, Alert, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

function formatKES(n) {
  return `KES ${Math.round(n || 0).toLocaleString()}`;
}

// Chama access and Projects & Investments access are independent purchases
// — this modal always operates on exactly one `feature` ("chama" |
// "project"), matching the backend's own per-feature paywall
// (services/featureAccess.js). Paid straight out of wallet balance, same as
// boosts elsewhere in the app.
export default function FeatureAccessModal({ visible, onClose, feature, featureLabel, onPurchased }) {
  const navigation = useNavigation();
  const [status, setStatus] = useState(null);
  const [purchasing, setPurchasing] = useState(null);

  useEffect(() => {
    if (!visible) return;
    setStatus(null);
    client.get("/access/status").then((r) => setStatus(r.data)).catch(() => setStatus({ tiers: [], access: {} }));
  }, [visible, feature]);

  async function purchase(tierKey) {
    if (tierKey === "free") return claimFree();
    setPurchasing(tierKey);
    try {
      const { data } = await client.post("/access/purchase", { feature, tier: tierKey });
      Alert.alert("Access unlocked", `Your ${featureLabel} access is now active.`);
      onPurchased?.(data.pass);
      onClose();
    } catch (e) {
      if (e.response?.status === 402 && e.response?.data?.shortfall !== undefined) {
        Alert.alert(
          "Insufficient wallet balance",
          `You need ${formatKES(e.response.data.shortfall)} more in your wallet to buy this.`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Top up wallet", onPress: () => { onClose(); navigation.navigate("Wallet"); } },
          ]
        );
      } else {
        Alert.alert("Couldn't purchase", e.response?.data?.error || e.message);
      }
    } finally {
      setPurchasing(null);
    }
  }

  // Free is claimed, not bought — no wallet involved, and it's rate-limited
  // to once every 30 days server-side (services/featureAccess.js's
  // freeAccessAvailable), which the tier row below already reflects by
  // disabling the button until it's available again.
  async function claimFree() {
    setPurchasing("free");
    try {
      const { data } = await client.post("/access/claim-free", { feature });
      Alert.alert("Free access claimed!", `Your ${featureLabel} access is active for the next 2 days.`);
      onPurchased?.(data.pass);
      onClose();
    } catch (e) {
      if (e.response?.status === 429 && e.response?.data?.availableAt) {
        Alert.alert("Not available yet", `Your free access will be available again on ${new Date(e.response.data.availableAt).toLocaleDateString()}.`);
      } else {
        Alert.alert("Couldn't claim", e.response?.data?.error || e.message);
      }
    } finally {
      setPurchasing(null);
    }
  }

  const activePass = status?.access?.[feature];
  const freeAvailable = status?.freeAccess?.[feature];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}><View style={styles.backdrop} /></TouchableWithoutFeedback>
      <View style={styles.sheet}>
        <View style={styles.sheetHandle} />
        <Text style={styles.sheetTitle}>{featureLabel} access</Text>

        {!status ? (
          <ActivityIndicator color={COLORS.accent} style={{ marginVertical: 20 }} />
        ) : (
          <>
            {activePass ? (
              <View style={styles.activeBanner}>
                <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                <Text style={styles.activeBannerText}>
                  Active until {new Date(activePass.expiresAt).toLocaleDateString()} — buying another tier extends this.
                </Text>
              </View>
            ) : (
              <Text style={styles.tabHint}>You need an active pass to use {featureLabel}. Pick a tier below.</Text>
            )}

            {status.tiers.map((tier) => {
              const isFree = tier.key === "free";
              const locked = isFree && !freeAvailable;
              return (
                <View key={tier.key} style={styles.tierCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tierName}>{tier.label}</Text>
                    <Text style={styles.tierMeta}>
                      {isFree ? "Free" : formatKES(tier.priceKES)} — {tier.durationLabel} access
                    </Text>
                    {locked && <Text style={styles.tierLockedHint}>Used recently — available again 30 days after your last free claim</Text>}
                  </View>
                  <TouchableOpacity
                    style={[styles.tierButton, locked && styles.tierButtonLocked]}
                    onPress={() => purchase(tier.key)}
                    disabled={!!purchasing || locked}
                  >
                    {purchasing === tier.key ? (
                      <ActivityIndicator size="small" color={COLORS.accentInk} />
                    ) : (
                      <Text style={styles.tierButtonText}>{isFree ? "Claim" : activePass ? "Extend" : "Buy"}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: COLORS.surface, borderTopLeftRadius: 18, borderTopRightRadius: 18, padding: 18, paddingBottom: 28 },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: COLORS.border, alignSelf: "center", marginBottom: 14 },
  sheetTitle: { color: COLORS.ink, fontWeight: "800", fontSize: 16, marginBottom: 10 },
  tabHint: { color: COLORS.sub, fontSize: 12.5, marginBottom: 14, lineHeight: 18 },
  activeBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#E8F5E9", borderRadius: 8, padding: 10, marginBottom: 14 },
  activeBannerText: { color: "#2E7D32", fontSize: 12, flex: 1 },
  tierCard: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.wash, borderRadius: 10, padding: 12, marginBottom: 10 },
  tierName: { color: COLORS.ink, fontWeight: "800", fontSize: 14.5 },
  tierMeta: { color: COLORS.sub, fontSize: 12, marginTop: 2 },
  tierLockedHint: { color: COLORS.sub, fontSize: 10.5, marginTop: 4, fontStyle: "italic", lineHeight: 14 },
  tierButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 10, minWidth: 64, alignItems: "center" },
  tierButtonLocked: { backgroundColor: "#BCC0C4" },
  tierButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 12.5 },
});
