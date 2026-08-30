import React, { useCallback, useMemo, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, useWindowDimensions, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import client from "../api/client";
import MarketStreamCard from "../components/MarketStreamCard";
import MarketFilterSheet from "../components/MarketFilterSheet";
import { useAuth } from "../context/AuthContext";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

const COUNTY_STORAGE_KEY = "marketBrowseCounty";

// Boosted listings repeat through the feed rather than appearing once —
// 2nd position, then every 7 posts thereafter (positions 1, 8, 15, 22… in
// this 0-based indexing), cycling through the active-boost pool if there's
// more than one. Pure function of the organic list + pool so it stays
// correct across pagination without re-deriving insertion points — mirrors
// Fundi Jikoni's own buildBoostedFeed exactly.
const BOOST_FIRST_POSITION = 1; // 0-based
const BOOST_INTERVAL = 7;

function buildBoostedFeed(organic, boostPool) {
  if (!boostPool.length) return organic;
  const feed = [];
  let organicIndex = 0;
  let boostIndex = 0;
  let pos = 0;
  while (organicIndex < organic.length) {
    const isBoostSlot = pos === BOOST_FIRST_POSITION || (pos > BOOST_FIRST_POSITION && (pos - BOOST_FIRST_POSITION) % BOOST_INTERVAL === 0);
    if (isBoostSlot) {
      const boost = boostPool[boostIndex % boostPool.length];
      feed.push({ ...boost, _feedKey: `boost-${boost.id}-${pos}` });
      boostIndex += 1;
    } else {
      const item = organic[organicIndex];
      feed.push({ ...item, _feedKey: `p-${item.id}` });
      organicIndex += 1;
    }
    pos += 1;
  }
  return feed;
}

export default function AGirlsMarketScreen({ navigation }) {
  const { user } = useAuth();
  const { loadSaved, isSaved, toggleSave } = useSaved();
  const { height: windowHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const cardHeight = windowHeight;

  const [county, setCounty] = useState("");
  const [subCounty, setSubCounty] = useState("");
  const [loadedCounty, setLoadedCounty] = useState(false);
  const [categoryIds, setCategoryIds] = useState([]);
  const [minPrice, setMinPrice] = useState(null);
  const [maxPrice, setMaxPrice] = useState(null);
  const [products, setProducts] = useState([]);
  const [boostPool, setBoostPool] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  // Defaults to the user's own profile county the first time this screen
  // ever loads (no saved preference yet) so browsing starts immediately —
  // no forced picker step before there's anything to see. Still switchable,
  // and remembered from then on, via the filter sheet.
  useFocusEffect(useCallback(() => {
    if (loadedCounty) return;
    AsyncStorage.getItem(COUNTY_STORAGE_KEY).then((saved) => {
      setCounty(saved || user?.county || "");
      setLoadedCounty(true);
    });
  }, [loadedCounty, user?.county]));

  const load = useCallback((override) => {
    const effCounty = override && "county" in override ? override.county : county;
    const effSubCounty = override && "subCounty" in override ? override.subCounty : subCounty;
    const effCategoryIds = override && "categoryIds" in override ? override.categoryIds : categoryIds;
    const effMinPrice = override && "minPrice" in override ? override.minPrice : minPrice;
    const effMaxPrice = override && "maxPrice" in override ? override.maxPrice : maxPrice;

    setLoading(true);
    client.get("/market-boosts/boost-pool", { params: { county: effCounty || undefined, subCounty: effSubCounty || undefined } })
      .then((r) => r.data).catch(() => [])
      .then((pool) => {
        setBoostPool(pool || []);
        return client.get("/market/products", {
          params: {
            county: effCounty || undefined, subCounty: effSubCounty || undefined,
            categoryIds: effCategoryIds?.length ? effCategoryIds.join(",") : undefined,
            minPrice: effMinPrice ?? undefined, maxPrice: effMaxPrice ?? undefined,
          },
        });
      })
      .then((r) => setProducts(r.data))
      .catch(() => setProducts([]))
      .finally(() => setLoading(false));
  }, [county, subCounty, categoryIds, minPrice, maxPrice]);

  // Same "route real refetches through a ref so useFocusEffect only fires
  // on genuine focus transitions" fix as Fundi Jikoni's own screen — load's
  // identity changes on every filter edit, and a plain useFocusEffect
  // dependency on it would refetch (tearing down active video players) on
  // every keystroke instead of only when the Search button is pressed.
  const loadRef = useRef(load);
  loadRef.current = load;
  useFocusEffect(useCallback(() => {
    if (!loadedCounty) return;
    loadRef.current();
    loadSaved();
  }, [loadedCounty]));

  const displayFeed = useMemo(() => buildBoostedFeed(products, boostPool), [products, boostPool]);

  function loadMore() {
    if (loadingMore || !products.length) return;
    setLoadingMore(true);
    const excludeIds = [...products.map((p) => p.id), ...boostPool.map((b) => b.id)].filter(Boolean).join(",");
    client.get("/market/products", {
      params: {
        county: county || undefined, subCounty: subCounty || undefined,
        categoryIds: categoryIds.length ? categoryIds.join(",") : undefined,
        minPrice: minPrice ?? undefined, maxPrice: maxPrice ?? undefined,
        excludeIds: excludeIds || undefined,
      },
    })
      .then((r) => setProducts((prev) => [...prev, ...r.data]))
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  }

  function handleToggleSave(productId) {
    toggleSave("product", productId);
  }

  async function handleLike(product) {
    try {
      const { data } = await client.post(`/market/products/${product.id}/react`, { reaction: "like" });
      const patch = (arr) => arr.map((p) => (p.id === product.id ? { ...p, likeCount: data.likeCount, reactions: data.reactions } : p));
      setProducts(patch);
      setBoostPool(patch);
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
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

  function handleSearch({ county: c, subCounty: sc, minPrice: min, maxPrice: max }) {
    setCounty(c || "");
    setSubCounty(sc || "");
    AsyncStorage.setItem(COUNTY_STORAGE_KEY, c || "").catch(() => {});
    setMinPrice(min ?? null);
    setMaxPrice(max ?? null);
    setFilterOpen(false);
    load({ county: c || "", subCounty: sc || "", categoryIds, minPrice: min ?? null, maxPrice: max ?? null });
  }

  const activeFilterCount = categoryIds.length + (minPrice != null ? 1 : 0) + (maxPrice != null ? 1 : 0);

  return (
    <View style={styles.container}>
      <FlatList
        data={displayFeed}
        keyExtractor={(p) => p._feedKey || p.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        windowSize={3}
        getItemLayout={(_, index) => ({ length: cardHeight, offset: cardHeight * index, index })}
        onMomentumScrollEnd={(e) => setActiveIndex(Math.round(e.nativeEvent.contentOffset.y / cardHeight))}
        onEndReached={loadMore}
        onEndReachedThreshold={1.5}
        renderItem={({ item, index }) => {
          if (item.kind === "ad") {
            return (
              <View style={[styles.adSlide, { height: cardHeight }]}>
                <Text style={styles.adLabel}>Sponsored</Text>
              </View>
            );
          }
          const hydrated = { ...item, myLiked: !!item.reactions?.[user?.id], saved: isSaved("product", item.id) };
          return (
            <MarketStreamCard
              product={hydrated}
              height={cardHeight}
              isActive={index === activeIndex}
              onOpenSeller={(sellerId) => sellerId && navigation.navigate("UserProfile", { userId: sellerId })}
              onContactSeller={handleContactSeller}
              onToggleSave={handleToggleSave}
              onLike={handleLike}
              onOpenDetail={() => navigation.navigate("MarketProductDetail", { productId: item.id })}
            />
          );
        }}
        ListEmptyComponent={
          !loading && (
            <View style={[styles.empty, { height: cardHeight }]}>
              <Text style={styles.emptyText}>No listings here yet — try widening your zone or filters.</Text>
            </View>
          )
        }
      />

      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate("MainTabs", { screen: "Home" }))} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="chevron-back" size={19} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.wordmark}>A Girl's Market</Text>
        </View>
        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.navigate("CreateMarketProduct")} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setFilterOpen(true)}>
            <Ionicons name="options-outline" size={14} color="#fff" />
            <Text style={styles.filterBtnText}>Filter</Text>
            {activeFilterCount > 0 && (
              <View style={styles.filterBadge}><Text style={styles.filterBadgeText}>{activeFilterCount}</Text></View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <MarketFilterSheet
        visible={filterOpen}
        onClose={() => setFilterOpen(false)}
        county={county}
        subCounty={subCounty}
        onLocationChange={() => {}}
        categoryIds={categoryIds}
        onCategoryIdsChange={setCategoryIds}
        minPrice={minPrice}
        maxPrice={maxPrice}
        onSearch={handleSearch}
        onOpenSaved={() => { setFilterOpen(false); navigation.navigate("SavedMarketProducts"); }}
        onOpenMine={() => { setFilterOpen(false); navigation.navigate("MyMarketProducts"); }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  empty: { width: "100%", alignItems: "center", justifyContent: "center", paddingHorizontal: 40 },
  emptyText: { color: "rgba(255,255,255,0.8)", fontSize: 13, textAlign: "center" },
  adSlide: { width: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#000" },
  adLabel: { color: "#999", fontSize: 12, fontWeight: "700" },
  topBar: { position: "absolute", left: 14, right: 14, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(20,24,28,0.4)", alignItems: "center", justifyContent: "center" },
  wordmark: { fontSize: 13.5, fontWeight: "800", color: "#fff" },
  filterBtn: {
    flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(20,24,28,0.4)",
    borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7,
  },
  filterBtnText: { fontSize: 11.5, fontWeight: "700", color: "#fff" },
  filterBadge: { position: "absolute", top: -5, right: -5, width: 16, height: 16, borderRadius: 8, backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center" },
  filterBadgeText: { fontSize: 9, fontWeight: "800", color: COLORS.accentInk },
});
