import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import client from "../api/client";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

export default function NewMessageScreen({ navigation }) {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    client.get("/inbox/contacts").then((r) => setContacts(r.data))
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, []);

  async function handleStart(user) {
    setStarting(user.id);
    try {
      const { data } = await client.post("/inbox/start", { userId: user.id });
      navigation.replace("Chat", { conversationId: data.id, otherUser: data.otherUser });
    } catch (e) {
      Alert.alert("Couldn't start conversation", e.response?.data?.error || e.message);
    } finally {
      setStarting(null);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={contacts}
      keyExtractor={(u) => u.id}
      ListEmptyComponent={
        <Text style={styles.empty}>
          {loadError ? "Couldn't load contacts. Pull down to retry." : "No other users to message yet"}
        </Text>
      }
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => handleStart(item)} disabled={starting === item.id}>
          <Avatar uri={item.avatar} name={item.name} style={styles.avatar} />
          <Text style={styles.name}>{item.name}</Text>
          {starting === item.id && <ActivityIndicator style={{ marginLeft: "auto" }} color={COLORS.accent} />}
        </TouchableOpacity>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, padding: 12, marginHorizontal: 10, marginTop: 8, borderRadius: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  name: { color: COLORS.ink, fontWeight: "600", fontSize: 15 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
