import React, { useCallback, useState } from "react";
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";
import client from "../api/client";
import { COLORS } from "../theme";

const STATUS_LABEL = { pending: "Pending review", approved: "Live", rejected: "Not approved", sold: "Sold" };
const STATUS_BADGE = { pending: "pending", approved: "completed", rejected: "failed", sold: "failed" };

export default function MyMarketProductsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    client.get("/market/products/mine").then((r) => setProducts(r.data))
      .catch((e) => Alert.alert("Couldn't load your listings", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleMarkSold(product) {
    Alert.alert("Mark as sold?", `"${product.title}" will no longer appear in Browse.`, [
      { text: "Cancel", style: "cancel" },
      { text: "Mark as sold", onPress: async () => {
          try {
            await client.post(`/market/products/${product.id}/mark-sold`);
            load();
          } catch (e) {
            Alert.alert("Couldn't update listing", e.response?.data?.error || e.message);
          }
        } },
    ]);
  }

  function handleDelete(product) {
    Alert.alert("Delete listing?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
          try {
            await client.delete(`/market/products/${product.id}`);
            load();
          } catch (e) {
            Alert.alert("Couldn't delete listing", e.response?.data?.error || e.message);
          }
        } },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={products}
      keyExtractor={(p) => p.id}
      ListEmptyComponent={<Text style={styles.empty}>You haven't listed anything yet</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          {item.mediaType === "video" ? (
            <Video source={{ uri: item.mediaUrl }} style={styles.thumb} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
          ) : (
            <Image source={{ uri: item.photoUrls[0] }} style={styles.thumb} resizeMode="cover" />
          )}
          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.badge]}>
                <Text style={styles.badgeText}>{STATUS_LABEL[item.status]}</Text>
              </View>
            </View>
            <Text style={styles.price}>KES {item.priceKES.toLocaleString()}</Text>
            <Text style={styles.meta}>{item.likeCount} likes · {item.saveCount} saves</Text>
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate("EditMarketProduct", { product: item })}>
                <Text style={styles.actionText}>Edit</Text>
              </TouchableOpacity>
              {item.status !== "sold" && (
                <TouchableOpacity style={styles.actionButton} onPress={() => handleMarkSold(item)}>
                  <Text style={styles.actionText}>Mark as Sold</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={() => handleDelete(item)}>
                <Text style={[styles.actionText, styles.deleteText]}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: { flexDirection: "row", backgroundColor: COLORS.surface, margin: 10, borderRadius: 10, overflow: "hidden" },
  thumb: { width: 90, height: 110, backgroundColor: "#eee" },
  body: { flex: 1, padding: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  title: { flex: 1, fontSize: 14.5, fontWeight: "700", color: COLORS.ink },
  badge: { backgroundColor: COLORS.wash, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: "700", color: COLORS.accent },
  price: { fontSize: 13, fontWeight: "700", color: COLORS.ink, marginTop: 4 },
  meta: { fontSize: 11, color: COLORS.sub, marginTop: 2 },
  actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  actionButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingVertical: 5, paddingHorizontal: 10 },
  actionText: { fontWeight: "600", fontSize: 11.5, color: COLORS.ink },
  deleteButton: { borderColor: "#D32F2F" },
  deleteText: { color: "#D32F2F" },
});
