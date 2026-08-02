import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import PostCard from "../components/PostCard";
import { useSaved } from "../hooks/useSaved";
import { COLORS } from "../theme";

// The screen a tapped #hashtag link routes to (LinkifiedText) — a hashtag's
// own public search feed, backed by GET /api/hashtags/:tag/posts.
export default function HashtagFeedScreen({ route }) {
  const { tag } = route.params;
  const [hashtag, setHashtag] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isSaved, toggleSave, loadSaved } = useSaved();

  const load = useCallback(() => {
    client.get(`/hashtags/${tag}/posts`).then((r) => {
      setHashtag(r.data.hashtag);
      setPosts(r.data.posts);
    }).catch((e) => Alert.alert("Couldn't load hashtag", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
    loadSaved();
  }, [tag]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function handleReact(postId, reaction) {
    try {
      const post = posts.find((p) => p.id === postId);
      const path = post?.pageId ? `/pages/${post.pageId}/feed/${postId}/react` : `/feed/${postId}/react`;
      await client.post(path, { reaction });
      load();
    } catch (e) {
      Alert.alert("Couldn't react", e.response?.data?.error || e.message);
    }
  }

  async function handleDeletePost(postId) {
    try {
      const post = posts.find((p) => p.id === postId);
      const path = post?.pageId ? `/pages/${post.pageId}/feed/${postId}` : `/feed/${postId}`;
      await client.delete(path);
      load();
    } catch (e) {
      Alert.alert("Couldn't delete post", e.response?.data?.error || e.message);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={posts}
      keyExtractor={(p) => p.id}
      ListHeaderComponent={
        <View style={styles.header}>
          <Text style={styles.tag}>#{tag}</Text>
          {!!hashtag && <Text style={styles.count}>{hashtag.usageCount} post{hashtag.usageCount === 1 ? "" : "s"}</Text>}
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No posts with #{tag} yet</Text>}
      renderItem={({ item }) => (
        <PostCard
          post={item}
          onReact={handleReact}
          isSaved={isSaved("post", item.id)}
          onToggleSave={() => toggleSave("post", item.id)}
          onDelete={handleDeletePost}
          onChanged={load}
        />
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { padding: 16 },
  tag: { fontSize: 22, fontWeight: "800", color: COLORS.ink },
  count: { color: COLORS.sub, fontSize: 13, marginTop: 4 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
