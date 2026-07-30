import React, { useRef } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Animated, PanResponder, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
export default function MarketSwipeCard({ product, isTop, onSwipeLeft, onSwipeRight, onDetails, style }) {
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

  return (
    <Animated.View style={[styles.card, style, cardStyle]} {...(isTop ? panResponder.panHandlers : {})}>
      <Image source={{ uri: product.photoUrls[0] }} style={styles.image} resizeMode="cover" />

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

      <View style={styles.overlay}>
        <View style={styles.overlayTop}>
          <Text style={styles.title} numberOfLines={1}>{product.title}</Text>
          <Text style={styles.price}>KES {product.priceKES.toLocaleString()}</Text>
        </View>
        <View style={styles.categoryRow}>
          {product.categories.slice(0, 3).map((c) => (
            <View key={c.id} style={styles.categoryPill}><Text style={styles.categoryPillText}>{c.name}</Text></View>
          ))}
        </View>
        <View style={styles.bottomRow}>
          <Text style={styles.sellerText}>{product.seller?.name}</Text>
          <TouchableOpacity style={styles.detailsButton} onPress={onDetails}>
            <Text style={styles.detailsButtonText}>Details</Text>
            <Ionicons name="chevron-forward" size={14} color={COLORS.accentInk} />
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
  overlay: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 16, backgroundColor: "rgba(0,0,0,0.45)" },
  overlayTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  title: { flex: 1, color: "#fff", fontSize: 18, fontWeight: "800" },
  price: { color: "#F5A623", fontSize: 16, fontWeight: "800", marginLeft: 8 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  categoryPill: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  categoryPillText: { color: "#fff", fontSize: 10.5, fontWeight: "600" },
  bottomRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  sellerText: { color: "#e0e0e0", fontSize: 12 },
  detailsButton: { flexDirection: "row", alignItems: "center", gap: 2, backgroundColor: COLORS.accent, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  detailsButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 12 },
});
