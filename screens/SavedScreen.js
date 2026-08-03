import React, { useCallback, useState } from "react";
import { View, Text, Image, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import PostCard from "../components/PostCard";
import { useReshared } from "../hooks/useReshared";
import { COLORS } from "../theme";

const TABS = ["Posts", "Reels", "Groups", "Events"];

function formatWhen(startAt) {
  return new Date(startAt).toLocaleString([], { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function SavedScreen({ navigation }) {
  const [tab, setTab] = useState("Posts");
  const [saved, setSaved] = useState({ posts: [], reels: [], groups: [], events: [] });
  const [loading, setLoading] = useState(true);
  const { isReshared, unreshare, loadReshared } = useReshared();

  const load = useCallback(() => {
    client.get("/saved").then((r) => setSaved(r.data))
      .catch((e) => Alert.alert("Couldn't load saved items", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
    loadReshared();
  }, [loadReshared]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function unsave(itemType, itemId) {
    await client.post(`/saved/${itemType}/${itemId}/remove`);
    load();
  }

  // A saved post can be a group post, which lives behind its own
  // group-scoped react/delete routes rather than /feed/:id — look up which
  // one this save actually needs from the already-loaded list.
  function groupIdFor(postId) {
    return saved.posts.find((p) => p.id === postId)?.groupId || null;
  }

  async function handleReact(postId, reaction) {
    try {
      const groupId = groupIdFor(postId);
      if (groupId) await client.post(`/groups/${groupId}/posts/${postId}/react`, { reaction });
      else await client.post(`/feed/${postId}/react`, { reaction });
      load();
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
  }

  async function handleDeletePost(postId) {
    try {
      const groupId = groupIdFor(postId);
      if (groupId) await client.delete(`/groups/${groupId}/posts/${postId}`);
      else await client.delete(`/feed/${postId}`);
      load();
    } catch (e) {
      Alert.alert("Couldn't delete post", e.response?.data?.error || e.message);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <View style={styles.container}>
      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === "Posts" && (
        <FlatList
          data={saved.posts}
          keyExtractor={(p) => p.id}
          ListEmptyComponent={<Text style={styles.empty}>No saved posts yet</Text>}
          renderItem={({ item }) => (
            <PostCard
              post={item}
              onReact={handleReact}
              isSaved={true}
              onToggleSave={() => unsave("post", item.id)}
              isReshared={isReshared(item.id)}
              onUnreshare={() => unreshare(item.id)}
              onDelete={handleDeletePost}
              onChanged={load}
            />
          )}
        />
      )}

      {tab === "Reels" && (
        <FlatList
          data={saved.reels}
          keyExtractor={(r) => r.id}
          ListEmptyComponent={<Text style={styles.empty}>No saved reels yet</Text>}
          contentContainerStyle={{ padding: 10 }}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <Image source={{ uri: item.thumbnailUrl }} style={styles.reelThumb} resizeMode="cover" />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.caption || "(no caption)"}</Text>
                <Text style={styles.cardMeta}>by {item.author?.name}</Text>
                <TouchableOpacity style={styles.unsaveButton} onPress={() => unsave("reel", item.id)}>
                  <Text style={styles.unsaveText}>Unsave</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {tab === "Groups" && (
        <FlatList
          data={saved.groups}
          keyExtractor={(g) => g.id}
          ListEmptyComponent={<Text style={styles.empty}>No saved groups yet</Text>}
          contentContainerStyle={{ padding: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("GroupDetail", { groupId: item.id })}>
              <Image source={{ uri: item.coverUrl }} style={styles.groupCover} resizeMode="cover" />
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>Admin: {item.admin?.name}</Text>
                <TouchableOpacity style={styles.unsaveButton} onPress={() => unsave("group", item.id)}>
                  <Text style={styles.unsaveText}>Unsave</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {tab === "Events" && (
        <FlatList
          data={saved.events}
          keyExtractor={(e) => e.id}
          ListEmptyComponent={<Text style={styles.empty}>No saved events yet</Text>}
          contentContainerStyle={{ padding: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => navigation.navigate("EventDetail", { eventId: item.id })}>
              <View style={styles.cardBody}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.cardMeta}>{formatWhen(item.startAt)}</Text>
                <Text style={styles.cardMeta}>Hosted by {item.host?.name}</Text>
                <TouchableOpacity style={styles.unsaveButton} onPress={() => unsave("event", item.id)}>
                  <Text style={styles.unsaveText}>Unsave</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  tabRow: { flexDirection: "row", backgroundColor: COLORS.surface, padding: 8 },
  tab: { flex: 1, alignItems: "center", paddingVertical: 8, borderRadius: 8 },
  tabActive: { backgroundColor: COLORS.wash },
  tabText: { color: COLORS.sub, fontWeight: "600", fontSize: 13 },
  tabTextActive: { color: COLORS.accent },
  card: { backgroundColor: COLORS.surface, borderRadius: 10, marginBottom: 10, overflow: "hidden", flexDirection: "row" },
  reelThumb: { width: 90, height: 90, backgroundColor: "#eee" },
  groupCover: { width: 90, height: 90, backgroundColor: "#eee" },
  cardBody: { flex: 1, padding: 12 },
  cardTitle: { color: COLORS.ink, fontSize: 15, fontWeight: "700" },
  cardMeta: { color: COLORS.sub, fontSize: 12, marginTop: 4 },
  unsaveButton: { alignSelf: "flex-start", marginTop: 8 },
  unsaveText: { color: "#D32F2F", fontWeight: "600", fontSize: 13 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
