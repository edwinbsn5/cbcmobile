import React, { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

const REQUIRED_FOLLOWS = 5;

export default function OnboardingFollowScreen() {
  const insets = useSafeAreaInsets();
  const { updateUser, logout } = useAuth();
  const [users, setUsers] = useState([]);
  const [followingIds, setFollowingIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    client.get("/users/popular", { params: { limit: 20 } })
      .then((r) => setUsers(r.data))
      .catch((e) => Alert.alert("Couldn't load suggestions", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, []);

  async function toggleFollow(targetId) {
    setBusyId(targetId);
    const alreadyFollowing = followingIds.has(targetId);
    try {
      await client.post(`/users/${targetId}/${alreadyFollowing ? "unfollow" : "follow"}`);
      setFollowingIds((prev) => {
        const next = new Set(prev);
        if (alreadyFollowing) next.delete(targetId);
        else next.add(targetId);
        return next;
      });
    } catch (e) {
      Alert.alert("Couldn't update", e.response?.data?.error || e.message);
    } finally {
      setBusyId(null);
    }
  }

  async function handleComplete(skip) {
    setCompleting(true);
    try {
      const { data } = await client.post("/auth/onboarding/complete", skip ? { skip: true } : undefined);
      await updateUser(data.user);
      // Gate() in App.js swaps to the main app automatically once
      // onboardingCompletedAt is set — no navigation call needed here.
    } catch (e) {
      Alert.alert("Not quite there yet", e.response?.data?.error || e.message);
    } finally {
      setCompleting(false);
    }
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  const count = followingIds.size;
  const done = count >= REQUIRED_FOLLOWS;

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Follow at least {REQUIRED_FOLLOWS} people</Text>
        <Text style={styles.subtitle}>Step 3 of 3 — these are the {users.length} most-followed accounts this week</Text>
        <Text style={[styles.progress, done && styles.progressDone]}>{count} of {REQUIRED_FOLLOWS} followed</Text>
      </View>

      <FlatList
        data={users}
        keyExtractor={(u) => u.id}
        renderItem={({ item }) => {
          const isFollowing = followingIds.has(item.id);
          return (
            <View style={styles.row}>
              <Avatar uri={item.avatar} name={item.name} style={styles.avatar} />
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{item.name}</Text>
                {item.newFollowerCount > 0 && <Text style={styles.meta}>+{item.newFollowerCount} followers this week</Text>}
              </View>
              <TouchableOpacity
                style={[styles.followButton, isFollowing && styles.followingButton]}
                onPress={() => toggleFollow(item.id)}
                disabled={busyId === item.id}
              >
                <Text style={[styles.followButtonText, isFollowing && styles.followingButtonText]}>
                  {busyId === item.id ? "..." : isFollowing ? "Following" : "Follow"}
                </Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <TouchableOpacity style={[styles.completeButton, !done && styles.completeButtonDisabled]} onPress={() => handleComplete(false)} disabled={!done || completing}>
        {completing ? <ActivityIndicator color={COLORS.accentInk} /> : <Text style={styles.completeButtonText}>Complete Registration</Text>}
      </TouchableOpacity>
      {/* TEMPORARY: lets a new account through without following 5 users —
          see the matching `skip` bypass in routes/auth.js's onboarding/complete.
          Remove once the user base is large enough for the requirement to be
          realistic again. */}
      <TouchableOpacity onPress={() => handleComplete(true)} disabled={completing} style={styles.skipLink}>
        <Text style={styles.skipLinkText}>Skip for now</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={logout} style={styles.logoutLink}>
        <Text style={styles.logoutLinkText}>Not you? Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: { backgroundColor: COLORS.surface, padding: 20, paddingTop: 40 },
  title: { fontSize: 20, fontWeight: "800" },
  subtitle: { color: COLORS.sub, marginTop: 4, fontSize: 13 },
  progress: { marginTop: 12, fontWeight: "700", color: "#D32F2F" },
  progressDone: { color: "#2E7D32" },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.surface, padding: 12, marginHorizontal: 10, marginTop: 8, borderRadius: 10 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: 12 },
  name: { fontWeight: "600", fontSize: 15 },
  meta: { color: COLORS.sub, fontSize: 12, marginTop: 2 },
  followButton: { backgroundColor: COLORS.accent, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 16 },
  followingButton: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  followButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 13 },
  followingButtonText: { color: COLORS.ink },
  completeButton: { backgroundColor: COLORS.accent, margin: 16, borderRadius: 8, padding: 14, alignItems: "center" },
  completeButtonDisabled: { backgroundColor: "#BCC0C4" },
  completeButtonText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 16 },
  skipLink: { alignItems: "center", marginBottom: 4 },
  skipLinkText: { color: COLORS.accent, fontSize: 13, fontWeight: "700" },
  logoutLink: { alignItems: "center", marginBottom: 16 },
  logoutLinkText: { color: COLORS.sub, fontSize: 13 },
});
