import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

export default function SavedMarketProductsScreen({ navigation }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    client.get("/market/products/saved").then((r) => setProducts(r.data))
      .catch((e) => Alert.alert("Couldn't load saved products", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={products}
      keyExtractor={(p) => p.id}
      numColumns={2}
      columnWrapperStyle={{ gap: 10, paddingHorizontal: 10 }}
      contentContainerStyle={{ paddingVertical: 10, gap: 10 }}
      ListEmptyComponent={<Text style={styles.empty}>No saved products yet — swipe right or double-tap a video to save one</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("MarketProductDetail", { productId: item.id })}>
          {item.mediaType === "video" ? (
            <Video source={{ uri: item.mediaUrl }} style={styles.thumb} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
          ) : (
            <Image source={{ uri: item.photoUrls[0] }} style={styles.thumb} contentFit="cover" />
          )}
          {item.mediaType === "video" && (
            <View style={styles.playBadge}><Ionicons name="play" size={16} color="#fff" /></View>
          )}
          {item.status === "sold" && (
            <View style={styles.soldBadge}><Text style={styles.soldBadgeText}>SOLD</Text></View>
          )}
          <View style={styles.body}>
            <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
            <Text style={styles.price}>KES {item.priceKES.toLocaleString()}</Text>
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  empty: { textAlign: "center", color: "#999", marginTop: 40, marginHorizontal: 24, lineHeight: 20 },
  card: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 10, overflow: "hidden" },
  thumb: { width: "100%", height: 140, backgroundColor: "#eee" },
  playBadge: {
    position: "absolute", top: 56, left: 0, right: 0, alignItems: "center", justifyContent: "center",
  },
  soldBadge: { position: "absolute", top: 8, right: 8, backgroundColor: "rgba(0,0,0,0.7)", borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  soldBadgeText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  body: { padding: 8 },
  title: { fontSize: 12.5, fontWeight: "700", color: COLORS.ink },
  price: { fontSize: 12, fontWeight: "700", color: COLORS.accent, marginTop: 2 },
});
