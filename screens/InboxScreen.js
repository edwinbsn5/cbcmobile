import React, { useCallback, useMemo, useState } from "react";
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import Avatar from "../components/Avatar";
import { useInbox } from "../context/InboxContext";
import { COLORS } from "../theme";

const TABS = [
  { key: "inbox", label: "Inbox" },
  { key: "mtu_wako", label: "Mtu Wako" },
  { key: "market", label: "Market" },
];

function timeAgo(ts) {
  const mins = Math.floor((Date.now() - ts) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function InboxScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("inbox");
  const { refresh: refreshInboxBadge } = useInbox();

  const load = useCallback(async () => {
    const { data } = await client.get("/inbox");
    setConversations(data);
    refreshInboxBadge();
  }, [refreshInboxBadge]);

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

  const tabCounts = useMemo(() => {
    const counts = { inbox: 0, mtu_wako: 0, market: 0 };
    for (const c of conversations) counts[c.tab] = (counts[c.tab] || 0) + c.unreadCount;
    return counts;
  }, [conversations]);

  const rows = useMemo(() => conversations.filter((c) => c.tab === activeTab), [conversations, activeTab]);

  function openConversation(item) {
    navigation.navigate("Chat", {
      conversationId: item.id,
      otherUser: item.otherUser,
      contextType: item.contextType,
      displayName: item.displayName,
      displayAvatar: item.displayAvatar,
      displaySubtitle: item.displaySubtitle,
      contextPage: item.contextPage,
      contextProduct: item.contextProduct,
    });
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <View style={styles.container}>
      <View style={styles.segRow}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[styles.seg, activeTab === t.key && styles.segActive]}
            onPress={() => setActiveTab(t.key)}
          >
            <Text style={[styles.segLabel, activeTab === t.key && styles.segLabelActive]}>{t.label}</Text>
            {tabCounts[t.key] > 0 && (
              <View style={[styles.segCount, activeTab === t.key && styles.segCountActive]}>
                <Text style={[styles.segCountText, activeTab === t.key && styles.segCountTextActive]}>
                  {tabCounts[t.key] > 9 ? "9+" : tabCounts[t.key]}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={{ paddingBottom: insets.bottom + 12 }}
        data={rows}
        keyExtractor={(c) => c.id}
        ListEmptyComponent={
          <Text style={styles.empty}>
            {activeTab === "inbox"
              ? 'No conversations yet — tap "New" to message someone'
              : activeTab === "mtu_wako"
              ? "No messages from Pages yet"
              : "No A Girls Market conversations yet"}
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => openConversation(item)}>
            {item.contextType === "market_product" ? (
              item.displayAvatar ? (
                <Image source={{ uri: item.displayAvatar }} style={styles.thumb} />
              ) : (
                <View style={[styles.thumb, styles.thumbPlaceholder]} />
              )
            ) : (
              <Avatar uri={item.displayAvatar} name={item.displayName} style={styles.avatar} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{item.displayName}</Text>
              {!!item.displaySubtitle && <Text style={styles.subtitle} numberOfLines={1}>{item.displaySubtitle}</Text>}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  newButtonText: { color: COLORS.accent, fontWeight: "700", fontSize: 15 },
  segRow: { flexDirection: "row", backgroundColor: COLORS.surface, padding: 8, gap: 6 },
  seg: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 9, borderRadius: 8 },
  segActive: { backgroundColor: COLORS.accentInk },
  segLabel: { fontSize: 12.5, fontWeight: "700", color: COLORS.sub },
  segLabelActive: { color: "#fff" },
  segCount: { minWidth: 18, height: 18, borderRadius: 9, backgroundColor: COLORS.sub, alignItems: "center", justifyContent: "center", paddingHorizontal: 4 },
  segCountActive: { backgroundColor: COLORS.accent },
  segCountText: { color: "#fff", fontSize: 10, fontWeight: "800" },
  segCountTextActive: { color: COLORS.accentInk },
  list: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, padding: 12, marginHorizontal: 10, marginTop: 8, borderRadius: 10 },
  avatar: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  thumb: { width: 48, height: 48, borderRadius: 8, marginRight: 12, backgroundColor: COLORS.wash },
  thumbPlaceholder: { backgroundColor: COLORS.wash },
  name: { fontWeight: "700", fontSize: 15, color: COLORS.ink },
  subtitle: { color: COLORS.accent, fontSize: 12, fontWeight: "600", marginTop: 1 },
  preview: { color: COLORS.sub, marginTop: 2 },
  previewUnread: { color: COLORS.ink, fontWeight: "600" },
  meta: { alignItems: "flex-end" },
  time: { color: COLORS.sub, fontSize: 12 },
  badge: { backgroundColor: COLORS.accent, borderRadius: 10, minWidth: 20, height: 20, alignItems: "center", justifyContent: "center", marginTop: 4, paddingHorizontal: 5 },
  badgeText: { color: COLORS.accentInk, fontSize: 11, fontWeight: "700" },
  empty: { textAlign: "center", color: "#999", marginTop: 40, paddingHorizontal: 20 },
});
