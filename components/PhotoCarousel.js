import React, { useEffect, useRef, useState } from "react";
import { View, Image as RNImage, FlatList, Text, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { clampAspectRatio } from "../utils/videoAspect";

// Design 1 — swipe carousel: one photo fills the frame at a time, a "2/5"
// badge plus a dot pager show progress. Sized to the full device width since
// this always sits inside PostCard's full-bleed (edge-to-edge) media slot.
//
// Every slide shares one height, taken from the first photo's own (clamped)
// aspect ratio — matching FeedImage's single-photo behavior instead of
// forcing every post into the same fixed 4:5 box regardless of what was
// actually uploaded (vertical shots included). Locking to the first photo
// rather than remeasuring per-slide avoids the carousel resizing as you
// swipe between differently-shaped photos.
export default function PhotoCarousel({ photos }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [ratio, setRatio] = useState(null);
  const onScroll = useRef((e) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    setIndex((prev) => (i !== prev ? i : prev));
  }).current;

  useEffect(() => {
    let cancelled = false;
    RNImage.getSize(
      photos[0],
      (w, h) => {
        if (!cancelled && w && h) setRatio(w / h);
      },
      () => {}
    );
    return () => {
      cancelled = true;
    };
  }, [photos[0]]);

  const { displayRatio } = clampAspectRatio(ratio);
  const height = width / displayRatio;

  return (
    <View>
      <FlatList
        data={photos}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(uri, i) => `${i}-${uri}`}
        onScroll={onScroll}
        scrollEventThrottle={16}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        renderItem={({ item }) => <Image source={{ uri: item }} style={{ width, height }} contentFit="cover" />}
      />
      <View style={styles.countBadge}>
        <Text style={styles.countText}>{index + 1}/{photos.length}</Text>
      </View>
      <View style={styles.dots} pointerEvents="none">
        {photos.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  countBadge: {
    position: "absolute", top: 10, right: 10,
    backgroundColor: "rgba(4,20,17,0.55)", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  countText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  dots: { position: "absolute", bottom: 10, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 4 },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.5)" },
  dotActive: { width: 14, backgroundColor: "#fff" },
});
