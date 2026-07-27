import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../theme";

const TIPS = [
  {
    icon: "sunny-outline",
    title: "Shoot in good light",
    body: "Film facing a window or outdoors during the day. Avoid backlighting (don't film with a bright window behind you) — voters scroll fast, and a dark or grainy video gets skipped in the first second.",
  },
  {
    icon: "flash-outline",
    title: "Hook them in the first 2 seconds",
    body: "Open with the most interesting moment, not a slow intro. Ask a question, show the punchline first, or start mid-action — you're competing with every other video in the grid.",
  },
  {
    icon: "layers-outline",
    title: "Structure: Hook → Body → Call to action",
    body: "Hook (grab attention) → Body (deliver the actual content — the dance, the joke, the skill) → Call to action (\"Vote for me!\", \"Share this if you laughed\"). Videos with a clear ask get more votes than ones that just end.",
  },
  {
    icon: "color-wand-outline",
    title: "Use simple effects, don't overdo them",
    body: "A little editing (cuts on the beat, text captions, a filter that matches the mood) makes a video feel intentional. Too many effects or shaky transitions distract from what you're actually showing.",
  },
  {
    icon: "sparkles-outline",
    title: "Be original",
    body: "The judges and voters have seen the obvious take on every challenge. Add your own twist — your personality, your location, your style — rather than copying someone else's exact video.",
  },
  {
    icon: "time-outline",
    title: "Keep it short",
    body: "15–30 seconds is usually enough. A tight, well-edited short video holds attention better than a long one padded with dead air.",
  },
  {
    icon: "chatbubble-ellipses-outline",
    title: "Write a caption that asks for the vote",
    body: "\"Vote for me if this made you laugh 😂\" outperforms no caption at all. Tell people what you want them to do.",
  },
  {
    icon: "share-social-outline",
    title: "Share your code",
    body: "Every submission gets a short code (e.g. #K7F92X). Send it to friends so they can jump straight to your video and rate it — don't rely on people finding you in the random grid.",
  },
];

export default function StarTipsScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.heading}>How to win</Text>
      <Text style={styles.subheading}>Simple things that make a real difference to your score.</Text>

      {TIPS.map((tip) => (
        <View key={tip.title} style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name={tip.icon} size={18} color={COLORS.accent} />
          </View>
          <View style={styles.textWrap}>
            <Text style={styles.cardTitle}>{tip.title}</Text>
            <Text style={styles.cardBody}>{tip.body}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  heading: { fontSize: 20, fontWeight: "800", color: COLORS.ink },
  subheading: { fontSize: 13, color: COLORS.sub, marginTop: 4, marginBottom: 16 },
  card: { flexDirection: "row", gap: 12, backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 10 },
  iconWrap: { width: 34, height: 34, borderRadius: 10, backgroundColor: COLORS.wash, alignItems: "center", justifyContent: "center" },
  textWrap: { flex: 1 },
  cardTitle: { fontSize: 14, fontWeight: "800", color: COLORS.ink, marginBottom: 4 },
  cardBody: { fontSize: 12.5, color: COLORS.sub, lineHeight: 18 },
});
