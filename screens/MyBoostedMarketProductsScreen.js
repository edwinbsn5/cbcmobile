import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import { COLORS } from "../theme";

function formatRemaining(endsAt) {
  const ms = endsAt - Date.now();
  if (ms <= 0) return "Expired";
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return `${days}d ${hours}h left`;
}

export default function MyBoostedMarketProductsScreen() {
  const [boosts, setBoosts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    client.get("/market-boosts/mine").then((r) => setBoosts(r.data))
      .catch((e) => Alert.alert("Couldn't load boosts", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handlePause(id) {
    try {
      await client.post(`/market-boosts/${id}/pause`);
      load();
    } catch (e) {
      Alert.alert("Couldn't pause", e.response?.data?.error || e.message);
    }
  }

  async function handleResume(id) {
    try {
      await client.post(`/market-boosts/${id}/resume`);
      load();
    } catch (e) {
      Alert.alert("Couldn't resume", e.response?.data?.error || e.message);
    }
  }

  function handleDelete(id) {
    Alert.alert("Delete boost", "Stop boosting this product? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await client.post(`/market-boosts/${id}/delete`);
            load();
          } catch (e) {
            Alert.alert("Couldn't delete", e.response?.data?.error || e.message);
          }
        } },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={boosts}
      keyExtractor={(b) => b.id}
      ListEmptyComponent={
        <Text style={styles.empty}>You haven't boosted any products yet. Boost a listing from MarketPlace to feature it in the browse feed.</Text>
      }
      renderItem={({ item }) => {
        const expired = item.endsAt <= Date.now();
        const targetingSummary = [item.targetCounty, item.targetSubCounty].filter(Boolean);
        const thumb = item.product?.thumbnailUrl || item.product?.photoUrls?.[0];

        return (
          <View style={styles.card}>
            <View style={styles.row}>
              {!!thumb && <Image source={{ uri: thumb }} style={styles.thumb} contentFit="cover" />}
              <View style={styles.info}>
                <Text style={styles.content} numberOfLines={2}>{item.product?.title || "(product deleted)"}</Text>
                {item.product?.priceKES != null && <Text style={styles.price}>KES {item.product.priceKES}</Text>}
                <Text style={styles.meta}>{targetingSummary.length ? targetingSummary.join(" · ") : "Targeting: Everyone"}</Text>
                <Text style={styles.status}>
                  {expired ? "Expired" : item.status === "paused" ? "Paused" : `Active · ${formatRemaining(item.endsAt)}`}
                </Text>
              </View>
            </View>
            <View style={styles.actionsRow}>
              {!expired && item.status === "active" && (
                <TouchableOpacity style={styles.actionButton} onPress={() => handlePause(item.id)}>
                  <Text style={styles.actionText}>Pause</Text>
                </TouchableOpacity>
              )}
              {!expired && item.status === "paused" && (
                <TouchableOpacity style={styles.actionButton} onPress={() => handleResume(item.id)}>
                  <Text style={styles.actionText}>Resume</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(item.id)}>
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  card: { backgroundColor: COLORS.surface, margin: 10, borderRadius: 10, padding: 14 },
  row: { flexDirection: "row", gap: 12 },
  thumb: { width: 56, height: 56, borderRadius: 8, backgroundColor: COLORS.wash },
  info: { flex: 1 },
  content: { color: COLORS.ink, fontSize: 15, fontWeight: "600" },
  price: { color: COLORS.accent, fontWeight: "700", fontSize: 13, marginTop: 2 },
  meta: { color: COLORS.sub, fontSize: 12, marginTop: 6 },
  status: { color: COLORS.accent, fontWeight: "700", fontSize: 12, marginTop: 6 },
  actionsRow: { flexDirection: "row", marginTop: 12 },
  actionButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingVertical: 6, paddingHorizontal: 14, marginRight: 8 },
  actionText: { fontWeight: "600", fontSize: 13, color: COLORS.ink },
  deleteButton: { borderColor: "#D32F2F" },
  deleteText: { color: "#D32F2F" },
  empty: { textAlign: "center", color: "#999", marginTop: 40, marginHorizontal: 24, lineHeight: 20 },
});
