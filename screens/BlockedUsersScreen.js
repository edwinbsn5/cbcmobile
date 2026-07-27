import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

export default function BlockedUsersScreen() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    client.get("/users/blocked/mine").then((r) => setBlocked(r.data)).finally(() => setLoading(false));
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  function handleUnblock(user) {
    Alert.alert(`Unblock ${user.name}?`, "They'll be able to follow and message you again.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Unblock",
        onPress: async () => {
          await client.post(`/users/${user.id}/unblock`);
          load();
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={blocked}
      keyExtractor={(u) => u.id}
      contentContainerStyle={{ padding: 12 }}
      ListEmptyComponent={<Text style={styles.empty}>You haven't blocked anyone</Text>}
      renderItem={({ item }) => (
        <View style={styles.row}>
          <Avatar uri={item.avatar} name={item.name} style={styles.avatar} />
          <Text style={styles.name}>{item.name}</Text>
          <TouchableOpacity style={styles.unblockButton} onPress={() => handleUnblock(item)}>
            <Text style={styles.unblockButtonText}>Unblock</Text>
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  row: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, marginBottom: 8 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  name: { flex: 1, fontWeight: "700", fontSize: 14, color: COLORS.ink },
  unblockButton: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  unblockButtonText: { color: COLORS.accent, fontWeight: "700", fontSize: 12.5 },
  empty: { textAlign: "center", color: "#999", marginTop: 30 },
});
