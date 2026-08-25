import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

export default function WallOfShameScreen() {
  const [entries, setEntries] = useState(null);

  useFocusEffect(useCallback(() => {
    client.get("/wall-of-shame").then((r) => setEntries(r.data)).catch((e) => Alert.alert("Couldn't load", e.response?.data?.error || e.message));
  }, []));

  if (!entries) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={entries}
      keyExtractor={(e) => e.id}
      ListHeaderComponent={
        <View style={styles.hero}>
          <Ionicons name="warning-outline" size={22} color="#D32F2F" />
          <Text style={styles.heroTitle}>Wall of Shame</Text>
          <Text style={styles.heroSubtitle}>
            Confirmed fraud rulings only — every entry follows an investigation and a 14-day appeal window. This is not a legal finding of fraud.
          </Text>
        </View>
      }
      ListEmptyComponent={<Text style={styles.empty}>No confirmed cases — that's a good sign.</Text>}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Image source={{ uri: item.user?.avatar }} style={styles.avatar} contentFit="cover" />
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.user?.name || "(deleted account)"}</Text>
            <Text style={styles.summary}>{item.summary}</Text>
            <Text style={styles.date}>Listed {new Date(item.listedAt).toLocaleDateString()}</Text>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: { backgroundColor: COLORS.surface, margin: 12, borderRadius: 12, padding: 18, alignItems: "center" },
  heroTitle: { fontSize: 18, fontWeight: "800", color: COLORS.ink, marginTop: 8 },
  heroSubtitle: { color: COLORS.sub, fontSize: 12, marginTop: 8, textAlign: "center", lineHeight: 18 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
  card: { flexDirection: "row", gap: 12, backgroundColor: COLORS.surface, marginHorizontal: 12, marginBottom: 10, borderRadius: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: "#D32F2F" },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#eee" },
  name: { color: COLORS.ink, fontWeight: "800", fontSize: 14 },
  summary: { color: COLORS.sub, fontSize: 12.5, marginTop: 4, lineHeight: 17 },
  date: { color: COLORS.sub, fontSize: 11, marginTop: 6 },
});
