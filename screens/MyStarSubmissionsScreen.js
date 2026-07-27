import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";
import client from "../api/client";
import { COLORS } from "../theme";

export default function MyStarSubmissionsScreen({ navigation }) {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      client.get("/star/me/submissions").then((r) => setSubmissions(r.data)).finally(() => setLoading(false));
    }, [])
  );

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={{ padding: 12 }}
      data={submissions}
      keyExtractor={(s) => s.id}
      renderItem={({ item }) => (
        <TouchableOpacity style={styles.row} onPress={() => navigation.navigate("StarSubmissionDetail", { submissionId: item.id })}>
          <Video source={{ uri: item.videoUrl }} style={styles.thumb} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
          <View style={styles.info}>
            <Text style={styles.contestTitle} numberOfLines={1}>{item.contestTitle}</Text>
            <Text style={styles.codeCaption} numberOfLines={1}>#{item.code}{item.caption ? ` · "${item.caption}"` : ""}</Text>
          </View>
          <View style={styles.stats}>
            <Text style={styles.pts}>{item.points} pts</Text>
            {item.position != null && <Text style={styles.pos}>#{item.position} place</Text>}
          </View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={styles.empty}>You haven't submitted to any contests yet</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  row: { flexDirection: "row", gap: 10, backgroundColor: COLORS.surface, borderRadius: 10, marginBottom: 9, padding: 9, alignItems: "center" },
  thumb: { width: 44, height: 58, borderRadius: 6, backgroundColor: COLORS.ink, flex: 0 },
  info: { flex: 1, minWidth: 0 },
  contestTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink },
  codeCaption: { fontSize: 11, color: COLORS.sub, marginTop: 2 },
  stats: { alignItems: "flex-end" },
  pts: { fontSize: 14, fontWeight: "800", color: COLORS.accent },
  pos: { fontSize: 10.5, color: "#F5A623", fontWeight: "800", marginTop: 2 },
  empty: { textAlign: "center", color: "#999", marginTop: 40 },
});
