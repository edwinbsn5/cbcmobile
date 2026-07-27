import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

export default function FollowListScreen({ route, navigation }) {
  const { userId, mode } = route.params; // mode: "followers" | "following"
  const { user: me } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    navigation.setOptions({ title: mode === "followers" ? "Followers" : "Following" });
    client.get(`/users/${userId}/${mode}`).then((r) => setList(r.data)).finally(() => setLoading(false));
  }, [userId, mode, navigation]);

  async function handleToggleFollow(item) {
    setBusyId(item.id);
    try {
      const path = item.amIFollowing ? "unfollow" : "follow";
      const { data } = await client.post(`/users/${item.id}/${path}`);
      setList((prev) => prev.map((u) => (u.id === item.id ? { ...u, amIFollowing: data.amIFollowing } : u)));
    } catch (e) {
      Alert.alert("Couldn't update follow status", e.response?.data?.error || e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleMessage(item) {
    setBusyId(item.id);
    try {
      const { data } = await client.post("/inbox/start", { userId: item.id });
      navigation.navigate("Chat", { conversationId: data.id, otherUser: data.otherUser });
    } catch (e) {
      Alert.alert("Couldn't start chat", e.response?.data?.error || e.message);
    } finally {
      setBusyId(null);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={list}
      keyExtractor={(u) => u.id}
      ListEmptyComponent={<Text style={styles.empty}>{mode === "followers" ? "No followers yet" : "Not following anyone yet"}</Text>}
      renderItem={({ item }) => {
        const isMe = item.id === me?.id;
        const busy = busyId === item.id;
        return (
          <View style={styles.row}>
            <TouchableOpacity style={styles.identity} onPress={() => navigation.push("UserProfile", { userId: item.id })}>
              <Avatar uri={item.avatar} name={item.name} style={styles.avatar} />
              <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
            </TouchableOpacity>
            {!isMe && (
              <View style={styles.actions}>
                <TouchableOpacity style={styles.messageButton} onPress={() => handleMessage(item)} disabled={busy}>
                  <Text style={styles.messageButtonText}>Message</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.followButton, item.amIFollowing && styles.followingButton]}
                  onPress={() => handleToggleFollow(item)}
                  disabled={busy}
                >
                  {busy ? (
                    <ActivityIndicator size="small" color={item.amIFollowing ? COLORS.accent : COLORS.accentInk} />
                  ) : (
                    <Text style={[styles.followButtonText, item.amIFollowing && styles.followingButtonText]}>
                      {item.amIFollowing ? "Unfollow" : "Follow back"}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, padding: 12, marginHorizontal: 10, marginTop: 8, borderRadius: 10, gap: 8 },
  identity: { flexDirection: "row", alignItems: "center", flex: 1, minWidth: 0 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 10 },
  name: { fontWeight: "600", fontSize: 15, color: COLORS.ink, flexShrink: 1 },
  actions: { flexDirection: "row", gap: 6 },
  messageButton: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10 },
  messageButtonText: { color: COLORS.ink, fontWeight: "700", fontSize: 12.5 },
  followButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 7, paddingHorizontal: 10, minWidth: 82, alignItems: "center" },
  followingButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  followButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 12.5 },
  followingButtonText: { color: COLORS.ink },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
