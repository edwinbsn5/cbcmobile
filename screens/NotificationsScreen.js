import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import { useNotifications } from "../context/NotificationContext";
import { navigateForData } from "../utils/notificationNav";
import { COLORS } from "../theme";

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function NotificationsScreen({ navigation }) {
  const { refresh } = useNotifications();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data } = await client.get("/notifications");
    setNotifications(data);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  React.useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={handleMarkAllRead} style={{ marginRight: 16 }}>
          <Text style={styles.markAllText}>Mark all read</Text>
        </TouchableOpacity>
      ),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigation]);

  async function handleMarkAllRead() {
    await client.post("/notifications/read-all");
    await load();
    await refresh();
  }

  async function handlePress(notification) {
    if (!notification.readAt) {
      await client.post(`/notifications/${notification.id}/read`);
      setNotifications((prev) => prev.map((n) => (n.id === notification.id ? { ...n, readAt: Date.now() } : n)));
      refresh();
    }
    navigateForData(navigation, notification.data);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={notifications}
      keyExtractor={(n) => n.id}
      ListEmptyComponent={<Text style={styles.empty}>No notifications yet</Text>}
      renderItem={({ item }) => (
        <TouchableOpacity style={[styles.row, !item.readAt && styles.rowUnread]} onPress={() => handlePress(item)}>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{item.title}</Text>
            {!!item.body && <Text style={styles.body} numberOfLines={2}>{item.body}</Text>}
          </View>
          <Text style={styles.time}>{timeAgo(item.createdAt)}</Text>
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  markAllText: { color: COLORS.accent, fontWeight: "700", fontSize: 13 },
  row: { flexDirection: "row", alignItems: "flex-start", backgroundColor: COLORS.surface, padding: 14, marginHorizontal: 10, marginTop: 8, borderRadius: 10 },
  rowUnread: { borderLeftWidth: 3, borderLeftColor: COLORS.accent },
  title: { fontWeight: "700", fontSize: 15 },
  body: { color: COLORS.sub, marginTop: 3 },
  time: { color: COLORS.sub, fontSize: 12, marginLeft: 8 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
