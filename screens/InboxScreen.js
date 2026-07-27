import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function InboxScreen({ navigation }) {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await client.get("/inbox");
    setConversations(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={() => navigation.navigate("NewMessage")} style={{ marginRight: 16 }}>
          <Text style={styles.newButtonText}>New</Text>
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={conversations}
      keyExtractor={(c) => c.id}
      ListEmptyComponent={<Text style={styles.empty}>No conversations yet — tap "New" to message someone</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.row}
          onPress={() => navigation.navigate("Chat", { conversationId: item.id, otherUser: item.otherUser })}
        >
          <Avatar uri={item.otherUser?.avatar} name={item.otherUser?.name} style={styles.avatar} />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.otherUser?.name}</Text>
            <Text style={[styles.preview, item.unreadCount > 0 && styles.previewUnread]} numberOfLines={1}>
              {item.lastMessagePreview || "Say hello 👋"}
            </Text>
          </View>
          <View style={styles.meta}>
            <Text style={styles.time}>{timeAgo(item.lastMessageAt)}</Text>
            {item.unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.unreadCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  newButtonText: { color: COLORS.accent, fontWeight: "700", fontSize: 15 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, padding: 12, marginHorizontal: 10, marginTop: 8, borderRadius: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  name: { fontWeight: "700", fontSize: 15 },
  preview: { color: COLORS.sub, marginTop: 2 },
  previewUnread: { color: COLORS.ink, fontWeight: "600" },
  meta: { alignItems: "flex-end" },
  time: { color: COLORS.sub, fontSize: 12 },
  badge: { backgroundColor: COLORS.accent, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", marginTop: 4, paddingHorizontal: 5 },
  badgeText: { color: COLORS.accentInk, fontSize: 11, fontWeight: "700" },
  empty: { textAlign: "center", color: "#999", marginTop: 40, paddingHorizontal: 20 },
});
