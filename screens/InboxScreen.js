import React, { useCallback, useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import Avatar from "../components/Avatar";
import { useInbox } from "../context/InboxContext";
import { COLORS } from "../theme";

const TABS = [
  { key: "inbox", label: "Inbox" },
  { key: "mtu_wako", label: "BSN & Services" },
  { key: "market", label: "Market" },
  { key: "events", label: "Events" },
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
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [deleting, setDeleting] = useState(false);
  const { refresh: refreshInboxBadge } = useInbox();
  const selectionMode = selectedIds.size > 0;

  const load = useCallback(async () => {
    const { data } = await client.get("/inbox");
    setConversations(data);
    refreshInboxBadge();
  }, [refreshInboxBadge]);

  useFocusEffect(
    useCallback(() => {
      load()
        .catch((e) => Alert.alert("Couldn't load inbox", e.response?.data?.error || e.message))
        .finally(() => setLoading(false));
    }, [load])
  );

  function clearSelection() {
    setSelectedIds(new Set());
  }

  function toggleSelect(id) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function confirmDeleteSelected() {
    const count = selectedIds.size;
    Alert.alert(
      count > 1 ? `Delete ${count} chats?` : "Delete chat?",
      "This only removes it from your Inbox — the other person will still see the conversation.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const ids = Array.from(selectedIds);
            setDeleting(true);
            try {
              await client.post("/inbox/delete-many", { conversationIds: ids });
              setConversations((prev) => prev.filter((c) => !ids.includes(c.id)));
              clearSelection();
              refreshInboxBadge();
            } catch (e) {
              Alert.alert("Couldn't delete", e.response?.data?.error || e.message);
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  React.useLayoutEffect(() => {
    if (selectionMode) {
      navigation.setOptions({
        headerLeft: () => (
          <TouchableOpacity onPress={clearSelection} style={{ marginLeft: 16 }}>
            <Text style={styles.newButtonText}>Cancel</Text>
          </TouchableOpacity>
        ),
        headerTitle: `${selectedIds.size} selected`,
        headerRight: () => (
          <TouchableOpacity onPress={confirmDeleteSelected} disabled={deleting} style={{ marginRight: 16 }}>
            <Ionicons name="trash-outline" size={22} color={deleting ? COLORS.sub : "#D32F2F"} />
          </TouchableOpacity>
        ),
      });
    } else {
      navigation.setOptions({
        headerLeft: undefined,
        headerTitle: "Inbox",
        headerRight: () => (
          <TouchableOpacity onPress={() => navigation.navigate("NewMessage")} style={{ marginRight: 16 }}>
            <Text style={styles.newButtonText}>New</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, selectionMode, selectedIds, deleting]);

  const tabCounts = useMemo(() => {
    const counts = { inbox: 0, mtu_wako: 0, market: 0, events: 0 };
    for (const c of conversations) counts[c.tab] = (counts[c.tab] || 0) + c.unreadCount;
    return counts;
  }, [conversations]);

  const rows = useMemo(() => conversations.filter((c) => c.tab === activeTab), [conversations, activeTab]);

  function openConversation(item) {
    if (selectionMode) {
      toggleSelect(item.id);
      return;
    }
    navigation.navigate("Chat", {
      conversationId: item.id,
      otherUser: item.otherUser,
      contextType: item.contextType,
      displayName: item.displayName,
      displayAvatar: item.displayAvatar,
      displaySubtitle: item.displaySubtitle,
      contextPage: item.contextPage,
      contextProduct: item.contextProduct,
      contextEvent: item.contextEvent,
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
            onPress={() => { clearSelection(); setActiveTab(t.key); }}
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
              : activeTab === "events"
              ? "No event organiser chats yet"
              : "No MarketPlace conversations yet"}
          </Text>
        }
        renderItem={({ item }) => {
          const isSelected = selectedIds.has(item.id);
          return (
          <TouchableOpacity
            style={[styles.row, isSelected && styles.rowSelected]}
            onPress={() => openConversation(item)}
            onLongPress={() => toggleSelect(item.id)}
          >
            {selectionMode && (
              <Ionicons
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={isSelected ? COLORS.accent : COLORS.sub}
                style={styles.checkbox}
              />
            )}
            {item.contextType === "market_product" || item.contextType === "event" ? (
              item.displayAvatar ? (
                <Image source={{ uri: item.displayAvatar }} style={styles.thumb} contentFit="cover" />
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
          );
        }}
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
  rowSelected: { backgroundColor: COLORS.wash, borderWidth: 1, borderColor: COLORS.accent },
  checkbox: { marginRight: 10 },
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
