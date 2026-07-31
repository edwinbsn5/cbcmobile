import React, { useEffect, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import MarketSwipeCard from "../components/MarketSwipeCard";
import { COLORS } from "../theme";

// Tinder-style Browse by Photos. Deck is fetched once per category (finite,
// not infinite — spec only asks for infinite scroll on the video feed);
// swiping right saves the product (POST /api/saved, fire-and-forget — a
// failed save shouldn't block advancing the deck), swiping left just
// discards and moves on. Only the top 2 cards are ever mounted at once
// (see MarketSwipeCard) so the deck can hold hundreds of products without
// hundreds of Animated.Image instances alive.
export default function MarketSwipeScreen({ route, navigation }) {
  const { categoryId, categoryName, county, subCounty } = route.params;
  const [deck, setDeck] = useState([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    navigation.setOptions({ title: categoryName || "Browse by Photos" });
  }, [categoryName]);

  async function load() {
    setLoading(true);
    const params = { mediaType: "photo" };
    if (categoryId) params.categoryIds = categoryId;
    if (county) params.county = county;
    if (subCounty) params.subCounty = subCounty;
    const { data } = await client.get("/market/products", { params });

    // Slot 2 of the deck: a random active boosted listing, or a Google ad
    // fallback when nothing's currently boosted (see services/marketBoosts.js).
    // Only applied to this initial load, not any later refresh triggered by
    // "Check again" — "2nd position" is a one-time concept, not something
    // that re-applies every time the deck reloads.
    let nextDeck = data;
    try {
      const { data: slot2 } = await client.get("/market-boosts/feed-slot2", {
        params: { mediaType: "photo", county: county || undefined, subCounty: subCounty || undefined },
      });
      if (data.length >= 1) {
        nextDeck = [...data];
        nextDeck.splice(1, 0, slot2);
      }
    } catch {}

    setDeck(nextDeck);
    setIndex(0);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [categoryId]);

  function advance() {
    setIndex((i) => i + 1);
  }

  async function handleSwipeRight(product) {
    client.post("/saved", { itemType: "product", itemId: product.id }).catch(() => {});
    advance();
  }

  async function handleContactSeller(product) {
    if (!product.seller?.id) return;
    try {
      const { data } = await client.post("/inbox/start", {
        userId: product.seller.id, contextType: "market_product", contextProductId: product.id,
      });
      navigation.navigate("Chat", { conversationId: data.id, otherUser: data.otherUser });
    } catch (e) {
      Alert.alert("Couldn't start chat", e.response?.data?.error || e.message);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const remaining = deck.slice(index, index + 2);

  return (
    <View style={styles.container}>
      <View style={styles.deckArea}>
        {remaining.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-done-circle-outline" size={48} color={COLORS.sub} />
            <Text style={styles.emptyText}>You've seen everything in {categoryName || "this category"}</Text>
            <TouchableOpacity style={styles.refreshButton} onPress={load}>
              <Text style={styles.refreshButtonText}>Check again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          [...remaining]
            .map((product, i) => {
              const isAd = product.kind === "ad";
              return (
                <MarketSwipeCard
                  key={product.id}
                  product={isAd ? null : product}
                  isAd={isAd}
                  isTop={i === 0}
                  style={i === 1 ? styles.behindCard : null}
                  onSwipeLeft={advance}
                  onSwipeRight={() => (isAd ? advance() : handleSwipeRight(product))}
                  onDetails={() => !isAd && navigation.navigate("MarketProductDetail", { productId: product.id })}
                  onContactSeller={() => !isAd && handleContactSeller(product)}
                />
              );
            })
            .reverse()
        )}
      </View>

      {remaining.length > 0 && (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={[styles.roundButton, styles.passButton]} onPress={advance}>
            <Ionicons name="close" size={28} color="#D32F2F" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.roundButton, styles.saveButton]} onPress={() => handleSwipeRight(remaining[0])}>
            <Ionicons name="heart" size={26} color="#2E7D32" />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.ink },
  deckArea: { flex: 1, alignItems: "center", justifyContent: "center" },
  behindCard: { transform: [{ scale: 0.95 }, { translateY: 10 }] },
  emptyState: { alignItems: "center", padding: 24 },
  emptyText: { color: "#fff", fontSize: 14, textAlign: "center", marginTop: 12, marginBottom: 18 },
  refreshButton: { backgroundColor: COLORS.accent, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 10 },
  refreshButtonText: { color: COLORS.accentInk, fontWeight: "700" },
  buttonRow: { flexDirection: "row", justifyContent: "center", gap: 30, paddingVertical: 24 },
  roundButton: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center", backgroundColor: "#fff" },
  passButton: {},
  saveButton: {},
});
