import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView, TextInput, Alert, Share, Switch } from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import client from "../api/client";
import { COLORS } from "../theme";

function formatKES(n) { return `KES ${Math.round(n || 0).toLocaleString()}`; }

export default function ProjectAdminScreen({ route }) {
  const { projectId } = route.params;
  const [project, setProject] = useState(null);
  const [tab, setTab] = useState("Requests");

  const load = useCallback(() => { client.get(`/projects/${projectId}`).then((r) => setProject(r.data)).catch(() => {}); }, [projectId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  if (!project) return <ActivityIndicator style={{ flex: 1 }} size="large" color={COLORS.accent} />;
  const tabs = ["Requests", "Members", "Progress", ...(project.requiresCapital ? ["Finance"] : []), "Settings", "Audit"];

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabRow} contentContainerStyle={{ paddingHorizontal: 10 }}>
        {tabs.map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView style={styles.body} contentContainerStyle={{ padding: 14 }}>
        {tab === "Requests" && <RequestsTab projectId={projectId} project={project} onChange={load} />}
        {tab === "Members" && <MembersTab projectId={projectId} project={project} onChange={load} />}
        {tab === "Progress" && <ProgressTab projectId={projectId} />}
        {tab === "Finance" && project.requiresCapital && <FinanceTab projectId={projectId} project={project} onChange={load} />}
        {tab === "Settings" && <SettingsTab projectId={projectId} project={project} onChange={load} />}
        {tab === "Audit" && <AuditTab projectId={projectId} />}
      </ScrollView>
    </View>
  );
}

function RequestsTab({ projectId, project, onChange }) {
  const [data, setData] = useState(null);
  const load = useCallback(() => { client.get(`/projects/${projectId}/requests`).then((r) => setData(r.data)).catch(() => setData({ pending: [], waitlisted: [] })); }, [projectId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function decide(memberId, action, roleId) {
    try {
      await client.post(`/projects/${projectId}/requests/${memberId}/${action}`, action === "approve" ? { roleId } : {});
      load(); onChange();
    } catch (e) {
      Alert.alert("Action failed", e.response?.data?.error || e.message);
    }
  }

  if (!data) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      <Text style={styles.sectionTitle}>Pending applications ({data.pending.length})</Text>
      {data.pending.map((m) => (
        <View key={m.id} style={styles.applicantCard}>
          <Text style={styles.rowName}>{m.user?.name}{m.projectRole ? ` — applying for ${m.projectRole.name}` : ""}</Text>
          {!!m.pitchMessage && <Text style={styles.pitchText}>"{m.pitchMessage}"</Text>}
          <View style={styles.rowActions}>
            <TouchableOpacity style={styles.approveBtn} onPress={() => decide(m.id, "approve", m.projectRoleId)}><Text style={styles.approveBtnText}>Approve</Text></TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => decide(m.id, "reject")}><Text style={styles.rejectBtnText}>Reject</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      {!data.pending.length && <Text style={styles.empty}>No pending applications</Text>}

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Waitlist ({data.waitlisted.length})</Text>
      {data.waitlisted.map((m, idx) => (
        <View key={m.id} style={styles.row}>
          <Text style={styles.rowName}>#{idx + 1} {m.user?.name}</Text>
          <TouchableOpacity style={styles.approveBtn} onPress={() => decide(m.id, "approve", m.projectRoleId)}><Text style={styles.approveBtnText}>Admit now</Text></TouchableOpacity>
        </View>
      ))}
      {!data.waitlisted.length && <Text style={styles.empty}>Waitlist is empty</Text>}
    </View>
  );
}

function MembersTab({ projectId, project, onChange }) {
  const [members, setMembers] = useState(null);
  const load = useCallback(() => { client.get(`/projects/${projectId}/members`).then((r) => setMembers(r.data)).catch(() => setMembers([])); }, [projectId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function remove(memberId, name) {
    Alert.alert("Remove member", `Remove ${name} from this project?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        try { await client.post(`/projects/${projectId}/members/${memberId}/remove`); load(); onChange(); }
        catch (e) { Alert.alert("Couldn't remove", e.response?.data?.error || e.message); }
      } },
    ]);
  }

  async function reassign(memberId, roleId) {
    try { await client.patch(`/projects/${projectId}/members/${memberId}/role`, { roleId }); load(); }
    catch (e) { Alert.alert("Couldn't reassign", e.response?.data?.error || e.message); }
  }

  if (!members) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      {members.map((m) => (
        <View key={m.id} style={styles.memberCard}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{m.user?.name}{m.userId === project.creatorId ? " (Creator)" : ""}</Text>
            <Text style={styles.rowSub}>{m.projectRole?.name || (m.role === "admin" ? "Admin" : "No role assigned")}</Text>
            {!!project.roles?.length && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                <View style={{ flexDirection: "row", gap: 6 }}>
                  {project.roles.map((r) => (
                    <TouchableOpacity key={r.id} style={[styles.roleOption, m.projectRoleId === r.id && styles.roleOptionActive]} onPress={() => reassign(m.id, r.id)}>
                      <Text style={[styles.roleOptionText, m.projectRoleId === r.id && styles.roleOptionTextActive]}>{r.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
          </View>
          {m.userId !== project.creatorId && (
            <TouchableOpacity style={styles.rejectBtn} onPress={() => remove(m.id, m.user?.name)}><Text style={styles.rejectBtnText}>Remove</Text></TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}

function ProgressTab({ projectId }) {
  const [tasks, setTasks] = useState(null);
  const [milestones, setMilestones] = useState(null);
  useFocusEffect(useCallback(() => {
    client.get(`/projects/${projectId}/tasks`).then((r) => setTasks(r.data)).catch(() => setTasks([]));
    client.get(`/projects/${projectId}/milestones`).then((r) => setMilestones(r.data)).catch(() => setMilestones([]));
  }, [projectId]));

  if (!tasks || !milestones) return <ActivityIndicator color={COLORS.accent} />;
  const taskDone = tasks.filter((t) => t.status === "done").length;
  const msDone = milestones.filter((m) => m.status === "completed").length;
  return (
    <View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Tasks completed</Text>
        <Text style={styles.statValue}>{taskDone} / {tasks.length}</Text>
      </View>
      <View style={styles.statCard}>
        <Text style={styles.statLabel}>Milestones completed</Text>
        <Text style={styles.statValue}>{msDone} / {milestones.length}</Text>
      </View>
      <Text style={styles.sectionTitle}>Open tasks</Text>
      {tasks.filter((t) => t.status !== "done").map((t) => (
        <View key={t.id} style={styles.row}>
          <Text style={styles.rowName}>{t.title}</Text>
          <Text style={styles.rowSub}>{t.assignee?.name || "Unassigned"}</Text>
        </View>
      ))}
      {!tasks.filter((t) => t.status !== "done").length && <Text style={styles.empty}>All tasks done!</Text>}
    </View>
  );
}

function FinanceTab({ projectId, project, onChange }) {
  const [withdrawals, setWithdrawals] = useState(null);
  const [userId, setUserId] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const load = useCallback(() => { client.get(`/projects/${projectId}/withdrawals`).then((r) => setWithdrawals(r.data)).catch(() => setWithdrawals([])); }, [projectId]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function recordManual() {
    if (!userId.trim()) return Alert.alert("Missing member", "Paste the member's user ID");
    const amt = parseInt(amount, 10);
    if (!amt || amt <= 0) return Alert.alert("Invalid amount", "Enter a positive amount");
    try {
      await client.post(`/projects/${projectId}/contributions/manual`, { userId: userId.trim(), amount: amt, note });
      Alert.alert("Recorded", "Cash contribution recorded");
      setAmount(""); setNote(""); onChange();
    } catch (e) {
      Alert.alert("Couldn't record", e.response?.data?.error || e.message);
    }
  }

  async function decide(reqId, action) {
    try { await client.post(`/projects/${projectId}/withdrawals/${reqId}/${action}`); load(); }
    catch (e) { Alert.alert("Action failed", e.response?.data?.error || e.message); }
  }

  async function exportReport() {
    try {
      const { data } = await client.get(`/projects/${projectId}/reports/csv`, { responseType: "text", transformResponse: [(d) => d] });
      await Share.share({ title: `${project.title} — financial report`, message: data });
    } catch (e) {
      Alert.alert("Couldn't export report", e.response?.data?.error || e.message);
    }
  }

  if (!withdrawals) return <ActivityIndicator color={COLORS.accent} />;
  const pending = withdrawals.filter((w) => w.status === "pending");
  return (
    <View>
      <Text style={styles.tabHint}>Pool balance: {formatKES(project.poolBalance)}</Text>
      <Text style={styles.sectionTitle}>Record a cash contribution</Text>
      <TextInput style={styles.input} placeholder="Member user ID" value={userId} onChangeText={setUserId} />
      <TextInput style={styles.input} placeholder="Amount (KES)" keyboardType="number-pad" value={amount} onChangeText={setAmount} />
      <TextInput style={styles.input} placeholder="Note (optional)" value={note} onChangeText={setNote} />
      <TouchableOpacity style={styles.approveBtn} onPress={recordManual}><Text style={styles.approveBtnText}>Record contribution</Text></TouchableOpacity>

      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>Pending withdrawals ({pending.length})</Text>
      {pending.map((w) => (
        <View key={w.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{w.requester?.name} — {formatKES(w.amount)}</Text>
            <Text style={styles.rowSub}>{w.reason || "No reason"} · {w.approvals.length}/{w.approvalsRequired} approvals</Text>
          </View>
          <View style={styles.rowActions}>
            <TouchableOpacity style={styles.approveBtn} onPress={() => decide(w.id, "approve")}><Text style={styles.approveBtnText}>Approve</Text></TouchableOpacity>
            <TouchableOpacity style={styles.rejectBtn} onPress={() => decide(w.id, "reject")}><Text style={styles.rejectBtnText}>Reject</Text></TouchableOpacity>
          </View>
        </View>
      ))}
      {!pending.length && <Text style={styles.empty}>Nothing pending</Text>}

      <TouchableOpacity style={[styles.smallBtn, { marginTop: 16 }]} onPress={exportReport}><Text style={styles.smallBtnText}>Export financial report (CSV)</Text></TouchableOpacity>
    </View>
  );
}

function SettingsTab({ projectId, project, onChange }) {
  const [maxMembers, setMaxMembers] = useState(String(project.maxMembers));
  const [description, setDescription] = useState(project.description);
  const [visibility, setVisibility] = useState(project.visibility);
  const [requireKyc, setRequireKyc] = useState(project.requireKycToJoin);
  const [requireGuarantors, setRequireGuarantors] = useState(project.requireGuarantorsToJoin);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    try {
      const body = { description, visibility, requireKycToJoin: requireKyc, requireGuarantorsToJoin: requireGuarantors };
      const max = parseInt(maxMembers, 10);
      if (max && max !== project.maxMembers) body.maxMembers = max;
      await client.patch(`/projects/${projectId}`, body);
      Alert.alert("Saved", "Settings updated");
      onChange();
    } catch (e) {
      Alert.alert("Couldn't save", e.response?.data?.error || e.message);
    } finally {
      setSaving(false);
    }
  }

  async function togglePositions() {
    try { await client.post(`/projects/${projectId}/positions/${project.joiningClosed ? "reopen" : "close"}`); onChange(); }
    catch (e) { Alert.alert("Couldn't update", e.response?.data?.error || e.message); }
  }

  async function setLifecycle(action) {
    try { await client.post(`/projects/${projectId}/${action}`); onChange(); }
    catch (e) { Alert.alert("Couldn't update", e.response?.data?.error || e.message); }
  }

  return (
    <View>
      <Text style={styles.label}>Description</Text>
      <TextInput style={[styles.input, styles.multiline]} value={description} onChangeText={setDescription} multiline />
      <Text style={styles.label}>Max team size</Text>
      <TextInput style={styles.input} value={maxMembers} onChangeText={setMaxMembers} keyboardType="number-pad" />
      <Text style={styles.label}>Visibility</Text>
      <View style={styles.rowActions}>
        <TouchableOpacity style={[styles.smallBtn, visibility === "public" && styles.smallBtnActive]} onPress={() => setVisibility("public")}><Text style={[styles.smallBtnText, visibility === "public" && styles.smallBtnTextActive]}>Public</Text></TouchableOpacity>
        <TouchableOpacity style={[styles.smallBtn, visibility === "invite_only" && styles.smallBtnActive]} onPress={() => setVisibility("invite_only")}><Text style={[styles.smallBtnText, visibility === "invite_only" && styles.smallBtnTextActive]}>Invite-only</Text></TouchableOpacity>
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.rowName}>Require identity verification (KYC) to join</Text>
        <Switch value={requireKyc} onValueChange={setRequireKyc} trackColor={{ true: COLORS.accent }} />
      </View>
      <View style={styles.switchRow}>
        <Text style={styles.rowName}>Require 2 accepted guarantors to join</Text>
        <Switch value={requireGuarantors} onValueChange={setRequireGuarantors} trackColor={{ true: COLORS.accent }} />
      </View>
      <TouchableOpacity style={[styles.approveBtn, { marginTop: 14 }]} onPress={save} disabled={saving}><Text style={styles.approveBtnText}>{saving ? "Saving..." : "Save settings"}</Text></TouchableOpacity>

      <TouchableOpacity style={[styles.smallBtn, { marginTop: 20, alignSelf: "flex-start" }]} onPress={togglePositions}>
        <Text style={styles.smallBtnText}>{project.joiningClosed ? "Reopen positions" : "Manually close positions"}</Text>
      </TouchableOpacity>

      <View style={[styles.rowActions, { marginTop: 20 }]}>
        <TouchableOpacity style={styles.approveBtn} onPress={() => setLifecycle("complete")}><Text style={styles.approveBtnText}>Mark Completed</Text></TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => setLifecycle("fail")}><Text style={styles.rejectBtnText}>Mark Failed</Text></TouchableOpacity>
        <TouchableOpacity style={styles.rejectBtn} onPress={() => setLifecycle("archive")}><Text style={styles.rejectBtnText}>Archive</Text></TouchableOpacity>
      </View>
    </View>
  );
}

function AuditTab({ projectId }) {
  const [entries, setEntries] = useState(null);
  useFocusEffect(useCallback(() => { client.get(`/projects/${projectId}/audit-log`).then((r) => setEntries(r.data)).catch(() => setEntries([])); }, [projectId]));
  if (!entries) return <ActivityIndicator color={COLORS.accent} />;
  return (
    <View>
      {entries.map((e) => (
        <View key={e.id} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName}>{e.action.replace(/_/g, " ")}</Text>
            <Text style={styles.rowSub}>{e.actor?.name || "System"} · {new Date(e.createdAt).toLocaleString()}</Text>
          </View>
        </View>
      ))}
      {!entries.length && <Text style={styles.empty}>No activity yet</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  tabRow: { backgroundColor: COLORS.surface, borderBottomWidth: 1, borderBottomColor: COLORS.border, maxHeight: 46 },
  tab: { paddingHorizontal: 14, paddingVertical: 12 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: COLORS.accent },
  tabText: { fontSize: 12.5, color: COLORS.sub, fontWeight: "600" },
  tabTextActive: { color: COLORS.accent, fontWeight: "800" },
  body: { flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: "800", color: COLORS.ink, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.3 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  applicantCard: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  pitchText: { color: COLORS.sub, fontSize: 12, fontStyle: "italic", marginTop: 4, marginBottom: 8 },
  memberCard: { flexDirection: "row", alignItems: "flex-start", backgroundColor: COLORS.surface, borderRadius: 8, padding: 12, marginBottom: 8 },
  rowName: { color: COLORS.ink, fontWeight: "700", fontSize: 13 },
  rowSub: { color: COLORS.sub, fontSize: 11.5, marginTop: 2 },
  rowActions: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  approveBtn: { backgroundColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  approveBtnText: { color: COLORS.accentInk, fontWeight: "700", fontSize: 12 },
  rejectBtn: { backgroundColor: "#FBE7E7", borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  rejectBtnText: { color: "#D32F2F", fontWeight: "700", fontSize: 12 },
  smallBtn: { borderWidth: 1, borderColor: COLORS.accent, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 8 },
  smallBtnActive: { backgroundColor: COLORS.accent },
  smallBtnText: { color: COLORS.accent, fontWeight: "700", fontSize: 12 },
  smallBtnTextActive: { color: COLORS.accentInk },
  roleOption: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 5 },
  roleOptionActive: { backgroundColor: COLORS.accent, borderColor: COLORS.accent },
  roleOptionText: { color: COLORS.ink, fontSize: 11, fontWeight: "600" },
  roleOptionTextActive: { color: COLORS.accentInk },
  empty: { color: COLORS.sub, textAlign: "center", marginVertical: 12 },
  tabHint: { color: COLORS.sub, fontSize: 12, marginBottom: 10 },
  input: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, padding: 10, marginBottom: 10, color: COLORS.ink },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  label: { fontSize: 12.5, color: COLORS.sub, marginBottom: 4 },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 12 },
  statCard: { backgroundColor: COLORS.accent, borderRadius: 10, padding: 14, marginBottom: 10 },
  statLabel: { color: "rgba(11,31,58,0.75)", fontSize: 11, textTransform: "uppercase" },
  statValue: { color: COLORS.accentInk, fontSize: 22, fontWeight: "800", marginTop: 4 },
});
