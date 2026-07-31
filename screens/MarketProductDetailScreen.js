import React, { useCallback, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import PhotoCarousel from "../components/PhotoCarousel";
import Avatar from "../components/Avatar";
import { useAuth } from "../context/AuthContext";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

export default function MarketProductDetailScreen({ route, navigation }) {
  const { productId } = route.params;
  const { user } = useAuth();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const { isSaved, toggleSave, loadSaved } = useSaved();
  const [starting, setStarting] = useState(false);

  const load = useCallback(() => {
    client.get(`/market/products/${productId}`)
      .then((r) => setProduct(r.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
    loadSaved();
  }, [productId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleLike() {
    await client.post(`/market/products/${productId}/react`, { reaction: "like" });
    load();
  }

  async function handleInquire() {
    if (!product.seller?.id) return;
    setStarting(true);
    try {
      const { data } = await client.post("/inbox/start", {
        userId: product.seller.id, contextType: "market_product", contextProductId: product.id,
      });
      navigation.navigate("Chat", { conversationId: data.id, otherUser: data.otherUser });
    } catch (e) {
      Alert.alert("Couldn't start chat", e.response?.data?.error || e.message);
    } finally {
      setStarting(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  if (notFound || !product) {
    return (
      <View style={styles.notFound}>
        <Ionicons name="alert-circle-outline" size={40} color={COLORS.sub} />
        <Text style={styles.notFoundText}>This item is no longer available</Text>
        <Text style={styles.notFoundHint}>The seller may have removed it or marked it as sold out.</Text>
      </View>
    );
  }

  const myLiked = !!product.reactions?.[user?.id];
  const isOwn = product.seller?.id === user?.id;

  return (
    <ScrollView style={styles.container}>
      {product.mediaType === "video" ? (
        <Video source={{ uri: product.mediaUrl }} style={styles.media} useNativeControls resizeMode={ResizeMode.CONTAIN} />
      ) : product.photoUrls.length > 1 ? (
        <PhotoCarousel photos={product.photoUrls} />
      ) : (
        <Image source={{ uri: product.photoUrls[0] }} style={styles.media} resizeMode="cover" />
      )}

      <View style={styles.body}>
        {product.status === "sold" && (
          <View style={styles.soldBanner}><Text style={styles.soldBannerText}>This item has been marked as sold</Text></View>
        )}
        <Text style={styles.title}>{product.title}</Text>
        <Text style={styles.price}>KES {product.priceKES.toLocaleString()}</Text>

        <View style={styles.categoryRow}>
          {product.categories.map((c) => (
            <View key={c.id} style={styles.categoryPill}><Text style={styles.categoryPillText}>{c.name}</Text></View>
          ))}
        </View>

        {!!product.description && <Text style={styles.description}>{product.description}</Text>}

        <TouchableOpacity style={styles.sellerRow} onPress={() => product.seller?.id && navigation.navigate("UserProfile", { userId: product.seller.id })}>
          <Avatar uri={product.seller?.avatar} name={product.seller?.name} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.sellerLabel}>Seller</Text>
            <Text style={styles.sellerName}>{product.seller?.name}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
            <Ionicons name={myLiked ? "heart" : "heart-outline"} size={20} color={myLiked ? "#D32F2F" : COLORS.sub} />
            <Text style={styles.likeCount}>{product.likeCount}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.saveButton} onPress={() => toggleSave("product", product.id)}>
            <Ionicons name={isSaved("product", product.id) ? "bookmark" : "bookmark-outline"} size={20} color={COLORS.accent} />
          </TouchableOpacity>
          {!isOwn && (
            <TouchableOpacity style={styles.inquireButton} onPress={handleInquire} disabled={starting}>
              <Ionicons name="chatbubble-outline" size={16} color={COLORS.accentInk} />
              <Text style={styles.inquireButtonText}>{starting ? "Starting..." : "Buy / Inquire"}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 8 },
  notFoundText: { fontSize: 16, fontWeight: "700", color: COLORS.ink, marginTop: 6 },
  notFoundHint: { fontSize: 13, color: COLORS.sub, textAlign: "center" },
  media: { width: "100%", height: 320, backgroundColor: "#000" },
  body: { padding: 16 },
  soldBanner: { backgroundColor: "#FDEDED", borderRadius: 8, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: "#F3C6C6" },
  soldBannerText: { color: "#7a1f1f", fontSize: 12.5, fontWeight: "700", textAlign: "center" },
  title: { fontSize: 20, fontWeight: "800", color: COLORS.ink },
  price: { fontSize: 17, fontWeight: "800", color: COLORS.accent, marginTop: 4 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 10 },
  categoryPill: { backgroundColor: COLORS.wash, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  categoryPillText: { color: COLORS.accent, fontSize: 11.5, fontWeight: "600" },
  description: { fontSize: 14, color: COLORS.ink, lineHeight: 20, marginTop: 12 },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginTop: 16 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#eee" },
  sellerLabel: { fontSize: 10.5, color: COLORS.sub, textTransform: "uppercase", letterSpacing: 0.5 },
  sellerName: { fontSize: 14.5, fontWeight: "700", color: COLORS.ink, marginTop: 1 },
  actionsRow: { flexDirection: "row", alignItems: "center", gap: 12, marginTop: 18 },
  likeButton: { flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  likeCount: { fontSize: 13, fontWeight: "700", color: COLORS.ink },
  saveButton: { backgroundColor: COLORS.surface, borderRadius: 20, padding: 10 },
  inquireButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: COLORS.accent, borderRadius: 20, paddingVertical: 12 },
  inquireButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 13.5 },
});
