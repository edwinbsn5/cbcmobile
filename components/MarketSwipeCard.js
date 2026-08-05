import React, { useRef } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Animated, PanResponder, Dimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import AdMobBanner from "./AdMobBanner";
import { COLORS } from "../theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3;
const SWIPE_OUT_DURATION = 220;

/**
 * A single Tinder-style card. No gesture library in this project (only
 * core RN), so dragging is implemented with a plain Animated.ValueXY +
 * PanResponder: position tracks the finger 1:1, rotation is derived from
 * horizontal offset, and on release either flings off-screen (past
 * SWIPE_THRESHOLD) or springs back to center. Only ever mounted for the
 * top 2 cards of a deck (see MarketSwipeScreen) — everything below just
 * renders statically underneath, so this component doesn't know about the
 * deck itself, only "am I the active (draggable) card or not".
 */
export default function MarketSwipeCard({ product, isAd, isTop, onSwipeLeft, onSwipeRight, onDetails, onContactSeller, style }) {
  const position = useRef(new Animated.ValueXY()).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => isTop,
      onMoveShouldSetPanResponder: (_, gesture) => isTop && (Math.abs(gesture.dx) > 4 || Math.abs(gesture.dy) > 4),
      onPanResponderMove: Animated.event([null, { dx: position.x, dy: position.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          flingOut(1, onSwipeRight);
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          flingOut(-1, onSwipeLeft);
        } else {
          Animated.spring(position, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 5 }).start();
        }
      },
    })
  ).current;

  function flingOut(direction, callback) {
    Animated.timing(position, {
      toValue: { x: direction * SCREEN_WIDTH * 1.5, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false,
    }).start(() => callback?.());
  }

  const rotate = position.x.interpolate({ inputRange: [-SCREEN_WIDTH / 2, 0, SCREEN_WIDTH / 2], outputRange: ["-12deg", "0deg", "12deg"] });
  const likeOpacity = position.x.interpolate({ inputRange: [0, SWIPE_THRESHOLD], outputRange: [0, 1], extrapolate: "clamp" });
  const nopeOpacity = position.x.interpolate({ inputRange: [-SWIPE_THRESHOLD, 0], outputRange: [1, 0], extrapolate: "clamp" });

  const cardStyle = isTop
    ? { transform: [{ translateX: position.x }, { translateY: position.y }, { rotate }] }
    : {};

  if (isAd) {
    return (
      <Animated.View style={[styles.card, styles.adCard, style, cardStyle]} {...(isTop ? panResponder.panHandlers : {})}>
        <Text style={styles.adLabel}>Sponsored</Text>
        <AdMobBanner />
        <Text style={styles.adHint}>Swipe to continue browsing</Text>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.card, style, cardStyle]} {...(isTop ? panResponder.panHandlers : {})}>
      <Image source={{ uri: product.photoUrls[0] }} style={styles.image} contentFit="cover" />

      {isTop && (
        <>
          <Animated.View style={[styles.stamp, styles.likeStamp, { opacity: likeOpacity }]}>
            <Text style={styles.likeStampText}>SAVE</Text>
          </Animated.View>
          <Animated.View style={[styles.stamp, styles.nopeStamp, { opacity: nopeOpacity }]}>
            <Text style={styles.nopeStampText}>PASS</Text>
          </Animated.View>
        </>
      )}

      {product.photoUrls.length > 1 && (
        <View style={styles.photoCountBadge}>
          <Text style={styles.photoCountText}>1/{product.photoUrls.length}</Text>
        </View>
      )}

      {product.isBoosted && (
        <View style={styles.boostedBadge}>
          <Ionicons name="rocket-outline" size={11} color="#fff" />
          <Text style={styles.boostedBadgeText}>Boosted</Text>
        </View>
      )}

      <View style={styles.overlay}>
        <Text style={styles.sellerTop}>{product.seller?.name}</Text>
        <Text style={styles.title} numberOfLines={1}>{product.title}</Text>
        <Text style={styles.price}>KES {product.priceKES.toLocaleString()}</Text>
        {!!product.description && <Text style={styles.description} numberOfLines={2}>{product.description}</Text>}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={[styles.actionChip, styles.actionChipPrimary]} onPress={onDetails}>
            <Text style={styles.actionChipTextPrimary}>More Details</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionChip} onPress={onContactSeller}>
            <Ionicons name="chatbubble-outline" size={11} color="#fff" />
            <Text style={styles.actionChipText}>Contact Seller</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Animated.View>
  );
}

const CARD_WIDTH = SCREEN_WIDTH - 32;
const CARD_HEIGHT = CARD_WIDTH * 1.3;

const styles = StyleSheet.create({
  card: {
    position: "absolute", width: CARD_WIDTH, height: CARD_HEIGHT, borderRadius: 18, overflow: "hidden",
    backgroundColor: "#000", shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 10, elevation: 6,
  },
  image: { width: "100%", height: "100%" },
  stamp: { position: "absolute", top: 24, borderWidth: 4, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  likeStamp: { left: 20, borderColor: "#2E7D32", transform: [{ rotate: "-15deg" }] },
  likeStampText: { color: "#2E7D32", fontWeight: "900", fontSize: 24, letterSpacing: 1 },
  nopeStamp: { right: 20, borderColor: "#D32F2F", transform: [{ rotate: "15deg" }] },
  nopeStampText: { color: "#D32F2F", fontWeight: "900", fontSize: 24, letterSpacing: 1 },
  photoCountBadge: { position: "absolute", top: 14, right: 14, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  photoCountText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  boostedBadge: { position: "absolute", top: 14, left: 14, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  boostedBadgeText: { color: COLORS.accentInk, fontSize: 10.5, fontWeight: "800" },
  adCard: { backgroundColor: COLORS.surface, alignItems: "center", justifyContent: "center", gap: 10 },
  adLabel: { color: COLORS.sub, fontSize: 12, fontWeight: "700" },
  adHint: { color: COLORS.sub, fontSize: 11.5 },
  overlay: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: "rgba(0,0,0,0.45)" },
  sellerTop: { color: "#cfd6e0", fontSize: 11.5, fontWeight: "600" },
  title: { color: "#fff", fontSize: 14.5, fontWeight: "700", marginTop: 2 },
  price: { color: "#F5A623", fontSize: 13.5, fontWeight: "800", marginTop: 1 },
  description: { color: "#d7dbe2", fontSize: 11.5, lineHeight: 16, marginTop: 5 },
  actionsRow: { flexDirection: "row", justifyContent: "flex-start", gap: 6, marginTop: 9 },
  actionChip: {
    flexDirection: "row", alignItems: "center", gap: 4,
    backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 11, paddingHorizontal: 9, paddingVertical: 5,
  },
  actionChipPrimary: { backgroundColor: COLORS.accent },
  actionChipText: { color: "#fff", fontSize: 10.5, fontWeight: "600" },
  actionChipTextPrimary: { color: COLORS.accentInk, fontSize: 10.5, fontWeight: "700" },
});
