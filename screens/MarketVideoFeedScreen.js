import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, Dimensions, StyleSheet, TouchableWithoutFeedback, TouchableOpacity, Animated, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import FeedVideoPlayer from "../components/FeedVideoPlayer";
import { useSingleActiveVideo } from "../hooks/useSingleActiveVideo";
import { useAuth } from "../context/AuthContext";
import { COLORS } from "../theme";

const { height, width } = Dimensions.get("window");
const DOUBLE_TAP_MS = 280;

function HeartBurst({ trigger }) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!trigger) return;
    scale.setValue(0);
    opacity.setValue(1);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1, friction: 3, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 0, duration: 300, delay: 250, useNativeDriver: true }),
    ]).start();
  }, [trigger]);

  return (
    <Animated.View pointerEvents="none" style={[styles.heartBurst, { opacity, transform: [{ scale }] }]}>
      <Ionicons name="heart" size={90} color="#fff" />
    </Animated.View>
  );
}

export default function MarketVideoFeedScreen({ route, navigation }) {
  const { categoryId, categoryName, county, subCounty } = route.params;
  const { user } = useAuth();
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [burstFor, setBurstFor] = useState(null);
  const lastTapRef = useRef({});
  const { activeIndex, viewabilityConfig, onViewableItemsChanged } = useSingleActiveVideo({ threshold: 80 });

  useEffect(() => {
    navigation.setOptions({ title: categoryName || "Browse by Videos" });
  }, [categoryName]);

  async function load() {
    setLoading(true);
    const params = { mediaType: "video" };
    if (categoryId) params.categoryIds = categoryId;
    if (county) params.county = county;
    if (subCounty) params.subCounty = subCounty;
    const { data } = await client.get("/market/products", { params });
    setVideos(data);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [categoryId]);

  // "Infinite" vertical scroll: fetches more of the same category, excluding
  // everything already loaded, appended once the user nears the end of the
  // list — the feed only actually ends once the server has nothing new to
  // return, not at any fixed page count.
  async function loadMore() {
    if (loadingMore || !videos.length) return;
    setLoadingMore(true);
    const params = { mediaType: "video", excludeIds: videos.map((v) => v.id).join(",") };
    if (categoryId) params.categoryIds = categoryId;
    if (county) params.county = county;
    if (subCounty) params.subCounty = subCounty;
    try {
      const { data } = await client.get("/market/products", { params });
      if (data.length) setVideos((prev) => [...prev, ...data]);
    } finally {
      setLoadingMore(false);
    }
  }

  function updateItem(id, patch) {
    setVideos((prev) => prev.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  }

  async function handleLike(item) {
    const { data } = await client.post(`/market/products/${item.id}/react`, { reaction: "like" });
    updateItem(item.id, { reactions: data.reactions, likeCount: data.likeCount });
  }

  async function handleSave(item) {
    setBurstFor(item.id);
    client.post("/saved", { itemType: "product", itemId: item.id }).catch(() => {});
  }

  function handlePress(item) {
    const now = Date.now();
    const last = lastTapRef.current[item.id] || 0;
    lastTapRef.current[item.id] = now;
    if (now - last < DOUBLE_TAP_MS) {
      handleSave(item);
    }
  }

  async function handleInquire(item) {
    try {
      const { data } = await client.post("/inbox/start", { userId: item.seller.id });
      navigation.navigate("Chat", { conversationId: data.id, otherUser: data.otherUser });
    } catch (e) {
      Alert.alert("Couldn't start chat", e.response?.data?.error || e.message);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#fff" />;

  return (
    <FlatList
      data={videos}
      keyExtractor={(v) => v.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
      decelerationRate="fast"
      getItemLayout={(data, index) => ({ length: height, offset: height * index, index })}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      onEndReachedThreshold={1.5}
      onEndReached={loadMore}
      ListEmptyComponent={<View style={styles.slide}><Text style={styles.empty}>No videos in {categoryName || "this category"} yet</Text></View>}
      renderItem={({ item, index }) => {
        const isLiked = !!item.reactions?.[user?.id];
        return (
          <TouchableWithoutFeedback onPress={() => handlePress(item)}>
            <View style={styles.slide}>
              <FeedVideoPlayer
                uri={item.mediaUrl}
                poster={item.thumbnailUrl}
                isActive={isFocused && index === activeIndex}
                variant="fullscreen"
                onPressBody={() => {}}
              />
              <HeartBurst trigger={burstFor === item.id ? Date.now() : null} />

              <View style={[styles.overlay, { bottom: 70 + insets.bottom }]} pointerEvents="box-none">
                <Text style={styles.title}>{item.title}</Text>
                <Text style={styles.price}>KES {item.priceKES.toLocaleString()}</Text>
                <View style={styles.categoryRow}>
                  {item.categories.slice(0, 3).map((c) => (
                    <View key={c.id} style={styles.categoryPill}><Text style={styles.categoryPillText}>{c.name}</Text></View>
                  ))}
                </View>
                <TouchableOpacity style={styles.inquireButton} onPress={() => handleInquire(item)}>
                  <Ionicons name="chatbubble-outline" size={14} color={COLORS.accentInk} />
                  <Text style={styles.inquireButtonText}>Buy / Inquire</Text>
                </TouchableOpacity>
              </View>

              <View style={[styles.actionColumn, { bottom: 70 + insets.bottom }]} pointerEvents="box-none">
                <TouchableOpacity style={styles.actionButton} onPress={() => handleLike(item)}>
                  <Ionicons name={isLiked ? "heart" : "heart-outline"} size={30} color={isLiked ? "#FF4D67" : "#fff"} />
                  <Text style={styles.actionCount}>{item.likeCount}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => handleSave(item)}>
                  <Ionicons name="bookmark-outline" size={28} color="#fff" />
                  <Text style={styles.actionCount}>{item.saveCount}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  slide: { width, height, backgroundColor: "#000", alignItems: "center", justifyContent: "center" },
  empty: { color: "#999", fontSize: 14 },
  heartBurst: { position: "absolute", top: "50%", left: "50%", marginLeft: -45, marginTop: -45 },
  overlay: { position: "absolute", left: 16, right: 100 },
  title: { color: "#fff", fontWeight: "800", fontSize: 17 },
  price: { color: "#F5A623", fontWeight: "800", fontSize: 15, marginTop: 4 },
  categoryRow: { flexDirection: "row", flexWrap: "wrap", gap: 5, marginTop: 8 },
  categoryPill: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  categoryPillText: { color: "#fff", fontSize: 10.5, fontWeight: "600" },
  inquireButton: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: COLORS.accent, borderRadius: 18,
    paddingHorizontal: 14, paddingVertical: 9, marginTop: 12, alignSelf: "flex-start",
  },
  inquireButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 13 },
  actionColumn: { position: "absolute", right: 16, alignItems: "center", gap: 20 },
  actionButton: { alignItems: "center" },
  actionCount: { color: "#fff", fontWeight: "700", fontSize: 11, marginTop: 4 },
});
