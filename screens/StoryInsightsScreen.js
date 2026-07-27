import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import client from "../api/client";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

const REACTION_EMOJI = { like: "👍", love: "❤️", haha: "😆", wow: "😮", sad: "😢", angry: "😡" };
const TABS = ["Views", "Reactions", "Reshares"];

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function StoryInsightsScreen({ route }) {
  const { storyId } = route.params;
  const [insights, setInsights] = useState(null);
  const [tab, setTab] = useState("Views");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    client.get(`/stories/${storyId}/insights`).then((r) => setInsights(r.data)).finally(() => setLoading(false));
  }, [storyId]);

  if (loading || !insights) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const data = tab === "Views" ? insights.views : tab === "Reactions" ? insights.reactions : insights.reshares;

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {TABS.map((t) => {
          const count = t === "Views" ? insights.views.length : t === "Reactions" ? insights.reactions.length : insights.reshares.length;
          return (
            <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t} · {count}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={data}
        keyExtractor={(item, i) => `${item.user?.id}-${i}`}
        contentContainerStyle={{ padding: 12 }}
        ListEmptyComponent={<Text style={styles.empty}>No {tab.toLowerCase()} yet</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.user?.avatar} name={item.user?.name} style={styles.avatar} />
            <Text style={styles.name}>{item.user?.name}</Text>
            {tab === "Views" && <Text style={styles.meta}>{timeAgo(item.viewedAt)}</Text>}
            {tab === "Reactions" && <Text style={styles.reactionEmoji}>{REACTION_EMOJI[item.reaction] || ""}</Text>}
            {tab === "Reshares" && <Text style={styles.meta}>{timeAgo(item.createdAt)}</Text>}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  tabRow: { flexDirection: "row", backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  tab: { flex: 1, alignItems: "center", paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText: { color: COLORS.sub, fontWeight: "700", fontSize: 12.5 },
  tabTextActive: { color: COLORS.accent },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, marginBottom: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19 },
  name: { flex: 1, fontWeight: "700", fontSize: 14, color: COLORS.ink },
  meta: { fontSize: 12, color: COLORS.sub },
  reactionEmoji: { fontSize: 18 },
  empty: { textAlign: "center", color: "#999", marginTop: 30 },
});
