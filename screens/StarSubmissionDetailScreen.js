import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect, useIsFocused, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import FeedVideoPlayer from "../components/FeedVideoPlayer";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

function Star({ filled, onPress }) {
  return (
    <TouchableOpacity onPress={onPress} hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}>
      <Ionicons name={filled ? "star" : "star-outline"} size={22} color={filled ? "#F5A623" : "#D9E6E3"} />
    </TouchableOpacity>
  );
}

export default function StarSubmissionDetailScreen({ route }) {
  const { submissionId } = route.params;
  const navigation = useNavigation();
  const isFocused = useIsFocused();
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(false);
  const [followSubmitting, setFollowSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    return client.get(`/star/submissions/${submissionId}`).then((r) => setSubmission(r.data));
  }, [submissionId]);

  useFocusEffect(
    useCallback(() => {
      load().finally(() => setLoading(false));
    }, [load])
  );

  async function handleRate(stars) {
    if (rating) return;
    setRating(true);
    try {
      const { data } = await client.post(`/star/submissions/${submissionId}/rate`, { stars });
      setSubmission(data);
    } catch (e) {
      Alert.alert("Couldn't rate", e.response?.data?.error || e.message);
    } finally {
      setRating(false);
    }
  }

  async function handleToggleFollow() {
    setFollowSubmitting(true);
    try {
      const path = submission.amIFollowing ? "unfollow" : "follow";
      await client.post(`/users/${submission.author.id}/${path}`);
      setSubmission((prev) => ({ ...prev, amIFollowing: !prev.amIFollowing }));
    } catch (e) {
      Alert.alert("Couldn't update follow status", e.response?.data?.error || e.message);
    } finally {
      setFollowSubmitting(false);
    }
  }

  function handleDelete() {
    Alert.alert("Delete your submission?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            await client.delete(`/star/submissions/${submissionId}`);
            navigation.goBack();
          } catch (e) {
            Alert.alert("Couldn't delete", e.response?.data?.error || e.message);
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }

  if (loading || !submission) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <FeedVideoPlayer uri={submission.videoUrl} isActive={isFocused} variant="hero" onPressBody={() => {}} />
        <View style={styles.codeChip}><Text style={styles.codeChipText}>#{submission.code}</Text></View>
        {submission.position != null && (
          <View style={styles.posChip}><Text style={styles.posChipText}>#{submission.position} place</Text></View>
        )}
      </View>

      <View style={styles.body}>
        {!submission.isOwn && submission.author && (
          <View style={styles.authorRow}>
            <TouchableOpacity
              style={styles.authorLeft}
              onPress={() => navigation.navigate("UserProfile", { userId: submission.author.id })}
            >
              <Avatar uri={submission.author.avatar} name={submission.author.name} style={styles.avatar} />
              <Text style={styles.authorName}>{submission.author.name}</Text>
            </TouchableOpacity>
            <View style={styles.authorActions}>
              <TouchableOpacity
                style={[styles.followButton, submission.amIFollowing && styles.followingButton]}
                onPress={handleToggleFollow}
                disabled={followSubmitting}
              >
                <Text style={[styles.followButtonText, submission.amIFollowing && styles.followingButtonText]}>
                  {submission.amIFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.reportButton}
                onPress={() => navigation.navigate("ReportPost", { submissionId })}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="flag-outline" size={18} color={COLORS.sub} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {!!submission.caption && <Text style={styles.caption}>{submission.caption}</Text>}

        <View style={styles.pointsRow}>
          <Text style={styles.points}>{submission.points}</Text>
          <Text style={styles.pointsLabel}>points from {submission.raterCount} rater{submission.raterCount === 1 ? "" : "s"}</Text>
        </View>

        {submission.isOwn ? (
          <>
            <Text style={styles.ownHint}>This is your submission — share code #{submission.code} to get more votes!</Text>
            {submission.contestNoticeAt && Date.now() < submission.contestNoticeCancelAt && (
              <View style={styles.deleteBox}>
                <Text style={styles.deleteBoxText}>
                  This contest is being cancelled on {new Date(submission.contestNoticeCancelAt).toLocaleString()}. Delete your submission now if you don't want it auto-removed.
                </Text>
                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete} disabled={deleting}>
                  <Text style={styles.deleteButtonText}>{deleting ? "Deleting..." : "Delete my submission"}</Text>
                </TouchableOpacity>
              </View>
            )}
          </>
        ) : !submission.votingOpen ? (
          <Text style={styles.ownHint}>Voting has closed for this contest.</Text>
        ) : (
          <>
            <Text style={styles.rateLabel}>Rate this video</Text>
            <View style={styles.starsRow}>
              {Array.from({ length: 10 }).map((_, i) => (
                <Star key={i} filled={submission.myRating != null && i < submission.myRating} onPress={() => handleRate(i + 1)} />
              ))}
            </View>
            {submission.myRating != null && <Text style={styles.rateHint}>You rated this {submission.myRating}/10</Text>}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  hero: { backgroundColor: "#000" },
  codeChip: { position: "absolute", top: 12, left: 12, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  codeChipText: { color: "#fff", fontWeight: "800", fontSize: 12, letterSpacing: 0.5 },
  posChip: { position: "absolute", top: 12, right: 12, backgroundColor: "#F5A623", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  posChipText: { color: "#241a06", fontWeight: "800", fontSize: 12 },
  body: { padding: 16 },
  authorRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  authorLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: COLORS.border },
  authorName: { fontWeight: "700", fontSize: 14, color: COLORS.ink },
  authorActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  followButton: { backgroundColor: COLORS.accent, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 7 },
  followingButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  followButtonText: { color: COLORS.accentInk, fontWeight: "800", fontSize: 12 },
  followingButtonText: { color: COLORS.ink },
  reportButton: { padding: 2 },
  deleteBox: { backgroundColor: "#FDEDED", borderRadius: 10, padding: 12, marginTop: -4, marginBottom: 14, borderWidth: 1, borderColor: "#F3C6C6" },
  deleteBoxText: { fontSize: 12, color: "#7a1f1f", lineHeight: 17, marginBottom: 10 },
  deleteButton: { backgroundColor: "#D32F2F", borderRadius: 8, paddingVertical: 10, alignItems: "center" },
  deleteButtonText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  caption: { fontSize: 14, color: COLORS.ink, lineHeight: 20, marginBottom: 14 },
  pointsRow: { flexDirection: "row", alignItems: "baseline", gap: 8, marginBottom: 16 },
  points: { fontSize: 26, fontWeight: "800", color: COLORS.accent },
  pointsLabel: { fontSize: 12, color: COLORS.sub },
  rateLabel: { fontSize: 13, fontWeight: "700", color: COLORS.ink, marginBottom: 8 },
  starsRow: { flexDirection: "row", gap: 5 },
  rateHint: { fontSize: 11.5, color: COLORS.sub, marginTop: 8 },
  ownHint: { fontSize: 12.5, color: COLORS.sub, fontStyle: "italic" },
});
