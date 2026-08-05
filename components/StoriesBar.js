import React from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import Avatar from "./Avatar";
import { COLORS } from "../theme";

function CardBackground({ story }) {
  if (!story) return <View style={[styles.cardBg, styles.emptyCardBg]} />;
  if (story.type === "video") {
    if (story.thumbnailUrl) {
      return <Image source={{ uri: story.thumbnailUrl }} style={styles.cardBg} contentFit="cover" />;
    }
    return (
      <View style={[styles.cardBg, styles.videoPlaceholder]}>
        <Ionicons name="videocam" size={22} color="rgba(255,255,255,0.85)" />
      </View>
    );
  }
  if (story.type === "text") {
    return (
      <View style={[styles.cardBg, styles.textCardBg, { backgroundColor: story.bgColor || COLORS.accent }]}>
        <Text
          style={[styles.textCardContent, { color: story.textColor || "#FFFFFF", textAlign: story.textAlign || "center" }]}
          numberOfLines={4}
        >
          {story.content}
        </Text>
      </View>
    );
  }
  return <Image source={{ uri: story.mediaUrl }} style={styles.cardBg} contentFit="cover" />;
}

export default function StoriesBar({ storyGroups, myUserId, onOpenStory, onAddStory }) {
  const myGroup = storyGroups.find((g) => g.author.id === myUserId);
  const otherGroups = storyGroups.filter((g) => g.author.id !== myUserId);
  const myHasUnseen = myGroup?.stories.some((s) => !s.viewedByMe);

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.bar} contentContainerStyle={{ paddingHorizontal: 10 }}>
      <TouchableOpacity style={styles.card} onPress={() => (myGroup ? onOpenStory(myGroup) : onAddStory())} activeOpacity={0.85}>
        <CardBackground story={myGroup?.stories[0]} />
        <View style={styles.cardOverlay} />
        <View style={[styles.avatarRing, myGroup && !myHasUnseen && styles.avatarRingSeen]}>
          <Avatar uri={myGroup?.author.avatar} name={myGroup?.author.name} style={styles.avatar} />
        </View>
        <TouchableOpacity style={styles.addBadge} onPress={onAddStory} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="add" size={15} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.cardLabel}>Your Story</Text>
      </TouchableOpacity>

      {otherGroups.map((group) => {
        const hasUnseen = group.stories.some((s) => !s.viewedByMe);
        return (
          <TouchableOpacity key={group.author.id} style={styles.card} onPress={() => onOpenStory(group)} activeOpacity={0.85}>
            <CardBackground story={group.stories[0]} />
            <View style={styles.cardOverlay} />
            <View style={[styles.avatarRing, !hasUnseen && styles.avatarRingSeen]}>
              <Avatar uri={group.author.avatar} name={group.author.name} style={styles.avatar} />
            </View>
            <Text style={styles.cardLabel} numberOfLines={1}>{group.author.name.split(" ")[0]}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  bar: { paddingVertical: 10, backgroundColor: COLORS.surface },
  card: { width: 92, height: 152, borderRadius: 14, overflow: "hidden", marginRight: 10, backgroundColor: COLORS.wash },
  cardBg: { position: "absolute", width: "100%", height: "100%" },
  emptyCardBg: { backgroundColor: COLORS.wash },
  videoPlaceholder: { backgroundColor: "#1a1a1a", alignItems: "center", justifyContent: "center" },
  textCardBg: { alignItems: "center", justifyContent: "center", padding: 8 },
  textCardContent: { fontSize: 11, fontWeight: "700" },
  cardOverlay: { position: "absolute", width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.18)" },
  avatarRing: {
    position: "absolute", top: 8, left: 8, width: 32, height: 32, borderRadius: 16, borderWidth: 2.5,
    borderColor: COLORS.accent, alignItems: "center", justifyContent: "center", backgroundColor: COLORS.surface,
  },
  avatarRingSeen: { borderColor: "rgba(255,255,255,0.55)" },
  avatar: { width: 26, height: 26, borderRadius: 13 },
  addBadge: {
    position: "absolute", top: 28, left: 28, width: 18, height: 18, borderRadius: 9,
    backgroundColor: COLORS.accent, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff",
  },
  cardLabel: {
    position: "absolute", bottom: 8, left: 8, right: 8, color: "#fff", fontSize: 12, fontWeight: "700",
    textShadowColor: "rgba(0,0,0,0.6)", textShadowRadius: 3,
  },
});
