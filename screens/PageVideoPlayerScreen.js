import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Dimensions, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import FeedVideoPlayer from "../components/FeedVideoPlayer";
import { useSingleActiveVideo } from "../hooks/useSingleActiveVideo";
import { formatCount } from "../utils/formatCount";

const { height, width } = Dimensions.get("window");

// Page Videos tab's fullscreen watch view — same vertical-paging pattern as
// GroupVideoPlayerScreen, but reading from page_media (routes/pages.js)
// rather than group posts, so there's no react/comment/edit/delete here —
// page_media rows aren't posts.
export default function PageVideoPlayerScreen({ route, navigation }) {
  const { slug, startIndex = 0 } = route.params;
  const isFocused = useIsFocused();
  const insets = useSafeAreaInsets();
  const [videos, setVideos] = useState([]);
  const [loading, setLoading] = useState(true);
  const { activeIndex, viewabilityConfig, onViewableItemsChanged } = useSingleActiveVideo({ threshold: 80 });

  useEffect(() => {
    client.get(`/pages/${slug}/videos`).then((r) => setVideos(r.data)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color="#fff" />;

  return (
    <FlatList
      data={videos}
      keyExtractor={(v) => v.id}
      pagingEnabled
      showsVerticalScrollIndicator={false}
      snapToInterval={height}
      decelerationRate="fast"
      initialScrollIndex={startIndex}
      getItemLayout={(data, index) => ({ length: height, offset: height * index, index })}
      onViewableItemsChanged={onViewableItemsChanged}
      viewabilityConfig={viewabilityConfig}
      renderItem={({ item, index }) => (
        <View style={styles.slide}>
          <FeedVideoPlayer
            uri={item.url}
            poster={item.thumbnailUrl}
            isActive={isFocused && index === activeIndex}
            variant="fullscreen"
            onPressBody={() => {}}
          />
          <TouchableOpacity
            style={[styles.backButton, { top: insets.top + 10 }]}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          {!!item.caption && (
            <View style={[styles.overlay, { bottom: 40 + insets.bottom }]} pointerEvents="none">
              <Text style={styles.caption}>{item.caption}</Text>
            </View>
          )}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  slide: { width, height, backgroundColor: "#000" },
  backButton: { position: "absolute", left: 16 },
  overlay: { position: "absolute", left: 16, right: 16 },
  caption: { color: "#fff", fontSize: 14 },
});
