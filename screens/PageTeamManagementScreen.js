import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import client from "../api/client";
import { useAuth } from "../context/AuthContext";
import Avatar from "../components/Avatar";
import { COLORS } from "../theme";

const ASSIGNABLE_ROLES = ["Admin", "Editor", "Moderator"];

function RolePicker({ value, onSelect }) {
  return (
    <View style={styles.rolePicker}>
      {ASSIGNABLE_ROLES.map((r) => (
        <TouchableOpacity key={r} style={[styles.roleOption, value === r && styles.roleOptionActive]} onPress={() => onSelect(r)}>
          <Text style={[styles.roleOptionText, value === r && styles.roleOptionTextActive]}>{r}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

export default function PageTeamManagementScreen({ route }) {
  const { pageId } = route.params;
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteRole, setInviteRole] = useState("Editor");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef(null);

  const load = useCallback(() => {
    client.get(`/pages/${pageId}/members`).then((r) => setMembers(r.data))
      .catch((e) => Alert.alert("Couldn't load team members", e.response?.data?.error || e.message))
      .finally(() => setLoading(false));
  }, [pageId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await client.get("/search", { params: { q: trimmed } });
        const memberUserIds = new Set(members.map((m) => m.userId));
        setSearchResults(data.users.filter((u) => u.id !== user?.id && !memberUserIds.has(u.id)));
      } catch (e) {
        // stay quiet — same convention as SearchScreen
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, members, user?.id]);

  async function handleInvite(invitee) {
    try {
      await client.post(`/pages/${pageId}/members/invite`, { userId: invitee.id, role: inviteRole });
      setQuery("");
      setSearchResults([]);
      load();
    } catch (e) {
      Alert.alert("Couldn't invite", e.response?.data?.error || e.message);
    }
  }

  async function handleChangeRole(member, role) {
    try {
      await client.patch(`/pages/${pageId}/members/${member.id}`, { role });
      load();
    } catch (e) {
      Alert.alert("Couldn't change role", e.response?.data?.error || e.message);
    }
  }

  function handleRemove(member) {
    Alert.alert(`Remove ${member.user?.name}?`, "They'll lose access to manage this Page.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await client.delete(`/pages/${pageId}/members/${member.id}`);
            load();
          } catch (e) {
            Alert.alert("Couldn't remove", e.response?.data?.error || e.message);
          }
        },
      },
    ]);
  }

  if (loading) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;

  return (
    <FlatList
      style={styles.container}
      data={members}
      keyExtractor={(m) => m.id}
      contentContainerStyle={{ padding: 12 }}
      ListHeaderComponent={
        <View style={styles.inviteCard}>
          <Text style={styles.sectionTitle}>Invite a team member</Text>
          <Text style={styles.label}>Role to assign</Text>
          <RolePicker value={inviteRole} onSelect={setInviteRole} />
          <TextInput style={styles.searchInput} placeholder="Search by name..." value={query} onChangeText={setQuery} autoCapitalize="none" />
          {searching && <ActivityIndicator size="small" color={COLORS.accent} style={{ marginTop: 8 }} />}
          {searchResults.map((u) => (
            <TouchableOpacity key={u.id} style={styles.searchRow} onPress={() => handleInvite(u)}>
              <Avatar uri={u.avatar} name={u.name} style={styles.avatar} />
              <Text style={styles.rowName}>{u.name}</Text>
              <Text style={styles.inviteAction}>Invite as {inviteRole}</Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Current team</Text>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.memberCard}>
          <View style={styles.memberRow}>
            <Avatar uri={item.user?.avatar} name={item.user?.name} style={styles.avatar} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowName}>{item.user?.name}</Text>
              <Text style={styles.rowMeta}>
                {item.role}{item.status === "pending" ? " · Invite pending" : ""}
              </Text>
            </View>
            {item.role !== "Owner" && (
              <TouchableOpacity onPress={() => handleRemove(item)}>
                <Ionicons name="close-circle-outline" size={22} color="#D32F2F" />
              </TouchableOpacity>
            )}
          </View>
          {item.role !== "Owner" && <RolePicker value={item.role} onSelect={(role) => handleChangeRole(item, role)} />}
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  inviteCard: { marginBottom: 4 },
  sectionTitle: { fontSize: 15, fontWeight: "700", marginBottom: 10 },
  label: { fontSize: 12, color: COLORS.sub, marginBottom: 6 },
  rolePicker: { flexDirection: "row", gap: 8, marginBottom: 12, flexWrap: "wrap" },
  roleOption: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  roleOptionActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  roleOptionText: { fontSize: 12.5, fontWeight: "700", color: COLORS.sub },
  roleOptionTextActive: { color: COLORS.accentInk },
  searchInput: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, fontSize: 14, color: COLORS.ink },
  searchRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  inviteAction: { color: COLORS.accent, fontWeight: "700", fontSize: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#eee" },
  memberCard: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginBottom: 8 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  rowName: { fontWeight: "700", fontSize: 14.5 },
  rowMeta: { color: COLORS.sub, fontSize: 12, marginTop: 2 },
});
