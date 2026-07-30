import React, { useCallback, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { COLORS } from "../theme";

export default function StarContestDetailScreen({ route, navigation }) {
  const { contestId } = route.params;
  const [contest, setContest] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchCode, setSearchCode] = useState("");
  const [searching, setSearching] = useState(false);

  const load = useCallback(async () => {
    const [contestRes, submissionsRes] = await Promise.all([
      client.get(`/star/contests/${contestId}`),
      client.get(`/star/contests/${contestId}/submissions`),
    ]);
    setContest(contestRes.data);
    setSubmissions(submissionsRes.data);
    navigation.setOptions({ title: contestRes.data.title });
  }, [contestId]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function handleSearch() {
    if (!searchCode.trim()) return;
    setSearching(true);
    try {
      const { data } = await client.get(`/star/contests/${contestId}/search`, { params: { code: searchCode.trim() } });
      setSearchCode("");
      navigation.navigate("StarSubmissionDetail", { submissionId: data.id });
    } catch (e) {
      Alert.alert("Not found", e.response?.data?.error || "No submission found with that code");
    } finally {
      setSearching(false);
    }
  }

  if (loading || !contest) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const now = Date.now();
  const notStarted = now < contest.startAt;
  const ended = now >= contest.endAt;

  return (
    <FlatList
      style={styles.container}
      data={submissions}
      numColumns={3}
      keyExtractor={(s) => s.id}
      columnWrapperStyle={{ gap: 2 }}
      contentContainerStyle={{ paddingHorizontal: 10, paddingBottom: 20 }}
      ListHeaderComponent={
        <View>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={15} color="#a9c4bf" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search by video code…"
              value={searchCode}
              onChangeText={setSearchCode}
              autoCapitalize="characters"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {searching && <ActivityIndicator size="small" color={COLORS.accent} />}
          </View>

          <View style={styles.challengeCard}>
            <Text style={styles.challengeTitle}>The Challenge</Text>
            <Text style={styles.challengeText}>{contest.challenge}</Text>
            <View style={styles.datesRow}>
              <Text style={styles.dateText}>Started {new Date(contest.startAt).toLocaleDateString()}</Text>
              <Text style={styles.dateText}>Ends {new Date(contest.endAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.prizeText}>
              🏆 Top {contest.winnerCount} win{contest.winnerCount === 1 ? "s" : ""} KES {contest.prizeKES.toLocaleString()} each
            </Text>
          </View>

          {!!contest.sponsorName && (
            <View style={styles.sponsorCard}>
              <Text style={styles.sponsorLabel}>Presented by</Text>
              <Text style={styles.sponsorName}>{contest.sponsorName}</Text>
              {!!contest.sponsorMessage && <Text style={styles.sponsorMessage}>{contest.sponsorMessage}</Text>}
            </View>
          )}

          <TouchableOpacity style={styles.leaderboardButton} onPress={() => navigation.navigate("StarLeaderboard", { contestId })}>
            <Ionicons name="trophy-outline" size={16} color={COLORS.accent} />
            <Text style={styles.leaderboardButtonText}>Leaderboard</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.sub} />
          </TouchableOpacity>

          {contest.noticeAt ? (
            <View style={styles.noticeBanner}>
              <Ionicons name="warning" size={16} color="#D32F2F" />
              <Text style={styles.noticeBannerText}>
                This contest is being cancelled and will be permanently removed on {new Date(contest.noticeCancelAt).toLocaleString()}. No new submissions are being accepted.
              </Text>
            </View>
          ) : contest.hasSubmitted ? (
            <TouchableOpacity
              style={styles.submitBanner}
              onPress={() => navigation.navigate("StarSubmissionDetail", { submissionId: contest.mySubmissionId })}
            >
              <Ionicons name="checkmark-circle" size={16} color={COLORS.accent} />
              <Text style={styles.submitBannerText}>You've submitted a video — view your standing</Text>
              <Ionicons name="chevron-forward" size={16} color={COLORS.sub} />
            </TouchableOpacity>
          ) : notStarted ? (
            <View style={styles.lockedBox}>
              <Text style={styles.lockedText}>This contest starts on {new Date(contest.startAt).toLocaleDateString()}</Text>
            </View>
          ) : ended ? (
            <View style={styles.lockedBox}>
              <Text style={styles.lockedText}>This contest has ended — submissions are closed</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.submitButton} onPress={() => navigation.navigate("StarSubmitVideo", { contestId })}>
              <Ionicons name="videocam" size={16} color={COLORS.accentInk} />
              <Text style={styles.submitButtonText}>Submit Your Video</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.gridLabel}>Submissions ({contest.submissionCount})</Text>
        </View>
      }
      renderItem={({ item }) => (
        <TouchableOpacity
          style={styles.cell}
          onPress={() => navigation.navigate("StarSubmissionDetail", { submissionId: item.id })}
        >
          <Video source={{ uri: item.videoUrl }} style={styles.cellMedia} resizeMode={ResizeMode.COVER} shouldPlay={false} isMuted />
          <View style={styles.cellPoints}><Text style={styles.cellPointsText}>{item.points}</Text></View>
          <View style={styles.cellTag}><Text style={styles.cellTagText}>#{item.code}</Text></View>
          <View style={styles.cellPlay}><Ionicons name="play" size={16} color="rgba(255,255,255,0.9)" /></View>
        </TouchableOpacity>
      )}
      ListEmptyComponent={<Text style={styles.empty}>No submissions yet — be the first!</Text>}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  searchBox: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 4, marginTop: 10,
  },
  searchInput: { flex: 1, fontSize: 13, paddingVertical: 8, color: COLORS.ink },
  challengeCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginTop: 10 },
  challengeTitle: { fontSize: 13.5, fontWeight: "800", color: COLORS.ink, marginBottom: 4 },
  challengeText: { fontSize: 12.5, color: COLORS.sub, lineHeight: 18 },
  datesRow: { flexDirection: "row", gap: 14, marginTop: 8 },
  dateText: { fontSize: 11, color: COLORS.accent, fontWeight: "700" },
  prizeText: { fontSize: 12.5, color: "#7a4e00", fontWeight: "700", marginTop: 8 },
  sponsorCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginTop: 10, borderWidth: 1, borderColor: COLORS.border },
  sponsorLabel: { fontSize: 10.5, color: COLORS.sub, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  sponsorName: { fontSize: 14.5, fontWeight: "800", color: COLORS.ink, marginTop: 2 },
  sponsorMessage: { fontSize: 12.5, color: COLORS.sub, lineHeight: 18, marginTop: 6 },
  leaderboardButton: {
    flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginTop: 8,
  },
  leaderboardButtonText: { flex: 1, fontSize: 12.5, fontWeight: "700", color: COLORS.ink },
  noticeBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, backgroundColor: "#FDEDED",
    borderRadius: 10, padding: 12, marginTop: 10, borderWidth: 1, borderColor: "#F3C6C6",
  },
  noticeBannerText: { flex: 1, fontSize: 12, color: "#7a1f1f", lineHeight: 17 },
  submitBanner: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginTop: 10 },
  submitBannerText: { flex: 1, fontSize: 12.5, fontWeight: "700", color: COLORS.ink },
  submitButton: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: COLORS.accent, borderRadius: 10, paddingVertical: 13, marginTop: 10,
  },
  submitButtonText: { color: COLORS.accentInk, fontWeight: "800", fontSize: 14 },
  lockedBox: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 14, marginTop: 10, borderWidth: 1, borderColor: COLORS.border, borderStyle: "dashed" },
  lockedText: { color: COLORS.sub, fontSize: 12.5, textAlign: "center" },
  gridLabel: { fontSize: 12.5, fontWeight: "800", color: COLORS.ink, marginTop: 18, marginBottom: 8 },
  cell: { flex: 1 / 3, aspectRatio: 9 / 14, backgroundColor: COLORS.ink, marginBottom: 2, borderRadius: 5, overflow: "hidden" },
  cellMedia: { width: "100%", height: "100%" },
  cellPoints: { position: "absolute", top: 3, right: 3, backgroundColor: "#F5A623", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  cellPointsText: { color: "#241a06", fontSize: 9, fontWeight: "800" },
  cellTag: { position: "absolute", left: 3, bottom: 3, backgroundColor: "rgba(0,0,0,0.55)", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 },
  cellTagText: { color: "#fff", fontSize: 8, fontWeight: "700" },
  cellPlay: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  empty: { textAlign: "center", color: "#999", marginTop: 20, marginBottom: 20 },
});
