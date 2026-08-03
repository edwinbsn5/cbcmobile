import React, { useEffect, useRef, useState } from "react";
import { View, Text, TextInput, Image, TouchableOpacity, SectionList, StyleSheet, ActivityIndicator } from "react-native";
import client from "../api/client";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState({ users: [], groups: [], posts: [] });
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults({ users: [], groups: [], posts: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await client.get("/search", { params: { q: trimmed } });
        setResults(data);
      } catch (e) {
        // stay quiet — a failed search shouldn't throw up an alert on every keystroke
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const sections = [
    { key: "users", title: "Users", data: results.users },
    { key: "groups", title: "Groups", data: results.groups },
    { key: "posts", title: "Posts", data: results.posts },
  ].filter((s) => s.data.length > 0);

  function renderItem({ item, section }) {
    if (section.key === "users") {
      return (
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("UserProfile", { userId: item.id })}>
          <Avatar uri={item.avatar} name={item.name} style={styles.avatar} />
          <Text style={styles.rowTitle}>{item.name}</Text>
        </TouchableOpacity>
      );
    }
    if (section.key === "groups") {
      return (
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("GroupDetail", { groupId: item.id })}>
          <Image source={{ uri: item.coverUrl }} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle}>{item.name}</Text>
            {!!item.description && <Text style={styles.rowSubtitle} numberOfLines={1}>{item.description}</Text>}
          </View>
        </TouchableOpacity>
      );
    }
    return (
      <TouchableOpacity style={styles.row} onPress={() => item.author?.id && navigation.navigate("UserProfile", { userId: item.author.id })}>
        <Avatar uri={item.author?.avatar} name={item.author?.name} style={styles.avatar} />
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{item.author?.name} <Text style={styles.rowMeta}>· {timeAgo(item.createdAt)}</Text></Text>
          <Text style={styles.rowSubtitle} numberOfLines={2}>{item.content}</Text>
        </View>
      </TouchableOpacity>
    );
  }

  const trimmed = query.trim();

  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search users, groups, posts..."
          value={query}
          onChangeText={setQuery}
          autoFocus
          autoCapitalize="none"
        />
        {loading && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginLeft: 8 }} />}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item, i) => `${item.id}-${i}`}
        renderItem={renderItem}
        renderSectionHeader={({ section }) => <Text style={styles.sectionHeader}>{section.title}</Text>}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          trimmed.length >= 2 && !loading ? (
            <Text style={styles.empty}>No results for "{trimmed}"</Text>
          ) : trimmed.length > 0 ? (
            <Text style={styles.empty}>Keep typing...</Text>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  searchBar: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, margin: 10, borderRadius: 8, paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 10, fontSize: 15, color: COLORS.ink },
  sectionHeader: { fontWeight: "700", fontSize: 13, color: COLORS.sub, textTransform: "uppercase", backgroundColor: COLORS.bg, paddingHorizontal: 14, paddingTop: 14, paddingBottom: 6 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, padding: 12, marginHorizontal: 10, marginBottom: 6, borderRadius: 8 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12, backgroundColor: "#eee" },
  rowTitle: { color: COLORS.ink, fontWeight: "600", fontSize: 15 },
  rowSubtitle: { color: COLORS.sub, fontSize: 13, marginTop: 2 },
  rowMeta: { color: COLORS.sub, fontWeight: "400", fontSize: 12 },
  empty: { textAlign: "center", color: "#999", marginTop: 30 },
});
