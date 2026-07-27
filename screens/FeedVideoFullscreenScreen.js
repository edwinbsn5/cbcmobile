import React from "react";
import { View, FlatList, Dimensions, StyleSheet, TouchableOpacity } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import FeedVideoPlayer from "../components/FeedVideoPlayer";
import { useSingleActiveVideo } from "../hooks/useSingleActiveVideo";

const { height } = Dimensions.get("window");

// Facebook "Watch"-style fullscreen overlay, entered by tapping a Feed
// video's body. Same paging-FlatList shape as ReelsScreen.js/
// GroupVideoPlayerScreen.js — swipe up/down moves through the feed's other
// videos in order. Pushed as a plain stack screen (see App.js), so
// native-stack's default keep-mounted-underneath behavior returns the
// caller to its exact prior scroll position on back, with no extra work.
export default function FeedVideoFullscreenScreen({ route, navigation }) {
  const { videos, startIndex = 0 } = route.params;
  const isFocused = useIsFocused();
  const { activeIndex, viewabilityConfig, onViewableItemsChanged } = useSingleActiveVideo({ threshold: 80 });

  return (
    <View style={styles.container}>
      <FlatList
        data={videos}
        keyExtractor={(item) => item.id}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
        decelerationRate="fast"
        initialScrollIndex={startIndex}
        getItemLayout={(data, index) => ({ length: height, offset: height * index, index })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        renderItem={({ item, index }) => (
          <FeedVideoPlayer
            uri={item.mediaUrl}
            poster={item.thumbnailUrl}
            isActive={isFocused && index === activeIndex}
            variant="fullscreen"
            onPressBody={() => {}}
          />
        )}
      />
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <Ionicons name="chevron-back" size={26} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  backButton: { position: "absolute", top: 50, left: 16 },
});
