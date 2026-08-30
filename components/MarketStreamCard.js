import React, { useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TouchableWithoutFeedback, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import FeedVideoPlayer from "./FeedVideoPlayer";
import Avatar from "./Avatar";
import { COLORS } from "../theme";

// A full-bleed photo carousel for the market stream — deliberately a
// separate lightweight component from components/PhotoCarousel.js rather
// than adding a "fill mode" to it: that one sizes itself off the first
// photo's own aspect ratio for PostCard's feed slot, this one always
// covers the full card (explicit width/height per slide, cover-fit)
// regardless of shape, matching the video card next to it in the stream.
function StreamPhotoCarousel({ photoUrls, height, onPress }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  return (
    <View style={StyleSheet.absoluteFill}>
      <FlatList
        data={photoUrls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(uri, i) => `${i}-${uri}`}
        onScroll={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / width);
          setIndex((prev) => (i !== prev ? i : prev));
        }}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => (
          <TouchableWithoutFeedback onPress={onPress}>
            <View style={{ width, height }}>
              <Image source={{ uri: item }} style={{ width, height }} contentFit="cover" />
            </View>
          </TouchableWithoutFeedback>
        )}
      />
      {photoUrls.length > 1 && (
        <>
          <View style={styles.countBadge}><Text style={styles.countBadgeText}>{index + 1}/{photoUrls.length}</Text></View>
          <View style={styles.dots} pointerEvents="none">
            {photoUrls.map((_, i) => <View key={i} style={[styles.dot, i === index && styles.dotActive]} />)}
          </View>
        </>
      )}
    </View>
  );
}

// One full-screen card in the unified MarketPlace stream — video
// (autoplay/loop while active, FeedVideoPlayer's "fullscreen" variant), a
// single photo, or (photoUrls.length > 1) a full-bleed carousel. Same
// overlay shape regardless of media: seller row/title/description/price
// bottom-left, contact/save/like/rating rail bottom-right — mirrors Fundi
// Jikoni's MarketFeedCard layout.
export default function MarketStreamCard({ product, height, isActive, onOpenSeller, onContactSeller, onToggleSave, onOpenDetail, onLike }) {
  const isVideo = product.mediaType === "video";
  const isMultiPhoto = !isVideo && product.photoUrls?.length > 1;

  return (
    <View style={[styles.card, { height }]}>
      {isVideo ? (
        <FeedVideoPlayer uri={product.mediaUrl} poster={product.thumbnailUrl} isActive={isActive} variant="fullscreen" onPressBody={() => {}} />
      ) : isMultiPhoto ? (
        <StreamPhotoCarousel photoUrls={product.photoUrls} height={height} onPress={onOpenDetail} />
      ) : (
        <TouchableWithoutFeedback onPress={onOpenDetail}>
          <View style={StyleSheet.absoluteFill}>
            {product.photoUrls?.[0] ? (
              <Image source={{ uri: product.photoUrls[0] }} style={StyleSheet.absoluteFill} contentFit="cover" />
            ) : (
              <View style={[StyleSheet.absoluteFill, styles.fallback]}>
                <Ionicons name="bag-outline" size={64} color="rgba(255,255,255,0.3)" />
              </View>
            )}
          </View>
        </TouchableWithoutFeedback>
      )}

      {product.isBoosted && (
        <View style={styles.boostedBadge}>
          <Ionicons name="rocket-outline" size={11} color={COLORS.accentInk} />
          <Text style={styles.boostedBadgeText}>Boosted</Text>
        </View>
      )}

      <View style={styles.info} pointerEvents="box-none">
        <TouchableOpacity style={styles.sellerRow} onPress={() => onOpenSeller(product.seller?.id)}>
          <Avatar uri={product.seller?.avatar} name={product.seller?.name} style={styles.sellerAvatar} />
          <Text style={styles.sellerName}>{product.seller?.name}</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onOpenDetail}>
          <Text style={styles.title} numberOfLines={1}>{product.title}</Text>
          {!!product.description && <Text style={styles.desc} numberOfLines={2}>{product.description}</Text>}
          <Text style={styles.price}>KES {Number(product.priceKES || 0).toLocaleString()}</Text>
          {!!product.categories?.length && (
            <View style={styles.categoryRow}>
              {product.categories.slice(0, 3).map((c) => (
                <View key={c.id} style={styles.categoryPill}><Text style={styles.categoryPillText}>{c.name}</Text></View>
              ))}
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.rail} pointerEvents="box-none">
        <TouchableOpacity style={styles.railBtn} onPress={() => onContactSeller(product)}>
          <Ionicons name="chatbubble-outline" size={24} color="#fff" />
          <Text style={styles.railText}>Contact</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.railBtn} onPress={() => onLike(product)}>
          <Ionicons name={product.myLiked ? "heart" : "heart-outline"} size={26} color={product.myLiked ? "#FF4D67" : "#fff"} />
          <Text style={styles.railText}>{product.likeCount || 0}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.railBtn} onPress={() => onToggleSave(product.id, product.saved)}>
          <Ionicons name={product.saved ? "bookmark" : "bookmark-outline"} size={24} color="#fff" />
          <Text style={styles.railText}>Save</Text>
        </TouchableOpacity>
        <View style={[styles.railBtn, styles.railBtnStatic]}>
          <Ionicons name="star" size={20} color={COLORS.accent} />
          <Text style={styles.railText}>{product.sellerRating > 0 ? product.sellerRating.toFixed(1) : "—"}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { width: "100%", backgroundColor: "#000" },
  fallback: { alignItems: "center", justifyContent: "center", backgroundColor: COLORS.ink },
  countBadge: { position: "absolute", top: 12, right: 12, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  countBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  dots: { position: "absolute", top: 12, left: 12, right: 60, flexDirection: "row", gap: 4 },
  dot: { width: 16, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.4)" },
  dotActive: { backgroundColor: "#fff" },
  boostedBadge: { position: "absolute", top: 60, left: 14, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: COLORS.accent, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  boostedBadgeText: { color: COLORS.accentInk, fontSize: 10.5, fontWeight: "800" },
  info: { position: "absolute", left: 14, right: 76, bottom: 26 },
  sellerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 9 },
  sellerAvatar: { width: 26, height: 26, borderRadius: 13 },
  sellerName: { fontSize: 13, fontWeight: "700", color: "#fff" },
  title: { fontSize: 14.5, fontWeight: "700", color: "#fff", marginBottom: 2 },
  desc: { fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 16, marginBottom: 6 },
  price: { fontSize: 16, fontWeight: "800", color: COLORS.accent },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  categoryPill: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  categoryPillText: { color: "#fff", fontSize: 10.5, fontWeight: "600" },
  rail: { position: "absolute", right: 12, bottom: 30, alignItems: "center", gap: 17 },
  railBtn: { alignItems: "center", gap: 3 },
  railBtnStatic: { opacity: 0.95 },
  railText: { fontSize: 10, fontWeight: "700", color: "#fff" },
});
